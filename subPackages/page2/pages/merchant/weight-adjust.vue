<template>
  <view class="weight-page">
    <view class="section-card">
      <view class="section-title">
        <text class="iconfont icon-shezhi section-icon"></text>
        <text>权重调整</text>
      </view>
      <text class="tip">直推奖励比例：GET/POST /api/fund-pools/direct-referral-reward-rate，与 FinanceService.get/set_direct_referral_reward_rate 及常量 DEFAULT_DIRECT_REFERRAL_REWARD_RATE 对应；合法范围 (0, 1]。</text>
    </view>

    <view class="section-card">
      <view class="field-head">
        <text class="field-label">直推奖励比例 rate</text>
      </view>
      <input
        class="rate-input"
        type="digit"
        :value="rateInputText"
        placeholder="例如 0.25"
        @input="onRateInput"
      />
      <text class="hint-below">{{ percentHint }}</text>
    </view>

    <view class="footer-actions">
      <button class="btn-reset" :loading="loading" @tap="reload">重新加载</button>
      <button class="btn-save" type="primary" :loading="saving" @tap="save">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getDirectReferralRewardRate,
  setDirectReferralRewardRate
} from '@/api/fund-pool.js'

const rate = ref(0.25)
const rateInputText = ref('0.25')
const loading = ref(false)
const saving = ref(false)

const parseRateFromResponse = (res) => {
  const d = res && (res.data != null && typeof res.data === 'object' ? res.data : res)
  if (!d || typeof d !== 'object') return null
  const raw = d.rate ?? d.direct_referral_reward_rate ?? d.directReferralRewardRate
  if (raw == null || raw === '') return null
  const n = parseFloat(String(raw))
  return Number.isFinite(n) ? n : null
}

const clampOpen01 = (n) => {
  if (!Number.isFinite(n)) return 0.25
  if (n <= 0) return 0.001
  if (n > 1) return 1
  return Math.round(n * 10000) / 10000
}

const percentHint = computed(() => {
  const n = parseFloat(String(rateInputText.value))
  if (!Number.isFinite(n)) return '请输入 (0, 1] 内的小数，如 0.25 表示 25%'
  if (n <= 0 || n > 1) return '当前数值不在合法范围 (0, 1]'
  return `约 ${(n * 100).toFixed(2)}%（rate=${n}）`
})

const syncInputFromRate = () => {
  const r = clampOpen01(rate.value)
  rateInputText.value = String(r)
}

const onRateInput = (e) => {
  const v = e?.detail?.value ?? ''
  rateInputText.value = v
  const n = parseFloat(String(v))
  rate.value = Number.isFinite(n) ? n : rate.value
}

const reload = async (opts = {}) => {
  const silent = opts.silent === true
  loading.value = true
  try {
    const res = await getDirectReferralRewardRate()
    const r = parseRateFromResponse(res)
    if (r != null) {
      rate.value = clampOpen01(r)
      syncInputFromRate()
      if (!silent) uni.showToast({ title: '已同步', icon: 'success' })
    } else if (!silent) {
      uni.showToast({ title: '未解析到 rate 字段', icon: 'none' })
    }
  } catch (err) {
    console.error('[直推比例] 加载失败', err)
    uni.showToast({ title: err?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const save = async () => {
  const r = parseFloat(String(rateInputText.value).trim())
  if (!Number.isFinite(r) || !(r > 0 && r <= 1)) {
    uni.showToast({ title: '比例须在 (0, 1] 之间', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await setDirectReferralRewardRate(r)
    rate.value = r
    syncInputFromRate()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (err) {
    console.error('[直推比例] 保存失败', err)
    uni.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  reload({ silent: true })
})
</script>

<style scoped>
.weight-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.section-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
}

.section-icon {
  font-size: 36rpx;
  color: #673ab7;
}

.tip {
  font-size: 24rpx;
  color: #888;
  line-height: 1.55;
}

.field-head {
  margin-bottom: 16rpx;
}

.field-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.rate-input {
  width: 100%;
  box-sizing: border-box;
  height: 80rpx;
  padding: 0 24rpx;
  background: #f8f9fb;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.hint-below {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #888;
  line-height: 1.45;
}

.footer-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  display: flex;
  gap: 20rpx;
}

.btn-reset {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 28rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  color: #555;
}

.btn-save {
  flex: 2;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  border-radius: 12rpx;
}
</style>
