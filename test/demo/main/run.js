const path = require('path');
const util = require('yyl-util');
const opzer = require('../../../index.js');
const fs = require('fs');


const CONFIG_PATH = path.join(__dirname, './config.js');
const CONFIG_DIR = __dirname;

let config = util.requireJs(CONFIG_PATH);
Object.keys(config.alias).forEach((key) => {
    config.alias[key] = util.path.join(CONFIG_DIR, config.alias[key]);
});

const iOpzer = opzer.optimize(config, CONFIG_DIR);

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
    all(done) {
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
            return done && done();
        });
        fn.clearDest(config).then(() => {
            iOpzer.all();
        });
    }
};

runner.all();


