// Checks the exported `out/` folder: every route has an index.html, asset URLs carry the base path, Pages files exist.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2] ?? 'out';
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
const src = readFileSync('src/lib/registry.ts', 'utf8') + readFileSync('src/lib/assessments.ts', 'utf8');
const ids = [...new Set([...src.matchAll(/\bid: '([a-z0-9-]+)'/g), ...src.matchAll(/\['([a-z]+-drills)'/g)].map((m) => m[1]))];
const routes = ['', 'assessment', 'stats', 'review', 'session', 'daily', ...ids.map((id) => `play/${id}`)];
const problems = [];
if (ids.length !== 51) problems.push(`expected 51 activity ids in the registry sources, found ${ids.length}`);
for (const r of routes) if (!existsSync(join(out, r, 'index.html'))) problems.push(`missing ${r || '/'} → ${join(out, r, 'index.html')}`);
for (const f of ['404.html', '.nojekyll']) if (!existsSync(join(out, f))) problems.push(`missing ${f}`);
if (!existsSync(join(out, '_next'))) problems.push('missing _next/ assets');
const html = existsSync(join(out, 'index.html')) ? readFileSync(join(out, 'index.html'), 'utf8') : '';
if (html && !html.includes(`${base}/_next/`)) problems.push(`index.html does not reference ${base}/_next/ (base path not applied?)`);
if (html && base && /["'(]\/_next\//.test(html)) problems.push('index.html contains /_next/ URLs without the base path');
const extra = existsSync(join(out, 'play')) ? readdirSync(join(out, 'play')).filter((d) => !ids.includes(d)) : [];
if (extra.length) problems.push(`unexpected play routes: ${extra.join(', ')}`);
if (problems.length) { console.error('Export verification failed:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log(`Export verified: ${routes.length} routes (${ids.length} activities), 404.html, .nojekyll, base path "${base || '(none)'}".`);
