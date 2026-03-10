<template>
  <view class="orders-page">
    <!-- 筛选器 -->
    <view class="filter-section">
      <view class="filter-tabs">
        <view 
          v-for="tab in filterTabs" 
          :key="tab.value"
          class="filter-tab" 
          :class="{ active: currentFilter === tab.value }"
          @tap="filterOrders(tab.value)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
      
      <view class="search-box">
        <input 
          class="search-input" 
          placeholder="搜索订单号/客户姓名/电话" 
          v-model="searchKeyword"
          @input="searchOrders"
          @confirm="searchOrders"
          confirm-type="search"
        />
        <text class="iconfont icon-sousuo search-icon" @tap="searchOrders"></text>
      </view>
      
      <view class="sort-box" @tap="showSortMenu">
        <text class="sort-label">{{ currentSort.label }}</text>
        <text class="sort-icon">▼</text>
      </view>
    </view>

    <!-- 订单列表 -->
    <scroll-view 
      class="orders-list" 
      scroll-y 
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="refreshOrders"
    >
      <view 
        v-for="order in filteredOrders" 
        :key="order.id || order.orderNo" 
        class="order-item"
        @tap="goToOrderDetail(order)"
      >
        <view class="order-header">
          <text class="order-no">订单号：{{ order.orderNo }}</text>
          <view class="order-status" :class="'status-' + getDisplayStatus(order)">
            <text class="status-text">{{ getDisplayStatusText(order) }}</text>
          </view>
        </view>
        
        <view class="order-customer">
          <text class="customer-name">客户：{{ maskName(order.customerName) }}</text>
          <text class="customer-phone">{{ maskPhone(order.customerPhone) }}</text>
        </view>
        
        <view class="order-products" v-if="order.products && order.products.length > 0">
          <view 
            v-for="(product, index) in order.products" 
            :key="index"
            class="product-item"
          >
            <image 
              :src="getAvatarUrl(product.image || product.img)" 
              class="product-image"
              mode="aspectFill"
              @error="handleImageError"
            />
            <view class="product-info">
              <text class="product-name">{{ product.name || product.title }}</text>
              <text class="product-spec">{{ product.spec || product.skuName || '' }}</text>
              <view class="product-price-qty">
                <text class="product-price">¥{{ product.price || product.unitPrice || 0 }}</text>
                <text class="product-qty">x{{ product.quantity || product.qty || 1 }}</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 退款申请信息（待售后订单显示） -->
        <view v-if="order.status === 'refunding'" class="refund-info">
          <view class="refund-header">
            <text class="refund-title">退款申请</text>
            <text class="refund-status" v-if="order.refund_info && order.refund_info.status">
              {{ getRefundStatusText(order.refund_info.status) }}
            </text>
            <text class="refund-status" v-else>待审核</text>
          </view>
          <text class="refund-reason" v-if="order.refund_info">
            原因：{{ order.refund_info.reason || order.refund_info.reason_code || '无' }}
          </text>
          <text class="refund-reason" v-else>原因：申请退款</text>
          <text v-if="order.refund_info && order.refund_info.reject_reason" class="refund-reject-reason">
            {{ (order.refund_info.status === 'approved' || order.refund_info.status === 'success') ? '退货地址：' : '拒绝原因：' }}{{ order.refund_info.reject_reason }}
          </text>
          <text class="refund-amount">金额：¥{{ order.refund_info ? (order.refund_info.amount || order.refund_info.refund_amount || order.actualAmount || 0) : (order.actualAmount || order.totalAmount || 0) }}</text>
        </view>
        
        <view class="order-footer">
          <view class="order-time">
            <text>下单时间：{{ formatTime(order.createTime) }}</text>
          </view>
          <view class="order-amount">
            <text class="amount-label">实付款：</text>
            <text class="amount-value">¥{{ order.actualAmount || order.totalAmount || 0 }}</text>
          </view>
        </view>
        
        <view class="order-actions">
          <!-- 待售后订单（申请退款）：显示审核按钮 -->
          <template v-if="order.status === 'refunding'">
            <!-- 只有待审核状态才显示通过/拒绝按钮 -->
            <!-- 如果没有退款信息，或者状态为空，或者状态是待审核，都显示审核按钮 -->
            <template v-if="!order.refund_info || !order.refund_info.status || order.refund_info.status === 'pending' || order.refund_info.status === 'applied' || order.refund_info.status === ''">
              <button 
                class="action-btn approve"
                @tap.stop="approveRefund(order)"
              >
                同意退款
              </button>
              <button 
                class="action-btn reject"
                @tap.stop="rejectRefund(order)"
              >
                拒绝退款
              </button>
            </template>
            <!-- 如果退款状态不是待审核，显示状态文本 -->
            <button 
              v-else
              class="action-btn disabled"
              disabled
            >
              {{ getRefundStatusText(order.refund_info.status) }}
            </button>
          </template>
          <!-- 其他状态的按钮 -->
          <template v-else>
            <!-- 待付款状态显示禁用按钮 -->
            <button 
              v-if="order.status === 'pending_pay'" 
              class="action-btn disabled"
              disabled
            >
              待付款
            </button>
            <!-- 待发货状态显示发货按钮 -->
            <button 
              v-if="order.status === 'pending_ship'" 
              class="action-btn ship"
              @tap.stop="shipOrder(order)"
            >
              发货
            </button>
          </template>
          <button 
            class="action-btn detail"
            @tap.stop="goToOrderDetail(order)"
          >
            查看详情
          </button>
        </view>
      </view>
      
      <view v-if="filteredOrders.length === 0" class="empty-state">
        <text>暂无订单</text>
      </view>
      
      <!-- 加载更多提示 -->
      <view v-if="loadingMore" class="loading-more">
        <text>加载中...</text>
      </view>
      <view v-else-if="!hasMore && filteredOrders.length > 0" class="no-more">
        <text>没有更多订单了</text>
      </view>
    </scroll-view>
    
    <!-- 发货弹窗 -->
    <view class="modal-mask" v-if="showShipModal" @tap="closeShipModal" @touchmove.stop.prevent>
      <view class="modal-content ship-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">发货</text>
          <text class="modal-close" @tap="closeShipModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">订单号</text>
            <text class="form-value">{{ currentShipOrder?.orderNo || '' }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">物流类型</text>
            <picker mode="selector" :range="logisticsTypeOptions" range-key="label" :value="logisticsTypeIndex" @change="onLogisticsTypeChange">
              <view class="form-picker">{{ logisticsTypeOptions[logisticsTypeIndex].label }}</view>
            </picker>
          </view>
          <view class="form-item" v-if="shipLogisticsType === 0">
            <text class="form-label">快递公司 *</text>
            <view class="form-picker" @tap="showDeliveryPicker = true">{{ selectedDelivery ? selectedDelivery.name : '请选择快递公司' }}</view>
          </view>
          <view class="delivery-picker-mask" v-if="showDeliveryPicker" @tap="showDeliveryPicker = false" @touchmove.stop.prevent>
            <view class="delivery-picker-box" @tap.stop>
              <view class="delivery-picker-header">
                <text class="delivery-picker-title">选择快递公司</text>
                <input class="delivery-picker-search" v-model="deliverySearchKeyword" placeholder="搜索公司名称或编码" placeholder-class="placeholder" />
              </view>
              <scroll-view class="delivery-picker-list" scroll-y>
                <view class="delivery-picker-item" v-for="(item, idx) in deliveryListFiltered" :key="item.code + idx" @tap="onSelectDelivery(item)">
                  <text class="delivery-name">{{ item.name }}</text>
                  <text class="delivery-code" v-if="item.code">{{ item.code }}</text>
                </view>
                <view class="delivery-picker-empty" v-if="deliveryListFiltered.length === 0">无匹配结果</view>
              </scroll-view>
              <view class="delivery-picker-footer">
                <text class="delivery-picker-cancel" @tap="showDeliveryPicker = false">取消</text>
              </view>
            </view>
          </view>
          <view class="form-item" v-if="shipLogisticsType === 0">
            <text class="form-label">物流单号 *</text>
            <input 
              class="form-input" 
              v-model="trackingNumber" 
              placeholder="请输入物流单号"
              type="text"
            />
          </view>
          <view class="form-item">
            <text class="form-label">商品描述</text>
            <input 
              class="form-input" 
              v-model="shipItemDesc" 
              placeholder="选填，如：茶艺课"
              type="text"
            />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel" @tap="closeShipModal">取消</button>
          <button class="modal-btn confirm" @tap="confirmShip">确认发货</button>
        </view>
      </view>
    </view>
    
    <!-- 不再需要地址输入弹窗，地址通过平台设置统一管理 -->
     
    <!-- 拒绝退款弹窗 -->
    <view class="modal-mask" v-if="showRejectModal" @tap="closeRejectModal" @touchmove.stop.prevent>
      <view class="modal-content reject-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">拒绝退款</text>
          <text class="modal-close" @tap="closeRejectModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">订单号</text>
            <text class="form-value">{{ currentRefundOrder?.orderNo || currentRefundOrder?.order_number || '' }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">拒绝原因 *</text>
            <textarea 
              class="form-textarea" 
              v-model="rejectReason" 
              placeholder="请输入拒绝原因"
              placeholder-style="color: #999"
              maxlength="200"
            />
            <text class="char-count">{{ rejectReason.length }}/200</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel" @tap="closeRejectModal">取消</button>
          <button class="modal-btn confirm" @tap="handleConfirmReject">确认拒绝</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMerchantOrders, shipOrder as shipOrderApi, getDeliveryList, updateOrderStatus, setWechatDeliveryJumpPath } from '@/api/order.js'
import { searchDeliveryList } from '@/data/delivery-list.js'
import { approveRefund as approveRefundApi, rejectRefund as rejectRefundApi, auditRefund } from '../../api/refund.js'
import { getProductDetail } from '@/api/product.js'
import config from '@/utils/config.js'
import { getAvatarUrl } from '@/utils/avatar.js'

/**
 * 姓名脱敏：显示第一个字符 + **
 */
const maskName = (name) => {
  if (!name || name === '未知') return '未知'
  const str = String(name)
  return str.charAt(0) + '**'
}

/**
 * 手机号脱敏（可选，建议也做一下）
 */
const maskPhone = (phone) => {
  if (!phone) return ''
  const str = String(phone)
  if (str.length < 7) return str
  return str.substring(0, 3) + '****' + str.substring(str.length - 4)
}

// 进入页面默认选中「全部」（显示所有订单）
const currentFilter = ref('all')
const searchKeyword = ref('')

// 筛选标签
const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '待付款', value: 'pending_pay' },
  { label: '待发货', value: 'pending_ship' },
  { label: '待收货', value: 'pending_recv' },
  { label: '待售后', value: 'refunding' },
  { label: '已完成', value: 'completed' }
]

