<template>
  <view class="platform-center-page">
    <!-- 平台管理卡片 -->
    <view class="platform-info-card">
      <view class="platform-header">
        <view class="platform-details">
          <text class="platform-title">平台</text>
          <text class="platform-role">管理员</text>
        </view>
      </view>
    </view>

    <!-- 数据统计 -->
    <view class="stats-overview">
      <view class="stats-item" @tap="goToPage('/subPackages/page2/pages/merchant/sales')">
        <text class="stats-value">¥{{ formatPoints(todayStats.sales) }}</text>
        <text class="stats-label">平台总流水</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item" @tap="goToPage('/subPackages/page2/pages/merchant/orders')">
        <text class="stats-value">{{ todayStats.orders }}</text>
        <text class="stats-label">今日总单</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item">
        <text class="stats-value">{{ todayStats.customers }}</text>
        <text class="stats-label">新增会员</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item" @tap="goToPage('/subPackages/page1/pages/merchant/points-log')">
        <text class="stats-value">{{ formatPoints(merchantInfo.points) }}</text>
        <text class="stats-label">平台总积分</text>
      </view>
    </view>

    <!-- 常用入口：4 宫格 -->
    <view class="section-label">常用</view>
    <view class="quick-actions">
      <view class="action-item" @tap="openBindCard">
        <view class="action-icon iconfont icon-yingyongguanliyuanguanli" style="background: #e3f2fd; color: #1976d2;"></view>
        <text class="action-text">银行卡绑定</text>
      </view>
      <view class="action-item" @tap="goToPage('/subPackages/page1/pages/merchant/products')">
        <view class="action-icon iconfont icon-shangpinguanli" style="background: #e8f5e9; color: #2e7d32;"></view>
        <text class="action-text">商品管理</text>
      </view>
      <view class="action-item" @tap="goToPage('/subPackages/page2/pages/merchant/orders')">
        <view class="action-icon iconfont icon-dingdanxiaoxi" style="background: #fff3e0; color: #e65100;"></view>
        <text class="action-text">订单管理</text>
      </view>
      <view class="action-item" @tap="goToPage('/subPackages/page1/pages/merchant/coupon-distribute')">
        <view class="action-icon iconfont icon-youhuijuan" style="background: #fce4ec; color: #c2185b;"></view>
        <text class="action-text">发放优惠券</text>
      </view>
    </view>

    <!-- 更多功能：3 列网格卡片 -->
    <view class="section-label">更多功能</view>
    <view class="func-grid">
      <view class="func-card" @tap="goToPage('/subPackages/page2/pages/merchant/finance')">
        <text class="func-icon iconfont icon-shanghuliushui"></text>
        <text class="func-text">财务对账</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page1/pages/merchant/inventory')">
        <text class="func-icon iconfont icon-shangpinguanli"></text>
        <text class="func-text">库存监控</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page1/pages/merchant/staff')">
        <text class="func-icon iconfont icon-yuangongguanli"></text>
        <text class="func-text">管理员设置</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page2/pages/merchant/content-manage')">
        <text class="func-icon iconfont icon-neirongguanli"></text>
        <text class="func-text">内容管理</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page2/pages/merchant/order-export')">
        <text class="func-icon iconfont icon-xiazai"></text>
        <text class="func-text">下载订单</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page2/pages/merchant/user-manage')">
        <text class="func-icon iconfont icon-dongjie"></text>
        <text class="func-text">冻结/恢复/升星</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page1/pages/merchant/distribution')">
        <text class="func-icon iconfont icon-butie"></text>
        <text class="func-text">周补贴发放</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page1/pages/merchant/fund-pool')">
        <text class="func-icon iconfont icon-putongzijinchi"></text>
        <text class="func-text">资金池管理</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page2/pages/merchant/dividend-preview')">
        <text class="func-icon iconfont icon-zongzijinfenpei"></text>
        <text class="func-text">分红预览</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page1/pages/merchant/store-list')">
        <text class="func-icon iconfont icon-neirongguanli"></text>
        <text class="func-text">店铺列表</text>
      </view>
      <view class="func-card" @tap="goToPage('/subPackages/page2/pages/merchant/merchant-info')">
        <text class="func-icon iconfont icon-shanghuliushui"></text>
        <text class="func-text">商户号管理</text>
      </view>
	  <view class="func-card" @tap="goToPage('/subPackages/page2/pages/merchant/create_platform_payment')">
	    <text class="func-icon iconfont icon-hongbao" style="color: #ff8f00;"></text>
	    <text class="func-text">平台收款</text>
	  </view>
      <view class="func-card" @tap="goToPage('/subPackages/page2/pages/merchant/permanent-collection')">
        <text class="func-icon iconfont icon-hongbao" style="color: #07c160;"></text>
        <text class="func-text">永久收款码</text>
      </view>
	  <view class="func-card" @tap="goToPage('/subPackages/page2/pages/fund-pool/index')">
	    <text class="func-icon iconfont icon-qianbao" style="color: #ff6b00;"></text>
	    <text class="func-text">我的资金</text>
	  </view>
    </view>


    <!-- 最近订单 -->
    <view class="recent-orders">
      <view class="section-header">
        <text class="section-title">最近订单</text>
        <text class="more-btn" @tap="goToPage('/subPackages/page2/pages/merchant/orders')">查看全部</text>
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

    <!-- 平台模式入口（切换到用户模式） -->
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
import { getOrderList, getAllOrders } from '@/api/order.js'
import { getCompanyPointsBalance, getPlatformRevenueBalance } from '../../api/finance.js'

