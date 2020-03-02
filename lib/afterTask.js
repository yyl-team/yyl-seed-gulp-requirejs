const Rev = require('./rev')
const extFs = require('yyl-fs')
const util = require('yyl-util')
const path = require('path')
const fs = require('fs')
const frp = require('yyl-file-replacer')
const Concat = require('concat-with-sourcemaps')

const SUGAR_REG = /(\{\$)([a-zA-Z0-9@_\-$.~]+)(\})/g
function sugarReplace(str, alias) {
  return str.replace(SUGAR_REG, (str, $1, $2) => {
    if ($2 in alias) {
      return alias[$2]
    } else {
      return str
    }
  })
}
function html2string(cnt, q) {
  let r = cnt.replace(/[\r\n]+/g, ' ')
  if (q === '\'') {
    r = r
      .replace(/[\\][']/g, '\\\\\'')
      .replace(/([^\\])[']/g, '$1\\\'')
  } else if (q === '"') {
    r = r
      .replace(/[\\]["]/g, '\\\\"')
      .replace(/([^\\])["]/g, '$1\\"')
  }
  return r.trim()
}

class AfterTask {
  constructor({ config, iEnv, log }) {
    this.config = config
    this.iEnv = iEnv
    this.rev = new Rev({ log, version: '4.0.0', config, iEnv })
    this.log = log
  }
  async build () {
    await this.resource()
    await this.concat()
    await this.varSugar()
    await this.rev.build()
  }
  async update () {
    await this.resource()
    await this.concat()
    await this.varSugar()
    await this.rev.update()
  }
  async resource () {
    const { log, config } = this

    if (config.resource) {
      const data = await extFs.copyFiles(config.resource)
      data.add.forEach((iPath) => {
        log('msg', 'create', iPath)
      })

      data.update.forEach((iPath) => {
        log('msg', 'update', iPath)
      })
      log('msg', 'success', 'resource copy finished')
    } else {
      log('msg', 'info', 'config.resource is not defined, break')
    }
  }
  async concat () {
    const { log, config } = this

    if (config.concat) {
      log('msg', 'info', 'concat start')
      const keys = Object.keys(config.concat)
      if (keys.length) {
        await util.forEach(keys, async (dest) => {
          const srcs = config.concat[dest]
          const concat = new Concat(false, dest, '\n')

          srcs.forEach((item) => {
            if (!fs.existsSync(item)) {
              log('msg', 'warn', `${item} is not exists, break`)
              return
            }

            if (path.extname(item) == '.js') {
              concat.add(null, `;/* ${path.basename(item)} */`)
            } else {
              concat.add(null, `/* ${path.basename(item)} */`)
            }
            concat.add(item, fs.readFileSync(item))
          })

          await extFs.mkdirSync(path.dirname(dest))
          fs.writeFileSync(dest, concat.content)
          log('msg', 'concat', [dest].concat(srcs))
        })
      } else {
        log('msg', 'success', 'concat finished, no concat setting')
      }
    } else {
      log('msg', 'info', 'config.concat is not defined, break')
    }
  }
  async varSugar () {
    const { log, config, iEnv } = this

    const varObj = util.extend({}, config.alias)
    let mainPrefix = '/'
    let staticPrefix = '/'
    let root = varObj.destRoot

    if (iEnv.remote || iEnv.isCommit || iEnv.proxy) {
      mainPrefix = config.commit.mainHost || config.commit.hostname || '/'
      staticPrefix = config.commit.staticHost || config.commit.hostname || '/'
    }

    Object.keys(varObj).forEach((key) => {
      let iPrefix = ''
      if (varObj[key].match(frp.REG.IS_MAIN_REMOTE)) {
        iPrefix = mainPrefix
      } else {
        iPrefix = staticPrefix
      }
      varObj[key] = util.path.join(
        iPrefix,
        path.relative(root, varObj[key])
      )
    })

    const htmls = await extFs.readFilePaths(config.alias.root, /\.html$/, true)

    htmls.forEach((iPath) => {
      const iCnt = fs.readFileSync(iPath).toString()
      const rCnt = frp.htmlPathMatch(iCnt, (rPath) => {
        return sugarReplace(rPath, varObj)
      })
      if (iCnt !== rCnt) {
        log('msg', 'update', iPath)
        fs.writeFileSync(iPath, iCnt)
      }
    })

    const jsPaths = await extFs.readFilePaths(config.alias.root, /\.js$/, true)
    jsPaths.forEach((iPath) => {
      const iCnt = fs.readFileSync(iPath).toString()
      const rCnt = frp.jsPathMatch(iCnt, (iPath, type, q) => {
        let htmlUrl = ''
        switch (type) {
        case '__url':
          return `__url('${sugarReplace(iPath, varObj)}')`

        case '__html':
          htmlUrl = sugarReplace(iPath, config.alias)
          if (fs.existsSync(htmlUrl)) {
            // step02: html to 字符串
            return html2string(
              // step01: 格式化 html 里 的路径
              frp.htmlPathMatch(
                fs.readFileSync(htmlUrl).toString(),
                (rPath) => {
                  let r = sugarReplace(rPath, varObj)
                  return r
                }
              ),
              q
            )
          } else {
            log('msg', 'warn', `__html(${iPath}) inline fail, path not exists: ${htmlUrl}`)
            return iPath
          }

        default:
          return iPath
        }
      })
      if (iCnt !== rCnt) {
        fs.writeFileSync(iPath, rCnt)
      }
    })
    log('msg', 'success', 'varSugar run finished')
  }
}

module.exports = {
  AfterTask
}
