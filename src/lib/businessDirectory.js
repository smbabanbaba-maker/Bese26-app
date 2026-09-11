export function normalizeDirectorySearch(value) {
  return String(value || '')
    .replace(/^@/, '')
    .replace(/[^\p{L}\p{N}\s&'.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}
