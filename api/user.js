/**
 * 用户信息相关接口
 */

import request from '@/utils/request.js'
import config from '@/utils/config.js'
import { checkIsMerchant } from '@/api/auth.js'

/**
 * 处理图片URL，如果是相对路径则拼接baseURL
 * @param {String} url 图片URL
 * @returns {String} 处理后的完整URL
 */
const processImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return url
  }
  
  const trimmedUrl = url.trim()
  
  // 如果已经是完整URL（http/https），直接返回
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl
  }
  
  // 如果是静态资源路径，直接返回
  if (trimmedUrl.startsWith('/static')) {
    return trimmedUrl
  }
  
  // 如果是base64数据，直接返回
  if (trimmedUrl.startsWith('data:')) {
    return trimmedUrl
  }
  
  // 如果是临时文件路径，直接返回
  if (trimmedUrl.startsWith('http://tmp/') || trimmedUrl.startsWith('wxfile://')) {
    return trimmedUrl
  }
  
  // 其他情况，作为相对路径处理，拼接baseURL
  const imagePath = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`
  const fullUrl = `${config.baseURL}${imagePath}`
  
  console.log('[处理图片URL]', {
    original: trimmedUrl.substring(0, 50),
    processed: fullUrl.substring(0, 100)
  })
  
  return fullUrl
}

/**
 * 修改手机号（后台修改，无需验证码）
 * @param {Number} userId 用户ID
 * @param {String} oldMobile 原手机号或 openid 等后端用以标识“原”的字符串（首次绑定可传空，内部用占位）
 * @param {String} newMobile 新手机号
 * @param {String} key 后台口令（默认：gm2025）
 * @returns {Promise}
 */
export const updateMobile = (userId, oldMobile, newMobile, key = 'gm2025') => {
  if (!userId) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  if (!newMobile || !/^\d{11}$/.test(newMobile)) {
    return Promise.reject(new Error('新手机号格式不正确'))
  }
  if (!key) {
    return Promise.reject(new Error('后台口令不能为空'))
  }

  // old_mobile 必传，且不自行填充：只有「非 11 位」才调用本接口，此时用户信息的 mobile 必有值（如 wx_xxx）
  const raw = oldMobile != null ? String(oldMobile).trim() : ''
  if (!raw) {
    return Promise.reject(new Error('old_mobile 必填，应传用户个人信息的 mobile（如 wx_xxx）'))
  }
  const url = `/user/mobile?user_id=${userId}&old_mobile=${encodeURIComponent(raw)}&new_mobile=${encodeURIComponent(newMobile)}&key=${encodeURIComponent(key)}`

  return request.put(url)
}

/**
 * 解密微信手机号（核心接口）
 * @param {Object} data
 * @param {String} data.code 微信登录 code（wx.login 的 code，用于换 session_key 解密）
 * @param {String} data.encryptedData 或 data.encrypted_data 通过 getPhoneNumber 返回的 encryptedData
 * @param {String} data.iv 通过 getPhoneNumber 返回的 iv
 * @returns {Promise<{phoneNumber?:string,mobile?:string}>}
 */
export const decryptPhone = (data) => {
  const { code, encrypted_data, encryptedData, iv } = data || {}
  const enc = encryptedData || encrypted_data
  if (!code || !enc || !iv) {
    return Promise.reject(new Error('解密手机号缺少必要参数：code、encryptedData、iv'))
  }
  // 同时传 encryptedData 与 encrypted_data，兼容不同后端命名
  return request.post('/user/decrypt-phone', {
    code,
    encryptedData: enc,
    encrypted_data: enc,
    iv
  })
}

/**
 * 手机号快速验证：用 code 换取明文手机号（微信 mp-phone-number 组件专用）
 * 请求体：{ code: string, user_id: number }
 * @param {String} code 手机号快速验证组件返回的 code（getPhoneNumber 回调 e.detail.code）
 * @param {String|Number} userId 用户 id，后端必填
 * @returns {Promise<{phone:string,message:string}>}
 */
export const getPhone = (code, userId) => {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return Promise.reject(new Error('getPhone 缺少参数：code'))
  }
  if (userId == null || userId === '') {
    return Promise.reject(new Error('getPhone 缺少参数：user_id'))
  }
  const user_id = typeof userId === 'number' ? userId : parseInt(String(userId), 10)
  if (Number.isNaN(user_id)) {
    return Promise.reject(new Error('getPhone 参数 user_id 须为数字'))
  }
  const body = { code: code.trim(), user_id }
  // 工作台日志：调用 POST /user/get-phone 的详细信息
  const codeStr = body.code || ''
  console.log('[getPhone] ========== POST /user/get-phone 调用详情 ==========')
  console.log('[getPhone] 接口: POST /user/get-phone（微信手机号快速验证 mp-phone-number）')
  console.log('[getPhone] 请求体:', JSON.stringify({ code: codeStr ? `${codeStr.substring(0, 12)}...` : '', user_id: body.user_id }))
  console.log('[getPhone] 请求体详情:', {
    code: codeStr ? `长度=${codeStr.length}, 前12字符=${codeStr.substring(0, 12)}...` : '(空)',
    user_id: body.user_id,
    user_id类型: typeof body.user_id
  })
  console.log('[getPhone] ================================================')
  return request.post('/user/get-phone', body)
}

/**
 * 获取当前用户用于调后端的 11 位手机号：优先本地 userInfo，避免 GET /user/mobile 未部署时无意义 404。
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
      console.error('[地址API] 错误：缺少 user_id，无法获取实际手机号')
      throw new Error('缺少用户ID，请先登录')
    }

    const res = await getMobileByUserId(userId, 'gm2025')
    console.log('[地址API] 从后端获取手机号响应:', res)
    
    // 解析返回的手机号（兼容多种响应格式）
    let mobile = null
    if (res) {
      // 格式1: { data: { mobile: "138..." } }
      if (res.data && typeof res.data === 'object' && res.data.mobile) {
        mobile = res.data.mobile
      }
      // 格式2: { mobile: "138..." }
      else if (res.mobile) {
        mobile = res.mobile
      }
      // 格式3: { data: "138..." } (直接返回字符串)
      else if (res.data && typeof res.data === 'string') {
        mobile = res.data
      }
      // 格式4: 直接返回字符串
      else if (typeof res === 'string') {
        mobile = res
      }
    }
    
    if (!mobile || typeof mobile !== 'string' || !mobile.trim()) {
      console.warn('[地址API] 未能从后端获取到手机号，使用本地存储的手机号')
      // 如果后端没有返回，尝试使用本地存储的有效手机号
      const localMobile = userInfo.mobile || userInfo.phone
      if (localMobile && /^\d{11}$/.test(localMobile)) {
        return localMobile
      }
      throw new Error('无法获取用户手机号')
    }
    
    return mobile.trim()
  } catch (error) {
    console.error('[地址API] 获取后端手机号失败:', error)
    // 如果获取失败，尝试使用本地存储的有效手机号
    const userInfo = uni.getStorageSync('userInfo') || {}
    const localMobile = userInfo.mobile || userInfo.phone
    if (localMobile && /^\d{11}$/.test(localMobile)) {
      console.log('[地址API] 使用本地存储的手机号:', localMobile)
      return localMobile
    }
    throw error
  }
}

/**
 * 新增地址（兼容老表结构）
 * @param {Object} data 地址信息
 * @param {String} data.mobile 手机号（可选，如果不传则从后端获取）
 * @param {String} data.label 地址标签（可选）
 * @param {String} data.name 收货人姓名
 * @param {String} data.phone 手机号（与mobile相同）
 * @param {String} data.province 省份
 * @param {String} data.city 城市
 * @param {String} data.district 区县
 * @param {String} data.detail 详细地址
 * @param {Number} data.lng 经度（可选）
 * @param {Number} data.lat 纬度（可选）
 * @param {Boolean} data.is_default 是否默认地址
 * @param {String} data.addr_type 地址类型，默认"shipping"
 * @returns {Promise}
 */
export const addAddress = async (data) => {
  // 确保必填字段存在
  // 注意：mobile 必须是当前登录用户的手机号（后端通过此字段查找用户ID）
  // phone 是收货人的手机号
  
  // 如果没有传递 mobile，从后端获取实际手机号
  let actualMobile = data.mobile
  if (!actualMobile || !/^\d{11}$/.test(actualMobile)) {
    try {
      actualMobile = await getActualMobileFromBackend()
      console.log('[地址API] 从后端获取的实际手机号:', actualMobile)
    } catch (error) {
      console.error('[地址API] 获取实际手机号失败:', error)
      return Promise.reject(new Error('无法获取用户手机号，请先登录'))
    }
  }
  
  const addressData = {
    mobile: actualMobile, // 使用后端返回的实际手机号
    name: data.name,
    phone: data.phone || actualMobile, // 收货人手机号
    province: data.province,
    city: data.city,
    district: data.district,
    detail: data.detail,
    is_default: data.is_default || data.isDefault || false,
    addr_type: data.addr_type || 'shipping'
  }
  
  // 可选字段
  if (data.label && data.label.trim()) {
    addressData.label = data.label.trim()
  }
  // 确保 lng 和 lat 是数字类型
  if (data.lng !== undefined && data.lng !== null && data.lng !== '') {
    addressData.lng = typeof data.lng === 'number' ? data.lng : parseFloat(data.lng) || 0
  }
  if (data.lat !== undefined && data.lat !== null && data.lat !== '') {
    addressData.lat = typeof data.lat === 'number' ? data.lat : parseFloat(data.lat) || 0
  }
  
  console.log('[地址API] 新增地址，提交数据:', addressData)
  
  return request.post('/address', addressData)
}

/**
 * 把已有地址设为默认
 * @param {Object} data 地址数据
 * @param {Number} data.addr_id 地址ID（必需）
 * @returns {Promise}
 */
export const setDefaultAddress = async (data) => {
  // 如果传入的是地址ID，转换为对象格式
  const requestData = typeof data === 'number' ? { addr_id: data } : data
  const addrId = requestData.addr_id || requestData.id
  
  if (!addrId) {
    return Promise.reject(new Error('缺少地址ID (addr_id)'))
  }
  
  // 获取实际手机号并添加到查询参数中
  try {
    const actualMobile = await getActualMobileFromBackend()
    console.log('[设置默认地址API] 从后端获取的实际手机号:', actualMobile)
    // 将 mobile 和 addr_id 作为查询参数发送（在URL中拼接）
    const url = `/address/default?addr_id=${addrId}&mobile=${encodeURIComponent(actualMobile)}`
    return request.put(url, {})
  } catch (error) {
    console.error('[设置默认地址API] 获取实际手机号失败:', error)
    // 如果获取失败，尝试使用本地存储的手机号
    const userInfo = uni.getStorageSync('userInfo') || {}
    const localMobile = userInfo.mobile || userInfo.phone
    if (localMobile && /^\d{11}$/.test(localMobile)) {
      console.log('[设置默认地址API] 使用本地存储的手机号:', localMobile)
      const url = `/address/default?addr_id=${addrId}&mobile=${encodeURIComponent(localMobile)}`
      return request.put(url, {})
    }
    return Promise.reject(new Error('无法获取用户手机号，请先登录'))
  }
}

/**
 * 删除地址
 * @param {Number} addrId 地址ID
 * @returns {Promise}
 */
export const deleteAddress = async (addrId) => {
  if (!addrId) {
    return Promise.reject(new Error('缺少地址ID'))
  }
  
  // 获取当前登录用户的实际手机号（从后端获取）
  try {
    const actualMobile = await getActualMobileFromBackend()
    console.log('[删除地址API] 从后端获取的实际手机号:', actualMobile)
    // 将 mobile 作为查询参数发送（在URL中拼接）
    const url = `/address/${addrId}?mobile=${encodeURIComponent(actualMobile)}`
    return request.delete(url)
  } catch (error) {
    console.error('[删除地址API] 获取实际手机号失败:', error)
    // 如果获取失败，尝试使用本地存储的手机号
    const userInfo = uni.getStorageSync('userInfo') || {}
    const localMobile = userInfo.mobile || userInfo.phone
    if (localMobile && /^\d{11}$/.test(localMobile)) {
      console.log('[删除地址API] 使用本地存储的手机号:', localMobile)
      const url = `/address/${addrId}?mobile=${encodeURIComponent(localMobile)}`
      return request.delete(url)
    }
    // 如果都没有，返回错误
    return Promise.reject(new Error('无法获取用户手机号，请先登录'))
  }
}

/**
 * 地址列表
 * @param {Number} userId 用户ID（可选，不传则获取当前用户）
 * @returns {Promise}
 */
export const getAddressList = async (userId) => {
  if (userId) {
    return request.get(`/address/${userId}`)
  }
  
  // 获取当前登录用户的实际手机号（从后端获取）
  try {
    const actualMobile = await getActualMobileFromBackend()
    console.log('[地址列表API] 从后端获取的实际手机号:', actualMobile)
    // 将 mobile 作为查询参数发送
    return request.get('/address/list', { mobile: actualMobile })
  } catch (error) {
    console.error('[地址列表API] 获取实际手机号失败:', error)
    // 如果获取失败，尝试使用本地存储的手机号
    const userInfo = uni.getStorageSync('userInfo') || {}
    const localMobile = userInfo.mobile || userInfo.phone
    if (localMobile && /^\d{11}$/.test(localMobile)) {
      console.log('[地址列表API] 使用本地存储的手机号:', localMobile)
      return request.get('/address/list', { mobile: localMobile })
    }
    // 如果都没有，返回错误
    return Promise.reject(new Error('无法获取用户手机号，请先登录'))
  }
}

/**
 * 平台账号设置退货地址（管理员接口）
 * @param {Object} data 退货地址数据
 * @param {String} data.name 收货人姓名
 * @param {String} data.phone 联系电话
 * @param {String} data.province 省份
 * @param {String} data.city 城市
 * @param {String} data.district 区县
 * @param {String} data.detail 详细地址
 * @returns {Promise}
 */
export const setReturnAddress = async (data) => {
  // 根据API文档，使用管理员接口，参数通过query传递
  const queryParams = []
  
  // 添加admin_key
  queryParams.push(`admin_key=${encodeURIComponent('admin2025')}`)
  
  // 添加地址参数
  if (data.name) queryParams.push(`name=${encodeURIComponent(data.name)}`)
  if (data.phone) queryParams.push(`phone=${encodeURIComponent(data.phone)}`)
  if (data.province) queryParams.push(`province=${encodeURIComponent(data.province)}`)
  if (data.city) queryParams.push(`city=${encodeURIComponent(data.city)}`)
  if (data.district) queryParams.push(`district=${encodeURIComponent(data.district || '')}`)
  if (data.detail) queryParams.push(`detail=${encodeURIComponent(data.detail)}`)
  
  const url = `/admin/platform-return-address?${queryParams.join('&')}`
  
  console.log('[地址API] 设置退货地址，提交数据:', data)
  // POST请求，参数在URL中（query参数），body为空
  return request.post(url, {})
}

/**
 * 查看退货地址（平台公开接口）
 * @returns {Promise}
 */
export const getReturnAddress = () => {
  return request.get('/address/platform-return')
}

// 兼容旧版本接口
/**
 * 获取用户详细信息（兼容旧版本）
 * @returns {Promise}
 */
// 注意：后端未提供 /user/profile GET 接口，已移除相关调用。
// 如需获取当前登录用户信息，请使用已存在的 `getUserInfo(mobile)` 或者通过 `getMobileByUserId(userId)` 获取手机号后再调用 `getUserInfo`。

/**
 * 更新用户基本信息（兼容旧版本）
 * @param {Object} data 用户信息
 * @returns {Promise}
 */
export const updateUserProfile = (data) => {
  return request.put('/user/profile', data)
}

/**
 * 更新收货地址（兼容旧版本）
 * @param {Number} addressId 地址ID
 * @param {Object} data 地址信息
 * @returns {Promise}
 */
export const updateAddress = async (addressId, data) => {
  // 如果没有传递 mobile，从后端获取实际手机号
  let actualMobile = data.mobile
  if (!actualMobile || !/^\d{11}$/.test(actualMobile)) {
    try {
      actualMobile = await getActualMobileFromBackend()
      console.log('[地址API] 更新地址，从后端获取的实际手机号:', actualMobile)
      // 更新data中的mobile
      data.mobile = actualMobile
    } catch (error) {
      console.error('[地址API] 获取实际手机号失败:', error)
      // 如果获取失败，继续使用原有的data，但会记录错误
    }
  }
  
  console.log('[地址API] 更新地址，提交数据:', data)
  return request.put(`/address/${addressId}`, data)
}

/**
 * 更新邮箱（兼容旧版本）
 * @param {String} email 邮箱地址
 * @returns {Promise}
 */
export const updateEmail = (email) => {
  return request.put('/user/profile', { email })
}

/**
 * 升1星（动态字段/兼容老库）
 * @param {Object} data 升级数据
 * @param {String} data.mobile 手机号（必需，作为query参数）
 * @returns {Promise}
 */
export const upgradeUser = (data) => {
  // mobile 需要作为 query 参数传递
  const { mobile } = data || {}
  if (!mobile) {
    return Promise.reject(new Error('缺少手机号参数'))
  }
  // 构建带query参数的URL
  const url = `/user/upgrade?mobile=${encodeURIComponent(mobile)}`
  return request.post(url, {})
}

/**
 * 后台调星（动态字段/兼容老库）
 * @param {Object} data 调星数据
 * @param {String} data.mobile 手机号
 * @param {Number} data.new_level 新等级
 * @param {String} data.reason 原因（如"后台手动调整"）
 * @returns {Promise}
 */
export const setLevel = (data) => {
  return request.post('/user/set-level', data)
}

/**
 * 用户详情（个人中心）
 * @param {String} mobile 手机号（可选，如果不传则从本地存储获取）
 * @returns {Promise} 返回用户信息，格式：{ uid, mobile, name, ... }
 */
export const getUserInfo = (mobile) => {
  // 如果没有传递 mobile，从本地存储获取
  if (!mobile) {
    const userInfo = uni.getStorageSync('userInfo') || {}
    mobile = userInfo.mobile || userInfo.phone
  }
  
  // 如果还是没有 mobile，返回错误（但不抛出异常，避免中断流程）
  if (!mobile) {
    console.warn('[用户信息API] 警告：缺少 mobile 参数，无法调用 user/info 接口')
    // 返回一个 rejected promise，但错误信息更友好
    return Promise.reject(new Error('缺少用户手机号，请先登录'))
  }
  
  // 传递 mobile 作为查询参数
  return request.get('/user/info', { mobile }).then(res => {
    // 根据API文档，响应格式为：{ uid, mobile, name }
    // 如果响应是直接的数据对象，直接返回；如果是包装在data中，则返回data
    let userData = null
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
      userData = res.data
    } else if (res.uid !== undefined || res.mobile !== undefined || res.name !== undefined) {
      // 如果响应本身就是用户信息对象
      userData = res
    } else {
      userData = res
    }
    
    // 处理 avatar_path：如果是字符串化的JSON数组，先解析再取第一个；如果是相对路径，拼接完整URL
    if (userData && userData.avatar_path) {
      let avatarPath = userData.avatar_path
      console.log('[用户信息API] 原始 avatar_path:', avatarPath, typeof avatarPath)
      
      // 如果是字符串，尝试解析JSON数组
      if (typeof avatarPath === 'string') {
        // 检查是否是JSON字符串数组格式（如 "[\"/pic/avatars/xxx.jpg\"]"）
        if (avatarPath.trim().startsWith('[') && avatarPath.trim().endsWith(']')) {
          try {
            const parsed = JSON.parse(avatarPath)
            if (Array.isArray(parsed) && parsed.length > 0) {
              // 取出第一个头像路径
              avatarPath = parsed[0]
              console.log('[用户信息API] 解析JSON数组后的头像路径:', avatarPath)
            }
          } catch (e) {
            console.warn('[用户信息API] avatar_path JSON解析失败，使用原始字符串:', e)
          }
        }
        
        // 如果是相对路径（不是完整URL，也不是静态资源），拼接完整URL
        if (avatarPath && typeof avatarPath === 'string' && 
            !avatarPath.startsWith('http://') && 
            !avatarPath.startsWith('https://') && 
            !avatarPath.startsWith('/static') &&
            !avatarPath.startsWith('http://tmp/') &&
            !avatarPath.startsWith('https://tmp/')) {
          // 确保路径以 / 开头
          const imagePath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`
          avatarPath = `${config.baseURL}${imagePath}`
          console.log('[用户信息API] 拼接完整URL后的头像路径:', avatarPath)
        } else {
          console.log('[用户信息API] 头像路径已经是完整URL或静态资源，无需拼接:', avatarPath)
        }
        
        userData.avatar_path = avatarPath
        userData.avatar = avatarPath
        console.log('[用户信息API] 最终设置的头像路径:', {
          avatar_path: userData.avatar_path,
          avatar: userData.avatar
        })
      } else if (Array.isArray(avatarPath)) {
        // 如果是数组，取第一个
        if (avatarPath.length > 0) {
          const firstPath = avatarPath[0]
          // 处理相对路径
          if (firstPath && typeof firstPath === 'string' && 
              !firstPath.startsWith('http://') && 
              !firstPath.startsWith('https://') && 
              !firstPath.startsWith('/static') &&
              !firstPath.startsWith('http://tmp/') &&
              !firstPath.startsWith('https://tmp/')) {
            const imagePath = firstPath.startsWith('/') ? firstPath : `/${firstPath}`
            userData.avatar_path = `${config.baseURL}${imagePath}`
          } else {
            userData.avatar_path = firstPath
          }
          userData.avatar = userData.avatar_path
          console.log('[用户信息API] 数组格式头像路径处理结果:', {
            avatar_path: userData.avatar_path,
            avatar: userData.avatar
          })
        }
      }
    } else {
      console.log('[用户信息API] 用户数据中没有 avatar_path 字段')
    }
    
    return {
      ...res,
      data: userData || res
    }
  })
}

