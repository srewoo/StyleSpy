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
      include: ['src/lib/**/*.ts'],
    },
  },
});
