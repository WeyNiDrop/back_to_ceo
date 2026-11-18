import { readFile, writeFile } from 'node:fs/promises';

const input = process.argv[2];
const pageUrl = input && URL.canParse(input) ? new URL(input) : null;
if (!pageUrl || !['https:', 'http:'].includes(pageUrl.protocol)) {
  console.error('用法  node scripts/set-share-url.mjs https://games.example.com/back-to-ceo/');
  process.exit(1);
}

pageUrl.search = '';
pageUrl.hash = '';
pageUrl.username = '';
pageUrl.password = '';
const posterUrl = new URL('assets/back-to-ceo-poster.jpg', pageUrl);
const indexPath = new URL('../index.html', import.meta.url);
const markup = await readFile(indexPath, 'utf8');

function setMetaContent(html, attribute, name, value) {
  const tag = new RegExp(`(<meta ${attribute}="${name}" content=")[^"]*(")`);
  if (!tag.test(html)) throw new Error(`缺少 ${name} 元数据`);
  const escaped = value.replaceAll('&', '&amp;');
  return html.replace(tag, (_, start, end) => start + escaped + end);
}

const withPage = setMetaContent(markup, 'property', 'og:url', pageUrl.href);
const withPoster = setMetaContent(withPage, 'property', 'og:image', posterUrl.href);
const ready = setMetaContent(withPoster, 'name', 'twitter:image', posterUrl.href);
await writeFile(indexPath, ready);
console.log('已写入游戏链接和海报地址');
