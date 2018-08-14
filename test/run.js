const fs = require('fs');
const path = require('path');
const util = require('yyl-util');

const opzer = require('../index.js');

let config = {};

util.msg.init({
  maxSize: 8,
  type: {
    rev: {name: 'rev', color: '#ffdd00'},
    concat: {name: 'Concat', color: 'cyan'},
    update: {name: 'Updated', color: 'cyan'},
    proxyTo: {name: 'Proxy =>', color: 'gray'},
    proxyBack: {name: 'Proxy <=', color: 'cyan'},
    supercall: {name: 'Supercal', color: 'magenta'},
    optimize: {name: 'Optimize', color: 'green'},
    cmd: {name: 'CMD', color: 'gray'}
  }
});

const fn = {
  clearDest() {
    return new Promise((next) => {
      if (fs.existsSync(config.alias.destRoot)) {
        util.removeFiles(config.alias.destRoot);
      }

      setTimeout(() => {
        next();
      }, 100);
    });
  }
};

const runner = {
  init(iEnv) {
    if (!iEnv.path) {
      return util.msg.warn('task need --path options');
    }
    const initPath = path.resolve(process.cwd(), iEnv.path);

    // build path
    util.mkdirSync(initPath);

    // init
    opzer.init('single-project', initPath)
      .on('msg', (...argv) => {
        const [type, iArgv] = argv;
        let iType = type;
        if (!util.msg[type]) {
          iType = 'info';
        }
        util.msg[iType](iArgv);
      })
      .on('finished', () => {
        util.openPath(initPath);
      });
  },
  all(iEnv) {
    let configPath;
    if (iEnv.config) {
      configPath = path.resolve(process.cwd(), iEnv.config);
      if (!fs.existsSync(configPath)) {
        return util.msg.warn(`config path not exists: ${configPath}`);
      } else {
        config = util.requireJs(configPath);
      }
    } else {
      return util.msg.warn('task need --config options');
    }

    const CONFIG_DIR = path.dirname(configPath);
    const iOpzer = opzer.optimize(config, CONFIG_DIR);

    const res = iOpzer.response;
    res.off();
    res.on('msg', (...argv) => {
      const [type, iArgv] = argv;
      let iType = type;
      if (!util.msg[type]) {
        iType = 'info';
      }
      util.msg[iType](iArgv);
    });
    res.on('finished', () => {
      util.msg.success('task finished');
    });
    res.on('clear', () => {
      util.cleanScreen();
    });
    fn.clearDest(config).then(() => {
      iOpzer.all();
    });
  },
  watch(iEnv) {
    let configPath;
    if (iEnv.config) {
      configPath = path.resolve(process.cwd(), iEnv.config);
      if (!fs.existsSync(configPath)) {
        return util.msg.warn(`config path not exists: ${configPath}`);
      } else {
        config = util.requireJs(configPath);
      }
    } else {
      return util.msg.warn('task need --config options');
    }

    const CONFIG_DIR = path.dirname(configPath);
    const iOpzer = opzer.optimize(config, CONFIG_DIR);

    const res = iOpzer.response;

    res.off();
    res.on('msg', (...argv) => {
      const [type, iArgv] = argv;
      let iType = type;
      if (!util.msg[type]) {
        iType = 'info';
      }
      util.msg[iType](iArgv);
    });
    res.on('finished', () => {
      util.msg.success('task finished');
    });
    res.on('clear', () => {
      util.cleanScreen();
    });
    fn.clearDest(config).then(() => {
      iOpzer.watch();
    });
  }
};

(() => {
  const ctrl = process.argv[2];
  const iEnv = util.envParse(process.argv.slice(3));

  if (ctrl in runner) {
    runner[ctrl](iEnv);
  } else {
    util.msg.warn(`usage: ${Object.keys(runner).join(',')}`);
  }
})();


