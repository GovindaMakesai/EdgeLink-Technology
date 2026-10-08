const FALLBACK_DEMO_URL = 'https://www.edgelinktechnology.com/';

export function demoTargetUrl(env = process.env) {
  const configured = String(env.DEMO_TARGET_URL || '').trim();
  if (!configured) return FALLBACK_DEMO_URL;
  try {
    const url = new URL(configured);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return FALLBACK_DEMO_URL;
    return configured;
  } catch {
    return FALLBACK_DEMO_URL;
  }
}

export function demoFormDefaults(env = process.env) {
  const url = demoTargetUrl(env);
  let host = 'website';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    host = 'website';
  }
  const encyclopedia = host === 'wikipedia.org' || host.endsWith('.wikipedia.org');
  const edgelink = host === 'edgelinktechnology.com';
  return {
    url,
    businessType: encyclopedia ? 'Encyclopedia' : edgelink ? 'Digital marketing agency' : 'Public website',
    city: encyclopedia ? 'Global' : '',
    state: encyclopedia ? 'Worldwide' : '',
    targetKeyword: encyclopedia ? 'wikipedia' : edgelink ? 'edgelink technology' : (host.split('.')[0] || 'website'),
  };
}
