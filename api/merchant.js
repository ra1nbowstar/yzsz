/** Merchant identity operations; unsupported provider paths fail closed. */

import request from '@/utils/request.js'

export const uploadImage = async () => {
  throw Object.assign(new Error('通用实名图片存储暂不可用，请使用已认证的进件材料上传接口'), { code: 'IDENTITY_MEDIA_UPLOAD_UNAVAILABLE' })
}

// Identity evidence must be verified by a configured authoritative provider.
export const faceVerify = async () => {
  throw Object.assign(new Error('活体认证暂不可用：需接入实名供应商、用户绑定挑战及签名回调'), { code: 'LIVENESS_UNAVAILABLE' })
}

export const verifyPersonal = async () => {
  throw new Error('个人实名核验暂不可用：需接入权威实名供应商')
}
export const verifyEnterprise = async () => {
  throw new Error('企业实名核验暂不可用：需接入权威企业核验供应商')
}

// 创建或提交微信进件草稿（对接后端 /wechat-applyment/draft）
// data 结构：applyment_id(新建为0)、subject_type、subject_info、contact_info、bank_account_info、business_category_locked
// token: 可选，若传入则会覆盖本地存储的 token（便于调试或使用临时 token）
export const createWechatApplymentDraft = async (data, token) => {
  const options = {}
  if (token) {
    options.header = { Authorization: 'Bearer ' + token }
  }
  const payload = {
    applyment_id: data?.applyment_id ?? 0,
    subject_type: data?.subject_type || 'SUBJECT_TYPE_INDIVIDUAL',
    subject_info: data?.subject_info ?? {},
    contact_info: data?.contact_info ?? {},
    bank_account_info: data?.bank_account_info ?? {},
    business_category_locked: data?.business_category_locked ?? false,
    ...data
  }
  payload.applyment_id = payload.applyment_id || null
  options.header = { 'Content-Type': 'application/json', ...options.header }
  return request.post('/wechat-applyment/draft', JSON.stringify(payload), options)
}

// 提交进件申请（对接后端 /wechat-applyment/submit）
export const submitWechatApplyment = async (data, token) => {
  const options = { header: { 'Content-Type': 'application/json' } }
  if (token) {
    options.header.Authorization = 'Bearer ' + token
  }
  const payload = typeof data === 'object' && data !== null ? data : {}
  return request.post('/wechat-applyment/submit', JSON.stringify(payload), options)
}

// 查询进件状态（对接后端 /wechat-applyment/status）
export const getWechatApplymentStatus = async (applymentId, token) => {
  const options = {}
  if (token) {
    options.header = { Authorization: 'Bearer ' + token }
  }
  return request.get(`/wechat-applyment/status?applyment_id=${applymentId}`, {}, options)
}

// 上传进件材料（对接后端 /wechat-applyment/media/upload）
export const uploadWechatApplymentMedia = async (file, mediaType, applymentId, token) => {
  const options = {}
  if (token) {
    options.header = { Authorization: 'Bearer ' + token }
  }
  // 如果是文件路径，需要先上传到服务器获取URL
  const formData = {
    file: file.url || file,
    media_type: mediaType,
    applyment_id: applymentId
  }
  return request.post('/wechat-applyment/media/upload', formData, options)
}

// 修改核心信息（对接后端 /wechat-applyment/core-info/modify）
export const modifyWechatApplymentCoreInfo = async (data, token) => {
  const options = { header: { 'Content-Type': 'application/json' } }
  if (token) {
    options.header.Authorization = 'Bearer ' + token
  }
  const payload = typeof data === 'object' && data !== null ? data : {}
  return request.post('/wechat-applyment/core-info/modify', JSON.stringify(payload), options)
}

// 重新提交被驳回的进件（对接后端 /wechat-applyment/resubmit）
export const resubmitWechatApplyment = async (applymentId, token) => {
  const options = { header: { 'Content-Type': 'application/json' } }
  if (token) {
    options.header.Authorization = 'Bearer ' + token
  }
  return request.post('/wechat-applyment/resubmit', JSON.stringify({ applyment_id: applymentId }), options)
}

export default {
  uploadImage,
  faceVerify,
  verifyPersonal,
  verifyEnterprise,
  createWechatApplymentDraft,
  submitWechatApplyment,
  getWechatApplymentStatus,
  uploadWechatApplymentMedia,
  modifyWechatApplymentCoreInfo,
  resubmitWechatApplyment
}
