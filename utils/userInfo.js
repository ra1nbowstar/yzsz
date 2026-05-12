/**
 * 从本地 userInfo 解析数据库 users 表主键（下单、订单列表等接口的 user_id 须存在于 users 表）
 * 优先 user_id：与登录流程写入一致，避免 id 与 user_id 不一致时误用非主键字段。
 * @param {Record<string, unknown>|null|undefined} [userInfo] 不传则从 uni.getStorageSync('userInfo') 读取
 * @returns {number} 有效正整数，否则 NaN
 */
export function getStoredNumericUserId(userInfo) {
  let o = userInfo
  if (o == null && typeof uni !== 'undefined') {
    try {
      o = uni.getStorageSync('userInfo')
    } catch {
      o = null
    }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return NaN
  const raw = o.user_id ?? o.id ?? o.userId ?? o.uid
  if (raw == null || raw === '') return NaN
  const n = parseInt(String(raw).trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : NaN
}
