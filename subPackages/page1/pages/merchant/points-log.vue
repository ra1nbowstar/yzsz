<template>
  <view class="points-log-page">
    <!-- 积分概览 -->
    <view class="points-overview">
      <view class="points-card">
        <text class="points-label">当前积分</text>
        <text class="points-value">{{ Number(currentPoints).toFixed(4) }} 积分</text>
      </view>
      <view class="points-stats">
        <view class="stat-item">
          <text class="stat-value">+{{ Number(monthEarned).toFixed(4) }}</text>
          <text class="stat-label">本月获得</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">
            {{ monthUsed > 0 ? '-' + Number(monthUsed).toFixed(4) : Number(monthUsed).toFixed(4) }}
          </text>
          <text class="stat-label">本月使用</text>
        </view>
      </view>
    </view>

    <!-- 积分说明 -->
    <view class="points-rule">
      <view class="rule-header">
        <text class="rule-icon">💡</text>
        <text class="rule-title">积分规则</text>
      </view>
      <text class="rule-text">• 订单完成后，消费者按消费额的100%发放积分，商家按消费额的20%发放积分。</text>
      <text class="rule-text">• 积分可用于平台活动和兑换</text>
      <text class="rule-text">• 积分永久有效，不会过期</text>
    </view>

    <!-- 积分流水 -->
    <view class="points-log-section">
      <view class="section-header">
        <text class="section-title">积分流水</text>
        <view class="filter-tabs">
          <text 
            v-for="tab in filterTabs" 
            :key="tab.value"
            class="filter-tab"
            :class="{ active: currentFilter === tab.value }"
            @tap="switchFilter(tab.value)"
          >
            {{ tab.label }}
          </text>
        </view>
      </view>

      <scroll-view 
        class="log-scroll"
        scroll-y
        @scrolltolower="loadMore"
        :lower-threshold="100"
      >
        <view class="log-list">
          <view 
            v-for="log in filteredLogs" 
            :key="log.id"
            class="log-item"
          >
            <view class="log-left">
              <text class="log-icon">{{ log.changeAmount > 0 ? '📈' : '📉' }}</text>
              <view class="log-info">
                <text class="log-reason">{{ log.reason }}</text>
                <text class="log-time">{{ log.createdAt }}</text>
                <text v-if="log.relatedOrder" class="log-order">订单号：{{ log.relatedOrder }}</text>
              </view>
            </view>
            <view class="log-right">
              <text class="log-amount" :class="log.changeAmount > 0 ? 'income' : 'expense'">
                {{ log.changeAmount > 0 ? '+' : '' }}{{ Number(log.changeAmount).toFixed(4) }}
              </text>
            </view>
          </view>

          <!-- 空状态 -->
          <view v-if="filteredLogs.length === 0 && !loading" class="empty-state">
            <text class="empty-icon">📋</text>
            <text class="empty-text">暂无积分流水</text>
          </view>

          <!-- 加载中 -->
          <view v-if="loading && pointsLogs.length > 0" class="loading-more">
            <text class="loading-text">加载中...</text>
          </view>

          <!-- 已加载完 -->
          <view v-if="!hasMore && pointsLogs.length > 0" class="no-more">
            <text class="no-more-text">已显示完</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getCompanyPointsBalance } from '../../api/finance.js'
import { getPoolFlow } from '@/api/reports.js'

const currentPoints = ref(0)
const monthEarned = ref(0)
const monthUsed = ref(0)
const currentFilter = ref('all')
const loading = ref(false)
const page = ref(1)
const pageSize = ref(30)
const hasMore = ref(true)
const totalPages = ref(1)
const total = ref(0)

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' }
]

const pointsLogs = ref([])

// 过滤后的流水
const filteredLogs = computed(() => {
  if (currentFilter.value === 'income') {
    return pointsLogs.value.filter(log => log.changeAmount > 0)
  } else if (currentFilter.value === 'expense') {
    return pointsLogs.value.filter(log => log.changeAmount < 0)
  }
  return pointsLogs.value
})

/**
 * 获取本月日期范围
 */
const getCurrentMonthRange = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)
  
  const formatDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  
  return {
    start_date: formatDate(startDate),
    end_date: formatDate(endDate)
  }
}