/**
 * 分页列表+筛选
 * @param {Object} params 查询参数
 * @param {Number} params.page 页码
 * @param {Number} params.pageSize 每页数量
 * @param {String} params.keyword 关键词（可选）
 * @param {Number} params.member_level 会员等级（可选）
 * @returns {Promise}
 */
export const getUserList = (params) => {
  return request.get('/user/list', params)
}

/**
 * 绑定推荐人（支持推荐码、手机号或推荐人ID）
 * @param {Object} data 绑定数据
 * @param {String} data.mobile 当前用户手机号（可选，与 user_id 二选一）
 * @param {String|Number} data.user_id 当前用户ID（可选，与 mobile 二选一）
 * @param {String} data.referrer_code 推荐码（可选）
 * @param {String} data.referrer_mobile 推荐人手机号（可选）
 * @param {String|Number} data.referrer_id 推荐人ID（可选）
 * @returns {Promise}
 */
export const bindReferrer = (data) => {
  return request.post('/user/bind-referrer', data)
}

/**
 * 直推列表
 * @param {Object} params 查询参数
 * @param {String} params.mobile 手机号（必需）
 * @param {Number} params.page 页码，默认1
 * @param {Number} params.size 每页数量，默认10
 * @returns {Promise} 返回格式：{ rows: [], total: 0, page: 1, size: 10 }
 */
