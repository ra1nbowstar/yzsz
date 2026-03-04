<template>
  <view class="confirm-page">
    <!-- 收货地址 -->
    <view class="address-section" @tap="manageAddress">
      <view v-if="selectedAddress" class="address-info">
        <view class="address-header">
          <text class="receiver-name">{{ selectedAddress.name }}</text>
          <text class="receiver-phone">{{ selectedAddress.phone }}</text>
          <view v-if="selectedAddress.isDefault" class="default-tag">默认</view>
        </view>
        <text class="address-detail">{{ selectedAddress.fullAddress }}</text>
      </view>
      <view v-else class="no-address">
        <text class="no-address-text">请选择收货地址</text>
      </view>
      <text class="address-arrow">></text>
    </view>

    <!-- 商品列表 -->
    <view class="products-section">
      <view class="section-header">
        <text class="section-title">商品清单</text>
      </view>
      <view class="products-list">
        <view 
          v-for="item in orderItems" 
          :key="item.id"
          class="product-item"
        >
          <image :src="item.image" class="product-image" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ item.name }}</text>
            <text v-if="item.spec || formatSpecifications(item.specifications)" class="product-spec">
              {{ item.spec || formatSpecifications(item.specifications) }}
            </text>
            <view class="product-price-row">
              <text class="product-price">¥{{ item.price }}</text>
              <text class="product-quantity">x{{ item.quantity }}</text>
            </view>
          </view>
          <text class="product-total">¥{{ formatAmount(item.price * item.quantity) }}</text>
        </view>
      </view>
    </view>

    <!-- 配送方式 -->
    <view class="delivery-section">
      <view class="section-header">
        <text class="section-title">配送方式</text>
      </view>
      <view class="delivery-options">
        <view 
          v-for="option in deliveryOptions" 
          :key="option.id"
          class="delivery-option"
          :class="{ active: selectedDelivery === option.id }"
          @tap="selectDelivery(option.id)"
        >
          <view class="option-info">
            <text class="option-name">{{ option.name }}</text>
            <text class="option-desc">{{ option.desc }}</text>
          </view>
          <text class="option-price">{{ option.price > 0 ? `¥${option.price}` : '免费' }}</text>
        </view>
      </view>
    </view>

    <!-- 支付方式 - 0元订单时隐藏 -->
    <view class="payment-section" v-if="!isFreeOrder">
      <view class="section-header">
        <text class="section-title">支付方式</text>
      </view>
      <view class="payment-options">
        <view 
          v-for="option in paymentOptions" 
          :key="option.id"
          class="payment-option"
          :class="{ active: selectedPayment === option.id }"
          @tap="selectPayment(option.id)"
        >
          <text class="payment-icon iconfont" :class="option.iconClass"></text>
          <text class="payment-name">{{ option.name }}</text>
          <text class="payment-radio">{{ selectedPayment === option.id ? '●' : '○' }}</text>
        </view>
      </view>
    </view>

    <!-- 订单备注 -->
    <view class="remark-section">
      <view class="section-header">
        <text class="section-title">订单备注</text>
      </view>
      <textarea 
        v-model="orderRemark"
        class="remark-input"
        placeholder="选填，请输入您的需求"
        maxlength="200"
      />
    </view>

    <!-- 优惠券选择 - 直接显示可用优惠券 -->
    <view class="coupon-section">
      <view class="section-header">
        <text class="section-title"><text class="iconfont icon-youhuijuan"></text> 优惠券</text>
        <text class="section-subtitle">选择可用优惠券</text>
      </view>
      
      <!-- 已选优惠券显示 -->
      <view v-if="selectedCoupon" class="selected-coupon">
        <view class="selected-coupon-content">
          <text class="selected-coupon-name">已选: {{ selectedCoupon.name }}</text>
          <text class="selected-coupon-value">-¥{{ formatAmount(discountAmount) }}</text>
        </view>
        <button class="cancel-coupon-btn" @tap="cancelCoupon">取消</button>
      </view>
      
      <!-- 可用优惠券列表 -->
      <scroll-view class="coupon-list" scroll-y v-if="availableCoupons.length > 0">
        <view 
          v-for="coupon in availableCoupons" 
          :key="coupon.id"
          class="coupon-item"
          :class="{ 
            selected: selectedCoupon && selectedCoupon.id === coupon.id,
            disabled: !isValidForOrder(coupon)
          }"
          @tap="isValidForOrder(coupon) ? selectCoupon(coupon) : null"
        >
          <view class="coupon-left">
            <text class="coupon-value">¥{{ formatAmount(coupon.value) }}</text>
            <text v-if="coupon.minSpend > 0" class="coupon-condition">满{{ coupon.minSpend }}可用</text>
          </view>
          <view class="coupon-right">
            <text class="coupon-name">{{ coupon.name }}</text>
            <text class="coupon-scope">
              {{ coupon.useScope === 'vip_only' ? '仅限会员商品' : 
                 coupon.useScope === 'normal_only' ? '仅限普通商品' : '全场通用' }}
            </text>
            <text class="coupon-time">
              有效期至：{{ new Date(coupon.expireTime).toLocaleDateString() }}
            </text>
          </view>
        </view>
      </scroll-view>
      
      <view v-else class="no-coupons">
        <text class="no-coupons-text">暂无可用优惠券</text>
      </view>
    </view>

    <!-- 费用明细 -->
    <view class="cost-section">
      <view class="cost-row">
        <text class="cost-label">商品总价</text>
        <text class="cost-value">¥{{ formatAmount(productTotal) }}</text>
      </view>
      <!-- 包邮,不显示配送费 -->
      <!-- <view class="cost-row">
        <text class="cost-label">配送费</text>
        <text class="cost-value">¥{{ deliveryFee }}</text>
      </view> -->
      <view v-if="discountAmount > 0" class="cost-row">
        <text class="cost-label">优惠金额</text>
        <text class="cost-value discount">-¥{{ formatAmount(discountAmount) }}</text>
      </view>
      <view class="cost-row charity-row">
        <text class="cost-label">
          <text class="charity-icon iconfont icon-xihuan"></text>
          公益贡献
        </text>
        <text class="cost-value charity">¥{{ formatAmount(charityAmount) }}</text>
      </view>
      <view class="charity-tip">
        <text class="tip-text">您的订单将有 ¥{{ formatAmount(charityAmount) }} 用于公益事业</text>
      </view>
      <view class="cost-row total-row">
        <text class="cost-label">实付金额</text>
        <text class="cost-value total">¥{{ formatAmount(totalAmount) }}</text>
      </view>
    </view>



    <!-- 底部提交按钮 -->
    <view class="bottom-bar">
      <view class="total-info">
        <text class="total-label">实付：</text>
        <text class="total-price">¥{{ formatAmount(totalAmount) }}</text>
        <text v-if="discountAmount > 0 && !isFreeOrder" class="discount-text">
          (已优惠¥{{ formatAmount(discountAmount) }})
        </text>
        <text v-if="isFreeOrder" class="free-tag">免费订单</text>
      </view>
      <button 
        class="submit-btn" 
        :class="{ 'btn-free': isFreeOrder }"
        :disabled="!canSubmit"
        @tap="submitOrder"
      >
        {{ isFreeOrder ? '免费领取' : '提交订单' }}
      </button>
    </view>
    <!-- 地址选择弹窗 -->
    <view v-if="showAddressModal" class="address-modal" @tap="hideAddressModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">选择收货地址</text>
          <text class="modal-close" @tap="hideAddressModal">×</text>
        </view>
        
        <scroll-view class="address-list" scroll-y>
          <view 
            v-for="address in addresses" 
            :key="address.id"
            class="address-item"
            :class="{ selected: selectedAddress && selectedAddress.id === address.id }"
            @tap="selectAddress(address)"
          >
            <view class="address-content">
              <view class="address-header">
                <text class="receiver-name">{{ address.name }}</text>
                <text class="receiver-phone">{{ address.phone }}</text>
                <view v-if="address.isDefault" class="default-tag">默认</view>
              </view>
              <text class="address-detail">{{ address.fullAddress }}</text>
            </view>
            <view class="address-radio">
              <text class="radio-icon">{{ selectedAddress && selectedAddress.id === address.id ? '●' : '○' }}</text>
            </view>
          </view>
          
          <!-- 添加新地址 -->
          <view class="add-address-item" @tap="addNewAddress">
            <text class="add-icon">+</text>
            <text class="add-text">添加新地址</text>
          </view>
        </scroll-view>
        
        <view class="modal-footer">
          <button class="confirm-btn" @tap="confirmAddressSelection">确认选择</button>
        </view>
      </view>
    </view>


  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { calculateCharityAmount } from '../../config/charity.js'
