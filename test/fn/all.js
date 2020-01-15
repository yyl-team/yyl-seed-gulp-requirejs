const path = require('path');
const util = require('yyl-util');
const extFs = require('yyl-fs');
const fs = require('fs');
const frp = require('yyl-file-replacer');
const tUtil = require('yyl-seed-test-util');
const expect = require('chai').expect;

const http = require('http');

function clearDest(config, copyFont) {
  return new Promise((next) => {
    extFs.removeFiles(config.alias.destRoot).then(() => {
      if (copyFont) {
        extFs.copyFiles(config.resource).then(() => {
          next();
        });
      } else {
        next();
      }
    });
  });
}

const linkCheck = function (config) {
  return new Promise((next) => {
    const htmlArr = extFs.readFilesSync(config.alias.destRoot, /\.html$/);
    const cssArr = extFs.readFilesSync(config.alias.destRoot, /\.css$/);
    const jsArr = extFs.readFilesSync(config.alias.destRoot, /\.js$/);

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
          tUtil.hideUrlTail(
            util.path.join(destRoot, iPath.replace(LOCAL_SOURCE_REG, ''))
          )
        );
      } else if (iPath.match(ABSOLUTE_SOURCE_REG)) {
        localSource.push(
          tUtil.hideUrlTail(
            util.path.join(destRoot, iPath.replace(LOCAL_SOURCE_REG, '$1'))
          )
        );
      } else if (iPath.match(REMOTE_SOURCE_REG)) {
        remoteSource.push(iPath);
      } else if (iPath.match(RELATIVE_SOURCE_REG)) {
        localSource.push(
          tUtil.hideUrlTail(
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
  });
};

// 检查 assets async components
async function checkAsyncComponent (config) {
  const asyncPath = path.join(config.alias.jsDest, 'async_component');
  if (fs.existsSync(asyncPath) && fs.readdirSync(asyncPath).length) {
    const assetsPath = path.join(config.alias.revDest, 'rev-manifest.json');
    expect(fs.existsSync(assetsPath)).to.deep.equal(true);
    const assetJson = JSON.parse(fs.readFileSync(assetsPath).toString());

    Object.keys(assetJson).forEach((key) => {
      const aPath = path.join(config.alias.revRoot, key);
      const bPath = path.join(config.alias.revRoot, assetJson[key]);
      const aPathExists = fs.existsSync(aPath);
      const bPathExists = fs.existsSync(bPath);

      expect([aPath, aPathExists]).to.deep.equal([aPath, true]);
      expect([bPath, bPathExists]).to.deep.equal([bPath, true]);
    });
  }
}

// 检查 blank css file
async function checkCssFiles (config) {
  const htmlArr = await extFs.readFilePaths(config.alias.htmlDest, /\.html$/, true);
  htmlArr.forEach((htmlPath) => {
    const filename = path.relative(config.alias.htmlDest, htmlPath);
    const cssFile = filename.replace(/\.html$/, '.css');
    const cssPath = path.join(config.alias.cssDest, cssFile);

    expect(fs.existsSync(cssPath)).to.equal(true);
  });
}

module.exports = {
  clearDest,
  linkCheck,
  checkAsyncComponent,
  checkCssFiles
};
