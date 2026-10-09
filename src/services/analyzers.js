function issue(code, severity, message) {
  return { code, severity, message };
}

export function analyzeOnPage(crawl) {
  const title = crawl?.title || '';
  const description = crawl?.metaDescription || '';
  const h1 = Array.isArray(crawl?.h1) ? crawl.h1 : [];
  const findings = [];

  if (!crawl?.ok && crawl?.error) {
    findings.push(issue('crawl', 'critical', crawl.error));
  }
  if (!title) findings.push(issue('title-missing', 'critical', 'The page has no title tag.'));
  else if (title.length < 30) findings.push(issue('title-short', 'important', `Title is short at ${title.length} characters.`));
  else if (title.length > 60) findings.push(issue('title-long', 'important', `Title is long at ${title.length} characters.`));

  if (!description) findings.push(issue('meta-missing', 'critical', 'Meta description is missing.'));
  else if (description.length < 70) findings.push(issue('meta-short', 'important', `Meta description is short at ${description.length} characters.`));
  else if (description.length > 160) findings.push(issue('meta-long', 'important', `Meta description is long at ${description.length} characters.`));

  if (h1.length === 0) findings.push(issue('h1-missing', 'critical', 'The page has no H1.'));
  if (h1.length > 1) findings.push(issue('h1-multiple', 'important', `The page has ${h1.length} H1 headings.`));

  const h2 = crawl?.h2 || [];
  const duplicateH2 = h2.filter((item, index) => h2.indexOf(item) !== index);
  if (duplicateH2.length) {
    findings.push(issue('h2-duplicate', 'low', 'Duplicate H2 text was detected.'));
  }

  if (!crawl?.canonical) findings.push(issue('canonical-missing', 'important', 'Canonical link is missing.'));
  if ((crawl?.imagesWithoutAlt || 0) > 0) {
    findings.push(issue('alt-missing', 'important', `${crawl.imagesWithoutAlt} image${crawl.imagesWithoutAlt === 1 ? '' : 's'} missing alt text.`));
  }
  if ((crawl?.internalLinkCount || 0) < 3) {
    findings.push(issue('internal-links', 'important', 'Internal linking is thin.'));
  }
  if ((crawl?.wordCount || 0) < 300) {
    findings.push(issue('thin-content', 'important', `Visible copy is about ${crawl?.wordCount || 0} words.`));
  }
  if (!crawl?.openGraph?.title && !crawl?.openGraph?.description) {
    findings.push(issue('og-missing', 'low', 'Open Graph title and description are missing.'));
  }
  if (crawl?.robotsMeta && /noindex/i.test(crawl.robotsMeta)) {
    findings.push(issue('noindex', 'critical', 'Meta robots contains noindex.'));
  }

  return {
    title: {
      exists: Boolean(title),
      value: title,
      length: title.length,
      inRange: title.length >= 30 && title.length <= 60,
    },
    metaDescription: {
      exists: Boolean(description),
      value: description,
      length: description.length,
      inRange: description.length >= 70 && description.length <= 160,
    },
    h1: {
      exists: h1.length > 0,
      count: h1.length,
      multiple: h1.length > 1,
      values: h1.slice(0, 6),
    },
    headings: {
      h2Count: h2.length,
      h3Count: (crawl?.h3 || []).length,
      duplicateH2: [...new Set(duplicateH2)].slice(0, 6),
    },
    canonical: { exists: Boolean(crawl?.canonical), value: crawl?.canonical || '' },
    robotsMeta: crawl?.robotsMeta || '',
    images: {
      count: crawl?.imageCount || 0,
      missingAlt: crawl?.imagesWithoutAlt || 0,
    },
    links: {
      internal: crawl?.internalLinkCount || 0,
      external: crawl?.externalLinkCount || 0,
    },
    content: {
      wordCount: crawl?.wordCount || 0,
      available: (crawl?.wordCount || 0) > 0,
    },
    openGraph: crawl?.openGraph || {},
    findings,
  };
}

