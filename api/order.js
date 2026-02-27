/**
 * 订单相关接口
 */

import request from '@/utils/request.js'
import config from '@/utils/config.js'
import { getDeliveryListSorted } from '@/data/delivery-list.js'

/**
 * 创建订单（包含积分信息）
 * @param {Object} data 订单数据
 * @param {Array} data.items 商品列表
 * @param {Number} data.originalAmount 原始金额
 * @param {Number} data.pointsUsed 使用的积分
 * @param {Number} data.pointsDiscount 积分抵扣金额
 * @param {Number} data.actualAmount 实际支付金额
 * @param {Number} data.earnPoints 可获得积分
 */
export const createOrderWithPoints = (data) => {
  return request.post('/order/create', data)
}

/**
 * 获取订单列表
 * @param {Object} params 查询参数
 * @param {Number} params.userId 用户ID（必需，根据API文档）
 * @param {String} params.status 订单状态（可选，query参数）：all-全部，pending-待付款，paid-待发货，shipping-待收货，completed-已完成
 * @param {Number} params.page 页码（可选）
 * @param {Number} params.pageSize 每页数量（可选）
 */
export const getOrderList = (params = {}) => {
  // 根据API文档，使用 GET /order/{user_id} 接口
  // user_id 是 path 参数，必需，必须是整数
  // status 是 query 参数，可选

  const userId = params.userId || params.user_id
  let finalUserId = null

  if (!userId) {
    // 如果没有提供userId，尝试从本地存储获取
    const userInfo = uni.getStorageSync('userInfo') || {}
    finalUserId = userInfo.id || userInfo.user_id
  } else {
    finalUserId = userId
  }

  if (!finalUserId) {
    return Promise.reject(new Error('用户ID不能为空'))
  }

  // 确保 user_id 是整数（后端要求）
  const userIdInt = parseInt(finalUserId, 10)
  if (isNaN(userIdInt)) {
    return Promise.reject(new Error('用户ID必须是有效的整数'))
  }

  // 构建query参数（排除userId相关字段）
  const queryParams = { ...params }
  delete queryParams.userId
  delete queryParams.user_id

  // 确保 page 和 pageSize 是整数（如果存在）
  if (queryParams.page !== undefined) {
    queryParams.page = parseInt(queryParams.page, 10)
  }
  if (queryParams.pageSize !== undefined) {
    queryParams.pageSize = parseInt(queryParams.pageSize, 10)
  }

  return request.get(`/order/${userIdInt}`, queryParams)
}

/**
 * 获取订单详情
 * @param {String} orderNumber 订单号（必需，根据API文档）
 */
export const getOrderDetail = (orderNumber) => {
  if (!orderNumber) {
    return Promise.reject(new Error('订单号不能为空'))
  }
  
  // 确保订单号是字符串类型并去除空格
  const orderNumberStr = String(orderNumber).trim()
  
  if (!orderNumberStr || orderNumberStr === 'undefined' || orderNumberStr === 'null') {
    return Promise.reject(new Error('订单号无效: ' + orderNumberStr))
  }
  
  console.log('[API] getOrderDetail 请求, 订单号:', orderNumberStr)
  return request.get(`/order/detail/${orderNumberStr}`)
}

/**
 * 线下订单详情（扫码 pay://OFF... 进支付页用）
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

/**
 * 线下收银统一下单（支持优惠券）
 * POST /api/offline/zhifu/tongyi?order_no=xxx&coupon_id=yyy
 * 请求体带 openid、user_id、total_fee(分)，后端需把 total_fee 传给微信统一下单
 * @param {String} order_no 订单号（必填）
 * @param {Number|null} [coupon_id] 优惠券ID（可选）
 * @param {String} [openid] 当前用户 openid（建议传）
 * @param {Number|String} [user_id] 当前用户 user_id（建议传）
 * @param {Number} [total_fee] 支付金额单位：分（必传，后端调微信统一下单需要）
 * @returns {Promise} 成功时返回支付参数（供 wx.requestPayment 使用）
 */
