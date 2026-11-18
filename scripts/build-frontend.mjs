import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { withShareUrl } from './set-share-url.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
const productionSiteUrl = 'https://btceo.create-ai.cc/';
const pagesSiteUrl = process.env.CF_PAGES_BRANCH === 'main' ? productionSiteUrl : process.env.CF_PAGES_URL;
const siteUrl = process.env.PUBLIC_SITE_URL || pagesSiteUrl;
const sourceHtml = await readFile(new URL('index.html', root), 'utf8');
const html = siteUrl ? withShareUrl(sourceHtml, siteUrl) : sourceHtml;

await rm(output, { recursive: true, force: true });
await mkdir(output);
await writeFile(new URL('index.html', output), html);

for (const file of ['style.css', 'sound.js', 'i18n.js', 'ai.js', 'game.js']) {
  await copyFile(new URL(file, root), new URL(file, output));
}

await cp(new URL('assets/', root), new URL('assets/', output), {
  recursive: true,
  filter: (source) => !basename(source).startsWith('.') && basename(source) !== 'README.md',
});

console.log('前端构建完成，输出目录为 dist/');
