/**
 * 银行卡相关接口
 * 绑定、改绑、查询状态、列表、日志、设置默认等
 */

import request from '@/utils/request.js'

/** 绑定银行卡（需先完成微信进件，自动同步微信数据） */
export const bindBankCard = (data) => {
  return request.post('/api/bankcard/bind', data)
}

/** SMS is sent to the authenticated account mobile, never a client-selected mobile. */
export const sendBankCardSms = (account_number, purpose = 'bankcard_bind') => {
  let deviceId = uni.getStorageSync('bankcard_device_id')
  if (!deviceId) {
    deviceId = `bankcard-${Date.now()}-${Math.random().toString(36).slice(2)}`
    uni.setStorageSync('bankcard_device_id', deviceId)
  }
  const body = `account_number=${encodeURIComponent(account_number)}&device_id=${encodeURIComponent(deviceId)}&purpose=${encodeURIComponent(purpose)}`
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
export const getBankCardList = async () => {
  const response = await request.get('/api/bankcard/list')
  return { ...response, data: (response.data || []).map(card => ({
    ...card,
    account_number_masked: card.account_number_masked || `**** ${card.account_number_tail || '****'}`,
    is_default: card.is_default === true || card.is_default === 1
  })) }
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
export const setDefaultBankCard = ({ account_id }) => {
  return request.post('/api/bankcard/default/set', `account_id=${encodeURIComponent(account_id)}`, {
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}
