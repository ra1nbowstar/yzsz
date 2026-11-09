<template>
  <view class="sales-page">
    <!-- 时间选择器 -->
    <view class="time-selector">
      <view 
        v-for="period in timePeriods" 
        :key="period.value"
        class="time-item"
        :class="{ active: currentPeriod === period.value }"
        @tap="switchPeriod(period.value)"
      >
        <text class="time-text">{{ period.label }}</text>
      </view>
    </view>

    <!-- 销售概览 -->
    <view class="sales-overview">
      <view class="overview-header">
        <text class="overview-title">{{ getPeriodTitle() }}销售概览</text>
        <text class="overview-date">{{ getCurrentDateRange() }}</text>
      </view>
      
      <view class="overview-stats">
        <view class="stat-item main">
          <text class="stat-value">¥{{ salesData.totalRevenue }}</text>
          <text class="stat-label">总销售额</text>
        </view>
        
        <view class="stat-item">
          <text class="stat-value">{{ salesData.totalOrders }}</text>
          <text class="stat-label">订单数量</text>
        </view>
        
        <view class="stat-item">
          <text class="stat-value">¥{{ salesData.avgOrderValue }}</text>
          <text class="stat-label">客单价</text>
        </view>
        
        <view class="stat-item">
          <text class="stat-value">{{ salesData.newCustomers }}</text>
          <text class="stat-label">新客户</text>
        </view>
      </view>
    </view>

    <!-- 热销商品 -->
    <view class="hot-products">
      <view class="section-header">
        <text class="section-title">热销商品 TOP5</text>
        <text class="more-btn" @tap="goToProducts">查看全部</text>
      </view>
      
      <view class="products-list">
        <view 
          v-for="(product, index) in hotProducts" 
          :key="product.id"
          class="product-item"
        >
          <view class="product-rank">{{ index + 1 }}</view>
          <image :src="product.image || '/static/logo.png'" class="product-image" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-sales">销量：{{ product.sales }}件</text>
          </view>
          <view class="product-revenue">
            <text class="revenue-text">¥{{ formatPrice(product.revenue) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 销售明细 -->
    <view class="sales-details">
      <view class="section-header">
        <text class="section-title">销售明细</text>
      </view>
      
      <view class="details-list">
        <view 
          v-for="detail in salesDetails" 
          :key="detail.id"
          class="detail-item"
        >
          <view class="detail-time">
            <text class="time-text">{{ detail.date }}</text>
          </view>
          <view class="detail-stats">
            <view class="detail-stat">
              <text class="stat-label">销售额</text>
              <text class="stat-value">¥{{ detail.revenue }}</text>
            </view>
            <view class="detail-stat">
              <text class="stat-label">订单</text>
              <text class="stat-value">{{ detail.orders }}单</text>
            </view>
            <view class="detail-stat">
              <text class="stat-label">客单价</text>
              <text class="stat-value">¥{{ detail.avgOrder }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAllOrders } from '@/api/order.js'
import { getProductDetail } from '@/api/product.js'
import config from '@/utils/config.js'

const currentPeriod = ref('today')

/** 价格保留两位小数，避免浮点精度过长 */
const formatPrice = (v) => Number(v ?? 0).toFixed(2)

// 时间周期选项
const timePeriods = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本年', value: 'year' }
]

// 销售数据（从本地商家数据实时计算）
const salesData = ref({
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  newCustomers: 0
})

// 热销商品
const hotProducts = ref([])

// 销售明细（按日期汇总订单）
const salesDetails = ref([])

// 获取日期字符串（YYYY-MM-DD）
const getDateStr = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * 获取周期标题
 */
const getPeriodTitle = () => {
  const titleMap = {
    today: '今日',
    yesterday: '昨日',
    week: '本周',
    month: '本月',
    year: '本年'
  }
  return titleMap[currentPeriod.value] || '今日'
}

/**
 * 获取当前日期范围
 */
const getCurrentDateRange = () => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  switch (currentPeriod.value) {
    case 'today':
      return today
    case 'yesterday':
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return yesterday.toISOString().split('T')[0]
    case 'week':
      const startOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000)
      return `${startOfWeek.toISOString().split('T')[0]} - ${today}`
    case 'month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return `${startOfMonth.toISOString().split('T')[0]} - ${today}`
    case 'year':
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      return `${startOfYear.toISOString().split('T')[0]} - ${today}`
    default:
      return today
  }
}

