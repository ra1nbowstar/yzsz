<template>
  <view class="permanent-pay-page">
    <view class="section-card">
      <view class="section-title">
        <text class="iconfont icon-hongbao section-icon"></text>
        <text>扫码付款</text>
      </view>
      <view class="tip">扫码付款：请输入支付金额，确认后进入支付页。支持优惠券，不支持积分抵扣。</view>

      <view v-if="!merchantId" class="error-tip">
        <text>无效的收款码，缺少商家信息。请重新扫描商户的永久收款码。</text>
      </view>
      <view v-else class="form-block">
        <view class="form-item">
          <text class="form-label">支付金额（元）</text>
          <input
            class="form-input"
            type="digit"
            v-model="amount"
            placeholder="请输入金额"
            placeholder-class="placeholder"
          />
        </view>
        <view class="form-item">
          <text class="form-label">商品/备注（选填）</text>
          <input
            class="form-input"
            v-model="productName"
            placeholder="如：商品名称或备注"
            placeholder-class="placeholder"
          />
        </view>
        <button
          class="btn-primary"
          :disabled="submitting || !isAmountValid"
          :class="{ disabled: submitting || !isAmountValid }"
          @tap="goPay"
        >
          {{ submitting ? '创建订单中...' : '去支付' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createOfflinePaymentOrder } from '../../utils/payment.js'
const merchantId = ref(null)
const amount = ref('')
const productName = ref('')
const submitting = ref(false)

const isAmountValid = computed(() => {
  const n = Number(amount.value)
  return !isNaN(n) && n > 0
})

function parseScene(scene) {
  if (!scene || typeof scene !== 'string') return {}
  const decoded = decodeURIComponent(scene)
  const params = {}
  decoded.split('&').forEach((pair) => {
    const [k, v] = pair.split('=')
    if (k && v !== undefined) params[k.trim()] = v.trim()
  })
  return params
}

/** 从 URL 或 query 字符串中解析 id（如 https://hzai.tech/offline?id=27 或 id=27） */
function parseIdFromUrlOrQuery(str) {
  if (!str || typeof str !== 'string') return null
  const s = str.trim()
  let query = s
  if (s.includes('?')) {
    query = s.slice(s.indexOf('?') + 1)
  } else if (s.startsWith('id=') || s.includes('&id=')) {
    query = s
  }
  const params = {}
  query.split('&').forEach((pair) => {
    const [k, v] = pair.split('=')
    if (k && v !== undefined) params[k.trim()] = v.trim()
  })
  return params.id ?? params.merchant_id ?? params.mid ?? params.m ?? null
}

onLoad((options) => {
  options = options || {}
  // 扫码进入带 id 参数时作为商家 id；也兼容 merchant_id / mid / scene、以及启动参数为完整 URL
  let mid = options.id ?? options.merchant_id ?? options.mid
  if (mid == null || mid === '') {
    const scene = options.scene || (options.query && options.query.scene) || options.q
    mid = parseIdFromUrlOrQuery(scene)
    if (mid == null || mid === '') {
      const params = parseScene(scene)
      mid = params.id ?? params.merchant_id ?? params.mid ?? params.m
    }
  }
  if (mid == null || mid === '') {
    for (const v of Object.values(options)) {
      const s = String(v ?? '').trim()
      if (!s) continue
      const parsed = parseIdFromUrlOrQuery(s)
      if (parsed != null && parsed !== '') {
        mid = parsed
        break
      }
    }
  }
  if (mid != null && mid !== '') {
    merchantId.value = parseInt(mid, 10)
    if (isNaN(merchantId.value)) merchantId.value = null
  }
})

async function goPay() {
  if (submitting.value || !isAmountValid.value || !merchantId.value) return
  const amountYuan = Number(amount.value)
  if (amountYuan <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    // 直接使用静态导入的函数
    const res = await createOfflinePaymentOrder({
      merchant_id: merchantId.value,
      store_name: '线下收款',
      amount: amountYuan,
      product_name: (productName.value || '').trim() || '线下收款商品',
      remark: ''
    })
    const data = res && (res.data != null ? res.data : res)
    const orderNo = (data && (data.order_no ?? data.order_number ?? data.orderNo)) || (typeof data === 'string' ? data.trim() : '')
    if (!orderNo) {
      uni.showToast({ title: '创建订单失败，未返回订单号', icon: 'none' })
      return
    }
    uni.redirectTo({
      url: `/pages/offline/pay?orderNo=${encodeURIComponent(orderNo)}&noPoints=1`
    })
  } catch (e) {
    console.error('[永久收款-去支付] 创建订单失败', e)
    const msg = (e && (e.message || e.msg || e.detail)) || '创建订单失败，请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2500 })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.permanent-pay-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
}
.section-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  min-height: 320rpx;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}
.section-icon {
  font-size: 40rpx;
  color: #07c160;
}
.tip {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
  margin-bottom: 32rpx;
}
.error-tip {
  font-size: 28rpx;
  color: #ee0a24;
  padding: 24rpx 0;
}
.form-block {
  margin-top: 16rpx;
}
.form-item {
  margin-bottom: 28rpx;
}
.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}
.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  box-sizing: border-box;
}
.btn-primary {
  width: 100%;
  margin-top: 24rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 48rpx;
  border: none;
}
.btn-primary.disabled {
  opacity: 0.6;
}
</style>
