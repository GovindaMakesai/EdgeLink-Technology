const { buildPageSpeedMock } = require('./simulated');

module.exports = buildPageSpeedMock('https://www.wikipedia.org/');
module.exports.buildPageSpeedMock = buildPageSpeedMock;
