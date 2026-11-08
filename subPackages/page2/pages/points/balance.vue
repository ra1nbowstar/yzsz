<template>
  <view class="balance-page">
    <!-- 积分余额卡片 -->
    <view class="balance-card">
      <view class="balance-header">
        <text class="balance-title">我的积分</text>
        <text class="balance-subtitle">Points Balance</text>
      </view>
      <view class="balance-amount">
        <text class="amount-number">{{ currentPointsDisplay }}</text>
        <text class="amount-unit">分</text>
      </view>
    </view>


    <!-- 积分流水 -->
    <view class="points-log">
      <view class="log-header">
        <text class="log-title">积分明细</text>
      </view>
      
      <scroll-view 
        class="log-scroll"
        scroll-y
        @scrolltolower="loadMore"
        :lower-threshold="100"
      >
        <view class="log-list">
          <view 
            v-for="(item, index) in pointsLog" 
            :key="item.id || index" 
            class="log-item"
          >
            <view class="log-info">
              <text class="log-reason">{{ item.reason || item.description || '积分变动' }}</text>
              <text class="log-time">{{ formatTime(item.created_at || item.time || item.createTime) }}</text>
            </view>
            <view class="log-amount" :class="getAmountClass(item)">
              <text class="amount-sign">{{ getAmountSign(item) }}</text>
              <text class="amount-value">{{ getAmountValue(item) }}</text>
            </view>
          </view>
          
          <view v-if="loadError && pointsLog.length === 0 && !loading" class="empty-state">
            <text class="empty-icon">⚠️</text>
            <text class="empty-text">{{ loadError }}</text>
          </view>

          <view v-if="!loadError && pointsLog.length === 0 && !loading" class="empty-state">
            <text class="empty-icon">📝</text>
            <text class="empty-text">暂无积分记录</text>
          </view>
          
          <view v-if="loading && pointsLog.length > 0" class="loading-more">
            <text class="loading-text">加载中...</text>
          </view>
          
          <view v-if="!hasMore && pointsLog.length > 0" class="no-more">
            <text class="no-more-text">已显示全部</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getPointsBalance, getPointsLog } from '@/api/points.js'

// 会员积分（只显示 member 积分）
const memberPoints = ref(0)

// 积分流水
const pointsLog = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
const total = ref(0)
const loadError = ref('')

// 当前显示的积分（只显示会员积分）
const currentPointsDisplay = computed(() => {
  return Number(memberPoints.value).toFixed(4)
})

/**
 * 加载积分余额
 */
const loadPointsBalance = async () => {
  try {
    loading.value = true
    const res = await getPointsBalance()
    console.log('[积分余额] API响应:', res)
    
    if (res.data) {
      memberPoints.value = Number(res.data.member_points || 0)
      console.log('[积分余额] 会员积分:', memberPoints.value)
    }
  } catch (error) {
    console.error('[积分余额] 加载失败:', error)
    memberPoints.value = 0
    uni.showToast({ 
      title: error.message || '加载失败', 
      icon: 'none' 
    })
  } finally {
    loading.value = false
  }
}

/**
 * 加载积分流水（只加载 member 类型）
 */
