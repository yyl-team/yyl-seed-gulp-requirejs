const util = require('yyl-util')
const print = require('yyl-print')

const handler = require('./handler');

(() => {
  const ctrl = process.argv[2]
  const iEnv = util.envParse(process.argv.slice(3))

  if (ctrl in handler) {
    handler[ctrl]({env: iEnv }).catch((er) => {
      throw er
    })
  } else {
    print.log.error(`usage: ${Object.keys(handler).join(',')}`)
  }
})()


