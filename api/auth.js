/**
 * 登录认证相关接口
 * 基于 ChronoTrace API 文档
 */

import request from '@/utils/request.js'
import config from '@/utils/config.js'

/**
 * 微信一键登录
 * @param {Object} data 登录数据
 * @param {String} data.code 微信小程序登录凭证
 * @param {String} data.nickName 用户昵称
 * @returns {Promise}
 */
export const wechatLogin = async (data) => {
  // 优先使用 /user/wechat-login（与 API 列表一致），若返回 404 则尝试常见替代路径
  // 包含后端实际使用的路径 `/wechat/login`，并保留历史兼容路径
  const candidates = ['/wechat/login', '/user/wechat-login', '/auth/wechat-login', '/api/user/wechat-login']
  let lastError = null
  for (const path of candidates) {
    try {
      const res = await request.post(path, data)
      if (path !== candidates[0]) {
        console.warn('[wechatLogin] 使用回退路径登录:', path)
      }
      return res
    } catch (err) {
      lastError = err
      // 如果是 404，继续尝试下一个候选路径；否则直接抛出错误
      if (!(err && (err.statusCode === 404 || err.code === 404))) {
        throw err
      }
    }
  }

  // 所有候选路径均失败，抛出最后一个错误
  throw lastError
}

/**
 * 一键登录（不存在则自动注册）
 * @param {Object} data 登录数据
 * @returns {Promise}
 */
export const auth = (data) => {
  return request.post('/user/auth', data)
}

/**
 * 修改资料（昵称/头像/手机号/密码）
 * @param {Object} data 用户信息
 * @param {String} data.mobile 手机号（必需，用于标识用户）
 * @param {String} data.name 昵称（可选）
 * @param {String} data.avatar_path 头像路径（可选）
 * @param {String} data.old_password 旧密码（修改密码时必需）
 * @param {String} data.new_password 新密码（修改密码时必需）
 * @returns {Promise}
 */
export const updateProfile = (data) => {
  return request.post('/user/update-profile', data)
}

/**
 * 修改昵称
 * @param {String} name 新昵称
 * @param {String} mobile 手机号（可选，如果不传则从本地存储获取）
 * @returns {Promise}
 */
export const updateUserName = async (name, mobile = null) => {
  const userInfo = uni.getStorageSync('userInfo') || {}
  const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
  
  // 优先使用传入的mobile，否则从本地存储获取（update-profile 用登录手机号确认身份）
  if (!mobile) {
    mobile = userInfo.mobile
  }
  
  // 优先使用mobile（不验证格式），如果没有则使用user_id
  if (mobile && mobile.trim()) {
    return updateProfile({
      mobile: mobile,
      name: name
    })
  } else if (userId) {
    // 如果没有mobile，使用user_id更新
    return updateProfile({
      user_id: userId,
      name: name
    })
  } else {
    return Promise.reject(new Error('缺少用户信息，请先登录'))
  }
}

/**
 * 压缩图片（递归压缩直到满足大小要求）
 * 注意：完全使用 uniapp 提供的 uni.compressImage API，不使用浏览器 API（如 Canvas、FileReader 等）
 * @param {String} filePath 图片路径
 * @param {Number} maxSizeMB 最大文件大小（MB）
 * @param {Number} quality 初始压缩质量（0-100）
 * @param {Number} attempt 当前尝试次数
 * @returns {Promise<String>} 返回压缩后的图片路径
 */
