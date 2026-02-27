<template>
  <view class="shop-center-page">
    <!-- 商家信息卡片 -->
    <view class="shop-info-card">
      <view class="shop-header">
        <view class="shop-details">
          <text class="shop-title">商家中心</text>
          <text class="shop-role">商家</text>
        </view>
      </view>
    </view>

    <!-- 数据统计 -->
    <view class="stats-overview">
      <view class="stats-item" @tap="goToPage('/subPackages/page2/pages/shop/orders')">
        <text class="stats-value">¥{{ formatAmount(todayStats.sales) }}</text>
        <text class="stats-label">今日销售额</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item" @tap="goToPage('/subPackages/page2/pages/shop/orders')">
        <text class="stats-value">{{ todayStats.orders }}</text>
        <text class="stats-label">今日订单</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item">
        <text class="stats-value">{{ todayStats.customers }}</text>
        <text class="stats-label">新增客户</text>
      </view>
    </view>

    <!-- 快捷功能：支付单单独一行加大，其余网格 -->
    <view class="quick-actions-wrap">
      <view class="action-featured" @tap.stop="goToCreatePayment">
        <view class="action-featured-icon iconfont icon-hongbao"></view>
        <view class="action-featured-right">
          <text class="action-featured-title">支付单</text>
          <text class="action-featured-desc">创建收款码、线下收款</text>
        </view>
        <text class="action-featured-arrow">›</text>
      </view>
      <view class="quick-actions">
        <view class="action-item" @tap.stop="goToCertification">
          <view class="action-icon iconfont icon-shangjiarenzheng" style="background: #e8f5e9; color: #4caf50;"></view>
          <text class="action-text">商家认证</text>
        </view>
        <view class="action-item" @tap="openBindCard">
          <view class="action-icon iconfont icon-yingyongguanliyuanguanli" style="background: #e8f5e9; color: #4caf50;"></view>
          <text class="action-text">银行卡绑定</text>
        </view>
        <view class="action-item" @tap="goToPage('/subPackages/page2/pages/shop/products')">
          <view class="action-icon iconfont icon-shangpinguanli" style="background: #e8f5e9; color: #4caf50;"></view>
          <text class="action-text">商品管理</text>
        </view>
        <view class="action-item" @tap="goToPage('/subPackages/page2/pages/shop/orders')">
          <view class="action-icon iconfont icon-dingdanxiaoxi" style="background: #e8f5e9; color: #4caf50;"></view>
          <text class="action-text">订单管理</text>
        </view>
        <view class="action-item" @tap="goToPage('/subPackages/page2/pages/shop/settings')">
          <view class="action-icon iconfont icon-shezhi" style="background: #e8f5e9; color: #4caf50;"></view>
          <text class="action-text">店铺设置</text>
        </view>
      </view>
    </view>

    <!-- 最近订单 -->
    <view class="recent-orders">
      <view class="section-header">
        <text class="section-title">最近订单</text>
        <text class="more-btn" @tap="goToPage('/subPackages/page2/pages/shop/orders')">查看全部</text>
      </view>
      
      <view class="orders-list">
        <view 
          v-for="order in recentOrders" 
          :key="order.id"
          class="order-item"
          @tap="goToOrderDetail(order)"
        >
          <view class="order-info">
            <text class="order-no">订单号：{{ order.orderNo }}</text>
            <text class="order-time">{{ order.createTime }}</text>
          </view>
          <view class="order-amount">
            <text class="amount-text">¥{{ Number(order.amount ?? order.actualAmount ?? 0).toFixed(2) }}</text>
            <view class="order-status" :class="'status-' + order.status">
              <text class="status-text">{{ getOrderStatusText(order.status) }}</text>
            </view>
          </view>
        </view>
        
        <!-- 空状态 -->
        <view v-if="recentOrders.length === 0" class="empty-orders">
          <text class="empty-icon iconfont icon-dingdanxiaoxi"></text>
          <text class="empty-text">暂无订单</text>
        </view>
      </view>
    </view>

    <!-- 切换到用户模式 -->
    <view class="merchant-entrance">
      <view class="merchant-btn switch-user" @tap="switchToUserMode">
        <text class="merchant-text">切换到用户模式</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getOrderList, getShopOrders } from '@/api/order.js'
import { switchToUserMode as switchUserMode } from '@/utils/tabbar.js'

// 商家信息
const shopInfo = ref({
  shopName: '我的店铺',
  avatar: '',
  level: 1,
  joinDate: '2024-01-15'
})

// 今日统计
const todayStats = ref({
  sales: 0,
  orders: 0,
  customers: 0
})

// 最近订单
const recentOrders = ref([])

/**
 * 格式化金额
 */
const formatAmount = (value) => {
  return Number(value || 0).toFixed(2)
}

/**
 * 获取订单状态文本
 */
