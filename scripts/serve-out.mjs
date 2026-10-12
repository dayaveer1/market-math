// Serves `out/` the way GitHub Pages does, under a base path, for previews and static e2e tests.
// Usage: node scripts/serve-out.mjs [--base /market-math] [--port 4173]   (base defaults to site.config.json)
//  - /base/dir  → 301 to /base/dir/ (query kept)      - /base/dir/ → dir/index.html
//  - missing    → 404.html with status 404              - anything outside /base → 404
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { resolveRequest } from './pages-resolve.mjs';
import { resolveBase } from './site.mjs';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const base = resolveBase(args);
const port = Number(opt('--port', process.env.PORT ?? 4173));
const root = opt('--dir', 'out');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8' };
{
  if (!existsSync(join(root, 'index.html'))) { console.error(`No ${root}/index.html. Run "npm run build" (or "npm run preview") first.`); process.exit(1); }
  createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const r = resolveRequest({ base, root }, u.pathname, u.search, existsSync, (p) => statSync(p).isDirectory());
    if (r.status === 301) { res.writeHead(301, { Location: r.location }); return res.end(); }
    if (r.status === 200) { res.writeHead(200, { 'Content-Type': TYPES[extname(r.file)] ?? 'application/octet-stream' }); return res.end(readFileSync(r.file)); }
    const nf = join(root, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(existsSync(nf) ? readFileSync(nf) : 'Not found');
  }).listen(port, () => console.log(`Serving ${root}/ like GitHub Pages at http://localhost:${port}${base}/`));
}