export const offlinePayUnified = (order_no, coupon_id = null, openid = '', user_id = null, total_fee = null) => {
  if (!order_no || !String(order_no).trim()) {
    return Promise.reject(new Error('订单号不能为空'))
  }
  const orderNoStr = encodeURIComponent(String(order_no).trim())
  let query = `order_no=${orderNoStr}`
  if (coupon_id != null && coupon_id !== '') {
    query += `&coupon_id=${encodeURIComponent(String(coupon_id))}`
  }
  const totalFeeNum = (total_fee != null && total_fee !== '' && !isNaN(Number(total_fee))) ? Math.round(Number(total_fee)) : null
  if (totalFeeNum != null && totalFeeNum > 0) {
    query += `&total_fee=${totalFeeNum}`
  }
  const url = `/api/offline/zhifu/tongyi?${query}`
  const body = {}
  if (openid && String(openid).trim()) body.openid = String(openid).trim()
  if (user_id != null && user_id !== '') body.user_id = user_id
  if (totalFeeNum != null && totalFeeNum > 0) body.total_fee = totalFeeNum
  return request.post(url, body)
}

/**
 * 创建微信 JSAPI 支付订单（主包供线下支付页使用）
 * POST /wechat-pay/create-order
 */
export const createJsapiOrder = (data) => {
  const totalFee = Math.round((Number(data.amount) || 0) * 100)
  const payload = {
    out_trade_no: data.orderNo || data.order_id || data.orderId,
    total_fee: totalFee,
    openid: data.openid,
    description: data.description || '商品支付'
  }
  if (data.coupon_id != null && data.coupon_id !== '') {
    payload.coupon_id = data.coupon_id
  }
  if (data.points_to_use != null && data.points_to_use > 0) {
    payload.points_to_use = data.points_to_use
  }
  return request.post('/wechat-pay/create-order', payload)
}

/**
 * 创建订单
 * @param {Object} data 订单数据
 * @param {Number} data.user_id 用户ID（必需）
 * @param {Number} data.address_id 地址ID（必需）
 * @param {Object} data.custom_address 自定义地址（可选）
 * @param {Boolean} data.buy_now 是否直接购买（不经过购物车），默认 false
 * @param {Array} data.buy_now_items 直接购买时的商品列表（buy_now 为 true 时必需）
 * @param {Number} [data.coupon_id] 优惠券ID（可选，使用优惠券时透传后端）
 * @param {Number} [data.pointsUsed] 使用积分数量（可选）
 * @param {Number} [data.pointsDiscount] 积分抵扣金额（可选）
 * @param {Array} data.products 商品列表（兼容旧版本，已废弃）
 * @param {Object} data.address 收货地址（兼容旧版本，已废弃）
 */
export const createOrder = (data) => {
  // 构建新的接口格式
  const requestData = {
    user_id: data.user_id,
    address_id: data.address_id,
    custom_address: data.custom_address || {},
    buy_now: data.buy_now !== undefined ? data.buy_now : false,
    delivery_way: data.delivery_way || 'platform' // 配送方式：'platform' 商家配送，'pickup' 自提
  }
  
  // 优先处理 buy_now_items（如果前端直接传递了 buy_now_items）
  if (data.buy_now_items && Array.isArray(data.buy_now_items) && data.buy_now_items.length > 0) {
    requestData.buy_now = true
    requestData.buy_now_items = data.buy_now_items.map(item => ({
      product_id: item.product_id || item.id,
      quantity: parseInt(item.quantity) || 1,
      price: item.price || item.unit_price || 0,
      specs: item.specs || item.spec || '',
      sku: item.sku || item.sku_code || ''
    }))
  }
  
  // 如果直接传递了 items 数组（兼容处理，但优先使用 buy_now_items）
  // 只有在没有 buy_now_items 的情况下才处理 items
  if (!requestData.buy_now_items && data.items && Array.isArray(data.items) && data.items.length > 0) {
    requestData.buy_now = true
    requestData.buy_now_items = data.items.map(item => ({
      product_id: item.product_id || item.id,
      quantity: parseInt(item.quantity) || 1,
      price: item.unit_price || item.price || 0,
      specs: item.specs || item.spec || '',
      sku: item.sku || item.sku_code || ''
    }))
  }
  
  // 兼容旧版本：如果有 products 且 buy_now 为 true，转换为 buy_now_items
  if (requestData.buy_now && data.products && !requestData.buy_now_items) {
    requestData.buy_now_items = data.products.map(item => ({
      product_id: item.product_id || item.id,
      quantity: parseInt(item.quantity) || 1,
      price: item.price || item.unit_price || 0,
      specs: item.specs || item.spec || '',
      sku: item.sku || item.sku_code || ''
    }))
  }
  
  // 重要：确保不传递 items 字段到后端，避免后端同时读取 items 和 buy_now_items 导致重复
  // 删除 requestData 中可能存在的 items 字段
  if (requestData.items) {
    delete requestData.items
  }
  
  // 如果同时传递了 items 和 buy_now_items，发出警告
  if (requestData.buy_now_items && data.items) {
    console.warn('[订单创建] 警告：同时传递了 items 和 buy_now_items，已删除 items 字段，仅使用 buy_now_items')
  }

  // 优惠券与积分：创建订单时透传给后端，便于核销与金额校验
  if (data.coupon_id != null && data.coupon_id !== '') {
    requestData.coupon_id = data.coupon_id
  }
  if (data.pointsUsed != null) {
    requestData.points_used = data.pointsUsed
  }
  if (data.pointsDiscount != null) {
    requestData.points_discount = data.pointsDiscount
  }

  return request.post('/order/create', requestData)
}

