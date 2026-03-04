<template>
  <view class="log-page">
    <scroll-view 
      class="scroll-area"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <view class="log-list">
        <view 
          v-for="item in pointsLog" 
          :key="item.id || item.created_at" 
          class="log-card"
        >
          <view class="card-left">
            <text class="log-reason">{{ formatFlowType(item.flow_type) || item.reason || item.description || '雨点变动' }}</text>
            <text class="log-time">{{ formatTime(item.created_at || item.create_time || item.time || item.flow_time) }}</text>
            <text v-if="item.order_no || item.orderNo || item.order_number" class="log-order">
              订单：{{ item.order_no || item.orderNo || item.order_number }}
            </text>
          </view>
          <view class="card-right">
            <view class="log-amount" :class="getAmountClass(item)">
              <text class="amount-sign">{{ getAmountSign(item) }}</text>
              <text class="amount-value">{{ formatAmount(item) }}</text>
            </view>
            <text class="source-tag" v-if="item.flow_type || item.points_type || item.type">
              {{ formatFlowType(item.flow_type) || item.points_type || item.type }}
            </text>
          </view>
        </view>
        
        <view v-if="pointsLog.length === 0 && !loading" class="empty-state">
          <text class="empty-icon">📝</text>
          <text class="empty-text">暂无雨点流水记录</text>
        </view>
        
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <view v-if="!hasMore && pointsLog.length > 0" class="no-more">
          <text class="no-more-text">到底了 ~</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getAllPointsFlows } from '@/api/reports.js'

const pointsLog = ref([])
const loading = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(30)
const hasMore = ref(true)
const total = ref(0)

/**
 * 格式化流水类型显示
 */
const formatFlowType = (flowType) => {
  const typeMap = {
    // 英文 key（兼容）
    'subsidy_points': '日补贴收入',
    'referral_points': '推荐奖励收入',
    'team_reward_points': '团队奖励收入',
    'honor_director': '联创星级收入',
    'true_total_points': '优惠券扣减',
    // 中文 key（后端实际返回）
    '周补贴收入': '日补贴收入',
    '推荐奖励收入': '推荐奖励收入',
    '团队奖励收入': '团队奖励收入',
    '联创星级收入': '联创星级收入',
    '优惠券扣减': '优惠券扣减'
  }
  return typeMap[flowType] || flowType
}

/**
 * 格式化时间
 */
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch (e) {
    return timeStr
  }
}

/**
 * 格式化金额
 */
const formatAmount = (item) => {
  // 支持多种字段名：points, amount, change_amount, flow_amount, income_amount
  const val = item.points || item.amount || item.change_amount || item.flow_amount || item.income_amount || 0
  return Math.abs(Number(val)).toFixed(4)
}

const getAmountSign = (item) => {
  const val = item.points || item.amount || item.change_amount || item.flow_amount || item.income_amount || 0
  return Number(val) >= 0 ? '+' : '-'
}

const getAmountClass = (item) => {
  const val = item.points || item.amount || item.change_amount || item.flow_amount || item.income_amount || 0
  return Number(val) >= 0 ? 'positive' : 'negative'
}

/**
 * 加载雨点流水
 */