/**
 * 切换时间周期
 */
const switchPeriod = (period) => {
  currentPeriod.value = period
  loadSalesData(period)
}

/**
 * 加载销售数据
 */
const loadSalesData = async (period) => {
  try {
    console.log('[销售统计] 开始加载销售数据，周期:', period)
    
    const all = []
    let page = 1
    let hasMore = true
    while (hasMore) {
      const result = await getAllOrders({ status: 'all', page, pageSize: 100 })
      const data = result.data || result
      all.push(...data.list)
      hasMore = data.pagination.has_more
      page += 1
    }
    const res = { data: { list: all } }
    
    console.log('[销售统计] 商户订单接口响应:', res)
    
    // 支持多种响应格式
    let orders = []
    if (Array.isArray(res.data?.list)) {
      orders = res.data.list
    } else if (Array.isArray(res.data)) {
      orders = res.data
    } else if (Array.isArray(res)) {
      orders = res
    } else if (res.data && Array.isArray(res.data.rows)) {
      orders = res.data.rows
    } else if (res.data && Array.isArray(res.data.items)) {
      orders = res.data.items
    }
    
    console.log('[销售统计] 解析到订单数量:', orders.length)
    console.log('[销售统计] 订单状态分布:', {
      待支付: orders.filter(o => ['pending', 'pending_payment', 'pending_pay'].includes(o.status)).length,
      已支付: orders.filter(o => !['pending', 'pending_payment', 'pending_pay'].includes(o.status)).length,
      所有状态: [...new Set(orders.map(o => o.status))]
    })
    
    // 根据时间周期筛选订单
    const now = new Date()
    let startTime = null
    let endTime = null
    
    if (period === 'today') {
      // 今日：从今天 00:00:00 到现在
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (period === 'yesterday') {
      // 昨日：从昨天 00:00:00 到昨天 23:59:59
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      startTime = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0)
      endTime = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
    } else if (period === 'week') {
      // 本周：从本周一 00:00:00 到现在
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      startTime = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0)
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (period === 'month') {
      // 本月：从本月1日 00:00:00 到现在
      startTime = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (period === 'year') {
      // 本年：从今年1月1日 00:00:00 到现在
      startTime = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }
    
    console.log('[销售统计] 时间范围:', {
      周期: period,
      开始时间: startTime ? startTime.toISOString() : '无',
      结束时间: endTime ? endTime.toISOString() : '无',
      当前时间: now.toISOString()
    })
    
    // 筛选订单：1. 只统计支付完成的订单（排除待支付订单） 2. 时间范围筛选
    const filteredOrders = orders.filter(order => {
      // 1. 只统计支付完成的订单，排除待支付订单
      const status = (order.status || '').toLowerCase()
      // 排除待支付状态
      if (status === 'pending' || status === 'pending_payment' || status === 'pending_pay') {
        return false
      }
      
      // 2. 时间范围筛选
      if (startTime && endTime) {
        // 尝试多种日期字段格式
        const orderDateStr = order.created_at || order.createTime || order.createdAt || order.create_time
        if (!orderDateStr) {
          console.warn('[销售统计] 订单缺少日期字段:', {
            order_number: order.order_number || order.orderNo,
            status: order.status
          })
          return false
        }
        
        const orderDate = new Date(orderDateStr)
        if (isNaN(orderDate.getTime())) {
          console.warn('[销售统计] 订单日期格式无效:', {
            order_number: order.order_number || order.orderNo,
            date_str: orderDateStr,
            status: order.status
          })
          return false
        }
        
        // 检查订单日期是否在时间范围内
        if (orderDate < startTime || orderDate > endTime) {
          return false
        }
      }
      
      // 只统计已支付、待收货、已完成、待发货等已支付状态
      // paid, confirmed, shipping, completed, after_sale 等都是已支付状态
      return true
    })
    
    // 调试：查看前几个已支付订单的日期
    const paidOrders = orders.filter(o => {
      const status = (o.status || '').toLowerCase()
      return status !== 'pending' && status !== 'pending_payment' && status !== 'pending_pay'
    })
    
    console.log('[销售统计] 已支付订单示例（前5个）:', paidOrders.slice(0, 5).map(o => ({
      order_number: o.order_number || o.orderNo,
      status: o.status,
      created_at: o.created_at || o.createTime || o.createdAt,
      amount: o.actual_amount || o.total_amount || o.actualAmount || o.totalAmount
    })))
    
    console.log('[销售统计] 订单筛选结果:', {
      总订单数: orders.length,
      已支付订单数: paidOrders.length,
      筛选后订单数: filteredOrders.length,
      已排除待支付订单: orders.length - paidOrders.length,
      时间筛选排除的订单: paidOrders.length - filteredOrders.length,
      筛选后的订单状态: [...new Set(filteredOrders.map(o => o.status))],
      筛选后的订单金额: filteredOrders.slice(0, 5).map(o => ({
        order_number: o.order_number || o.orderNo,
        status: o.status,
        created_at: o.created_at || o.createTime || o.createdAt,
        amount: o.actual_amount || o.total_amount || o.actualAmount || o.totalAmount
      }))
    })
    
    // 计算销售数据（只统计已支付订单）
    const totalRevenue = filteredOrders.reduce((sum, o) => {
      const amount = parseFloat(o.actual_amount || o.total_amount || o.actualAmount || o.totalAmount || 0)
      console.log('[销售统计] 订单金额:', {
        order_number: o.order_number || o.orderNo,
        status: o.status,
        amount: amount,
        字段: {
          actual_amount: o.actual_amount,
          total_amount: o.total_amount,
          actualAmount: o.actualAmount,
          totalAmount: o.totalAmount
        }
      })
      return sum + amount
    }, 0)
    const totalOrders = filteredOrders.length
    const newCustomers = new Set(filteredOrders.map(o => o.user_id || o.userId || o.user_id)).size
    
    console.log('[销售统计] 计算结果:', {
      总销售额: totalRevenue,
      订单数量: totalOrders,
      新客户数: newCustomers,
      客单价: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0
    })
    
    salesData.value = {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders: totalOrders,
      avgOrderValue: totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
      newCustomers: newCustomers
    }
    
    // 处理图片 URL：相对路径拼接 baseURL
    const processImageUrl = (img) => {
      if (!img || img === 'undefined' || img === 'null') return ''
      if (typeof img !== 'string') return ''
      if (img.startsWith('http://') || img.startsWith('https://')) return img
      if (img.startsWith('/static') || img.startsWith('data:')) return img
      const path = img.startsWith('/') ? img : `/${img}`
      return `${config.baseURL}${path}`
    }
    const resolveItemImage = (item) => {
      if (item.product && typeof item.product === 'object') {
        const p = item.product
        if (p.main_image) return processImageUrl(p.main_image)
        if (p.banner_images && p.banner_images.length) return processImageUrl(p.banner_images[0])
        if (p.image_url || p.image) return processImageUrl(p.image_url || p.image)
      }
      const raw = item.product_image || item.productImage || item.image || item.picture || item.pic || item.image_url || item.imageUrl || item.img
      return raw ? processImageUrl(raw) : '/static/logo.png'
    }

    // 计算热销商品（按销量排序）
    const productSales = {}
    filteredOrders.forEach(order => {
      (order.items || order.products || []).forEach(item => {
        const productId = item.product_id || item.id
        if (!productSales[productId]) {
          productSales[productId] = {
            id: productId,
            name: item.product_name || item.name,
            sales: 0,
            revenue: 0,
            image: resolveItemImage(item)
          }
        }
        productSales[productId].sales += parseInt(item.quantity || 1)
        // 优先使用 unit_price，如果没有则使用 price，如果还没有则使用 total_price 除以 quantity
        const unitPrice = parseFloat(item.unit_price || item.price || 0)
        const quantity = parseInt(item.quantity || 1)
        const itemTotal = unitPrice > 0 
          ? unitPrice * quantity 
          : parseFloat(item.total_price || item.product_amount || 0)
        productSales[productId].revenue += itemTotal
      })
    })

    let topProducts = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
      .map(p => ({ ...p, revenue: Number(Number(p.revenue).toFixed(2)) }))

    // 订单项常无图片，按 product_id 拉取商品详情补全图片
    for (let i = 0; i < topProducts.length; i++) {
      const p = topProducts[i]
      if (!p.image || p.image === '/static/logo.png') {
        try {
          const res = await getProductDetail(p.id)
          const data = res.data || res
          const img = data.main_image || (data.banner_images && data.banner_images[0]) || data.image_url || data.image
          if (img) {
            topProducts[i] = { ...p, image: processImageUrl(img) }
          }
        } catch (_) { /* 忽略单商品拉取失败 */ }
      }
    }
    hotProducts.value = topProducts

    // 按日期汇总销售明细
    const detailsMap = {}
    filteredOrders.forEach(order => {
      const dateStr = getDateStr(new Date(order.created_at || order.createTime).getTime())
      if (!detailsMap[dateStr]) {
        detailsMap[dateStr] = {
          id: dateStr,
          date: dateStr,
          revenue: 0,
          orders: 0
        }
      }
      detailsMap[dateStr].revenue += parseFloat(order.actual_amount || order.total_amount || order.actualAmount || order.totalAmount || 0)
      detailsMap[dateStr].orders += 1
    })
    
    salesDetails.value = Object.values(detailsMap)
      .map(detail => ({
        ...detail,
        avgOrder: detail.orders > 0 ? Number((detail.revenue / detail.orders).toFixed(2)) : 0
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  } catch (error) {
    console.error('加载销售数据失败', error)
    salesData.value = {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      newCustomers: 0
    }
    hotProducts.value = []
    salesDetails.value = []
  }
}

/**
 * 跳转到商品管理
 */
const goToProducts = () => {
  uni.navigateTo({ url: '/subPackages/page1/pages/merchant/products' })
}

onMounted(() => {
  loadSalesData(currentPeriod.value)
  console.log('销售统计页面加载')
})

onShow(() => {
  // 返回页面时刷新，确保与平台中心数据一致
  loadSalesData(currentPeriod.value)
})
</script>

<style scoped>
.sales-page {
  padding: 40rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

/* 时间选择器 */
.time-selector {
  display: flex;
  gap: 16rpx;
  margin-bottom: 30rpx;
  padding: 0 10rpx;
}

.time-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  background: white;
  border-radius: 25rpx;
  font-size: 26rpx;
  color: #666;
}

.time-item.active {
  background: #ff9800;
  color: white;
  font-weight: 600;
}

/* 销售概览 */
.sales-overview {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
}

.overview-header {
  text-align: center;
  margin-bottom: 30rpx;
}

.overview-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.overview-date {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.overview-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30rpx;
}

.stat-item {
  text-align: center;
  position: relative;
}

.stat-item.main {
  grid-column: 1 / -1;
  padding: 30rpx;
  background: linear-gradient(135deg, #ff9800, #ffb74d);
  border-radius: 16rpx;
  color: white;
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.stat-item:not(.main) .stat-value {
  font-size: 36rpx;
  color: #333;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}

.stat-item:not(.main) .stat-label {
  color: #666;
}


/* 热销商品 */
.hot-products {
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

.products-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
}

.product-rank {
  width: 60rpx;
  height: 60rpx;
  background: #ff9800;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
}

.product-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
}

.product-info {
  flex: 1;
}

.product-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.product-sales {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.product-revenue {
  text-align: right;
}

.revenue-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff9800;
}

/* 销售明细 */
.sales-details {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.detail-item {
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
}

.detail-time {
  margin-bottom: 16rpx;
}

.time-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.detail-stats {
  display: flex;
  justify-content: space-between;
}

.detail-stat {
  text-align: center;
}

.detail-stat .stat-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.detail-stat .stat-value {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
</style>