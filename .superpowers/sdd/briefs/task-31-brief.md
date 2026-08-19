# Task 3.1: PWA (vite-plugin-pwa)

## Context
Task 3.1 of the audit fix plan. Fixes MEDIUM/LOW issue B-01.
Project: /Users/jason/myprojects/angryui

## Goal
PWA: installable to home screen, app shell cached, offline capable.

## Files to Modify
- `vite.config.ts`
- `public/manifest.json` — CREATE
- `index.html`

## Exact Changes

### vite.config.ts
```bash
npm install --save-dev vite-plugin-pwa
```
```typescript
import { VitePWA } from 'vite-plugin-pwa';
// In plugins array:
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
  workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] },
}),
```

### public/manifest.json
```json
{
  "name": "AngryUI",
  "short_name": "AngryUI",
  "description": "Web UI for Antigravity CLI",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e1e1e",
  "icons": [
    { "src": "/pwa-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/pwa-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### index.html — add inside <head>
```html
<meta name="theme-color" content="#1e1e1e" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

Also create placeholder PWA icon files (can be simple SVG or existing logo.png reuse).

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "feat(pwa): PWA manifest + service worker via vite-plugin-pwa"
