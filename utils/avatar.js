/**
 * 头像处理工具函数
 */

import config from './config.js'
import { normalizeRemoteUrl, isAbsoluteHttpUrl } from './imageUrl.js'

/**
 * 处理头像URL，确保正确显示
 * @param {String} avatarPath 头像路径（可能是字符串、JSON字符串数组或数组）
 * @returns {String} 处理后的头像URL
 */
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath || avatarPath === 'null' || avatarPath === null) {
    return '/static/logo.png'
  }
  
  // 如果是数组，取第一个元素
  if (Array.isArray(avatarPath)) {
    if (avatarPath.length === 0) {
      return '/static/logo.png'
    }
    avatarPath = avatarPath[0]
  }
  
  // 如果是字符串，尝试解析JSON（处理 "[\"/path/to/image.jpg\"]" 格式）
  if (typeof avatarPath === 'string') {
    // 以 [ 开头一律按 JSON 数组处理：解析失败或空数组都回退默认图，
    // 避免把 "[]"、"[abc]" 这类原始串拼成坏 URL
    if (avatarPath.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(avatarPath)
        if (Array.isArray(parsed) && parsed.length > 0) {
          avatarPath = parsed[0]
        } else {
          return '/static/logo.png'
        }
      } catch (e) {
        return '/static/logo.png'
      }
    }
  }
  
  // 确保是字符串
  if (typeof avatarPath !== 'string') {
    return '/static/logo.png'
  }

  avatarPath = normalizeRemoteUrl(avatarPath.trim())

  // 如果已经是完整URL，检查是否是临时路径
  if (isAbsoluteHttpUrl(avatarPath)) {
    // http://tmp/ 是微信小程序的临时路径，在浏览器中无法访问
    // 需要转换为服务器URL或使用默认头像
    if (avatarPath.startsWith('http://tmp/') || avatarPath.startsWith('https://tmp/')) {
      console.warn('[头像处理] 检测到临时路径，无法在浏览器中访问:', avatarPath)
      // 临时路径在浏览器中无法访问
      // 如果后端返回的是临时路径，说明图片可能还没有上传到服务器，或者后端应该返回服务器URL
      // 直接返回默认头像，避免404错误
      return '/static/logo.png'
    }
    // 其他完整的HTTP/HTTPS URL，直接返回
    return avatarPath
  }
  
  // 如果是静态资源，直接返回
  if (avatarPath.startsWith('/static')) {
    return avatarPath
  }
  
  // 处理相对路径：确保以 / 开头
  const imagePath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`
  
  const base = normalizeRemoteUrl(String(config.baseURL || '').trim()) || String(config.baseURL || '')
  const fullUrl = normalizeRemoteUrl(`${base}${imagePath}`)
  return fullUrl
}

/**
 * 批量处理头像URL数组
 * @param {Array} avatarPaths 头像路径数组
 * @returns {Array} 处理后的头像URL数组
 */
export const getAvatarUrls = (avatarPaths) => {
  if (!Array.isArray(avatarPaths)) {
    return []
  }
  
  return avatarPaths.map(path => getAvatarUrl(path))
}

