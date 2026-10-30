// 统一保存认证相关信息（token、openid、wechatInfo）
export function saveAuth(res) {
  try {
    if (!res) return

    // 支持后端直接返回 { token } 或 { data: { token } }
    const token = res.token || (res.data && res.data.token) || null
    if (token) {
      uni.setStorageSync('token', token)
      console.log('[saveAuth] 已保存 token，长度:', String(token).length)
    }

    // 保存 wechat_info（如果存在）
    if (res.wechat_info) {
      try {
        uni.setStorageSync('wechatInfo', res.wechat_info)
        // 也尝试解析并保存完整会话信息（openid/session_key/unionid）
        try { saveWechatSession(res.wechat_info) } catch (e) { /* ignore */ }
      } catch (e) {
        console.warn('[saveAuth] 保存 wechatInfo 失败', e)
      }
    }

    // 保存 openid（如果存在）
    const openid = res.openid || (res.user && res.user.openid) || (res.wechat_info && res.wechat_info.openid)
    if (openid) {
      try {
        uni.setStorageSync('openid', openid)
      } catch (e) {
        console.warn('[saveAuth] 保存 openid 失败', e)
      }
    }
  } catch (err) {
    console.error('[saveAuth] 保存认证信息失败', err)
  }
}

// 将现有工具一起导出为默认对象，便于其他模块统一导入
export default { saveAuth, saveWechatSession, getWechatSession }

/**
 * 保存微信会话信息（openid, session_key, unionid 等）
 * 接受一个对象或 JSON 字符串
 */
export function saveWechatSession(session) {
  try {
    if (!session) return
    let s = session
    if (typeof session === 'string') {
      try { s = JSON.parse(session) } catch (e) { s = { raw: session } }
    }

    // 期望字段： openid, session_key, unionid
    const wechatInfo = {
      openid: s.openid || s.open_id || s.openID || s.openId || null,
      session_key: s.session_key || s.sessionKey || s.session || null,
      unionid: s.unionid || s.union_id || null,
      raw: s
    }

    uni.setStorageSync('wechatInfo', wechatInfo)
    if (wechatInfo.openid) {
      try { uni.setStorageSync('openid', wechatInfo.openid) } catch (e) {}
      console.log('[saveWechatSession] 已保存 openid')
    }
    console.log('[saveWechatSession] wechatInfo 已保存')
    return wechatInfo
  } catch (err) {
    console.error('[saveWechatSession] 保存微信会话信息失败:', err)
    return null
  }
}

export function getWechatSession() {
  try {
    const v = uni.getStorageSync('wechatInfo')
    if (!v) return null
    if (typeof v === 'string') {
      try { return JSON.parse(v) } catch (e) { return v }
    }
    return v
  } catch (err) {
    console.error('[getWechatSession] 读取 wechatInfo 失败:', err)
    return null
  }
}
