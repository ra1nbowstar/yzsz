/**
 * 平台/商戶端退款展示與狀態歸一（兼容線下單：refund 資訊在根欄位、無 refund_info.status）
 */

const PENDING_REVIEW = new Set([
  '',
  'pending',
  'applied', // 與 pending 同義：待商戶審
  'auditing',
  'audit',
  'processing',
  'submitted',
  'waiting',
  'wait',
  'review',
  'merchant_audit',
  'none',
  'null',
  '0'
])

const TERMINAL_REFUND = new Set(['rejected', 'failed', 'cancelled', 'closed', 'success', 'refunded'])

const CN_STATUS = {
  待审核: 'pending',
  审核中: 'pending',
  处理中: 'pending',
  退款中: 'pending'
}

/**
 * @param {object|null|undefined} raw refund_info / refund 物件
 * @param {object} orderData 原始訂單（可為列表項或詳情根資料）
 * @returns {object|null} 歸一後的 refund_info，無退款語意則 null
 */
export function normalizeRefundInfo(raw, orderData = {}) {
  const od = orderData || {}
  const topStatus = od.refund_status ?? od.refundStatus ?? od.refund_state ?? od.refundState
  const topReason = od.refund_reason ?? od.refundReason ?? od.refund_reason_code
  const hasTopRefundHint = Boolean(
    topStatus ||
      topReason ||
      od.after_sale_id ||
      od.afterSaleId ||
      od.refund_apply_id ||
      od.refund_apply_status ||
      od.refundApplyStatus ||
      od.after_sale_status ||
      od.afterSaleStatus ||
      od.is_refunding ||
      od.need_refund_audit ||
      od.has_pending_refund === true ||
      od.has_pending_refund === 1 ||
      od.refund_pending === true ||
      od.refund_pending === 1 ||
      od.pending_refund === true ||
      od.pending_refund === 1
  )

  const hasNested = raw && typeof raw === 'object' && Object.keys(raw).length > 0
  if (!hasNested && !hasTopRefundHint) return null

  const src = hasNested ? { ...raw } : {}
  let status = src.status ?? src.refund_status ?? src.refundStatus ?? src.state ?? topStatus

  if (status != null && status !== '' && typeof status !== 'object') {
    status = String(status).toLowerCase().trim()
  } else {
    status = 'pending'
  }

  if (CN_STATUS[status]) status = CN_STATUS[status]
  if (PENDING_REVIEW.has(status)) status = 'pending'

  // 後端自訂狀態碼：非終態且非「已通過」類，一律按待商戶審核處理（線下單常見）
  if (
    !TERMINAL_REFUND.has(status) &&
    !['approved', 'complete', 'completed'].includes(status) &&
    !PENDING_REVIEW.has(status)
  ) {
    status = 'pending'
  }

  return {
    ...src,
    status,
    reason: src.reason ?? src.reason_code ?? topReason,
    reason_code: src.reason_code ?? src.reasonCode ?? topReason,
    amount: src.amount ?? src.refund_amount ?? src.refundAmount,
    reject_reason: src.reject_reason ?? src.rejectReason
  }
}

export function isRefundInfoTerminal(refundInfo) {
  if (!refundInfo) return true
  const s = String(refundInfo.status || '').toLowerCase().trim()
  return TERMINAL_REFUND.has(s)
}

/** 商戶仍可「同意/拒絕」的退款狀態 */
export function isRefundAwaitingMerchantReview(refundInfo) {
  if (!refundInfo) return false
  const s = String(refundInfo.status || 'pending').toLowerCase().trim()
  if (TERMINAL_REFUND.has(s)) return false
  // 已通過審核、進入到賬/退貨後續，不再顯示同意/拒絕
  if (s === 'approved' || s === 'complete' || s === 'completed') return false
  return PENDING_REVIEW.has(s) || s === 'pending'
}

/**
 * 主訂單狀態是否應在列表/詳情中視為「待售後」（含線下單仍為 completed 但有待審退款）
 */
