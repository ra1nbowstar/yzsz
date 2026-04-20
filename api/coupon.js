/**
 * 优惠券相关接口
 */

import request from '@/utils/request.js'

/**
 * 发放优惠券给指定用户
 * @param {Object} params 发放参数
 * @param {Number} params.user_id 用户ID（必需）
 * @param {Number} params.amount 优惠券金额（必需）
 * @param {String} params.coupon_type 优惠券类型（可选，默认'user'，可选'user'或'merchant'）
 * @param {String} params.applicable_product_type 适用商品范围（可选，默认'all'，可选'all'|'normal_only'|'member_only'）
 * @returns {Promise}
 */
export const distributeCoupon = (params) => {
  if (!params.user_id) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  if (!params.amount || params.amount <= 0) {
    return Promise.reject(new Error('优惠券金额必须大于0'))
  }
  
  // 确保 user_id 是整数
  const user_id = parseInt(params.user_id, 10)
  const amount = parseFloat(params.amount)
  const coupon_type = params.coupon_type || 'user'
  const applicable_product_type = params.applicable_product_type || 'all'
  
  // 手动拼接query参数（兼容小程序环境，不使用URLSearchParams）
  const queryParams = []
  queryParams.push(`user_id=${encodeURIComponent(user_id)}`)
  queryParams.push(`amount=${encodeURIComponent(amount)}`)
  queryParams.push(`coupon_type=${encodeURIComponent(coupon_type)}`)
  queryParams.push(`applicable_product_type=${encodeURIComponent(applicable_product_type)}`)
  
  const url = `/api/coupons/distribute?${queryParams.join('&')}`
  
  // POST请求，但参数在URL中（query参数），body为空
  return request.post(url, {})
}

/**
 * 查询我的优惠券
 * @param {Object} params 查询参数
 * @param {Number} params.user_id 用户ID（必需）
 * @param {String} params.status 优惠券状态（可选，默认'all'，可选'all'|'unused'|'used'|'expired'）
 * @param {Number} params.page 页码（可选，默认1）
 * @param {Number} params.page_size 每页条数（可选，默认20）
 * @returns {Promise}
 */
export const getMyCoupons = (params) => {
  if (!params.user_id) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  
  const user_id = parseInt(params.user_id, 10)
  const status = params.status || 'all'
  const page = params.page || 1
  const page_size = params.page_size || 20
  
  // 手动拼接query参数
  const queryParams = []
  queryParams.push(`user_id=${encodeURIComponent(user_id)}`)
  queryParams.push(`status=${encodeURIComponent(status)}`)
  queryParams.push(`page=${encodeURIComponent(page)}`)
  queryParams.push(`page_size=${encodeURIComponent(page_size)}`)
  
  // 根据API文档，路径是 /my（没有 /api 前缀）
  // baseURL是 http://8.136.35.215
  // 所以完整路径应该是 /my
  const url = `/my?${queryParams.join('&')}`
  
  return request.get(url)
}

/**
 * 使用优惠券
 * @param {Object} params 使用参数
 * @param {Number} params.coupon_id 优惠券ID（必需）
 * @param {Number} params.user_id 用户ID（必需）
 * @param {String} params.order_type 订单商品类型（可选，用于验证优惠券适用范围，'normal'或'member'）
 * @returns {Promise}
 */
export const useCoupon = (params) => {
  if (!params.coupon_id) {
    return Promise.reject(new Error('优惠券ID不能为空'))
  }
  if (!params.user_id) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  
  const coupon_id = parseInt(params.coupon_id, 10)
  const user_id = parseInt(params.user_id, 10)
  
  // 手动拼接query参数
  const queryParams = []
  queryParams.push(`coupon_id=${encodeURIComponent(coupon_id)}`)
  queryParams.push(`user_id=${encodeURIComponent(user_id)}`)
  
  // 如果提供了order_type，添加到参数中
  if (params.order_type && (params.order_type === 'normal' || params.order_type === 'member')) {
    queryParams.push(`order_type=${encodeURIComponent(params.order_type)}`)
  }
  
  const url = `/api/coupons/use?${queryParams.join('&')}`
  
  // POST请求，但参数在URL中（query参数），body为空
  return request.post(url, {})
}

export const exchangeCouponsApi = (count) => {
  let url = '/api/coupons/exchange'
  if (count !== undefined && count !== null && count > 0) {
    url += `?count=${encodeURIComponent(count)}`
  }
  return request.post(url, {})
}

/**
 * 获取即将过期的优惠券
 * @param {Number} days 即将过期的天数（默认3，最大30）
 * @returns {Promise}
 */
export const getExpiringCoupons = (days = 3) => {
  return request.get('/api/coupons/expiring', { days })
}