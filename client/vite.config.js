import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const INITIAL_JAVASCRIPT_BUDGET_BYTES = 350 * 1024;

const enforceInitialJavaScriptBudget = () => ({
  name: 'enforce-initial-javascript-budget',
  generateBundle(_options, bundle) {
    const entryBytes = Object.values(bundle)
      .filter((asset) => asset.type === 'chunk' && asset.isEntry)
      .reduce((total, asset) => total + Buffer.byteLength(asset.code), 0);

    if (entryBytes > INITIAL_JAVASCRIPT_BUDGET_BYTES) {
      throw new Error(
        `Initial JavaScript is ${(entryBytes / 1024).toFixed(1)} KiB, above the ${
          INITIAL_JAVASCRIPT_BUDGET_BYTES / 1024
        } KiB budget. Keep non-dashboard routes lazy-loaded.`,
      );
    }
  },
});

export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  plugins: [react(), enforceInitialJavaScriptBudget()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3020,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  define: {
    // Polyfill process.env for any libraries that use it
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});