const loadPointsData = async (isLoadMore = false) => {
  try {
    // 如果是加载更多，不显示全屏loading，只显示底部loading
    if (!isLoadMore) {
      loading.value = true
    }
    
    // 只在第一页加载时获取积分余额
    if (!isLoadMore) {
      try {
        const pointsRes = await getCompanyPointsBalance()
        const pointsData = pointsRes.data || pointsRes
        currentPoints.value = Number(pointsData.company_points || pointsData.balance || 0)
        console.log('[平台积分流水] 当前积分:', currentPoints.value)
      } catch (pointsError) {
        console.error('[平台积分流水] 获取积分余额失败:', pointsError)
        currentPoints.value = 0
      }
    }
    
    // 获取本月日期范围
    const dateRange = getCurrentMonthRange()
    
    // 调用资金池变动报表接口
    const flowRes = await getPoolFlow({
      account_type: 'company_points',
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      page: page.value,
      page_size: pageSize.value
    })
    
    console.log('[平台积分流水] 流水数据响应:', flowRes)
    
    // 解析响应数据 - 优先检查 records 字段（实际API返回的格式）
    let flowList = []
    if (flowRes.data?.records && Array.isArray(flowRes.data.records)) {
      flowList = flowRes.data.records
      console.log('[平台积分流水] 从 data.records 解析到', flowList.length, '条记录')
    } else if (flowRes.data?.rows && Array.isArray(flowRes.data.rows)) {
      flowList = flowRes.data.rows
      console.log('[平台积分流水] 从 data.rows 解析到', flowList.length, '条记录')
    } else if (flowRes.data?.list && Array.isArray(flowRes.data.list)) {
      flowList = flowRes.data.list
      console.log('[平台积分流水] 从 data.list 解析到', flowList.length, '条记录')
    } else if (flowRes.data?.data && Array.isArray(flowRes.data.data)) {
      flowList = flowRes.data.data
      console.log('[平台积分流水] 从 data.data 解析到', flowList.length, '条记录')
    } else if (Array.isArray(flowRes.data)) {
      flowList = flowRes.data
      console.log('[平台积分流水] 从 data 解析到', flowList.length, '条记录')
    } else if (Array.isArray(flowRes)) {
      flowList = flowRes
      console.log('[平台积分流水] 从根数组解析到', flowList.length, '条记录')
    } else {
      console.warn('[平台积分流水] 无法解析数据格式，原始响应:', flowRes)
    }
    
    console.log('[平台积分流水] 解析到', flowList.length, '条流水记录')
    console.log('[平台积分流水] 第一条记录示例:', flowList[0])
    
    // 转换数据格式
    const newLogs = flowList.map((item) => {
      // 尝试多种字段名来获取金额变化（优先使用 change_amount）
      const amount = Number(item.change_amount || item.amount || item.points || item.balance_change || 0)
      // 尝试多种字段名来获取原因（优先使用 remark）
      const reason = item.remark || item.reason || item.description || item.type || '积分变动'
      // 尝试多种字段名来获取时间（优先使用 created_at）
      const time = item.created_at || item.create_time || item.time || item.date || ''
      // 从 remark 中提取订单号（格式：会员订单#131 或 订单#131）
      let orderNo = ''
      if (item.remark) {
        const orderMatch = item.remark.match(/订单[#]?(\d+)/)
        if (orderMatch && orderMatch[1]) {
          orderNo = orderMatch[1]
        }
      }
      // 如果从 remark 中提取不到，尝试其他字段
      if (!orderNo) {
        orderNo = item.order_number || item.order_no || item.orderNo || item.related_order || ''
      }
      
      return {
        id: item.flow_id || item.id || Date.now() + Math.random(),
        changeAmount: amount,
        reason: reason,
        createdAt: time,
        relatedOrder: orderNo
      }
    })
    
    // 如果是加载更多，追加数据；否则替换数据
    if (isLoadMore) {
      pointsLogs.value = [...pointsLogs.value, ...newLogs]
    } else {
      pointsLogs.value = newLogs
    }
    
    // 获取分页信息（在数据合并后判断）
    if (flowRes.data?.pagination) {
      totalPages.value = flowRes.data.pagination.total_pages || 1
      total.value = flowRes.data.pagination.total || flowRes.data.pagination.total_count || 0
      hasMore.value = pointsLogs.value.length < total.value
      console.log('[平台积分流水] 分页信息 - 当前页:', page.value, '总页数:', totalPages.value, '总数:', total.value, '已加载:', pointsLogs.value.length, '还有更多:', hasMore.value)
    } else if (flowRes.data?.total !== undefined) {
      total.value = flowRes.data.total
      hasMore.value = pointsLogs.value.length < total.value
      console.log('[平台积分流水] 使用总数判断 - 已加载:', pointsLogs.value.length, '总数:', total.value, '还有更多:', hasMore.value)
    } else if (flowRes.total !== undefined) {
      total.value = flowRes.total
      hasMore.value = pointsLogs.value.length < total.value
      console.log('[平台积分流水] 使用总数判断 - 已加载:', pointsLogs.value.length, '总数:', total.value, '还有更多:', hasMore.value)
    } else {
      // 如果没有分页信息，根据返回的数据量判断
      hasMore.value = newLogs.length >= pageSize.value
      console.log('[平台积分流水] 使用数据量判断 - 返回:', newLogs.length, '每页:', pageSize.value, '还有更多:', hasMore.value)
    }
    
    // 更新页码（如果还有更多数据）
    if (hasMore.value && !isLoadMore) {
      page.value = 2 // 首次加载后，下一页是第2页
    } else if (hasMore.value && isLoadMore) {
      page.value++ // 加载更多后，页码递增
    }
    
    // 计算本月统计（基于所有已加载的数据）
    const income = pointsLogs.value
      .filter(log => log.changeAmount > 0)
      .reduce((sum, log) => sum + Number(log.changeAmount), 0)
    const expense = pointsLogs.value
      .filter(log => log.changeAmount < 0)
      .reduce((sum, log) => sum + Number(log.changeAmount), 0)
    
    monthEarned.value = Number(income.toFixed(4))
    monthUsed.value = Number(Math.abs(expense).toFixed(4))
    
    console.log('[平台积分流水] 本月统计 - 获得:', monthEarned.value, '使用:', monthUsed.value)
    console.log('[平台积分流水] 当前已加载', pointsLogs.value.length, '条记录')
  } catch (error) {
    console.error('[平台积分流水] 加载失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
    pointsLogs.value = []
    currentPoints.value = 0
    monthEarned.value = 0
    monthUsed.value = 0
  } finally {
    loading.value = false
  }
}

/**
 * 切换筛选
 */
const switchFilter = (filter) => {
  currentFilter.value = filter
}

/**
 * 加载更多
 */
const loadMore = () => {
  if (hasMore.value && !loading.value) {
    console.log('[平台积分流水] 触发加载更多，当前页:', page.value, '已加载:', pointsLogs.value.length, '还有更多:', hasMore.value)
    // 页码在 loadPointsData 内部更新，这里不需要更新
    loadPointsData(true)
  } else {
    console.log('[平台积分流水] 无法加载更多 - hasMore:', hasMore.value, 'loading:', loading.value, '已加载:', pointsLogs.value.length)
  }
}

onLoad(() => {
  uni.setNavigationBarTitle({ title: '平台积分流水' })
  // 重置分页
  page.value = 1
  hasMore.value = true
  pointsLogs.value = []
  loadPointsData()
})

onShow(() => {
  // 每次显示时，如果数据为空才刷新，避免不必要的重置
  if (pointsLogs.value.length === 0) {
    page.value = 1
    hasMore.value = true
    loadPointsData()
  }
})
</script>

<style scoped>
.points-log-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
}

/* 积分概览 */
.points-overview {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  color: white;
}

.points-card {
  text-align: center;
  margin-bottom: 30rpx;
}

.points-label {
  display: block;
  font-size: 28rpx;
  opacity: 0.9;
  margin-bottom: 16rpx;
}

.points-value {
  display: block;
  font-size: 72rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.points-stats {
  display: flex;
  justify-content: space-around;
  padding-top: 30rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  opacity: 0.8;
}

/* 积分规则 */
.points-rule {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.rule-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.rule-icon {
  font-size: 32rpx;
}

.rule-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.rule-text {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 2;
  padding-left: 20rpx;
}

/* 积分流水 */
.points-log-section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.filter-tabs {
  display: flex;
  gap: 20rpx;
}

.filter-tab {
  font-size: 26rpx;
  color: #999;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: #f5f5f5;
}

.filter-tab.active {
  color: white;
  background: #667eea;
}

.log-scroll {
  height: calc(100vh - 600rpx);
  min-height: 400rpx;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 20rpx;
}

.log-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.log-left {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.log-icon {
  font-size: 36rpx;
  flex-shrink: 0;
  line-height: 1.2;
}

.log-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.log-reason {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.log-time {
  font-size: 24rpx;
  color: #999;
  flex-shrink: 0;
}

.log-order {
  font-size: 22rpx;
  color: #667eea;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-right {
  flex-shrink: 0;
  margin-left: 16rpx;
}

.log-amount {
  font-size: 32rpx;
  font-weight: bold;
  white-space: nowrap;
}

.log-amount.income {
  color: #4caf50;
}

.log-amount.expense {
  color: #f44336;
}

/* 空状态 */
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
  display: block;
  font-size: 28rpx;
  color: #999;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 40rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

/* 加载更多 */
.loading-more {
  text-align: center;
  padding: 30rpx 0;
}

/* 已加载完 */
.no-more {
  text-align: center;
  padding: 30rpx 0;
}

.no-more-text {
  font-size: 26rpx;
  color: #999;
}
</style>