const getOrderStatusText = (status) => {
  const statusMap = {
    0: '待付款',
    1: '待发货',
    2: '已发货',
    3: '已完成',
    4: '已取消',
    pending_payment: '待付款',
    pending_pay: '待付款',
    pending_ship: '待发货',
    pending_recv: '待收货',
    pending: '待处理',
    paid: '待发货',
    confirmed: '待发货',
    shipping: '待收货',
    after_sale: '退款中',
    refunding: '退款中',
    refunded: '已退款',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || '未知'
}

/**
 * 跳转到指定页面
 */
const goToPage = (url) => {
  if (!url || typeof url !== 'string') return
  let finalUrl = url.trim()
  if (!finalUrl.startsWith('/')) finalUrl = '/' + finalUrl
  uni.navigateTo({ url: finalUrl })
}

/** 支付单：创建收款码页 */
const goToCreatePayment = () => goToPage('/subPackages/page2/pages/merchant/create_payment')
/** 商家认证：实名认证页 */
const goToCertification = () => goToPage('/subPackages/page2/pages/merchant/certification')

/**
 * 跳转到订单详情
 */
const goToOrderDetail = (order) => {
  let orderNumber = null
  
  if (typeof order === 'object' && order !== null) {
    orderNumber = order.order_number || order.order_no || order.orderNo
    if (!orderNumber) {
      const foundOrder = recentOrders.value.find(o => o.id === order.id)
      if (foundOrder) {
        orderNumber = foundOrder.order_number || foundOrder.order_no || foundOrder.orderNo
      }
    }
  } else {
    const foundOrder = recentOrders.value.find(o => o.id == order)
    if (foundOrder) {
      orderNumber = foundOrder.order_number || foundOrder.order_no || foundOrder.orderNo
    } else {
      orderNumber = String(order)
    }
  }
  
  if (!orderNumber || orderNumber.trim() === '' || orderNumber === 'undefined' || orderNumber === 'null') {
    console.error('[商家中心] 无法获取订单号:', order)
    uni.showToast({ title: '订单号不存在', icon: 'none' })
    return
  }
  
  console.log('[商家中心] 跳转到订单详情, 订单号:', orderNumber)
  uni.navigateTo({ url: `/subPackages/page1/pages/merchant/order-detail?order_number=${encodeURIComponent(orderNumber)}` })
}

/**
 * 切换到用户模式
 */
const switchToUserMode = () => {
  uni.showModal({
    title: '切换模式',
    content: '确定要切换到用户模式吗？',
    success: (res) => {
      if (res.confirm) {
        switchUserMode()
      }
    }
  })
}

/**
 * 打开银行卡绑定
 */
const openBindCard = () => {
  uni.navigateTo({ url: '/subPackages/page2/pages/merchant/bindcard' })
}

/**
 * 刷新商家数据
 */
const refreshShopDashboard = async () => {
  try {
    console.log('[商家中心] 开始加载数据')
    
    // 获取订单数据
    const ordersRes = await getShopOrders({ page: 1, page_size: 100 })
    
    // 支持多种响应格式（图1 返回 list / data.list）
    let orders = []
    if (Array.isArray(ordersRes.data?.list)) {
      orders = ordersRes.data.list
    } else if (Array.isArray(ordersRes.list)) {
      orders = ordersRes.list
    } else if (Array.isArray(ordersRes.data)) {
      orders = ordersRes.data
    } else if (Array.isArray(ordersRes)) {
      orders = ordersRes
    }
    
    console.log('[商家中心] 解析到', orders.length, '个订单')
    
    // 按订单号去重：同一订单号只保留一条（保留 createTime 最新的一条）
    const byOrderNo = {}
    orders.forEach(o => {
      const no = String(o.order_number || o.order_no || o.orderNo || o.id || '').trim()
      if (!no) return
      const oTime = new Date(o.created_at || o.createTime || o.created_time || 0).getTime()
      const existing = byOrderNo[no]
      const existingTime = existing ? new Date(existing.created_at || existing.createTime || existing.created_time || 0).getTime() : 0
      if (!existing || oTime > existingTime) {
        byOrderNo[no] = o
      }
    })
    orders = Object.values(byOrderNo)
    
    // 获取最近5个订单
    recentOrders.value = orders
      .slice(0, 5)
      .map((order) => {
        let createTime = order.created_at || order.createTime || order.create_time || ''
        if (createTime) {
          try {
            const time = new Date(createTime)
            if (!isNaN(time.getTime())) {
              const year = time.getFullYear()
              const month = String(time.getMonth() + 1).padStart(2, '0')
              const day = String(time.getDate()).padStart(2, '0')
              const hour = String(time.getHours()).padStart(2, '0')
              const minute = String(time.getMinutes()).padStart(2, '0')
              createTime = `${year}-${month}-${day} ${hour}:${minute}`
            }
          } catch (e) {
            console.warn('[商家中心] 时间格式化失败:', createTime, e)
          }
        }
        
        return {
          id: order.id,
          orderNo: order.order_number || order.order_no || order.orderNo || String(order.id),
          createTime: createTime,
          amount: parseFloat(order.actual_amount || order.actualAmount || order.total_amount || order.totalAmount || 0),
          status: order.status || ''
        }
      })
    
    // 计算今日统计
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at || order.createTime)
      return orderDate >= today
    })
    
    todayStats.value.orders = todayOrders.length
    todayStats.value.sales = todayOrders.reduce((sum, order) => {
      return sum + parseFloat(order.actual_amount || order.actualAmount || order.total_amount || order.totalAmount || 0)
    }, 0)
    todayStats.value.customers = new Set(todayOrders.map(o => o.user_id || o.userId)).size
    
    console.log('[商家中心] 今日统计:', todayStats.value)
  } catch (error) {
    console.error('[商家中心] 加载商家数据失败', error)
    todayStats.value = {
      sales: 0,
      orders: 0,
      customers: 0
    }
    recentOrders.value = []
  }
}

