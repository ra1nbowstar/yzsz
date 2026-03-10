/**
 * 支付相关API（分包专用）
 */

import request from '@/utils/request.js'

// 运行时安全的随机字节生成：优先使用 Web Crypto（浏览器/小程序若可用），退回 Math.random 作为兜底
const randomHex = (length = 8) => {
  try {
    const wc = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto)
    if (wc && typeof wc.getRandomValues === 'function') {
      const buf = new Uint8Array(length)
      wc.getRandomValues(buf)
      return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
    }
  } catch (e) {
    // ignore and fallback
  }
  let s = ''
  while (s.length < length * 2) {
    s += Math.random().toString(16).slice(2)
  }
  return s.slice(0, length * 2)
}

/**
 * 发送微信支付回调通知到后端（支持 XML 或 JSON body）
 * @param {String|Object} data - 原始数据（XML 字符串或 JSON 对象）
 * @param {Object} headers - 可选头部覆盖（用于传入真实签名、Serial 等）
 */
export const notifyWeChatPay = (data, headers = {}) => {
  const isString = typeof data === 'string'
  const body = isString ? data : JSON.stringify(data)

  const ts = Math.floor(Date.now() / 1000).toString()
  const nonce = randomHex(8)

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Wechatpay-Timestamp': ts,
    'Wechatpay-Nonce': nonce,
    'Wechatpay-Signature': headers['Wechatpay-Signature'] || 'MOCK_SIGNATURE',
    'Wechatpay-Serial': headers['Wechatpay-Serial'] || 'MOCK_SERIAL'
  }

  const opts = {
    url: '/wechat-pay/notify',
    method: 'POST',
    header: Object.assign({}, defaultHeaders, headers),
    data: body
  }

  return request.request(opts)
}

// 占位：线下收银与商家支付单相关 API（前端占位实现）
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

export const generateQRCode = async (code_token) => {
  console.log('api代码为调用，生成收款码：', code_token)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ qrcode: `merchant://pay?token=${code_token}` })
    }, 200)
  })
}

export const applyBestCoupons = async ({ user_id, order_amount, store_id = null }) => {
  console.log('api代码为调用，匹配优惠券：', { user_id, order_amount, store_id })
  return new Promise((resolve) => {
    setTimeout(() => {
      const coupons = [
        { id: 'C1', name: '门店券-50', deduct: Math.min(50, order_amount), source: 'store' },
        { id: 'C2', name: '平台券-20', deduct: Math.min(20, order_amount) }
      ]
      const applied = coupons.filter(c => c.deduct > 0)
      const totalDeduct = applied.reduce((s, c) => s + c.deduct, 0)
      const finalAmount = Math.max(0, order_amount - totalDeduct)
      resolve({ applied, totalDeduct, finalAmount })
    }, 300)
  })
}

export const confirmPayment = async ({ order_id, user_id, paid_amount, payment_method = 'wechat' }) => {
  console.log('api代码为调用，确认支付：', { order_id, user_id, paid_amount, payment_method })
  return new Promise((resolve) => {
    setTimeout(() => {
      const trade_no = 'T' + Date.now()
      resolve({ success: true, trade_no, paid_amount, order_id })
    }, 400)
  })
}

export const notifyMerchant = async ({ merchant_id, order_id, message }) => {
  console.log('api代码为调用，通知商家：', { merchant_id, order_id, message })
  return Promise.resolve({ ok: true })
}

/**
 * 调用后端真实的订单支付接口 `/order/pay` 完成支付（后端负责验证优惠券/积分并更新订单状态）
 */
export const wechatUnifiedOrder = (data) => {
  const payload = {
    order_number: data.orderNo,
    pay_way: 'wechat',
    coupon_id: data.couponId || null,
    points_to_use: data.pointsToUse || 0
  }
  console.log('[wechatUnifiedOrder] 调用真实下单接口 /order/pay, payload:', payload)
  return request.post('/order/pay', payload)
}

/**
 * 创建 JSAPI 订单并获取前端支付参数（正常购物场景）
 * 后端接口：POST /api/wechat-pay/create-order（带 /api）
 */
export const createJsapiOrder = (data) => {
  const totalFee = Math.round((Number(data.amount) || 0) * 100)
  const payload = {
    out_trade_no: data.orderNo || data.order_id || data.orderId,
    total_fee: totalFee,
    openid: data.openid,
    description: data.description || '商品支付'
  }
  console.log('[createJsapiOrder] 正常购物 -> POST /api/wechat-pay/create-order, payload:', payload)
  return request.post('/api/wechat-pay/create-order', payload)
}

/**
 * 查询支付状态
 */
export const queryPaymentStatus = (orderNo) => {
  return request.get(`/payment/query/${orderNo}`)
}

export default {
  notifyWeChatPay,
  createPayment,
  generateQRCode,
  applyBestCoupons,
  confirmPayment,
  notifyMerchant,
  wechatUnifiedOrder,
  createJsapiOrder,
  queryPaymentStatus
}

