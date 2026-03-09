<template>
  <view class="records-page">
    <view class="header">
      <text class="title">转化记录</text>
    </view>

    <scroll-view 
      scroll-y 
      class="records-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view 
        v-for="item in records" 
        :key="item.id"
        class="record-item"
      >
        <view class="record-header">
          <text class="fund-type">{{ getFundName(item.fund_type) }}</text>
          <text class="record-amount">-¥{{ formatAmount(item.amount) }}</text>
        </view>
        
        <view class="record-detail">
          <text class="coupon-info">生成优惠券：¥{{ formatAmount(item.coupon_amount) }}</text>
          <text class="record-time">{{ formatTime(item.created_at) }}</text>
        </view>
        
        <view class="record-status" :class="item.status">
          <text>{{ getStatusText(item.status) }}</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading" class="loading-more">加载中...</view>
      <view v-if="noMore" class="no-more">没有更多了</view>
      
      <!-- 空状态 -->
      <view v-if="records.length === 0 && !loading" class="empty-state">
        <text class="empty-icon iconfont icon-dingdanxiaoxi"></text>
        <text class="empty-text">暂无转化记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTransformLogs } from '@/api/fund-pool.js'

const records = ref([])
const loading = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)

const formatAmount = (val) => {
  return Number(val || 0).toFixed(2)
}

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
}

const getFundName = (type) => {
  const names = {
    charity: '公益基金',
    community: '社区店补',
    operation: '运营中心补贴',
    branch: '分公司补贴',
    career: '事业基金',
    public: '公益基金',
    store: '社区店补',
    operation_center: '运营中心补贴',
    company: '分公司补贴',
    career_fund: '事业基金'
  }
  return names[type] || type
}

const getStatusText = (status) => {
  const texts = {
    success: '成功',
    pending: '处理中',
    failed: '失败'
  }
  return texts[status] || status
}

const loadRecords = async (isRefresh = false) => {
  if (loading.value) return
  
  loading.value = true
  if (isRefresh) page.value = 1
  
  try {
    const res = await getTransformLogs({
      page: page.value,
      page_size: pageSize
    })
    
    const list = res.data?.list || res.list || []
    
    if (isRefresh) {
      records.value = list
    } else {
      records.value = [...records.value, ...list]
    }
    
    noMore.value = list.length < pageSize
    if (list.length === pageSize) page.value++
    
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const loadMore = () => {
  if (noMore.value || loading.value) return
  loadRecords()
}

const onRefresh = () => {
  refreshing.value = true
  loadRecords(true)
}

onLoad(() => {
  loadRecords()
})
</script>

<style scoped>
.records-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  padding: 30rpx;
  text-align: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.records-list {
  height: calc(100vh - 100rpx);
  padding: 20rpx;
}

.record-item {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.fund-type {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.record-amount {
  font-size: 32rpx;
  color: #ff6b00;
  font-weight: bold;
}

.record-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.coupon-info {
  font-size: 26rpx;
  color: #4caf50;
}

.record-time {
  font-size: 24rpx;
  color: #999;
}

.record-status {
  display: inline-block;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.record-status.success {
  background: #e8f5e9;
  color: #4caf50;
}

.record-status.pending {
  background: #fff8e1;
  color: #ff8f00;
}

.record-status.failed {
  background: #ffebee;
  color: #f44336;
}

.loading-more, .no-more {
  text-align: center;
  padding: 30rpx;
  color: #999;
  font-size: 26rpx;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 100rpx;
  color: #ddd;
  margin-bottom: 20rpx;
  display: block;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>