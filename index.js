const path = require('path');
const opzer = require('./optimize/index.js');
const cmd = {
  path: __dirname,
  example: path.join(__dirname, 'examples'),
  optimize: opzer
};

module.exports = cmd;
