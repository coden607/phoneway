import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    const relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(`${root}${path.sep}`)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const body = await readFile(file);
    const headers = {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    };
    if (path.basename(file) === 'sw.js') headers['Service-Worker-Allowed'] = '/';
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(Number(process.env.PORT || 4173), '0.0.0.0', () => {
  console.log(`Phoneway PWA running at http://127.0.0.1:${process.env.PORT || 4173}`);
});
