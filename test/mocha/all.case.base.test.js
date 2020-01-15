// WARNING 需要 连公司 vpn 再进行测试
const path = require('path');
const util = require('yyl-util');
const extFs = require('yyl-fs');
const seed = require('../../index');
const tUtil = require('yyl-seed-test-util');
const expect = require('chai').expect;

const {
  clearDest,
  linkCheck,
  checkAsyncComponent,
  checkCssFiles
} = require('../fn/all');


// + vars
const filename = 'base';
const FRAG_PATH = path.join(__dirname, `../../../__frag/all-${filename}`);
const TEST_CASE_PATH = path.join(__dirname, '../case');
const PJ_PATH = path.join(TEST_CASE_PATH, filename);
// - vars

tUtil.frag.init(FRAG_PATH);

test(`seed.all() case:${filename}`, async () => {
  const TARGET_PATH = path.join(FRAG_PATH, filename);
  await tUtil.frag.build();
  await extFs.copyFiles(PJ_PATH, TARGET_PATH, (iPath) => {
    const rPath = path.relative(PJ_PATH, iPath);
    return !/node_modules/.test(rPath);
  });

  const configPath = path.join(TARGET_PATH, 'config.js');
  const config = tUtil.parseConfig(configPath);

  const opzer = seed.optimize(config, path.dirname(configPath));

  await clearDest(config);

  // all
  await util.makeAwait((next) => {
    const timePadding = {
      start: 0,
      msg: 0,
      finished: 0
    };

    opzer.all({ silent: true })
      .on('start', () => {
        timePadding.start++;
      })
      .on('msg', () => {
        timePadding.msg++;
      })
      .on('finished', () => {
        timePadding.finished++;
        // times check
        expect(timePadding.start).to.equal(1);
        expect(timePadding.msg).not.to.equal(0);
        expect(timePadding.finished).to.equal(1);

        linkCheck(config, () => {
          next();
        });
      });
  });

  await checkAsyncComponent(config);
  await checkCssFiles(config);

  await clearDest(config);

  // all --remote
  await util.makeAwait((next) => {
    opzer.all({ remote: true, silent: true })
      .on('finished', () => {
        linkCheck(config, () => {
          next();
        });
      });
  });

  await checkAsyncComponent(config);
  await checkCssFiles(config);

  await clearDest(config);

  // all --isCommit
  await util.makeAwait((next) => {
    opzer.all({ isCommit: true, silent: true })
      .on('finished', () => {
        linkCheck(config, () => {
          next();
        });
      });
  });

  await checkAsyncComponent(config);
  await checkCssFiles(config);

  await tUtil.frag.destroy();
});