import { mapCouponWithTemplate, getCouponStatusText } from '../../utils/coupon.js'
import { ensureMerchantOrder } from '../../utils/merchant.js'
import { addLocalMessage } from '@/api/message.js'

const formatAmount = (val) => {
  return Number(val || 0).toFixed(4)
}

/**
 * 格式化规格信息，将规格对象转换为可读的文本
 * @param {Object} specifications 规格对象，如 { "颜色": "黑色", "尺寸": "大" }
 * @returns {String} 格式化后的规格文本，如 "颜色：黑色；尺寸：大"
 */
const formatSpecifications = (specifications) => {
  if (!specifications || typeof specifications !== 'object') {
    return ''
  }
  
  const specArray = Object.keys(specifications).map(key => {
    const value = specifications[key]
    if (value !== null && value !== undefined && value !== '') {
      return `${key}：${value}`
    }
    return null
  }).filter(Boolean)
  
  return specArray.join('；')
}

const orderData = ref(null)
const selectedAddress = ref(null)
const selectedDelivery = ref(1)
const selectedPayment = ref(1)
const orderRemark = ref('')
const selectedCoupon = ref(null)
const showCouponModal = ref(false)
const availableCoupons = ref([])

// 订单商品
const orderItems = ref([
  {
    id: 1,
    name: '高级会员礼包',
    price: 1980,
    quantity: 1,
    isVip: true,
    image: '/static/images/vip-package.png'
  }
])