export const getReferDirect = async (params = {}) => {
  // 如果没有传递 mobile，从本地存储获取
  let mobile = params.mobile
  if (!mobile) {
    const userInfo = uni.getStorageSync('userInfo') || {}
    mobile = userInfo.mobile || userInfo.phone
  }
  
  if (!mobile) {
    return Promise.reject(new Error('缺少手机号参数'))
  }
  
  const queryParams = {
    mobile,
    page: params.page || 1,
    size: params.size || 10
  }
  
  return request.get('/user/refer-direct', queryParams).then(res => {
    // 适配响应格式：{ rows: [], total: 0, page: 1, size: 10 }
    // 如果响应是包装在 data 中，则返回 data；否则直接返回
    if (res.data && typeof res.data === 'object' && res.data.rows !== undefined) {
      return {
        ...res,
        data: res.data
      }
    } else if (res.rows !== undefined) {
      // 如果响应本身就是数据对象
      return {
        ...res,
        data: res
      }
    }
    return res
  })
}

/**
 * 团队列表（递归）
 * @param {Object} params 查询参数
 * @param {String} params.mobile 手机号（必需）
 * @param {Number} params.max_layer 最大层级，默认 6
 * @returns {Promise}
 */
export const getReferTeam = (params = {}) => {
  const { mobile, max_layer = 6 } = params
  
  if (!mobile) {
    return Promise.reject(new Error('手机号不能为空'))
  }
  
  return request.get('/user/refer-team', {
    mobile,
    max_layer
  })
}

