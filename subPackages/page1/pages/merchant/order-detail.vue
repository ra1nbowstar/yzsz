<template>
  <view class="order-detail-page">
    <!-- 订单状态 -->
    <view class="order-status">
      <view class="status-icon" :class="'status-' + getDisplayStatus()">
        <text class="icon-text">{{ getStatusIcon(getDisplayStatus()) }}</text>
      </view>
      <text class="status-text">{{ getDisplayStatusText() }}</text>
      <text class="status-desc">{{ getStatusDesc(getDisplayStatus()) }}</text>
    </view>

    <!-- 客户信息 -->
    <view class="customer-info">
      <view class="section-header">
        <text class="section-title">客户信息</text>
      </view>
      <view class="info-content">
        <view class="info-row">
          <text class="info-label">客户姓名</text>
          <text class="info-value">{{ order.customerName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">联系电话</text>
          <text class="info-value">{{ maskPhone(order.customerPhone) || '未填写' }}</text>
          <view 
            v-if="order.customerPhone && order.customerPhone.trim()" 
            class="action-btn" 
            @tap="callCustomer"
          >
            <text class="btn-text">拨打</text>
          </view>
        </view>
        <view v-if="order.deliveryAddress" class="info-row address-row">
          <text class="info-label">收货地址</text>
          <text class="info-value address-text">{{ order.deliveryAddress }}</text>
        </view>
      </view>
    </view>

    <!-- 订单信息 -->
    <view class="order-info">
      <view class="section-header">
        <text class="section-title">订单信息</text>
      </view>
      <view class="info-content">
        <view class="info-row">
          <text class="info-label">订单号</text>
          <view class="order-number-box">
            <text class="order-number-text">{{ order.orderNo }}</text>
            <view class="action-btn copy-btn" @tap="copyOrderNo">
              <text class="btn-text">复制</text>
            </view>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">下单时间</text>
          <text class="info-value">{{ order.createTime }}</text>
        </view>
        <view v-if="order.payTime" class="info-row">
          <text class="info-label">付款时间</text>
          <text class="info-value">{{ order.payTime }}</text>
        </view>
        <view v-if="order.shipTime" class="info-row">
          <text class="info-label">发货时间</text>
          <text class="info-value">{{ order.shipTime }}</text>
        </view>
        <view v-if="order.completeTime" class="info-row">
          <text class="info-label">完成时间</text>
          <text class="info-value">{{ order.completeTime }}</text>
        </view>
        <view v-if="wechatOrderStatus" class="info-row">
          <text class="info-label">微信发货状态</text>
          <text class="info-value">{{ wechatOrderStatus }}</text>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="products-section">
      <view class="section-header">
        <text class="section-title">商品清单</text>
      </view>
      <view class="products-list">
        <view 
          v-for="product in order.products" 
          :key="product.id"
          class="product-item"
        >
          <image :src="product.image" class="product-image" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text v-if="product.spec" class="product-spec">{{ product.spec }}</text>
            <view class="product-price-row">
              <text class="product-price">¥{{ product.price }}</text>
              <text class="product-quantity">x{{ product.quantity }}</text>
            </view>
          </view>
          <text class="product-total">¥{{ (product.price * product.quantity).toFixed(2) }}</text>
        </view>
      </view>
    </view>

    <!-- 费用明细 -->
    <view class="cost-detail">
      <view class="section-header">
        <text class="section-title">费用明细</text>
      </view>
      <view class="cost-content">
        <view class="cost-row">
          <text class="cost-label">商品总价</text>
          <text class="cost-value">¥{{ Number(order.productAmount || order.productTotal || 0).toFixed(2) }}</text>
        </view>
        <view v-if="order.discountAmount > 0" class="cost-row">
          <text class="cost-label">优惠金额</text>
          <text class="cost-value discount">-¥{{ Number(order.discountAmount || 0).toFixed(2) }}</text>
        </view>
        <view v-if="(order.deliveryFee || 0) > 0" class="cost-row">
          <text class="cost-label">配送费</text>
          <text class="cost-value">¥{{ Number(order.deliveryFee || 0).toFixed(2) }}</text>
        </view>
        <view class="cost-row total-row">
          <text class="cost-label">实付金额</text>
          <text class="cost-value total">¥{{ Number(order.totalAmount || order.actualAmount || 0).toFixed(2) }}</text>
        </view>
      </view>
    </view>

    <!-- 物流信息 -->
    <view v-if="order.logistics" class="logistics-info">
      <view class="section-header">
        <text class="section-title">物流信息</text>
      </view>
      <view class="logistics-content">
        <view class="logistics-row">
          <text class="logistics-label">物流公司</text>
          <text class="logistics-value">{{ order.logistics.company }}</text>
        </view>
        <view class="logistics-row">
          <text class="logistics-label">运单号</text>
          <view class="order-number-box">
            <text class="order-number-text">{{ order.logistics.trackingNo }}</text>
            <view class="action-btn copy-btn" @tap="copyTrackingNo">
              <text class="btn-text">复制</text>
            </view>
          </view>
        </view>
        <view v-if="order.logistics.status" class="logistics-row">
          <text class="logistics-label">物流状态</text>
          <text class="logistics-value">{{ order.logistics.status }}</text>
        </view>
      </view>
    </view>

    <!-- 退款信息（待售后订单显示） -->
    <view v-if="order.status === 'refunding' && refundInfo" class="refund-info">
      <view class="section-header">
        <text class="section-title">退款申请信息</text>
      </view>
      <view class="refund-content">
        <view class="info-row">
          <text class="info-label">退款状态</text>
          <view class="info-value">
            <text class="refund-status-text" :class="'status-' + (refundInfo.status || 'pending')">
              {{ getRefundStatusText(refundInfo.status) }}
            </text>
          </view>
        </view>
        <view class="info-row" v-if="refundInfo.refund_type">
          <text class="info-label">退款类型</text>
          <text class="info-value">{{ getRefundTypeText(refundInfo.refund_type) }}</text>
        </view>
        <view class="info-row" v-if="refundInfo.reason_code || refundInfo.remark">
          <text class="info-label">售后原因</text>
          <text class="info-value">{{ refundInfo.reason_code || refundInfo.remark || '无' }}</text>
        </view>
        <view class="info-row" v-if="refundInfo.amount">
          <text class="info-label">退款金额</text>
          <text class="info-value">¥{{ Number(refundInfo.amount).toFixed(2) }}</text>
        </view>
        <view class="info-row" v-if="refundInfo.reject_reason">
          <text class="info-label">{{ refundInfo.status === 'approved' || refundInfo.status === 'success' ? '退货地址' : '拒绝原因' }}</text>
          <text class="info-value" :class="refundInfo.status === 'approved' || refundInfo.status === 'success' ? '' : 'reject-reason'">
            {{ refundInfo.reject_reason }}
          </text>
        </view>
        <view class="info-row" v-if="refundInfo.created_at">
          <text class="info-label">申请时间</text>
          <text class="info-value">{{ refundInfo.created_at }}</text>
        </view>
      </view>
    </view>

    <!-- 备注信息 -->
    <view v-if="order.remark" class="remark-info">
      <view class="section-header">
        <text class="section-title">订单备注</text>
      </view>
      <view class="remark-content">
        <text class="remark-text">{{ order.remark }}</text>
      </view>
    </view>

    <!-- 操作按钮（根据订单状态显示不同按钮） -->
    <view class="action-buttons">
      <!-- 待付款：不显示操作按钮 -->
      <button 
        v-if="order.status === 'pending_pay'" 
        class="action-btn disabled"
        disabled
      >
        待付款
      </button>
      
      <!-- 待发货：显示发货按钮 -->
      <button 
        v-if="order.status === 'pending_ship'" 
        class="action-btn ship"
        @tap="shipOrder"
      >
        发货
      </button>
      
      <!-- 待收货：显示确认送达按钮 -->
      <button 
        v-if="order.status === 'pending_recv'" 
        class="action-btn complete"
        @tap="completeOrder"
      >
        确认送达
      </button>
      
      <!-- 已完成：显示联系客服按钮 -->
      <button 
        v-if="order.status === 'completed'" 
        class="action-btn contact"
        @tap="showContactService"
      >
        联系客服
      </button>
      
      <!-- 待售后：显示审核按钮 -->
      <template v-if="order.status === 'refunding'">
        <!-- 如果退款信息状态是待审核或没有状态，显示通过/拒绝按钮 -->
        <template v-if="!refundInfo || !refundInfo.status || refundInfo.status === 'pending' || refundInfo.status === 'applied'">
          <button 
            class="action-btn approve"
            @tap="approveRefund"
          >
            通过退款
          </button>
          <button 
            class="action-btn reject"
            @tap="rejectRefund"
          >
            拒绝退款
          </button>
        </template>
        <!-- 如果退款信息状态不是待审核，显示状态文本 -->
        <button 
          v-else
          class="action-btn disabled"
          disabled
        >
          {{ getRefundStatusText(refundInfo.status) }}
        </button>
      </template>
      
    </view>
    
    
    <!-- 拒绝退款弹窗 -->
    <view class="modal-mask" v-if="showRejectModal" @tap="closeRejectModal" @touchmove.stop.prevent>
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">拒绝退款申请</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">订单号</text>
            <text class="form-value">{{ order.orderNo }}</text>
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
          <view class="modal-btn cancel" @tap="closeRejectModal">取消</view>
          <view class="modal-btn confirm" @tap="confirmReject">确认拒绝</view>
        </view>
      </view>
    </view>
    
    <!-- 发货弹窗 -->
    <view class="modal-mask" v-if="showShipModal" @tap="closeShipModal" @touchmove.stop.prevent>
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">发货</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">订单号</text>
            <text class="form-value">{{ order.orderNo || order.order_number || '' }}</text>
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
          <!-- 快递公司选择弹窗：常用置顶 + 搜索 -->
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
            <text class="form-label">快递单号 *</text>
            <input 
              class="form-input" 
              v-model="trackingNumber" 
              placeholder="请输入快递单号"
              placeholder-style="color: #999"
              :focus="showShipModal"
              maxlength="50"
            />
          </view>
          <view class="form-item">
            <text class="form-label">商品描述</text>
            <input 
              class="form-input" 
              v-model="shipItemDesc" 
              placeholder="选填"
              type="text"
            />
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @tap="closeShipModal">取消</view>
          <view class="modal-btn confirm" @tap="confirmShip">确认发货</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { updateOrderStatus, shipOrder as shipOrderApi, getDeliveryList, getOrderDetail, confirmReceive } from '@/api/order.js'
import { searchDeliveryList } from '@/data/delivery-list.js'
import { auditRefund, getRefundProgress } from '../../api/refund.js'
import config from '@/utils/config.js'
import { getProductDetail } from '@/api/product.js'

const orderNumber = ref('')

// 防止同一订单详情被连续请求多次（避免 /order/detail 被连续调用 3 次）
const orderDetailLoadingRef = ref(false)

// 订单详情
const order = ref({
  id: 0,
  orderNo: '',
  status: '',
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  createTime: '',
  payTime: '',
  shipTime: null,
  completeTime: null,
  totalAmount: 0,
  productAmount: 0,
  discountAmount: 0,
  deliveryFee: 0,
  remark: '',
  logistics: null,
  products: []
})

// 微信小程序发货状态（图4接口返回：1待发货 2已发货 3确认收货 4交易完成 5已退款 6资金待结算）
const wechatOrderStatus = ref('')

// 退款信息
const refundInfo = ref(null)

// 拒绝退款弹窗
const showRejectModal = ref(false)
const rejectReason = ref('')

const closeRejectModal = () => {
  showRejectModal.value = false
}

const closeShipModal = () => {
  showShipModal.value = false
}

// 不再需要地址输入弹窗，地址通过平台设置统一管理
// const showApproveModal = ref(false)
// const returnAddress = ref('')

/**
 * 获取状态图标
 */
const getStatusIcon = (status) => {
  const iconMap = {
    pending_pay: '⏳',      // 待付款
    pending_ship: '📦',      // 待发货
    pending_recv: '🚚',     // 待收货
    completed: '🎉',          // 已完成
    cancelled: '❌',        // 已取消
    refunding: '🔄',        // 退款中
    refunded: '✅',          // 已退款
    rejected: '❌'          // 已拒绝
  }
  return iconMap[status] || '❓'
}

/**
 * 获取订单显示状态（用于状态标签和图标）
 * 如果退款被拒绝，显示"已拒绝"而不是"退款中"
 */
const getDisplayStatus = () => {
  if (order.value.status === 'refunding' && refundInfo.value && refundInfo.value.status === 'rejected') {
    return 'rejected'
  }
  return order.value.status
}

/**
 * 获取订单显示状态文本（用于状态标签）
 * 如果退款被拒绝，显示"已拒绝"而不是"退款中"
 */
const getDisplayStatusText = () => {
  if (order.value.status === 'refunding' && refundInfo.value && refundInfo.value.status === 'rejected') {
    return '已拒绝'
  }
  return getStatusText(order.value.status)
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const textMap = {
    pending_pay: '待付款',      // 默认值，下单后的初始状态
    pending_ship: '待发货',     // 支付完成
    pending_recv: '待收货',     // 商家已发货
    completed: '已完成',        // 用户确认或自动收货
    cancelled: '已取消',        // 用户/系统关闭订单
    refunding: '退款中',        // 发起退款申请
    refunded: '已退款'          // 退款流程结束
  }
  return textMap[status] || (status ? status : '未知状态')
}

/**
 * 获取状态描述
 */
const getStatusDesc = (status) => {
  const descMap = {
    pending_pay: '等待买家付款',      // 默认值，下单后的初始状态
    pending_ship: '等待商家发货',     // 支付完成
    pending_recv: '商品正在配送中',   // 商家已发货
    completed: '订单已完成',          // 用户确认或自动收货
    cancelled: '订单已取消',         // 用户/系统关闭订单
    refunding: '订单待售后处理',     // 发起退款申请
    refunded: '退款流程已结束',       // 退款流程结束
    rejected: '退款申请已拒绝'        // 退款被拒绝
  }
  return descMap[status] || ''
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
 * 获取退款类型文本
 */
const getRefundTypeText = (type) => {
  const typeMap = {
    refund_only: '仅退款',
    return: '退货退款',
    return_refund: '退货退款',
    exchange: '换货'
  }
  return typeMap[type] || type || '仅退款'
}

/**
 * 手机号脱敏（显示为：138****5678 格式）
 */
const maskPhone = (phone) => {
  if (!phone || !phone.trim()) return ''
  const str = String(phone).trim()
  // 如果已经包含*，说明已经脱敏，直接返回
  if (str.includes('*')) return str
  // 如果长度小于7，直接返回原值
  if (str.length < 7) return str
  // 前3位 + **** + 后4位
  return str.substring(0, 3) + '****' + str.substring(str.length - 4)
}

/**
 * 拨打客户电话
 */
const callCustomer = () => {
  if (!order.value.customerPhone || !order.value.customerPhone.trim()) {
    uni.showToast({ title: '电话号码为空', icon: 'none' })
    return
  }
  
  // 清理电话号码（移除空格、横线等，但保留星号用于脱敏显示）
  let phoneNumber = order.value.customerPhone.trim()
  
  // 如果电话号码中包含星号（脱敏），提示用户无法拨打
  if (phoneNumber.includes('*')) {
    uni.showToast({ 
      title: '电话号码已脱敏，无法拨打', 
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  // 移除电话号码中的非数字字符（保留+号用于国际号码）
  phoneNumber = phoneNumber.replace(/[^\d+]/g, '')
  
  if (!phoneNumber) {
    uni.showToast({ title: '电话号码格式错误', icon: 'none' })
    return
  }
  
  uni.makePhoneCall({
    phoneNumber: phoneNumber,
    success: () => {
      console.log('[拨打电话] 拨打成功:', phoneNumber)
    },
    fail: (err) => {
      console.error('[拨打电话] 拨打失败:', err)
      uni.showToast({ 
        title: err.errMsg || '拨打失败', 
        icon: 'none',
        duration: 2000
      })
    }
  })
}

/**
 * 复制订单号
 */
const copyOrderNo = () => {
  uni.setClipboardData({
    data: order.value.orderNo,
    success: () => {
      uni.showToast({ title: '订单号已复制', icon: 'success' })
    }
  })
}

/**
 * 复制运单号
 */
const copyTrackingNo = () => {
  if (order.value.logistics && order.value.logistics.trackingNo) {
    uni.setClipboardData({
      data: order.value.logistics.trackingNo,
      success: () => {
        uni.showToast({ title: '运单号已复制', icon: 'success' })
      }
    })
  }
}

/**
 * 通过退款申请
 */
const approveRefund = () => {
  const orderNo = order.value.orderNo || order.value.order_number || String(order.value.id)
  
  if (!orderNo || orderNo.trim() === '' || orderNo === 'undefined' || orderNo === 'null') {
    uni.showToast({ title: '订单号无效', icon: 'none' })
    return
  }
  
  // 直接通过退款申请，不再需要输入退货地址
  // 退货地址通过平台设置统一管理，用户可通过 /address/platform-return 接口查看
  uni.showModal({
    title: '确认通过',
    content: '确定要通过该退款申请吗？用户可通过订单详情查看退货地址。',
    success: async (res) => {
      if (res.confirm) {
        await doApproveRefund(orderNo)
      }
    }
  })
}

/**
 * 执行通过退款申请
 */
const doApproveRefund = async (orderNo) => {
  try {
    uni.showLoading({ title: '处理中...' })
    await auditRefund({
      order_number: orderNo,
      approve: true
      // 不再传递 merchant_address，地址通过平台设置统一管理
      // 用户可通过 /address/platform-return 接口查看退货地址
    })
    uni.hideLoading()
    uni.showToast({ title: '已通过退款申请', icon: 'success' })
    // 重新加载订单详情和退款信息
    await loadOrderDetail(orderNo)
  } catch (error) {
    uni.hideLoading()
    console.error('[商户订单详情] 通过退款申请失败:', error)
    uni.showToast({ 
      title: error.message || error.msg || '操作失败', 
      icon: 'none',
      duration: 3000
    })
  }
}

/**
 * 拒绝退款申请
 */
const rejectRefund = () => {
  const orderNo = order.value.orderNo || order.value.order_number || String(order.value.id)
  
  if (!orderNo || orderNo.trim() === '' || orderNo === 'undefined' || orderNo === 'null') {
    uni.showToast({ title: '订单号无效', icon: 'none' })
    return
  }
  
  rejectReason.value = ''
  showRejectModal.value = true
}

/**
 * 确认拒绝退款
 */
const confirmReject = async () => {
  if (!rejectReason.value || !rejectReason.value.trim()) {
    uni.showToast({ title: '请输入拒绝原因', icon: 'none' })
    return
  }
  
  const orderNo = order.value.orderNo || order.value.order_number || String(order.value.id)
  
  if (!orderNo || orderNo.trim() === '' || orderNo === 'undefined' || orderNo === 'null') {
    uni.showToast({ title: '订单号无效', icon: 'none' })
    showRejectModal.value = false
    return
  }
  
  showRejectModal.value = false
  
  try {
    uni.showLoading({ title: '处理中...' })
    await auditRefund({
      order_number: orderNo,
      approve: false,
      reject_reason: rejectReason.value.trim()
    })
    uni.hideLoading()
    uni.showToast({ title: '已拒绝退款申请', icon: 'success' })
    // 重新加载订单详情和退款信息
    await loadOrderDetail(orderNo)
  } catch (error) {
    uni.hideLoading()
    console.error('[商户订单详情] 拒绝退款申请失败:', error)
    uni.showToast({ 
      title: error.message || error.msg || '操作失败', 
      icon: 'none',
      duration: 3000
    })
  }
}

/**
 * 确认订单
 */
const confirmOrder = () => {
  const orderNumber = order.value.orderNo || order.value.order_number || String(order.value.id)
  uni.showModal({
    title: '确认订单',
    content: '确定要确认这个订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateOrderStatus(orderNumber, 'pending_ship', '商家确认订单')
          // 重新加载详情，确保与列表和用户侧状态同步
          loadOrderDetail(order.value.orderNo || order.value.order_number || orderNumber.value)
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
const trackingNumber = ref('')
const shipLogisticsType = ref(0)
const shipItemDesc = ref('')
const deliveryList = ref([])
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

/**
 * 发货（打开弹窗并加载快递公司列表）
 */
const shipOrder = async () => {
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
    deliveryList.value = [{ code: 'SF', name: '顺丰速运' }, { code: 'YTO', name: '圆通速递' }, { code: 'ZTO', name: '中通快递' }, { code: 'STO', name: '申通快递' }, { code: 'YD', name: '韵达速递' }, { code: 'EMS', name: 'EMS' }]
  }
}

/**
 * 确认发货
 */
const confirmShip = async () => {
  const orderNumber = order.value.orderNo || order.value.order_number || String(order.value.id)
  const trackingNum = trackingNumber.value ? String(trackingNumber.value).trim() : ''
  const orderStatus = order.value.status
  const logisticsType = shipLogisticsType.value
  const express_company = logisticsType === 0 && selectedDelivery.value ? selectedDelivery.value.code : ''
  
  if (orderStatus !== 'pending_ship') {
    uni.showToast({ title: '该订单尚未支付，无法发货', icon: 'none', duration: 2500 })
    showShipModal.value = false
    return
  }
  if (logisticsType === 0) {
    if (!trackingNum) {
      uni.showToast({ title: '请输入快递单号', icon: 'none' })
      return
    }
    if (!express_company) {
      uni.showToast({ title: '请选择快递公司', icon: 'none' })
      return
    }
  }
  
  uni.showLoading({ title: '处理中...' })
  showShipModal.value = false
  
  try {
    const res = await shipOrderApi(orderNumber, {
      tracking_number: trackingNum,
      express_company,
      sync_to_wechat: true,
      logistics_type: logisticsType,
      item_desc: shipItemDesc.value ? String(shipItemDesc.value).trim() : ''
    })
    
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
    
    // 检查业务状态码
    if (res && res.code && res.code !== 200) {
      let errorMsg = res.msg || res.message
      
      if (!errorMsg) {
        if (orderStatus === 'pending' || orderStatus === 'pending_payment' || orderStatus === 'pending_pay') {
          errorMsg = '该订单尚未支付，无法发货'
        } else {
          errorMsg = '发货失败，请检查订单号是否正确'
        }
      }
      
      throw new Error(errorMsg)
    }
    
    uni.hideLoading()
    // 重新加载详情
    await loadOrderDetail(order.value.orderNo || order.value.order_number || String(order.value.id))
    uni.showToast({ title: '已发货', icon: 'success' })
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ 
      title: error.message || '发货失败，请检查订单是否已支付', 
      icon: 'none',
      duration: 3000
    })
  }
}

/** 确认送达：弹窗确认后仅调后端确认收货接口，不调起微信官方组件 */
const completeOrder = () => {
  const orderNumber = order.value.orderNo || order.value.order_number || String(order.value.id)
  if (!orderNumber || orderNumber.trim() === '' || orderNumber === 'undefined' || orderNumber === 'null') {
    uni.showToast({ title: '订单号无效', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认收货',
    content: '确认收货后，该订单将无法申请退款。收货后如有疑问，请联系平台客服。\n\n确定要确认收货吗？',
    confirmText: '确定',
    confirmColor: '#3d6bff',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) doConfirmReceiveApi()
    }
  })
}

const doConfirmReceiveApi = async () => {
  const orderNo = order.value.orderNo || order.value.order_number || String(order.value.id)
  const transactionId = order.value.transaction_id || order.value.transactionId
  const transactionIdStr = transactionId != null ? String(transactionId).trim() : ''
  try {
    uni.showLoading({ title: '处理中...', mask: true })
    console.log('[商户订单详情] 确认收货，订单号:', orderNo, '有流水号:', !!transactionIdStr)
    if (transactionIdStr && transactionIdStr !== 'undefined' && transactionIdStr !== 'null') {
      await confirmReceive({
        order_number: orderNo,
        transaction_id: transactionIdStr
      })
    } else {
      await updateOrderStatus(orderNo, 'completed', '商户确认送达')
    }
    order.value.status = 'completed'
    uni.hideLoading()
    uni.showToast({ title: '订单已完成', icon: 'success' })
    await loadOrderDetail(orderNo)
  } catch (error) {
    uni.hideLoading()
    console.error('[商户订单详情] 确认收货失败:', error)
    const errorMsg = error?.message || error?.msg || error?.errorMsg || '操作失败，请稍后重试'
    uni.showToast({ title: errorMsg, icon: 'none', duration: 2000 })
  }
}

/**
 * 显示联系客服
 */
const showContactService = () => {
  // 客服电话（可以从配置中获取，这里先写死）
  const servicePhone = '400-123-4567' // TODO: 从配置文件或API获取
  
  uni.showModal({
    title: '联系客服',
    content: `客服电话：${servicePhone}\n\n是否拨打客服电话？`,
    confirmText: '拨打',
    confirmColor: '#3d6bff',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        uni.makePhoneCall({
          phoneNumber: servicePhone,
          success: () => {
            console.log('[联系客服] 拨打成功:', servicePhone)
          },
          fail: (err) => {
            console.error('[联系客服] 拨打失败:', err)
            uni.showToast({ 
              title: err.errMsg || '拨打失败', 
              icon: 'none',
              duration: 2000
            })
          }
        })
      }
    }
  })
}

/**
 * 取消订单
 */
const cancelOrder = () => {
  uni.showModal({
    title: '取消订单',
    content: '确定要取消这个订单吗？',
    success: (res) => {
      if (res.confirm) {
        order.value.status = 'cancelled'
        uni.showToast({ title: '订单已取消', icon: 'success' })
      }
    }
  })
}

/**
 * 格式化时间
 */
const formatTime = (datetime) => {
  if (!datetime) return ''
  const time = new Date(datetime)
  const year = time.getFullYear()
  const month = String(time.getMonth() + 1).padStart(2, '0')
  const day = String(time.getDate()).padStart(2, '0')
  const hour = String(time.getHours()).padStart(2, '0')
  const minute = String(time.getMinutes()).padStart(2, '0')
  const second = String(time.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

/**
 * 加载订单详情
 */
const loadOrderDetail = async (orderNo) => {
  if (orderDetailLoadingRef.value) {
    return
  }
  try {
    // 验证订单号
    if (!orderNo) {
      throw new Error('订单号不能为空')
    }
    
    const orderNoStr = String(orderNo).trim()
    if (!orderNoStr || orderNoStr === 'undefined' || orderNoStr === 'null') {
      throw new Error('订单号无效: ' + orderNoStr)
    }
    
    orderDetailLoadingRef.value = true
    console.log('[商户订单详情] loadOrderDetail 开始, 订单号:', orderNoStr)
    uni.showLoading({ title: '加载中...' })
    
    // 从 API 获取订单详情（使用 order_number）
    const res = await getOrderDetail(orderNoStr)
    
    // 处理不同的响应格式
    let orderData = null
    let userData = null
    let itemsData = null
    let addressData = null
    
    if (res.data) {
      // 如果 res.data 是对象，可能包含 order_info 和 user
      if (res.data.order_info) {
        orderData = res.data.order_info
        userData = res.data.user || null
        itemsData = res.data.items || null
        addressData = res.data.address || null
      } else {
        orderData = res.data
        userData = res.user || null
        itemsData = res.items || null
        addressData = res.address || null
      }
    } else if (res.order_info || res['order info']) {
      // 处理带有 "order_info" 或 "order info" 字段的响应格式
      orderData = res.order_info || res['order info']
      userData = res.user || null
      itemsData = res.items || null
      addressData = res.address || null
    } else if (typeof res === 'object' && res.id) {
      orderData = res
      userData = res.user || null
      itemsData = res.items || null
      addressData = res.address || null
    } else if (Array.isArray(res.data) && res.data.length > 0) {
      orderData = res.data[0]
      userData = res.user || null
      itemsData = res.items || null
      addressData = res.address || null
    } else {
      console.error('无法解析的订单数据格式:', res)
      throw new Error('订单数据格式错误')
    }
    
    if (!orderData) {
      throw new Error('订单数据为空')
    }
    
    // 如果 items 在顶层，合并到 orderData
    if (itemsData && !orderData.items) {
      orderData.items = itemsData
    }
    
    // 如果 address 在顶层，合并到 orderData
    if (addressData && !orderData.address) {
      orderData.address = addressData
    }
    
    console.log('[商户订单详情] 原始订单数据:', orderData)
    console.log('[商户订单详情] 用户数据:', userData)
    
    // 格式化订单数据
    // 计算商品总价：如果API没有返回product_amount，从items中计算
    let calculatedProductAmount = 0
    if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
      calculatedProductAmount = orderData.items.reduce((sum, item) => {
        const price = parseFloat(item.unit_price || item.price || 0)
        const quantity = parseInt(item.quantity || 1)
        return sum + (price * quantity)
      }, 0)
    }
    
    // 处理地址信息
    const address = orderData.address || addressData || orderData.custom_address || {}
    
    // 优先使用新的 user 对象中的信息
    // 如果没有 user 对象，则从订单数据中提取
    const customerName = userData?.name || 
                        orderData.consignee_name || 
                        orderData.user_name || 
                        orderData.customer_name || 
                        orderData.customerName || 
                        (address && address.name) || 
                        '客户'
    
    const customerPhone = userData?.mobile || 
                         orderData.consignee_phone || 
                         orderData.user_phone || 
                         orderData.customer_phone || 
                         orderData.customerPhone ||
                         orderData.phone ||
                         orderData.mobile ||
                         orderData.user_mobile ||
                         orderData.contact_phone ||
                         (address && (address.phone || address.mobile || address.contact_phone)) ||
                         (orderData.custom_address && (orderData.custom_address.phone || orderData.custom_address.mobile || orderData.custom_address.contact_phone)) ||
                         ''
    
    console.log('[商户订单详情] 客户信息提取:', {
      user对象: userData,
      user_name: userData?.name,
      user_mobile: userData?.mobile,
      consignee_name: orderData.consignee_name,
      consignee_phone: orderData.consignee_phone,
      address: address,
      最终姓名: customerName,
      最终电话: customerPhone
    })
    
    // 处理商品列表（改为异步处理，支持通过商品详情接口获取图片）
    const products = await Promise.all((orderData.items || orderData.products || []).map(async (item) => {
      // 处理规格信息
      let specText = ''
      if (item.specifications && typeof item.specifications === 'object') {
        specText = Object.entries(item.specifications)
          .map(([key, value]) => `${key}：${value}`)
          .join('；')
      } else if (item.spec) {
        specText = item.spec
      }
      
      // 处理图片：参考用户端订单详情的逻辑，检查所有可能的图片字段
      const processImageUrl = (img) => {
        if (!img || img === 'undefined' || img === 'null') return null
        if (img.startsWith('http://') || img.startsWith('https://')) return img
        if (img.startsWith('/static')) return img
        if (img.startsWith('data:')) return img
        const imagePath = img.startsWith('/') ? img : `/${img}`
        return `${config.baseURL}${imagePath}`
      }
      
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
            
            if (image) {
              console.log('[商户订单详情] 通过商品详情接口获取到图片:', {
                product_id: productId,
                product_name: item.product_name || item.name,
                image: image
              })
            }
          } catch (error) {
            console.warn('[商户订单详情] 通过商品详情接口获取图片失败:', error)
          }
        }
      }
      
      // 6. 如果还是没有图片，使用默认占位图
      if (!image) {
        image = '/static/logo.png'
        console.warn('[商户订单详情] 商品没有找到图片，使用默认图片，商品数据:', item)
      }
      
      return {
        id: item.product_id || item.id,
        name: item.product_name || item.name || '未知商品',
        spec: specText,
        quantity: parseInt(item.quantity || 1),
        price: parseFloat(item.unit_price || item.price || 0),
        image: image
      }
    }))
    
    // 处理地址字符串
    let addressText = ''
    if (orderData.shipping_address) {
      addressText = orderData.shipping_address
    } else if (address && typeof address === 'object') {
      const parts = []
      if (address.province) parts.push(address.province)
      if (address.city) parts.push(address.city)
      if (address.district) parts.push(address.district)
      if (address.detail) parts.push(address.detail)
      addressText = parts.join('')
    } else if (typeof address === 'string') {
      addressText = address
    }
    
    order.value = {
      id: orderData.id,
      orderNo: orderData.order_number || orderData.order_no || orderData.orderNo || String(orderData.id),
      status: orderData.status || '',
      customerName: customerName,
      customerPhone: customerPhone,
      deliveryAddress: addressText,
      createTime: formatTime(orderData.created_at || orderData.createTime || orderData.create_time),
      payTime: orderData.paid_at ? formatTime(orderData.paid_at) : (orderData.pay_time ? formatTime(orderData.pay_time) : ''),
      shipTime: orderData.shipped_at ? formatTime(orderData.shipped_at) : (orderData.ship_time ? formatTime(orderData.ship_time) : null),
      completeTime: orderData.completed_at ? formatTime(orderData.completed_at) : (orderData.complete_time ? formatTime(orderData.complete_time) : null),
      // 优先使用API返回的product_amount，如果没有则使用计算的商品总价
      productAmount: parseFloat(orderData.product_amount || orderData.productAmount || calculatedProductAmount || orderData.item_amount || 0),
      deliveryFee: parseFloat(orderData.shipping_fee || orderData.shippingFee || orderData.delivery_fee || orderData.deliveryFee || 0),
      totalAmount: parseFloat(orderData.actual_amount || orderData.actualAmount || orderData.total_amount || orderData.totalAmount || 0),
      // 优惠金额 = 原价 - 实付（原价 = 商品总价 + 配送费）
      discountAmount: (() => {
        const productAmount = parseFloat(orderData.product_amount || orderData.productAmount || calculatedProductAmount || orderData.item_amount || 0)
        const deliveryFee = parseFloat(orderData.shipping_fee || orderData.shippingFee || orderData.delivery_fee || orderData.deliveryFee || 0)
        const totalAmount = parseFloat(orderData.actual_amount || orderData.actualAmount || orderData.total_amount || orderData.totalAmount || 0)
        return Math.max(0, productAmount + deliveryFee - totalAmount)
      })(),
      remark: orderData.remark || orderData.note || '',
      logistics: orderData.logistics_company ? {
        company: orderData.logistics_company,
        trackingNo: orderData.logistics_no || orderData.logisticsNo || orderData.tracking_number || orderData.trackingNumber || '',
        status: orderData.logistics_status || ''
      } : null,
      products: products,
      // 微信确认收货组件需要
      transaction_id: orderData.transaction_id || orderData.transactionId || '',
      transactionId: orderData.transaction_id || orderData.transactionId || '',
      merchant_id: orderData.merchant_id || orderData.mch_id || '',
      mch_id: orderData.merchant_id || orderData.mch_id || ''
    }
    
    // 仅使用后端订单状态，不再请求微信 order-status 接口（避免 404）
    wechatOrderStatus.value = ''
    
    // 加载退款信息 - 检查多个可能的来源
    // 1. 优先从订单详情API返回的数据中获取
    let refundData = null
    if (orderData.refund_info || orderData.refundInfo) {
      refundData = orderData.refund_info || orderData.refundInfo
      console.log('[商户订单详情] 从订单详情中获取到退款信息:', refundData)
    } else if (res.data?.refund_info || res.data?.refundInfo) {
      refundData = res.data.refund_info || res.data.refundInfo
      console.log('[商户订单详情] 从响应data中获取到退款信息:', refundData)
    } else if (res.refund_info || res.refundInfo) {
      refundData = res.refund_info || res.refundInfo
      console.log('[商户订单详情] 从响应根对象中获取到退款信息:', refundData)
    }
    
    // 2. 如果订单状态是退款中，且没有从订单详情中获取到，则单独调用退款进度接口
    if ((order.value.status === 'refunding' || orderData.refund_status) && !refundData) {
      try {
        const refundRes = await getRefundProgress(order.value.orderNo)
        refundData = refundRes.data || refundRes
        console.log('[商户订单详情] 从退款进度接口获取到退款信息:', refundData)
      } catch (refundError) {
        console.warn('[商户订单详情] 获取退款信息失败:', refundError)
        refundData = null
      }
    }
    
    // 设置退款信息
    if (refundData) {
      // 处理不同的数据格式
      refundInfo.value = {
        status: refundData.status || refundData.refund_status || 'pending',
        refund_type: refundData.refund_type || refundData.type || refundData.refundType,
        reason_code: refundData.reason_code || refundData.reason || refundData.reasonCode || refundData.description,
        reject_reason: refundData.reject_reason || refundData.rejectReason || refundData.reject_reason_text,
        created_at: refundData.created_at || refundData.create_time || refundData.createdAt || refundData.apply_time,
        amount: refundData.amount || refundData.refund_amount || refundData.refundAmount,
        remark: refundData.remark || refundData.note || refundData.description
      }
      console.log('[商户订单详情] 处理后的退款信息:', refundInfo.value)
    } else {
      refundInfo.value = null
    }
    
    uni.hideLoading()
    console.log('[商户订单详情] 加载完成:', order.value)
  } catch (error) {
    uni.hideLoading()
    console.error('[商户订单详情] 加载订单详情失败:', error)
    // API 失败时返回空数据
    order.value = {
      id: 0,
      orderNo: orderNo || '',
      status: '',
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      createTime: '',
      payTime: '',
      shipTime: null,
      completeTime: null,
      totalAmount: 0,
      productAmount: 0,
      discountAmount: 0,
      deliveryFee: 0,
      remark: '',
      logistics: null,
      products: []
    }
    refundInfo.value = null
    uni.showToast({ 
      title: error.message || error.msg || '加载失败', 
      icon: 'none',
      duration: 3000
    })
  } finally {
    orderDetailLoadingRef.value = false
  }
}

onLoad((options) => {
  console.log('[商户订单详情] onLoad 接收到的参数:', options)
  
  // 优先使用 order_number，如果没有则使用 id（兼容旧版本）
  const orderNo = options.order_number || options.orderNumber || options.order_no || options.id
  
  if (!orderNo) {
    console.error('[商户订单详情] 订单号参数为空:', options)
    uni.showToast({ title: '订单号不能为空', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }
  
  // 解码并验证订单号
  const decodedOrderNo = decodeURIComponent(String(orderNo)).trim()
  
  if (!decodedOrderNo || decodedOrderNo === 'undefined' || decodedOrderNo === 'null') {
    console.error('[商户订单详情] 订单号无效:', decodedOrderNo, '原始参数:', options)
    uni.showToast({ title: '订单号无效', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }
  
  orderNumber.value = decodedOrderNo
  console.log('[商户订单详情] 开始加载订单详情, 订单号:', decodedOrderNo)
  loadOrderDetail(decodedOrderNo)
})

// 从微信确认收货组件返回时，若 App.onShow 未收到 referrerInfo，在此调后端同步并刷新详情
onShow(() => {
  try {
    const raw = uni.getStorageSync('pending_confirm_receive')
    if (!raw) return
    const p = JSON.parse(raw)
    const currentNo = (order.value && (order.value.orderNo || order.value.order_number)) || orderNumber.value
    if (!p.orderNo || !currentNo || p.orderNo !== currentNo) return
    console.log('[商户订单详情] onShow 兜底：调后端确认收货', p.orderNo)
    confirmReceive({ order_number: p.orderNo, transaction_id: p.transactionId || undefined }).then(() => {
      try { uni.removeStorageSync('pending_confirm_receive') } catch (e) {}
      uni.showToast({ title: '收货已同步', icon: 'success' })
      loadOrderDetail(p.orderNo)
    }).catch((err) => {
      console.warn('[商户订单详情] onShow 兜底确认收货失败', err)
      const msg = err?.message || err?.msg || ''
      const isUnknownState = /未知状态|None|未确认收货/i.test(msg)
      if (isUnknownState) {
        uni.showModal({
          title: '收货状态未更新',
          content: '微信收货状态可能尚未更新。请稍后点击「重试」或返回刷新。',
          showCancel: true,
          confirmText: '重试',
          success: (res) => {
            if (res.confirm) {
              confirmReceive({ order_number: p.orderNo, transaction_id: p.transactionId || undefined }).then(() => {
                try { uni.removeStorageSync('pending_confirm_receive') } catch (e) {}
                loadOrderDetail(p.orderNo)
                uni.showToast({ title: '收货已同步', icon: 'success' })
              }).catch(() => {})
            }
          }
        })
      }
    })
  } catch (e) {
    console.warn('[商户订单详情] onShow 兜底解析 pending_confirm_receive 失败', e)
  }
})

onMounted(() => {
  console.log('订单详情页面加载')
})
</script>

<style scoped>
.order-detail-page {
  padding: 40rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

/* 订单状态 */
.order-status {
  background: white;
  border-radius: 20rpx;
  padding: 50rpx;
  margin-bottom: 30rpx;
  text-align: center;
}

.status-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20rpx;
  font-size: 60rpx;
}

.status-pending {
  background: #fff3cd;
}

.status-confirmed {
  background: #cce5ff;
}

.status-pending_ship {
  background: #cce5ff;
}

.status-shipping {
  background: #e1f5fe;
}

.status-pending_recv {
  background: #e1f5fe;
}

.status-refunding {
  background: #fff3cd;
}

.status-refunded {
  background: #e8f5e9;
}

.status-completed {
  background: #e8f5e9;
}

.status-cancelled {
  background: #ffebee;
}

.status-text {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.status-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
}

/* 通用区块样式 */
.customer-info,
.order-info,
.products-section,
.cost-detail,
.logistics-info,
.remark-info {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
}

.section-header {
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
}

.order-number-box {
  display: flex;
  align-items: center;
  flex: 1;
  margin-left: 20rpx;
  justify-content: flex-end;
  min-width: 0;  /* 添加这行 */
  overflow: hidden;  /* 添加这行 */
}

.order-number-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24rpx;  /* 改小一点，从 28rpx 改为 24rpx */
  color: #666;  /* 颜色淡一点 */
  text-align: right;
  margin-right: 16rpx;  /* 减小间距 */
  min-width: 0;  /* 添加这行 */
}

.copy-btn {
  flex-shrink: 0;
  margin-left: 0 !important;  /* 强制覆盖 .action-btn 的 margin */
  padding: 6rpx 16rpx;  /* 稍微减小 padding */
  font-size: 22rpx;  /* 稍微减小字体 */
}

.info-row.address-row {
  align-items: flex-start;
}

.info-label {
  font-size: 28rpx;
  color: #666;
  min-width: 160rpx;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  color: #333;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.address-text {
  text-align: left;
  line-height: 1.5;
  margin-left: 20rpx;
  white-space: normal;
}

.action-btn {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  background: #ff9800;
  color: white;
  border-radius: 20rpx;
  font-size: 24rpx;
  margin-left: 20rpx;
}

/* 商品列表 */
.products-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
  flex-shrink: 0;
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

.product-spec {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.product-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 28rpx;
  color: #ff9800;
  font-weight: 600;
}

.product-quantity {
  font-size: 24rpx;
  color: #666;
}

.product-total {
  font-size: 32rpx;
  color: #ff9800;
  font-weight: bold;
}

/* 费用明细 */
.cost-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.cost-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cost-row.total-row {
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.cost-label {
  font-size: 28rpx;
  color: #666;
}

.cost-value {
  font-size: 28rpx;
  color: #333;
}

.cost-value.discount {
  color: #4caf50;
}

.cost-value.total {
  font-size: 32rpx;
  color: #ff9800;
  font-weight: bold;
}

/* 物流信息 */
.logistics-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.logistics-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
}

.logistics-label {
  font-size: 28rpx;
  color: #666;
  min-width: 160rpx;
}

.logistics-value {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  color: #333;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 备注信息 */
.remark-content {
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.remark-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}

.action-buttons .action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  margin: 0;
}

.action-btn.confirm {
  background: #4caf50;
  color: white;
}

.action-btn.ship {
  background: #2196f3;
  color: white;
}

.action-btn.complete {
  background: #ff9800;
  color: white;
}

.action-btn.contact {
  background: #2196f3;
  color: white;
}

.action-btn.cancel {
  background: #f44336;
  color: white;
}

.action-btn.approve {
  background: #4caf50;
  color: white;
}

.action-btn.reject {
  background: #f44336;
  color: white;
}

/* 退款信息 */
.refund-info {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.refund-content {
  margin-top: 20rpx;
}

.refund-status-text {
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.refund-status-text.status-pending {
  background: #fff7e6;
  color: #fa8c16;
}

.refund-status-text.status-approved {
  background: #f6ffed;
  color: #52c41a;
}

.refund-status-text.status-rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.refund-status-text.status-completed {
  background: #e6f7ff;
  color: #1890ff;
}

.reject-reason {
  color: #ff4d4f;
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.6;
  box-sizing: border-box;
}

.char-count {
  font-size: 24rpx;
  color: #999;
  text-align: right;
  margin-top: 12rpx;
  display: block;
}

/* 发货弹窗 */
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
  width: 600rpx;
  background: white;
  border-radius: 20rpx;
  overflow: hidden;
}

.modal-header {
  padding: 40rpx;
  border-bottom: 1rpx solid #f0f0f0;
  text-align: center;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.modal-body {
  padding: 40rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.form-value {
  display: block;
  font-size: 28rpx;
  color: #333;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
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
  height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #2196f3;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}

.modal-btn.cancel {
  color: #666;
  border-right: 1rpx solid #f0f0f0;
}

.modal-btn.confirm {
  color: #2196f3;
  font-weight: bold;
}

/* 快递公司选择弹窗：常用置顶 + 搜索 */
.delivery-picker-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.delivery-picker-box {
  width: 100%;
  max-height: 75vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}
.delivery-picker-header {
  padding: 24rpx;
  border-bottom: 1rpx solid #eee;
}
.delivery-picker-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}
.delivery-picker-search {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.delivery-picker-search .placeholder { color: #999; }
.delivery-picker-list {
  flex: 1;
  max-height: 50vh;
  padding: 16rpx 0;
}
.delivery-picker-item {
  padding: 24rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #f5f5f5;
}
.delivery-picker-item .delivery-name { font-size: 28rpx; color: #333; }
.delivery-picker-item .delivery-code { font-size: 24rpx; color: #999; }
.delivery-picker-empty {
  padding: 48rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}
.delivery-picker-footer {
  padding: 24rpx;
  border-top: 1rpx solid #eee;
}
.delivery-picker-cancel {
  display: block;
  text-align: center;
  font-size: 30rpx;
  color: #666;
}
</style>