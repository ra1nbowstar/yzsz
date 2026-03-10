import { request } from '@/utils/request.js'

/**
 * 获取允许转正的资金池列表
 */
export const getTransformAllowed = () => {
  return request({
    url: '/api/fund-pools/transform-allowed',
    method: 'GET'
  })
}

/**
 * 查询资金池转正操作明细
 */
export const getTransformLogs = (params) => {
  return request({
    url: '/api/fund-pools/transform-logs',
    method: 'GET',
    data: params
  })
}

/**
 * 资金池转正：转化为优惠券
 * 接口要求参数为 query：pool_type, user_id, amount, coupon_type, applicable_product_type, remark
 */
export const transformToCoupon = (params) => {
  const q = new URLSearchParams()
  if (params.pool_type != null) q.set('pool_type', String(params.pool_type))
  if (params.user_id != null) q.set('user_id', String(params.user_id))
  if (params.amount != null) q.set('amount', String(params.amount))
  if (params.coupon_type != null) q.set('coupon_type', String(params.coupon_type))
  if (params.applicable_product_type != null) q.set('applicable_product_type', String(params.applicable_product_type))
  if (params.remark != null && params.remark !== '') q.set('remark', String(params.remark))
  const query = q.toString()
  return request({
    url: '/api/fund-pools/transform-to-coupon' + (query ? '?' + query : ''),
    method: 'POST'
  })
}