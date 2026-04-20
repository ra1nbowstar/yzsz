<template>
  <view class="batch-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">批量发放优惠券</text>
      <text class="page-desc">为多个用户一次性发放优惠券/红包</text>
    </view>

    <!-- 表单卡片 -->
    <view class="form-card">
      <!-- 用户ID输入区域 -->
      <view class="form-item">
        <text class="label">用户ID <text class="required">*</text></text>
        <view class="input-wrapper">
          <textarea
            v-model="userIdsText"
            placeholder="支持批量输入"
            auto-height
            class="input-textarea"
          />
        </view>
        <text class="tip">支持批量输入，每行一个，或用空格/逗号分隔</text>
      </view>

      <!-- 面额输入 -->
      <view class="form-item">
        <text class="label">优惠券面额（元）<text class="required">*</text></text>
        <view class="input-wrapper">
          <input
            v-model="amount"
            type="digit"
            placeholder="0.00"
            class="input"
          />
        </view>
        <text class="tip">可输入小数，例如 0.01 或 10.50</text>
      </view>

      <!-- 适用商品类型选择 -->
      <view class="form-item">
        <text class="label">适用商品类型<text class="required">*</text></text>
        <picker @change="onTypeChange" :range="typeOptions" range-key="label">
          <view class="picker-wrapper">
            <view class="picker-value">{{ selectedTypeLabel }}</view>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <text class="tip">选择优惠券适用的商品范围</text>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="footer-action">
      <button
        type="primary"
        @tap="submit"
        :disabled="submitting"
        :loading="submitting"
        class="submit-btn"
      >
        立即发放
      </button>
    </view>
  </view>
</template>

<script setup>
import request from '@/utils/request.js'
import { ref } from 'vue'

const userIdsText = ref('')
const amount = ref('')
const selectedType = ref('all')
const typeOptions = [
  { label: '全场通用', value: 'all' },
  { label: '仅普通商品', value: 'normal_only' },
  { label: '仅会员商品', value: 'member_only' }
]
const selectedTypeLabel = ref('全场通用')

const onTypeChange = (e) => {
  const index = e.detail.value
  selectedType.value = typeOptions[index].value
  selectedTypeLabel.value = typeOptions[index].label
}

const submitting = ref(false)

const submit = async () => {
  const ids = userIdsText.value
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(s => s !== '')
    .map(s => parseInt(s, 10))
    .filter(id => !isNaN(id))

  if (ids.length === 0) {
    uni.showToast({ title: '请输入至少一个有效的用户ID', icon: 'none' })
    return
  }

  const amountNum = parseFloat(amount.value)
  if (isNaN(amountNum) || amountNum <= 0) {
    uni.showToast({ title: '请输入有效的优惠金额', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const res = await request.post('/api/coupons/distribute-batch', {
      user_ids: ids,
      amount: amountNum,
      coupon_type: 'user',
      applicable_product_type: selectedType.value
    })

    // 解析后端返回的数据（假设格式为 { success_count, failed_users, coupon_ids }）
    const { success_count = 0, failed_users = [], coupon_ids = [] } = res.data || {}

    let message = `成功发放 ${success_count} 张优惠券`
    if (failed_users.length > 0) {
      const failList = failed_users.map(f => `用户ID ${f.user_id}：${f.reason}`).join('\n')
      message += `\n\n失败 ${failed_users.length} 个用户：\n${failList}`
    }

    uni.showModal({
      title: '发放完成',
      content: message,
      showCancel: false,
      confirmText: '确定',
      success: () => {
        uni.navigateBack()
      }
    })
  } catch (err) {
    console.error(err)
    uni.showToast({ title: err.message || '发放失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.batch-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
}

.page-header {
  margin-bottom: 40rpx;
}

.page-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.page-desc {
  font-size: 26rpx;
  color: #999;
}

.form-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 30rpx;
}

.form-item {
  margin-bottom: 40rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.required {
  color: #ff4757;
  margin-left: 4rpx;
}

.input-wrapper, .picker-wrapper {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 24rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.input-wrapper:focus-within {
  border-color: #3d6bff;
  background: #fff;
}

.input-textarea {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
  color: #333;
  background: transparent;
  padding: 0;
}

.input {
  width: 100%;
  font-size: 28rpx;
  color: #333;
  background: transparent;
  padding: 0;
}

.picker-value {
  font-size: 28rpx;
  color: #333;
  flex: 1;
}

.picker-arrow {
  font-size: 24rpx;
  color: #999;
  margin-left: 20rpx;
}

.tip {
  display: block;
  font-size: 22rpx;
  color: #aaa;
  margin-top: 12rpx;
}

.footer-action {
  margin-top: 60rpx;
}

.submit-btn {
  background: linear-gradient(135deg, #07c160, #06ad56);
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 600;
  height: 96rpx;
  line-height: 96rpx;
  box-shadow: 0 10rpx 30rpx rgba(6, 173, 86, 0.3);
  border: none;
  width: 100%;
}

.submit-btn:active {
  transform: scale(0.98);
}
</style>