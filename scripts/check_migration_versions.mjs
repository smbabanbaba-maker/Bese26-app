import { readdir } from 'node:fs/promises';

const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);
const files = (await readdir(migrationDirectory)).filter((file) => file.endsWith('.sql')).sort();
const versions = new Map();

for (const file of files) {
  const match = file.match(/^(\d{14})_[a-z0-9_]+\.sql$/);
  if (!match) {
    throw new Error(`Invalid migration filename: ${file}`);
  }
  const version = match[1];
  if (versions.has(version)) {
    throw new Error(`Duplicate migration version ${version}: ${versions.get(version)} and ${file}`);
  }
  versions.set(version, file);
}

console.log(`Validated ${files.length} unique Supabase migration versions.`);