const orders = ref([])

// 排序选项
const sortOptions = [
  { label: '按时间排序（最新）', value: 'time', order: 'desc' },
  { label: '按时间排序（最早）', value: 'time', order: 'asc' },
  { label: '按金额排序（最高）', value: 'amount', order: 'desc' },
  { label: '按金额排序（最低）', value: 'amount', order: 'asc' }
]
const currentSort = ref(sortOptions[0])

// 页面加载时处理状态参数
onLoad((options) => {
  if (options.status) {
    currentFilter.value = options.status
  }
})

// 过滤后的订单（先按订单号去重，再筛选，避免同一订单重复展示）
const filteredOrders = computed(() => {
  const seen = new Set()
  let result = []
  for (const o of orders.value) {
    const no = String(o.orderNo || '').trim()
    if (!no || seen.has(no)) continue
    seen.add(no)
    result.push(o)
  }
  
  // 按状态筛选
  if (currentFilter.value === 'all') {
    // 全部：不筛选
    // result 已经是全部订单
  } else if (currentFilter.value === 'pending_pay') {
    // 待付款：pending_pay（默认值，下单后的初始状态）
    result = result.filter(order => order.status === 'pending_pay')
  } else if (currentFilter.value === 'pending_ship') {
    // 待发货：pending_ship（支付完成）
    result = result.filter(order => order.status === 'pending_ship')
  } else if (currentFilter.value === 'pending_recv') {
    // 待收货：pending_recv（商家已发货）
    result = result.filter(order => order.status === 'pending_recv')
  } else if (currentFilter.value === 'refunding') {
    // 待售后：refunding（退款中）
    console.log('[订单筛选] 筛选 refunding 状态订单，总订单数:', result.length)
    result = result.filter(order => {
      const match = order.status === 'refunding'
      if (match) {
        console.log('[订单筛选] ✅ 找到 refunding 订单:', order.orderNo, '状态:', order.status)
      }
      return match
    })
    console.log('[订单筛选] 筛选后 refunding 订单数量:', result.length)
  } else if (currentFilter.value === 'completed') {
    // 已完成
    result = result.filter(order => order.status === 'completed')
  }
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(order => 
      order.orderNo.toLowerCase().includes(keyword) ||
      order.customerName.toLowerCase().includes(keyword) ||
      order.customerPhone.includes(keyword)
    )
  }
  
  // 排序
  result.sort((a, b) => {
    if (currentSort.value.value === 'amount') {
      const amountA = Number(a.actualAmount ?? a.totalAmount ?? 0)
      const amountB = Number(b.actualAmount ?? b.totalAmount ?? 0)
      return currentSort.value.order === 'desc' 
        ? amountB - amountA 
        : amountA - amountB
    } else {
      // 按时间排序
      const timeA = new Date(a.createTime).getTime()
      const timeB = new Date(b.createTime).getTime()
      return currentSort.value.order === 'desc' ? timeB - timeA : timeA - timeB
    }
  })
  
  return result
})

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    pending_pay: '待付款',      // 默认值，下单后的初始状态
    pending_ship: '待发货',     // 支付完成
    pending_recv: '待收货',     // 商家已发货
    completed: '已完成',        // 用户确认或自动收货
    cancelled: '已取消',        // 用户/系统关闭订单
    refunding: '退款中',        // 发起退款申请
    refunded: '已退款'          // 退款流程结束
  }
  return statusMap[status] || '未知'
}

