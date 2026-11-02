// After a launch where Gemma never finished loading, the app must not auto-load it again,
// must say what happened, must log the launch, and must let the user copy a report.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface'];

const server = await startServer();
// A real (temporary) profile: throwaway contexts get too little storage for a 2 GB file.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cartcook-test-'));
const browser = await chromium.launchPersistentContext(profile, { args: FLAGS, viewport: { width: 393, height: 852 } });
try {
  const page = browser.pages()[0] || await browser.newPage();
  await page.goto(server.url + '#plan');
  await page.waitForFunction(() => window.__cartcook);

  // Make Gemma look downloaded (sparse file of the right size) and leave a load "in progress".
  await page.evaluate(async () => {
    const { MODEL } = await import('./gemma.js');
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('models', { create: true });
    const fh = await dir.getFileHandle(MODEL.file, { create: true });
    const w = await fh.createWritable({ keepExistingData: false });
    await w.truncate(MODEL.size);
    await w.close();
    localStorage.setItem('cartcook.gemmaLoad', JSON.stringify({ inProgress: true, startedAt: Date.now(), autoLoad: true, crashes: 0 }));
  });
  await page.reload();

  // crash notice after an unfinished load
  await page.waitForFunction(() => document.getElementById('splash').hidden, null, { timeout: 3000 });
  const card = await page.textContent('#modelCard');
  if (!/closed while loading/.test(card)) throw new Error('no crash notice in the model card: ' + card.replace(/\s+/g, ' ').slice(0, 140));
  const phase = await page.evaluate(() => window.__cartcook.state.model.phase);
  if (phase !== 'downloaded') throw new Error(`Gemma should not auto-load; phase is ${phase}`);

  // launch is logged
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('cartcook.log') || '[]'));
  if (!log.some((e) => e.stage === 'boot' && /\/Claude-ai-\/|localhost/.test(e.detail))) throw new Error('no boot entry in the log');

  // copy details falls back to a text box when the clipboard is blocked
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', { value: () => Promise.reject(new Error('blocked')), configurable: true });
  });
  await page.click('#modelCard >> text=Copy details');
  await page.waitForSelector('textarea.diag-text', { timeout: 3000 });
  const value = await page.inputValue('textarea.diag-text');
  if (!/boot/.test(value)) throw new Error('the report text has no boot entry');

  console.log('PASS');
} catch (e) {
  console.log('FAIL ' + String(e.message).split('\n')[0]);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
