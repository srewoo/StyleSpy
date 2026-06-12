import { defineConfig } from 'vitest/config';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.config';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      // The side panel is the only HTML entry; content/background are declared
      // in the manifest and picked up by @crxjs automatically.
      input: {
        sidepanel: 'src/sidepanel/index.html',
        table: 'src/table/index.html',
        help: 'src/help/index.html',
        privacy: 'src/privacy/index.html',
      },
    },
  },
  // Vitest configuration lives here so we keep a single source of truth.
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Entry shells with no testable logic: the content-script dispatcher and
      // the panel bootstrap are exercised end-to-end by Playwright instead.
      exclude: ['src/manifest.config.ts', 'src/types.ts', 'src/**/index.ts'],
    },
  },
});
