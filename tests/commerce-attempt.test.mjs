import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../utils/commerce-attempt.js', import.meta.url), 'utf8')
const loadHelper = async () => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`)
const { postCommerceAttempt } = await loadHelper()
const storage = new Map()
globalThis.uni = {
  getStorageSync: key => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key)
}

test('unknown result retains the same identity; success retires it', async () => {
  storage.clear()
  storage.set('userInfo', { id: 101 })
  const keys = []
  let fail = true
  const request = { post: async (url, body, options) => {
    keys.push(options.header['Idempotency-Key'])
    if (fail) throw new Error('timeout')
    return { success: true }
  } }
  const body = { face_value_yuan: '10.00', quantity: 1 }
  await assert.rejects(postCommerceAttempt(request, 'issue', '/issue', body), /timeout/)
  fail = false
  await postCommerceAttempt(request, 'issue', '/issue', body)
  assert.equal(keys[0], keys[1])
  await postCommerceAttempt(request, 'issue', '/issue', body)
  assert.notEqual(keys[1], keys[2])
})

test('double tap shares one network mutation and exact string payload', async () => {
  storage.clear()
  let complete
  let calls = 0
  const body = { coupon_quantity: '123456789.123456', expected_unit_value: '0.000001' }
  const request = { post: (url, actual) => {
    calls += 1
    assert.deepEqual(actual, body)
    return new Promise(resolve => { complete = resolve })
  } }
  const first = postCommerceAttempt(request, 'egg', '/egg', body)
  const second = postCommerceAttempt(request, 'egg', '/egg', body)
  assert.equal(calls, 1)
  complete({ code: 'OK' })
  await Promise.all([first, second])
})

test('unresolved operation rejects replacement body or explicit key without sending', async () => {
  storage.clear()
  let calls = 0
  const request = { post: async () => { calls += 1; throw new Error('unknown') } }
  await assert.rejects(postCommerceAttempt(request, 'order', '/order', { quantity: 1 }, 'K'))
  await assert.rejects(postCommerceAttempt(request, 'order', '/order', { quantity: 2 }, 'K'), { code: 'ATTEMPT_UNRESOLVED' })
  await assert.rejects(postCommerceAttempt(request, 'order', '/order', { quantity: 1 }, 'K2'), { code: 'ATTEMPT_UNRESOLVED' })
  assert.equal(calls, 1)
})

test('explicit key and original body survive timeout and module reconstruction', async () => {
  storage.clear()
  const original = { quantity: 1 }
  const calls = []
  let loseResponse = true
  const request = { post: async (url, body, options) => {
    calls.push({ body, key: options.header['Idempotency-Key'] })
    if (loseResponse) throw new Error('commit response lost')
    return { order_number: 'O1' }
  } }
  await assert.rejects(postCommerceAttempt(request, 'order-create', '/order/create', original, 'explicit-K'))
  original.quantity = 99
  const reloaded = await loadHelper()
  const pending = reloaded.getCommerceAttempt('order-create')
  assert.deepEqual(pending.body, { quantity: 1 })
  assert.equal(pending.key, 'explicit-K')
  await assert.rejects(reloaded.postCommerceAttempt(request, 'order-create', '/order/create', pending.body, 'override'), { code: 'ATTEMPT_UNRESOLVED' })
  loseResponse = false
  await reloaded.postCommerceAttempt(request, 'order-create', '/order/create', { quantity: 1 })
  assert.deepEqual(calls, [{ body: { quantity: 1, idempotency_key: 'explicit-K' }, key: 'explicit-K' }, { body: { quantity: 1, idempotency_key: 'explicit-K' }, key: 'explicit-K' }])
  assert.equal(reloaded.getCommerceAttempt('order-create'), null)
})

test('lost exchange response replays original quote after page reconstruction', async () => {
  storage.clear()
  let debitCount = 0
  const committed = new Map()
  const calls = []
  let loseResponse = true
  const request = { post: async (url, body, options) => {
    const key = options.header['Idempotency-Key']
    calls.push({ body, key })
    if (!committed.has(key)) {
      debitCount += 1
      committed.set(key, { code: 'OK', data: { exchange_id: 7 } })
    }
    if (loseResponse) throw new Error('response lost after commit')
    return committed.get(key)
  } }
  const original = { coupon_quantity: '10', expected_unit_value: '1.000000' }
  await assert.rejects(postCommerceAttempt(request, 'egg-exchange', '/api/v1/rights/egg-exchanges', original))
  const page = await loadHelper()
  const refreshed = { coupon_quantity: '10', expected_unit_value: '1.100000' }
  await assert.rejects(page.postCommerceAttempt(request, 'egg-exchange', '/api/v1/rights/egg-exchanges', refreshed), { code: 'ATTEMPT_UNRESOLVED' })
  const pending = page.getCommerceAttempt('egg-exchange')
  assert.deepEqual(pending.body, original)
  loseResponse = false
  const result = await page.postCommerceAttempt(request, 'egg-exchange', pending.url, pending.body, pending.key)
  assert.equal(result.data.exchange_id, 7)
  assert.equal(debitCount, 1)
  assert.deepEqual(calls[0], calls[1])
  assert.equal(page.getCommerceAttempt('egg-exchange'), null)
})

test('only definitive pre-write QUOTE_STALE releases an exchange attempt', async () => {
  storage.clear()
  const body = { coupon_quantity: '10', expected_unit_value: '1.000000' }
  let error = { statusCode: 409, code: 'IDEMPOTENCY_CONFLICT' }
  const request = { post: async () => { throw error } }
  const page = await loadHelper()
  await assert.rejects(page.postCommerceAttempt(request, 'egg-exchange', '/api/v1/rights/egg-exchanges', body))
  assert.ok(page.getCommerceAttempt('egg-exchange'))
  error = { statusCode: 409, code: 'QUOTE_STALE' }
  await assert.rejects(page.postCommerceAttempt(request, 'egg-exchange', '/api/v1/rights/egg-exchanges', body))
  assert.equal(page.getCommerceAttempt('egg-exchange'), null)
})

test('422 shipping validation rejection permits corrected body and new attempt', async () => {
  storage.clear()
  const page = await loadHelper()
  const calls = []
  const request = { post: async (url, body, options) => {
    calls.push({ body, key: options.header['Idempotency-Key'] })
    if (body.delivery_way === 'platform') throw { statusCode: 422, detail: '缺少收货地址' }
    return { order_number: 'O2' }
  } }
  await assert.rejects(page.postCommerceAttempt(request, 'order-create', '/order/create', { delivery_way: 'platform' }))
  assert.equal(page.getCommerceAttempt('order-create'), null)
  await page.postCommerceAttempt(request, 'order-create', '/order/create', { delivery_way: 'pickup' })
  assert.notEqual(calls[0].key, calls[1].key)
})

test('422 invalid explicit key permits corrected key after reconstruction', async () => {
  storage.clear()
  let calls = 0
  const request = { post: async (url, body, options) => {
    calls += 1
    if (options.header['Idempotency-Key'] === 'invalid key') throw { statusCode: 422 }
    return { order_number: 'O3' }
  } }
  const page = await loadHelper()
  await assert.rejects(page.postCommerceAttempt(request, 'order-create', '/order/create', {}, 'invalid key'))
  const reloaded = await loadHelper()
  assert.equal(reloaded.getCommerceAttempt('order-create'), null)
  await reloaded.postCommerceAttempt(request, 'order-create', '/order/create', {}, 'corrected-key')
  assert.equal(calls, 2)
})

test('unknown, server, throttling and ambiguous conflict responses preserve immutable attempts', async () => {
  for (const error of [new Error('timeout'), { statusCode: 500 }, { statusCode: 503 },
    { statusCode: 429 }, { statusCode: 409 }, { statusCode: 409, code: 'IDEMPOTENCY_CONFLICT' },
    { statusCode: 400 }, { code: 401 }, { statusCode: 403 }, { statusCode: 404 }]) {
    storage.clear()
    const page = await loadHelper()
    let calls = 0
    const request = { post: async () => { calls += 1; throw error } }
    await assert.rejects(page.postCommerceAttempt(request, 'order-create', '/order/create', { quantity: 1 }, 'original'))
    assert.equal(page.getCommerceAttempt('order-create').key, 'original')
    await assert.rejects(page.postCommerceAttempt(request, 'order-create', '/order/create', { quantity: 2 }, 'replacement'), { code: 'ATTEMPT_UNRESOLVED' })
    assert.equal(calls, 1)
  }
})

test('422 on uncontracted operation is not evidence of no commit', async () => {
  storage.clear()
  const page = await loadHelper()
  await assert.rejects(page.postCommerceAttempt({ post: async () => { throw { statusCode: 422 } } }, 'other', '/other', {}))
  assert.ok(page.getCommerceAttempt('other'))
})

test('fund wrapper shares immutable URL/empty-body identity across reload and retires success', async () => {
  storage.clear()
  const wrapperSource = await readFile(new URL('../api/fund-pool.js', import.meta.url), 'utf8')
  const calls = []
  let fail = true
  globalThis.fundRequest = { post: async (url, body, options) => {
    calls.push({ url, body, key: options.header['Idempotency-Key'] })
    if (fail) throw { statusCode: 503 }
    return { success: true, data: { coupon_ids: [7, 8], count: 2, amount_per_coupon: 1, total_amount: 2 } }
  } }
  const loadWrapper = async () => {
    const helper = await loadHelper()
    globalThis.fundAttempt = helper.postCommerceAttempt
    const adapted = wrapperSource.replace("import request from '@/utils/request.js'", 'const request = globalThis.fundRequest')
      .replace("import { postCommerceAttempt } from '@/utils/commerce-attempt.js'", 'const postCommerceAttempt = globalThis.fundAttempt')
    return { helper, wrapper: await import(`data:text/javascript;base64,${Buffer.from(adapted).toString('base64')}#${Math.random()}`) }
  }
  const params = { pool_type: 'public_welfare', user_id: 101, amount: 2, coupon_type: 'user', applicable_product_type: 'all', remark: 'a b' }
  const first = await loadWrapper()
  await assert.rejects(first.wrapper.transformToCoupon(params))
  const reloaded = await loadWrapper()
  await assert.rejects(reloaded.wrapper.transformToCoupon({ ...params, amount: 3 }), { code: 'ATTEMPT_UNRESOLVED' })
  assert.equal(calls.length, 1)
  fail = false
  await reloaded.wrapper.transformToCoupon(params)
  assert.deepEqual(calls[0], calls[1])
  assert.equal(calls[0].url, '/api/fund-pools/transform-to-coupon?pool_type=public_welfare&user_id=101&amount=2&coupon_type=user&applicable_product_type=all&remark=a%20b')
  assert.deepEqual(calls[0].body, {})
  assert.equal(reloaded.helper.getCommerceAttempt('fund-transform'), null)
  await reloaded.wrapper.transformToCoupon(params)
  assert.notEqual(calls[1].key, calls[2].key)
  delete globalThis.fundRequest
  delete globalThis.fundAttempt
})