const loadPointsLog = async (isMore = false) => {
  if (loading.value) return
  
  try {
    loading.value = true
    if (!isMore) {
      page.value = 1
      pointsLog.value = []
    }
    
    // 获取当前用户ID
    const storedUserInfo = uni.getStorageSync('userInfo') || {}
    const userId = storedUserInfo.id || storedUserInfo.user_id
    
    const params = {
      page: page.value,
      page_size: pageSize.value
    }
    
    // 如果存在用户ID，传入user_id参数
    if (userId) {
      params.user_id = userId
    }
    
    console.log('[雨点流水] 调用接口，参数:', params)
    const res = await getAllPointsFlows(params)
    console.log('[雨点流水] 接口响应:', res)
    
    // 解析响应数据
    let list = []
    // 优先检查 data.records（接口返回的数据结构）
    if (res.data?.records && Array.isArray(res.data.records)) {
      list = res.data.records
    } else if (res.data?.rows && Array.isArray(res.data.rows)) {
      list = res.data.rows
    } else if (res.data?.list && Array.isArray(res.data.list)) {
      list = res.data.list
    } else if (res.data?.data && Array.isArray(res.data.data)) {
      list = res.data.data
    } else if (res.records && Array.isArray(res.records)) {
      list = res.records
    } else if (res.rows && Array.isArray(res.rows)) {
      list = res.rows
    } else if (res.list && Array.isArray(res.list)) {
      list = res.list
    } else if (Array.isArray(res.data)) {
      list = res.data
    } else if (Array.isArray(res)) {
      list = res
    }
    
    console.log('[雨点流水] 解析后的数据列表:', list)
    
    // 获取总数信息
    if (res.data?.total !== undefined) {
      total.value = res.data.total
    } else if (res.total !== undefined) {
      total.value = res.total
    } else if (res.data?.pagination?.total !== undefined) {
      total.value = res.data.pagination.total
    } else if (res.data?.pagination?.total_count !== undefined) {
      total.value = res.data.pagination.total_count
    }
    
    console.log('[雨点流水] 解析到', list.length, '条记录, 总数:', total.value)
    
    if (isMore) {
      pointsLog.value = [...pointsLog.value, ...list]
    } else {
      pointsLog.value = list
    }
    
    // 优化 hasMore 判断：优先使用总数，否则根据返回数据量判断
    if (total.value > 0) {
      hasMore.value = pointsLog.value.length < total.value
    } else {
      hasMore.value = list.length >= pageSize.value
    }
    
    if (hasMore.value) {
      page.value++
    }
    
    console.log('[雨点流水] 当前已加载', pointsLog.value.length, '条, 总数:', total.value, ', 还有更多:', hasMore.value)
    
  } catch (error) {
    console.error('[雨点流水] 加载失败:', error)
    uni.showToast({ title: '加载失败: ' + (error.message || '未知错误'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 下拉刷新
 */
const onRefresh = async () => {
  refreshing.value = true
  await loadPointsLog()
  refreshing.value = false
}

/**
 * 加载更多
 */
const loadMore = () => {
  if (hasMore.value && !loading.value) {
    loadPointsLog(true)
  }
}

onLoad((options) => {
  // 设置页面标题
  uni.setNavigationBarTitle({ title: '雨点流水' })
  // 加载数据
  loadPointsLog()
})

onShow(() => {
  // 每次显示时，如果数据为空才刷新，避免不必要的重置
  if (pointsLog.value.length === 0) {
    loadPointsLog()
  }
})
</script>

<style scoped>
.log-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8f9fa;
}

/* Scroll Area */
.scroll-area {
  flex: 1;
  overflow: hidden;
}

/* List */
.log-list {
  padding: 20rpx;
}

.log-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.card-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.log-reason {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.log-time {
  font-size: 24rpx;
  color: #999;
}

.log-order {
  font-size: 24rpx;
  color: #666;
  background: #f0f2f5;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  align-self: flex-start;
  margin-top: 4rpx;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
}

.log-amount {
  font-size: 34rpx;
  font-weight: bold;
}

.log-amount.positive {
  color: #4caf50;
}

.log-amount.negative {
  color: #f44336;
}

.amount-sign {
  font-size: 24rpx;
  margin-right: 2rpx;
}

.source-tag {
  font-size: 20rpx;
  color: #2979ff;
  background: rgba(41, 121, 255, 0.1);
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
  border: 1rpx solid rgba(41, 121, 255, 0.2);
}

/* Empty & States */
.empty-state {
  padding-top: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  color: #999;
  font-size: 28rpx;
}

.loading-state, .no-more {
  padding: 30rpx;
  text-align: center;
}

.loading-text, .no-more-text {
  font-size: 24rpx;
  color: #ccc;
}
</style>