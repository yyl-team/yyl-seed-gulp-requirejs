# 版本信息
## 4.2.0 (2020-03-02)
* feat: 调整入口
## 4.0.1 (2020-02-29)
* feat: 补充 error 

## 4.0.0 (2020-02-25)
* feat: 变 css 压缩 `gulp-minify-css` -> `gulp-clean-css`
* feat: 去掉异步加载逻辑 (yyl 已经做了， 没必要重复)
* feat: 迁移 yyl-hander 里面的 afterTask 逻辑到 构建流程
* fix: fix severity vulnerabilities

## 3.0.1 (2020-01-15)
* feat: 将 optimize 内顶部依赖改为 执行方法后才引入

## 3.0.0 (2020-01-15)
* feat: 新增 `seed.initPackage` 方法
* feat: 剥离 init 部分以适配新版 yyl
* feat: 重构 单元测试部分代码
* feat: update `yyl-util` 到新版
* feat: 升級 `imagemin-gifsicle`, `imagemin-jpegtran`, `imagemin-optipng`, `node-sass`, `gulp-sass`
* del: 去掉 `seed.init()` 方法
* del: 去掉 `seed.examples` 方法

## 2.6.1-beta2(2019-07-05)
* [ADD] 添加 `index.d.ts`

## 2.6.1-beta1(2018-05-17)
* [FIX] 多了个 .git??

## 2.6.0(2018-05-17)
* [EDIT] 调整 seed 包 里面的 config 以适配 新版 yyl `3.5.0`

## 2.5.8(2018-12-29)
* [EDIT] `seed` 生成的 html 文件 `demo.html` 改为 `index.html`

## 2.5.7(2018-12-17)
* [FIX] 修复 `config.mainHost`， `config.staticHost` 后不带 `/` 会生成路径不对问 题

## 2.5.6(2018-10-30)
* [FIX] 将 `uglify-js` 使用版本改为 `~1.5.3`

## 2.5.5(2018-10-30)
* [FIX] `uglify-js` 改为 `gulp-uglify`

## 2.5.4(2018-10-24)
* [FIX] 升级 `uglify-js` 到 `3.x`, 添加 `ie8: true` options 让打包出来的东西支持 ie 8 浏览器

## 2.5.3(2018-10-24)
* [FIX] 修复 `watch` 执行频繁问题

## 2.5.2(2018-10-18)
* [FIX] 修复 `/{{sid}}/{{ssid}}` 路径匹配异常问题

## 2.5.1(2018-10-16)
* [EDIT] 当传入 `env.proxy` 时， 生成出来的页面采用绝对路径
* [FIX] 执行 `seed.init` 时自动生成 `.gitignore`
* [DEL] 去掉 `example` `no-component`

## 2.4.5(2018-09-29)
* [FIX] 修复 `uglify` js 时 在嵌入到 `html` 有时候出现 生成的 js 报错问题

## 2.4.4(2018-09-27)
* [FIX] 修复 `watch` 时 修改 `w-a.js` 时， 引用 此 文件的 `t-b.js` 的 `t-b.pug` 无法触发构建问题

## 2.4.3(2018-09-26)
* [EDIT] config 调整

## 2.4.2(2018-09-25)
* [EDIT] config 调整

## 2.4.0(2018-09-19)
* [EDIT] config 调整

## 2.3.0(2018-09-09)
* [EDIT] 代码调整

## 2.2.0(2018-09-09)
* [ADD] 新增 yyl.make 方法

## 2.1.0(2018-09-09)
* [EDIT] 升级 gulp  到 `4.0.0` 版本

## 2.0.1(2018-09-09)
* [EDIT] 合并分支

## 2.0.0(2018-09-09)
* [EDIT] 调整 组件支持版本需要 node `8.0` 以上

## 1.0.8(2018-08-21)
* [EDIT] `seed.optimize(config)` 中 config 中路径 seed 不会自己去转 成绝对路径了
* [EDIT] 补充 `config.resource` 的处理
* [EDIT] 补充用例


## 1.0.7(2018-08-19)
* [FIX] `opzer.response` 每次 finish 都清空 logcache

## 1.0.6(2018-08-19)
* [FIX] `opzer.response` log bugfix

## 1.0.5(2018-08-17)
* [ADD] 新增 `seed.optimize.handles` 方法
## 1.0.4(2018-08-17)
* [EDIT] bugfix

## 1.0.3(2018-08-16)
* [EDIT] 调整 config 内容

## 1.0.2(2018-08-16)
* [EDIT] 调整 config 内容

## 1.0.1(2018-08-16)
* [EDIT] 调整 config 内容

## 1.0.0(2018-08-16)
* [ADD] 诞生