const compressImage = (filePath, maxSizeMB = 0.7, quality = 80, attempt = 1) => {
  return new Promise((resolve, reject) => {
    const maxAttempts = 10 // 最多尝试10次压缩
    
    // 对于 http://tmp/ 等临时路径，直接进行压缩
    const isTempPath = filePath.startsWith('http://tmp/') || 
                      filePath.startsWith('wxfile://') || 
                      filePath.startsWith('file://') ||
                      filePath.startsWith('blob:')
    
    if (isTempPath || attempt === 1) {
      // 根据尝试次数调整压缩质量（逐步降低质量）
      let compressQuality = quality
      if (attempt > 1) {
        // 更激进的压缩策略：每次降低更多质量
        compressQuality = Math.max(10, quality - (attempt - 1) * 15) // 每次降低15%，最低10%
      }
      
      uni.compressImage({
        src: filePath,
        quality: compressQuality,
        success: (compressRes) => {
          if (compressRes.tempFilePath) {
            // 检查是否支持 getFileSystemManager（H5、某些Android环境不支持）
            try {
              if (uni.getFileSystemManager && typeof uni.getFileSystemManager === 'function') {
            const fs = uni.getFileSystemManager()
            fs.getFileInfo({
              filePath: compressRes.tempFilePath,
              success: (fileInfo) => {
                const compressedSizeMB = fileInfo.size / 1024 / 1024
                
                // 如果文件大小满足要求，或者已达到最大尝试次数，返回结果
                if (compressedSizeMB <= maxSizeMB || attempt >= maxAttempts) {
                  resolve(compressRes.tempFilePath)
                } else {
                  // 继续递归压缩
                  compressImage(compressRes.tempFilePath, maxSizeMB, compressQuality, attempt + 1)
                    .then(resolve)
                    .catch(reject)
                }
              },
              fail: (err) => {
                console.warn(`[头像上传] 无法获取压缩后文件信息:`, err)
                    // 获取文件信息失败，如果还有尝试次数，继续压缩
                    if (attempt < maxAttempts && compressQuality > 30) {
                      compressImage(compressRes.tempFilePath, maxSizeMB, compressQuality - 20, attempt + 1)
                        .then(resolve)
                        .catch(() => resolve(compressRes.tempFilePath))
                    } else {
                      resolve(compressRes.tempFilePath)
                    }
                  }
                })
              } else {
                // 不支持 getFileSystemManager 的平台（如 H5），直接使用压缩后的文件
                console.log(`[头像上传] ✅ 压缩成功（无法获取文件大小，平台不支持getFileSystemManager）`)
                if (attempt < maxAttempts && compressQuality > 30) {
                  // 继续压缩以确保满足大小要求
                  compressImage(compressRes.tempFilePath, maxSizeMB, compressQuality - 20, attempt + 1)
                    .then(resolve)
                    .catch(() => resolve(compressRes.tempFilePath))
                } else {
                resolve(compressRes.tempFilePath)
              }
              }
            } catch (err) {
              console.error(`[头像上传] 处理压缩结果时出错:`, err)
              // 出错时直接使用压缩后的文件
              resolve(compressRes.tempFilePath || filePath)
            }
          } else {
            resolve(filePath)
          }
        },
        fail: (err) => {
          console.error(`[头像上传] 压缩失败:`, err)
          // 压缩失败，使用原文件
          resolve(filePath)
        }
      })
    } else {
      // 对于非临时路径，先检查是否支持 getFileSystemManager
      if (uni.getFileSystemManager && typeof uni.getFileSystemManager === 'function') {
      const fs = uni.getFileSystemManager()
      fs.getFileInfo({
        filePath: filePath,
        success: (fileInfo) => {
          const fileSizeMB = fileInfo.size / 1024 / 1024
          
          // 如果文件已经小于目标大小，直接返回
          if (fileSizeMB <= maxSizeMB) {
            resolve(filePath)
            return
          }
          
          // 需要压缩
          let compressQuality = quality
          if (attempt > 1) {
            compressQuality = Math.max(10, quality - (attempt - 1) * 15)
          }
          
          uni.compressImage({
            src: filePath,
            quality: compressQuality,
            success: (compressRes) => {
              if (compressRes.tempFilePath) {
                fs.getFileInfo({
                  filePath: compressRes.tempFilePath,
                  success: (compressedInfo) => {
                    const compressedSizeMB = compressedInfo.size / 1024 / 1024
                    
                    if (compressedSizeMB <= maxSizeMB || attempt >= maxAttempts) {
                      resolve(compressRes.tempFilePath)
                    } else {
                      compressImage(compressRes.tempFilePath, maxSizeMB, compressQuality, attempt + 1)
                        .then(resolve)
                        .catch(reject)
                    }
                  },
                  fail: () => resolve(compressRes.tempFilePath)
                })
              } else {
                resolve(filePath)
              }
            },
            fail: () => resolve(filePath)
          })
        },
        fail: () => {
          // 获取文件信息失败，直接尝试压缩
          uni.compressImage({
            src: filePath,
            quality: quality,
            success: (compressRes) => resolve(compressRes.tempFilePath || filePath),
            fail: () => resolve(filePath)
          })
        }
      })
      } else {
        // 不支持 getFileSystemManager 的平台，直接压缩
        console.log(`[头像上传] 平台不支持getFileSystemManager，直接压缩（第${attempt}次）...`)
        let compressQuality = quality
        if (attempt > 1) {
          compressQuality = Math.max(10, quality - (attempt - 1) * 15)
        }
        
        uni.compressImage({
          src: filePath,
          quality: compressQuality,
          success: (compressRes) => {
            if (compressRes.tempFilePath) {
              console.log(`[头像上传] ✅ 压缩成功（无法获取文件大小，平台不支持getFileSystemManager）`)
              if (attempt < maxAttempts && compressQuality > 30) {
                compressImage(compressRes.tempFilePath, maxSizeMB, compressQuality - 20, attempt + 1)
                  .then(resolve)
                  .catch(() => resolve(compressRes.tempFilePath))
              } else {
                resolve(compressRes.tempFilePath)
              }
            } else {
              resolve(filePath)
            }
          },
          fail: (err) => {
            console.warn(`[头像上传] 压缩失败（第${attempt}次）:`, err)
            if (attempt < maxAttempts) {
              const lowerQuality = Math.max(10, compressQuality - 20)
              compressImage(filePath, maxSizeMB, lowerQuality, attempt + 1)
                .then(resolve)
                .catch(() => resolve(filePath))
            } else {
              resolve(filePath)
            }
          }
        })
      }
    }
  })
}

