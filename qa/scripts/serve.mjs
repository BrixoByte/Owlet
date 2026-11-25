// serve.mjs — tiny dependency-free static server for the QA suite.
// Used instead of `python -m http.server`, which dropped connections
// (ERR_CONNECTION_REFUSED) under parallel browser workers.
//
// Usage: node scripts/serve.mjs <root-dir> <port>

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.zip': 'application/zip', '.wasm': 'application/wasm',
};

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(root, urlPath));
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    const stat = statSync(file);
    if (!stat.isFile()) throw new Error('not a file');
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store',
    });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 not found: ' + urlPath);
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`[qa] serving ${root} at http://127.0.0.1:${port}`);
});