// 收货地址列表
const addresses = ref([])
const showAddressModal = ref(false)
const tempSelectedAddress = ref(null)

// 配送方式 - 全部包邮
const deliveryOptions = ref([
  {
    id: 1,
    name: '标准配送',
    desc: '预计3-5天送达',
    price: 0  // 包邮
  },
  {
    id: 2,
    name: '快速配送',
    desc: '预计1-2天送达',
    price: 0  // 包邮
  }
])

// 支付方式
const paymentOptions = ref([
  {
    id: 1,
    name: '微信支付',
    icon: '',
    iconClass: 'icon-daifukuan'
  },
  {
    id: 2,
    name: '支付宝',
    icon: '',
    iconClass: 'icon-hongbao'
  }
])

// 计算属性
const productTotal = computed(() => {
  return orderItems.value.reduce((total, item) => {
    return total + (item.price * item.quantity)
  }, 0)
})

const deliveryFee = computed(() => {
  const option = deliveryOptions.value.find(opt => opt.id === selectedDelivery.value)
  return option ? option.price : 0
})

// 加载可用优惠券（从API获取）
const loadAvailableCoupons = async () => {
  try {
    // TODO: 调用API获取用户优惠券
    // const res = await getUserCoupons()
    // const rawCoupons = (res.data?.list || []).map(c => mapCouponWithTemplate(c))
    const rawCoupons = []

  const now = Date.now()
  availableCoupons.value = rawCoupons
    .filter((c) => {
      const statusText = getCouponStatusText(c)
      const tpl = c.template || {}
        // 只使用状态为"已领取"且未失效的券
      if (statusText !== '已领取') return false
      if (c.validTo && now > c.validTo) return false
      if (tpl.status && tpl.status !== 'active') return false
      return true
    })
    .map((c) => {
      const tpl = c.template || {}
      const scope = tpl.useScope || 'all'
      const amount = tpl.amount || 0
      const minSpend = tpl.minSpend || 0
        // 这里统一映射成前端使用的"固定金额优惠券"
      return {
        id: c.id,
        name: tpl.name || '优惠券',
        value: amount,
        minSpend,
        useScope: scope,
        type: 'fixed',
        status: c.status,
        validTo: c.validTo,
        template: tpl
      }
    })


  } catch (error) {
    console.error('加载优惠券失败', error)
    availableCoupons.value = []
  }
}

