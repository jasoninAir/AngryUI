import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { writeFileSync } from 'fs';

// Plugin to generate stats.json for bundle size checking
function statsWriter() {
  return {
    name: 'stats-writer',
    closeBundle() {
      // This runs after build completes
    },
    generateBundle(options, bundle) {
      const stats = {
        output: Object.values(bundle).map((chunk) => ({
          name: chunk.name,
          type: chunk.type,
          distSize: chunk.type === 'chunk' ? chunk.code.length : 0,
        }))
      };
      writeFileSync('dist/stats.json', JSON.stringify(stats, null, 2));
    }
  };
}

const backendPort = process.env.AGY_WEBUI_PORT || process.env.PORT || 3737;

export default defineConfig({
  plugins: [
    react(),
    statsWriter(),
    visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png'],
      manifest: {
        name: 'AngryUI',
        short_name: 'AngryUI',
        description: 'Web UI for Antigravity CLI',
        theme_color: '#1e1e1e',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/ws/],
      },
    }),
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
