// Repro harness: serve ./dist and load it in headless chromium, capture console + page errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'dist');
const PORT = 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath)) {
    res.writeHead(404); res.end('not found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((r) => server.listen(PORT, r));
console.log(`[REPRO] serving ${ROOT} on http://localhost:${PORT}`);

const browser = await chromium.launch();
const page = await browser.newPage();

const logs = [];
page.on('console', (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 20000 }).catch((e) => {
  logs.push(`[goto-error] ${e.message}`);
});

// Give React time to mount + run effects
await page.waitForTimeout(4000);

// Also grab the visible error-boundary text if any
const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
console.log('\n===== CONSOLE / PAGE ERRORS =====');
for (const l of logs) console.log(l);
console.log('\n===== BODY TEXT (first 500 chars) =====');
console.log(bodyText.slice(0, 500));

await browser.close();
server.close();
process.exit(0);
