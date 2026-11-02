// The Home Screen app must start at the app's real address, and a wrong address inside the
// site must lead back to the app instead of a GitHub "not found" page.
import { createRequire } from 'node:module';
import { startServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const server = await startServer(8791, '/Claude-ai-');
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext()).newPage();

  // manifest start is absolute
  const manifest = await (await fetch(server.url + 'manifest.webmanifest')).json();
  if (manifest.start_url !== '/Claude-ai-/') throw new Error(`start_url is ${manifest.start_url}`);
  if (manifest.id !== '/Claude-ai-/') throw new Error(`id is ${manifest.id}`);

  // 404 page returns to the app
  await page.goto(server.url + 'does-not-exist');
  await page.waitForFunction(() => location.pathname.endsWith('/Claude-ai-/') && document.title === 'Cart & Cook', null, { timeout: 3000 });

  console.log('PASS');
} catch (e) {
  console.log('FAIL ' + String(e.message).split('\n')[0]);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