/**
 * 筛选订单
 */
const filterOrders = (filter) => {
  currentFilter.value = filter
}

/**
 * 搜索订单
 */
const searchOrders = () => {
  // 搜索逻辑已在计算属性中实现，这里触发响应式更新
  // 由于使用了 v-model 和 computed，输入框变化时会自动触发过滤
  console.log('[订单搜索] 搜索关键词:', searchKeyword.value)
}

/**
 * 显示排序菜单
 */
const showSortMenu = () => {
  uni.showActionSheet({
    itemList: sortOptions.map(item => item.label),
    success: (res) => {
      currentSort.value = sortOptions[res.tapIndex]
    }
  })
}

/**
 * 确认订单
 */
const confirmOrder = (order) => {
  const orderNumber = order.orderNo || order.order_number || String(order.id)
  uni.showModal({
    title: '确认订单',
    content: '确定要确认这个订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateOrderStatus(orderNumber, 'pending_ship', '商家确认订单')
        await loadOrders()
        uni.showToast({ title: '订单已确认', icon: 'success' })
        } catch (error) {
          console.error('确认订单失败:', error)
          uni.showToast({ title: error.message || '确认失败', icon: 'none' })
        }
      }
    }
  })
}

// 发货弹窗相关
const showShipModal = ref(false)
const currentShipOrder = ref(null)
const trackingNumber = ref('')
const shipLogisticsType = ref(0) // 0=实体物流(快递) 1=自提/虚拟
const shipItemDesc = ref('')
const deliveryList = ref([]) // [{ code, name }]
const selectedDelivery = ref(null)
const showDeliveryPicker = ref(false)
const deliverySearchKeyword = ref('')
const expressCompanyIndex = ref(0)
const logisticsTypeOptions = [
  { value: 0, label: '实体物流(快递)' },
  { value: 1, label: '自提/虚拟商品' }
]
const logisticsTypeIndex = ref(0)
const deliveryListForPicker = computed(() => {
  const list = deliveryList.value
  if (!list || list.length === 0) return [{ code: '', name: '加载中...' }]
  return list
})
const deliveryListFiltered = computed(() => searchDeliveryList(deliverySearchKeyword.value, deliveryList.value))
function onLogisticsTypeChange(e) {
  const i = Number(e.detail.value)
  logisticsTypeIndex.value = i
  shipLogisticsType.value = logisticsTypeOptions[i].value
}
function onSelectDelivery(item) {
  selectedDelivery.value = item
  showDeliveryPicker.value = false
  deliverySearchKeyword.value = ''
}

// 退款审核相关
const showRejectModal = ref(false)
const currentRefundOrder = ref(null)
const rejectReason = ref('')

const closeShipModal = () => {
  showShipModal.value = false
  showDeliveryPicker.value = false
  trackingNumber.value = ''
  shipItemDesc.value = ''
  shipLogisticsType.value = 0
  logisticsTypeIndex.value = 0
  selectedDelivery.value = null
  deliverySearchKeyword.value = ''
}

const closeRejectModal = () => {
  showRejectModal.value = false
}

// 不再需要地址输入弹窗，地址通过平台设置统一管理
// const showApproveModal = ref(false)
// const returnAddress = ref('')

/**
 * 发货（打开弹窗并加载快递公司列表）
 */
