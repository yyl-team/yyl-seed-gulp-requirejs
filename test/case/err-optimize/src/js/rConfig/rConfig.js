'use strict';
var require = {
    // baseUrl: '../js',
    paths: {
        // global
        'artTemplate' : '../../js/lib/artTemplate/artTemplate',
        'wHello': '../../components/w-hello/w-hello',
        'wSubWidget': '../../components/w-sub-widget/w-sub-widget',
        'yyloader': '../../js/lib/yyloader/yyloader'
        // + yyl make
        // - yyl make
    },
    shim: {
        artTemplate: {
            exports: 'artTemplate'
        }
    }
};

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = require;
}
