<template>
  <view class="merchant-info-page">
    <view class="page-header">
      <view class="header-left">
        <text class="page-title">已审核商户号</text>
        <text class="page-desc">获取已审核通过的商户号信息，可设为商家</text>
      </view>
      <button class="refresh-wrap" :class="{ disabled: loading }" @tap="handleRefresh" plain hover-class="refresh-hover">
        刷新
      </button>
    </view>

    <view class="list-section">
      <view v-if="loading" class="loading-wrap">
        <text class="loading-dot">●</text>
        <text class="loading-text">加载中...</text>
      </view>
      <view v-else-if="list.length === 0" class="empty-wrap">
        <view class="empty-icon-wrap">
          <text class="empty-icon">📋</text>
        </view>
        <text class="empty-text">暂无已审核通过的商户号</text>
        <text class="empty-hint">完成微信进件审核后将显示在此</text>
      </view>
      <view v-else class="merchant-list">
        <view
          v-for="(item, idx) in list"
          :key="item.sub_mchid || item.merchant_no || item.id || idx"
          class="merchant-item"
        >
          <view class="merchant-main">
            <text class="merchant-no">{{ item.sub_mchid || item.merchant_no || item.business_code || '—' }}</text>
            <text class="merchant-name" v-if="item.subject_info">{{ getSubjectName(item.subject_info) }}</text>
          </view>
          <button
            class="grant-btn"
            :disabled="granting === idx"
            @tap="onGrantMerchant(item, idx)"
          >
            {{ granting === idx ? '处理中...' : '设为商家' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMerchantInfoList } from '@/api/wechat_applyment.js'
import { grantMerchant } from '@/api/auth.js'

const list = ref([])
const loading = ref(false)
const granting = ref(-1)

const getSubjectName = (subject) => {
  if (!subject) return ''
  return subject.company_name || subject.name || ''
}

const handleRefresh = () => {
  if (loading.value) return
  loadList()
}

const loadList = async () => {
  loading.value = true
  try {
    const data = await getMerchantInfoList()
    list.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('获取商户号列表失败', e)
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
    list.value = []
  } finally {
    loading.value = false
  }
}

const onGrantMerchant = async (item, idx) => {
  const mobile = item.mobile || item.contact_mobile || item.sub_mchid || item.merchant_no
  if (!mobile) {
    uni.showToast({ title: '该商户无手机号信息，无法设为商家', icon: 'none' })
    return
  }
  granting.value = idx
  try {
    await grantMerchant(mobile)
    uni.showToast({ title: '设置成功', icon: 'success' })
  } catch (e) {
    console.error('设为商家失败', e)
    uni.showToast({ title: e?.message || '设置失败', icon: 'none' })
  } finally {
    granting.value = -1
  }
}

onMounted(() => loadList())
onShow(() => loadList())
</script>

<style lang="scss" scoped>
.merchant-info-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff8f0 0%, #fafafa 100%);
  padding: 32rpx;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32rpx;
  padding: 24rpx 0;
  .header-left {
    flex: 1;
  }
  .page-title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 1rpx;
  }
  .page-desc {
    display: block;
    font-size: 26rpx;
    color: #8c8c8c;
    margin-top: 12rpx;
    line-height: 1.5;
  }
}

.refresh-wrap {
  flex-shrink: 0;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
  background: #ff9800;
  border: none;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(255, 152, 0, 0.35);
  line-height: 1.4;
  &::after {
    border: none;
  }
  &.disabled {
    opacity: 0.75;
  }
}
.refresh-hover {
  opacity: 0.9;
}

.list-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.loading-wrap {
  text-align: center;
  padding: 100rpx 0;
  .loading-dot {
    display: block;
    font-size: 48rpx;
    color: #ff9800;
    animation: pulse 1s ease-in-out infinite;
    margin-bottom: 16rpx;
  }
  .loading-text {
    font-size: 28rpx;
    color: #8c8c8c;
  }
}

.empty-wrap {
  text-align: center;
  padding: 80rpx 40rpx;
  .empty-icon-wrap {
    width: 120rpx;
    height: 120rpx;
    margin: 0 auto 24rpx;
    background: linear-gradient(135deg, #fff5eb 0%, #ffe8d6 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .empty-icon {
    font-size: 56rpx;
  }
  .empty-text {
    display: block;
    font-size: 30rpx;
    color: #595959;
    font-weight: 500;
  }
  .empty-hint {
    display: block;
    font-size: 24rpx;
    color: #bfbfbf;
    margin-top: 12rpx;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.4 }
}

.merchant-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.merchant-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  background: linear-gradient(135deg, #fffbf7 0%, #fff8f0 100%);
  border-radius: 16rpx;
  border: 1rpx solid #ffe8d6;
}

.merchant-main {
  flex: 1;
  .merchant-no {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: #1a1a1a;
  }
  .merchant-name {
    display: block;
    font-size: 26rpx;
    color: #8c8c8c;
    margin-top: 8rpx;
  }
}

.grant-btn {
  flex-shrink: 0;
  margin-left: 24rpx;
  padding: 16rpx 32rpx;
  font-size: 26rpx;
  color: #fff;
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  border: none;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(255, 152, 0, 0.3);
  &[disabled] {
    opacity: 0.6;
  }
}
</style>