// 检查优惠券是否适用于当前订单
const isValidForOrder = (coupon) => {
  // 先计算基础金额
  let baseAmount = 0
  if (coupon.useScope === 'vip_only') {
    // 仅会员商品可用，计算会员商品金额
    baseAmount = orderItems.value
      .filter(item => item.isVip || item.productType === 'vip')
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
  } else if (coupon.useScope === 'normal_only') {
    // 仅非会员商品可用，计算普通商品金额
    baseAmount = orderItems.value
      .filter(item => !(item.isVip || item.productType === 'vip'))
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
  } else {
    // all - 全场通用，使用商品总价
    baseAmount = parseFloat(productTotal.value)
  }
  
  // 检查是否满足最低消费条件
  if (coupon.minSpend > 0 && baseAmount < coupon.minSpend) {
    return false
  }
  
  // 必须有商品才能使用
  return baseAmount > 0
}

// 计算优惠金额
const discountAmount = computed(() => {
  if (!selectedCoupon.value) return 0
  
  const coupon = selectedCoupon.value
  const deliveryFeeAmount = parseFloat(deliveryFee.value)

  // 根据优惠券使用范围，确定参与优惠的商品金额
  let baseAmount = 0
  if (coupon.type === 'shipping') {
    // 运费券直接作用于运费，不依赖商品金额
    baseAmount = 0
  } else if (coupon.useScope === 'vip_only') {
    baseAmount = orderItems.value
      .filter(item => item.isVip)
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
  } else if (coupon.useScope === 'normal_only') {
    baseAmount = orderItems.value
      .filter(item => !item.isVip)
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
  } else {
    // all - 全场通用
    baseAmount = parseFloat(productTotal.value)
  }

  // 检查是否满足最低消费条件
  if (coupon.minSpend > 0 && baseAmount < coupon.minSpend) {
    return 0
  }
  
  // 根据优惠券类型计算优惠金额
  switch (coupon.type) {
    case 'percentage': { // 折扣券
      const discount = baseAmount * (1 - coupon.value)
      // 如果设置了最大折扣金额，取较小值
      return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount
    }
    case 'shipping': // 运费券：优惠金额等于运费
      return deliveryFeeAmount
    case 'fixed': // 固定金额优惠券
    default:
      return Math.min(coupon.value, baseAmount)
  }
})

const totalAmount = computed(() => {
  const product = parseFloat(productTotal.value)
  const delivery = parseFloat(deliveryFee.value)
  const discount = parseFloat(discountAmount.value)
  // 确保金额不为负数
  return Math.max(0, (product + delivery - discount))
})

const isFreeOrder = computed(() => {
  return totalAmount.value <= 0
})


const charityAmount = computed(() => {
  return calculateCharityAmount(totalAmount.value)
})

const canSubmit = computed(() => {
  // 0元订单不需要选择支付方式
  if (isFreeOrder.value) {
    return selectedAddress.value && selectedDelivery.value
  }
  // 正常订单需要选择支付方式
  return selectedAddress.value && selectedDelivery.value && selectedPayment.value
})

/**
 * 管理收货地址
 */
const manageAddress = () => {
  // 跳转到地址列表页面（选择模式）
  uni.navigateTo({ 
    url: '/subPackages/page2/pages/address/list?select=true'
  })
}

/**
 * 隐藏地址选择弹窗
 */
const hideAddressModal = () => {
  showAddressModal.value = false
  tempSelectedAddress.value = null
}

/**
 * 选择地址（弹窗中）
 */
const selectAddress = (address) => {
  tempSelectedAddress.value = address
}

/**
 * 确认地址选择
 */
const confirmAddressSelection = () => {
  if (tempSelectedAddress.value) {
    selectedAddress.value = tempSelectedAddress.value
  }
  hideAddressModal()
}

/**
 * 添加新地址
 */
const addNewAddress = () => {
  hideAddressModal()
  uni.navigateTo({ url: '/subPackages/page2/pages/address/edit?mode=add' })
}

/**
 * 选择优惠券
 */
