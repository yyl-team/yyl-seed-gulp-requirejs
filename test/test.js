'use strict';
const expect = require('chai').expect;
const path = require('path');
const fs = require('fs');
const util = require('yyl-util');
const opzer = require('../index.js');

const FRAG_PATH = path.join(__dirname, '__frag');
const fn = {
  frag: {
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
        if (fs.existsSync(FRAG_PATH)) {
          util.removeFiles(FRAG_PATH, true);
        }

        setTimeout(() => {
          next();
        }, 100);
      });
    }
  }
};

describe('optimize test', () => {
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
    Object.keys(config.alias).forEach((key) => {
      config.alias[key] = util.path.join(CONFIG_DIR, config.alias[key]);
    });
    iOpzer = opzer.optimize(config);
    done();
  });
  // - config iOpzer init

  // + main
  it ('all test', function (done) {
    this.timeout(0);

    const ctrl = iOpzer.all();
    ctrl.on('finished', () => {
      done();
    });

    ctrl.on('start', (argv) => {
      console.log('start', argv);
    });

    ctrl.on('msg', (argv) => {
      console.log('msg', argv);
    });
  });
  // - main

  // it ('destroy frag', function (done) {
  //   this.timeout(0);
  //   fn.frag.destroy().then(() => {
  //     done();
  //   });
  // });
});
