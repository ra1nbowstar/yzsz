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
 */
export const transformToCoupon = (data) => {
  return request({
    url: '/api/fund-pools/transform-to-coupon',
    method: 'POST',
    data
  })
}