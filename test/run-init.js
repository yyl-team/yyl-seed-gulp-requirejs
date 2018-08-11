const util = require('yyl-util');
const opzer = require('../index.js');
const FRAG_PATH = util.path.join(__dirname, './__frag');

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

const runner = {
  init() {
    // build frag
    util.mkdirSync(FRAG_PATH);

    // init
    opzer.init('single-project', FRAG_PATH)
      .on('msg', (...argv) => {
        const [type, iArgv] = argv;
        let iType = type;
        if (!util.msg[type]) {
          iType = 'info';
        }
        util.msg[iType](iArgv);
      })
      .on('finished', () => {
        util.openPath(FRAG_PATH);
      });
  }
};


runner.init();