// 商家信息
const merchantInfo = ref({
  shopName: '示例商店',
  avatar: '',
  level: 1,
  points: 0,
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

const notifications = ref([])

/**
 * 获取商家等级
 */
const getMerchantLevel = () => {
  const levels = ['新手商家', '铜牌商家', '银牌商家', '金牌商家', '钻石商家']
  return levels[merchantInfo.value.level] || '新手商家'
}

/**
 * 格式化数字为4位小数
 */
const formatPoints = (value) => {
  return Number(value || 0).toFixed(4)
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
    paid: '待发货',  // 兼容旧状态
    confirmed: '待发货',  // 兼容旧状态
    shipping: '待收货',  // 兼容旧状态
    after_sale: '退款中',  // 兼容旧状态
    refunding: '退款中',
    refunded: '已退款',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || '未知'
}

/**
 * 归一化并跳转到指定页面
 * 支持输入多种短路径形式，例如:
 * - "page1/merchant/product-add"
 * - "/page1/merchant/product-add"
 * - "/pages/merchant/product-add"
 * - "/subPackages/page1/pages/merchant/product-add"
 */
const goToPage = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return
  let url = rawUrl.trim()

  // 如果已经是完整的子包路径或页面路径，确保以 / 开头
  if (url.startsWith('/subPackages') || url.startsWith('/pages') || url.startsWith('http')) {
    if (!url.startsWith('/')) url = '/' + url
    uni.navigateTo({ url })
    return
  }

  // 支持类似 page1/merchant/... 的快捷写法，将其转换为 /subPackages/page1/pages/merchant/...
  const m1 = url.match(/^\/?page1\/(.*)$/)
  if (m1) {
    url = `/subPackages/page1/pages/${m1[1]}`
    uni.navigateTo({ url })
    return
  }

  // 支持以 /pages/... 开头但未指定 subPackages 的情况，优先映射到 subPackages/page1
  const m2 = url.match(/^\/?pages\/(.*)$/)
  if (m2) {
    url = `/subPackages/page1/pages/${m2[1]}`
    uni.navigateTo({ url })
    return
  }

  // 默认直接导航（保持原行为）
  if (!url.startsWith('/')) url = '/' + url
  uni.navigateTo({ url })
}

/**
 * 跳转到订单详情
 */
const goToOrderDetail = (order) => {
  // 如果传入的是订单对象，使用订单号；如果是ID，尝试从订单列表查找
  let orderNumber = null
  
  if (typeof order === 'object' && order !== null) {
    // 优先使用 order_number 字段
    orderNumber = order.order_number || order.order_no || order.orderNo
    if (!orderNumber) {
      // 如果订单对象中没有订单号，从最近订单列表中查找
      const foundOrder = recentOrders.value.find(o => o.id === order.id)
      if (foundOrder) {
        orderNumber = foundOrder.order_number || foundOrder.order_no || foundOrder.orderNo
      }
    }
  } else {
    // 如果传入的是 id，从订单列表中查找对应的订单
    const foundOrder = recentOrders.value.find(o => o.id == order)
    if (foundOrder) {
      orderNumber = foundOrder.order_number || foundOrder.order_no || foundOrder.orderNo
    } else {
      // 如果找不到，假设传入的就是订单号
      orderNumber = String(order)
    }
  }
  
  if (!orderNumber || orderNumber.trim() === '' || orderNumber === 'undefined' || orderNumber === 'null') {
    console.error('[商户中心] 无法获取订单号:', order)
    uni.showToast({ title: '订单号不存在', icon: 'none' })
    return
  }
  
  console.log('[商户中心] 跳转到订单详情, 订单号:', orderNumber)
  uni.navigateTo({ url: `/subPackages/page1/pages/merchant/order-detail?order_number=${encodeURIComponent(orderNumber)}` })
}

/**
 * 编辑商家信息
 */
const editMerchantInfo = () => {
  // merchant/profile 页面不存在，暂时注释
  uni.showToast({ title: '功能开发中', icon: 'none' })
  // uni.navigateTo({ url: '/page2/merchant/profile' })
}

/**
 * 切换到用户模式
 */
const switchToUserMode = () => {
  console.log('点击了切换到用户模式按钮')
  uni.showModal({
    title: '切换模式',
    content: '确定要切换到用户模式吗？',
    success: (res) => {
      if (res.confirm) {
        console.log('确认切换到用户模式')
        // 保存用户模式
        try {
          uni.setStorageSync('userMode', 'user')
          console.log('已保存用户模式到本地存储')
          // 重新启动应用
          uni.reLaunch({
            url: '/pages/home/home'
          }).then(() => {
              console.log('成功跳转到首页')
          }).catch(err => {
              console.error('跳转失败', err)
              uni.showToast({ title: '跳转失败', icon: 'none' })
          })
        } catch (error) {
          console.error('切换模式失败', error)
          uni.showToast({ title: '切换失败', icon: 'none' })
        }
      }
    }
  })
}

const refreshMerchantDashboard = async () => {
  try {
    console.log('[平台中心] 开始加载数据')
    
    // 并行加载订单数据、平台积分和平台资金
    const [ordersRes, pointsRes, revenueRes] = await Promise.all([
      getAllOrders({ page: 1, pageSize: 100 }),
      getCompanyPointsBalance().catch(err => {
        console.error('[平台中心] 获取平台积分失败:', err)
        return { data: { company_points: 0 } }
      }),
      getPlatformRevenueBalance().catch(err => {
        console.error('[平台中心] 获取平台资金失败:', err)
        return { data: { balance: 0 } }
      })
    ])
    
    console.log('[平台中心] API响应:', ordersRes)
    
    // 支持多种响应格式
    let orders = []
    if (Array.isArray(ordersRes.data?.list)) {
      orders = ordersRes.data.list
    } else if (Array.isArray(ordersRes.data)) {
      orders = ordersRes.data
    } else if (Array.isArray(ordersRes)) {
      orders = ordersRes
    }
    
    console.log('[平台中心] 解析到', orders.length, '个订单')
    
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
    
    // 获取平台积分余额
    try {
      const pointsData = pointsRes.data || pointsRes
      merchantInfo.value.points = Number(pointsData.company_points || pointsData.balance || 0)
      console.log('[平台中心] 平台积分:', merchantInfo.value.points)
    } catch (pointsError) {
      console.error('[平台中心] 解析平台积分失败:', pointsError)
      merchantInfo.value.points = 0
    }
    
    // 获取平台资金余额（平台总流水）
    try {
      const revenueData = revenueRes.data || revenueRes
      todayStats.value.sales = Number(revenueData.balance || revenueData.amount || 0)
      console.log('[平台中心] 平台资金余额:', todayStats.value.sales)
    } catch (revenueError) {
      console.error('[平台中心] 解析平台资金失败:', revenueError)
      todayStats.value.sales = 0
    }
    
    // 获取最近5个订单
    recentOrders.value = orders
      .slice(0, 5)
      .map((order) => {
        // 格式化时间
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
              const second = String(time.getSeconds()).padStart(2, '0')
              createTime = `${year}-${month}-${day} ${hour}:${minute}:${second}`
            }
          } catch (e) {
            console.warn('[平台中心] 时间格式化失败:', createTime, e)
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
    
    console.log('[平台中心] 最近订单数据:', recentOrders.value)
    
    // 计算今日统计（订单数和新增会员数）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at || order.createTime)
      return orderDate >= today
    })
    
    todayStats.value.orders = todayOrders.length
    todayStats.value.customers = new Set(todayOrders.map(o => o.user_id || o.userId)).size
    
    console.log('[平台中心] 今日统计:', todayStats.value)
  } catch (error) {
    console.error('[平台中心] 加载商家数据失败', error)
    todayStats.value = {
      sales: 0,
      orders: 0,
      customers: 0
    }
    recentOrders.value = []
    merchantInfo.value.points = 0
  }

  notifications.value = []
}