/**
 * 根据用户ID获取手机号
 * @param {Number} userId 用户ID
 * @param {String} key 后台口令，默认为 "gm2025"
 * @returns {Promise}
 */
export const getMobileByUserId = (userId, key = 'gm2025') => {
  if (!userId) {
    console.error('[获取手机号API] 错误：缺少 user_id 参数')
    return Promise.reject(new Error('缺少用户ID'))
  }
  
  console.log('[获取手机号API] 调用接口 /user/mobile，参数:', {
    user_id: userId,
    key: key
  })
  
  return request.get('/user/mobile', {
    user_id: userId,
    key: key
  }).then(res => {
    console.log('[获取手机号API] 接口响应成功:', res)
    return res
  }).catch(error => {
    const code = error && (error.statusCode ?? error.code)
    if (code === 404) {
      console.warn('[获取手机号API] 接口不存在或未开放(404)，将依赖本地 userInfo.mobile:', error.message || '')
    } else {
      console.error('[获取手机号API] 接口调用失败:', error)
    }
    throw error
  })
}

/**
 * 获取当前联创等级
 * @param {String} mobile 手机号（必需）
 * @returns {Promise} 返回格式：{ unilevel: 0 }，等级范围：0, 1, 2, 3
 */
export const getUniLevel = (mobile) => {
  if (!mobile) {
    return Promise.reject(new Error('手机号不能为空'))
  }
  
  return request.get('/user/unilevel', { mobile }).then(res => {
    // 处理不同的响应格式
    if (res.data && typeof res.data === 'object' && res.data.unilevel !== undefined) {
      return {
        ...res,
        data: res.data
      }
    } else if (res.unilevel !== undefined) {
      // 如果响应本身就是数据对象
      return {
        ...res,
        data: res
      }
    }
    return res
  })
}

