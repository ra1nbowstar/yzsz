/**
 * 线下订单/支付相关接口（主包，供 pages/offline/pay 使用，避免引用分包导致页面不执行）
 */

import request from '@/utils/request.js'

/**
 * 线下收银统一下单（支持优惠券）
 * POST /api/offline/zhifu/tongyi?order_no=xxx&coupon_id=yyy
 * @param {String} order_no 订单号（必填）
 * @param {Number|null} [coupon_id] 优惠券ID（可选）
 * @returns {Promise} 成功时返回支付参数（如 timeStamp、nonceStr、package、paySign 等，供 wx.requestPayment 使用）
 */
export const offlinePayUnified = (order_no, coupon_id = null, openid = '', user_id = null, total_fee = null, points_to_use = null) => {
  if (points_to_use > 0) return Promise.reject(new Error('线下积分抵扣暂不可用'))
  if (!order_no || !String(order_no).trim()) {
    return Promise.reject(new Error('订单号不能为空'))
  }
  const orderNoStr = encodeURIComponent(String(order_no).trim())
  let query = `order_no=${orderNoStr}`
  if (coupon_id != null && coupon_id !== '') {
    query += `&coupon_id=${encodeURIComponent(String(coupon_id))}`
  }
  const url = `/api/offline/zhifu/tongyi?${query}`
  const body = {}
  if (total_fee != null) body.total_fee = total_fee
  if (openid && String(openid).trim()) body.openid = String(openid).trim()
  if (user_id != null && user_id !== '') body.user_id = user_id
  return request.post(url, body)
}

/**
 * 线下订单详情（扫码后进支付页用）
 * GET /api/offline/dingdan/xiangqing/{order_no}?user_id=xxx
 * @param {String} order_no 订单号
 * @param {Number} [user_id] 用户ID（可选，不传则从本地 userInfo 取）
 * @returns {Promise}
 */
export const getOfflineOrderDetail = (order_no, user_id) => {
  if (!order_no || !String(order_no).trim()) {
    return Promise.reject(new Error('订单号不能为空'))
  }
  let uid = user_id
  if (uid == null || uid === '') {
    try {
      const userInfo = uni.getStorageSync('userInfo') || {}
      uid = userInfo.user_id ?? userInfo.id ?? userInfo.userId ?? userInfo.uid
    } catch (e) {}
  }
  const no = encodeURIComponent(String(order_no).trim())
  const url = uid != null && uid !== ''
    ? `/api/offline/dingdan/xiangqing/${no}?user_id=${encodeURIComponent(Number(uid))}`
    : `/api/offline/dingdan/xiangqing/${no}`
  return request.get(url)
}