const clearNotifications = () => {
  notifications.value = []
}
function openBindCard() {
	console.log('api代码为调用，跳转到 银行卡绑定 页面，前端运行正常')
	uni.navigateTo({ url: '/subPackages/page2/pages/merchant/bindcard' })
}
onMounted(() => {
  refreshMerchantDashboard()
})

onShow(() => {
  // 简单的权限控制：检查当前用户是否在白名单中
  const userInfo = uni.getStorageSync('userInfo') || {}
  const userId = userInfo.id
  
  // 模拟白名单，这里为了测试方便，先假设所有登录用户都能看，或者指定几个ID
  // 实际生产中应改为 ['1001', 'admin', ...]
  // 如果需要严格限制，检查 !whitelist.includes(userId)
  const isAuthorized = true 
  
  if (!isAuthorized) {
    uni.showToast({ title: '无权访问平台中心', icon: 'none' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/home/home' })
    }, 1500)
    return
  }
  
  refreshMerchantDashboard()
})
</script>

<style scoped>
.merchant-center-page {
  padding: 40rpx;
  background: #f5f5f5;
  min-height: 100vh;
}


/* 平台信息卡片 */
.platform-info-card {
  background: linear-gradient(135deg, #1a237e, #3949ab);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  color: white;
  box-shadow: 0 10rpx 30rpx rgba(26, 35, 126, 0.3);
}

.platform-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.platform-details {
  display: flex;
  flex-direction: column;
}

.platform-title {
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  letter-spacing: 2rpx;
}

.platform-role {
  font-size: 24rpx;
  opacity: 0.8;
  background: rgba(255,255,255,0.15);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  align-self: flex-start;
}

/* 数据统计 */
.stats-overview {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx 0;
  margin-bottom: 30rpx;
  display: flex;
  box-shadow: 0 8rpx 24rpx rgba(255, 152, 0, 0.15);
}

.notice-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.notice-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.notice-action {
  font-size: 24rpx;
  color: #3d6bff;
}

.notice-item {
  display: flex;
  gap: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.notice-item:last-child {
  border-bottom: none;
}

.notice-dot {
  color: #ff9800;
  font-size: 32rpx;
  line-height: 1.2;
}

.notice-body {
  flex: 1;
}

.notice-text {
  display: block;
  font-size: 26rpx;
  color: #444;
  margin-bottom: 6rpx;
}

.notice-time {
  font-size: 22rpx;
  color: #999;
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.stats-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.stats-label {
  font-size: 24rpx;
  color: #999;
}

.stats-divider {
  width: 1rpx;
  height: 60rpx;
  background: #eee;
}

/* 区块标题 */
.section-label {
  font-size: 28rpx;
  color: #999;
  margin: 24rpx 0 16rpx;
  padding-left: 4rpx;
}

/* 常用：4 宫格 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  margin-bottom: 16rpx;
}

.action-item {
  background: white;
  border-radius: 16rpx;
  padding: 28rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}

.action-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "iconfont" !important;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 34rpx;
}

.action-text {
  font-size: 22rpx;
  color: #333;
  text-align: center;
}

/* 更多功能：3 列网格 */
.func-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.func-card {
  background: white;
  border-radius: 16rpx;
  padding: 28rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}

.func-icon {
  font-family: "iconfont" !important;
  font-style: normal;
  font-size: 40rpx;
  color: #1976d2;
}

.func-text {
  font-size: 24rpx;
  color: #333;
  text-align: center;
  line-height: 1.3;
}

/* 最近订单 */
.recent-orders {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
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
  font-size: 26rpx;
  color: #ff9800;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-no {
  display: block;
  font-size: 26rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-time {
  display: block;
  font-size: 22rpx;
  color: #999;
}

.order-amount {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.amount-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff9800;
}

.order-status {
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
}

.status-0 {
  background: #fff3cd;
  color: #856404;
}

.status-1 {
  background: #cce5ff;
  color: #0066cc;
}

.status-2 {
  background: #e1f5fe;
  color: #0277bd;
}

.status-3 {
  background: #e8f5e9;
  color: #4caf50;
}

.status-4 {
  background: #ffebee;
  color: #f44336;
}

/* 空状态 */
.empty-orders {
  text-align: center;
  padding: 60rpx 0;
}

.empty-icon {
  display: block;
  font-size: 60rpx;
  margin-bottom: 16rpx;
  opacity: 0.5;
}

.empty-text {
  display: block;
  font-size: 26rpx;
  color: #999;
}

/* 商家模式入口（与用户页保持一致的样式） */
.merchant-entrance {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin: 0 30rpx 20rpx;
}

.merchant-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  transition: all 0.3s;
}

.merchant-btn:not(.disabled) {
  background: #e8f5e9;
  border-color: #4caf50;
}

.merchant-btn.disabled {
  opacity: 0.6;
}

.merchant-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.merchant-btn:not(.disabled) .merchant-text {
  color: #4caf50;
}

/* 切换到用户模式：绿色实心按钮，文字居中 */
.merchant-btn.switch-user {
  background: #4caf50 !important;
  border-color: #4caf50 !important;
}
.merchant-btn.switch-user .merchant-text {
  color: #ffffff !important;
  text-align: center;
}
.merchant-btn.switch-user { justify-content: center; }

</style>

<style>
@import "@/static/999/iconfont.css";
</style>
