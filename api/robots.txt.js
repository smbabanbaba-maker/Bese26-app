export default function handler(_req, res) {
  res.status(200).setHeader('Content-Type', 'text/plain; charset=utf-8').setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400').end(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /?admin=login

Sitemap: https://www.bese26.shop/sitemap.xml
`);
}