/**
 * 刷新并更新本地用户信息
 * 调用 getUserInfo 接口获取最新用户信息，并更新到本地存储
 * @returns {Promise} 返回更新后的用户信息
 */
export const refreshUserInfo = async () => {
  try {
    // 从本地存储获取用户信息/手机号
    const storedUserInfo = uni.getStorageSync('userInfo') || {}
    let mobile = storedUserInfo.mobile || storedUserInfo.phone
    let userData = null

    // 当本地没有手机号时，尝试通过 user_id 调用 getMobileByUserId 作为回退手段
    if (!mobile) {
      console.warn('[刷新用户信息] 本地缺少手机号，尝试通过 user_id 回退')
      const preservedUserId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
      if (preservedUserId && typeof getMobileByUserId === 'function') {
        try {
          const mobileRes = await getMobileByUserId(preservedUserId, 'gm2025')
          if (mobileRes) {
            if (mobileRes.data && typeof mobileRes.data === 'object' && mobileRes.data.mobile) {
              mobile = mobileRes.data.mobile
            } else if (typeof mobileRes === 'string') {
              mobile = mobileRes
            } else if (mobileRes.mobile) {
              mobile = mobileRes.mobile
            } else if (mobileRes.data && typeof mobileRes.data === 'string') {
              mobile = mobileRes.data
            }
          }
          if (mobile) console.log('[刷新用户信息] 通过 user_id 获取到手机号:', mobile)
        } catch (merr) {
          console.warn('[刷新用户信息] 通过 user_id 获取手机号失败:', merr)
        }
      }

      // 最终如果还是没有手机号，返回本地存储的信息（不再直接抛错）
      if (!mobile) {
        console.warn('[刷新用户信息] 无法获取手机号，返回本地存储的信息')
        return storedUserInfo
      }
    }

    // 若 userData 尚未从 token/profile 获取到，按原逻辑用手机号调用 getUserInfo
    if (!userData) {
      const res = await getUserInfo(mobile)
      userData = res && (res.data || res)
    }
    
    // 用户主键：必须优先采用接口返回的 uid/user_id（与 users 表一致）。
    // 旧逻辑曾「优先保留本地 ID」，若本地为过期/错误值会覆盖服务端正确 uid，导致下单外键 1452。
    const pickPositiveInt = (...vals) => {
      for (const v of vals) {
        if (v == null || v === '') continue
        const n = parseInt(String(v).trim(), 10)
        if (Number.isFinite(n) && n > 0) return n
      }
      return null
    }
    const serverUserId = pickPositiveInt(
      userData && userData.uid,
      userData && userData.user_id,
      userData && userData.id,
      userData && userData.userId
    )
    const localUserId = pickPositiveInt(
      storedUserInfo.user_id,
      storedUserInfo.id,
      storedUserInfo.userId,
      storedUserInfo.uid
    )
    const canonicalUserId = serverUserId ?? localUserId

    const preservedMobile = storedUserInfo.mobile || storedUserInfo.phone

    // 合并数据：业务字段以接口为准；id 类字段以上述 canonical 为准
    const updatedUserInfo = {
      ...userData,
      user_id: canonicalUserId ?? userData.user_id ?? userData.id ?? userData.uid,
      id: canonicalUserId ?? userData.id ?? userData.user_id ?? userData.uid,
      userId: canonicalUserId ?? userData.userId ?? userData.user_id ?? userData.id,
      uid: canonicalUserId ?? userData.uid ?? userData.user_id ?? userData.id,
      mobile: preservedMobile || userData.mobile || userData.phone,
      phone: preservedMobile || userData.mobile || userData.phone,
      // 确保头像字段被正确保存（优先使用接口返回的，如果没有则保留本地的）
      avatar_path: userData.avatar_path || userData.avatar || storedUserInfo.avatar_path || storedUserInfo.avatar,
      avatar: userData.avatar || userData.avatar_path || storedUserInfo.avatar || storedUserInfo.avatar_path,
      // 确保商户标识字段被正确保存（支持多种字段名）
      is_merchant: userData.is_merchant !== undefined ? userData.is_merchant : (userData.isMerchant !== undefined ? userData.isMerchant : storedUserInfo.is_merchant),
      isMerchant: userData.isMerchant !== undefined ? userData.isMerchant : (userData.is_merchant !== undefined ? userData.is_merchant : storedUserInfo.isMerchant),
      is_platform: userData.is_platform !== undefined ? userData.is_platform : (userData.isPlatform !== undefined ? userData.isPlatform : storedUserInfo.is_platform),
      isPlatform: userData.isPlatform !== undefined ? userData.isPlatform : (userData.is_platform !== undefined ? userData.is_platform : storedUserInfo.isPlatform)
    }
    
    // 在写入本地存储前，若未标记为商户则尝试通过手机号或 user_id 调用专用接口确认
    try {
      let mobileForCheck = updatedUserInfo.mobile || updatedUserInfo.phone || storedUserInfo.mobile || storedUserInfo.phone
      if (!mobileForCheck) {
        const preservedUserId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
        if (preservedUserId && typeof getMobileByUserId === 'function') {
          try {
            const mobileRes = await getMobileByUserId(preservedUserId, 'gm2025')
            if (mobileRes) {
              if (mobileRes.data && typeof mobileRes.data === 'object' && mobileRes.data.mobile) {
                mobileForCheck = mobileRes.data.mobile
              } else if (typeof mobileRes === 'string') {
                mobileForCheck = mobileRes
              } else if (mobileRes.mobile) {
                mobileForCheck = mobileRes.mobile
              } else if (mobileRes.data && typeof mobileRes.data === 'string') {
                mobileForCheck = mobileRes.data
              }
            }
          } catch (merr) {
            console.warn('[刷新用户信息] 通过 user_id 获取手机号失败:', merr)
          }
        }
      }

      if (mobileForCheck && !updatedUserInfo.is_merchant) {
        const remoteFlag = await checkIsMerchant(mobileForCheck)
        if (remoteFlag) {
          updatedUserInfo.is_merchant = true
          updatedUserInfo.isMerchant = true
          updatedUserInfo.is_platform = true
          updatedUserInfo.isPlatform = true
          console.log('[刷新用户信息] checkIsMerchant 确认为商户:', mobileForCheck)
        } else {
          console.log('[刷新用户信息] checkIsMerchant 未确认为商户:', mobileForCheck)
        }
      }
    } catch (e) {
      console.warn('[刷新用户信息] checkIsMerchant 调用失败:', e)
    }

    // 更新本地存储
    uni.setStorageSync('userInfo', updatedUserInfo)
    
    console.log('[刷新用户信息] ✅ 用户信息已更新到本地存储', {
      name: updatedUserInfo.name,
      member_level: updatedUserInfo.member_level,
      avatar_path: updatedUserInfo.avatar_path,
      avatar: updatedUserInfo.avatar,
      user_id: updatedUserInfo.user_id || updatedUserInfo.id,
      mobile: updatedUserInfo.mobile || updatedUserInfo.phone,
      is_merchant: updatedUserInfo.is_merchant,
      isMerchant: updatedUserInfo.isMerchant,
      is_platform: updatedUserInfo.is_platform,
      isPlatform: updatedUserInfo.isPlatform
    })
    
    // 验证本地存储是否真的保存了
    const verifyStorage = uni.getStorageSync('userInfo') || {}
    console.log('[刷新用户信息] 验证本地存储:', {
      avatar_path: verifyStorage.avatar_path,
      avatar: verifyStorage.avatar
    })
    
    return updatedUserInfo
  } catch (error) {
    console.error('[刷新用户信息] ❌ 刷新用户信息失败:', error)
    // 即使失败也返回本地存储的信息
    const storedUserInfo = uni.getStorageSync('userInfo') || {}
    return storedUserInfo
  }
}