const shipOrder = async (order) => {
  currentShipOrder.value = order
  trackingNumber.value = ''
  shipItemDesc.value = ''
  shipLogisticsType.value = 0
  logisticsTypeIndex.value = 0
  selectedDelivery.value = null
  showDeliveryPicker.value = false
  deliverySearchKeyword.value = ''
  showShipModal.value = true
  try {
    const res = await getDeliveryList()
    const raw = (res && res.data) ? res.data : (Array.isArray(res) ? res : [])
    const list = Array.isArray(raw) ? raw.map(item => {
      if (typeof item === 'string') return { code: item, name: item }
      return { code: item.code || item.id || item.name || '', name: item.name || item.code || '' }
    }).filter(x => x.code) : []
    deliveryList.value = list.length ? list : [{ code: 'SF', name: '顺丰速运' }, { code: 'YTO', name: '圆通速递' }, { code: 'ZTO', name: '中通快递' }, { code: 'STO', name: '申通快递' }, { code: 'YD', name: '韵达速递' }, { code: 'EMS', name: 'EMS' }]
  } catch (e) {
    console.warn('获取快递列表失败，使用默认列表', e)
    deliveryList.value = [{ code: 'SF', name: '顺丰速运' }, { code: 'YTO', name: '圆通速递' }, { code: 'ZTO', name: '中通快递' }, { code: 'STO', name: '申通快递' }, { code: 'YD', name: '韵达速递' }, { code: 'EMS', name: 'EMS' }]
  }
}

/**
 * 确认发货
 */
const confirmShip = async () => {
  if (!currentShipOrder.value) return
  
  const order = currentShipOrder.value
  const orderNumber = order.orderNo || order.order_number || String(order.id)
  const trackingNum = trackingNumber.value.trim()
  const orderStatus = order.status
  
  // 发货前检查订单支付状态（只有 pending_ship 状态可以发货）
  if (orderStatus !== 'pending_ship') {
    uni.showToast({ 
      title: '该订单状态不允许发货', 
      icon: 'none',
      duration: 2500
    })
    showShipModal.value = false
    return
  }
  
  const logisticsType = shipLogisticsType.value
  const express_company = logisticsType === 0 && selectedDelivery.value ? selectedDelivery.value.code : ''
  if (logisticsType === 0 && !trackingNum) {
    uni.showToast({ title: '请填写物流单号', icon: 'none' })
    return
  }
  if (logisticsType === 0 && !express_company) {
    uni.showToast({ title: '请选择快递公司', icon: 'none' })
    return
  }
  
  uni.showLoading({ title: '处理中...' })
  showShipModal.value = false
  
  try {
    const res = await shipOrderApi(orderNumber, {
      tracking_number: trackingNum,
      express_company,
      sync_to_wechat: true,
      logistics_type: logisticsType,
      item_desc: shipItemDesc.value.trim() || undefined
    })
    
    // 检查明确的失败标识
    if (res && res.ok === false) {
      // 根据订单状态判断错误原因
      let errorMsg = res.msg || res.message
      
      // 如果没有明确的错误信息，根据订单状态推断
      if (!errorMsg) {
        if (orderStatus === 'pending_pay') {
          errorMsg = '该订单尚未支付，无法发货'
        } else {
          errorMsg = '发货失败，请检查订单号是否正确'
        }
      }
      
      throw new Error(errorMsg)
    }
    
    // 检查业务状态码 (假设非200为失败，视具体后端规范而定)
    if (res && res.code && res.code !== 200) {
      let errorMsg = res.msg || res.message
      
      // 如果没有明确的错误信息，根据订单状态推断
      if (!errorMsg) {
        if (orderStatus === 'pending_pay') {
          errorMsg = '该订单尚未支付，无法发货'
        } else {
          errorMsg = '发货失败，请检查订单号是否正确'
        }
      }
      
      throw new Error(errorMsg)
    }
    
    uni.hideLoading()
    uni.showToast({ title: '发货成功', icon: 'success' })
    await loadOrders()
  } catch (error) {
    uni.hideLoading()
    console.error('发货失败:', error)
    uni.showToast({ 
      title: error.message || '发货失败，请稍后重试', 
      icon: 'none',
      duration: 2500
    })
  }
}


/**
 * 通过退款
 */
const approveRefund = async (order) => {
  const orderNumber = order.orderNo || order.order_number || String(order.id)
  
  // 直接通过退款申请，不再需要输入退货地址
  // 退货地址通过平台设置统一管理，用户可通过 /address/platform-return 接口查看
  uni.showModal({
    title: '通过退款',
    content: '确定要通过这个退款申请吗？用户可通过订单详情查看退货地址。',
    success: async (res) => {
      if (res.confirm) {
        await doApproveRefund(orderNumber)
      }
    }
  })
}

/**
 * 执行通过退款申请
 */
const doApproveRefund = async (orderNumber) => {
  try {
    uni.showLoading({ title: '处理中...' })
    // 不再传递 merchant_address，地址通过平台设置统一管理
    // 用户可通过 /address/platform-return 接口查看退货地址
    await auditRefund({
      order_number: orderNumber,
      approve: true
    })
    uni.hideLoading()
    uni.showToast({ title: '已通过退款', icon: 'success' })
    await loadOrders()
  } catch (error) {
    uni.hideLoading()
    console.error('通过退款失败:', error)
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  }
}

// 不再需要确认通过退款函数，直接通过即可
// const confirmApproveRefund = async () => { ... }

/**
 * 拒绝退款
 */
const rejectRefund = (order) => {
  console.log('[拒绝退款] 点击拒绝退款按钮，订单:', order)
  if (!order) {
    console.error('[拒绝退款] 订单对象为空')
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    return
  }
  
  currentRefundOrder.value = order
  rejectReason.value = ''
  showRejectModal.value = true
  console.log('[拒绝退款] 弹窗已打开，showRejectModal:', showRejectModal.value)
}

/**
 * 确认拒绝退款（处理函数）
 */
