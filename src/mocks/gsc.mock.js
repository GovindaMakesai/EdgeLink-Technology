const { buildSearchConsoleMock } = require('./simulated');

module.exports = buildSearchConsoleMock({
  siteUrl: 'https://www.wikipedia.org/',
  keyword: 'wikipedia',
});
module.exports.buildSearchConsoleMock = buildSearchConsoleMock;
