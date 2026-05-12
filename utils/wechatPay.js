/**
 * 微信小程序调起支付：解析统一下单响应、规范化参数、调用 wx / uni.requestPayment
 * 官方仅需 timeStamp、nonceStr、package、signType、paySign；勿传 total_fee（否则会触发异常/误报）
 *
 * 与后端约定（微信 V3 小程序调起支付）：以统一下单返回的 pay_params 为准；
 * signType 必须为 RSA，与 V3 JSAPI 下单配套；package 为 prepay_id=...。
 * 后端已固定带 prepay_id= 前缀时，buildWxMiniProgramPaymentArgs 的补前缀逻辑与之兼容。
 * 若后端开启 WX_MOCK_MODE，paySign 可能为占位而非商户私钥 RSA，真机验签需关闭 MOCK 并配置真实证书。
 */

export const safeJsonParse = (v) => {
  if (v == null || typeof v !== 'string') return null
  try {
    return JSON.parse(v)
  } catch {
    return null
  }
}

/** 是否为可用来调起小程序支付的参数对象（避免误选 pay_params: {} 或仅含 total_fee 的占位对象） */
export const isLikelyMiniProgramPayParams = (o) => {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false
  if (o.paySign === 'ZERO_ORDER_SIGN' || o.pay_sign === 'ZERO_ORDER_SIGN') return true
  const ts = o.timeStamp ?? o.time_stamp ?? o.timestamp
  const pkg = o.package ?? o.packageValue ?? o.prepay_id ?? o.prepayId
  const ps = o.paySign ?? o.pay_sign ?? o.sign
  const ns = o.nonceStr ?? o.nonce_str ?? o.noncestr
  return Boolean(ts && ns && pkg && ps)
}

/**
 * 从后端统一下单响应中取出 JSAPI 支付参数对象
 */
export const pickWechatPayParamsFromUnifiedResponse = (res) => {
  if (!res || typeof res !== 'object') return null
  const d = res.data
  const candidates = [
    d?.pay_params,
    d?.wechat_pay_params,
    d?.jsapi_params,
    d?.payment_params,
    d?.payment?.pay_params,
    d?.payment?.jsapi,
    d?.wx_pay_params,
    d?.mini_program_pay,
    d?.miniProgram,
    d?.result?.pay_params,
    d?.payload?.pay_params,
    d?.data?.pay_params,
    res.pay_params,
    res.wechat_pay_params,
    res.result?.pay_params,
    res.payload?.pay_params,
    res.wx_pay_params,
    res.mini_program_pay
  ]
  for (const c of candidates) {
    if (c == null) continue
    if (typeof c === 'string') {
      const parsed = safeJsonParse(c)
      if (isLikelyMiniProgramPayParams(parsed)) return parsed
    } else if (typeof c === 'object' && isLikelyMiniProgramPayParams(c)) {
      return c
    }
  }
  if (d && typeof d === 'object' && isLikelyMiniProgramPayParams(d)) {
    return d
  }
  if (isLikelyMiniProgramPayParams(res)) return res
  return null
}

/**
 * 转为 wx.requestPayment / uni.requestPayment 所需字段
 */
export const buildWxMiniProgramPaymentArgs = (p) => {
  if (!p || typeof p !== 'object') return null
  const ts = p.timeStamp ?? p.time_stamp ?? p.timestamp
  const ns = p.nonceStr ?? p.nonce_str ?? p.noncestr
  let pkg = p.package ?? p.packageValue ?? p.prepay_id ?? p.prepayId
  if (pkg != null && typeof pkg === 'string') {
    pkg = pkg.trim()
    if (pkg && !pkg.startsWith('prepay_id=')) {
      pkg = `prepay_id=${pkg}`
    }
  }
  const ps = p.paySign ?? p.pay_sign ?? p.sign
  let st = p.signType ?? p.sign_type
  if (st == null || String(st).trim() === '') {
    // API v3 小程序支付：未返回 signType 时按官方约定使用 RSA（勿再按 paySign 长度猜 MD5）
    st = 'RSA'
  } else {
    st = String(st).trim()
    if (/^SHA256withRSA$/i.test(st) || /^RSA2048$/i.test(st) || /^RSA2$/i.test(st)) {
      st = 'RSA'
    }
  }
  return {
    timeStamp: String(ts ?? ''),
    nonceStr: String(ns ?? ''),
    package: String(pkg ?? ''),
    signType: st,
    paySign: String(ps ?? '')
  }
}

/**
 * 解析 wx.requestPayment / uni.requestPayment 的 fail 回调
 * 说明：小程序官方调起仅需五参数，无 total_fee；若 errMsg 仍出现「缺少 total_fee」，多为参数异常时微信误报的旧版文案，应核对统一下单返回的 pay_params（V3 + RSA）。
 */
export const parseWechatPaymentFail = (err) => {
  const rawMsg = String(err?.errMsg || err?.message || err?.msg || '')
  const lower = rawMsg.toLowerCase()
  const userCancelled = /cancel|取消/.test(lower)
  const legacyTotalFeeMsg = /total_fee|缺少参数/.test(rawMsg)
  let userHint = rawMsg.replace(/requestPayment:fail\s*/i, '').trim()
  if (userCancelled) {
    userHint = '已取消支付'
  } else if (legacyTotalFeeMsg) {
    userHint = '支付参数异常（请重新下单或联系客服）。若反复出现，请后端核对统一下单是否返回完整的小程序 V3 pay_params（timeStamp、nonceStr、package、signType RSA、paySign）。'
  } else if (!userHint) {
    userHint = '支付失败，请稍后重试'
  }
  return { rawMsg, userCancelled, legacyTotalFeeMsg, userHint }
}

/** 取微信小程序运行时 wx（避免部分运行域下全局 wx 与 uni 注入不一致） */
const getWxMiniProgramRuntime = () => {
  const g = typeof globalThis !== 'undefined' ? globalThis : {}
  const w = g.wx
  if (w && typeof w.requestPayment === 'function') return w
  // eslint-disable-next-line no-undef
  if (typeof wx !== 'undefined' && wx && typeof wx.requestPayment === 'function') return wx
  return null
}

/**
 * 小程序端发起支付（优先走 wx.requestPayment，避免 uni 层对多余字段的处理差异）
 */
export const requestWxMiniProgramPayment = (args) => {
  return new Promise((resolve, reject) => {
    // 仅传微信文档规定的五个字段（勿附加 total_fee 等，否则部分基础库会报「缺少 total_fee」类误报）
    const param = {
      timeStamp: String(args.timeStamp ?? ''),
      nonceStr: String(args.nonceStr ?? ''),
      package: String(args.package ?? ''),
      signType: String(args.signType ?? 'RSA'),
      paySign: String(args.paySign ?? '')
    }
    const wxRuntime = getWxMiniProgramRuntime()
    if (wxRuntime) {
      wxRuntime.requestPayment({
        ...param,
        success: resolve,
        fail: reject
      })
      return
    }
    uni.requestPayment({
      provider: 'wxpay',
      ...param,
      success: resolve,
      fail: reject
    })
  })
}
