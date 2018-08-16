# yyl-seed-gulp-requirejs
yyl 构建种子 - `gulp-requirejs`

## SDK

### seed.name
```
/**
 * @return {String} seed 包名称
 */
seed.name
```

### seed.version
```
/**
 * @return {String} seed 包版本
 */
seed.version
```

### seed.path
```
/**
 * @return {String} seed 所在目录
 */
seed.path
```

### seed.example
```
/**
 * @return {Array} seed example list
 */
seed.path
```

### seed.optimize()
```
/**
 * @param  {Object} config       配置文件
 * @param  {Object} config.alias                  作用域
 * @param  {String} config.alias.commons          公用组件地址
 * @param  {String} config.alias.globalcomponents 公用 components 目录
 * @param  {String} config.alias.globallib        公用 components 目录
 * @param  {String} config.alias.root             输出目录中 到 html, js, css, image 层 的路径
 * @param  {String} config.alias.revRoot          rev 输出内容的相对地址
 * @param  {String} config.alias.destRoot         dest 地址
 * @param  {String} config.alias.srcRoot          src 地址
 * @param  {String} config.alias.dirname          项目根目录
 * @param  {String} config.alias.jsDest           js 输出地址
 * @param  {String} config.alias.jslibDest        js lib 输出地址
 * @param  {String} config.alias.htmlDest         html 输出地址
 * @param  {String} config.alias.cssDest          css 输出地址
 * @param  {String} config.alias.imagesDest       images 输出地址
 * @param  {String} config.alias.revDest          assets 输出地址
 * @param  {String} config.alias.tplDest          tpl 输出地址
 * @param  {String} projectPath                   构建项目所在目录
 * @return {Object} opzer                         压缩实例
 */
seed.optimize(config, projectPath)
```

### opzer
```
/**
 * @param  {Object}  op 参数
 * @param  {Boolean} op.isCommit 执行压缩
 * @param  {Boolean} op.remote   映射远程
 * @return {Object}  ctrler      操作句柄
 */
opzer.watch(op)
opzer.watchAll(op)
opzer.all(op)
opzer.js(op)
opzer.css(op)
opzer.html(op)
opzer.tpl(op)
opzer.images(op)
```
### ctrler.on()
```
/**
 * @param {String} eventName 需要监听的事件，目前有
 *                           - onOptimize 对应 fn(file)
 *                           - finished   对应 fn(taskName)
 *                           - msg        对应 fn(type, argv)
 *                           - clear      对应 fn()
 *                           - start      对应 fn(taskName)
 */
opzer.on(eventName, fn)
```

### ctrler.off()
```
/**
 * @param  {String} eventName 要解除绑定的 eventName, 
 *                            不填则全部都解绑
 * @return {Void}
 */
opzer.off(eventName)
```

### ctrler.trigger()
```
/**
 * @param {String} eventName 需要触发的事件
 * @param {Array}  argv      参数
 */
opzer.trigger(eventName, argv)
```

### seed.init()
```
/**
 * @param  {String} type       初始化类型
 * @param  {String} targetPath 初始化目录
 * @return {Object} ctrler     操作句柄
 */
seed.init(type, targetPath)
```