const selectCoupon = (coupon) => {
  // 如果已经选择了这个优惠券，则取消选择
  if (selectedCoupon.value && selectedCoupon.value.id === coupon.id) {
    selectedCoupon.value = null
    return
  }
  
  // 根据优惠券类型设置不同的属性
  selectedCoupon.value = {
    id: coupon.id,
    name: coupon.name,
    value: coupon.value,
    minSpend: coupon.minSpend,
    useScope: coupon.useScope,
    type: coupon.type,
    maxDiscount: coupon.maxDiscount // 折扣券的最大折扣金额限制
  }
}

/**
 * 取消优惠券
 */
const cancelCoupon = () => {
  selectedCoupon.value = null
}

/**
 * 加载地址列表
 */
const loadAddresses = async () => {
  try {
    const { getAddressList } = await import('@/api/user.js')
    const response = await getAddressList()
    
    // 根据后端响应格式解析数据
    let addressData = []
    if (Array.isArray(response)) {
      addressData = response
    } else if (response.rows && Array.isArray(response.rows)) {
      addressData = response.rows
    } else if (response.data && Array.isArray(response.data)) {
      addressData = response.data
    } else if (response.items && Array.isArray(response.items)) {
      addressData = response.items
    } else if (response.addresses && Array.isArray(response.addresses)) {
      addressData = response.addresses
    }
    
    // 格式化数据
    addresses.value = addressData.map(addr => ({
      ...addr,
      phone: addr.phone || addr.mobile,
      isDefault: addr.is_default || addr.isDefault || false,
      fullAddress: addr.fullAddress || `${addr.province}${addr.city}${addr.district}${addr.detail}`
    }))
    
    // 使用隔离存储工具
    const { setStorage, removeStorage } = await import('@/utils/storage.js')
    
    // 如果API返回空数组，清除本地缓存（避免显示其他用户的地址）
    if (addresses.value.length === 0) {
      console.log('[订单确认] API返回空地址列表，清除本地缓存')
      removeStorage('addressList')
      selectedAddress.value = null
    } else {
      // 保存到本地缓存（使用隔离存储）
      setStorage('addressList', addresses.value)
      
      // 如果当前没有选中地址，选择默认地址
      if (!selectedAddress.value) {
        const defaultAddress = addresses.value.find(addr => addr.isDefault || addr.is_default)
        selectedAddress.value = defaultAddress || addresses.value[0]
      } else {
        // 如果已有选中地址，检查是否还在列表中
        const found = addresses.value.find(addr => 
          addr.id === selectedAddress.value.id || 
          addr.addr_id === selectedAddress.value.id ||
          addr.addr_id === selectedAddress.value.addr_id ||
          (addr.mobile === selectedAddress.value.mobile && addr.phone === selectedAddress.value.phone)
        )
        if (!found) {
          // 选中的地址已被删除，重新选择默认地址或第一个
          const defaultAddress = addresses.value.find(addr => addr.isDefault || addr.is_default)
          selectedAddress.value = defaultAddress || addresses.value[0]
          uni.showToast({ 
            title: '原地址已删除，已自动选择新地址', 
            icon: 'none',
            duration: 2000
          })
        } else {
          // 如果找到匹配的地址，更新为列表中的地址（确保数据最新）
          selectedAddress.value = found
          console.log('[订单确认] 选中地址仍在列表中，更新地址信息')
        }
      }
    }
  } catch (error) {
    console.error('加载地址列表失败:', error)
    // 如果API失败，清除本地缓存，避免显示错误的地址
    console.warn('[订单确认] API请求失败，清除本地地址缓存')
    const { removeStorage } = await import('@/utils/storage.js')
    removeStorage('addressList')
    addresses.value = []
    selectedAddress.value = null
  }
}

// 暴露方法给其他页面调用
defineExpose({
  loadAddresses,
  selectedAddress
})

/**
 * 选择配送方式
 */
const selectDelivery = (deliveryId) => {
  selectedDelivery.value = deliveryId
}

/**
 * 选择支付方式
 */
const selectPayment = (paymentId) => {
  selectedPayment.value = paymentId
}

/**
 * 提交订单
 */
/**
 * 提交订单
 */
const submitOrder = async () => {
  console.log('=== confirm.vue submitOrder ===')
  console.log('isFreeOrder:', isFreeOrder.value)
  console.log('totalAmount:', totalAmount.value)
  
  if (!canSubmit.value) {
    uni.showToast({ title: '请完善订单信息', icon: 'none' })
    return
  }
  
  // 0元订单特殊处理
  if (isFreeOrder.value) {
    console.log('✅ 进入0元订单流程')
    await submitFreeOrder()
    return
  }
  
  console.log('❌ 进入正常支付流程')
  await submitPayOrder()
}
/**
 * 提交0元免费订单
 */
