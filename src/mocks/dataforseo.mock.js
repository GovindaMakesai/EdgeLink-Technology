const { buildRankingsMock } = require('./simulated');

module.exports = buildRankingsMock({
  url: 'https://www.wikipedia.org/',
  keyword: 'wikipedia',
});
module.exports.buildRankingsMock = buildRankingsMock;
