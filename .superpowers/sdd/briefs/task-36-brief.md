# Task 3.6: postinstall chmod guidance

## Context
Task 3.6 of the audit fix plan. Fixes LOW issue D-07.
Project: /Users/jason/myprojects/angryui

## Goal
Replace silent `|| true` in postinstall with a clear guidance script.

## Files to Modify
- `package.json`
- `scripts/check-node-pty.js` — CREATE

## Changes

### package.json
```json
"postinstall": "node scripts/check-node-pty.js"
```

### scripts/check-node-pty.js
```javascript
import { existsSync, chmodSync, readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
try {
  const pkg = require.resolve('node-pty/package.json');
  const prebuilds = path.join(path.dirname(pkg), 'prebuilds');
  if (existsSync(prebuilds)) {
    for (const arch of readdirSync(prebuilds)) {
      const helper = path.join(prebuilds, arch, 'spawn-helper');
      if (existsSync(helper)) {
        const stat = readFileSync(helper);
        if (!(stat[0] & 0o111)) {
          chmodSync(helper, 0o755);
          console.log('[angryui] Fixed node-pty spawn-helper permissions');
        }
      }
    }
  }
} catch {
  console.warn('[angryui] node-pty prebuilds check skipped (non-critical)');
}
console.log('[angryui] Dependencies ready.');
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "fix(deps): postinstall replaced with check-node-pty.js guidance script"
