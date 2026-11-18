import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { escapeMarkup, normalizeSiteUrl, withShareUrl } from './set-share-url.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
const productionSiteUrl = 'https://btceo.create-ai.cc/';
const pagesBranch = process.env.CF_PAGES_BRANCH;
const pagesSiteUrl = pagesBranch === 'main' ? productionSiteUrl : process.env.CF_PAGES_URL;
const siteUrl = process.env.PUBLIC_SITE_URL || pagesSiteUrl;
const pageUrl = siteUrl ? normalizeSiteUrl(siteUrl) : null;
const sourceHtml = await readFile(new URL('index.html', root), 'utf8');
const html = pageUrl ? withShareUrl(sourceHtml, pageUrl) : sourceHtml;

await rm(output, { recursive: true, force: true });
await mkdir(output);
await writeFile(new URL('index.html', output), html);
await writeFile(new URL('_routes.json', output), JSON.stringify({
  version: 1,
  include: ['/api/leaderboard'],
  exclude: [],
}));

for (const file of ['style.css', 'sound.js', 'i18n.js', 'ai.js', 'game.js', 'game-rules.mjs', 'favicon.ico']) {
  await copyFile(new URL(file, root), new URL(file, output));
}

await cp(new URL('assets/', root), new URL('assets/', output), {
  recursive: true,
  filter: (source) => !basename(source).startsWith('.') && basename(source) !== 'README.md',
});

if (pageUrl && (!pagesBranch || pagesBranch === 'main')) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escapeMarkup(pageUrl.href)}</loc></url>
</urlset>
`;
  await writeFile(new URL('sitemap.xml', output), sitemap);
  await writeFile(new URL('robots.txt', output), `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', pageUrl).href}\n`);
}

console.log('前端构建完成，输出目录为 dist/');