/**
 * 上传头像（新接口）
 * @param {String|Array} avatarFiles 头像文件路径（单个路径字符串或路径数组，1-3张）
 * @param {Number} userId 用户ID（可选，如果不传则从本地存储获取）
 * @returns {Promise} 返回上传后的头像URL数组
 */
export const uploadUserAvatar = async (avatarFiles, userId = null) => {
  // 获取用户ID
  if (!userId) {
    const userInfo = uni.getStorageSync('userInfo') || {}
    userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
    if (!userId) {
      return Promise.reject(new Error('缺少用户ID，请先登录'))
    }
  }
  
  // 确保 avatarFiles 是数组
  const files = Array.isArray(avatarFiles) ? avatarFiles : [avatarFiles]
  
  // 验证文件数量（1-3张）
  if (files.length === 0 || files.length > 3) {
    return Promise.reject(new Error('头像数量必须在1-3张之间'))
  }
  
  // 获取 baseURL 和 token
  const baseURL = config.baseURL
  const token = uni.getStorageSync('token') || ''
  
  // 构建上传URL
  const uploadUrl = `${baseURL}/user/${userId}/avatar`
  
  // 步骤1: 压缩所有图片（并发压缩，压缩到700KB以内）
  const compressedFiles = await Promise.all(
    files.map(async (filePath) => {
      const compressedPath = await compressImage(filePath, 0.7, 80, 1)
      return compressedPath
    })
  )
  
  // 步骤2: 上传压缩后的文件
  return new Promise((resolve, reject) => {
    // 由于 uni.uploadFile 一次只能上传一个文件，我们需要依次上传
    const uploadPromises = compressedFiles.map((filePath, index) => {
      return new Promise((resolveUpload, rejectUpload) => {
        uni.uploadFile({
          url: uploadUrl,
          filePath: filePath,
          name: 'avatar_files',
          header: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/json'
          },
          success: (res) => {
            try {
              const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
              resolveUpload(data)
            } catch (e) {
              console.error('[头像上传] 解析上传响应失败:', e, '原始响应:', res.data)
              rejectUpload(new Error('解析响应失败: ' + e.message))
            }
          },
          fail: (err) => {
            console.error(`[头像上传] 第 ${index + 1} 张图片上传失败:`, err)
            rejectUpload(err)
          }
        })
      })
    })
    
    // 等待所有文件上传完成
    Promise.all(uploadPromises)
      .then((results) => {
        // 从最后一个结果中提取URL数组
        const lastResult = results[results.length - 1]
        let urls = []
        
        if (Array.isArray(lastResult)) {
          urls = lastResult
        } else if (lastResult && typeof lastResult === 'object') {
          // 优先处理 avatar_urls 字段（接口返回格式：{"avatar_urls": [...], "uploaded_at": "..."}）
          if (Array.isArray(lastResult.avatar_urls) && lastResult.avatar_urls.length > 0) {
            urls = lastResult.avatar_urls
          } else if (Array.isArray(lastResult.data)) {
            urls = lastResult.data
          } else if (lastResult.urls && Array.isArray(lastResult.urls)) {
            urls = lastResult.urls
          } else if (lastResult.url) {
            urls = [lastResult.url]
          } else if (lastResult.data && Array.isArray(lastResult.data)) {
            urls = lastResult.data
          }
        } else if (typeof lastResult === 'string') {
          urls = [lastResult]
        }
        
        // 如果提取到了URL数组，返回数组；否则返回原始结果
        resolve(urls.length > 0 ? urls : results)
      })
      .catch(reject)
  })
}

