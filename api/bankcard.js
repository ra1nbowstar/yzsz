/**
 * 银行卡相关接口
 * 绑定、改绑、查询状态、列表、日志、设置默认等
 */

import request from '@/utils/request.js'

/** 绑定银行卡（需先完成微信进件，自动同步微信数据） */
export const bindBankCard = (data) => {
  return request.post('/api/bankcard/bind', data)
}

/** 发送短信验证码（测试环境返回 123456）
 * @param {String} account_number 银行卡号
 * @param {String} [mobile] 接收验证码手机号（用户填写）
 */
export const sendBankCardSms = (account_number, mobile) => {
  let body = `account_number=${encodeURIComponent(account_number)}`
  if (mobile && String(mobile).trim()) {
    body += `&mobile=${encodeURIComponent(String(mobile).trim())}`
  }
  return request.post('/api/bankcard/sms/send', body, {
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}

/** 申请改绑银行卡（需验证微信数据，原卡自动解绑） */
export const applyModifyBankCard = (data) => {
  return request.post('/api/bankcard/modify/apply', data)
}

/** 查询改绑审核状态 */
export const getModifyStatus = () => {
  return request.get('/api/bankcard/modify/status')
}

/** 获取银行卡列表 */
export const getBankCardList = () => {
  return request.get('/api/bankcard/list')
}

/** 查询绑定状态 */
export const getBankCardStatus = () => {
  return request.get('/api/bankcard/status')
}

/** 获取操作日志 */
export const getBankCardLogs = () => {
  return request.get('/api/bankcard/logs')
}

/** 查询我的银行卡（明文） */
export const getMyBankCards = () => {
  return request.get('/api/bankcard/my')
}

/** 设置默认银行卡 */
export const setDefaultBankCard = (data) => {
  return request.post('/api/bankcard/default/set', data)
}