const loadPointsLog = async (isMore = false) => {
  if (loading.value) return
  
  try {
    loading.value = true
    if (!isMore) {
      page.value = 1
      pointsLog.value = []
      hasMore.value = true
      loadError.value = ''
    }
    
    console.log('[积分流水] 开始加载,类型: member, 页码:', page.value)
    
    const res = await getPointsLog({ 
      page: page.value,
      size: pageSize.value,
      points_type: 'member' 
    })
    
    console.log('[积分流水] API完整响应:', JSON.stringify(res, null, 2))
    console.log('[积分流水] 当前积分余额:', memberPoints.value)
    
    let apiLogs = []
    
    // 尝试多种方式解析数据
    if (res.data?.rows && Array.isArray(res.data.rows)) {
      apiLogs = res.data.rows
      total.value = res.data.total || res.data.totalCount || res.data.total_count || apiLogs.length
      console.log('[积分流水] 从 res.data.rows 解析到', apiLogs.length, '条记录, 总数:', total.value)
    } else if (res.rows && Array.isArray(res.rows)) {
      apiLogs = res.rows
      total.value = res.total || res.totalCount || res.total_count || apiLogs.length
      console.log('[积分流水] 从 res.rows 解析到', apiLogs.length, '条记录, 总数:', total.value)
    } else if (res.data?.list && Array.isArray(res.data.list)) {
      apiLogs = res.data.list
      total.value = res.data.total || res.data.totalCount || res.data.total_count || apiLogs.length
      console.log('[积分流水] 从 res.data.list 解析到', apiLogs.length, '条记录, 总数:', total.value)
    } else if (res.data?.data && Array.isArray(res.data.data)) {
      apiLogs = res.data.data
      total.value = res.data.total || res.data.totalCount || res.data.total_count || apiLogs.length
      console.log('[积分流水] 从 res.data.data 解析到', apiLogs.length, '条记录, 总数:', total.value)
    } else if (res.data?.records && Array.isArray(res.data.records)) {
      apiLogs = res.data.records
      total.value = res.data.total || res.data.totalCount || res.data.total_count || apiLogs.length
      console.log('[积分流水] 从 res.data.records 解析到', apiLogs.length, '条记录, 总数:', total.value)
    } else if (res.list && Array.isArray(res.list)) {
      apiLogs = res.list
      total.value = res.total || res.totalCount || res.total_count || apiLogs.length
      console.log('[积分流水] 从 res.list 解析到', apiLogs.length, '条记录, 总数:', total.value)
    } else if (Array.isArray(res.data)) {
      apiLogs = res.data
      total.value = res.total || res.totalCount || res.total_count || apiLogs.length
      console.log('[积分流水] 从 res.data 解析到', apiLogs.length, '条记录, 总数:', total.value)
    } else if (Array.isArray(res)) {
      apiLogs = res
      total.value = res.length
      console.log('[积分流水] 从 res 解析到', apiLogs.length, '条记录')
    } else {
      console.warn('[积分流水] 无法解析响应数据,响应结构:', Object.keys(res))
      console.warn('[积分流水] 完整响应对象:', res)
      // 尝试深度查找数组数据
      const findArrayInObject = (obj, depth = 0) => {
        if (depth > 3) return null
        if (Array.isArray(obj)) return obj
        if (typeof obj !== 'object' || obj === null) return null
        for (const key in obj) {
          const result = findArrayInObject(obj[key], depth + 1)
          if (result) return result
        }
        return null
      }
      const foundArray = findArrayInObject(res)
      if (foundArray) {
        apiLogs = foundArray
        total.value = foundArray.length
        console.log('[积分流水] 深度查找找到数组数据:', apiLogs.length, '条记录')
      }
    }
    
    console.log('[积分流水] 解析后的数据:', apiLogs)
    console.log('[积分流水] 解析后的数据数量:', apiLogs.length)
    
    // 如果有积分余额但API返回了空数组，记录警告
    if (memberPoints.value > 0 && apiLogs.length === 0) {
      console.warn('[积分流水] ⚠️ 有积分余额(' + memberPoints.value + ')但没有流水记录，可能是：1. 后端未返回历史流水 2. 后端过滤了流水记录')
    } else if (memberPoints.value === 0 && apiLogs.length === 0) {
      console.warn('[积分流水] ⚠️ 积分为0且没有流水记录，可能是：1. 后端未返回历史流水 2. 用户确实没有积分变动记录')
    }
    
    if (isMore) {
      pointsLog.value = [...pointsLog.value, ...apiLogs]
    } else {
      pointsLog.value = apiLogs
    }
    
    // 判断是否还有更多数据
    if (total.value > 0) {
      hasMore.value = pointsLog.value.length < total.value
    } else {
      hasMore.value = apiLogs.length >= pageSize.value
    }
    
    if (hasMore.value) {
      page.value++
    }
    
    console.log('[积分流水] 当前已加载', pointsLog.value.length, '条, 总数:', total.value, ', 还有更多:', hasMore.value)
  } catch (error) {
    console.error('[积分流水] 加载失败:', error)
    console.error('[积分流水] 错误详情:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      fullError: error
    })
    
    // 即使加载失败，也显示错误提示
    if (!isMore) {
      pointsLog.value = []
      loadError.value = (error && error.code === 403) ? '暂无权限查看该流水' : '流水加载失败，请稍后重试'
      console.warn('[埋点][积分流水加载失败]', { code: error && error.code, msg: error && (error.message || error.msg) })
      // 如果是网络错误或API错误，给用户提示
      if (error.message && !error.message.includes('手机号')) {
        uni.showToast({
          title: loadError.value,
          icon: 'none',
          duration: 3000
        })
      }
    }
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
const loadMore = () => {
  if (hasMore.value && !loading.value) {
    loadPointsLog(true)
  }
}


/**
 * 格式化时间
 */
const formatTime = (timeStr) => {
  if (!timeStr) return '未知时间'
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

/**
 * 获取金额样式类
 */
const getAmountClass = (item) => {
  const amount = item.change_amount || item.amount || item.points || 0
  return Number(amount) > 0 ? 'positive' : 'negative'
}

/**
 * 获取金额符号
 */
const getAmountSign = (item) => {
  const amount = item.change_amount || item.amount || item.points || 0
  return Number(amount) > 0 ? '+' : ''
}

/**
 * 获取金额值
 */
const getAmountValue = (item) => {
  const amount = item.change_amount || item.amount || item.points || 0
  return Number(amount).toFixed(4)
}

/**
 * 查看全部流水
 */
const viewAllLog = () => {
  uni.navigateTo({ url: '/subPackages/page2/pages/points/log' })
}

onMounted(async () => {
  // 先加载积分余额
  await loadPointsBalance()
  // 然后加载积分流水
  loadPointsLog()
})
</script>

<style scoped>
.balance-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
}

.balance-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}

