import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');
if (!fs.existsSync(distAssetsDir)) {
  console.log('dist/assets not found, skipping bundle check');
  process.exit(0);
}

const files = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));
let hasError = false;

console.log('📦 Checking production bundle sizes against performance budget...');
for (const file of files) {
  const filePath = path.join(distAssetsDir, file);
  const content = fs.readFileSync(filePath);
  const rawKb = (content.length / 1024).toFixed(1);
  const gzipKb = (zlib.gzipSync(content).length / 1024).toFixed(1);

  console.log(`  - ${file}: ${rawKb} KB (gzip: ${gzipKb} KB)`);

  // Budget thresholds:
  // Main bundle: max 350 KB Gzip
  // WebTTYModal (lazy): max 150 KB Gzip
  if (file.startsWith('index-')) {
    if (parseFloat(gzipKb) > 350) {
      console.error(`❌ ERROR: Main bundle ${file} (${gzipKb} KB gzip) exceeds 350 KB budget!`);
      hasError = true;
    }
  } else if (file.startsWith('WebTTYModal-')) {
    if (parseFloat(gzipKb) > 150) {
      console.error(`❌ ERROR: WebTTY chunk ${file} (${gzipKb} KB gzip) exceeds 150 KB budget!`);
      hasError = true;
    }
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('✅ All bundle sizes are within performance budget limits.');
}
