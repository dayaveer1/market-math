// Cross-platform static build (works in PowerShell, cmd and bash).
// Usage: node scripts/build-static.mjs [--base /floorwork] [--e2e]
//   --base  URL prefix the site will be served under (default: $NEXT_PUBLIC_BASE_PATH or empty)
//   --e2e   include the browser-test hook (never use for the public site)
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
const i = args.indexOf('--base');
const base = i >= 0 ? (args[i + 1] ?? '') : (process.env.NEXT_PUBLIC_BASE_PATH ?? '');
const env = { ...process.env, NEXT_PUBLIC_BASE_PATH: base === '/' ? '' : base, NEXT_PUBLIC_E2E: args.includes('--e2e') ? '1' : '' };
console.log(`Building static site with base path "${env.NEXT_PUBLIC_BASE_PATH || '(none)'}"${env.NEXT_PUBLIC_E2E ? ' and the e2e test hook' : ''}…`);
const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'build'], { stdio: 'inherit', env, shell: process.platform === 'win32' });
if (r.status !== 0) process.exit(r.status ?? 1);
const v = spawnSync(process.execPath, ['scripts/verify-export.mjs'], { stdio: 'inherit', env });
process.exit(v.status ?? 1);