/**
 * 支付订单
 * @param {String} orderNumber 订单号（必需）
 * @param {String} payWay 支付方式（必需）：wechat-微信支付，alipay-支付宝，balance-余额支付
 */
/**
 * 支付订单接口（必须调用，否则无法发货）
 * @param {String} orderNumber 订单号
 * @param {String} payWay 支付方式：wechat-微信支付，alipay-支付宝，balance-余额支付
 * @param {Number} couponId 优惠券ID（可选，如果使用了优惠券）
 * @param {Number} pointsToUse 积分抵扣金额（可选，如果使用了积分抵扣）
 * @param {String} openid 用户openid（可选，微信支付时需要）
 * @returns {Promise}
 */
export const payOrder = (orderNumber, payWay, couponId = null, pointsToUse = null, openid = null) => {
  if (!orderNumber) {
    console.error('[payOrder] ❌ 订单号不能为空')
    return Promise.reject(new Error('订单号不能为空'))
  }
  if (!payWay) {
    console.error('[payOrder] ❌ 支付方式不能为空')
    return Promise.reject(new Error('支付方式不能为空'))
  }
  // 必须调用此接口，通知后端订单已支付，否则后端无法识别订单已支付，无法发货
  const requestData = {
    order_number: orderNumber,
    pay_way: payWay
  }
  
  // 如果使用了优惠券，传入优惠券ID
  if (couponId !== null && couponId !== undefined) {
    requestData.coupon_id = parseInt(couponId, 10)
  }
  
  // 如果使用了积分抵扣，传入积分抵扣金额
  if (pointsToUse !== null && pointsToUse !== undefined) {
    requestData.points_to_use = parseInt(pointsToUse, 10)
  }
  
  // 如果是微信支付且提供了openid，传递给后端
  if (payWay === 'wechat' && openid) {
    requestData.openid = openid
    console.log('[payOrder] 微信支付，传递openid:', openid.substring(0, 10) + '...')
  }
  
  return request.post('/order/pay', requestData).catch(err => {
    console.error('[payOrder] 接口调用失败:', err)
    return Promise.reject(err)
  })
}

/**
 * 取消订单
 * @param {Number} orderId 订单ID
 */
export const cancelOrder = (orderNumber) => {
  return updateOrderStatus(orderNumber, 'cancelled', '用户取消')
}

/**
 * 更新订单状态
 * @param {String} orderNumber 订单号
 * @param {String} newStatus 新状态
 * @param {String} reason 原因（可选，默认为空字符串）
 * @returns {Promise}
 */
export const updateOrderStatus = (orderNumber, newStatus, reason = '') => {
  return request.post('/order/status', {
    order_number: orderNumber,
    new_status: newStatus,
    reason: reason || ''
  }).catch(error => {
    console.error('[updateOrderStatus] 接口调用失败:', error)
    return Promise.reject(error)
  })
}

/**
 * 更新订单状态（兼容旧版本，通过订单ID）
 * @param {String|Number} orderId 订单ID
 * @param {String} status 订单状态
 * @param {String} reason 原因（可选）
 * @returns {Promise}
 * @deprecated 建议使用 updateOrderStatus(orderNumber, newStatus, reason)，直接传入订单号
 */
