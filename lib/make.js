const fs = require('fs');
const path = require('path');
const gFn = require('./fn.js');
const util = require('yyl-util');
const extFs = require('yyl-fs');

const iRes = gFn.response();

const TEMPLATE = {
  PAGE: {
    PUG: [
      'extends ../w-layout/w-layout',
      'block title',
      '    | {{name}}',
      '',
      'block head',
      '    link(rel="stylesheet", href="./{{name}}.scss", type="text/css")',
      '',
      'block body',
      '',
      'append script',
      '    script(src="./{{name}}.js")'
    ].join('\r\n'),
    SASS: [
      '@charset "utf-8";'
    ].join('\r\n'),
    JS: [
      'require([], function() {',
      '});'
    ].join('\r\n')
  },
  WIDGET: {
    PUG: [
    ].join('\r\n'),
    SASS: [
      '@charset "utf-8";',
      'mixin {{name}}($path){',
      '}'
    ].join('\r\n'),
    JS: [
      'define([], function() {',
      '});'
    ].join('\r\n')
  },
  LAYOUT: {
    PUG: [
      'doctype html',
      'html',
      '    head',
      '        meta(charset="utf-8")',
      '        meta(http-equiv="X-UA-Compatible", content="IE=edge,chrome=1")',
      '        meta(name="renderer", content="webkit")',
      '        title',
      '            block title',
      '',
      '        block head',
      '    body',
      '        block body',
      '',
      '        block script'
    ].join('\r\n'),
    SASS: [
      '@charset "utf-8";'
    ].join('\r\n'),
    JS: ''
  }
};

const MARK = {
  'START': '// + yyl make',
  'END': '// - yyl make'
};

const REG = {
  PAGE_COMPONENT: /^p-/,
  WIDGET_COMPONENT: /^[wr]-/,
  LAYOUT_COMPONENT: /^w-layout$/,
  START_MARK: /^([\s\t]*)\/\/\s*\+\s*yyl make\s*/,
  END_MARK: /^([\s\t]*)\/\/\s*-\s*yyl make\s*/
};

const fn = {
  render: function(tmpl, op) {
    let r = tmpl;
    for (var key in op) {
      if (op.hasOwnProperty(key)) {
        r = r.replace(new RegExp(`\\{\\{${  key  }\\}\\}`, 'g'), op[key] || '');
      }
    }
    return r;
  }
};

