const revHash = require('rev-hash');
const chalk = require('chalk');
const util = require('yyl-util');
const fs = require('fs');
const path = require('path');
const frp = require('yyl-file-replacer');
const request = require('yyl-request');
const extFs = require('yyl-fs');

class RevMark {
  constructor({ log }) {
    this.log = log;
    this.source = {
      create: [],
      update: [],
      other: []
    };
  }
  add(type, iPath) {
    const self = this;
    self.source[type in self.source ? type : 'other'].push(iPath);
  }
  reset() {
    const self = this;
    Object.keys(self.source).forEach((key) => {
      self.source[key] = [];
    });
  }
  print() {
    const source = this.source;
    this.log('msg', 'rev', [
      chalk.green('create: ') + chalk.yellow(source.create.length),
      chalk.cyan('update: ') + chalk.yellow(source.update.length),
      chalk.gray('other: ') + chalk.yellow(source.other.length)
    ].join(', '));
  }
}

class Rev {
  constructor({ log, version, config, iEnv }) {
    this.log = log;
    this.version = version;
    this.mark = new RevMark({ log });
    this.filename = 'rev-manifest.json';
    this.config = config;
    this.iEnv = iEnv;
  }

  // protected 路径纠正
  resolveUrl(cnt, filePath, revMap) {
    const { config, iEnv } = this;
    const iExt = path.extname(filePath).replace(/^\./g, '');
    const iDir = path.dirname(filePath);
    const iHostname = (function () {
      if (iEnv.isCommit || iEnv.ver == 'remote' || iEnv.proxy) {
        return config.commit.hostname;
      } else {
        return '/';
      }
    })();
    let r = '';
    const revReplace = function (rPath) {
      let rrPath = rPath;
      Object.keys(revMap).forEach((key) => {
        if (key == 'version') {
          return;
        }
        rrPath = rrPath.split(key).join(revMap[key]);
      });
      return rrPath;
    };
    const htmlReplace = function (iCnt) {
      const rCnt = frp.htmlPathMatch(iCnt, (iPath, type) => {
        const r = (rPath) => {
          switch (type) {
            case '__url':
              return `'${revReplace(rPath)}'`;

            default:
              return revReplace(rPath);
          }
        };

        let rPath = iPath;
        if (rPath.match(frp.REG.HTML_IGNORE_REG)) {
          return r(iPath);
        } else if (rPath.match(frp.REG.HTML_ALIAS_REG)) { // 构建语法糖 {$key}
          let isMatch = false;

          rPath = rPath.replace(
            frp.REG.HTML_ALIAS_REG,
            (str, $1, $2) => {
              if (config.alias[$2]) {
                isMatch = true;
                return config.alias[$2];
              } else {
                return '';
              }
            }
          );

          if (isMatch && rPath && fs.existsSync(rPath)) {
            rPath = util.path.join(
              iHostname,
              util.path.relative(config.alias.destRoot, rPath)
            );

            return r(rPath);
          } else {
            return r(iPath);
          }
        } else {
          // url format
          rPath = util.path.join(rPath);

          // url absolute
          if (!rPath.match(frp.REG.IS_HTTP) && !path.isAbsolute(rPath)) {
            rPath = util.path.join(
              iHostname,
              util.path.relative(config.alias.destRoot, iDir),
              rPath
            );
          }
          return r(rPath);
        }
      });

      return rCnt;
    };
    const cssReplace = function (iCnt) {
      const rCnt = frp.cssPathMatch(iCnt, (iPath) => {
        let rPath = iPath;
        if (rPath.match(frp.REG.CSS_IGNORE_REG)) {
          return iPath;
        } else {
          rPath = util.path.join(rPath);
          // url absolute
          if (!rPath.match(frp.REG.IS_HTTP) && !path.isAbsolute(rPath)) {
            rPath = util.path.join(
              config.commit.hostname,
              util.path.relative(config.alias.destRoot, iDir),
              rPath
            );
          }

          return revReplace(rPath);
        }
      });

      return rCnt;
    };
    const jsReplace = function (iCnt) {
      return frp.jsPathMatch(iCnt, (iPath, type) => {
        const r = (rPath) => {
          switch (type) {
            case '__url':
              return `'${revReplace(rPath)}'`;

            default:
              return revReplace(rPath);
          }
        };
        let rPath = iPath;
        if (rPath.match(frp.REG.CSS_IGNORE_REG)) {
          return r(rPath);
        } else {
          rPath = util.path.join(rPath);
          // url absolute
          if (!rPath.match(frp.REG.IS_HTTP) && !path.isAbsolute(rPath)) {
            rPath = util.path.join(
              config.commit.hostname,
              util.path.relative(config.alias.destRoot, iDir),
              rPath
            );
          }

          return r(rPath);
        }
      });
    };
    switch (iExt) {
      case 'html':
      case 'tpl':
        r = htmlReplace(cnt);
        break;

      case 'css':
        r = cssReplace(cnt);
        break;

      case 'js':
        r = jsReplace(cnt);
        break;

      default:
        r = cnt;
        break;
    }

    return r;
  }
  // protected - hash map 生成
  buildHashMap(iPath, revMap) {
    const self = this;
    const { config } = self;
    const revSrc = util.path.join(path.relative(config.alias.revRoot, iPath));
    const hash = `-${revHash(fs.readFileSync(iPath))}`;
    const revDest = revSrc.replace(/(\.[^.]+$)/g, `${hash}$1`);

    revMap[revSrc] = revDest;
  }
  // protected - 文件 hash 替换
  fileHashPathUpdate(iPath, iRevMap) {
    const self = this;
    const iCnt = fs.readFileSync(iPath).toString();
    let rCnt = iCnt;

    // url format
    rCnt = self.resolveUrl(rCnt, iPath, iRevMap);

    if (iCnt != rCnt) {
      self.mark.add('update', iPath);
      fs.writeFileSync(iPath, rCnt);
    }
  }
  //protected 
  buildRevMapDestFiles(revMap) {
    const self = this;
    const { config } = self;
    const selfFn = this;
    if (!config) {
      return;
    }
    Object.keys(revMap).forEach((iPath) => {
      if (!path.extname(iPath)) {
        return;
      }
      const revSrc = util.path.join(config.alias.revRoot, iPath);
      const revDest = util.path.join(config.alias.revRoot, revMap[iPath]);

      if (!fs.existsSync(revSrc)) {
        return;
      }

      selfFn.mark.add(fs.existsSync(revDest) ? 'update' : 'create', revDest);
      fs.writeFileSync(revDest, fs.readFileSync(revSrc));
    });
  }
  // protected 
  addEnv(revMap) {
    const { iEnv } = this;
    Object.keys(iEnv).filter((key) => {
      return key !== 'isCommit';
    }).forEach((key) => {
      revMap[key] = iEnv[key];
    });
  }
  // protected 
  async getRemoteManifest() {
    const self = this;
    const { config } = self;
    const log = this.log;
    const version = this.version;

    let disableHash = false;

    if (config.disableHash) {
      disableHash = true;
    }

    if (!config.commit || !config.commit.revAddr) {
      disableHash = true;
    }

    if (!disableHash) {
      log('msg', 'info', `get remote rev start: ${config.commit.revAddr}`);
      let requestUrl = config.commit.revAddr;
      requestUrl += `${~config.commit.revAddr.indexOf('?')?'&': '?'}_=${+new Date()}`;
      const [error, res, content] = await request({
        url: requestUrl,
        headers: {
          'User-Agent': `Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.67 Safari/537.36 YYL/${version}`
        }
      });

      let iCnt = undefined;

      if (error) {
        log('msg', 'warn', [`get remote rev fail, ${error.message}`]);
      } else if (res.statusCode !== 200) {
        log('msg', 'warn', [`get remote rev fail, status ${res.statusCode}`]);
      } else {
        try {
          iCnt = JSON.parse(content.toString());
          log('msg', 'success', 'get remote finished');
        } catch (er) {
          log('msg', 'warn', ['get remote rev fail', er]);
        }
      }
      return iCnt;
    } else {
      if (!config.commit.revAddr) {
        log('msg', 'warn', 'get remote rev fail, config.commit.revAddr is null');
      }
    }
    return null;
  }

