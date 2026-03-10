
/**
 * 子包内的 payment API（包含占位实现与实际请求）
 */

import request from '@/utils/request.js'

/**
 * 占位：线下收银与商家支付单相关 API
 * 所有接口均为前端占位实现，使用 console.log 输出模拟行为
 */

// 创建支付单（商家主动创建）
export const createPayment = async ({ amount, product_name, store_name, note, expire_minutes = 15 }) => {
  console.log('api代码为调用，创建支付单：', { amount, product_name, store_name, note, expire_minutes })
  return new Promise((resolve) => {
    setTimeout(() => {
      const orderId = 'PO' + Date.now()
      const token = 'pay_token_' + Math.random().toString(36).slice(2,10)
      resolve({ order_id: orderId, code_token: token, amount, expires_in: expire_minutes * 60 })
    }, 300)
  })
}

// 生成收款码（占位，通常后端返回二维码内容或 URL）
export const generateQRCode = async (code_token) => {
  console.log('api代码为调用，生成收款码：', code_token)
  return new Promise((resolve) => {
    setTimeout(() => {
      // 返回一个可以作为二维码内容的字符串（前端可以直接用来渲染二维码）
      resolve({ qrcode: `merchant://pay?token=${code_token}` })
    }, 200)
  })
}

// 扫码识别并匹配最优优惠券（门店券优先、面额大优先）
export const applyBestCoupons = async ({ user_id, order_amount, store_id = null }) => {
  console.log('api代码为调用，匹配优惠券：', { user_id, order_amount, store_id })
  return new Promise((resolve) => {
    setTimeout(() => {
      // 占位：返回模拟匹配结果
      const coupons = [
        { id: 'C1', name: '门店券-50', deduct: Math.min(50, order_amount), source: 'store' },
        { id: 'C2', name: '平台券-20', deduct: Math.min(20, order_amount) }
      ]
      // 简单规则：优先门店券、面额大优先，合并适用（占位逻辑）
      const applied = coupons.filter(c => c.deduct > 0)
      const totalDeduct = applied.reduce((s, c) => s + c.deduct, 0)
      const finalAmount = Math.max(0, order_amount - totalDeduct)
      resolve({ applied, totalDeduct, finalAmount })
    }, 300)
  })
}

// 确认支付（占位），会通知商家并生成订单
export const confirmPayment = async ({ order_id, user_id, paid_amount, payment_method = 'wechat' }) => {
  console.log('api代码为调用，确认支付：', { order_id, user_id, paid_amount, payment_method })
  return new Promise((resolve) => {
    setTimeout(() => {
      const trade_no = 'T' + Date.now()
      resolve({ success: true, trade_no, paid_amount, order_id })
    }, 400)
  })
}

// 通知商家（占位）
export const notifyMerchant = async ({ merchant_id, order_id, message }) => {
  console.log('api代码为调用，通知商家：', { merchant_id, order_id, message })
  return Promise.resolve({ ok: true })
}

export default {
  createPayment,
  generateQRCode,
  applyBestCoupons,
  confirmPayment,
  createOfflinePaymentOrder,
  notifyMerchant
}

/**
 * 支付相关API（后端请求）
 */

/**
 * 微信支付统一下单
 * @param {Object} data 支付数据
 * @param {String} data.orderNo 订单号
 * @param {Number} data.amount 支付金额（元）
 * @param {String} data.description 商品描述
 * @param {String} data.openid 用户openid（小程序必需）
 * @returns {Promise}
 */
export const wechatUnifiedOrder = (data) => {
  const payload = {
    order_number: data.orderNo,
    pay_way: 'wechat',
    coupon_id: data.couponId || null,
    points_to_use: data.pointsToUse || 0
  }
  console.log('[wechatUnifiedOrder - subPackage] 调用真实下单接口 /order/pay, payload:', payload)
  return request.post('/order/pay', payload)
}


/**
 * 查询支付状态
 * @param {String} orderNo 订单号
 * @returns {Promise}
 */
export const queryPaymentStatus = (orderNo) => {
  return request.get(`/payment/query/${orderNo}`)
}

/**
 * 创建支付单（线下收款）
 * @param {Object} data
 * @param {Number} data.merchant_id 商户ID
 * @param {String} data.store_name 门店名称
 * @param {Number} data.amount 金额（元）
 * @param {String} data.product_name 商品名称
 * @param {String} data.remark 备注（可选）
 * @returns {Promise} 200 返回订单号或包含 order_no 的对象
 */
export const createOfflinePaymentOrder = (data) => {
  const body = {
    merchant_id: data.merchant_id ?? 0,
    store_name: String(data.store_name || '').trim() || '门店',
    amount: Number(data.amount) || 0,
    product_name: String(data.product_name || '').trim() || '',
    remark: String(data.remark || '').trim() || ''
  }
  // 选了已有商品时传 product_id，不选时由后端自动生成商品ID/名称
  if (data.product_id !== undefined && data.product_id !== null && data.product_id !== '') {
    body.product_id = Number(data.product_id)
  }
  const bodyStr = JSON.stringify(body)
  console.log('[创建支付单] 请求体 POST /api/offline/dingdan/chuangjian', bodyStr)
  return request.post('/api/offline/dingdan/chuangjian', bodyStr)
}

/**
 * 刷新收款码
 * @param {String} order_no 订单号
 * @returns {Promise} 200 成功可能返回新的收款码内容（string）
 */
export const refreshCollectionCode = (order_no) => {
  if (!order_no || !String(order_no).trim()) {
    return Promise.reject(new Error('订单号不能为空'))
  }
  const url = `/api/offline/shoukuanma/shuaixin?order_no=${encodeURIComponent(String(order_no).trim())}`
  return request.put(url, {})
}/**
 * 线下订单详情（扫码后进支付页用）
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