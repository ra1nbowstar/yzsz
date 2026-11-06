/**
 * 联创星级相关接口
 */

import request from '@/utils/request.js'
export { getUniLevelStatus, promoteUniLevel } from '@/api/team.js'

/**
 * 手动发放联创星级分红
 * @returns {Promise}
 */
export const distributeDividend = () => {
  return request.post('/api/unilevel/dividend')
}

/**
 * 联创分红预览（平台管理用，不需要参数）
 * @returns {Promise} 返回分红预览数据
 */
export const getUnilevelDividendPreview = () => {
  return request.get('/api/reports/unilevel/preview')
}

/**
 * 联创分红预览（用户查看自己的分红，需要user_id参数）
 * @param {Number} user_id 用户ID
 * @returns {Promise} 返回分红预览数据，包含所有用户的分红信息
 */
export const getUnilevelDividendPreviewForUser = (user_id) => {
  if (!user_id) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  return request.get('/unilevel/dividend/preview', { user_id })
}

/**
 * 调整联创分红金额
 * @param {Number} amount_per_weight 每个权重的分红金额（传入0或null取消调整）
 * @returns {Promise}
 */
export const adjustUnilevelDividend = (amount_per_weight) => {
  const queryParams = []
  // 管理员鉴权依赖 Bearer Token，不再传后台口令
  if (amount_per_weight !== undefined && amount_per_weight !== null) {
    queryParams.push(`amount_per_weight=${encodeURIComponent(amount_per_weight)}`)
  }
  const url = `/api/unilevel/adjust?${queryParams.join('&')}`
  return request.post(url, {})
}