/**
 * 获取用户的推荐二维码（微信小程序码）
 * 如果已生成直接返回URL，如果未生成则调用微信接口生成
 * @param {Number} userId 用户ID
 * @returns {Promise<String>} 返回二维码图片URL
 */
export const getReferralQR = async (userId) => {
  if (!userId) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  
  try {
    console.log('[获取推荐二维码] 请求参数:', { userId })
    const res = await request.get(`/user/referral-qr?user_id=${userId}`)
    console.log('[获取推荐二维码] API响应:', res)
    
    // 解析返回的URL（兼容多种响应格式）
    let qrUrl = null
    if (res) {
      if (typeof res === 'string') {
        qrUrl = res
      } else if (res.data) {
        qrUrl = res.data.url || res.data.qr_url || res.data.qrcode_url || res.data
      } else if (res.url) {
        qrUrl = res.url
      } else if (res.qr_url) {
        qrUrl = res.qr_url
      } else if (res.qrcode_url) {
        qrUrl = res.qrcode_url
      }
    }
    
    if (!qrUrl) {
      console.error('[获取推荐二维码] 响应中未找到URL，完整响应:', JSON.stringify(res, null, 2))
      throw new Error('未能获取到二维码URL，请检查后端接口返回格式')
    }
    
    // 验证 URL 基本格式（只检查是否为非空字符串）
    if (typeof qrUrl !== 'string' || qrUrl.trim() === '') {
      console.error('[获取推荐二维码] URL格式无效:', qrUrl)
      throw new Error('获取到的二维码URL格式无效')
    }
    
    // 处理URL路径（如果是相对路径，拼接baseURL）
    const processedUrl = processImageUrl(qrUrl)
    
    // 记录URL信息（用于调试）
    console.log('[获取推荐二维码] URL信息:', {
      original: qrUrl.substring(0, 100),
      processed: processedUrl.substring(0, 100),
      type: typeof qrUrl,
      length: qrUrl.length,
      isFullUrl: processedUrl.startsWith('http://') || processedUrl.startsWith('https://')
    })
    
    console.log('[获取推荐二维码] 解析成功，最终URL:', processedUrl.substring(0, 150))
    return processedUrl
  } catch (error) {
    console.error('[获取推荐二维码] 失败:', error)
    console.error('[获取推荐二维码] 错误详情:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      detail: error.detail
    })
    throw error
  }
}

