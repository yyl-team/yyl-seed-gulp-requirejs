const opzer = require('./lib/optimize.js');
const init = require('./lib/init.js');
const pkg = require('./package.json');
const cmd = {
  name: 'gulp-requirejs',
  version: pkg.version,
  path: __dirname,
  examples: init.examples,
  optimize: opzer,
  init: init
};

module.exports = cmd;