export function resolveMerchantOrderStatusForRefund(rawStatus, refundInfo) {
  let s = rawStatus != null && rawStatus !== '' ? String(rawStatus).toLowerCase().trim() : ''
  if (s === 'paid' || s === 'confirmed') s = 'pending_ship'
  if (s === '8') s = 'refunding'
  if (s === '9' || s === '4') s = 'refunded'

  if (refundInfo && !isRefundInfoTerminal(refundInfo) && isRefundAwaitingMerchantReview(refundInfo)) {
    if (s !== 'refunded' && s !== 'cancelled') {
      return 'refunding'
    }
  }
  return s
}

/** 「待售後」Tab：主狀態為售後類，或帶有「未結束」的退款資訊（線下單常為 completed + 待審退款） */
export function matchesAfterSaleTab(order) {
  if (!order) return false
  const s = String(order.status || '').toLowerCase().trim()
  if (['refunding', 'refunded', 'after_sale', 'aftersale'].includes(s)) return true
  if (order.refund_info && !isRefundInfoTerminal(order.refund_info)) return true
  // 列表項未帶 refund_info 時，合併處理頁掛載的根級退款線索再嗅探
  const sniffSource =
    order._refundRootForSniff && typeof order._refundRootForSniff === 'object'
      ? { ...order, ...order._refundRootForSniff }
      : order
  const sniff = normalizeRefundInfo(null, sniffSource)
  if (sniff && !isRefundInfoTerminal(sniff)) return true
  return false
}

/**
 * 方案 B 補齊：列表未帶退款欄位時，對「已完成且尚未匹配待售後」的訂單查 `/refund/progress` 後就地寫入 refund_info。
 * 僅處理主狀態為 completed 的列，避免對全量訂單無差別請求。
 *
 * @param {Array<object>} processedOrders 已 map 的訂單（會就地修改）
 * @param {(orderNo: string) => Promise<any>} getRefundProgress
 * @param {{ maxCandidates?: number, concurrency?: number }} [opts]
 */
export async function hydrateAfterSaleOrdersWithRefundProgress(processedOrders, getRefundProgress, opts = {}) {
  if (!Array.isArray(processedOrders) || typeof getRefundProgress !== 'function') return

  const maxCandidates = opts.maxCandidates ?? 40
  const concurrency = Math.max(1, opts.concurrency ?? 6)

  const candidates = processedOrders.filter((o) => {
    if (!o || !o.orderNo) return false
    if (matchesAfterSaleTab(o)) return false
    const st = String(o.status || '').toLowerCase().trim()
    return st === 'completed'
  })

  const queue = candidates.slice(0, maxCandidates)
  if (queue.length === 0) return

  const pickPayload = (res) => {
    if (res == null || typeof res !== 'object') return null
    const code = res.code
    if (code != null && code !== 200 && code !== 0) return null
    if (Object.prototype.hasOwnProperty.call(res, 'data') && res.data != null) return res.data
    return res
  }

  let cursor = 0
  const runOne = async () => {
    while (true) {
      const i = cursor++
      if (i >= queue.length) break
      const o = queue[i]
      try {
        const res = await getRefundProgress(o.orderNo)
        const body = pickPayload(res)
        if (body == null || (typeof body === 'object' && !Object.keys(body).length)) continue

        const orderCtx = { ...o, ...(o._refundRootForSniff && typeof o._refundRootForSniff === 'object' ? o._refundRootForSniff : {}) }
        const merged = normalizeRefundInfo(typeof body === 'object' ? body : null, { ...orderCtx, ...body })
        if (!merged) continue

        o.refund_info = merged
        o.status = resolveMerchantOrderStatusForRefund('completed', merged)
      } catch (_) {
        // 無退款記錄或網路錯誤：略過
      }
    }
  }

  const workers = Math.min(concurrency, queue.length)
  await Promise.all(Array.from({ length: workers }, () => runOne()))
}