/**
 * 根据用户ID获取推荐码（用于扫码支付绑定）
 * @param {String|Number} userId 推荐人用户ID
 * @returns {Promise<String>} 推荐码
 */
export const getReferralCodeByUserId = async (userId) => {
  if (userId == null || userId === '') {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  const uid = typeof userId === 'number' ? userId : String(userId).trim()
  const res = await request.get('/user/referral-code', { user_id: uid })
  const data = res && (res.data != null ? res.data : res)
  const code = data?.referral_code ?? data?.referralCode ?? data?.code ?? data?.invite_code ?? data?.inviteCode ?? (typeof data === 'string' ? data : '')
  const s = typeof code === 'string' ? code.trim() : String(code || '').trim()
  if (!s) throw new Error('未获取到推荐码')
  return s
}

/**
 * 刷新用户的推荐二维码（强制重新生成）
 * @param {Number} userId 用户ID
 * @returns {Promise<String>} 返回新的二维码图片URL
 */
export const refreshReferralQR = async (userId) => {
  if (!userId) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  
  try {
    console.log('[刷新推荐二维码] 请求参数:', { userId })
    const res = await request.post(`/user/refresh-referral-qr?user_id=${userId}`)
    console.log('[刷新推荐二维码] API响应:', res)
    
    // 解析返回的URL（兼容多种响应格式）
    let qrUrl = null
    if (res) {
      if (typeof res === 'string') {
        qrUrl = res
      } else if (res.data) {
        qrUrl = res.data.url || res.data.qr_url || res.data.qrcode_url || res.data
      } else if (res.url) {
        qrUrl = res.url
      } else if (res.qr_url) {
        qrUrl = res.qr_url
      } else if (res.qrcode_url) {
        qrUrl = res.qrcode_url
      }
    }
    
    if (!qrUrl) {
      console.error('[刷新推荐二维码] 响应中未找到URL，完整响应:', JSON.stringify(res, null, 2))
      throw new Error('未能获取到二维码URL，请检查后端接口返回格式')
    }
    
    // 验证 URL 基本格式（只检查是否为非空字符串）
    if (typeof qrUrl !== 'string' || qrUrl.trim() === '') {
      console.error('[刷新推荐二维码] URL格式无效:', qrUrl)
      throw new Error('获取到的二维码URL格式无效')
    }
    
    // 处理URL路径（如果是相对路径，拼接baseURL）
    const processedUrl = processImageUrl(qrUrl)
    
    // 记录URL信息（用于调试）
    console.log('[刷新推荐二维码] URL信息:', {
      original: qrUrl.substring(0, 100),
      processed: processedUrl.substring(0, 100),
      type: typeof qrUrl,
      length: qrUrl.length,
      isFullUrl: processedUrl.startsWith('http://') || processedUrl.startsWith('https://')
    })
    
    console.log('[刷新推荐二维码] 解析成功，最终URL:', processedUrl.substring(0, 150))
    return processedUrl
  } catch (error) {
    console.error('[刷新推荐二维码] 失败:', error)
    console.error('[刷新推荐二维码] 错误详情:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      detail: error.detail
    })
    throw error
  }
}