.balance-title {
  font-size: 32rpx;
  color: #fff;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.balance-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.balance-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 12rpx;
}

.amount-number {
  font-size: 72rpx;
  font-weight: bold;
  color: #fff;
  line-height: 1;
}

.amount-unit {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.9);
}

/* Tab导航 */
.points-tabs {
  display: flex;
  background: white;
  border-radius: 20rpx;
  padding: 8rpx;
  margin-bottom: 30rpx;
  gap: 8rpx;
}

.points-tabs .tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 20rpx;
  border-radius: 16rpx;
  background: #f5f5f5;
  transition: all 0.3s;
}

.points-tabs .tab-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.points-tabs .tab-text {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.points-tabs .tab-item.active .tab-text {
  color: white;
  font-weight: 600;
}

.points-tabs .tab-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.points-tabs .tab-item.active .tab-amount {
  color: white;
}

/* 积分流水 */
.points-log {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  height: calc(100vh - 300rpx);
  display: flex;
  flex-direction: column;
}

.log-scroll {
  flex: 1;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.log-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.log-more {
  font-size: 26rpx;
  color: #667eea;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.log-item:last-child {
  border-bottom: none;
}

.log-info {
  flex: 1;
}

.log-reason {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.log-time {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.log-amount {
  display: flex;
  align-items: center;
  font-size: 32rpx;
  font-weight: bold;
  flex-shrink: 0;
}

.log-amount.positive {
  color: #4caf50;
}

.log-amount.negative {
  color: #f44336;
}

.empty-state {
  text-align: center;
  padding: 80rpx 0;
}

.empty-icon {
  display: block;
  font-size: 80rpx;
  margin-bottom: 20rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.loading-more, .no-more {
  padding: 30rpx;
  text-align: center;
}

.loading-text, .no-more-text {
  font-size: 24rpx;
  color: #999;
}
</style>
