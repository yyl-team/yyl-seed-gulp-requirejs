const path = require('path');
const opzer = require('./lib/optimize.js');
const pkg = require('./package.json');
const cmd = {
  name: 'gulp-requirejs',
  version: pkg.version,
  path: __dirname,
  example: path.join(__dirname, 'examples'),
  optimize: opzer
};

module.exports = cmd;