  // public rev-build 入口
  async build() {
    const self = this;
    const { log, config, iEnv } = self;
    if (!config) {
      throw 'rev-build run fail', 'config not exist';
    }

    let disableHash = false;

    if (config.disableHash) {
      disableHash = true;
      log('msg', 'success', 'config.disableHash, rev task ignore');
    }

    if (!config.commit.revAddr) {
      disableHash = true;
      log('msg', 'success', 'config.commit.revAddr not set, rev task ignore');
    }

    if (iEnv.ver || iEnv.remote) {
      const data = await self.getRemoteManifest(iEnv);
      if (data) {
        log('msg', 'info', 'ver is not blank, remote url exist, run rev-update');
        await self.update(data);
        return;
      }
    }

    // 清除 dest 目录下所有带 hash 文件
    await self.clean();

    const htmlFiles = [];
    const jsFiles = [];
    const cssFiles = [];
    const resourceFiles = [];
    const tplFiles = [];

    extFs.readFilesSync(config.alias.root, (iPath) => {
      let r;
      const iExt = path.extname(iPath);

      if (/\.(html|json)/.test(iExt)) {
        r = false;
      } else {
        r = true;
      }

      if (iEnv.revIgnore) {
        if (iPath.match(iEnv.revIgnore)) {
          return r;
        }
      }

      switch (iExt) {
        case '.css':
          cssFiles.push(iPath);
          break;

        case '.js':
          jsFiles.push(iPath);
          break;

        case '.html':
          htmlFiles.push(iPath);
          break;

        case '.tpl':
          tplFiles.push(iPath);
          break;

        default:
          if (r) {
            resourceFiles.push(iPath);
          }
          break;
      }
      return r;
    });

    // 生成 hash 列表
    let revMap = {};
    // 重置 mark
    self.mark.reset();

    // 生成 资源 hash 表
    if (!disableHash) {
      resourceFiles.forEach((iPath) => {
        self.buildHashMap(iPath, revMap);
      });
    }

    // css 文件内路径替换 并且生成 hash 表
    // js 内有可能会引 css 文件所以 css 放在前面
    cssFiles.forEach((iPath) => {
      // hash路径替换
      self.fileHashPathUpdate(iPath, revMap);

      if (!disableHash) {
        // 生成hash 表
        self.buildHashMap(iPath, revMap);
      }
    });

    // 生成 js hash 表
    jsFiles.forEach((iPath) => {
      // hash路径替换
      self.fileHashPathUpdate(iPath, revMap);

      if (!disableHash) {
        // 生成hash 表
        self.buildHashMap(iPath, revMap);
      }
    });

    // tpl 文件内路径替换 并且生成 hash 表
    tplFiles.forEach((iPath) => {
      // hash路径替换
      self.fileHashPathUpdate(iPath, revMap);

      if (!disableHash) {
        // 生成hash 表
        self.buildHashMap(iPath, revMap);
      }
    });

    // html 路径替换
    htmlFiles.forEach((iPath) => {
      self.fileHashPathUpdate(iPath, revMap);
    });


    if (!disableHash) {
      // 根据hash 表生成对应的文件
      self.buildRevMapDestFiles(revMap);

      // 添加环境变量到 rev
      self.addEnv(revMap);

      // 版本生成
      revMap.version = util.makeCssJsDate();

      // rev-manifest.json 生成
      await extFs.mkdirSync(config.alias.revDest);
      const revPath = util.path.join(config.alias.revDest, self.filename);
      const revVerPath = util.path.join(
        config.alias.revDest,
        self.filename.replace(/(\.\w+$)/g, `-${revMap.version}$1`)
      );

      // 存在 则合并
      if (fs.existsSync(revPath)) {
        let oRevMap = null;
        try {
          oRevMap = JSON.parse(fs.readFileSync(revPath));
        } catch (er) {
          log('msg', 'warn', 'oRegMap parse error');
        }
        if (oRevMap) {
          revMap = util.extend(true, oRevMap, revMap);
          log('msg', 'success', 'original regMap concat finished');
        }
      }

      fs.writeFileSync(revPath, JSON.stringify(revMap, null, 4));
      self.mark.add('create', revPath);

      // rev-manifest-{cssjsdate}.json 生成
      fs.writeFileSync(revVerPath, JSON.stringify(revMap, null, 4));
      self.mark.add('create', revVerPath);
    }

    self.mark.print();
    log('msg', 'success', 'rev-build finished');
  }
  // rev-update 入口
  async update(remoteManifestData) {
    const self = this;
    const {config, log, iEnv } = self;
    if (!config) {
      throw 'rev-update run fail', 'config not exist';
    }

    let disableHash = false;

    if (config.disableHash) {
      disableHash = true;
      log('msg', 'success', 'config.disableHash, rev task ignore');
    }

    if (!config.commit.revAddr) {
      disableHash = true;
      log('msg', 'success', 'config.commit.revAddr not set, rev task ignore');
    }

    // 重置 mark
    self.mark.reset();

    let revMap = remoteManifestData;

    const localRevPath = util.path.join(
      config.alias.revDest,
      self.filename
    );

    if (disableHash || !iEnv.remote) {
      revMap = null;
    } else {
      if (!revMap) {
        revMap = await self.getRemoteManifest(iEnv);
      }
    }
    if (!revMap) {
      if (fs.existsSync(localRevPath)) {
        try {
          revMap = JSON.parse(fs.readFileSync(localRevPath).toString());
        } catch (er) {
          log('msg', 'warn', ['local rev file parse fail', er]);
          throw er;
        }
      } else {
        throw `local rev file not exist: ${chalk.yellow(localRevPath)}`;
      }
    }

    // hash 表内html, css 文件 hash 替换

    // html, tpl 替换
    const htmlFiles = extFs.readFilesSync(config.alias.root, /\.(html|tpl)$/);
    htmlFiles.forEach((iPath) => {
      self.fileHashPathUpdate(iPath, revMap);
    });

    // css or js 替换
    if (disableHash) {
      const jsFiles = extFs.readFilesSync(config.alias.root, /\.js$/);
      const cssFiles = extFs.readFilesSync(config.alias.root, /\.css$/);

      jsFiles.forEach((filePath) => {
        self.fileHashPathUpdate(filePath, revMap);
      });

      cssFiles.forEach((filePath) => {
        self.fileHashPathUpdate(filePath, revMap);
      });
    } else {
      Object.keys(revMap).forEach((iPath) => {
        const filePath = util.path.join(config.alias.revRoot, iPath);

        if (fs.existsSync(filePath)) {
          switch (path.extname(filePath)) {
            case '.css':
              self.fileHashPathUpdate(filePath, revMap);
              break;

            case '.js':
              self.fileHashPathUpdate(filePath, revMap);
              break;

            default:
              break;
          }
        }
      });
    }

    // hash对应文件生成
    self.buildRevMapDestFiles(revMap);

    // 本地 rev-manifest 更新

    let localRevData;
    const revContent = JSON.stringify(revMap, null, 4);

    if (fs.existsSync(localRevPath)) {
      localRevData = fs.readFileSync(localRevPath).toString();

      if (localRevData != revContent) {
        fs.writeFileSync(localRevPath, revContent);
        self.mark.add('update', localRevPath);
      }
    } else {
      await extFs.mkdirSync(config.alias.revDest);
      fs.writeFileSync(localRevPath, revContent);
      self.mark.add('create', localRevPath);
    }

    self.mark.print();
    log('msg', 'success', 'rev-update finished');
  }
  // public rev-clean 入口
  clean() {
    const self = this;
    const { log, config } = self;

    return new Promise((next, err) => {
      if (!config) {
        return err('rev-clean run fail, config not exist');
      }

      const files = extFs.readFilesSync(config.alias.root);
      files.forEach((iPath) => {
        if (
          /-[a-zA-Z0-9]{10}\.?\w*\.\w+$/.test(iPath) &&
          fs.existsSync(iPath.replace(/-[a-zA-Z0-9]{10}(\.?\w*\.\w+$)/, '$1'))
        ) {
          try {
            fs.unlinkSync(iPath);
            log('msg', 'del', iPath);
          } catch (er) {
            log('msg', 'warn', `delete file fail: ${iPath}`);
          }
        }
      });
      log('msg', 'success', 'rev-clean finished');
      next();
    });
  }
}
module.exports = Rev;