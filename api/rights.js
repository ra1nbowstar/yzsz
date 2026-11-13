/**
 * 权益中心接口（V1.1）
 * 全部强制 Bearer 认证，用户身份取自 token，不接受客户端传 user_id。
 * 注意：数量字段为十进制字符串（如 "8000.000000"），金额为整数分。
 */
import request from '@/utils/request.js'

/**
 * 权益总览
 * @returns {Promise} {
 *   points: { balance },
 *   rain: { balance },
 *   coupons: { balance },
 *   eggs: { quantity, current_unit_value, current_value, growth_ratio },
 *   goda_coupons: { balance }
 * }
 */
export const getRightsOverview = () => request.get('/api/v1/rights/me')

/**
 * 底池快照 + 实时咯哒值
 * 预留未用：当前权益中心流程只用 /rights/me（已含实时咯哒值），此接口暂不参与。
 */
export const getRightsPool = () => request.get('/api/v1/rights/pool')

/**
 * 优惠券兑换咯哒蛋
 * @param {Object} payload
 * @param {String|Number} payload.coupon_quantity 提交券数量
 * @param {String|Number} payload.expected_unit_value 入池前实时咯哒值（并发改价返回 409）
 * @param {String} [idempotencyKey] 幂等键，每次提交唯一
 */
export const exchangeCouponsForEggs = (payload, idempotencyKey) => {
  const header = {}
  if (idempotencyKey) header['Idempotency-Key'] = idempotencyKey
  return request.post('/api/v1/rights/egg-exchanges', payload, { header })
}

/**
 * 咯哒券兑酒报价（不落单）
 * 本轮前端未接入（白酒商品域），保留备用。
 */
export const quoteWineRedemption = (payload) => {
  return request.post('/api/v1/wine/redemption-quotes', payload)
}

/**
 * 权益流水（本人）
 * @param {Object} [params] { asset_type, event_type, from, to, page, page_size }
 *   asset_type: all / point / rain / coupon / egg / goda_coupon
 */
export const getRightsLedger = (params = {}) => {
  return request.get('/api/v1/rights/ledger', params)
}

/**
 * 咯哒券变动记录（本人）
 * @param {Object} [params] { page, page_size }
 */
export const getGodaCouponRecords = (params = {}) => {
  return request.get('/api/v1/rights/goda-coupon-records', params)
}

/**
 * 权益转化记录（本人）
 * @param {Object} [params] { page, page_size }
 */
export const getRightsConversions = (params = {}) => {
  return request.get('/api/v1/rights/conversions', params)
}