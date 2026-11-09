import request from '@/utils/request.js'
import { postCommerceAttempt } from '@/utils/commerce-attempt.js'

/**
 * 获取允许转正的资金池列表
 */
export const getTransformAllowed = () => {
  return request.get('/api/fund-pools/transform-allowed')
}

/**
 * 查询资金池转正操作明细
 */
export const getTransformLogs = (params) => {
  return request.get('/api/fund-pools/transform-logs', params || {})
}

/**
 * 查询资金池分配配置（包含余额 balance）
 * @returns {Promise}
 */
export const getFundPoolAllocations = () => {
  return request.get('/api/fund-pools/allocations')
}

/**
 * 直推奖励比例（与 FinanceService.get_direct_referral_reward_rate 对应）
 * GET /api/fund-pools/direct-referral-reward-rate
 * @returns {Promise<{ rate?: number, data?: { rate?: number } }>}
 */
export const getDirectReferralRewardRate = () => {
  return request.get('/api/fund-pools/direct-referral-reward-rate')
}

/**
 * 设置直推奖励比例（与 FinanceService.set_direct_referral_reward_rate 对应）
 * POST /api/fund-pools/direct-referral-reward-rate
 * Body: { "rate": number }，合法范围 (0, 1]
 * @param {number} rate
 */
export const setDirectReferralRewardRate = (rate) => {
  const r = Number(rate)
  if (!Number.isFinite(r) || r <= 0 || r > 1) {
    return Promise.reject(new Error('直推奖励比例须在 (0, 1] 之间'))
  }
  return request.post('/api/fund-pools/direct-referral-reward-rate', { rate: r })
}

/**
 * 资金池转正：转化为优惠券（从指定资金池扣款；与 /api/coupons/distribute-batch 不同，后者扣用户积分/雨点）
 * POST /api/fund-pools/transform-to-coupon
 * Query：pool_type, user_id, amount（整数元，后端按多张 1 元券发放）, coupon_type, applicable_product_type, remark
 */
export const transformToCoupon = async (params) => {
  const pairs = []
  const add = (k, v) => {
    if (v == null) return
    const s = String(v)
    if (!s) return
    pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(s)}`)
  }
  add('pool_type', params.pool_type)
  add('user_id', params.user_id)
  add('amount', params.amount)
  add('coupon_type', params.coupon_type)
  add('applicable_product_type', params.applicable_product_type)
  if (params.remark != null && params.remark !== '') add('remark', params.remark)
  const query = pairs.join('&')
  const url = '/api/fund-pools/transform-to-coupon' + (query ? `?${query}` : '')
  const confirmsSuccess = result => result?.success === true && result.ok !== false &&
    (result.code == null || [0, 200, 'OK'].includes(result.code)) &&
    Array.isArray(result.data?.coupon_ids) && result.data.coupon_ids.length > 0 &&
    result.data.coupon_ids.every(id => Number.isInteger(id) && id > 0) &&
    result.data.count === result.data.coupon_ids.length &&
    result.data.count === Number(params.amount) && result.data.amount_per_coupon === 1 &&
    result.data.total_amount === Number(params.amount)
  return postCommerceAttempt(request, 'fund-transform', url, {}, undefined, confirmsSuccess)
}