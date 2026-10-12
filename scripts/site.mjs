// Base-path resolution shared by the build, preview and test scripts.
// Order: explicit --base argument → NEXT_PUBLIC_BASE_PATH (set by CI, may be "") → site.config.json → "".
import { readFileSync, existsSync } from 'node:fs';
export function siteConfig() {
  return existsSync('site.config.json') ? JSON.parse(readFileSync('site.config.json', 'utf8')) : {};
}
export function clean(p) {
  if (!p || p === '/') return '';
  return ('/' + p.replace(/^\/+|\/+$/g, '')).replace(/\/{2,}/g, '/');
}
export function resolveBase(argv = process.argv.slice(2), env = process.env) {
  const i = argv.indexOf('--base');
  if (i >= 0) return clean(argv[i + 1] ?? '');
  if (env.NEXT_PUBLIC_BASE_PATH !== undefined) return clean(env.NEXT_PUBLIC_BASE_PATH);
  return clean(siteConfig().basePath ?? '');
}
