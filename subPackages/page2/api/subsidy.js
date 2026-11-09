/**
 * 周补贴系统相关接口
 */

import request from '@/utils/request.js'

/**
 * 获取周补贴统计信息
 * @returns {Promise}
 */
export const getSubsidyStats = () => {
  return request.get('/subsidy/stats')
}

/**
 * 获取周补贴记录
 * @param {Object} params 查询参数
 * @param {Number} params.page 页码
 * @param {Number} params.limit 每页数量
 * @param {String} params.week 周期筛选
 * @returns {Promise}
 */
export const getSubsidyRecords = (params = {}) => {
  return request.get('/subsidy/records', params)
}

/**
 * 获取当前周补贴池信息
 * @returns {Promise}
 */
export const getCurrentSubsidyPool = () => {
  return request.get('/subsidy/current-pool')
}

/**
 * 获取用户积分信息
 * @returns {Promise}
 */
export const getUserPointsInfo = () => {
  return request.get('/subsidy/user-points')
}

/**
 * 获取周补贴计算规则
 * @returns {Promise}
 */
export const getSubsidyRules = () => {
  return request.get('/subsidy/rules')
}

/**
 * 手动发放周补贴
 * @returns {Promise}
 */
export const distributeSubsidy = () => {
  return request.post('/api/subsidy/distribute')
}

/**
 * 查询当前积分值配置
 * @returns {Promise}
 */
export const getPointsValue = () => {
  return request.get('/api/subsidy/points-value')
}

/**
 * 调整积分值
 * @param {Number} points_value 积分值(0-0.02)，不传或传null取消手动调整
 * @param {Boolean} auto_clear 是否在发放一次后自动清除，默认为true
 * @returns {Promise}
 */
export const adjustPointsValue = (points_value, auto_clear = true) => {
  const queryParams = []
  // 管理员鉴权依赖 Bearer Token，不再传后台口令
  if (points_value !== undefined && points_value !== null) {
    queryParams.push(`points_value=${encodeURIComponent(points_value)}`)
  }
  if (auto_clear !== undefined && auto_clear !== null) {
    queryParams.push(`auto_clear=${encodeURIComponent(auto_clear)}`)
  }
  const url = `/api/subsidy/points-value/adjust?${queryParams.join('&')}`
  return request.post(url, {})
}