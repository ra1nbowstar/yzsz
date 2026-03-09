<template>
  <view class="member-points-flow-page">
    <!-- 日期选择 -->
    <view class="date-section">
      <view class="date-item">
        <text class="date-label">开始日期</text>
        <picker mode="date" :value="startDate" @change="onStartDateChange">
          <view class="date-picker">
            <text>{{ startDate || '请选择' }}</text>
            <text class="picker-arrow">></text>
          </view>
        </picker>
      </view>
      <view class="date-item">
        <text class="date-label">结束日期</text>
        <picker mode="date" :value="endDate" :start="startDate" @change="onEndDateChange">
          <view class="date-picker">
            <text>{{ endDate || '请选择' }}</text>
            <text class="picker-arrow">></text>
          </view>
        </picker>
      </view>
      <button class="btn-query" @tap="loadFlowList">查询</button>
    </view>

    <!-- 汇总信息 -->
    <view class="summary-section" v-if="summary">
      <view class="summary-item">
        <text class="summary-label">期初余额：</text>
        <text class="summary-value">{{ formatNumber(summary.opening_balance) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">期末余额：</text>
        <text class="summary-value">{{ formatNumber(summary.closing_balance) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">总收入：</text>
        <text class="summary-value income">{{ formatNumber(summary.total_income) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">总支出：</text>
        <text class="summary-value expense">{{ formatNumber(summary.total_expense) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">净变化：</text>
        <text class="summary-value" :class="summary.net_change >= 0 ? 'income' : 'expense'">
          {{ formatNumber(summary.net_change) }}
        </text>
      </view>
      <view class="summary-item">
        <text class="summary-label">总记录数：</text>
        <text class="summary-value">{{ summary.total_records || 0 }}</text>
      </view>
    </view>

    <!-- 流水列表 -->
    <scroll-view 
      class="flow-scroll" 
      scroll-y 
      @scrolltolower="loadMore"
      :lower-threshold="100"
    >
      <view class="flow-list">
        <view 
          v-for="(item, index) in flowList" 
          :key="item.log_id || index"
          class="flow-item"
        >
          <view class="flow-header">
            <view class="flow-left">
              <text class="flow-type" :class="getFlowTypeClass(item)">
                {{ item.flow_type || getFlowTypeText(item) }}
              </text>
              <text class="flow-time">{{ formatTime(item.created_at) }}</text>
              <text class="flow-user" v-if="item.user_name">用户：{{ item.user_name }}</text>
            </view>
            <view class="flow-right">
              <text class="flow-amount" :class="getAmountClass(item)">
                {{ getAmountSign(item) }}{{ formatNumber(Math.abs(item.change_amount || 0)) }}
              </text>
            </view>
          </view>
          <view class="flow-body">
            <text class="flow-remark">{{ item.reason || '无备注' }}</text>
            <text class="flow-balance">余额：{{ formatNumber(item.balance_after || 0) }}</text>
            <text class="flow-order" v-if="item.related_order_id">订单ID：{{ item.related_order_id }}</text>
          </view>
        </view>
        
        <view v-if="flowList.length === 0 && !loading" class="empty-state">
          <text class="empty-icon">📊</text>
          <text class="empty-text">暂无流水记录</text>
        </view>
        
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <view v-if="!hasMore && flowList.length > 0" class="no-more">
          <text class="no-more-text">已显示全部</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMemberPointsDetailReport } from '@/api/reports.js'

const pageTitle = ref('总会员积分流水')
const startDate = ref('')
const endDate = ref('')
const flowList = ref([])
const summary = ref(null)
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const pageSize = ref(40)

// 初始化默认日期（最近30天）
const initDefaultDate = () => {
  const today = new Date()
  const end = new Date(today)
  const start = new Date(today)
  start.setDate(start.getDate() - 30)
  
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  endDate.value = formatDate(end)
  startDate.value = formatDate(start)
}

/**
 * 开始日期变化
 */
const onStartDateChange = (e) => {
  startDate.value = e.detail.value
}

/**
 * 结束日期变化
 */
const onEndDateChange = (e) => {
  endDate.value = e.detail.value
}

/**
 * 加载流水列表
 */
const loadFlowList = async (append = false) => {
  if (loading.value) return
  
  if (!startDate.value || !endDate.value) {
    uni.showToast({ title: '请选择日期范围', icon: 'none' })
    return
  }
  
  try {
    loading.value = true
    
    if (!append) {
      currentPage.value = 1
      flowList.value = []
      summary.value = null
    }
    
    const res = await getMemberPointsDetailReport({
      start_date: startDate.value,
      end_date: endDate.value,
      page: currentPage.value,
      page_size: pageSize.value
    })
    
    console.log('[总会员积分流水] API响应:', res)
    
    // 解析响应数据
    let newList = []
    let pagination = null
    let summaryData = null
    
    if (res && res.data) {
      // 从 data.records 获取记录列表
      if (res.data.records && Array.isArray(res.data.records)) {
        newList = res.data.records
        pagination = res.data.pagination
        summaryData = res.data.summary
        console.log('[总会员积分流水] 从 records 字段解析到', newList.length, '条记录')
      } else if (Array.isArray(res.data)) {
        newList = res.data
      } else if (res.data.list && Array.isArray(res.data.list)) {
        newList = res.data.list
      }
    } else if (Array.isArray(res)) {
      newList = res
    }
    
    if (append) {
      flowList.value = [...flowList.value, ...newList]
    } else {
      flowList.value = newList
      summary.value = summaryData
    }
    
    // 根据分页信息判断是否还有更多数据
    if (pagination) {
      hasMore.value = currentPage.value < pagination.total_pages
      console.log('[总会员积分流水] 分页信息:', {
        当前页: currentPage.value,
        总页数: pagination.total_pages,
        每页条数: pagination.page_size,
        总记录数: pagination.total,
        还有更多: hasMore.value
      })
    } else {
      // 如果没有分页信息，根据返回数量判断
      hasMore.value = newList.length >= pageSize.value
    }
    
    // 如果还有更多数据，页码加1，准备加载下一页
    if (hasMore.value) {
      currentPage.value++
    }
    
    console.log('[总会员积分流水] 加载完成，当前共', flowList.value.length, '条记录，还有更多:', hasMore.value)
  } catch (error) {
    console.error('[总会员积分流水] 加载失败:', error)
    uni.showToast({ title: error.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
const loadMore = () => {
  console.log('[总会员积分流水] 滚动到底部，触发加载更多', {
    loading: loading.value,
    hasMore: hasMore.value,
    currentPage: currentPage.value
  })
  
  if (!loading.value && hasMore.value) {
    loadFlowList(true)
  }
}

/**
 * 获取流水类型文本
 */
const getFlowTypeText = (item) => {
  if (item.flow_type) {
    return item.flow_type
  }
  const amount = item.change_amount || 0
  if (amount > 0) {
    return '收入'
  } else if (amount < 0) {
    return '支出'
  }
  return '其他'
}

/**
 * 获取流水类型样式类
 */
const getFlowTypeClass = (item) => {
  const flowType = item.flow_type
  if (flowType === '收入' || flowType === 'income' || flowType === 'in' || flowType === 'deposit') {
    return 'type-income'
  } else if (flowType === '支出' || flowType === 'expense' || flowType === 'out' || flowType === 'withdraw') {
    return 'type-expense'
  }
  
  const amount = item.change_amount || 0
  if (amount > 0) {
    return 'type-income'
  } else if (amount < 0) {
    return 'type-expense'
  }
  return 'type-other'
}

/**
 * 获取金额样式类
 */
const getAmountClass = (item) => {
  const amount = item.change_amount || 0
  if (amount > 0) {
    return 'amount-income'
  } else if (amount < 0) {
    return 'amount-expense'
  }
  return 'amount-zero'
}

/**
 * 获取金额符号
 */
const getAmountSign = (item) => {
  const amount = item.change_amount || 0
  if (amount > 0) {
    return '+'
  } else if (amount < 0) {
    return '-'
  }
  return ''
}

/**
 * 格式化数字
 */
const formatNumber = (num) => {
  return Number(num || 0).toFixed(4)
}

/**
 * 本地时区偏移，格式 +HH:mm 或 -HH:mm
 */
const getLocalTZOffset = () => {
  const offsetMin = -new Date().getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const absMin = Math.abs(offsetMin)
  const hh = String(Math.floor(absMin / 60)).padStart(2, '0')
  const mm = String(absMin % 60).padStart(2, '0')
  return `${sign}${hh}:${mm}`
}

let _dateFormatWarningShown = false

const normalizeToISO = (time) => {
  if (!time) return time
  if (time instanceof Date) return time.toISOString()
  if (typeof time === 'number') return new Date(time).toISOString()
  let s = String(time).trim()

  if (/T/.test(s) && /[Zz]|[+\-]\d{2}:?\d{2}$/.test(s)) {
    if (/T\d{2}:\d{2}$/.test(s)) s = s.replace(/T(\d{2}:\d{2})$/, 'T$1:00')
    s = s.replace(/([+\-]\d{2})(\d{2})$/, '$1:$2')
    return s
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s) || /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
    try {
      const suppressed = uni.getStorageSync && uni.getStorageSync('suppressDateFormatWarning')
      if (!suppressed && !_dateFormatWarningShown) {
        _dateFormatWarningShown = true
        uni.showModal({
          title: '时间格式兼容提示',
          content: '检测到后端返回的时间字符串格式可能在部分 iOS 环境下无法解析（例如 "yyyy-MM-dd HH:mm:ss"）。客户端已自动转换为兼容的 ISO 时间字符串（例如 yyyy-MM-ddTHH:mm:ss+08:00）。如果不想再看到此提示，请点击“不再提醒”，变更将在下次编译后生效。',
          showCancel: true,
          cancelText: '不再提醒',
          confirmText: '知道了',
          success: (res) => {
            if (!res.confirm) {
              try {
                uni.setStorageSync && uni.setStorageSync('suppressDateFormatWarning', '1')
                uni.showToast && uni.showToast({ title: '已设置，不再提醒（下次编译后生效）', icon: 'none' })
              } catch (e) {
                console.warn('[时间提示] 无法写入本地存储', e)
              }
            }
          }
        })
      }
    } catch (e) {
      console.warn('[时间提示] 检查不再提醒失败', e)
    }

    s = s.replace(' ', 'T')
    s = s.replace(/\//g, '-')
    if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(s)) {
      s = s + getLocalTZOffset()
    } else {
      s = s.replace(/([+\-]\d{2})(\d{2})$/, '$1:$2')
    }
    return s
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    s = s + 'T00:00:00' + getLocalTZOffset()
    return s
  }

  return s
}

/**
 * 格式化时间为 yyyy-MM-ddTHH:mm:ss+HH:mm（保证在 iOS 上解析可靠）
 */
const formatTime = (time) => {
  if (!time) return ''
  const normalized = normalizeToISO(time)
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return String(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const tz = getLocalTZOffset()
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${tz}`
}

onLoad((options) => {
  if (options.title) {
    pageTitle.value = decodeURIComponent(options.title)
    uni.setNavigationBarTitle({
      title: pageTitle.value
    })
  }
  
  initDefaultDate()
  loadFlowList()
})
</script>

<style scoped>
.member-points-flow-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.date-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.date-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.date-label {
  font-size: 28rpx;
  color: #333;
  min-width: 120rpx;
}

.date-picker {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
}

.picker-arrow {
  font-size: 24rpx;
  color: #999;
}

.btn-query {
  padding: 24rpx;
  background: #3d6bff;
  color: white;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
  margin-top: 10rpx;
}

.summary-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-label {
  font-size: 28rpx;
  color: #666;
}

.summary-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.summary-value.income {
  color: #2e7d32;
}

.summary-value.expense {
  color: #c62828;
}

.flow-scroll {
  height: calc(100vh - 400rpx);
}

.flow-list {
  padding: 0 30rpx 30rpx;
}

.flow-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}
/* 修改 .flow-header */
.flow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  gap: 20rpx; /* 添加间距 */
}

/* 修改 .flow-left */
.flow-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  min-width: 0; /* 关键：允许flex子项收缩 */
  overflow: hidden; /* 防止内容溢出 */
}

.flow-type {
  font-size: 28rpx;
  font-weight: 600;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  display: inline-block;
  width: fit-content;
  max-width: 100%; /* 限制最大宽度 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-type.type-income {
  background: #e8f5e9;
  color: #2e7d32;
}

.flow-type.type-expense {
  background: #ffebee;
  color: #c62828;
}

.flow-type.type-other {
  background: #f5f5f5;
  color: #666;
}

.flow-time {
  font-size: 24rpx;
  color: #999;
}

.flow-user {
  font-size: 24rpx;
  color: #666;
}

/* 修改 .flow-right */
.flow-right {
  display: flex;
  align-items: center;
  flex-shrink: 0; /* 关键：防止被压缩 */
  min-width: fit-content; /* 根据内容自适应宽度 */
}

/* 修改 .flow-amount（第323行） */
.flow-amount {
  font-size: 32rpx;
  font-weight: bold;
  white-space: nowrap; /* 防止金额换行 */
}

.flow-amount.amount-income {
  color: #2e7d32;
}

.flow-amount.amount-expense {
  color: #c62828;
}

.flow-amount.amount-zero {
  color: #666;
}

.flow-body {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.flow-remark {
  font-size: 26rpx;
  color: #666;
}

.flow-balance {
  font-size: 24rpx;
  color: #999;
}

.flow-order {
  font-size: 24rpx;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.loading-state {
  text-align: center;
  padding: 40rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.no-more {
  text-align: center;
  padding: 40rpx 0;
}

.no-more-text {
  font-size: 24rpx;
  color: #ccc;
}
</style>

