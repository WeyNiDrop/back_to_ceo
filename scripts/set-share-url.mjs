import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function escapeMarkup(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function setUrlAttribute(html, tag, name, value) {
  if (!tag.test(html)) throw new Error(`缺少 ${name} 元数据`);
  return html.replace(tag, (_, start, end) => start + escapeMarkup(value) + end);
}

function setMetaContent(html, attribute, name, value) {
  const tag = new RegExp(`(<meta ${attribute}="${name}" content=")[^"]*(")`);
  return setUrlAttribute(html, tag, name, value);
}

export function normalizeSiteUrl(input) {
  const pageUrl = input && URL.canParse(input) ? new URL(input) : null;
  if (!pageUrl || !['https:', 'http:'].includes(pageUrl.protocol)) {
    throw new Error('分享地址必须是完整的 HTTP 或 HTTPS URL');
  }

  pageUrl.search = '';
  pageUrl.hash = '';
  pageUrl.username = '';
  pageUrl.password = '';
  return pageUrl;
}

export function withShareUrl(markup, pageUrl) {
  const posterUrl = new URL('assets/back-to-ceo-poster.jpg', pageUrl);
  const canonicalTag = /(<link rel="canonical" href=")[^"]*(")/;
  const structuredDataTag = /(<script type="application\/ld\+json" id="game-structured-data">)\s*([\s\S]*?)\s*(<\/script>)/;
  if (!structuredDataTag.test(markup)) throw new Error('缺少游戏结构化数据');

  const withCanonical = setUrlAttribute(markup, canonicalTag, 'canonical', pageUrl.href);
  const withPage = setMetaContent(withCanonical, 'property', 'og:url', pageUrl.href);
  const withPoster = setMetaContent(withPage, 'property', 'og:image', posterUrl.href);
  const withSocial = setMetaContent(withPoster, 'name', 'twitter:image', posterUrl.href);
  return withSocial.replace(structuredDataTag, (_, start, json, end) => {
    const data = { ...JSON.parse(json), url: pageUrl.href, image: posterUrl.href };
    const body = JSON.stringify(data, null, 2).replaceAll('<', '\\u003c').replace(/^/gm, '    ');
    return `${start}\n${body}\n  ${end}`;
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const indexPath = new URL('../index.html', import.meta.url);
  try {
    const markup = await readFile(indexPath, 'utf8');
    await writeFile(indexPath, withShareUrl(markup, normalizeSiteUrl(process.argv[2])));
    console.log('已写入规范网址、搜索结构化数据和分享地址');
  } catch (error) {
    console.error(error.message);
    console.error('用法  node scripts/set-share-url.mjs https://games.example.com/back-to-ceo/');
    process.exitCode = 1;
  }
}
