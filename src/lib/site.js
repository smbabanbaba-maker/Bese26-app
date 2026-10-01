export const SITE_URL = 'https://bese26.shop';

export function siteUrl(path = '') {
  const suffix = String(path || '');
  return `${SITE_URL}${suffix.startsWith('/') || !suffix ? suffix : `/${suffix}`}`;
}