const submitFreeOrder = async () => {
  uni.showLoading({ title: '领取中...' })
  
  try {
    const userInfo = uni.getStorageSync('userInfo') || {}
    const userId = userInfo.id || userInfo.user_id
    
    if (!userId) {
      throw new Error('用户未登录')
    }
    
    const products = orderItems.value.map(item => ({
      product_id: item.productId || item.id,
      quantity: item.quantity,
      specs: item.spec || '',
      price: item.price
    }))
    
    const orderData = {
      user_id: userId,
      address_id: selectedAddress.value.id,
      address: selectedAddress.value,
      products: products,
      remark: orderRemark.value,
      delivery_type: selectedDelivery.value,
      pay_way: 'free',
      coupon_id: selectedCoupon.value ? selectedCoupon.value.id : null,
      is_free_order: true,
      actual_amount: 0
    }
    
    const { createOrder } = await import('@/api/order.js')
    const res = await createOrder(orderData)
    
    uni.hideLoading()
    
    const createdOrder = res.data || res
    const orderId = createdOrder.id
    const orderNo = createdOrder.order_no || createdOrder.orderNo
    
    uni.showToast({ 
      title: '领取成功', 
      icon: 'success',
      duration: 1500
    })
    
    setTimeout(() => {
      uni.redirectTo({ 
        url: `/subPackages/page1/pages/order/detail?id=${orderId}&orderNo=${orderNo}` 
      })
    }, 1500)
    
  } catch (error) {
    uni.hideLoading()
    console.error('领取失败', error)
    uni.showToast({ 
      title: error.message || '领取失败，请重试', 
      icon: 'none',
      duration: 2000
    })
  }
}

/**
 * 提交正常支付订单
 */
const submitPayOrder = async () => {
  uni.showLoading({ title: '提交中...' })
  
  try {
    const userInfo = uni.getStorageSync('userInfo') || {}
    const userId = userInfo.id || userInfo.user_id
    
    if (!userId) {
      throw new Error('用户未登录')
    }
    
    const products = orderItems.value.map(item => ({
      product_id: item.productId || item.id,
      quantity: item.quantity,
      specs: item.spec || '',
      price: item.price
    }))
    
    const orderData = {
      user_id: userId,
      address_id: selectedAddress.value.id,
      address: selectedAddress.value,
      products: products,
      remark: orderRemark.value,
      delivery_type: selectedDelivery.value,
      pay_way: selectedPayment.value === 1 ? 'wechat' : 'alipay',
      coupon_id: selectedCoupon.value ? selectedCoupon.value.id : null
    }
    
    const { createOrder } = await import('@/api/order.js')
    const res = await createOrder(orderData)
    
    uni.hideLoading()
    
    const createdOrder = res.data || res
    const orderNo = createdOrder.order_no || createdOrder.orderNo
    const orderId = createdOrder.id
    const finalAmount = createdOrder.actual_amount || createdOrder.totalAmount || totalAmount.value
    
    if (!orderNo) {
      throw new Error('订单创建失败：未返回订单号')
    }
    
    const completeOrderData = {
      items: orderItems.value,
      productTotal: productTotal.value,
      discountAmount: discountAmount.value,
      coupon: selectedCoupon.value,
      totalAmount: finalAmount
    }
    
    const paymentData = {
      orderNo: orderNo,
      orderId: orderId,
      amount: finalAmount,
      discountAmount: discountAmount.value,
      coupon: selectedCoupon.value,
      paymentMethod: selectedPayment.value,
      orderData: completeOrderData
    }
    
    uni.redirectTo({ 
      url: `/page1/payment/payment?data=${encodeURIComponent(JSON.stringify(paymentData))}` 
    })
    
  } catch (error) {
    uni.hideLoading()
    console.error('提交订单失败', error)
    uni.showToast({ 
      title: error.message || '订单提交失败', 
      icon: 'none',
      duration: 2000
    })
  }
}

