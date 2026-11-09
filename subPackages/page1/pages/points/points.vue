<template>
  <scroll-view 
    class="points-page"
    scroll-y
    refresher-enabled
    :refresher-triggered="refreshing"
    @refresherrefresh="onRefresh"
    @refresherrestore="onRestore"
  >
    <!-- 积分余额卡片 -->
    <view class="balance-card">
      <view class="balance-header">
        <text class="balance-title">我的积分</text>
        <text class="balance-subtitle">Points Balance</text>
      </view>
      <view class="balance-amount">
        <text class="amount-number">{{ currentPointsBalance }}</text>
        <text class="amount-unit">分</text>
      </view>
      <view class="balance-actions">
      </view>
    </view>

    <!-- Tab导航 -->
    <view class="points-tabs">
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 'member' }"
        @tap="switchTab('member')"
      >
        <text class="tab-text">会员积分</text>
        <text class="tab-amount">{{ memberPointsDisplay }}</text>
      </view>
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 'merchant' }"
        @tap="switchTab('merchant')"
      >
        <text class="tab-text">商家积分</text>
        <text class="tab-amount">{{ merchantPointsDisplay }}</text>
      </view>
    </view>

    <!-- 积分流水入口 -->
    <view class="points-log">
      <view class="log-header">
        <text class="log-title">积分明细</text>
        <text class="log-more" @tap="viewAllLog">查看全部</text>
      </view>
      
      <scroll-view 
        class="log-scroll"
        scroll-y
        @scrolltolower="loadMore"
        :lower-threshold="100"
      >
        <view class="log-list">
          <view 
            v-for="item in pointsLog" 
            :key="item.id" 
            class="log-item"
          >
            <view class="log-info">
              <view class="reason-row">
                <text class="source-tag" :class="item.source">
                  {{ item.source === 'merchant' ? '平台' : '用户' }}
                </text>
                <text class="log-reason">{{ item.reason }}</text>
              </view>
              <text class="log-time">{{ formatTime(item.created_at) }}</text>
              <text v-if="item.related_order" class="log-order">订单：{{ item.related_order }}</text>
            </view>
            <view class="log-amount" :class="item.change_amount > 0 ? 'positive' : 'negative'">
              <text class="amount-sign">{{ item.change_amount > 0 ? '+' : '' }}</text>
              <text class="amount-value">{{ Number(item.change_amount).toFixed(4) }}</text>
            </view>
          </view>
          
          <view v-if="pointsLog.length === 0 && !loading" class="empty-state">
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

    <!-- 积分规则说明 -->
    <view class="points-rules">
      <view class="rules-header">
        <text class="rules-title">积分规则</text>
      </view>
      <view class="rules-list">
        <view class="rule-item">
          <text class="rule-icon iconfont icon-gouwuche"></text>
          <text class="rule-text">购买商品可获得积分奖励</text>
        </view>
        <view class="rule-item">
          <text class="rule-icon">👥</text>
          <text class="rule-text">推荐好友注册可获得积分</text>
        </view>
        <view class="rule-item">
          <text class="rule-icon">📅</text>
          <text class="rule-text">每日签到可获得积分</text>
        </view>
        <view class="rule-item">
          <text class="rule-icon">🎁</text>
          <text class="rule-text">积分可兑换专属商品</text>
        </view>
      </view>
    </view>

    <!-- 积分回收规则 -->
    <view class="points-recycle">
      <view class="recycle-header">
        <text class="recycle-title">积分回收规则</text>
      </view>
      <view class="recycle-list">
        <view class="recycle-item">
          <view class="item-header">
            <text class="item-icon iconfont icon-butie"></text>
            <text class="item-title">购物积分回收</text>
          </view>
          <text class="item-desc">用户购买会员商品或普通商品时，实际支付金额的20%将转换为积分，由平台统一回收</text>
        </view>
        <view class="recycle-item">
          <view class="item-header">
            <text class="item-icon">🔄</text>
            <text class="item-title">积分抵扣回收</text>
          </view>
          <text class="item-desc">用户购买普通商品过程中，用于抵扣订单金额的积分</text>
        </view>
      </view>
      
      <view class="recycle-sync">
        <text class="sync-title">同步说明</text>
        <text class="sync-desc">积分回收后，积分余额将与我的积分页面同步更新</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPointsBalance, getPointsLog } from '@/api/points.js'
import { getMerchantData, getMerchantPointsLogs } from '../../utils/merchant.js'

