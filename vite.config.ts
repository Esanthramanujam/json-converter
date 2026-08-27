/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Deployment base path. GitHub Pages project sites live under /<repo>/, so both
 * the asset URLs and the prerendered links have to carry that prefix.
 *
 * It is derived from SITE_URL when that carries a path, so the two can never
 * disagree; BASE_PATH overrides it if you ever need them to differ.
 *
 *   npm run build                                                   -> /
 *   SITE_URL=https://user.github.io/repo npm run build              -> /repo/
 *   BASE_PATH=/other/ npm run build                                 -> /other/
 */
function resolveBasePath(): string {
  if (process.env.BASE_PATH) return process.env.BASE_PATH;
  if (process.env.SITE_URL) {
    try {
      const { pathname } = new URL(`${process.env.SITE_URL.replace(/\/+$/, '')}/`);
      return pathname;
    } catch {
      return '/';
    }
  }
  return '/';
}

export default defineConfig({
  plugins: [react()],
  base: resolveBasePath(),
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
