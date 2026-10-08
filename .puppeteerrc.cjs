/**
 * Vercel only serves the web app. Chromium is downloaded on the worker host.
 * Set PUPPETEER_SKIP_DOWNLOAD=true to skip the download anywhere else.
 */
module.exports = {
  skipDownload: process.env.VERCEL === '1' || process.env.PUPPETEER_SKIP_DOWNLOAD === 'true',
};