// 当前选中的Tab
const currentTab = ref('member')

// 会员积分和商家积分
const memberPoints = ref(0)
const merchantPoints = ref(0)

const userPoints = ref(0)
const userPointsLog = ref([])
const merchantPointsLog = ref([])
const refreshing = ref(false)
const pointsLog = computed(() => {
  const normalizeTime = (value) => {
    if (!value) return ''
    return value
  }
  const userList = userPointsLog.value.map((item) => ({
    ...item,
    source: 'user',
    created_at: item.created_at || item.time || ''
  }))
  const merchantList = merchantPointsLog.value.map((item) => ({
    id: item.id || Date.now() + Math.random(),
    change_amount: Number(item.changeAmount ?? item.change_amount ?? 0),
    reason: item.reason || '订单销售奖励',
    created_at: normalizeTime(item.createdAt),
    source: 'merchant',
    related_order: item.relatedOrder
  }))

  return [...userList, ...merchantList].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime()
    const timeB = new Date(b.created_at || 0).getTime()
    return timeB - timeA
  })
})

// 买家视角：总积分仅展示“用户积分”（由后端资产接口返回）
// 平台/商家积分只在商家模式中查看，这里不再累加 merchantPoints
const pointsBalance = computed(() => {
  return Number(userPoints.value).toFixed(4)
})

// 当前显示的积分余额(根据Tab切换)
const currentPointsBalance = computed(() => {
  return currentTab.value === 'member' 
    ? Number(memberPoints.value).toFixed(4)
    : Number(merchantPoints.value).toFixed(4)
})

// 格式化显示的会员积分和商家积分
const memberPointsDisplay = computed(() => {
  return Number(memberPoints.value).toFixed(4)
})

const merchantPointsDisplay = computed(() => {
  return Number(merchantPoints.value).toFixed(4)
})

const loading = ref(false)

/**
 * 加载积分余额
 */
const loadPointsBalance = async () => {
  try {
    // 使用新的积分余额接口
    const res = await getPointsBalance()
    if (res.data) {
      memberPoints.value = Number(res.data.member_points || 0)
      merchantPoints.value = Number(res.data.merchant_points || 0)
      console.log('[积分详情] 积分余额加载成功:', {
        member: memberPoints.value,
        merchant: merchantPoints.value,
        total: res.data.total_points
      })
    }
  } catch (error) {
    console.error('加载积分余额失败:', error)
    memberPoints.value = 0
    merchantPoints.value = 0
  }
}

/**
 * 加载积分流水
 */