const handleConfirmReject = () => {
  console.log('[拒绝退款] 点击确认拒绝按钮')
  console.log('[拒绝退款] currentRefundOrder:', currentRefundOrder.value)
  console.log('[拒绝退款] rejectReason:', rejectReason.value)
  confirmRejectRefund().catch(err => {
    console.error('[拒绝退款] handleConfirmReject 捕获错误:', err)
  })
}

/**
 * 确认拒绝退款
 */
const confirmRejectRefund = async () => {
  console.log('[确认拒绝退款] 开始处理')
  
  if (!currentRefundOrder.value) {
    console.error('[确认拒绝退款] 当前退款订单为空')
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    return
  }
  
  const order = currentRefundOrder.value
  const orderNumber = order.orderNo || order.order_number || String(order.id)
  const reason = rejectReason.value.trim()
  
  console.log('[确认拒绝退款] 订单号:', orderNumber, '拒绝原因:', reason)
  
  if (!reason) {
    uni.showToast({ title: '请输入拒绝原因', icon: 'none' })
    return
  }
  
  if (!orderNumber || orderNumber === 'undefined' || orderNumber === 'null') {
    console.error('[确认拒绝退款] 订单号无效:', orderNumber)
    uni.showToast({ title: '订单号无效', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '处理中...' })
    console.log('[确认拒绝退款] 调用API，参数:', { order_number: orderNumber, approve: false, reject_reason: reason })
    
    const result = await rejectRefundApi(orderNumber, reason)
    console.log('[确认拒绝退款] API返回结果:', result)
    
    uni.hideLoading()
    uni.showToast({ title: '已拒绝退款', icon: 'success' })
    showRejectModal.value = false
    currentRefundOrder.value = null
    rejectReason.value = ''
    await loadOrders()
  } catch (error) {
    uni.hideLoading()
    console.error('[确认拒绝退款] 失败:', error)
    console.error('[确认拒绝退款] 错误详情:', {
      message: error.message,
      response: error.response,
      data: error.data
    })
    uni.showToast({ 
      title: error.message || error.msg || '操作失败', 
      icon: 'none',
      duration: 3000
    })
  }
}

/**
 * 跳转订单详情
 */
const goToOrderDetail = (order) => {
  const orderNumber = order.orderNo || order.order_number || String(order.id)
  uni.navigateTo({ url: `/subPackages/page1/pages/merchant/order-detail?order_number=${encodeURIComponent(orderNumber)}` })
}

/**
 * 获取退款状态文本
 */
const getRefundStatusText = (status) => {
  const statusMap = {
    pending: '待审核',
    applied: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    completed: '已完成'
  }
  return statusMap[status] || '待审核'
}

/**
 * 获取订单显示状态（用于状态标签）
 * 如果退款被拒绝，显示"已拒绝"而不是"退款中"
 */
const getDisplayStatus = (order) => {
  // 检查退款状态
  if (order.status === 'refunding') {
    const refundStatus = order.refund_info?.status || order.refund?.status
    console.log('[订单列表] 订单状态检查:', {
      orderNo: order.orderNo,
      orderStatus: order.status,
      refundInfo: order.refund_info,
      refundStatus: refundStatus
    })
    if (refundStatus === 'rejected') {
      return 'rejected'
    }
  }
  return order.status
}

/**
 * 获取订单显示状态文本（用于状态标签）
 * 如果退款被拒绝，显示"已拒绝"而不是"退款中"
 */
