# Task 2.8: Bundle size budget

## Context
Task 2.8 of the audit fix plan. Fixes MEDIUM issue F-04.
Project: /Users/jason/myprojects/angryui

## Goal
Add vite bundle visualizer + 500KB size budget check in CI.

## Files to Modify
- `vite.config.ts`
- `scripts/check-bundle-size.js` — CREATE
- `package.json`

## Exact Changes

### Install
```bash
npm install --save-dev rollup-plugin-visualizer
```

### vite.config.ts
```typescript
import { visualizer } from 'rollup-plugin-visualizer';
// In plugins array:
visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true }),
```

### scripts/check-bundle-size.js — CREATE
```javascript
import { readFileSync } from 'fs';
const stats = JSON.parse(readFileSync('dist/stats.json', 'utf-8'));
const chunk = stats.output.find(o => o.name === 'index') || stats.output[0];
const kb = (chunk.distSize / 1024).toFixed(1);
const LIMIT = 500;
if (chunk.distSize > LIMIT * 1024) {
  console.error(`ERROR: Bundle ${kb}KB exceeds limit ${LIMIT}KB`);
  process.exit(1);
}
console.log(`Bundle OK: ${kb}KB`);
```

### package.json
```json
"build:client": "vite build && node scripts/check-bundle-size.js"
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "perf(bundle): vite bundle visualizer + 500KB size budget in CI"

## Global Constraints
TypeScript strict ON · `npm test -- --run` must pass
