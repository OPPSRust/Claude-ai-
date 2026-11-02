// A tiny static file server for browser tests: serves the repo root.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

// prefix mimics GitHub Pages project sites (e.g. '/Claude-ai-'): the repo is served under it,
// and unknown paths under it get the repo's 404.html, like Pages does.
export function startServer(port = 8790, prefix = '') {
  const notFound = (res) => {
    fs.readFile(path.join(ROOT, '404.html'), (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(data);
    });
  };
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (prefix) {
      if (rel === prefix) { res.writeHead(301, { Location: prefix + '/' }); res.end(); return; }
      if (!rel.startsWith(prefix + '/')) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Site not found'); return; }
      rel = rel.slice(prefix.length);
    }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { notFound(res); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(port, () => resolve({
      url: `http://localhost:${port}${prefix}/`,
      close: () => new Promise((r) => server.close(() => r())),
    }));
  });
}
