/* eslint-disable prefer-arrow-callback */
// WARNING 需要 连公司 vpn 再进行测试
const fs = require('fs')
const path = require('path')
const extFs = require('yyl-fs')
const tUtil = require('yyl-seed-test-util')
const handler = require('../../bin/handler')

const {
  linkCheck,
  checkAsyncComponent,
  checkCssFiles
} = require('../fn/all')


// + vars
const filename = 'base'
const FRAG_PATH = path.join(__dirname, `../__frag/all-${filename}`)
const TEST_CASE_PATH = path.join(__dirname, '../case')
const PJ_PATH = path.join(TEST_CASE_PATH, filename)
const COMMON_PATH = path.join(TEST_CASE_PATH, 'commons')
// - vars

describe(`seed.all() case:${filename}`, () => {
  const TARGET_PATH = path.join(FRAG_PATH, filename)
  const TARGET_COMMON_PATH = path.join(FRAG_PATH, 'commons')
  const configPath = path.join(TARGET_PATH, 'config.js')

  before(async function () {
    if (!fs.existsSync(FRAG_PATH)) {
      tUtil.frag.init(FRAG_PATH)
      await tUtil.frag.build()
    }
    await extFs.copyFiles(PJ_PATH, TARGET_PATH, (iPath) => {
      const rPath = path.relative(PJ_PATH, iPath)
      return !/node_modules/.test(rPath)
    })

    await extFs.copyFiles(COMMON_PATH, TARGET_COMMON_PATH)
  })

  it ('all', async function() {
    const env = {
      config: configPath,
      silent: true
    }
    const config = await handler.all({ env })

    await linkCheck(config)
    await checkAsyncComponent(config)
    await checkCssFiles(config)
  }).timeout(0)

  it('all --proxy', async function() {
    const env = {
      config: configPath,
      silent: true,
      proxy: true
    }
    const config = await handler.all({ env })

    await linkCheck(config)
    await checkAsyncComponent(config)
    await checkCssFiles(config)
  }).timeout(0)

  it('all --isCommit', async function() {
    const env = {
      config: configPath,
      silent: true,
      isCommit: true
    }
    const config = await handler.all({ env })

    await linkCheck(config)
    await checkAsyncComponent(config)
    await checkCssFiles(config)
  }).timeout(0)
})
