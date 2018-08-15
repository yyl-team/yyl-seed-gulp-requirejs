'use strict';
const expect = require('chai').expect;
const path = require('path');
const http = require('http');
const fs = require('fs');
const frp = require('yyl-file-replacer');
const util = require('yyl-util');
const opzer = require('../index.js');

const TEST_CTRL = {
  // ALL: true,
  // WATCH: true,
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
      return new Promise((next) => {
        if (fs.existsSync(config.alias.destRoot)) {
          util.removeFiles(config.alias.destRoot);
        }

        setTimeout(() => {
          next();
        }, 100);
      });
    },
    build() {
      return new Promise((next) => {
        if (fs.existsSync(FRAG_PATH)) {
          util.removeFiles(FRAG_PATH);
        } else {
          util.mkdirSync(FRAG_PATH);
        }
        setTimeout(() => {
          next();
        }, 100);
      });
    },
    destroy() {
      return new Promise((next) => {
        try {
          if (fs.existsSync(FRAG_PATH)) {
            util.removeFiles(FRAG_PATH, true);
          }

          setTimeout(() => {
            next();
          }, 100);
        } catch (er) {
          next();
        }
      });
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
  describe('opzer.example test', () => {
    it('examples test', function(done) {
      this.timeout(0);
      expect(opzer.examples.length).not.equal(0);
      opzer.examples.forEach((type) => {
        expect(/^\./.test(type)).not.equal(true);
      });
      done();
    });
  });
}

if (TEST_CTRL.INIT) {
  describe('opzer.init test', () => {
    opzer.examples.filter((type) => {
      // if (type === 'single-project') {
      //   return false;
      // }
      return true;
    }).forEach((type) => {
      if (type == 'commons') {
        return;
      }
      it(`init ${type}`, function(done) {
        this.timeout(0);

        new util.Promise((next) => { // build frag
          fn.frag.build().then(() => {
            next();
          });
        }).then((next) => { // run
          opzer.init(type, FRAG_PATH).on('finished', () => {
            setTimeout(() => {
              next();
            }, 200);
          });
        }).then((next) => { // check completable
          const COMMONS_PATH = util.path.join(opzer.path, 'commons');
          const MAIN_PATH = util.path.join(opzer.path, 'examples', type);

          const fromCommons = util.readFilesSync(COMMONS_PATH, (iPath) => {
            const relativePath = util.path.relative(COMMONS_PATH, iPath);
            return !relativePath.match(opzer.init.FILTER.COPY_FILTER);
          });

          const fromMains = util.readFilesSync(MAIN_PATH, (iPath) => {
            const relativePath = util.path.relative(MAIN_PATH, iPath);
            return !relativePath.match(opzer.init.FILTER.COPY_FILTER);
          });

          fromCommons.forEach((fromPath) => {
            const toPath = util.path.join(
              FRAG_PATH,
              util.path.relative(COMMONS_PATH, fromPath)
            );
            expect(fs.existsSync(toPath)).to.equal(true);
          });

          fromMains.forEach((fromPath) => {
            const toPath = util.path.join(
              FRAG_PATH,
              util.path.relative(MAIN_PATH, fromPath)
            );
            expect(fs.existsSync(toPath)).to.equal(true);
          });
          next();
        }).then((next) => { // check usage
          const CONFIG_PATH = util.path.join(FRAG_PATH, 'config.js');
          const config = util.requireJs(CONFIG_PATH);
          console.log(88888888, type, CONFIG_PATH, fs.existsSync(CONFIG_PATH))
          opzer.optimize(config, FRAG_PATH).all().on('finished', (tt) => {
            console.log('finished', tt)
            expect(fs.readdirSync(path.join(FRAG_PATH, 'dist')).length).not.equal(0);
            next();
          });
        }).then((next) => { // delete frag
            console.log(3333333333333333333, type)
          fn.frag.destroy().then(() => {
            next();
          });
        }).then(() => {
          done();
        }).start();
      });
    });
  });
}

if (TEST_CTRL.WATCH || TEST_CTRL.ALL) {
  describe('opzer wath, all test', () => {
    const CONFIG_PATH = path.join(FRAG_PATH, 'main/config.js');
    const TEST_PATH = path.join(__dirname, 'demo');
    const CONFIG_DIR = path.dirname(CONFIG_PATH);

    let config = null;
    let iOpzer = null;

    it ('build frag & copy', function (done) {
      this.timeout(0);
      fn.frag.build().then(() => {
        util.copyFiles(
          TEST_PATH,
          FRAG_PATH,
          () => {
            done();
          }
        );
      });
    });

    // + config iOpzer init
    it ('config init', function (done) {
      this.timeout(0);
      config = util.requireJs(CONFIG_PATH);
      // Object.keys(config.alias).forEach((key) => {
      //   config.alias[key] = util.path.join(CONFIG_DIR, config.alias[key]);
      // });
      iOpzer = opzer.optimize(config, CONFIG_DIR);
      done();
    });
    // - config iOpzer init

    if (TEST_CTRL.ALL) {
      it ('all test', function (done) {
        this.timeout(0);
        iOpzer.response.off();
        iOpzer.response.on('finished', () => {
          linkCheck(config, () => {
            done();
          });
        });
        fn.frag.clearDest(config).then(() => {
          iOpzer.all();
        });
      });

      it ('all --remote test', function (done) {
        this.timeout(0);
        iOpzer.response.off();
        iOpzer.response.on('finished', () => {
          linkCheck(config, () => {
            done();
          });
        });
        fn.frag.clearDest(config).then(() => {
          iOpzer.all({
            remote: true
          });
        });
      });

      it ('all --isCommit test', function (done) {
        this.timeout(0);
        iOpzer.response.off();
        iOpzer.response.on('finished', () => {
          linkCheck(config, () => {
            done();
          });
        });
        fn.frag.clearDest(config).then(() => {
          iOpzer.all({
            isCommit: true
          });
        });
      });
    }


    if (TEST_CTRL.WATCH) {
      it ('watch test', function (done) {
        this.timeout(0);

        new util.Promise((next) => {
          iOpzer.response.off();
          iOpzer.response.on('finished', () => {
            next();
          });
          fn.frag.clearDest(config).then(() => {
            iOpzer.watch();
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
            iOpzer.response.off();
            const iPaths = [];
            iOpzer.response.on('onOptimize', (iPath) => {
              iPaths.push(iPath);
            });
            iOpzer.response.on('finished', () => {
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
