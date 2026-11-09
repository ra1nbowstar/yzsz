/**
 * 资产取数适配层（唯一出口）
 *
 * 页面不要各自调接口，统一调 getAssets()。
 *
 * TODO(过渡态)：/rights/me 的 points / rain / coupons 数据源尚未接主账本，
 * 当前分别临时用旧接口取：
 *   1) 积分   GET /points/balance       -> member_points
 *   2) 雨点   GET /points/summary       -> remaining_points（回退 true_total_points）
 *   3) 优惠券 GET /my?status=unused     -> 分页 total（可用张数）
 * 后端修复 /rights/me 后，只需改本函数内部这三处来源，页面不用动。
 *
 * 规则类字段（growth_ratio / current_unit_value / conversion_threshold_ratio /
 * disclaimer / capabilities）仍来自 /rights/me，与账本无关。
 *
 * 注意：本层只做「取数 + 数值化」，不做任何换算、取最大值、凑数兜底。
 */
import { getPointsBalance, getPointsSummary } from './points.js'
import { getMyCoupons, pickMyCouponsTotal } from './coupon.js'
import { getRightsOverview } from './rights.js'

/** 数值化：非法值返回 null（不塞 0，避免把「取不到」伪装成「余额为 0」） */
const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * 6 位截断 + 去尾零。
 * 保持 String(Number(toFixed(6)))，不要换成正则 replace —— 会把 8000 削成 8。
 */
export const formatQty = (v) => {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return String(Number(n.toFixed(6)))
}

/**
 * 「是否已登录」：无 token 时页面应显示 --，不应把空结果当成 0。
 */
export const hasToken = () => !!uni.getStorageSync('token')

/**
 * 统一资产取数
 * @param {Object} [options]
 * @param {Number|String} [options.userId] 用户ID；不传则从本地 userInfo 读
 * @param {String[]} [options.need] 需要取的块，默认全部：['points','rain','coupons','rights']
 *        团队页只取雨点时可传 need: ['rain']，避免多余请求
 * @returns {Promise<Object>} {
 *   points: number|null,
 *   rain: number|null,
 *   cumulativeRain: number|null,
 *   coupons: number|null,          // 可用券张数
 *   kadaEgg: number|null,
 *   kadaCoupon: number|null,
 *   eggs: { quantity, currentUnitValue, currentValue, growthRatio, conversionThreshold } | null,
 *   disclaimer: string,
 *   capabilities: object|null,
 *   errors: { points?, rain?, coupons?, rights? }
 * }
 */
export const getAssets = async (options = {}) => {
  const stored = uni.getStorageSync('userInfo') || {}
  const userId = options.userId || stored.user_id || stored.id || stored.userId || stored.uid
  const need = Array.isArray(options.need) && options.need.length
    ? options.need
    : ['points', 'rain', 'coupons', 'rights']
  const wants = (k) => need.includes(k)

  const result = {
    points: null,
    rain: null,
    cumulativeRain: null,
    coupons: null,
    kadaEgg: null,
    kadaCoupon: null,
    eggs: null,
    disclaimer: '',
    capabilities: null,
    errors: {}
  }

  const tasks = []

  if (wants('points')) {
    tasks.push(
      getPointsBalance()
        .then((res) => { result.points = toNum(res && res.data && res.data.member_points) })
        .catch((e) => { result.errors.points = e })
    )
  }

  if (wants('rain') && userId) {
    tasks.push(
      getPointsSummary(userId)
        .then((res) => {
          const d = (res && res.data) || res || {}
          result.rain = toNum(d.remaining_points !== undefined ? d.remaining_points : d.true_total_points)
          result.cumulativeRain = toNum(d.cumulative_total)
        })
        .catch((e) => { result.errors.rain = e })
    )
  }

  if (wants('coupons') && userId) {
    tasks.push(
      getMyCoupons({ user_id: userId, status: 'unused', page: 1, page_size: 1 })
        .then((res) => {
          const total = pickMyCouponsTotal(res)
          result.coupons = total === null ? null : toNum(total)
        })
        .catch((e) => { result.errors.coupons = e })
    )
  }

  if (wants('rights')) {
    tasks.push(
      getRightsOverview()
        .then((res) => {
          const d = (res && res.data) || res || {}
          const eggs = d.eggs || {}
          const goda = d.goda_coupons || {}
          result.kadaEgg = toNum(eggs.quantity)
          result.kadaCoupon = toNum(goda.balance)
          result.eggs = {
            quantity: toNum(eggs.quantity),
            currentUnitValue: toNum(eggs.current_unit_value),
            currentValue: toNum(eggs.current_value),
            growthRatio: (eggs.growth_ratio === null || eggs.growth_ratio === undefined)
              ? null
              : toNum(eggs.growth_ratio),
            conversionThreshold: toNum(eggs.conversion_threshold_ratio)
          }
          result.disclaimer = d.disclaimer || ''
          result.capabilities = d.capabilities || null
        })
        .catch((e) => { result.errors.rights = e })
    )
  }

  await Promise.allSettled(tasks)
  return result
}