/**
 * 修改头像（上传头像，上传后自动更新到用户信息，无需再调用更新接口）
 * @param {String} avatarPath 头像文件路径（临时路径）
 * @param {String} mobile 手机号（可选，如果不传则从本地存储获取）
 * @returns {Promise} 返回上传结果
 */
export const updateUserAvatar = async (avatarPath, mobile = null) => {
  // 获取用户信息
  const userInfo = uni.getStorageSync('userInfo') || {}
  const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
  
  if (!userId) {
    return Promise.reject(new Error('缺少用户ID，请先登录'))
  }
  
  // 不再强制要求手机号，因为上传头像只需要user_id
  try {
    // 上传头像到服务器（上传后会自动更新用户信息，无需再调用更新接口）
    const uploadResult = await uploadUserAvatar(avatarPath, userId)
    
    console.log('[头像更新] ✅ 头像上传成功，服务器已自动更新用户信息')
    
    return {
      success: true,
      uploadResult: uploadResult
    }
  } catch (error) {
    console.error('[头像更新] 上传失败:', error)
    throw error
  }
}

/**
 * 修改手机号
 * @param {String} newMobile 新手机号
 * @param {String} oldMobile 旧手机号（可选，如果不传则从本地存储获取）
 * @returns {Promise}
 */
export const updateUserMobile = async (newMobile, oldMobile = null) => {
  if (!oldMobile) {
    const userInfo = uni.getStorageSync('userInfo') || {}
    oldMobile = userInfo.mobile || userInfo.phone
    if (!oldMobile) {
      return Promise.reject(new Error('缺少旧手机号，请先登录'))
    }
  }
  
  if (!/^\d{11}$/.test(newMobile)) {
    return Promise.reject(new Error('手机号格式不正确'))
  }
  
  return updateProfile({
    mobile: newMobile
  })
}

/**
 * 修改密码
 * @param {String} oldPassword 旧密码
 * @param {String} newPassword 新密码
 * @param {String} mobile 手机号（可选，如果不传则从本地存储获取）
 * @returns {Promise}
 */
export const updateUserPassword = async (oldPassword, newPassword, mobile = null) => {
  if (!mobile) {
    const userInfo = uni.getStorageSync('userInfo') || {}
    mobile = userInfo.mobile
    // 资料接口以 Bearer 身份为准，缺少本地 mobile 时仍可安全改密。
  }
  
  if (!oldPassword || !newPassword) {
    return Promise.reject(new Error('旧密码和新密码不能为空'))
  }
  
  return updateProfile({
    mobile: mobile,
    old_password: oldPassword,
    new_password: newPassword
  })
}

/**
 * 设置密码（新用户首次设置）
 * @param {Object} data 密码数据
 * @param {String} data.password 密码
 * @returns {Promise}
 */
export const setPassword = (data) => {
  return request.post('/user/set-password', data)
}

/**
 * 后台冻结用户
 * @param {Object} data 冻结数据
 * @returns {Promise}
 */
export const freeze = (data) => {
  return request.put('/user/freeze', data)
}

/**
 * 后台解冻用户
 * @param {Object} data 解冻数据
 * @returns {Promise}
 */
export const unfreeze = (data) => {
  return request.put('/user/unfreeze', data)
}

/**
 * 找回密码（手机号验证）
 * @param {Object} data 重置密码数据
 * @param {String} data.mobile 手机号
 * @param {String} data.password 新密码
 * @param {String} data.reason 原因（可选，如"用户自助注销"）
 * @returns {Promise}
 */
export const resetPasswordByPhone = (data) => {
  // 兼容新旧接口
  return request.post('/user/reset-password', data).catch(() => {
    return request.post('/auth/reset-password-by-phone', data)
  })
}

/**
 * 找回密码（昵称验证）
 * @param {Object} data 重置密码数据
 * @param {String} data.nickname 昵称
 * @param {String} data.newPassword 新密码
 * @param {String} data.verifyQuestion 验证问题答案
 * @returns {Promise}
 */