const loadPointsLog = async (isMore = false) => {
  if (loading.value) return
  
  try {
    loading.value = true
    if (!isMore) {
      page.value = 1
      userPointsLog.value = []
      hasMore.value = true
    }
    
    // 根据当前Tab传入不同的points_type参数
    const pointsType = currentTab.value // 'member' 或 'merchant'
    const res = await getPointsLog({ 
      page: page.value,
      size: pageSize.value,
      points_type: pointsType 
    })
    
    // 解析响应数据
    let apiLogs = []
    if (res.data?.rows && Array.isArray(res.data.rows)) {
      apiLogs = res.data.rows
      total.value = res.data.total || res.data.totalCount || 0
    } else if (res.rows && Array.isArray(res.rows)) {
      apiLogs = res.rows
      total.value = res.total || res.totalCount || 0
    } else if (res.data?.list && Array.isArray(res.data.list)) {
      apiLogs = res.data.list
      total.value = res.data.total || res.data.totalCount || 0
    } else if (res.list && Array.isArray(res.list)) {
      apiLogs = res.list
      total.value = res.total || res.totalCount || 0
    } else if (Array.isArray(res.data)) {
      apiLogs = res.data
      total.value = res.total || res.totalCount || 0
    } else if (Array.isArray(res)) {
      apiLogs = res
      total.value = res.length
    }
    
    const newLogs = apiLogs.map((item) => ({
      ...item,
      source: currentTab.value, // 使用当前Tab作为source
      created_at: item.created_at || item.time || ''
    }))
    
    if (isMore) {
      userPointsLog.value = [...userPointsLog.value, ...newLogs]
    } else {
      userPointsLog.value = newLogs
    }
    
    // 判断是否还有更多数据
    if (total.value > 0) {
      hasMore.value = userPointsLog.value.length < total.value
    } else {
      hasMore.value = apiLogs.length >= pageSize.value
    }
    
    if (hasMore.value) {
      page.value++
    }
    
    console.log('[积分流水] 当前已加载', userPointsLog.value.length, '条, 总数:', total.value, ', 还有更多:', hasMore.value)
  } catch (error) {
    console.error('加载积分流水失败:', error)
    if (!isMore) {
      userPointsLog.value = []
    }
  } finally {
    loading.value = false
  }

  // 不再加载商家积分流水,统一使用API
  merchantPointsLog.value = []
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
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

/**
 * 跳转到积分兑换
 */
const goToExchange = () => {
  uni.navigateTo({
    url: '/subPackages/page2/pages/points/exchange'
  })
}

/**
 * 跳转到赚取积分
 */
const goToEarn = () => {
  uni.navigateTo({
    url: '/subPackages/page2/pages/points/earn'
  })
}

/**
 * 查看全部流水
 */
const viewAllLog = () => {
  uni.navigateTo({ url: '/subPackages/page2/pages/points/log' })
}

const viewAllLogOld = () => {
  uni.navigateTo({
    url: '/subPackages/page2/pages/points/log'
  })
}

/**
 * 切换Tab
 */
const switchTab = (tab) => {
  currentTab.value = tab
  // 切换Tab时重新加载对应的积分流水
  loadPointsLog()
}


onMounted(() => {
  loadPointsBalance()
  loadPointsLog()
})

/**
 * 下拉刷新
 */
const onRefresh = async () => {
  refreshing.value = true
  await Promise.all([
    loadPointsBalance(),
    loadPointsLog()
  ])
  setTimeout(() => {
    refreshing.value = false
    uni.showToast({ title: '刷新成功', icon: 'success', duration: 1000 })
  }, 500)
}

/**
 * 刷新恢复
 */
const onRestore = () => {
  refreshing.value = false
}

onShow(() => {
  // 每次返回页面时重新加载，确保卖出商品后积分流水和总积分都会更新
  loadPointsBalance()
  loadPointsLog()
})
</script>

<style scoped>
.points-page {
  padding: 40rpx 30rpx;
  background: #f5f5f5;
  height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 积分余额卡片 */
.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  padding: 50rpx 40rpx;
  margin-bottom: 30rpx;
  color: white;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.balance-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.balance-header {
  margin-bottom: 30rpx;
}

.balance-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.balance-subtitle {
  display: block;
  font-size: 24rpx;
  opacity: 0.8;
}

.balance-amount {
  display: flex;
  align-items: baseline;
  margin-bottom: 40rpx;
}

.amount-number {
  font-size: 72rpx;
  font-weight: bold;
  margin-right: 12rpx;
}

.amount-unit {
  font-size: 28rpx;
  opacity: 0.9;
}

.balance-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.action-btn.primary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.btn-icon {
  font-size: 32rpx;
}

/* 积分Tab导航 */
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
  padding: 40rpx 30rpx;
  margin-bottom: 30rpx;
  box-sizing: border-box;
  height: calc(100vh - 500rpx);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  gap: 20rpx;
  overflow: hidden;
}

.log-item:last-child {
  border-bottom: none;
}

.log-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.log-reason {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reason-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.source-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  background: #eef2ff;
  color: #3d6bff;
}

.source-tag.merchant {
  background: #fff4e6;
  color: #ff8a00;
}

.log-order {
  display: block;
  font-size: 22rpx;
  color: #9c9ca0;
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  white-space: nowrap;
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

.loading-more, .no-more {
  padding: 30rpx;
  text-align: center;
}

.loading-text, .no-more-text {
  font-size: 24rpx;
  color: #999;
}

/* 积分规则 */
.points-rules {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  box-sizing: border-box;
}

.rules-header {
  margin-bottom: 30rpx;
}

.rules-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.rule-icon {
  font-size: 36rpx;
  width: 60rpx;
  text-align: center;
}

.rule-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.4;
}

/* 积分回收规则 */
.points-recycle {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  margin-top: 20rpx;
  box-sizing: border-box;
}

.recycle-header {
  margin-bottom: 30rpx;
}

.recycle-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.recycle-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 30rpx;
}

.recycle-item {
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 24rpx;
  border-left: 4rpx solid #ff9800;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.item-icon {
  font-size: 32rpx;
  width: 60rpx;
  text-align: center;
}

.item-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.item-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.recycle-sync {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
}

.sync-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #f57c00;
  margin-bottom: 12rpx;
}

.sync-desc {
  display: block;
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
}
</style>