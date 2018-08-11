const fs = require('fs');
const path = require('path');
const gFn = require('./fn.js');
const util = require('yyl-util');

const iRes = gFn.response();


const EXAMPLE_PATH = path.join(__dirname, '../examples');
const EXAMPLE_FILTER = /^(\..+|commons)/;

const COPY_FILTER = /package\.json|gulpfile\.js|\.DS_Store|\.sass-cache|dist|webpack\.config\.js|config\.mine\.js|node_modules/;
const COMMONS_PATH = path.join(EXAMPLE_PATH, 'commons');


const EXAMPLES = (() => {
  const dirs = fs.readdirSync(EXAMPLE_PATH);
  dirs.filter((dirname) => {
    return !dirname.match(EXAMPLE_FILTER);
  });
  return dirs;
})();

const init = (type, targetPath) => {
  iRes.trigger('start', 'init');
  const FROM_PATH = util.path.join(EXAMPLE_PATH, type);

  if (!~EXAMPLES.indexOf(type)) {
    iRes.trigger('msg', ['error', `${type} is not exists`]);
    iRes.trigger('finished');
    return;
  }

  if (!fs.existsSync(targetPath)) {
    iRes.trigger('msg', ['error', `${targetPath} is not exists`]);
    iRes.trigger('finished');
    return;
  }

  // copy commons file
  const task01 = new Promise((next, reject) => {
    iRes.trigger('msg', ['info', 'copy commons file start']);
    util.copyFiles(
      COMMONS_PATH,
      targetPath,
      (err, files) => {
        if (err) {
          return reject(['copy commons file error', err]);
        }
        files.forEach((file) => {
          iRes.trigger('msg', ['create', file]);
        });
        iRes.trigger('msg', ['info', 'copy commons file finished']);
        next();
      },
      (iPath) => {
        console.log('===', iPath)
        var relativePath = util.path.relative(FROM_PATH, iPath);
        if (relativePath.match(COPY_FILTER))  {
          return false;
        } else {
          return true;
        }
      },
      null,
      targetPath,
      true
    );
  });

  // copy examples file
  const task02 = new Promise((next, reject) => {
    iRes.trigger('msg', ['info', 'copy examples file start']);
    util.copyFiles(
      FROM_PATH,
      targetPath,
      (err, files) => {
        if (err) {
          return reject(['copy examples file error', err]);
        }
        files.forEach((file) => {
          iRes.trigger('msg', ['create', file]);
        });
        iRes.trigger('msg', ['info', 'copy examples file finished']);
        next();
      },
      (iPath) => {
        var relativePath = util.path.relative(FROM_PATH, iPath);
        if (relativePath.match(COPY_FILTER))  {
          return false;
        } else {
          return true;
        }
      },
      null,
      targetPath,
      true
    );
  });

  // create dist file
  const task03 = new Promise((next) => {
    iRes.trigger('msg', ['info', 'create dist document start']);
    const DIST_PATH = util.path.join(targetPath, 'dist');
    if (!fs.existsSync(DIST_PATH)) {
      fs.mkdirSync(DIST_PATH);
      iRes.trigger('msg', ['create', DIST_PATH]);
    }
    iRes.trigger('msg', ['info', 'create dist document finished']);
    return next();
  });

  Promise.all([task01, task02, task03]).then(() => {
    return iRes.trigger('finished', ['init']);
  }).catch((er) => {
    iRes.trigger('msg', ['error', er]);
    iRes.trigger('finished', 'init');
  });

  return iRes;
};

init.examples = EXAMPLES;
init.FILTER = {
  COPY_FILTER,
  EXAMPLE_FILTER
};

module.exports = init;
