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
