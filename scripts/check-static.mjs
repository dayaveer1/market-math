// Fails if the source uses anything a static export (GitHub Pages) cannot serve, or links that would bypass the base path.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
const root = process.cwd();
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(join(root, 'src')).filter((f) => /\.(ts|tsx)$/.test(f));
const problems = [];
const rel = (f) => relative(root, f).replace(/\\/g, '/');
for (const f of files) {
  const s = readFileSync(f, 'utf8'), r = rel(f);
  if (/(^|\/)route\.(ts|tsx)$/.test(r)) problems.push(`${r}: route handlers are server-only`);
  if (/['"]use server['"]/.test(s)) problems.push(`${r}: server actions are not supported`);
  if (/from ['"]next\/headers['"]/.test(s)) problems.push(`${r}: next/headers needs a server`);
  if (/export const (dynamic|revalidate)\s*=/.test(s)) problems.push(`${r}: dynamic/revalidate route config`);
  if (/from ['"]next\/image['"]/.test(s)) problems.push(`${r}: next/image needs a loader on static hosting`);
  if (/<a\s[^>]*href=["']\/(?!\/)/.test(s)) problems.push(`${r}: raw <a href="/..."> skips the base path; use next/link`);
  if (/location\.(href|assign|replace)\s*[=(]\s*['"`]\//.test(s)) problems.push(`${r}: absolute location change skips the base path`);
  if (/fetch\(\s*['"`]\/(?!\/)/.test(s)) problems.push(`${r}: absolute fetch skips the base path`);
  if (r.endsWith('page.tsx') && /useSearchParams/.test(s) && !/Suspense/.test(s)) problems.push(`${r}: useSearchParams must be inside <Suspense> for static export`);
}
if (existsSync(join(root, 'src/middleware.ts')) || existsSync(join(root, 'middleware.ts'))) problems.push('middleware is not supported');
for (const f of files.filter((f) => /\[[^/]+\]/.test(rel(f)) && rel(f).endsWith('page.tsx'))) {
  if (!/generateStaticParams/.test(readFileSync(f, 'utf8'))) problems.push(`${rel(f)}: dynamic route without generateStaticParams`);
}
for (const f of files.filter((f) => /PlayClient|review\/page/.test(f))) {
  const page = f.includes('PlayClient') ? f.replace('PlayClient.tsx', 'page.tsx') : f;
  if (!/Suspense/.test(readFileSync(page, 'utf8'))) problems.push(`${rel(page)}: search params used without Suspense`);
}
const cfg = readFileSync(join(root, 'next.config.mjs'), 'utf8');
if (!/output:\s*['"]export['"]/.test(cfg)) problems.push("next.config.mjs: output must be 'export'");
if (!existsSync(join(root, 'public/.nojekyll'))) problems.push('public/.nojekyll missing');
if (problems.length) { console.error('Static export check failed:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log(`Static export check passed (${files.length} source files).`);
