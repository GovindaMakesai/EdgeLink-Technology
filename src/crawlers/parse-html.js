import * as cheerio from 'cheerio';

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function resolveLink(href, base) {
  if (!href) return null;
  const raw = href.trim();
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) {
    return null;
  }
  try {
    return new URL(raw, base).href;
  } catch {
    return null;
  }
}

export function analyzeHtml(html, pageUrl, statusCode = 200) {
  const $ = cheerio.load(html || '');
  const base = pageUrl;
  let hostname = '';
  try {
    hostname = new URL(pageUrl).hostname.replace(/^www\./, '');
  } catch {
    hostname = '';
  }

  const title = text($('title').first().text());
  const metaDescription = text($('meta[name="description" i]').attr('content'));
  const canonical = $('link[rel="canonical" i]').attr('href') || '';
  const robotsMeta = text($('meta[name="robots" i]').attr('content'));
  const viewport = text($('meta[name="viewport" i]').attr('content'));
  const h1 = $('h1')
    .map((_, el) => text($(el).text()))
    .get()
    .filter(Boolean);
  const h2 = $('h2')
    .map((_, el) => text($(el).text()))
    .get()
    .filter(Boolean);
  const h3 = $('h3')
    .map((_, el) => text($(el).text()))
    .get()
    .filter(Boolean);

  const images = $('img')
    .map((_, el) => ({
      src: $(el).attr('src') || '',
      alt: $(el).attr('alt'),
    }))
    .get();
  const imagesWithoutAlt = images.filter((image) => !text(image.alt)).length;

  const internalLinks = [];
  const externalLinks = [];
  $('a[href]').each((_, el) => {
    const href = resolveLink($(el).attr('href'), base);
    if (!href) return;
    try {
      const host = new URL(href).hostname.replace(/^www\./, '');
      const item = { href, text: text($(el).text()).slice(0, 140) };
      if (hostname && host === hostname) internalLinks.push(item);
      else externalLinks.push(item);
    } catch {
      /* ignore malformed hrefs */
    }
  });

  const jsonLd = [];
  const jsonLdErrors = [];
  $('script[type="application/ld+json"]').each((index, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      jsonLd.push(JSON.parse(raw));
    } catch (error) {
      const match = String(error.message || '').match(/position\s+(\d+)/i);
      const position = match ? Number(match[1]) : null;
      const start = position == null ? 0 : Math.max(0, position - 40);
      const end = position == null ? 180 : Math.min(raw.length, position + 40);
      jsonLdErrors.push({
        index,
        message: error.message,
        position,
        excerpt: raw.slice(start, end),
      });
    }
  });

  const bodyText = text($('body').text());
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  return {
    url: pageUrl,
    statusCode,
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    canonical: canonical ? resolveLink(canonical, base) || canonical : '',
    robotsMeta,
    viewport,
    h1,
    h2,
    h3,
    imageCount: images.length,
    imagesWithoutAlt,
    internalLinks: internalLinks.slice(0, 40),
    externalLinks: externalLinks.slice(0, 40),
    internalLinkCount: internalLinks.length,
    externalLinkCount: externalLinks.length,
    wordCount,
    textSample: bodyText.slice(0, 1600),
    openGraph: {
      title: text($('meta[property="og:title" i]').attr('content')),
      description: text($('meta[property="og:description" i]').attr('content')),
      image: text($('meta[property="og:image" i]').attr('content')),
      type: text($('meta[property="og:type" i]').attr('content')),
    },
    jsonLd,
    jsonLdErrors,
  };
}