const make = function (name, config) {
  iRes.off();
  iRes.trigger('start', ['make']);
  if (!name) {
    iRes.trigger('error', ['error', `make arguments name (${name}) is not exists`]);
    return iRes;
  }

  if (!config || !config.alias || !config.alias.srcRoot) {
    iRes.trigger('error', ['error', 'config.alias.srcRoot is not exists']);
    return iRes;
  }

  const targetPath = config.alias.srcRoot;

  let mod = null;
  let type = null;

  if (name.match(REG.PAGE_COMPONENT)) { // 页面模块
    mod = TEMPLATE.PAGE;
    type = 'page';
  } else if (name.match(REG.LAYOUT_COMPONENT)) { // 框架模块
    mod = TEMPLATE.LAYOUT;
    type = 'layout';
  } else if (name.match(REG.WIDGET_COMPONENT)) { // 组件模块
    mod = TEMPLATE.WIDGET;
    type = 'widget';
  } else {
    iRes.trigger('error', ['error', `${name} is not in role, please use p-xx, w-xx or r-xx for name`]);
  }
  if (!mod) {
    return iRes;
  }

  let dirName = '';
  if (type === 'page') {
    dirName = 'page';
  } else {
    dirName = 'widget';
  }
  const fPath01 = path.join(targetPath, 'components', dirName);
  const fPath02 = path.join(targetPath, 'components');

  let initPath = '';
  if (fs.existsSync(fPath01)) {
    initPath = fPath01;
  } else if (fs.existsSync(fPath02)) {
    initPath = fPath02;
  } else {
    extFs.mkdirSync(fPath02);
    initPath = fPath02;
  }

  initPath = path.join(initPath, name);

  extFs.mkdirSync(initPath);

  // 创建 文件
  const pugPath = path.join(initPath, `${name}.pug`);
  const sassPath = path.join(initPath, `${name}.scss`);
  const jsPath = path.join(initPath, `${name}.js`);

  if (fs.existsSync(pugPath)) {
    iRes.trigger('msg', ['warn', `${pugPath} already exists, file buidl fail`]);
  } else {
    fs.writeFileSync(pugPath, fn.render(mod.PUG, { name }));
    iRes.trigger('msg', ['create', pugPath]);
  }

  if (fs.existsSync(sassPath)) {
    iRes.trigger('msg', ['warn', `${sassPath} already exists, file buidl fail`]);
  } else {
    fs.writeFileSync(sassPath, fn.render(mod.SASS, { name }));
    iRes.trigger('msg', ['create', sassPath]);
  }

  if (fs.existsSync(jsPath)) {
    iRes.trigger('msg', ['warn', `${jsPath} already exists, file buidl fail`]);
  } else {
    fs.writeFileSync(jsPath, fn.render(mod.JS, { name }));
    iRes.trigger('msg', ['create', jsPath]);
  }

  // 添加 alias
  const rConfigPath = path.join(targetPath, 'js/rConfig/rConfig.js');
  if (fs.existsSync(rConfigPath) && type === 'widget') {
    let configCnts = fs.readFileSync(rConfigPath).toString().split(/[\r\n]+/);
    // 查找标记位置
    let startIndex = -1;
    let endIndex = -1;
    let prefix = '';

    configCnts.forEach((str, i) => {
      if (!str) {
        return;
      }

      if (str.match(REG.START_MARK)) { // 开始 标记
        startIndex = i;
      } else if (str.match(REG.END_MARK)) { // 结束 标记
        endIndex = i;
      }
    });

    if (~startIndex) { // 插入模块
      prefix = configCnts[startIndex].replace(REG.START_MARK, '$1');
      const moduleName = name.replace(/(^[rw])(-)(\w)(.*$)/, (str, $1, $2, $3, $4) => {
        return $1 + $3.toUpperCase() + $4;
      });
      const modulePath = util.joinFormat(path.relative(
        targetPath,
        util.joinFormat(initPath, name)
      ));
      let insertStr;


      insertStr = `${prefix}'${moduleName}' : '${modulePath}',`;

      // 查找是否已经添加过了
      let added = false;
      let isBeforeBracket = false; // 是否后面就跟着 花括号了
      let bracketReg = /^[\s\t]*\}[\s\t]*[,]?[\s\t]*$/;
      let commaReg = /,[\s\t]*$/;
      configCnts.slice(startIndex, endIndex).forEach((str) => {
        if (str.replace(commaReg, '') == insertStr.replace(commaReg, '')) {
          added = true;
          return true;
        }
      });

      if (added) {
        iRes.trigger('msg', ['warn', `${moduleName} was added to the config path before yyl make run`]);
        iRes.trigger('finished', ['make']);
        return iRes;
      }

      configCnts.splice(startIndex + 1, 0, insertStr); // 插入
      endIndex += 1;
      if (~endIndex) { // 那就帮忙排个序吧
        isBeforeBracket = bracketReg.test(configCnts[endIndex + 1]);
        var sortArr = configCnts.slice(startIndex + 1, endIndex);
        sortArr.sort((a, b) => {
          return b.localeCompare(a);
        });


        // 解决逗号问题
        if (isBeforeBracket) {
          if (!configCnts[startIndex - 1].match(commaReg)) {
            configCnts[startIndex - 1] = `${configCnts[startIndex - 1]  },`;
          }
        }
        configCnts = configCnts.map((str, i) => {
          var r;
          if (i >= startIndex + 1 && i < endIndex) {
            r = sortArr[i - startIndex - 1];
            if (isBeforeBracket) {
              if ( i == endIndex - 1 ) { // 最后一个
                r = r.replace(commaReg, '');
              } else {
                if (!r.match(commaReg)) {
                  r = `${r  },`;
                }
              }
            }
          } else {
            r = str;
          }
          return r;
        });
      } else {
        // 解决逗号问题
        isBeforeBracket = bracketReg.test(configCnts[startIndex + 2]);
        if (isBeforeBracket) {
          if (!configCnts[startIndex - 1].match(commaReg)) {
            configCnts[startIndex - 1] = `${configCnts[startIndex - 1]  },`;
          }
          configCnts[startIndex + 1] = configCnts[startIndex + 1].replace(commaReg, '');
        }
      }

      fs.writeFileSync(rConfigPath, configCnts.join('\r\n'));
      iRes.trigger('msg', ['update', rConfigPath]);
      iRes.trigger('finished', ['make']);
      return iRes;
    } else {
      iRes.trigger('msg', ['warn', 'add alias fail,', 'config haven\'t the mark:']);
      iRes.trigger('msg', ['warn', MARK.START]);
      iRes.trigger('msg', ['warn', `in config file: ${rConfigPath}`]);
      iRes.trigger('finished', ['make']);
      return iRes;
    }
  } else {
    iRes.trigger('finished', ['make']);
    return iRes;
  }
};

module.exports = make;