const getDisplayStatusText = (order) => {
  // 检查退款状态
  if (order.status === 'refunding') {
    const refundStatus = order.refund_info?.status || order.refund?.status
    if (refundStatus === 'rejected') {
      return '已拒绝'
    }
  }
  return getStatusText(order.status)
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 图片加载失败处理
 */
const handleImageError = (e) => {
  e.target.src = '/static/default-product.png'
}

/**
 * 判断订单是否是今天的
 */
const isOrderToday = (order) => {
  // 获取今天的开始时间（00:00:00）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()
  
  // 获取当前时间
  const now = Date.now()
  
  // 处理创建时间 - 支持多种格式
  let createTime = null
  if (order.createTime) {
    createTime = typeof order.createTime === 'number' ? order.createTime : new Date(order.createTime).getTime()
  } else if (order.created_at) {
    createTime = typeof order.created_at === 'number' ? order.created_at : new Date(order.created_at).getTime()
  } else if (order.create_time) {
    createTime = typeof order.create_time === 'number' ? order.create_time : new Date(order.create_time).getTime()
  }
  
  // 如果无法解析时间，尝试从时间戳字符串解析
  if (!createTime || isNaN(createTime)) {
    const timeStr = order.created_at || order.create_time || order.createTime
    if (timeStr) {
      const parsed = new Date(timeStr).getTime()
      if (!isNaN(parsed)) {
        createTime = parsed
      }
    }
  }
  
  // 如果仍然无法解析，返回 false（不包含在今天的订单中）
  if (!createTime || isNaN(createTime)) {
    return false
  }
  
  return createTime >= todayStart && createTime <= now
}

// 分页相关
const page = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
const refreshing = ref(false)
const loadingMore = ref(false)

/**
 * 加载订单列表
 * @param {boolean} append - 是否追加模式（用于分页加载）
 */
const loadOrders = async (append = false) => {
  try {
    // 只在非追加模式时显示加载提示，追加模式不显示（避免频繁闪烁）
    if (!append) {
      uni.showLoading({ title: '加载中...' })
    }
    
    const res = await getMerchantOrders({
      page: page.value,
      page_size: pageSize.value
      // 不传 status 参数，获取全部订单，由前端筛选
    })
    
    // 移除大量日志输出以提升性能
    if (!append) {
      uni.hideLoading()
    }
    
    // 支持多种响应格式
    let orderList = []
    
    // 检查响应格式
    if (res && typeof res === 'object') {
      // 格式1: { code: 200, data: { list: [...] } }
      if (res.code === 200 || res.code === 0) {
        if (Array.isArray(res.data?.list)) {
          orderList = res.data.list
          console.log('[商家订单] 从 res.data.list 解析到', orderList.length, '个订单')
        } else if (Array.isArray(res.data?.orders)) {
          orderList = res.data.orders
          console.log('[商家订单] 从 res.data.orders 解析到', orderList.length, '个订单')
        } else if (Array.isArray(res.data)) {
          orderList = res.data
          console.log('[商家订单] 从 res.data 解析到', orderList.length, '个订单')
        } else if (res.data && typeof res.data === 'object') {
          // 可能是 { code: 200, data: { orders: [...] } } 或其他嵌套格式
          console.log('[商家订单] res.data 是对象，尝试查找数组字段')
          for (const key in res.data) {
            if (Array.isArray(res.data[key])) {
              orderList = res.data[key]
              console.log('[商家订单] 从 res.data.' + key + ' 解析到', orderList.length, '个订单')
              break
            }
          }
        }
      }
      // 格式2: { data: { list: [...] } } 或 { data: [...] }
      else if (res.data) {
        if (Array.isArray(res.data?.list)) {
          orderList = res.data.list
          console.log('[商家订单] 从 res.data.list (无code) 解析到', orderList.length, '个订单')
        } else if (Array.isArray(res.data)) {
          orderList = res.data
          console.log('[商家订单] 从 res.data (无code) 解析到', orderList.length, '个订单')
        }
      }
      // 格式3: 直接是数组
      else if (Array.isArray(res)) {
        orderList = res
        console.log('[商家订单] 响应直接是数组，解析到', orderList.length, '个订单')
      }
    }
    
    console.log('[商家订单] 最终解析到', orderList.length, '个订单')
    
    if (orderList.length === 0) {
      console.warn('[商家订单] ⚠️ 没有解析到任何订单，原始响应:', res)
    }
    
    // 处理订单数据，确保格式统一
    const processedOrders = await Promise.all(orderList.map(async order => {
      // 标准化订单状态（用于判断是否为退款中）
      const rawStatus = order.status || order.order_status || order.orderStatus || ''
      const normalizedStatus = rawStatus ? String(rawStatus).toLowerCase().trim() : ''
      
      // 优先使用订单数据中已有的退款信息，不立即调用API（提升加载速度）
      // 退款详情可以在订单详情页或需要时再加载
      const refundInfo = order.refund_info || order.refund || null
      
      // 处理图片URL的工具函数
      const processImageUrl = (img) => {
        if (!img || img === 'undefined' || img === 'null') return null
        if (img.startsWith('http://') || img.startsWith('https://')) return img
        if (img.startsWith('/static')) return img
        if (img.startsWith('data:')) return img
        const imagePath = img.startsWith('/') ? img : `/${img}`
        return `${config.baseURL}${imagePath}`
      }
      
      // 处理商品数据，支持多种字段名和格式，并尝试获取图片
      let products = []
      const rawProducts = order.items || order.products || order.order_items || order.orderItems || []
      
      if (Array.isArray(rawProducts) && rawProducts.length > 0) {
        products = await Promise.all(rawProducts.map(async item => {
          let image = null
          
          // 1. 优先使用 main_image
          if (item.main_image) {
            image = processImageUrl(item.main_image)
          }
          // 2. 如果没有 main_image，尝试使用 banner_images
          if (!image && item.banner_images && Array.isArray(item.banner_images) && item.banner_images.length > 0) {
            image = processImageUrl(item.banner_images[0])
          }
          // 3. 如果没有，尝试使用 images
          if (!image && item.images && Array.isArray(item.images) && item.images.length > 0) {
            image = processImageUrl(item.images[0])
          }
          // 4. 如果没有，尝试其他字段（包括 product 对象中的图片）
          if (!image) {
            // 检查是否有 product 对象
            if (item.product && typeof item.product === 'object') {
              if (item.product.main_image) {
                image = processImageUrl(item.product.main_image)
              } else if (item.product.banner_images && Array.isArray(item.product.banner_images) && item.product.banner_images.length > 0) {
                image = processImageUrl(item.product.banner_images[0])
              } else if (item.product.image_url || item.product.image) {
                image = processImageUrl(item.product.image_url || item.product.image)
              }
            }
            // 如果还是没有，尝试直接字段
            if (!image) {
              image = processImageUrl(
                item.product_image || 
                item.productImage || 
                item.image || 
                item.picture ||
                item.pic ||
                item.image_url ||
                item.imageUrl ||
                item.img
              )
            }
          }
          
          // 5. 如果还是没有图片，通过商品详情接口获取
          if (!image) {
            const productId = item.product_id || item.id
            if (productId) {
              try {
                const productRes = await getProductDetail(productId)
                const productData = productRes.data || productRes
                
                // 从商品详情中获取图片
                if (productData.main_image) {
                  image = processImageUrl(productData.main_image)
                } else if (productData.banner_images && Array.isArray(productData.banner_images) && productData.banner_images.length > 0) {
                  image = processImageUrl(productData.banner_images[0])
                } else if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
                  image = processImageUrl(productData.images[0])
                }
              } catch (error) {
                // 静默失败，使用默认图片
              }
            }
          }
          
          // 6. 如果还是没有图片，使用默认占位图
          if (!image) {
            image = '/static/logo.png'
          }
          
          return {
            id: item.id || item.product_id || item.sku_id,
            name: item.name || item.product_name || item.title || '未知商品',
            image: image,
            price: parseFloat(item.unit_price || item.price || item.product_price || 0),
            quantity: parseInt(item.quantity || item.qty || 1),
            spec: item.spec || item.sku_name || item.specification || item.skuName || '',
            unitPrice: parseFloat(item.unit_price || item.price || 0)
          }
        }))
      }
      
      // 移除日志输出以提升性能
      
      // 更全面地提取用户信息 - 参考订单详情页的逻辑
      const address = order.address || order.custom_address || {}
      const customerName = order.customer_name || 
                          order.customerName || 
                          order.consignee_name ||
                          order.consigneeName ||
                          order.user_name ||
                          order.userName ||
                          (address && (address.name || address.consignee_name)) ||
                          (order.custom_address && (order.custom_address.name || order.custom_address.consignee_name)) ||
                          '未知'
      
      const customerPhone = order.customer_phone || 
                           order.customerPhone || 
                           order.consignee_phone ||
                           order.consigneePhone ||
                           order.user_phone ||
                           order.userPhone ||
                           order.phone ||
                           order.mobile ||
                           order.user_mobile ||
                           order.userMobile ||
                           order.contact_phone ||
                           (address && (address.phone || address.mobile || address.contact_phone)) ||
                           (order.custom_address && (order.custom_address.phone || order.custom_address.mobile || order.custom_address.contact_phone)) ||
                           ''
      
      // 标准化订单状态，确保 refunding 状态能被正确识别；兼容后端返回 paid/confirmed 表示「待发货」
      let orderStatus = order.status || order.order_status || order.orderStatus || ''
      // 确保状态值统一为小写
      if (orderStatus) {
        orderStatus = String(orderStatus).toLowerCase().trim()
      }
      // 兼容：后端可能用 paid/confirmed 表示「已支付待发货」，统一为 pending_ship 以便「待发货」标签能筛到
      if (orderStatus === 'paid' || orderStatus === 'confirmed') {
        orderStatus = 'pending_ship'
      }
      
      // 获取地址信息（用于导出）
      let addressText = ''
      if (typeof address === 'string') {
        addressText = address
      } else if (address && typeof address === 'object') {
        const addrParts = []
        if (address.province) addrParts.push(address.province)
        if (address.city) addrParts.push(address.city)
        if (address.district) addrParts.push(address.district)
        if (address.detail) addrParts.push(address.detail)
        if (address.address) addrParts.push(address.address)
        addressText = addrParts.join('') || '未填写'
      }
      
      // 订单号归一化：优先业务单号，避免同一订单因 id 不同被展示多次
      const rawOrderNo = (order.order_number || order.order_no || order.orderNo || order.trade_no || order.out_trade_no || '').toString().trim()
      const orderNo = rawOrderNo || String(order.id || '')
      
      return {
        id: order.id,
        orderNo,
        status: orderStatus, // 使用标准化后的状态
        customerName: customerName,
        customerPhone: customerPhone,
        address: addressText, // 保存地址文本
        addressObj: address, // 保存地址对象
        products: products,
        totalAmount: order.total_amount || order.totalAmount || 0,
        actualAmount: order.actual_amount || order.actualAmount || order.total_amount || order.totalAmount || 0,
        createTime: order.created_at || order.createTime || order.created_time || Date.now(),
        // 退款信息（如果有）
        refund_info: refundInfo
      }
    }))
    
    // 根据 append 参数决定是替换还是追加
    if (append) {
      orders.value = [...orders.value, ...processedOrders]
    } else {
      orders.value = processedOrders
    }
    
    // 按订单号去重：同一订单号只保留一条（保留 createTime 最新的一条），避免同一订单出现多次
    const byOrderNo = {}
    const toTime = (t) => (t ? new Date(t).getTime() : 0)
    orders.value.forEach(o => {
      const no = String(o.orderNo || '').trim()
      if (!no) return
      const existing = byOrderNo[no]
      if (!existing || toTime(o.createTime) >= toTime(existing.createTime)) {
        byOrderNo[no] = o
      }
    })
    orders.value = Object.values(byOrderNo).sort((a, b) => toTime(b.createTime) - toTime(a.createTime))
    
    // 判断是否还有更多数据：如果返回的数据量小于每页大小，说明没有更多了
    hasMore.value = orderList.length >= pageSize.value
    
    // 移除日志输出以提升性能
  } catch (error) {
    uni.hideLoading()
    console.error('[商家订单] ❌ 获取订单列表失败:', error)
    console.error('[商家订单] 错误详情:', error.message, error.stack)
    orders.value = []
    hasMore.value = false
    uni.showToast({ 
      title: error.message || '获取订单列表失败，请检查网络连接', 
      icon: 'none',
      duration: 3000
    })
  }
}

