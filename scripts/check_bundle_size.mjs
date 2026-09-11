import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const budgets = { '.js': 130 * 1024, '.css': 80 * 1024 };
const assetFiles = readdirSync('dist/assets', { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => `dist/assets/${entry.name}`);

let checked = 0;
for (const [extension, budget] of Object.entries(budgets)) {
  const matches = assetFiles
    .filter((file) => file.endsWith(extension))
    .map((file) => ({ file, bytes: gzipSync(readFileSync(file)).byteLength }))
    .sort((a, b) => b.bytes - a.bytes);
  if (!matches.length) throw new Error(`No ${extension} bundle was produced.`);
  checked += matches.length;
  const largest = matches[0];
  console.log(`${extension}: largest gzip bundle is ${(largest.bytes / 1024).toFixed(1)} KiB (${largest.file})`);
  if (largest.bytes > budget) {
    throw new Error(`${largest.file} exceeds the ${(budget / 1024).toFixed(0)} KiB gzip budget.`);
  }
}

console.log(`Bundle check passed for ${checked} JavaScript/CSS assets.`);
