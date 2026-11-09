<template>
  <view class="reward-history-page">
    <!-- 统计概览 -->
    <view class="stats-overview">
      <view class="stats-card">
        <view class="stat-item main">
          <text class="stat-value">¥{{ totalStats.totalReward }}</text>
          <text class="stat-label">累计团队奖励</text>
          <view v-if="totalStats.trend !== null" class="stat-trend" :class="totalStats.trend > 0 ? 'up' : 'down'">
            <text class="trend-icon">{{ totalStats.trend > 0 ? '↗' : '↘' }}</text>
            <text class="trend-text">{{ Math.abs(totalStats.trend) }}%</text>
          </view>
        </view>
        
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{ totalStats.rewardCount }}</text>
            <text class="stat-label">奖励次数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">¥{{ totalStats.avgReward }}</text>
            <text class="stat-label">平均奖励</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 筛选和排序 -->
    <view class="filter-section">
      <view class="filter-tabs">
        <text 
          v-for="(tab, index) in filterTabs" 
          :key="index"
          class="filter-tab"
          :class="{ active: currentFilter === tab.value }"
          @tap="switchFilter(tab.value)"
        >
          {{ tab.label }}
        </text>
      </view>
      
      <view class="sort-options">
        <text class="sort-btn" @tap="showSortOptions">
          {{ currentSort.label }}
          <text class="sort-arrow">▼</text>
        </text>
      </view>
    </view>

    <!-- 奖励记录列表 -->
    <view class="reward-list">
      <view 
        v-for="record in displayRecords" 
        :key="record.id"
        class="reward-item"
        @tap="viewRewardDetail(record)"
      >
        <view class="reward-icon">
          <text class="icon-text iconfont icon-butie"></text>
          <view class="layer-badge">{{ record.layer }}层</view>
        </view>
        
        <view class="reward-info">
          <view class="reward-header">
            <text class="member-name">{{ record.memberName }}</text>
            <view class="member-level" :class="'level-' + record.memberLevel">
              <text class="level-text">{{ getLevelText(record.memberLevel) }}</text>
            </view>
          </view>
          
          <text class="reward-desc">购买{{ record.productName }}</text>
          <text class="reward-time">{{ record.time }}</text>
          
          <view class="reward-calculation">
            <text class="calc-text">商品金额: ¥{{ record.productAmount }}</text>
            <text class="calc-text">奖励比例: {{ record.rewardRate }}%</text>
          </view>
        </view>
        
        <view class="reward-amount">
          <text class="amount-text">+¥{{ record.rewardAmount }}</text>
          <view class="status-badge" :class="'status-' + record.status">
            <text class="status-text">{{ getStatusText(record.status) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view class="load-more" v-if="hasMore" @tap="loadMore">
      <text class="load-text">{{ loading ? '加载中...' : '加载更多' }}</text>
    </view>

    <!-- 空状态 -->
    <view v-if="displayRecords.length === 0" class="empty-state">
      <text class="empty-icon">📊</text>
      <text class="empty-text">暂无奖励记录</text>
      <text class="empty-desc">邀请更多好友加入团队，开始获得奖励</text>
      <button class="invite-btn" @tap="goToInvite">
        邀请好友
      </button>
    </view>

    <!-- 月度统计图表 -->
    <view class="monthly-chart" v-if="displayRecords.length > 0">
      <view class="chart-header">
        <text class="chart-title">月度奖励趋势</text>
        <text class="chart-subtitle">最近6个月</text>
      </view>
      
      <view class="chart-content">
        <view class="chart-bars">
          <view 
            v-for="(month, index) in monthlyData" 
            :key="index"
            class="chart-bar"
          >
            <view class="bar-fill" :style="{ height: month.percent + '%' }"></view>
            <text class="bar-label">{{ month.month }}</text>
            <text class="bar-value">¥{{ month.amount }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 奖励详情弹窗 -->
    <view v-if="showDetail" class="detail-modal" @tap="hideDetail">
      <view class="detail-content" @tap.stop>
        <view class="detail-header">
          <text class="detail-title">奖励详情</text>
          <text class="detail-close" @tap="hideDetail">×</text>
        </view>
        
        <view class="detail-info" v-if="selectedRecord">
          <view class="info-row">
            <text class="info-label">奖励来源</text>
            <text class="info-value">{{ selectedRecord.memberName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">会员等级</text>
            <text class="info-value">{{ getLevelText(selectedRecord.memberLevel) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">团队层级</text>
            <text class="info-value">第{{ selectedRecord.layer }}层</text>
          </view>
          <view class="info-row">
            <text class="info-label">购买商品</text>
            <text class="info-value">{{ selectedRecord.productName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">商品金额</text>
            <text class="info-value">¥{{ selectedRecord.productAmount }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">奖励比例</text>
            <text class="info-value">{{ selectedRecord.rewardRate }}%</text>
          </view>
          <view class="info-row highlight">
            <text class="info-label">奖励金额</text>
            <text class="info-value">¥{{ selectedRecord.rewardAmount }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">发放时间</text>
            <text class="info-value">{{ selectedRecord.time }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getRewardHistory, getTeamRewards } from '@/api/team.js'

// 统计数据
const totalStats = ref({
  totalReward: 0,
  rewardCount: 0,
  avgReward: 0,
  trend: null
})

// 筛选选项
const filterTabs = ref([
  { label: '全部', value: 'all' },
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' }
])

const currentFilter = ref('all')

// 排序选项
const sortOptions = ref([
  { label: '按时间排序', value: 'time' },
  { label: '按金额排序', value: 'amount' },
  { label: '按层级排序', value: 'layer' }
])

const currentSort = ref(sortOptions.value[0])

// 奖励记录
const rewardRecords = ref([])
const displayRecords = ref([])
const hasMore = ref(true)
const loading = ref(false)
const page = ref(1)

// 月度数据
const monthlyData = ref([])

// 详情弹窗
const showDetail = ref(false)
const selectedRecord = ref(null)

/**
 * 切换筛选
 */
const switchFilter = (filter) => {
  currentFilter.value = filter
  page.value = 1
  loadRewardRecords()
}

/**
 * 显示排序选项
 */
const showSortOptions = () => {
  uni.showActionSheet({
    itemList: sortOptions.value.map(item => item.label),
    success: (res) => {
      currentSort.value = sortOptions.value[res.tapIndex]
      page.value = 1
      loadRewardRecords()
    }
  })
}

/**
 * 筛选记录（本地筛选，因为接口已经按时间筛选）
 */
const filterRecords = () => {
  // 接口已经按时间筛选，这里只需要排序
  displayRecords.value = [...rewardRecords.value]
  sortRecords()
}

/**
 * 排序记录
 */
const sortRecords = () => {
  switch (currentSort.value.value) {
    case 'amount':
      displayRecords.value.sort((a, b) => b.rewardAmount - a.rewardAmount)
      break
    case 'layer':
      displayRecords.value.sort((a, b) => a.layer - b.layer)
      break
    default:
      displayRecords.value.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }
}

/**
 * 加载更多
 */
const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  page.value++
  
  try {
    await loadRewardRecords()
  } catch (error) {
    console.error('加载更多失败', error)
    page.value-- // 回退页码
  } finally {
    loading.value = false
  }
}

/**
 * 查看奖励详情
 */
const viewRewardDetail = (record) => {
  selectedRecord.value = record
  showDetail.value = true
}

/**
 * 隐藏详情
 */
const hideDetail = () => {
  showDetail.value = false
  selectedRecord.value = null
}

/**
 * 获取等级文本
 */
const getLevelText = (level) => {
  const texts = ['普通用户', '一星店长', '二星店长', '三星店长', '四星店长', '五星店长', '六星店长']
  return texts[level] || '普通用户'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    completed: '已到账',
    pending: '处理中',
    failed: '失败'
  }
  return statusMap[status] || '未知'
}

/**
 * 跳转邀请页面
 */
const goToInvite = () => {
  uni.navigateTo({ url: '/page1/invite/invite' })
}

/**
 * 加载奖励统计数据
 */
const loadRewardStats = async () => {
  try {
    const res = await getTeamRewards({ 
      timeFilter: 'all'
    })
    
    if (res.data) {
      totalStats.value = {
        totalReward: parseFloat(res.data.totalReward || 0),
        rewardCount: parseInt(res.data.rewardCount || 0),
        avgReward: res.data.rewardCount > 0 
          ? parseFloat((res.data.totalReward / res.data.rewardCount).toFixed(2))
          : 0,
        trend: res.data.trend == null ? null : parseFloat(res.data.trend)
      }
    }
  } catch (error) {
    console.error('加载奖励统计失败', error)
  }
}

/**
 * 加载奖励记录列表
 */
const loadRewardRecords = async () => {
  try {
    loading.value = true
    
    const params = {
      page: page.value,
      pageSize: 20,
      timeFilter: currentFilter.value,
      sortBy: currentSort.value.value
    }
    
    const res = await getRewardHistory(params)
    
    if (res.data) {
      const newRecords = (res.data.list || []).map(item => ({
        id: item.id,
        memberName: item.from_name || '',
        memberLevel: item.member_level || item.memberLevel || 0,
        layer: item.layer || 1,
        productName: item.product_name || item.productName || item.order_product_name || '商品',
        productAmount: parseFloat(item.product_amount || item.productAmount || item.order_amount || 0),
        rewardAmount: parseFloat(item.reward_amount || item.rewardAmount || item.amount || 0),
        rewardRate: parseFloat(item.reward_rate || item.rewardRate || item.rate || 0),
        time: item.created_at || item.time || '',
        timestamp: new Date(item.created_at || item.time).getTime() || Date.now(),
        status: item.status || 'unknown'
      }))
      
      if (page.value === 1) {
        rewardRecords.value = newRecords
      } else {
        rewardRecords.value = [...rewardRecords.value, ...newRecords]
      }
      
      hasMore.value = res.data.hasMore !== false && newRecords.length >= 20
      
      filterRecords()
    }
  } catch (error) {
    console.error('加载奖励记录失败', error)
    // 接口失败时清空数据，不显示任何模拟数据
    if (page.value === 1) {
      rewardRecords.value = []
      displayRecords.value = []
    }
    uni.showToast({ 
      title: error.message || error.msg || '加载失败', 
      icon: 'none' 
    })
  } finally {
    loading.value = false
  }
}

/**
 * 加载月度数据
 */
const loadMonthlyData = async () => {
  try {
    // 获取最近6个月的数据
    const res = await getTeamRewards({ 
      timeFilter: 'monthly',
      months: 6
    })
    
    if (res.data && res.data.monthlyData) {
      const monthly = res.data.monthlyData
      const maxAmount = Math.max(...monthly.map(m => m.amount || 0), 1)
      
      monthlyData.value = monthly.map(item => ({
        month: item.month || '',
        amount: item.amount || 0,
        percent: maxAmount > 0 ? Math.round((item.amount / maxAmount) * 100) : 0
      }))
    }
  } catch (error) {
    console.error('加载月度数据失败', error)
    monthlyData.value = []
  }
}

onLoad(() => {
  // 初始化数据
  loadRewardStats()
  loadRewardRecords()
  loadMonthlyData()
})
</script>

<style scoped>
.reward-history-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 40rpx;
}

/* 统计概览 */
.stats-overview {
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  color: white;
}

.stats-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.stat-item {
  text-align: center;
}

.stat-item.main {
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16rpx;
  backdrop-filter: blur(10px);
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.stat-item:not(.main) .stat-value {
  font-size: 32rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  opacity: 0.9;
}

.stat-trend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  margin-top: 8rpx;
  font-size: 22rpx;
}

.stats-row {
  display: flex;
  gap: 40rpx;
  justify-content: center;
}

/* 筛选排序 */
.filter-section {
  background: white;
  border-radius: 16rpx;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-tabs {
  display: flex;
  gap: 24rpx;
}

.filter-tab {
  font-size: 26rpx;
  color: #666;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
}

.filter-tab.active {
  background: #3d6bff;
  color: white;
}

.sort-options {
  display: flex;
  align-items: center;
}

.sort-btn {
  font-size: 26rpx;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.sort-arrow {
  font-size: 20rpx;
}

/* 奖励列表 */
.reward-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.reward-item {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.reward-icon {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  background: #fff3cd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  flex-shrink: 0;
}

.layer-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: #ff4757;
  color: white;
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
}

.reward-info {
  flex: 1;
}

.reward-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.member-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.member-level {
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  font-size: 20rpx;
}

.level-1 { background: rgba(192, 192, 192, 0.2); color: #666; }
.level-2 { background: rgba(255, 215, 0, 0.2); color: #b8860b; }
.level-3 { background: rgba(255, 105, 180, 0.2); color: #c71585; }
.level-4 { background: rgba(138, 43, 226, 0.2); color: #8a2be2; }
.level-5 { background: rgba(255, 69, 0, 0.2); color: #ff4500; }
.level-6 { background: rgba(255, 20, 147, 0.2); color: #ff1493; }

.reward-desc {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 4rpx;
}

.reward-time {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.reward-calculation {
  display: flex;
  gap: 16rpx;
}

.calc-text {
  font-size: 20rpx;
  color: #666;
}

.reward-amount {
  text-align: right;
}

.amount-text {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 8rpx;
}

.status-badge {
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  font-size: 20rpx;
}

.status-completed {
  background: #e8f5e9;
  color: #4caf50;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-failed {
  background: #ffebee;
  color: #f44336;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 20rpx;
  background: white;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.load-text {
  font-size: 26rpx;
  color: #3d6bff;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80rpx 40rpx;
  background: white;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
}

.empty-icon {
  display: block;
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  display: block;
  font-size: 32rpx;
  color: #333;
  font-weight: bold;
  margin-bottom: 12rpx;
}

.empty-desc {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 30rpx;
}

.invite-btn {
  width: 200rpx;
  height: 64rpx;
  background: #3d6bff;
  color: white;
  font-size: 26rpx;
  border-radius: 32rpx;
  border: none;
}

/* 月度图表 */
.monthly-chart {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
}

.chart-header {
  text-align: center;
  margin-bottom: 30rpx;
}

.chart-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.chart-subtitle {
  font-size: 24rpx;
  color: #666;
}

.chart-content {
  height: 300rpx;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 200rpx;
  margin-bottom: 20rpx;
  padding-right: 30rpx;
}

.chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.bar-fill {
  width: 40rpx;
  background: linear-gradient(to top, #3d6bff, #6ca4ff);
  border-radius: 4rpx;
  transition: height 0.3s;
}

.bar-label {
  font-size: 22rpx;
  color: #666;
}

.bar-value {
  font-size: 20rpx;
  color: #333;
  font-weight: bold;
}

/* 详情弹窗 */
.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.detail-content {
  background: white;
  border-radius: 20rpx;
  width: 600rpx;
  max-height: 80vh;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.detail-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.detail-close {
  font-size: 48rpx;
  color: #999;
}

.detail-info {
  padding: 30rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f8f9fa;
}

.info-row.highlight {
  background: #f0f8ff;
  margin: 0 -30rpx;
  padding: 16rpx 30rpx;
}

.info-label {
  font-size: 26rpx;
  color: #666;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 600;
}

.info-row.highlight .info-value {
  color: #4caf50;
  font-size: 28rpx;
}
</style>