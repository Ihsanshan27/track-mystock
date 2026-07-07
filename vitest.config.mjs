import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  cacheDir: '.vitest',
  resolve: {
    alias: {
      '@': resolve(__dirname, './apps/web/src'),
    },
  },
  test: {
    environment: 'node',
  },
});
