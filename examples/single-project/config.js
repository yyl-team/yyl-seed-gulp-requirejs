'use strict';
const path = require('path');

//+ yyl init 自动 匹配内容
const COMMON_PATH = /*+commonPath*/'../commons/pc'/*-commonPath*/;
const PROJECT_NAME = /*+name*/'workflow_demo'/*-name*/;
const VERSION = /*+version*/'1.0.0'/*-version*/;
const PLATFORM = /* +platform */'mobile'/* -platform */;
//- yyl init 自动 匹配内容

const setting = {
    localserver: { // 本地服务器配置
        root: './dist' // 服务器输出地址
    },
    dest: {
        basePath: '/pc',
        jsPath: 'js',
        jslibPath: 'js/lib',
        cssPath: 'css',
        htmlPath: 'html',
        imagesPath: 'images',
        tplPath: 'tpl',
        revPath: 'assets'
    }
};

const DEST_BASE_PATH = path.join(
    setting.localserver.root,
    setting.dest.basePath
);

const config = {
    workflow: 'gulp-requirejs',
    name: PROJECT_NAME,
    version: VERSION,
    platform: PLATFORM,
    alias: { // yyl server 路径替换地方
        // 公用组件地址
        commons: COMMON_PATH,

        // 公用 components 目录
        globalcomponents: path.join(COMMON_PATH, 'components'),
        globallib: path.join(COMMON_PATH, 'lib'),

        // 输出目录中 到 html, js, css, image 层 的路径
        root: DEST_BASE_PATH,

        // rev 输出内容的相对地址
        revRoot: DEST_BASE_PATH,

        // dest 地址
        destRoot: setting.localserver.root,

        // src 地址
        srcRoot: './src',

        // 项目根目录
        dirname: './',

        // js 输出地址
        jsDest: path.join(DEST_BASE_PATH, setting.dest.jsPath),
        // js lib 输出地址
        jslibDest: path.join(DEST_BASE_PATH, setting.dest.jslibPath),
        // html 输出地址
        htmlDest: path.join(DEST_BASE_PATH, setting.dest.htmlPath),
        // css 输出地址
        cssDest: path.join(DEST_BASE_PATH, setting.dest.cssPath),
        // images 输出地址
        imagesDest: path.join(DEST_BASE_PATH, setting.dest.imagesPath),
        // assets 输出地址
        revDest: path.join(DEST_BASE_PATH, setting.dest.revPath),
        // tpl 输出地址
        tplDest: path.join(DEST_BASE_PATH, setting.dest.tplPath)
    },
    // -此部分 yyl server 端config 会进行替换

    commit: {
        hostname: 'http://yyweb.yystatic.com/'
    }
};

module.exports = config;
