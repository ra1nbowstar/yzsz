/**
 * 注意：当前未启用（main.js 已移除启动静默登录），保留供后续 openid 能力参考。
 * 如需恢复，请先确认不违反「用户浏览后再自行选择登录」的审核要求。
 */
import request from './request.js'
import { saveAuth } from './auth.js'

/**
 * 小程序端微信登录工具（code -> token）
 * - 调用 `uni.login` 获取 code
 * - 向后端 POST /auth/wechat-login { code }
 * - 成功后保存 token 到 storage 并返回 token
 */
export async function loginWithWechatCode(){
  return new Promise((resolve, reject) => {
    if (typeof uni === 'undefined' || !uni.login) {
      return reject(new Error('uni.login not available'))
    }
    uni.login({
      provider: 'weixin',
      success: async (res) => {
        if (!res || !res.code) return reject(new Error('wx.login failed'))
        try{
          const resp = await request.post('/auth/wechat-login', { code: res.code })
          // 后端可能返回形如 { token, user } 或 { data: { token, user } }
          const body = resp && (resp.data || resp) || {}
          const token = body.token || body.access_token || null
          const user = body.user || body.userInfo || body.profile || null
          if(token){
            // 使用统一保存逻辑保存 token
            saveAuth({ token, user })
            // 如果后端返回用户信息，同步保存到本地 storage
            if(user && typeof user === 'object'){
              uni.setStorageSync('userInfo', user)
            }
            resolve(token)
          } else {
            reject(new Error('no token returned'))
          }
        }catch(err){
          reject(err)
        }
      },
      fail: (err) => reject(err)
    })
  })
}

export function logout(){
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('profileSetupPrompted')
}

export default { loginWithWechatCode, logout }