export const resetPasswordByNickname = (data) => {
  return request.post('/auth/reset-password-by-nickname', data)
}

/**
 * 后台重置用户密码
 * @param {Object} data 重置数据
 * @returns {Promise}
 */
export const adminResetPwd = (data) => {
  return request.put('/admin/user/reset-pwd', data)
}

/**
 * 升1星
 * @returns {Promise}
 */
export const upgrade = () => {
  return request.post('/user/upgrade')
}

/**
 * 用户自助注销账号
 * @param {Object} data 注销数据
 * @param {String} data.mobile 手机号
 * @param {String} data.password 密码
 * @param {String} data.reason 注销原因，默认为"用户自助注销"
 * @returns {Promise}
 */
export const selfDelete = async (data) => {
  const deleteData = {
    mobile: data.mobile,
    password: data.password,
    reason: data.reason || '用户自助注销'
  }
  return request.post('/user/self-delete', deleteData)
}

/**
 * 后台调星
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
 * 冻结/注销/恢复正常
 * @param {Object} data 状态数据
 * @returns {Promise}
 */
export const setStatus = (data) => {
  return request.post('/user/set-status', data)
}

/**
 * 后台设置联创星级（管理员接口，鉴权依赖 Bearer Token）
 * @param {Object} data 设置数据
 * @param {Number} data.user_id 用户ID
 * @param {Number} data.level 联创星级等级
 * @returns {Promise}
 */
export const setUnilevel = (data) => {
  const { user_id, level } = data
  if (!user_id) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  if (level === undefined || level === null) {
    return Promise.reject(new Error('联创星级等级不能为空'))
  }

  return request.post('/admin/unilevel/set', {
    user_id,
    level
  })
}

/**
 * 用户详情（个人中心）
 * @param {String} mobile 手机号（可选，如果不传则从本地存储获取）
 * @returns {Promise}
 */
export const getUserInfo = (mobile) => {
  // 如果没有传递 mobile，从本地存储获取（只用登录手机号 mobile）
  if (!mobile) {
    const userInfo = uni.getStorageSync('userInfo') || {}
    mobile = userInfo.mobile
  }
  
  // 如果还是没有 mobile，返回错误
  if (!mobile) {
    console.error('[用户信息API] 错误：缺少登录手机号，无法调用 user/info 接口')
    return Promise.reject(new Error('缺少登录手机号，请重新登录'))
  }
  
  // 传递 mobile 作为查询参数
  return request.get('/user/info', { mobile })
}

/**
 * 分页列表+筛选
 * @param {Object} params 查询参数
 * @returns {Promise}
 */
export const getUserList = (params) => {
  return request.get('/user/list', params)
}

/**
 * 绑定推荐人
 * @param {Object} data 绑定数据
 * @returns {Promise}
 */
export const bindReferrer = (data) => {
  return request.post('/user/bind-referrer', data)
}

/**
 * 直推列表
 * @returns {Promise}
 */
export const getReferDirect = () => {
  return request.get('/user/refer-direct')
}

/**
 * 团队列表（递归）
 * @returns {Promise}
 */
export const getReferTeam = () => {
  return request.get('/user/refer-team')
}

/**
 * 后台赋予平台账号权限
 * @param {Object} data 赋予数据
 * @returns {Promise}
 */
export const grantPlatformAccount = (data) => {
  // 兼容新旧接口
  return request.post('/user/grant-merchant', data).catch(() => {
    return request.post('/user/grant-platform-account', data)
  })
}

/**
 * 后台赋予商户身份（管理员接口，鉴权依赖 Bearer Token）
 * @param {String} mobile 手机号或商户号
 * @returns {Promise}
 */
export const grantMerchant = (mobile) => {
  const url = `/user/grant-merchant?mobile=${encodeURIComponent(mobile)}`
  return request.post(url, {})
}

/**
 * 查询是否为平台账号
 * @returns {Promise}
 */
export const getIsPlatformAccount = () => {
  // 兼容新旧接口
  return request.get('/user/is-merchant').catch(() => {
    return request.get('/user/is-platform-account')
  })
}

/**
 * 查询是否商户（通过手机号）
 * @param {String} mobile 手机号
 * @returns {Promise<Boolean>} 返回 true 表示是商户，false 表示不是
 */
