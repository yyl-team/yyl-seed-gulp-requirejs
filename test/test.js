'use strict';
const expect = require('chai').expect;
const path = require('path');
const http = require('http');
const fs = require('fs');
const frp = require('yyl-file-replacer');
const util = require('yyl-util');
const extFs = require('yyl-fs');

const seed = require('../index.js');

const TEST_CTRL = {
  ALL: true,
  WATCH: true,
  EXAMPLES: true,
  INIT: true
};

const FRAG_PATH = path.join(__dirname, '__frag');
const fn = {
  hideUrlTail: function(url) {
    return url
      .replace(/\?.*?$/g, '')
      .replace(/#.*?$/g, '');
  },
  frag: {
    clearDest(config) {
      return extFs.removeFiles(config.alias.destRoot);
    },
    here(f, done) {
      new util.Promise((next) => {
        fn.frag.build().then(() => {
          next();
        });
      }).then((next) => {
        f(next);
      }).then(() => {
        fn.frag.destroy().then(() => {
          done();
        });
      }).start();
    },
    build() {
      if (fs.existsSync(FRAG_PATH)) {
        return extFs.removeFiles(FRAG_PATH);
      } else {
        return extFs.mkdirSync(FRAG_PATH);
      }
    },
    destroy() {
      return extFs.removeFiles(FRAG_PATH, true);
    }
  }
};

// + main
const linkCheck = function (config, next) {
  const htmlArr = util.readFilesSync(config.alias.destRoot, /\.html$/);
  const cssArr = util.readFilesSync(config.alias.destRoot, /\.css$/);
  const jsArr = util.readFilesSync(config.alias.destRoot, /\.js$/);

  const destRoot = config.alias.destRoot;
  const LOCAL_SOURCE_REG = new RegExp(`^(${config.commit.hostname})`);
  const REMOTE_SOURCE_REG = /^(http[s]?:|\/\/\w)/;
  const ABSOLUTE_SOURCE_REG = /^\/(\w)/;
  const RELATIVE_SOURCE_REG = /^\./;
  const NO_PROTOCOL = /^\/\/(\w)/;

  const localSource = [];
  const remoteSource = [];
  const notMatchLocalSource = [];

  const sourcePickup = function (iPath, dir) {
    if (iPath.match(LOCAL_SOURCE_REG)) {
      localSource.push(
        fn.hideUrlTail(
          util.path.join(destRoot, iPath.replace(LOCAL_SOURCE_REG, ''))
        )
      );
    } else if (iPath.match(ABSOLUTE_SOURCE_REG)) {
      localSource.push(
        fn.hideUrlTail(
          util.path.join(destRoot, iPath.replace(LOCAL_SOURCE_REG, '$1'))
        )
      );
    } else if (iPath.match(REMOTE_SOURCE_REG)) {
      remoteSource.push(iPath);
    } else if (iPath.match(RELATIVE_SOURCE_REG)) {
      localSource.push(
        fn.hideUrlTail(
          util.path.join(dir, iPath)
        )
      );
    }
  };

  htmlArr.forEach((iPath) => {
    frp.htmlPathMatch(fs.readFileSync(iPath).toString(), (mPath) => {
      sourcePickup(mPath, path.dirname(iPath));
      return mPath;
    });
  });

  cssArr.forEach((iPath) => {
    frp.cssPathMatch(fs.readFileSync(iPath).toString(), (mPath) => {
      sourcePickup(mPath, path.dirname(iPath));
      return mPath;
    });
  });

  jsArr.forEach((iPath) => {
    frp.jsPathMatch(fs.readFileSync(iPath).toString(), (mPath) => {
      sourcePickup(mPath, path.dirname(iPath));
      return mPath;
    });
  });

  localSource.forEach((iPath) => {
    if (!fs.existsSync(iPath)) {
      notMatchLocalSource.push(iPath);
    }
  });

  let padding = remoteSource.length +  notMatchLocalSource.length;
  const paddingCheck = function () {
    if (!padding) {
      next();
    }
  };

  remoteSource.forEach((iPath) => {
    var rPath = iPath;
    if (rPath.match(NO_PROTOCOL)) {
      rPath = rPath.replace(NO_PROTOCOL, 'http://$1');
    }


    http.get(rPath, (res) => {
      expect([rPath, res.statusCode]).to.deep.equal([rPath, 200]);
      padding--;
      paddingCheck();
    });
  });

  notMatchLocalSource.forEach((iPath) => {
    var rPath = util.path.join(
      config.commit.hostname,
      util.path.relative(config.alias.destRoot, iPath)
    );
    if (rPath.match(NO_PROTOCOL)) {
      rPath = rPath.replace(NO_PROTOCOL, 'http://$1');
    }

    http.get(rPath, (res) => {
      expect([iPath, rPath, res.statusCode]).to.deep.equal([iPath, rPath, 200]);
      padding--;
      paddingCheck();
    });
  });
  paddingCheck();
};

if (TEST_CTRL.EXAMPLES) {
  describe('seed.example test', () => {
    it('examples test', function(done) {
      this.timeout(0);
      expect(seed.examples.length).not.equal(0);
      seed.examples.forEach((type) => {
        expect(/^\./.test(type)).not.equal(true);
      });
      done();
    });
  });
}

if (TEST_CTRL.INIT) {
  describe('seed.init test', () => {
    const COMMONS_PATH = util.path.join(seed.path, 'commons');

    // 完整性校验
    const checkComplatable = (type, targetPath) => {
      const MAIN_PATH = util.path.join(seed.path, 'examples', type);

      const fromCommons = util.readFilesSync(COMMONS_PATH, (iPath) => {
        const relativePath = util.path.relative(COMMONS_PATH, iPath);
        return !relativePath.match(seed.init.FILTER.COPY_FILTER);
      });

      const fromMains = util.readFilesSync(MAIN_PATH, (iPath) => {
        const relativePath = util.path.relative(MAIN_PATH, iPath);
        return !relativePath.match(seed.init.FILTER.COPY_FILTER);
      });

      fromCommons.forEach((fromPath) => {
        const toPath = util.path.join(
          targetPath,
          util.path.relative(COMMONS_PATH, fromPath)
        );
        expect(fs.existsSync(toPath)).to.equal(true);
      });

      fromMains.forEach((fromPath) => {
        const toPath = util.path.join(
          targetPath,
          util.path.relative(MAIN_PATH, fromPath)
        );
        expect(fs.existsSync(toPath)).to.equal(true);
      });
    };

    // 可以性校验
    const checkUsage = (configPath) => {
      const config = util.requireJs(configPath);
      const dirname = path.dirname(configPath);
      const configKeys = Object.keys(config);
      const runner = (next) => {
        expect(configKeys.length).not.equal(0);
        seed.optimize(config, dirname).all().on('finished', () => {
          expect(fs.readdirSync(path.join(dirname, 'dist')).length).not.equal(0);
          next();
        });
      };
      return new Promise(runner);
    };

    seed.examples.forEach((type) => {
      it(`init ${type}`, function(done) {
        this.timeout(0);
        fn.frag.here((next) => {
          const targetPath = path.join(FRAG_PATH, type);
          extFs.mkdirSync(targetPath);
          seed.init(type, targetPath).on('finished', () => {
            checkComplatable(type, targetPath);
            const configPath = path.join(targetPath, 'config.js');
            setTimeout(() => {
              checkUsage(configPath).then(() => {
                next();
              });
            }, 1000);
          });
        }, done);
      });
    });
  });
}

if (TEST_CTRL.WATCH || TEST_CTRL.ALL) {
  describe('seed wath, all test', () => {
    const CONFIG_PATH = path.join(FRAG_PATH, 'main/config.js');
    const TEST_PATH = path.join(__dirname, 'demo');
    const CONFIG_DIR = path.dirname(CONFIG_PATH);

    let config = null;
    let opzer = null;

    it ('build frag & copy', function (done) {
      this.timeout(0);
      fn.frag.build().then(() => {
        extFs.copyFiles(TEST_PATH, FRAG_PATH).then(() => {
          done();
        });
      });
    });

    // + config iOpzer init
    it ('config init', function (done) {
      this.timeout(0);
      opzer = seed.optimize(util.requireJs(CONFIG_PATH), CONFIG_DIR);
      config = opzer.getConfigSync();
      done();
    });
    // - config iOpzer init

    if (TEST_CTRL.ALL) {
      it ('all test', function (done) {
        this.timeout(0);
        fn.frag.clearDest(config).then(() => {
          opzer.all()
            .on('finished', () => {
              linkCheck(config, () => {
                done();
              });
            });
        });
      });

      it ('all --remote test', function (done) {
        this.timeout(0);
        fn.frag.clearDest(config).then(() => {
          opzer.all({ remote: true })
            .on('finished', () => {
              linkCheck(config, () => {
                done();
              });
            });
        });
      });

      it ('all --isCommit test', function (done) {
        this.timeout(0);
        fn.frag.clearDest(config).then(() => {
          opzer.all({ isCommit: true })
            .on('finished', () => {
              linkCheck(config, () => {
                done();
              });
            });
        });
      });
    }


    if (TEST_CTRL.WATCH) {
      it ('watch test', function (done) {
        this.timeout(0);

        new util.Promise((next) => {
          fn.frag.clearDest(config).then(() => {
            opzer.watch()
              .on('finished', () => {
                next();
              });
          });
        }).then((next) => { // testing map init
          const checkingMap = {};

          // p-test
          checkingMap[
            util.path.join(config.alias.srcRoot, 'components/p-test/p-test.js')
          ] = [
            util.path.join(config.alias.jsDest, 'test.js'),
            util.path.join(config.alias.htmlDest, 'test.html')
          ];

          checkingMap[
            util.path.join(config.alias.srcRoot, 'components/p-test/p-test.scss')
          ] = [
            util.path.join(config.alias.cssDest, 'test.css'),
            util.path.join(config.alias.htmlDest, 'test.html')
          ];

          checkingMap[
            util.path.join(config.alias.srcRoot, 'components/p-test/p-test.pug')
          ] = [
            util.path.join(config.alias.htmlDest, 'test.html')
          ];

          // w-hello
          checkingMap[
            util.path.join(config.alias.srcRoot, 'components/w-hello/w-hello.js')
          ] = [
            util.path.join(config.alias.jsDest, 'test.js'),
            util.path.join(config.alias.htmlDest, 'test.html')
          ];

          checkingMap[
            util.path.join(config.alias.srcRoot, 'components/w-hello/w-hello.scss')
          ] = [
            util.path.join(config.alias.cssDest, 'test.css'),
            util.path.join(config.alias.htmlDest, 'test.html')
          ];

          // w-layout
          checkingMap[
            util.path.join(config.alias.srcRoot, 'components/w-layout/w-layout.pug')
          ] = [
            util.path.join(config.alias.htmlDest, 'test.html')
          ];

          // js/*
          checkingMap[
            util.path.join(config.alias.srcRoot, 'js/lib/artTemplate/artTemplate.js')
          ] = [
            util.path.join(config.alias.jsDest, 'test.js'),
            util.path.join(config.alias.htmlDest, 'test.html')
          ];

          // sass/*
          checkingMap[
            util.path.join(config.alias.srcRoot, 'sass/base/_mixin.scss')
          ] = [
            util.path.join(config.alias.cssDest, 'test.css'),
            util.path.join(config.alias.htmlDest, 'test.html')
          ];

          next(checkingMap);
        }).then((checkingMap, next) => { // run watch test
          const checkit = function (src, destArr, done) {
            opzer.response.off();
            const iPaths = [];
            opzer.response.on('onOptimize', (iPath) => {
              iPaths.push(iPath);
            });
            opzer.response.on('finished', () => {
              destArr.forEach((dest) => {
                // console.log('===', 'expect', iPaths, `src: ${src}`, `dest: ${dest}`, iPaths.indexOf(dest));
                expect(iPaths.indexOf(dest)).not.equal(-1);
              });
              done();
            });
            expect(fs.existsSync(src)).to.equal(true);
            let iCnt = fs.readFileSync(src).toString();
            setTimeout(() => {
              fs.writeFileSync(src, `${iCnt}\n`);
            }, 100);
          };

          let index = 0;
          (function runner() {
            const keyArr = Object.keys(checkingMap);
            const key = keyArr[index];
            if (key) {
              checkit(key, checkingMap[key], () => {
                index++;
                runner();
              });
            } else {
              next();
            }
          })();
        }).then(() => {
          done();
        }).start();
      });
    }

    // - main
    it ('destroy frag', function (done) {
      this.timeout(0);
      fn.frag.destroy().then(() => {
        done();
      });
    });
  });
}