export function analyzeTechnical(crawl) {
  const findings = [];
  const status = crawl?.statusCode;
  if (!crawl?.ok) findings.push(issue('unreachable', 'critical', crawl?.error || 'Page could not be crawled.'));
  if (status && status >= 400) findings.push(issue('http-status', 'critical', `HTTP status is ${status}.`));
  if (status && status >= 300 && status < 400) findings.push(issue('redirect', 'important', `Crawl stopped on HTTP ${status}.`));
  if (!crawl?.https) findings.push(issue('https', 'critical', 'The final URL is not HTTPS.'));
  if (!crawl?.viewport) findings.push(issue('viewport', 'important', 'Viewport meta tag is missing.'));
  if (!crawl?.canonical) findings.push(issue('canonical', 'important', 'Canonical is missing, so duplicate URLs may split signals.'));
  if (crawl?.robotsMeta && /noindex/i.test(crawl.robotsMeta)) {
    findings.push(issue('indexability', 'critical', 'The page requests noindex.'));
  }
  const headers = crawl?.headers || {};
  if (!headers['strict-transport-security']) {
    findings.push(issue('hsts', 'low', 'Strict-Transport-Security was absent on this response. That is a header observation, not a measured ranking change.'));
  }
  if (!headers['x-content-type-options']) {
    findings.push(issue('nosniff', 'low', 'X-Content-Type-Options was absent on this response. That is a header observation, not a measured ranking change.'));
  }

  return {
    statusCode: status || null,
    https: Boolean(crawl?.https),
    timingMs: crawl?.timingMs || null,
    redirects: crawl?.redirects || 0,
    finalUrl: crawl?.finalUrl || crawl?.url || '',
    canonical: crawl?.canonical || '',
    viewport: Boolean(crawl?.viewport),
    robotsMeta: crawl?.robotsMeta || '',
    indexable: !(crawl?.robotsMeta && /noindex/i.test(crawl.robotsMeta)),
    headers,
    redirectChain: crawl?.redirectChain || [],
    findings,
  };
}

function collectTypes(node, types) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectTypes(item, types));
    return;
  }
  if (node['@type']) {
    const value = node['@type'];
    if (Array.isArray(value)) value.forEach((item) => types.add(String(item)));
    else types.add(String(value));
  }
  if (Array.isArray(node['@graph'])) collectTypes(node['@graph'], types);
}

export function analyzeSchema(crawl) {
  const blocks = Array.isArray(crawl?.jsonLd) ? crawl.jsonLd : [];
  const errors = Array.isArray(crawl?.jsonLdErrors) ? crawl.jsonLdErrors : [];
  const types = new Set();
  blocks.forEach((block) => collectTypes(block, types));
  const typeList = [...types];
  const interesting = ['LocalBusiness', 'Organization', 'Dentist', 'MedicalBusiness', 'MedicalClinic', 'FAQPage', 'BreadcrumbList'];
  const presentInteresting = interesting.filter((type) => typeList.some((item) => item.toLowerCase() === type.toLowerCase()));
  const findings = [];

  if (!blocks.length && !errors.length) {
    findings.push(issue('schema-missing', 'important', 'No JSON-LD structured data was found.'));
  }
  errors.forEach((error) => {
    findings.push(issue('schema-malformed', 'critical', `JSON-LD block ${error.index} failed to parse: ${error.message}`));
  });
  if (blocks.length && !presentInteresting.length) {
    findings.push(issue('schema-generic', 'important', 'Structured data is present but no LocalBusiness, Organization, or medical type was detected.'));
  }
  const serialized = JSON.stringify(blocks);
  if (blocks.length && !/"telephone"|"address"|"name"/i.test(serialized)) {
    findings.push(issue('schema-properties', 'important', 'Useful local properties such as name, address, or telephone were not obvious in the JSON-LD.'));
  }

  return {
    present: blocks.length > 0,
    types: typeList,
    blockCount: blocks.length,
    malformed: errors,
    relevantTypes: presentInteresting,
    observations: findings.map((item) => item.message),
    findings,
  };
}

export function analyzeRobotsAndSitemap(crawl) {
  const robots = crawl?.robots || { exists: false, issues: ['robots.txt was not checked'] };
  const sitemap = crawl?.sitemap || { exists: false, issues: ['sitemap.xml was not checked'] };
  const findings = [];
  if (!robots.exists) findings.push(issue('robots-missing', 'important', 'robots.txt is missing or unreachable.'));
  if (robots.exists && !(robots.sitemaps || []).length) {
    findings.push(issue('robots-sitemap-ref', 'low', 'robots.txt does not reference a sitemap.'));
  }
  if (!sitemap.exists) findings.push(issue('sitemap-missing', 'important', 'sitemap.xml is missing or unreachable.'));
  else if (!sitemap.parseable) findings.push(issue('sitemap-parse', 'important', 'sitemap.xml was found but could not be parsed.'));
  else if ((sitemap.urlCount || 0) === 0) findings.push(issue('sitemap-empty', 'important', 'sitemap.xml did not contain any URLs.'));

  return {
    robots: {
      exists: Boolean(robots.exists),
      statusCode: robots.statusCode || null,
      parseable: robots.parseable !== false,
      sitemaps: robots.sitemaps || [],
      disallowCount: robots.disallowCount || 0,
      issues: robots.issues || [],
    },
    sitemap: {
      exists: Boolean(sitemap.exists),
      statusCode: sitemap.statusCode || null,
      parseable: Boolean(sitemap.parseable),
      url: sitemap.url || '',
      urlCount: sitemap.urlCount || 0,
      sample: sitemap.sample || [],
      issues: sitemap.issues || [],
    },
    findings,
  };
}