export const updateOrderStatusById = async (orderId, status, reason = '') => {
  // 尝试从本地存储的订单列表中查找订单号
  const storedOrders = uni.getStorageSync('orderList') || []
  const order = storedOrders.find(o => o.id == orderId || o.orderNo == orderId)

  if (order && order.orderNo) {
    return updateOrderStatus(order.orderNo, status, reason)
  }

  // 如果找不到，尝试将ID作为订单号使用
  console.warn('[更新订单状态] 未找到订单号，将使用ID作为订单号:', orderId)
  return updateOrderStatus(String(orderId), status, reason)
}

/**
 * 用户确认收货（微信组件回调后调用；后端需做二次校验：查询微信订单发货状态再更新业务订单）
 * @param {Object} payload 必填 { order_number: string, transaction_id: string }
 * @returns {Promise}
 */
export const confirmReceive = (payload) => {
  const orderNumber = payload && (payload.order_number || payload.orderNumber)
  const transactionId = payload && (payload.transaction_id || payload.transactionId)
  const orderNumberStr = String(orderNumber || '').trim()
  const transactionIdStr = String(transactionId || '').trim()
  if (!orderNumberStr || orderNumberStr === 'undefined' || orderNumberStr === 'null') {
    return Promise.reject(new Error('订单号不能为空'))
  }
  if (!transactionIdStr || transactionIdStr === 'undefined' || transactionIdStr === 'null') {
    return Promise.reject(new Error('transaction_id 不能为空'))
  }
  const body = {
    order_number: orderNumberStr,
    transaction_id: transactionIdStr
  }
  return request.post('/order/confirm-receive', body)
}

/**
 * 删除订单
 * @param {Number} orderId 订单ID
 */
export const deleteOrder = (orderId) => {
  return request.delete(`/order/${orderId}`)
}

/**
 * 获取物流信息（通过订单ID）
 * @param {Number} orderId 订单ID
 */
export const getLogistics = (orderId) => {
  return request.get(`/order/logistics/${orderId}`)
}

/**
 * 查询物流信息（通过快递单号）
 * @param {Object} data 查询参数
 * @param {String} data.tracking_number 快递单号（必需）
 * @param {String} data.company_code 物流公司代码（可选，默认"auto"自动识别）
 * @returns {Promise} 返回物流信息
 */
export const queryLogistics = (data) => {
  if (!data.tracking_number) {
    return Promise.reject(new Error('快递单号不能为空'))
  }
  
  const requestData = {
    tracking_number: data.tracking_number,
    company_code: data.company_code || 'auto'
  }
  
  return request.post('/logistics/query', requestData)
}

/**
 * 申请退款
 * @param {Number} orderId 订单ID
 * @param {String} reason 退款原因
 */
export const applyRefund = (orderId, reason) => {
  // 兼容新旧接口
  return request.post('/refund/apply', { orderId, reason }).catch(() => {
    return request.post('/order/refund/apply', { orderId, reason })
  })
}

/**
 * 审核退款
 * @param {Number} orderId 订单ID
 * @param {String} action 操作：approve-通过，reject-拒绝
 * @param {String} reason 审核原因
 */
export const auditRefund = (orderId, action, reason) => {
  return request.post('/refund/audit', { orderId, action, reason })
}

/**
 * 获取退款详情
 * @param {Number} orderId 订单ID
 */
export const getRefundDetail = (orderId) => {
  return request.get(`/order/refund/${orderId}`)
}

/**
 * 查询退款进度
 * @param {String} orderNumber 订单号
 */
export const getRefundProgress = (orderNumber) => {
  return request.get(`/refund/progress/${orderNumber}`)
}

/**
 * 获取微信小程序支持的快递公司列表（优先使用本地缓存：常用置顶 + 支持搜索）
 * 本地数据见 data/delivery-list.js；若需最新全量可调 getDeliveryListFromApi
 */
export const getDeliveryList = () => {
  const list = getDeliveryListSorted()
  return Promise.resolve({ data: list, delivery_list: list })
}

/**
 * 从接口拉取快递列表（可选，用于合并进本地或更新全量）
 * GET /merchant/wechat/delivery-list?start=0&end=2000
 */
