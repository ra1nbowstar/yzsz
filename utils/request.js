/**
 * 网络请求封装
 * 统一处理请求拦截、响应拦截、错误处理
 */

import config from './config.js'

// 生成请求 ID（rid），格式与示例一致：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
const generateRid = () => {
  const hex = () => Math.floor(Math.random() * 16).toString(16)
  const segment = (len) => Array.from({ length: len }, hex).join('')
  return `${segment(8)}-${segment(4)}-${segment(4)}-${segment(4)}-${segment(12)}`
}

class Request {
  constructor() {
    this.baseURL = config.baseURL
    this.timeout = config.timeout
  }

  /**
   * 发起请求
   * @param {Object} options 请求配置
   * @returns {Promise}
   */
  request(options = {}) {
    // 合并配置
    const fullUrl = this.baseURL + options.url
    options.url = fullUrl
    options.timeout = options.timeout || this.timeout
    const method = (options.method || 'GET').toUpperCase()
    options.header = {
      'Content-Type': 'application/json',
      ...options.header
    }

    // 后端要求携带 rid（请求 ID），GET/POST 均带上
    options.header['rid'] = options.header['rid'] || generateRid()

    // 添加 token
    const token = uni.getStorageSync('token')
    if (token) {
      options.header['Authorization'] = 'Bearer ' + token
    }

    // 微信小程序：POST/PUT 时需显式 JSON.stringify，否则嵌套对象可能丢失
    const contentType = (options.header['Content-Type'] || options.header['content-type'] || '').toLowerCase()
    if (['POST', 'PUT'].includes(method) && options.data != null && typeof options.data === 'object' && !Array.isArray(options.data) && contentType.includes('application/json')) {
      options.data = JSON.stringify(options.data)
    }

    return new Promise((resolve, reject) => {


      uni.request({
        ...options,
        success: (res) => {


          // 处理响应数据：如果是字符串，尝试解析为JSON
          let responseData = res.data
          if (responseData == null) {
            responseData = {}
          }
          if (typeof res.data === 'string') {
            // 检查是否是HTML响应
            if (res.data.trim().startsWith('<!DOCTYPE') || res.data.trim().startsWith('<html')) {
              console.error('[响应解析] 服务器返回了HTML页面，可能是接口路径错误或服务器配置问题')
              const errorMsg = '服务器返回了HTML页面，请检查接口路径是否正确'
              this.handleError(errorMsg)
              reject({
                code: 500,
                message: errorMsg,
                detail: '接口可能不存在或服务器配置错误',
                rawResponse: res.data.substring(0, 500)
              })
              return
            }

            try {
              const parsed = JSON.parse(res.data)
              responseData = parsed != null ? parsed : {}
            } catch (parseError) {
              console.error('[响应解析] JSON解析失败，响应可能是HTML或纯文本:', {
                error: parseError.message,
                responsePreview: res.data.substring(0, 200)
              })
              // 如果解析失败，创建一个错误对象
              const errorMsg = '服务器返回了非JSON格式的响应'
              this.handleError(errorMsg)
              reject({
                code: 500,
                message: errorMsg,
                detail: res.data.substring(0, 500),
                rawResponse: res.data
              })
              return
            }
          }

          // 确保 responseData 不为 null/undefined，避免访问属性时报错
          if (responseData == null || typeof responseData !== 'object') {
            responseData = {}
          }

          // HTTP 状态码判断（200/204 都是成功状态）
          if ([200, 204].includes(res.statusCode)) {
            // 根据 API 文档，使用 success 或 ok 字段判断业务状态
            // pay 接口必须返回 ok: true 或 success: true 才算成功
            if (responseData.ok === false) {
              const errorMsg = responseData.message || responseData.msg || responseData.detail || '操作失败'
              console.error('[业务错误] ok=false', {
                message: errorMsg,
                fullData: responseData,
                url: options.url
              })
              this.handleError(errorMsg)
              reject({
                ...responseData,
                message: errorMsg,
                detail: responseData.detail
              })
            } else if (responseData.success === false) {
              const errorMsg = responseData.message || responseData.msg || responseData.detail || '操作失败'
              console.error('[业务错误] success=false', {
                message: errorMsg,
                fullData: responseData,
                url: options.url
              })
              this.handleError(errorMsg)
              reject({
                ...responseData,
                message: errorMsg,
                detail: responseData.detail
              })
            } else if (responseData.success === true || responseData.ok === true || responseData.success === undefined) {
              resolve(responseData) // 返回完整的响应数据
            } else {
              // 业务错误（比如参数错误、验证码错误）
              const errorMsg = responseData.message || responseData.msg || responseData.detail || '操作失败'
              console.error('[业务错误]', {
                message: errorMsg,
                fullData: responseData,
                url: options.url
              })
              this.handleError(errorMsg)
              reject({
                ...responseData,
                message: errorMsg,
                detail: responseData.detail
              })
            }
          } else if (res.statusCode === 400) {
            // 400 Bad Request - 通常是参数错误或业务错误
            const errorMsg = responseData.detail || responseData.message || responseData.msg || '请求参数错误'
            const errorMsgStr = typeof errorMsg === 'string' ? errorMsg : String(errorMsg)

            // 检查是否是联创晋升相关的错误（已达到最高等级或条件未达标），这些错误不需要显示
            const isUniLevelPromoteError = options.url && options.url.includes('/unilevel/promote') &&
              (errorMsgStr.includes('已到达最高等级') || errorMsgStr.includes('条件未达标') || errorMsgStr.includes('无法晋升'))

            if (!isUniLevelPromoteError) {
              console.error('[400错误] 请求参数或业务错误:', {
                statusCode: res.statusCode,
                errorMsg: errorMsg,
                fullData: responseData,
                rawData: res.data
              })

              // 检查是否是微信接口调用失败
              if (typeof errorMsg === 'string' && (errorMsg.includes('openid') || errorMsg.includes('session_key'))) {
                console.error('[微信接口错误] 后端无法获取openid或session_key，可能的原因:', {
                  '1. 后端appid配置错误': '检查后端WECHAT_APP_ID配置',
                  '2. 后端secret配置错误': '检查后端WECHAT_APP_SECRET配置',
                  '3. code已过期': 'code有效期5分钟，确保及时使用',
                  '4. code已使用': '每个code只能使用一次',
                  '5. 网络问题': '后端无法访问微信服务器'
                })
              }

              // 「require POST method」等网关/技术错误不直接展示给用户，避免遮挡表单
              const isMethodError = typeof errorMsgStr === 'string' && /require\s*POST|POST\s*method|method\s*not\s*allowed/i.test(errorMsgStr)
              this.handleError(isMethodError ? '加载失败，请重试' : errorMsg)
            }

            reject({
              code: 400,
              statusCode: 400,
              message: errorMsg,
              errorMsg: errorMsgStr,
              detail: responseData.detail,
              ...responseData
            })
          } else if (res.statusCode === 401) {
            // Token 过期/未登录（后端返回 401 时触发）
            this.handleTokenExpired()
            reject({ code: 401, msg: '登录已过期，请重新登录' })
          } else if (res.statusCode === 404) {
            // 404错误不显示提示，直接reject（由调用方决定是否静默处理）
            reject({ code: 404, statusCode: 404, message: '接口不存在' })
          } else {
            // 处理其他状态码错误（包括 422 验证错误）
            // 提取错误消息，确保是字符串
            let errorMsg = `请求失败[${res.statusCode}]`

            // 处理 detail 字段（可能是数组）
            if (responseData.detail) {
              if (Array.isArray(responseData.detail) && responseData.detail.length > 0) {
                const firstDetail = responseData.detail[0]
                if (typeof firstDetail === 'string') {
                  errorMsg = firstDetail
                } else if (firstDetail && typeof firstDetail === 'object' && firstDetail.msg) {
                  errorMsg = firstDetail.msg
                } else if (firstDetail && typeof firstDetail === 'object' && firstDetail.message) {
                  errorMsg = firstDetail.message
                } else {
                  errorMsg = String(firstDetail)
                }
              } else if (typeof responseData.detail === 'string') {
                errorMsg = responseData.detail
              }
            }

            // 如果 detail 没有提供有效消息，尝试 message 字段
            if (errorMsg === `请求失败[${res.statusCode}]` && responseData.message) {
              if (Array.isArray(responseData.message) && responseData.message.length > 0) {
                errorMsg = typeof responseData.message[0] === 'string' ? responseData.message[0] : String(responseData.message[0])
              } else if (typeof responseData.message === 'string') {
                errorMsg = responseData.message
              }
            }

            // 如果 message 也没有，尝试 msg 字段
            if (errorMsg === `请求失败[${res.statusCode}]` && responseData.msg) {
              if (Array.isArray(responseData.msg) && responseData.msg.length > 0) {
                errorMsg = typeof responseData.msg[0] === 'string' ? responseData.msg[0] : String(responseData.msg[0])
              } else if (typeof responseData.msg === 'string') {
                errorMsg = responseData.msg
              }
            }

            // 确保 errorMsg 是字符串
            if (typeof errorMsg !== 'string') {
              errorMsg = String(errorMsg)
            }

            console.error(`[${res.statusCode}错误]`, {
              statusCode: res.statusCode,
              errorMsg: errorMsg,
              fullData: responseData,
              rawData: res.data
            })

            // 确保 handleError 接收的是字符串；405 Method Not Allowed 等不直接展示给用户（快递列表等会自动用 POST 重试）
            if (typeof errorMsg !== 'string') {
              errorMsg = String(errorMsg)
            }
            const isMethodError = res.statusCode === 405 || (typeof errorMsg === 'string' && /method\s*not\s*allowed|require\s*POST|POST\s*method/i.test(errorMsg))
            this.handleError(isMethodError ? '加载失败，请重试' : errorMsg)

            // 构建错误对象，确保 message、statusCode、code 可用（getDeliveryList 等需根据 405 自动重试 POST）
            const errorObj = {
              code: res.statusCode,
              statusCode: res.statusCode,
              detail: responseData.detail, // 保留原始 detail（可能是数组）
              ...responseData
            }
            // 最后设置 message，确保是字符串（覆盖 responseData 中可能的数组 message）
            errorObj.message = errorMsg
            reject(errorObj)
          }
        },
        fail: (err) => {
          console.error(`[请求失败] ${options.method} ${options.url}`, err)

          // 详细的错误信息
          let errMsg = '网络请求失败'
          if (err.errMsg) {
            if (err.errMsg.includes('timeout')) {
              errMsg = '请求超时，请检查网络连接'
            } else if (err.errMsg.includes('fail')) {
              errMsg = '网络连接失败，请检查：\n1. 网络是否正常\n2. 服务器是否可访问\n3. 域名是否正确'
            } else if (err.errMsg.includes('ssl')) {
              errMsg = 'SSL证书验证失败，请检查HTTPS配置'
            }
          }

          this.handleError(errMsg)
          reject(err)
        }
      })
    })
  }

  /**
   * GET 请求
   */
  get(url, data = {}, options = {}) {
    return this.request({
      url,
      data,
      method: 'GET',
      ...options
    })
  }

  /**
   * POST 请求
   */
  post(url, data = {}, options = {}) {
    return this.request({
      url,
      data,
      method: 'POST',
      ...options
    })
  }

  /**
   * PUT 请求
   */
  put(url, data = {}, options = {}) {
    return this.request({
      url,
      data,
      method: 'PUT',
      ...options
    })
  }

  /**
   * DELETE 请求
   */
  delete(url, data = {}, options = {}) {
    return this.request({
      url,
      data,
      method: 'DELETE',
      ...options
    })
  }

  /**
   * 错误处理
   */
  handleError(message) {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  }

  /**
   * Token 过期处理
   */
  handleTokenExpired() {
    console.log('[Token过期] 清除本地存储并跳转登录页')

    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')

    uni.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none',
      duration: 2000
    })

    setTimeout(() => {
      uni.reLaunch({
        url: '/pages/index/index'
      }).catch(err => {
        console.error('[跳转失败] reLaunch to login failed:', err)
      })
    }, 2000)
  }
}

const request = new Request()
export default request
export { request }