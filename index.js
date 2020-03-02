const opzer = require('./lib/optimize.js')
const pkg = require('./package.json')
const cmd = {
  name: 'gulp-requirejs',
  version: pkg.version,
  path: __dirname,
  optimize: opzer,
  initPackage: {
    default: ['init-me-seed-yyl-requirejs'],
    yy: ['@yy/init-me-seed-yyl-requirejs']
  }
}

module.exports = cmd
