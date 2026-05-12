/**
 * 资金池相关接口
 */

import request from '@/utils/request.js'

/**
 * 查询资金池分配配置
 * @returns {Promise} 返回资金池分配配置
 */
export const getFundPoolAllocations = () => {
  return request.get('/api/fund-pools/allocations')
}

/**
 * 更新资金池分配配置
 * @param {Object} data 资金池分配配置数据
 * @param {String} data.merchant_balance 商户余额比例（小数格式，如 "0.9"）
 * @param {String} data.public_welfare 公益比例（小数格式，如 "0.01"）
 * @param {String} data.maintain_pool 维护池比例（小数格式，如 "0.01"）
 * @param {String} data.subsidy_pool 补贴池比例（小数格式，如 "0.01"）
 * @param {String} data.director_pool 董事池比例（小数格式，如 "0.02"）
 * @param {String} data.shop_pool 店铺池比例（小数格式，如 "0.01"）
 * @param {String} data.city_pool 城市池比例（小数格式，如 "0.01"）
 * @param {String} data.branch_pool 分支池比例（小数格式，如 "0.01"）
 * @param {String} data.fund_pool 资金池比例（小数格式，如 "0.02"）
 * @returns {Promise}
 */
export const updateFundPoolAllocations = (data) => {
  // 根据API文档，使用JSON body格式，需要包装在allocations对象中
  const requestBody = {
    allocations: data
  }
  
  return request.post('/api/fund-pools/allocations', requestBody)
}

/** GET /api/fund-pools/direct-referral-reward-rate */
export const getDirectReferralRewardRate = () => {
  return request.get('/api/fund-pools/direct-referral-reward-rate')
}

/** POST /api/fund-pools/direct-referral-reward-rate Body: { rate }，(0, 1] */
export const setDirectReferralRewardRate = (rate) => {
  const r = Number(rate)
  if (!Number.isFinite(r) || r <= 0 || r > 1) {
    return Promise.reject(new Error('直推奖励比例须在 (0, 1] 之间'))
  }
  return request.post('/api/fund-pools/direct-referral-reward-rate', { rate: r })
}