onLoad((options) => {
  if (options.data) {
    try {
      orderData.value = JSON.parse(decodeURIComponent(options.data))
      
      // 处理订单数据
      if (orderData.value.items) {
        orderItems.value = orderData.value.items
      } else if (orderData.value.productId) {
        // 单个商品购买
        orderItems.value = [{
          id: orderData.value.productId,
          name: '商品名称',
          price: orderData.value.price,
          quantity: orderData.value.quantity,
          spec: Object.values(orderData.value.specs || {}).join('/'),
          image: '/static/product1.jpg'
        }]
      }
    } catch (error) {
      console.error('解析订单数据失败', error)
    }
  }
})

onMounted(() => {
  loadAddresses()
  loadAvailableCoupons()

})

// 页面显示时刷新地址列表和优惠券
onShow(() => {
  loadAddresses()
  loadAvailableCoupons() // 刷新优惠券列表

})
</script>

<style scoped>
.confirm-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding: 40rpx;
  padding-bottom: 120rpx;
}

/* 收货地址 */
.address-section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.address-info {
  flex: 1;
}

.address-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 12rpx;
}

.receiver-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.receiver-phone {
  font-size: 28rpx;
  color: #666;
}

.address-detail {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

.no-address {
  flex: 1;
}

.no-address-text {
  font-size: 28rpx;
  color: #999;
}

.address-arrow {
  font-size: 24rpx;
  color: #ccc;
}

.default-tag {
  background: #ff4757;
  color: white;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

/* 通用区块样式（先定义通用样式） */
.products-section,
.delivery-section,
.payment-section,
.remark-section,
.coupon-section,
.cost-section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

/* 优惠券选择区域 - 简化布局确保可见 */
.coupon-section {
	background: #fff8e1 !important;
	border: 2rpx solid #ffd700 !important;
	box-shadow: 0 2rpx 8rpx rgba(255, 215, 0, 0.2) !important;
	padding: 30rpx !important;
	margin-top: 20rpx !important;   /* 整块整体往下挪一点 */
	margin-bottom: 20rpx !important;
	z-index: 100 !important;
	position: relative;
	min-height: 120rpx;
	display: block !important;
}



.coupon-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;
}

.coupon-text {
  font-size: 30rpx;
  color: #ff6b6b;
  font-weight: 600;
}

.coupon-arrow {
  font-size: 28rpx;
  color: #ff6b6b;
  font-weight: bold;
}

/* 通用区块头部样式 */
.section-header {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

/* 商品列表 */
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
  border-radius: 12rpx;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
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
  color: #ff4757;
  font-weight: 600;
}

.product-quantity {
  font-size: 24rpx;
  color: #666;
}

.product-total {
  font-size: 32rpx;
  color: #ff4757;
  font-weight: bold;
}

/* 配送方式 */
.delivery-options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.delivery-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
}

.delivery-option.active {
  border-color: #ff4757;
  background: #fff5f5;
}

.option-info {
  flex: 1;
}

.option-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.option-desc {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.option-price {
  font-size: 28rpx;
  color: #ff4757;
  font-weight: 600;
}

/* 支付方式 */
.payment-options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
}

.payment-option.active {
  border-color: #ff4757;
  background: #fff5f5;
}

.payment-icon {
  font-size: 36rpx;
}

.payment-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.payment-radio {
  font-size: 32rpx;
  color: #ff4757;
}

/* 订单备注 */
.remark-input {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  background: #f8f9fa;
}

/* 费用明细 */
.cost-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.cost-row:last-child {
  margin-bottom: 0;
}

.cost-row.total-row {
  padding-top: 16rpx;
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
  color: #ff4757;
  font-weight: bold;
}

.charity-row {
  background: #fff5f5;
  padding: 16rpx;
  border-radius: 8rpx;
  margin: 8rpx 0;
}

.charity-icon {
  margin-right: 8rpx;
  color: #ff4757 !important;
}

.charity-icon.iconfont {
  color: #ff4757 !important;
}

.cost-value.charity {
  color: #ff6b6b;
  font-weight: 600;
}

