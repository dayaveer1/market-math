/**
 * Static export for GitHub Pages.
 * NEXT_PUBLIC_BASE_PATH is the URL prefix the site is served under, e.g. "/floorwork" for
 * https://USERNAME.github.io/floorwork/. It is empty for local `npm run dev` and for a USERNAME.github.io repo.
 * The deploy workflow sets it automatically from the repository name.
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  // /play/math → /play/math/index.html, so refreshing any page on GitHub Pages finds a real file.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