export const checkIsMerchant = async (mobile) => {
  if (!mobile) {
    return false
  }
  try {
    const res = await request.get('/user/is-merchant', { mobile })
    console.log('[查询是否商户] API响应:', res)
    console.log('[查询是否商户] 响应类型:', typeof res, 'res.data:', res.data)
    
    // 解析响应，支持多种格式
    // 1. 如果 res.data 是对象，优先检查 res.data 中的字段
    if (res.data && typeof res.data === 'object') {
      if (res.data.is_merchant !== undefined) {
        const result = Boolean(res.data.is_merchant)
        console.log('[查询是否商户] 从 res.data.is_merchant 解析:', result)
        return result
      } else if (res.data['is merchant'] !== undefined) {
        const result = Boolean(res.data['is merchant'])
        console.log('[查询是否商户] 从 res.data["is merchant"] 解析:', result)
        return result
      } else if (res.data.isMerchant !== undefined) {
        const result = Boolean(res.data.isMerchant)
        console.log('[查询是否商户] 从 res.data.isMerchant 解析:', result)
        return result
      }
    }
    
    // 2. 如果 res.data 是布尔值
    if (typeof res.data === 'boolean') {
      console.log('[查询是否商户] 从 res.data (boolean) 解析:', res.data)
      return res.data
    }
    
    // 3. 如果 res 本身是布尔值
    if (typeof res === 'boolean') {
      console.log('[查询是否商户] 从 res (boolean) 解析:', res)
      return res
    }
    
    // 4. 直接检查 res 对象的字段
    if (res.is_merchant !== undefined) {
      const result = Boolean(res.is_merchant)
      console.log('[查询是否商户] 从 res.is_merchant 解析:', result)
      return result
    } else if (res['is merchant'] !== undefined) {
      const result = Boolean(res['is merchant'])
      console.log('[查询是否商户] 从 res["is merchant"] 解析:', result)
      return result
    } else if (res.isMerchant !== undefined) {
      const result = Boolean(res.isMerchant)
      console.log('[查询是否商户] 从 res.isMerchant 解析:', result)
      return result
    }
    
    console.warn('[查询是否商户] 无法解析响应格式:', res)
    return false
  } catch (error) {
    console.error('[查询是否商户] 失败:', error)
    return false
  }
}

// 兼容旧版本接口
/**
 * 查询是否商户（兼容旧版本）
 * @returns {Promise}
 * @deprecated 请使用 getIsPlatformAccount
 */
export const getIsMerchant = () => {
  return getIsPlatformAccount()
}

/**
 * 获取微信授权URL
 * @param {String} redirectUri 回调地址
 * @param {String} state 自定义状态参数
 * @param {String} scope 授权范围 snsapi_base|snsapi_userinfo
 * @returns {Promise}
 */
export const getWechatAuthUrl = (redirectUri, state = '', scope = 'snsapi_userinfo') => {
  return request.get('/auth/wechat/auth-url', {
    redirect_uri: redirectUri,
    state,
    scope
  })
}

/**
 * 刷新微信访问令牌
 * @param {String} refreshToken 微信刷新令牌
 * @returns {Promise}
 */
export const refreshWechatToken = (refreshToken) => {
  return request.post('/auth/wechat/refresh-token', {
    refresh_token: refreshToken
  })
}

/**
 * 验证微信访问令牌
 * @param {String} accessToken 微信访问令牌
 * @param {String} openid 用户openid
 * @returns {Promise}
 */
export const verifyWechatToken = (accessToken, openid) => {
  return request.post('/auth/wechat/verify-token', {
    access_token: accessToken,
    openid
  })
}

/**
 * 手机号密码登录（一键登录，不存在则自动注册）
 * @param {String} mobile 手机号
 * @param {String} password 密码
 * @returns {Promise}
 */
export const phonePasswordLogin = (mobile, password) => {
  return request.post('/user/auth', {
    mobile,
    password,
    // 手机注册没有可信 openid，昵称在微信登录后经资料审核设置。
  })
}

/**
 * 昵称登录
 * @param {String} nickname 昵称
 * @param {String} password 密码
 * @returns {Promise}
 */
export const nicknameLogin = (nickname, password) => {
  return request.post('/auth/nickname/login', {
    nickname,
    password
  })
}

/**
 * 退出登录（本地清除token）
 */
export const logout = () => {
  return Promise.resolve({ message: '退出成功' })
}

/**
 * 更新用户信息（兼容旧版本）
 * @param {Object} data 用户信息
 * @returns {Promise}
 */
export const updateUserInfo = (data) => {
  return updateProfile(data)
}