export const getDeliveryListFromApi = (start = 0, end = 2000) => {
  const url = '/merchant/wechat/delivery-list'
  const needPostRetry = (err) => {
    if (!err) return false
    const msg = String(err.message || err.msg || err.detail || err.errorMsg || '')
    return err.statusCode === 405 || err.code === 405 ||
      /method\s*not\s*allowed|require\s*POST|POST\s*method/i.test(msg)
  }
  return request.get(url, { start, end }).catch((err) => {
    if (needPostRetry(err)) {
      return request.post(url, { start, end })
    }
    return Promise.reject(err)
  })
}

/**
 * 查询订单在微信小程序发货管理中的状态（图4）
 * GET /merchant/wechat/order-status/{order_number}
 * 状态：1待发货 2已发货 3确认收货 4交易完成 5已退款 6资金待结算
 */
export const getWechatOrderStatus = (orderNumber) => {
  if (!orderNumber) return Promise.reject(new Error('订单号不能为空'))
  return request.get(`/merchant/wechat/order-status/${encodeURIComponent(String(orderNumber))}`)
}

/**
 * 发送确认收货提醒给用户（图3），当物流显示已签收时调用，每个订单只能调用一次
 * POST /merchant/notify-confirm-receive，请求体：{ order_number: string }
 *
 * 前端当前触发时机：仅当用户打开「订单详情页」且该页请求物流接口返回「已签收」时调用。
 * 若用户从未打开详情页，该接口不会被调用。若需在用户未打开小程序时也发提醒，需后端在
 * 物流回调解到已签收时主动调本接口（或后端内部等价逻辑）。
 */
export const notifyConfirmReceive = (orderNumber) => {
  if (!orderNumber) return Promise.reject(new Error('订单号不能为空'))
  return request.post('/merchant/notify-confirm-receive', { order_number: String(orderNumber) })
}

/**
 * 设置用户点击微信发货通知消息后的跳转页面（图5），建议设置为订单详情页
 * POST /merchant/wechat/set-jump-path?path=xxx
 * @param {String} path 小程序页面路径。注意：若只传固定路径（如 subPackages/page1/pages/order/detail），
 *   用户点击通知进入详情页时没有订单号，会显示空白。后端在「发送发货通知」时应在跳转 path 上带订单号，
 *   例如：subPackages/page1/pages/order/detail?orderNo=订单号
 */
export const setWechatDeliveryJumpPath = (path) => {
  if (!path || typeof path !== 'string') return Promise.reject(new Error('path 不能为空'))
  return request.post(`/merchant/wechat/set-jump-path?path=${encodeURIComponent(path)}`)
}

/**
 * 订单发货（自动同步微信小程序发货管理）
 * 实体物流(快递)：需传 tracking_number、express_company；用户自提/虚拟商品：tracking_number 可空
 * @param {String} orderNumber 订单号
 * @param {Object} options 发货参数
 * @param {String} [options.tracking_number] 物流单号（实体快递必填，自提/虚拟可空）
 * @param {String} [options.express_company] 快递公司编码（从 getDeliveryList 列表选，如 SF/YTO/ZTO/STO/YD/EMS）
 * @param {Boolean} [options.sync_to_wechat=true] 是否同步到微信
 * @param {Number} [options.logistics_type=0] 物流类型：0=实体物流(快递)，1=自提/虚拟
 * @param {String} [options.item_desc] 商品描述
 * @returns {Promise}
 */
export const shipOrder = (orderNumber, options = {}) => {
  if (!orderNumber) {
    return Promise.reject(new Error('订单号不能为空'))
  }
  const tracking_number = options.tracking_number != null ? String(options.tracking_number).trim() : ''
  const logistics_type = options.logistics_type != null ? Number(options.logistics_type) : 0
  // 实体物流(0) 时必须填单号和快递公司
  if (logistics_type === 0 && (!tracking_number || !options.express_company)) {
    return Promise.reject(new Error('实体物流请填写物流单号并选择快递公司'))
  }
  const body = {
    order_number: String(orderNumber),
    tracking_number: tracking_number || '',
    express_company: options.express_company != null ? String(options.express_company) : '',
    sync_to_wechat: options.sync_to_wechat !== false,
    logistics_type,
    item_desc: options.item_desc != null ? String(options.item_desc) : ''
  }
  return request.post('/merchant/ship', body)
}