onMounted(() => {
  refreshShopDashboard()
})

onShow(() => {
  refreshShopDashboard()
})
</script>

<style scoped>
/* 引入 iconfont 样式 */
@import "@/static/999/iconfont.css";

.shop-center-page {
  padding: 40rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

/* 商家信息卡片 */
.shop-info-card {
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  color: white;
  box-shadow: 0 10rpx 30rpx rgba(76, 175, 80, 0.3);
}

.shop-header {
  display: flex;
  align-items: center;
}

.shop-details {
  display: flex;
  flex-direction: column;
}

.shop-title {
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  letter-spacing: 2rpx;
}

.shop-role {
  font-size: 24rpx;
  opacity: 0.8;
}


/* 数据统计 */
.stats-overview {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx 0;
  margin-bottom: 30rpx;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stats-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.stats-label {
  font-size: 24rpx;
  color: #999;
}

.stats-divider {
  width: 2rpx;
  height: 60rpx;
  background: #eee;
}

/* 快捷功能 */
.quick-actions-wrap {
  margin-bottom: 30rpx;
}

/* 支付单：单独一行加大 */
.action-featured {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 32rpx 36rpx;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 6rpx 24rpx rgba(76, 175, 80, 0.2);
  box-sizing: border-box;
}

.action-featured-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #4caf50;
  font-size: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
  flex-shrink: 0;
}

.action-featured-icon.iconfont {
  font-size: 52rpx;
  line-height: 1;
}

.action-featured-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8rpx;
}

.action-featured-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2e7d32;
}

.action-featured-desc {
  font-size: 24rpx;
  color: #558b2f;
  opacity: 0.95;
}

.action-featured-arrow {
  font-size: 40rpx;
  color: #4caf50;
  margin-left: 12rpx;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28rpx 16rpx;
  background: white;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.action-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  margin-bottom: 12rpx;
  line-height: 1;
}

.action-icon .iconfont {
  font-size: 36rpx;
  line-height: 1;
}

.action-text {
  font-size: 22rpx;
  color: #333;
  text-align: center;
  line-height: 1.3;
}

/* 功能菜单 */
.menu-section {
  background: white;
  border-radius: 20rpx;
  margin-bottom: 30rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 40rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-left {
  display: flex;
  align-items: center;
}

.menu-icon {
  font-size: 36rpx;
  color: #4caf50;
  margin-right: 20rpx;
  line-height: 1;
  display: inline-block;
}

.menu-icon.iconfont {
  font-size: 36rpx;
  line-height: 1;
}

.menu-text {
  font-size: 28rpx;
  color: #333;
}

.menu-right {
  display: flex;
  align-items: center;
}

.menu-arrow {
  font-size: 32rpx;
  color: #999;
}

/* 最近订单 */
.recent-orders {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
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

.more-btn {
  font-size: 24rpx;
  color: #4caf50;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.order-item {
  padding: 30rpx;
  background: #f8f8f8;
  border-radius: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.order-no {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-time {
  font-size: 24rpx;
  color: #999;
}

.order-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.amount-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 10rpx;
}

.order-status {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  background: #e8f5e9;
}

.status-text {
  font-size: 22rpx;
  color: #4caf50;
}

.empty-orders {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  color: #ddd;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 切换到用户模式 */
.merchant-entrance {
  margin-top: 30rpx;
  margin-bottom: 40rpx;
  padding: 0 40rpx;
}

.merchant-btn {
  width: 100%;
  padding: 30rpx;
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  border-radius: 20rpx;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(76, 175, 80, 0.3);
  box-sizing: border-box;
}

.merchant-text {
  font-size: 32rpx;
  font-weight: bold;
  color: white;
}
</style>