.charity-tip {
  padding: 12rpx 16rpx;
  background: linear-gradient(135deg, #fff5f5, #ffe5e5);
  border-radius: 8rpx;
  margin: 8rpx 0;
}

.tip-text {
  font-size: 24rpx;
  color: #ff6b6b;
  line-height: 1.5;
}

/* 底部提交栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 20rpx 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.total-info {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 28rpx;
  color: #333;
}

.total-price {
  font-size: 40rpx;
  font-weight: bold;
  color: #ff4757;
}

.discount-text {
  font-size: 24rpx;
  color: #ff4757;
  margin-left: 10rpx;
}

/* 优惠券直接显示样式 */
.section-subtitle {
  font-size: 26rpx;
  color: #999;
  margin-left: 16rpx;
}

.selected-coupon {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #fff5f5, #ffe5e5);
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  border: 2rpx solid #ff4757;
}

.selected-coupon-content {
  flex: 1;
}

.selected-coupon-name {
  font-size: 28rpx;
  color: #ff4757;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.selected-coupon-value {
  font-size: 24rpx;
  color: #4caf50;
  font-weight: 600;
}

.cancel-coupon-btn {
  background: #ff4757;
  color: white;
  border: none;
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.coupon-list {
  max-height: 400rpx;
  margin-bottom: 20rpx;
}

.coupon-item {
  display: flex;
  background: white;
  margin-bottom: 16rpx;
  border-radius: 12rpx;
  overflow: hidden;
  padding: 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  border: 2rpx solid #f0f0f0;
}

.coupon-item.selected {
  border: 2rpx solid #ff4757;
  background: #fff5f5;
}

.coupon-item.disabled {
  opacity: 0.5;
  background: #f8f9fa;
}

.coupon-left {
  width: 180rpx;
  background: linear-gradient(135deg, #ff4757 0%, #ff6348 100%);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24rpx 0;
}

.coupon-value {
  font-size: 36rpx;
  font-weight: bold;
}

.coupon-condition {
  font-size: 22rpx;
  margin-top: 8rpx;
  opacity: 0.9;
}

.coupon-right {
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.coupon-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 10rpx;
}

.coupon-scope {
  font-size: 24rpx;
  color: #ff4757;
  margin-bottom: 10rpx;
}

.coupon-time {
  font-size: 22rpx;
  color: #999;
}

.no-coupons {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
}

.no-coupons-text {
  font-size: 28rpx;
}

.no-coupon-option {
  margin-top: 20rpx;
  padding: 20rpx;
  background: white;
  border-radius: 16rpx;
  text-align: center;
}

.no-coupon-text {
  font-size: 28rpx;
  color: #666;
}

.submit-btn {
  width: 240rpx;
  height: 80rpx;
  background: #ff4757;
  color: white;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 40rpx;
  border: none;
}

.submit-btn:disabled {
  opacity: 0.5;
}

/* 地址选择弹窗 */
.address-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
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
}

.address-list {
  flex: 1;
  padding: 0 30rpx;
  max-height: 60vh;
}

.address-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f8f9fa;
}

.address-item.selected {
  background: #f0f8ff;
  margin: 0 -30rpx;
  padding: 30rpx;
  border-radius: 12rpx;
}

.address-content {
  flex: 1;
}

.address-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 12rpx;
}

.default-tag {
  background: #ff4757;
  color: white;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.address-detail {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

.address-radio {
  width: 48rpx;
  text-align: center;
}

.radio-icon {
  font-size: 32rpx;
  color: #3d6bff;
}

.add-address-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 30rpx 0;
  border-top: 1rpx solid #f0f0f0;
  margin-top: 20rpx;
}

.add-icon {
  width: 48rpx;
  height: 48rpx;
  background: #3d6bff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: bold;
}

.add-text {
  font-size: 28rpx;
  color: #3d6bff;
  font-weight: 600;
}

.modal-footer {
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.confirm-btn {
  width: 100%;
  height: 88rpx;
  background: #3d6bff;
  color: white;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 44rpx;
  border: none;
}
/* 免费订单标签 */
.free-tag {
  background: #4caf50;
  color: white;
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;
}

/* 免费领取按钮样式 */
.submit-btn.btn-free {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  box-shadow: 0 4rpx 12rpx rgba(76, 175, 80, 0.3);
}

.submit-btn.btn-free:active {
  background: #45a049;
}
</style>


<style>
@import "@/static/999/iconfont.css";
</style>