/**
 * 获取所有订单（平台管理员）
 * @param {Object} params 查询参数
 * @param {String} params.status 订单状态（可选）
 * @param {Number} params.page 页码（可选）
 * @param {Number} params.pageSize 每页数量（可选）
 */
export const getAllOrders = (params = {}) => {
  // 使用商家/平台专属接口查询订单
  const queryParams = {}

  if (params.status && params.status !== 'all') {
    queryParams.status = params.status
  }

  if (params.page) {
    queryParams.page = params.page
  }

  if (params.pageSize) {
    queryParams.pageSize = params.pageSize
  }

  return request.get('/merchant/orders', queryParams)
}

/**
 * 获取商家订单列表（getAllOrders 的别名，用于平台模式）
 * @param {Object} params 查询参数
 * @param {String} params.status 订单状态（可选）
 * @param {Number} params.page 页码（可选）
 * @param {Number} params.page_size 每页数量（可选）
 * @returns {Promise}
 */
export const getMerchantOrders = (params = {}) => {
  // 兼容 page_size 和 pageSize 两种参数名
  const queryParams = {}
  
  if (params.status && params.status !== 'all') {
    queryParams.status = params.status
  }
  
  if (params.page) {
    queryParams.page = params.page
  }
  
  if (params.page_size) {
    queryParams.pageSize = params.page_size
  } else if (params.pageSize) {
    queryParams.pageSize = params.pageSize
  }
  
  return request.get('/merchant/orders', queryParams)
}

/**
 * 商家模式：查询商家订单列表（图1）
 * GET /order/merchant/{merchant_id}，merchant_id 即当前用户 user_id
 * @param {Object} params 查询参数
 * @param {String} params.status 订单状态筛选（可选）
 * @param {String} params.start_date 开始日期 YYYY-MM-DD（可选）
 * @param {String} params.end_date 结束日期 YYYY-MM-DD（可选）
 * @param {Number} params.page 页码（可选，默认 1）
 * @param {Number} params.page_size 每页数量（可选，默认 20，最大 100）
 * @returns {Promise} 返回 { list, pagination, statistics }
 */
export const getShopOrders = (params = {}) => {
  const userInfo = uni.getStorageSync('userInfo') || {}
  const merchantId = userInfo.id ?? userInfo.user_id ?? userInfo.userId ?? userInfo.uid
  if (merchantId == null || merchantId === '') {
    return Promise.reject(new Error('用户未登录或 user_id 为空'))
  }
  const queryParams = {}
  if (params.status != null && params.status !== '' && params.status !== 'all') {
    queryParams.status = params.status
  }
  if (params.start_date != null && params.start_date !== '') {
    queryParams.start_date = params.start_date
  }
  if (params.end_date != null && params.end_date !== '') {
    queryParams.end_date = params.end_date
  }
  if (params.page != null) {
    queryParams.page = Number(params.page)
  }
  if (params.page_size != null) {
    queryParams.page_size = Number(params.page_size)
  } else if (params.pageSize != null) {
    queryParams.page_size = Number(params.pageSize)
  }
  return request.get(`/order/merchant/${merchantId}`, queryParams)
}

/**
 * 确认订单送达（商家端）
 * @param {String} orderNumber 订单号
 * @returns {Promise}
 */
export const completeOrder = (orderNumber) => {
  return updateOrderStatus(orderNumber, 'completed', '商家确认送达')
}

/**
 * 按时间范围导出订单（图1接口）
 * POST /order/export/by-time，请求体：{ start_time, end_time, status? }，不填 status 则导出所有状态
 * @param {Object} body 请求体
 * @param {String} body.start_time 开始时间，如 "2025-01-01 00:00:00"
 * @param {String} body.end_time 结束时间，如 "2025-01-31 23:59:59"
 * @param {String} [body.status] 可选，如 "completed"，不填则导出所有状态
 * @returns {Promise<{ data?, headers }>} data 为 ArrayBuffer（文件流）
 */
