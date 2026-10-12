/** Prefix for the site's base path: '' against `npm run dev`, site.config.json basePath (e.g. '/market-math') against the static export. */
export const BASE = (process.env.E2E_BASE_PATH ?? '').replace(/\/$/, '');
export const p = (path: string) => BASE + path;
