import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath, URL } from 'node:url';

const backendPort = process.env.AGY_WEBUI_PORT || process.env.PORT || 3737;

export default defineConfig({
  plugins: [
    react(),
    visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': `http://localhost:${backendPort}`,
      '/ws': { target: `ws://localhost:${backendPort}`, ws: true }
    }
  }
});
