import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function setMetaContent(html, attribute, name, value) {
  const tag = new RegExp(`(<meta ${attribute}="${name}" content=")[^"]*(")`);
  if (!tag.test(html)) throw new Error(`缺少 ${name} 元数据`);
  const escaped = value.replaceAll('&', '&amp;');
  return html.replace(tag, (_, start, end) => start + escaped + end);
}

export function withShareUrl(markup, input) {
  const pageUrl = input && URL.canParse(input) ? new URL(input) : null;
  if (!pageUrl || !['https:', 'http:'].includes(pageUrl.protocol)) {
    throw new Error('分享地址必须是完整的 HTTP 或 HTTPS URL');
  }

  pageUrl.search = '';
  pageUrl.hash = '';
  pageUrl.username = '';
  pageUrl.password = '';
  const posterUrl = new URL('assets/back-to-ceo-poster.jpg', pageUrl);
  const withPage = setMetaContent(markup, 'property', 'og:url', pageUrl.href);
  const withPoster = setMetaContent(withPage, 'property', 'og:image', posterUrl.href);
  return setMetaContent(withPoster, 'name', 'twitter:image', posterUrl.href);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const indexPath = new URL('../index.html', import.meta.url);
  try {
    const markup = await readFile(indexPath, 'utf8');
    await writeFile(indexPath, withShareUrl(markup, process.argv[2]));
    console.log('已写入游戏链接和海报地址');
  } catch (error) {
    console.error(error.message);
    console.error('用法  node scripts/set-share-url.mjs https://games.example.com/back-to-ceo/');
    process.exitCode = 1;
  }
}