export const exportOrdersByTime = (body) => {
  if (!body || !body.start_time || !body.end_time) {
    return Promise.reject(new Error('start_time 和 end_time 不能为空'))
  }
  const url = `${config.baseURL}/order/export/by-time`
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token
    uni.request({
      url,
      method: 'POST',
      header: headers,
      data: {
        start_time: body.start_time,
        end_time: body.end_time,
        ...(body.status ? { status: body.status } : {})
      },
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode !== 200) {
          let errorMsg = '导出失败'
          try {
            const raw = res.data
            const text = typeof raw === 'string' ? raw : (raw && raw.byteLength ? new TextDecoder('utf-8').decode(new Uint8Array(raw)) : '')
            const json = text ? JSON.parse(text) : {}
            errorMsg = json.message || json.detail || errorMsg
          } catch (e) {}
          reject({ code: res.statusCode, message: errorMsg })
          return
        }
        resolve({ data: res.data, headers: res.header || {}, statusCode: res.statusCode })
      },
      fail: (err) => reject({ code: err.statusCode || 500, message: err.errMsg || '网络请求失败' })
    })
  })
}

/**
 * 导出订单详情到Excel（旧接口，按订单号列表）
 * 后端 POST /order/export 返回文件流；若后端返回 JSON 含 href/url/download_url 则带 href
 * @param {Array<String>} orderNumbers 订单号数组
 * @param {Object} options 可选 { returnLink: true } 表示希望后端返回下载链接
 * @returns {Promise<{ data?, href?, headers }>}
 */
export const exportOrders = (orderNumbers, options = {}) => {
  if (!orderNumbers || !Array.isArray(orderNumbers) || orderNumbers.length === 0) {
    return Promise.reject(new Error('订单号列表不能为空'))
  }
  if (orderNumbers.length > 100) {
    return Promise.reject(new Error('单次导出订单数不能超过100个'))
  }

  const url = `${config.baseURL}/order/export`
  const returnLink = options.returnLink === true
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    const headers = { 'Content-Type': 'application/json', 'accept': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token

    const req = {
      url,
      method: 'POST',
      header: headers,
      data: { order_numbers: orderNumbers },
      success: (res) => {
        // 在控制台输出该接口后端返回的完整信息（响应对象所有键 + 各字段详情）
        const safeData = (() => {
          const d = res.data
          if (d == null) return d
          if (typeof d === 'object' && typeof d.byteLength === 'number') {
            const buf = d
            let preview = ''
            try {
              const arr = new Uint8Array(buf, 0, Math.min(64, buf.byteLength))
              preview = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(' ')
            } catch (e) { preview = '(无法截取)' }
            return { __type: 'ArrayBuffer', byteLength: buf.byteLength, previewHex: preview }
          }
          return d
        })()
        const fullInfo = {}
        try {
          for (const k of Object.keys(res)) {
            fullInfo[k] = k === 'data' ? safeData : res[k]
          }
        } catch (e) {
          fullInfo.statusCode = res.statusCode
          fullInfo.header = res.header
          fullInfo.data = safeData
        }
        console.log('[order/export] 响应对象包含的键:', Object.keys(res))
        console.log('[order/export] 后端返回完整信息:', fullInfo)
        if (res.statusCode !== 200) {
          let errorMsg = '导出失败'
          try {
            const raw = res.data
            const text = typeof raw === 'string' ? raw : (raw && raw.byteLength ? new TextDecoder('utf-8').decode(new Uint8Array(raw)) : '')
            const json = text ? JSON.parse(text) : {}
            errorMsg = json.message || json.detail || errorMsg
          } catch (e) {}
          reject({ code: res.statusCode, message: errorMsg, detail: errorMsg })
          return
        }
        if (returnLink && res.data && typeof res.data === 'object') {
          const href = res.data.href || res.data.url || res.data.download_url ||
            (res.data.data && (res.data.data.href || res.data.data.url || res.data.data.download_url))
          if (href && typeof href === 'string') {
            resolve({ href, headers: res.header || {} })
            return
          }
        }
        resolve({ data: res.data, headers: res.header || {}, statusCode: res.statusCode })
      },
      fail: (err) => reject({ code: err.statusCode || 500, message: err.errMsg || '网络请求失败', detail: err.errMsg })
    }
    req.responseType = returnLink ? 'json' : 'arraybuffer'
    uni.request(req)
  })
}


