// Switching from Gemma 4 to Qwen3: the old 2 GB file is deleted, the crash counter from
// Gemma is cleared, and the app offers the new model by name and size.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface'];

const server = await startServer(8792);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cartcook-switch-'));
const browser = await chromium.launchPersistentContext(profile, { args: FLAGS, viewport: { width: 393, height: 852 } });
try {
  const page = browser.pages()[0] || await browser.newPage();
  await page.goto(server.url + '#plan');
  await page.waitForFunction(() => window.__cartcook);

  // A phone that had Gemma 4 and crashed loading it seven times.
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('models', { create: true });
    const fh = await dir.getFileHandle('gemma-4-E2B-it-gpu.litertlm', { create: true });
    const w = await fh.createWritable();
    await w.write('old model');
    await w.close();
    localStorage.setItem('cartcook.gemmaLoad', JSON.stringify({ inProgress: false, startedAt: 1, autoLoad: false, crashes: 7 }));
  });
  await page.reload();
  await page.waitForFunction(() => document.getElementById('splash').hidden, null, { timeout: 5000 });

  const oldGone = await page.evaluate(async () => {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('models');
    try { await dir.getFileHandle('gemma-4-E2B-it-gpu.litertlm'); return false; } catch (e) { return true; }
  });
  if (!oldGone) throw new Error('the old Gemma 4 file was not deleted');

  const guard = await page.evaluate(() => JSON.parse(localStorage.getItem('cartcook.gemmaLoad')));
  if (guard.autoLoad !== true || guard.crashes !== 0) throw new Error('crash counter not reset: ' + JSON.stringify(guard));

  const card = (await page.textContent('#modelCard')).replace(/\s+/g, ' ');
  if (!/Qwen3/.test(card)) throw new Error('model card does not name Qwen3: ' + card.slice(0, 160));
  if (!/340 MB/.test(card)) throw new Error('model card does not show the 340 MB size: ' + card.slice(0, 160));
  if (/Gemma/.test(card)) throw new Error('model card still mentions Gemma: ' + card.slice(0, 160));

  console.log('PASS');
} catch (e) {
  console.log('FAIL ' + String(e.message).split('\n')[0]);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
