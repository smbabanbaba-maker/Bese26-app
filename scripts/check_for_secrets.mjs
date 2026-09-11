import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !/^(?:dist|node_modules)\//.test(file))
  .filter((file) => !/\.(?:avif|gif|ico|jpe?g|png|webp|woff2?|zip)$/i.test(file));

const secretPatterns = [
  { name: 'Paystack secret key', pattern: /sk_(?:test|live)_(?!your_)[A-Za-z0-9]{16,}/g },
  { name: 'Supabase secret key', pattern: /sb_secret_(?!your_)[A-Za-z0-9_-]{16,}/g },
  { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const findings = [];
for (const file of files) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${file}: possible ${name}`);
  }
}

if (findings.length) {
  console.error('Potential secrets found (values intentionally hidden):');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed across ${files.length} text files.`);
