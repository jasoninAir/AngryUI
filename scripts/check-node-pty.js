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
