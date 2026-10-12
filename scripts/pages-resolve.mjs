// GitHub Pages path semantics, shared by serve-out.mjs and its test.
import { join, normalize } from 'node:path';
export function resolveRequest({ base, root }, urlPath, query, exists, isDir) {
  if (base && urlPath !== base && !urlPath.startsWith(base + '/')) return { status: 404 };
  let rel = decodeURIComponent(urlPath.slice(base.length)) || '/';
  rel = normalize(rel).replace(/\\/g, '/');
  if (rel.includes('..')) return { status: 404 };
  const fsPath = join(root, rel);
  if (exists(fsPath) && isDir(fsPath)) {
    if (!rel.endsWith('/')) return { status: 301, location: `${base}${rel}/${query}` };
    const idx = join(fsPath, 'index.html');
    return exists(idx) ? { status: 200, file: idx } : { status: 404 };
  }
  if (exists(fsPath)) return { status: 200, file: fsPath };
  if (exists(fsPath + '.html')) return { status: 200, file: fsPath + '.html' };
  return { status: 404 };
}
