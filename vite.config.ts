import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [wasm(), topLevelAwait(), react(), nodePolyfills()],
  worker: {
    plugins: [wasm(), topLevelAwait(), nodePolyfills()],
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@jsdevtools/ono': '@jsdevtools/ono/cjs/index.js',
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  base: '/parser-demo',
  build: {
    sourcemap: true,
  },
});
