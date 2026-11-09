/**
 * 公益相关接口
 */

import request from '@/utils/request.js'

export const getPublicWelfareSummary = () => request.get('/api/public-welfare/summary')

/**
 * 查询公益基金余额
 * @returns {Promise} 返回公益基金余额数据
 */
export const getPublicWelfareBalance = () => {
  return request.get('/api/public-welfare')
}

/**
 * 查询公益基金流水明细
 * @param {Object} params 查询参数（可选）
 * @param {Number} params.page 页码（可选）
 * @param {Number} params.size 每页数量（可选）
 * @returns {Promise}
 */
export const getPublicWelfareFlow = (params = {}) => {
  return request.get('/api/public-welfare/flow', params)
}

/**
 * 用户捐赠点数到公益基金
 * @param {Number} userId 用户ID
 * @param {Number} amount 捐赠金额（点数）
 * @returns {Promise} 返回捐赠结果
 */
export const donatePoints = (userId, amount) => {
  if (!userId) {
    return Promise.reject(new Error('用户ID不能为空'))
  }
  if (!amount || amount <= 0) {
    return Promise.reject(new Error('捐赠金额必须大于0'))
  }
  return request.post(`/api/donate/true-total-points?user_id=${userId}&amount=${amount}`)
}