test('actual fund wrapper rejects ambiguous fulfilled responses and retains original identity', async () => {
  const wrapperSource = await readFile(new URL('../api/fund-pool.js', import.meta.url), 'utf8')
  const confirmed = { success: true, data: { coupon_ids: [7], count: 1, amount_per_coupon: 1, total_amount: 1 } }
  for (const unconfirmed of [{}, null, undefined, '', { success: false }, { success: true, code: 500 },
    { ...confirmed, ok: false }, { success: true }, { success: true, data: {} },
    { success: true, data: { coupon_ids: [] } }]) {
    storage.clear()
    const helper = await loadHelper()
    const calls = []
    let response = unconfirmed
    globalThis.fundRequest = { post: async (url, body, options) => {
      calls.push({ url, body, key: options.header['Idempotency-Key'] })
      return response
    } }
    globalThis.fundAttempt = helper.postCommerceAttempt
    const adapted = wrapperSource.replace("import request from '@/utils/request.js'", 'const request = globalThis.fundRequest')
      .replace("import { postCommerceAttempt } from '@/utils/commerce-attempt.js'", 'const postCommerceAttempt = globalThis.fundAttempt')
    const wrapper = await import(`data:text/javascript;base64,${Buffer.from(adapted).toString('base64')}#${Math.random()}`)
    const params = { pool_type: 'public_welfare', user_id: 101, amount: 1 }
    await assert.rejects(wrapper.transformToCoupon(params), { code: 'ATTEMPT_UNCONFIRMED' })
    assert.equal(helper.getCommerceAttempt('fund-transform').key, calls[0].key)
    response = { ...confirmed, code: 0 }
    assert.deepEqual(await wrapper.transformToCoupon(params), response)
    assert.equal(calls[0].key, calls[1].key)
    assert.deepEqual(calls[0].body, {})
    assert.equal(helper.getCommerceAttempt('fund-transform'), null)
  }
  delete globalThis.fundRequest
  delete globalThis.fundAttempt
})