/**
 * 刷新订单列表
 */
const refreshOrders = async () => {
  refreshing.value = true
  page.value = 1
  hasMore.value = true
  await loadOrders()
  refreshing.value = false
}

/**
 * 加载更多
 */
const loadMore = async () => {
  // 如果正在加载、正在刷新、或没有更多数据，则返回
  if (loadingMore.value || refreshing.value || !hasMore.value) {
    return
  }
  
  loadingMore.value = true
  try {
    page.value++
    await loadOrders(true) // 追加模式
  } catch (error) {
    console.error('[商家订单] 加载更多失败:', error)
    // 如果加载失败，回退页码
    page.value--
  } finally {
    loadingMore.value = false
  }
}

// 是否已完成首次展示（用于 onShow 时避免与 onMounted 重复请求）
const hasShownOnce = ref(false)

onShow(() => {
  if (!hasShownOnce.value) {
    hasShownOnce.value = true
    return
  }
  // 从订单详情等子页返回时刷新列表，使「确认收货」后待收货页不再显示已完成订单
  refreshOrders()
})

onMounted(() => {
  loadOrders()
  // 设置用户点击微信发货通知后的默认跳转页面。重要：后端在「发送每条发货通知」时，跳转 path 需带订单号，
  // 如 subPackages/page1/pages/order/detail?orderNo=xxx，否则用户点通知进入详情页会无订单号、显示空白。
  setWechatDeliveryJumpPath('subPackages/page1/pages/order/detail').catch(() => {})
})
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20rpx;
}

