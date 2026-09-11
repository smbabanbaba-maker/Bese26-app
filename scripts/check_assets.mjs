import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter((file) => /^(?:index\.html|src\/.*\.(?:css|js|jsx))$/.test(file));

const references = new Map();
const addReference = (source, value) => {
  const path = value.split(/[?#]/, 1)[0];
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/src/')) return;
  if (!/\.[a-z0-9]+$/i.test(path)) return;
  if (!references.has(path)) references.set(path, new Set());
  references.get(path).add(source);
};

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(/(?:src|href)\s*=\s*["'](\/[^"']+)["']/g)) addReference(file, match[1]);
  for (const match of content.matchAll(/url\(\s*["']?(\/[^"')]+)["']?\s*\)/g)) addReference(file, match[1]);
}

const missing = [...references.entries()].filter(([path]) => !existsSync(`public${path}`));
if (missing.length) {
  console.error('Missing public assets:');
  for (const [path, sources] of missing) console.error(`- ${path} referenced by ${[...sources].join(', ')}`);
  process.exit(1);
}

console.log(`Asset check passed for ${references.size} static public references.`);
