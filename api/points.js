/**
 * 积分相关接口
 */

import request from '@/utils/request.js'
import { getMobileByUserId } from '@/api/user.js'

/**
 * 增减积分
 * @param {Object} data 积分数据
 * @param {String} data.mobile 手机号
 * @param {String} data.type 积分类型（如"member"）
 * @param {Number} data.amount 积分数量（正数为增加，负数为减少）
 * @param {String} data.reason 原因（如"系统赠送"）
 * @returns {Promise}
 */
export const updatePoints = (data) => {
  return request.post('/points', data)
}

/**
 * 增减积分（便捷函数，自动获取手机号）
 * @param {Object} params 积分参数
 * @param {String} params.type 积分类型（如"member"）
 * @param {Number} params.amount 积分数量（正数为增加，负数为减少）
 * @param {String} params.reason 原因（如"订单消费奖励"、"订单积分抵扣"）
 * @param {String} params.mobile 手机号（可选，如果不提供则自动获取）
 * @returns {Promise}
 */
export const updatePointsWithAutoMobile = async (params) => {
  let mobile = params.mobile
  if (!mobile) {
    try {
      mobile = await getActualMobileFromBackend()
      console.log('[积分增减API] 自动获取的手机号:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
    } catch (error) {
      console.error('[积分增减API] 获取手机号失败:', error)
      // 如果获取失败，尝试使用本地存储的手机号
      const userInfo = uni.getStorageSync('userInfo') || {}
      mobile = userInfo.mobile || userInfo.phone
      if (!mobile || !/^\d{11}$/.test(mobile)) {
        return Promise.reject(new Error('无法获取用户手机号，请先登录'))
      }
    }
  }

  return updatePoints({
    mobile: mobile,
    type: params.type || 'member',
    amount: params.amount,
    reason: params.reason || '系统操作'
  })
}

/**
 * 获取当前用户 11 位手机号：优先本地 userInfo；若无再调 GET /user/mobile（后端未开放时由 catch 回落本地）。
 * @returns {Promise<String>}
 */
const getActualMobileFromBackend = async () => {
  try {
    const userInfo = uni.getStorageSync('userInfo') || {}
    const localFirst = String(userInfo.mobile || userInfo.phone || '').trim()
    if (/^\d{11}$/.test(localFirst)) {
      return localFirst
    }

    const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid

    if (!userId) {
      console.error('[积分API] 错误：缺少 user_id，无法获取实际手机号')
      throw new Error('缺少用户ID，请先登录')
    }

    const res = await getMobileByUserId(userId, 'gm2025')
    console.log('[积分API] 从后端获取手机号响应')

    // 解析返回的手机号（兼容多种响应格式）
    let mobile = null
    if (res) {
      if (res.data && typeof res.data === 'object' && res.data.mobile) {
        mobile = res.data.mobile
      } else if (res.mobile) {
        mobile = res.mobile
      } else if (res.data && typeof res.data === 'string') {
        mobile = res.data
      } else if (typeof res === 'string') {
        mobile = res
      }
    }

    if (!mobile || typeof mobile !== 'string' || !mobile.trim()) {
      console.warn('[积分API] 未能从后端获取到手机号，使用本地存储的手机号')
      const localMobile = userInfo.mobile || userInfo.phone
      if (localMobile && /^\d{11}$/.test(localMobile)) {
        return localMobile
      }
      throw new Error('无法获取用户手机号')
    }

    return mobile.trim()
  } catch (error) {
    console.error('[积分API] 获取后端手机号失败:', error)
    const userInfo = uni.getStorageSync('userInfo') || {}
    const localMobile = userInfo.mobile || userInfo.phone
    if (localMobile && /^\d{11}$/.test(localMobile)) {
      console.log('[积分API] 使用本地存储的手机号:', String(localMobile).slice(0, 3) + '****' + String(localMobile).slice(-4))
      return localMobile
    }
    throw error
  }
}

/**
 * 积分余额
 * @param {Object} params 查询参数（可选）
 * @returns {Promise} 返回解析后的积分余额数据 { member_points, merchant_points, total_points }
 */
export const getPointsBalance = async (params = {}) => {
  // 如果传入了 mobile 参数，优先使用传入的手机号；否则自动获取
  let mobile = params.mobile
  
  if (!mobile || !/^\d{11}$/.test(mobile)) {
    // 如果没有传入有效的手机号，自动获取
    try {
      mobile = await getActualMobileFromBackend()
      console.log('[积分余额API] 从后端获取的实际手机号:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
    } catch (error) {
      console.error('[积分余额API] 获取实际手机号失败:', error)
      // 如果获取失败，尝试使用本地存储的手机号
      const userInfo = uni.getStorageSync('userInfo') || {}
      mobile = userInfo.mobile || userInfo.phone
      if (mobile && /^\d{11}$/.test(mobile)) {
        console.log('[积分余额API] 使用本地存储的手机号:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
      } else {
        return Promise.reject(new Error('无法获取用户手机号，请先登录'))
      }
    }
  } else {
    console.log('[积分余额API] 使用传入的手机号:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
  }
  
  try {
    const response = await request.get('/points/balance', { ...params, mobile })

    // 解析新的响应格式: { member_points, merchant_points, withdrawable_balance }
    let memberPoints = 0
    let merchantPoints = 0

    if (response.data && typeof response.data === 'object') {
      memberPoints = Number(response.data.member_points || 0)
      merchantPoints = Number(response.data.merchant_points || 0)
    } else if (response && typeof response === 'object') {
      memberPoints = Number(response.member_points || 0)
      merchantPoints = Number(response.merchant_points || 0)
    }

    // 返回标准化的响应格式
    return {
      data: {
        member_points: memberPoints,
        merchant_points: merchantPoints,
        total_points: memberPoints + merchantPoints
      },
      raw: response
    }
  } catch (error) {
    console.error('[积分余额API] 请求失败:', error)
    return Promise.reject(error)
  }
}

/**
 * 积分流水
 * @param {Object} params 查询参数
 * @param {String} params.points_type 积分类型（可选，默认"member"）
 * @param {Number} params.page 页码（可选，默认1）
 * @param {Number} params.size 每页数量（可选，默认10）
 * @returns {Promise}
 */
export const getPointsLog = async (params = {}) => {
  // 如果传入了 mobile 参数，直接使用；否则自动获取
  let mobile = params.mobile
  
  if (!mobile || !/^\d{11}$/.test(mobile)) {
    // 获取实际手机号并添加到参数中
    try {
      mobile = await getActualMobileFromBackend()
      console.log('[积分流水API] 从后端获取的实际手机号:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
    } catch (error) {
      console.error('[积分流水API] 获取实际手机号失败:', error)
      // 如果获取失败，尝试使用本地存储的手机号
      const userInfo = uni.getStorageSync('userInfo') || {}
      mobile = userInfo.mobile || userInfo.phone
      if (mobile && /^\d{11}$/.test(mobile)) {
        console.log('[积分流水API] 使用本地存储的手机号:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
      } else {
        return Promise.reject(new Error('无法获取用户手机号，请先登录'))
      }
    }
  } else {
    console.log('[积分流水API] 使用传入的手机号:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
  }

  // 构建请求参数，使用API文档中的参数名
  const requestParams = {
    mobile: mobile,
    points_type: params.points_type || params.pointsType || 'member',
    page: params.page || 1,
    size: params.size || params.limit || 10 // 兼容旧的limit参数
  }

  // 如果传入了limit但没有size，使用limit作为size
  if (params.limit && !params.size) {
    requestParams.size = params.limit
  }

  console.log('[积分流水API] 请求参数:', requestParams)
  return request.get('/points/log', requestParams)
}

// 兼容旧版本接口
/**
 * 计算订单可使用的最大积分（兼容旧版本）
 * @param {Number} orderAmount 订单金额
 * @returns {Promise}
 */
export const calculateMaxPoints = (orderAmount) => {
  return request.post('/points/calculate-max', {
    order_amount: orderAmount
  })
}

/**
 * 使用积分抵扣订单（兼容旧版本）
 * @param {Object} data 订单数据
 * @param {Number} data.orderId 订单ID
 * @param {Number} data.pointsToUse 使用的积分数
 * @returns {Promise}
 */
export const usePointsForOrder = (data) => {
  return request.post('/points/use', {
    order_id: data.orderId,
    points: data.pointsToUse
  })
}

/**
 * 订单完成后增加积分（兼容旧版本）
 * @param {Object} data 订单数据
 * @param {Number} data.orderId 订单ID
 * @param {Number} data.actualAmount 实际支付金额
 * @returns {Promise}
 */
export const earnPointsFromOrder = (data) => {
  return request.post('/points/earn', {
    order_id: data.orderId,
    actual_amount: data.actualAmount
  })
}

/**
 * 积分回收处理（兼容旧版本）
 * @param {Object} data 回收数据
 * @param {Number} data.orderId 订单ID
 * @param {Number} data.actualPaymentAmount 实际支付金额
 * @param {Number} data.pointsUsedForDiscount 用于抵扣的积分
 * @param {String} data.type 回收类型 'purchase' | 'discount'
 * @returns {Promise}
 */
export const recyclePoints = (data) => {
  console.log('[Mock] 积分回收:', data)
  return Promise.resolve({ code: 200, message: '积分回收模拟成功' })
}

/**
 * 获取积分回收规则（兼容旧版本）
 * @returns {Promise}
 */
export const getRecycleRules = () => {
  return request.get('/points/recycle-rules')
}

/**
 * 查询用户点数汇总（累计/已用/剩余）
 * GET /points/summary
 * @param {Number} userId 用户ID（必填）
 * @returns {Promise}
 *
 * 响应示例：
 * {
 *   "unilevel_points": 0,
 *   "subsidy_points": 0,
 *   "team_reward_points": 990,
 *   "referral_points": 0,
 *   "cumulative_total": 990,
 *   "remaining_points": 0,
 *   "used_points": 990
 * }
 */
export const getPointsSummary = (userId) => {
  if (!userId && userId !== 0) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  const params = { user_id: Number(userId) }
  console.log('[积分汇总API] 调用 /points/summary，参数:', params)
  return request.get('/points/summary', params)
}