.stats-section {
  display: flex;
  background: #fff;
  padding: 20rpx 0;
  margin-bottom: 20rpx;
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stats-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.stats-label {
  font-size: 24rpx;
  color: #666;
}

.filter-section {
  background: #fff;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.filter-tabs {
  display: flex;
  margin-bottom: 20rpx;
}

.filter-tab {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  font-size: 28rpx;
  color: #666;
  border-bottom: 2rpx solid transparent;
}

.filter-tab.active {
  color: #007aff;
  border-bottom-color: #007aff;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 12rpx 20rpx;
  margin-bottom: 20rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
}

.search-icon {
  font-size: 32rpx;
  color: #666;
  margin-left: 20rpx;
  line-height: 1;
}

.sort-box {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.sort-label {
  font-size: 26rpx;
  color: #666;
  margin-right: 8rpx;
}

.sort-icon {
  font-size: 20rpx;
  color: #999;
}

.orders-list {
  height: calc(100vh - 400rpx);
}

.order-item {
  background: #fff;
  margin-bottom: 20rpx;
  padding: 30rpx;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.order-no {
  font-size: 26rpx;
  color: #666;
}

.order-status {
  padding: 8rpx 16rpx;
  border-radius: 4rpx;
  font-size: 24rpx;
}

.status-text {
  color: #fff;
}

.status-pending_pay {
  background: #fff3cd;
  color: #856404;
}

.status-pending_ship {
  background: #d1ecf1;
  color: #0c5460;
}

.status-pending_recv {
  background: #d4edda;
  color: #155724;
}

.status-completed {
  background: #d1ecf1;
  color: #0c5460;
}

.status-cancelled {
  background: #f8d7da;
  color: #721c24;
}

.status-refunding {
  background: #fff3cd;
  color: #856404;
}

.status-rejected {
  background: #f8d7da;
  color: #721c24;
}

.status-refunded {
  background: #d1ecf1;
  color: #0c5460;
}

.order-customer {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
  font-size: 26rpx;
  color: #666;
}

.order-products {
  margin-bottom: 20rpx;
}

.product-item {
  display: flex;
  margin-bottom: 20rpx;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.product-spec {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.product-price-qty {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 28rpx;
  color: #f56c6c;
  font-weight: bold;
}

.product-qty {
  font-size: 24rpx;
  color: #666;
}

.refund-info {
  background: #fff3cd;
  padding: 20rpx;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}

.refund-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.refund-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #856404;
}

.refund-status {
  font-size: 24rpx;
  color: #856404;
}

.refund-reason,
.refund-amount {
  font-size: 24rpx;
  color: #856404;
  margin-bottom: 8rpx;
}

.refund-reject-reason {
  font-size: 24rpx;
  color: #f56c6c;
  margin-bottom: 8rpx;
  font-weight: bold;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #eee;
}

.order-time {
  font-size: 24rpx;
  color: #999;
}

.order-amount {
  display: flex;
  align-items: center;
}

.amount-label {
  font-size: 26rpx;
  color: #666;
  margin-right: 8rpx;
}

.amount-value {
  font-size: 32rpx;
  color: #f56c6c;
  font-weight: bold;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
}

.action-btn {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: none;
}

.action-btn.disabled {
  background: #f5f5f5;
  color: #999;
}

.action-btn.ship {
  background: #007aff;
  color: #fff;
}

.action-btn.contact {
  background: #2196f3;
  color: #fff;
}

.action-btn.approve {
  background: #4cd964;
  color: #fff;
}

.action-btn.reject {
  background: #f56c6c;
  color: #fff;
}

.action-btn.detail {
  background: #f5f5f5;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.loading-more,
.no-more {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
}

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: #fff;
  border-radius: 16rpx;
  width: 90%;
  max-width: 650rpx;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.modal-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 30rpx;
  flex: 1;
  overflow-y: auto;
  box-sizing: border-box;
  width: 100%;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #eee;
  padding: 20rpx 30rpx;
  gap: 20rpx;
}

.modal-btn {
  flex: 1;
  padding: 24rpx 0;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
  text-align: center;
  cursor: pointer;
  user-select: none;
}

.modal-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.modal-btn.confirm {
  background: #007aff;
  color: #fff;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.form-value {
  display: block;
  width: 100%;
  font-size: 28rpx;
  color: #666;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  word-break: break-all;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  line-height: 1.5;
  box-sizing: border-box;
  overflow: visible;
}

.form-picker {
  width: 100%;
  min-height: 88rpx;
  padding: 24rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}

.form-input {
  width: 100%;
  min-height: 88rpx;
  padding: 24rpx 20rpx;
  font-size: 28rpx;
  line-height: 1.5;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  background: #fff;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx;
  font-size: 28rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  background: #fff;
  resize: none;
  box-sizing: border-box;
}

.char-count {
  font-size: 24rpx;
  color: #999;
  text-align: right;
  margin-top: 12rpx;
  display: block;
}

.delivery-picker-mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
.delivery-picker-box { width: 100%; max-height: 75vh; background: #fff; border-radius: 24rpx 24rpx 0 0; display: flex; flex-direction: column; }
.delivery-picker-header { padding: 24rpx; border-bottom: 1rpx solid #eee; }
.delivery-picker-title { display: block; font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
.delivery-picker-search { width: 100%; height: 72rpx; padding: 0 24rpx; background: #f5f5f5; border-radius: 12rpx; font-size: 28rpx; box-sizing: border-box; }
.delivery-picker-search .placeholder { color: #999; }
.delivery-picker-list { flex: 1; max-height: 50vh; padding: 16rpx 0; }
.delivery-picker-item { padding: 24rpx 32rpx; display: flex; justify-content: space-between; align-items: center; border-bottom: 1rpx solid #f5f5f5; }
.delivery-picker-item .delivery-name { font-size: 28rpx; color: #333; }
.delivery-picker-item .delivery-code { font-size: 24rpx; color: #999; }
.delivery-picker-empty { padding: 48rpx; text-align: center; font-size: 28rpx; color: #999; }
.delivery-picker-footer { padding: 24rpx; border-top: 1rpx solid #eee; }
.delivery-picker-cancel { display: block; text-align: center; font-size: 30rpx; color: #666; }
</style>
