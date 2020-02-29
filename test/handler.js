const fs = require('fs');
const path = require('path');
const extFs = require('yyl-fs');
const tUtil = require('yyl-seed-test-util');
const print = require('yyl-print');
const Hander = require('yyl-hander');
const { Runner } = require('yyl-server');
const chalk = require('chalk');

const USERPROFILE = process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'];
const WORKFLOW = 'gulp-requirejs';
const RESOLVE_PATH = path.join(USERPROFILE, `.yyl/plugins/${WORKFLOW}`);


const seed = require('../index.js');

const yh = new Hander({
  log: function (type, status, args) {
    switch (type) {
      case 'msg':
        if (print.log[status]) {
          print.log[status](args);
        } else {
          print.log.info(args);
        }
        break;

      default:
        break;
    }
  },
  vars: {
    PROJECT_PATH: process.cwd()
  }
});

const fn = {
  clearDest(config) {
    return new Promise((next) => {
      extFs.removeFiles(config.alias.destRoot).then(() => {
        extFs.copyFiles(config.resource).then(() => {
          next();
        });
      });
    });
  },
  async initPlugins(config) {
    if (config.plugins && config.plugins.length) {
      if (!fs.existsSync(RESOLVE_PATH)) {
        extFs.mkdirSync(RESOLVE_PATH);
      }
      await tUtil.initPlugins(config.plugins, RESOLVE_PATH);
    }
    return config;
  }
};

const handler = {
  async all({ env }) {
    print.log.setLogLevel( env.silent ? 0 : 2);

    let configPath;
    let config;

    if (env.config) {
      configPath = path.resolve(process.cwd(), env.config);
      if (!fs.existsSync(configPath)) {
        return print.log.warn(`config path not exists: ${configPath}`);
      } else {
        env.workflow = WORKFLOW;
        config = await yh.parseConfig(configPath);
      }
    } else {
      return print.log.warn('task need --config options');
    }

    const PROJECT_PATH = path.dirname(configPath);

    yh.setVars({ PROJECT_PATH });
    yh.optimize.init({ config, iEnv: env });
    await yh.optimize.initPlugins();

    const opzer = seed.optimize(config, PROJECT_PATH);

    await extFs.removeFiles(config.alias.destRoot);
    await extFs.removeFiles(config.resource);

    await new Promise((next) => {
      let isError = false;
      opzer.all(env)
        .on('msg', (type, ...argv) => {
          let iType = type;
          if (!print.log[type]) {
            iType = 'info';
          }
          print.log[iType](...argv);
          if (type === 'error') {
            isError = argv;
          }
        })
        .on('clear', () => {
          // print.cleanScreen();
        })
        .on('loading', (pkgName) => {
          print.log.loading(`loading module ${chalk.green(pkgName)}`);
        })
        .on('finished', async() => {
          if (isError) {
            print.log.error('task error', ...isError);
          } else {
            print.log.success('task finished');
          }
          next();
        });
    });

    return config;
  },
  async watch({ env }) {
    let config;
    let configPath;
    if (env.silent) {
      print.log.setLogLevel(0);
    } else {
      print.log.setLogLevel(2);
    }
    if (env.config) {
      configPath = path.resolve(process.cwd(), env.config);
      if (!fs.existsSync(configPath)) {
        return print.log.warn(`config path not exists: ${configPath}`);
      } else {
        env.workflow = WORKFLOW;
        config = await yh.parseConfig(configPath, env);
      }
    } else {
      return print.log.warn('task need --config options');
    }

    const PROJECT_PATH = path.dirname(configPath);
    yh.setVars({ PROJECT_PATH });

    yh.optimize.init({config, iEnv: env });
    await yh.optimize.initPlugins();

    // 本地服务器
    const runner = new Runner({
      config,
      env,
      log(type, argu) {
        if (print.log[type]) {
          print.log[type](...argu);
        } else {
          print.log.info(...argu);
        }
      },
      cwd: PROJECT_PATH
    });

    await runner.start();

    config = runner.config;

    const opzer = seed.optimize(config, PROJECT_PATH);

    await fn.clearDest(config);

    await new Promise((next) => {
      let isUpdate = false;
      opzer.watch(env)
        .on('clear', () => {
          if (!env.silent) {
            // print.cleanScreen();
          }
        })
        .on('msg', (type, ...argv) => {
          let iType = type;
          if (!print.log[type]) {
            iType = 'info';
          }
          if (!env.silent) {
            print.log[iType](...argv);
          }
        })
        .on('finished', async() => {
          if (!isUpdate) {
            if (!env.silent) {
              yh.optimize.openHomePage();
            }
            // eslint-disable-next-line require-atomic-updates
            isUpdate = true;
          }
          next();
        });
    });
    if (!env.silent) {
      print.log.success('task finished');
    }
  }
};

module.exports = handler;