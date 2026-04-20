/**
 * 项目配置文件
 */

// 微信小程序 AppID，须与 manifest.json 的 mp-weixin.appid 一致。
// 后端 jscode2session、微信支付 v3/pay/transactions/jsapi 的 appid 必须与此一致，
// 否则 openid 与 appid 不匹配会导致登录失败或支付 400。
export const WECHAT_APPID = 'wx0cf7c42d80b7fa17'

// 微信支付商户号（用于打开确认收货组件 weappOrderConfirm，须与发货通知给微信的商户号一致；不填则无法调起组件会降级为直接调后端）
export const WECHAT_MERCHANT_ID = '1105084579'

// 微信进件结算规则ID：前端有则用此前端配置，没有则用后端 GET /wechat-applyment/config 或由后端在 submit 时填充
export const WECHAT_SETTLE_RULE_ID = ''

// 服务器地址配置
const SERVER_CONFIGS = {
  production: 'https:yuzedigital.site',  // 生产环境地址（不包含/api）本地测试环境：http://192.168.3.13:8001   禹泽服务器：https:yuzedigital.site
  custom: '' // 自定义地址
}

// 获取当前使用的服务器地址
const getCurrentServer = () => {
  const savedServer = uni.getStorageSync('current_server') || 'production'
  const customUrl = uni.getStorageSync('custom_server_url')
  
  if (savedServer === 'custom' && customUrl) {
    return customUrl
  }
  
  return SERVER_CONFIGS[savedServer] || SERVER_CONFIGS.production
}

export default {
  // 接口基础地址
  baseURL: getCurrentServer(),
  
  // 服务器配置列表
  serverConfigs: SERVER_CONFIGS,
  
  // 请求超时时间（毫秒）
  timeout: 10000,
  
  // 其他配置
  appName: '小程序',
  version: '1.0.0',
  
  // 微信小程序 AppID（后端 jscode2session、微信支付须与此一致）
  wechatAppId: WECHAT_APPID,
  // 微信支付商户号（确认收货组件必填，与 merchant_trade_no 一起唯一指定订单）
  wechatMerchantId: typeof WECHAT_MERCHANT_ID !== 'undefined' ? WECHAT_MERCHANT_ID : '',
  wechatSettleRuleId: typeof WECHAT_SETTLE_RULE_ID !== 'undefined' ? WECHAT_SETTLE_RULE_ID : ''
}

// 从环境变量或配置中心获取服务器地址（如果环境变量存在则覆盖默认值）
if (typeof process !== 'undefined' && process.env) {
  if (process.env.VUE_APP_API_BASE_URL || process.env.API_BASE_URL) {
    SERVER_CONFIGS.production = process.env.VUE_APP_API_BASE_URL || process.env.API_BASE_URL
  }
}

// 切换服务器地址
export const switchServer = (serverType, customUrl = '') => {
  uni.setStorageSync('current_server', serverType)
  
  if (serverType === 'custom' && customUrl) {
    uni.setStorageSync('custom_server_url', customUrl)
  }
  
  // 提示需要重启应用
  uni.showModal({
    title: '提示',
    content: '服务器地址已切换，请重启应用生效',
    showCancel: false,
    success: () => {
      // 重新加载应用
      uni.reLaunch({
        url: '/pages/index/index'
      })
    }
  })
}

// 获取当前服务器类型
export const getCurrentServerType = () => {
  return uni.getStorageSync('current_server') || 'production'
}