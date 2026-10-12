// Optional fast harness: bundles games / the app without Next.js and drives them in headless Chromium.
// Usage: node tools/harness/build.mjs && node tools/harness/drive-games.cjs && node tools/harness/drive-app.cjs
// The app harness replaces next/link, next/navigation, next/dynamic, zustand and recharts with small stand-ins
// (tools/harness/shims). It exercises Floorwork's own code; the real libraries are covered by `npm run test:e2e`.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../src');
const out = resolve(here, 'out');
mkdirSync(out, { recursive: true });
const common = { bundle: true, jsx: 'automatic', logLevel: 'warning', alias: { '@': src }, loader: { '.css': 'empty' } };
await build({ ...common, entryPoints: [resolve(here, 'games.tsx')], outfile: resolve(out, 'games.js'), platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"development"' } });
await build({ ...common, entryPoints: [resolve(here, 'app.tsx')], outfile: resolve(out, 'app.js'), platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"development"' },
  alias: { ...common.alias, 'next/link': resolve(here, 'shims/next-link.tsx'), 'next/navigation': resolve(here, 'shims/next-navigation.ts'), 'next/dynamic': resolve(here, 'shims/next-dynamic.tsx'), 'zustand/middleware': resolve(here, 'shims/zustand-middleware.ts'), zustand: resolve(here, 'shims/zustand.ts'), recharts: resolve(here, 'shims/recharts.tsx') } });
await build({ ...common, entryPoints: [resolve(here, 'ssr.tsx')], outfile: resolve(out, 'ssr.cjs'), platform: 'node', format: 'cjs', define: { 'process.env.NODE_ENV': '"production"' } });
for (const n of ['games', 'app']) writeFileSync(resolve(out, `${n}.html`), `<!doctype html><meta charset="utf-8"><body><div id="root"></div><script src="${n}.js"></script>`);
const ids = readFileSync(resolve(src, 'lib/assessments.ts'), 'utf8').match(/id: 'oa-[a-z0-9-]+'/g).map((x) => x.slice(5, -1));
writeFileSync(resolve(out, 'tests.json'), JSON.stringify({ TEST_IDS: ids }));
console.log('Harness built in tools/harness/out. Run: node tools/harness/out/ssr.cjs, node tools/harness/drive-games.cjs, node tools/harness/drive-app.cjs');
