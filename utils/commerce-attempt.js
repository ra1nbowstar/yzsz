// Unknown outcomes retain one immutable operation identity across reloads.
const inFlight = new Map()
const validationRejectRoutes = {
  'order-create': '/order/create',
  'coupon-issue': '/api/coupons/issue',
  'coupon-batch': '/api/coupons/distribute-batch',
  'coupon-exchange': '/api/coupons/exchange',
  'egg-exchange': '/api/v1/rights/egg-exchanges'
}
const attemptStorageKey = (operation) => {
  const user = uni.getStorageSync('userInfo') || {}
  const actor = user.user_id ?? user.id ?? user.userId ?? uni.getStorageSync('userId') ?? ''
  return `commerce-attempt:${actor}:${operation}`
}
const clone = value => JSON.parse(JSON.stringify(value))
export const getCommerceAttempt = (operation) => {
  const stored = uni.getStorageSync(attemptStorageKey(operation))
  return stored ? clone(stored) : null
}
export const postCommerceAttempt = async (request, operation, url, body, explicitKey, confirmsSuccess) => {
  const storageKey = attemptStorageKey(operation)
  let record = getCommerceAttempt(operation)
  if (record && (record.url !== url || JSON.stringify(record.body) !== JSON.stringify(body) || (explicitKey && explicitKey !== record.key))) {
    throw Object.assign(new Error('上次操作结果尚未确认，请先按原请求重试'), { code: 'ATTEMPT_UNRESOLVED' })
  }
  if (inFlight.has(storageKey)) return inFlight.get(storageKey)
  if (!record) {
    record = { key: explicitKey || `${operation}-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`, url, body: clone(body) }
    uni.setStorageSync(storageKey, clone(record))
  }
  const outgoingBody = clone(record.body)
  // 订单创建同时写入 body。请求头被小程序或代理丢掉时，服务端仍能从 idempotency_key 识别同一次购买。
  if (operation === 'order-create' && outgoingBody && typeof outgoingBody === 'object' && !Array.isArray(outgoingBody)) {
    delete outgoingBody.idempotencyKey
    outgoingBody.idempotency_key = record.key
  }
  const attempt = request.post(record.url, outgoingBody, { header: { 'Idempotency-Key': record.key } }).then(result => {
    if (confirmsSuccess && !confirmsSuccess(result)) {
      throw Object.assign(new Error('操作结果尚未确认，请使用原请求重试'), { code: 'ATTEMPT_UNCONFIRMED' })
    }
    const acceptedCode = result?.code == null || [0, 200, 'OK'].includes(result.code)
    if (result?.success !== false && result?.ok !== false && acceptedCode) uni.removeStorageSync(storageKey)
    return result
  }).catch(error => {
    // These mutations reject validation before commit or roll back their transaction.
    const validationRejected = error?.statusCode === 422 && validationRejectRoutes[operation] === record.url.split('?')[0]
    const staleQuote = operation === 'egg-exchange' && record.url === '/api/v1/rights/egg-exchanges' && error?.statusCode === 409 && error?.code === 'QUOTE_STALE'
    if (validationRejected || staleQuote) {
      uni.removeStorageSync(storageKey)
    }
    throw error
  }).finally(() => inFlight.delete(storageKey))
  inFlight.set(storageKey, attempt)
  return attempt
}
