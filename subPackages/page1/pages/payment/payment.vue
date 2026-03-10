<template>
  <view class="payment-page">
    <!-- 支付信息 -->
    <view class="payment-info">
      <view class="amount-section">
        <text class="amount-label">支付金额</text>
        <text class="amount-value">¥{{ paymentData.amount }}</text>
        <!-- 优惠券折扣信息 -->
        <text v-if="paymentData.discountAmount > 0" class="discount-info">
          (已优惠¥{{ Number(paymentData.discountAmount).toFixed(2) }} {{ paymentData.coupon?.name ? paymentData.coupon.name : '' }})
        </text>
      </view>
      
      <view class="order-info">
        <text class="order-label">订单号：</text>
        <text class="order-value">{{ paymentData.orderNo }}</text>
      </view>
      
      <!-- 优惠券信息 -->
      <view v-if="paymentData.coupon" class="coupon-info">
        <text class="coupon-label">使用优惠券：</text>
        <text class="coupon-value">{{ paymentData.coupon.name }}</text>
      </view>
    </view>

    <!-- 支付方式 -->
    <view class="payment-methods">
      <view class="section-title">选择支付方式</view>
      <view class="methods-list">
        <view 
          v-for="method in paymentMethods" 
          :key="method.id"
          class="method-item"
          :class="{ active: selectedMethod === method.id }"
          @tap="selectMethod(method.id)"
        >
          <text class="method-icon iconfont" :class="method.iconClass"></text>
          <view class="method-info">
            <text class="method-name">{{ method.name }}</text>
            <text class="method-desc">{{ method.desc }}</text>
          </view>
          <text class="method-radio">{{ selectedMethod === method.id ? '●' : '○' }}</text>
        </view>
      </view>
    </view>

    <!-- 支付按钮 -->
    <view class="payment-actions">
      <button class="pay-btn" @tap="handlePayment">
        确认支付 ¥{{ paymentData.amount }}
      </button>
      <button class="cancel-btn" @tap="cancelPayment">
        取消支付
      </button>
    </view>

    <!-- 支付结果弹窗 -->
    <view v-if="showResult" class="payment-result" @tap="hideResult">
      <view class="result-content" @tap.stop>
        <view class="result-icon" :class="paymentSuccess ? 'success' : 'failed'">
          <text class="iconfont" :class="paymentSuccess ? 'icon-dianzan' : 'icon-buxihuan'"></text>
        </view>
        <text class="result-title">{{ paymentSuccess ? '支付成功' : '支付失败' }}</text>
        <text class="result-desc">
          {{ paymentSuccess ? '订单支付成功，请等待平台发货' : '支付失败，请重试或选择其他支付方式' }}
        </text>
        
        <!-- 公益贡献提示 -->
        <view v-if="paymentSuccess" class="charity-contribution">
          <view class="charity-icon iconfont icon-xihuan"></view>
          <view class="charity-info">
            <text class="charity-title">感谢您的公益贡献</text>
            <text class="charity-amount">本次订单将有 ¥{{ charityAmount }} 用于公益事业</text>
            <text class="charity-desc">让爱心传递，温暖更多人</text>
          </view>
        </view>
        
        <view class="result-actions">
          <button v-if="paymentSuccess" class="result-btn primary" @tap="goToOrders">
            查看订单
          </button>
          <button v-else class="result-btn primary" @tap="retryPayment">
            重新支付
          </button>
          <button class="result-btn secondary" @tap="goHome">
            返回首页
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { calculateCharityAmount } from '../../config/charity.js'
import { recordMerchantSale } from '../../utils/merchant.js'
import { updatePoints } from '@/api/points.js'
import { addLocalMessage } from '@/api/message.js'
// 注意：不再调用 /order/pay，订单状态更新由微信支付异步通知 /wechat-pay/notify 处理
// import { payOrder } from '@/api/order.js'
import { getOrderDetail } from '@/api/order.js'
import { createJsapiOrder, notifyWeChatPay, wechatUnifiedOrder } from '../../api/payment.js'
import { upgradeUser, getUserInfo as getUserInfoApi, refreshUserInfo } from '@/api/user.js'
import { getLevelText } from '@/utils/level.js'
import { useCoupon } from '@/api/coupon.js'

const paymentData = ref({
  orderNo: '',
  orderId: '',
  amount: '0.00',
  paymentMethod: 1,
  discountAmount: 0,
  coupon: null
})

// 计算公益贡献金额
const charityAmount = computed(() => {
  return calculateCharityAmount(paymentData.value.amount)
})

const selectedMethod = ref(1)
const showResult = ref(false)
const paymentSuccess = ref(false)

// 获取当前余额
const getCurrentBalance = () => {
  return Number(uni.getStorageSync('userBalance')) || 0
}

/**
 * 获取支付接口需要的优惠券ID和积分抵扣金额
 */
const getPaymentParams = () => {
  const orderData = paymentData.value.orderData || {}
  const coupon = orderData.coupon || paymentData.value.coupon
  const pointsDiscount = orderData.pointsDiscount || 0
  
  const couponId = coupon && coupon.id ? coupon.id : null
  const pointsToUse = pointsDiscount > 0 ? Math.round(pointsDiscount) : null
  
  console.log('[支付参数] 优惠券ID:', couponId, '积分抵扣:', pointsToUse)
  
  return {
    couponId,
    pointsToUse
  }
}

// 支付方式列表
const paymentMethods = computed(() => {
  return [
    {
      id: 1,
      name: '微信支付',
      desc: '推荐使用微信支付',
      icon: '',
      iconClass: 'icon-daifukuan'
    }
  ]
})

const POINTS_RECYCLE_LOG_KEY = 'pointsRecycleLogs'

const toAmount = (value) => {
  const num = Number(value || 0)
  if (Number.isNaN(num)) return 0
  return Number(num.toFixed(2))
}

/**
 * 选择支付方式
 */
const selectMethod = (methodId) => {
  selectedMethod.value = methodId
}


/**
 * 处理支付
 */
const handlePayment = async () => {
  // 微信支付
  if (selectedMethod.value === 1) {
    try {
      // 使用积分和优惠券后应付金额为 0 时，不调微信支付，直接调用后端完成订单
      const amount = toAmount(paymentData.value.amount)
      if (amount <= 0) {
        // 零元订单无需调支付接口，直接成功
        uni.showLoading({ title: '正在确认...' })
        // 模拟短暂延迟，让用户看到提示
        setTimeout(() => {
          uni.hideLoading()
          handlePaymentSuccess()
        }, 500)
        return
      }

      uni.showLoading({ title: '正在调起支付...' })

      // 1. 检查登录状态
      const token = uni.getStorageSync('token')
      if (!token) {
        uni.hideLoading()
        uni.showModal({
          title: '提示',
          content: '请先登录后再进行支付',
          success: (res) => {
            if (res.confirm) {
              uni.reLaunch({ url: '/pages/index/index' })
            }
          }
        })
        return
      }
      
      // 获取用户openid（从多个可能的位置获取），支持刷新后端信息作为回退
      const parseMaybeJson = (v) => {
        if (!v) return null
        if (typeof v === 'object') return v
        try { return JSON.parse(v) } catch (e) { return null }
      }

      const resolveOpenid = async () => {
        let wechatInfoRaw = uni.getStorageSync('wechatInfo')
        let wechatInfo = parseMaybeJson(wechatInfoRaw) || wechatInfoRaw
        let userInfo = uni.getStorageSync('userInfo') || {}

        // 检查常见字段
        const list = [
          wechatInfo && (wechatInfo.openid || wechatInfo.wechat_openid || wechatInfo.wx_openid || wechatInfo.mp_openid),
          uni.getStorageSync('openid'),
          userInfo && (userInfo.openid || userInfo.wechat_openid || userInfo.wx_openid || userInfo.mp_openid || (userInfo.wechat_info && userInfo.wechat_info.openid))
        ]
        for (const v of list) if (v) return v

        // 如果本地没有，尝试刷新用户信息（后端可能会返回 wechat_info/openid）
        try {
          console.log('[微信支付] OpenID 未在本地找到，尝试刷新用户信息')
          const refreshed = await refreshUserInfo()
          const refreshedWechat = parseMaybeJson(refreshed.wechat_info || refreshed.wechatInfo || uni.getStorageSync('wechatInfo')) || refreshed.wechat_info || refreshed.wechatInfo
          const refreshedUser = uni.getStorageSync('userInfo') || refreshed
          const afterList = [
            refreshedWechat && (refreshedWechat.openid || refreshedWechat.wechat_openid),
            refreshedUser && (refreshedUser.openid || refreshedUser.wechat_openid || refreshedUser.wx_openid || refreshedUser.mp_openid),
            uni.getStorageSync('openid')
          ]
          for (const v of afterList) if (v) return v
        } catch (err) {
          console.warn('[微信支付] 刷新用户信息失败:', err)
        }

        // 最后尝试调用后端获取用户信息的接口（兼容性回退）
        try {
          if (typeof getUserInfoApi === 'function') {
            const resp = await getUserInfoApi()
            const data = resp && (resp.data || resp)
            const cand = data && (data.openid || data.wechat_openid || (data.wechat_info && data.wechat_info.openid))
            if (cand) {
              try { uni.setStorageSync('openid', cand) } catch (e) {}
              return cand
            }
          }
        } catch (err) {
          console.warn('[微信支付] getUserInfoApi 调用失败:', err)
        }

        return null
      }

      let openid = await resolveOpenid()

      console.log('[微信支付] OpenID 获取检查:', {
        wechatInfo: uni.getStorageSync('wechatInfo') ? '存在' : '不存在',
        wechatInfoOpenid: (parseMaybeJson(uni.getStorageSync('wechatInfo')) || uni.getStorageSync('wechatInfo'))?.openid || '无',
        storageOpenid: uni.getStorageSync('openid') || '无',
        userInfoOpenid: (uni.getStorageSync('userInfo') || {}).openid || '无',
        userInfoWechatOpenid: (uni.getStorageSync('userInfo') || {}).wechat_openid || '无',
        finalOpenid: openid || '未找到'
      })

      if (!openid) {
        uni.hideLoading()
        console.error('[微信支付] OpenID 未找到，存储的数据:', {
          wechatInfo: uni.getStorageSync('wechatInfo'),
          userInfo: uni.getStorageSync('userInfo') || '不存在',
          storageOpenid: uni.getStorageSync('openid') || '无'
        })
        uni.showModal({
          title: '提示',
          content: '微信支付需要微信登录信息，请重新使用微信登录后再试',
          showCancel: false,
          success: (res) => {
            if (res.confirm) uni.reLaunch({ url: '/pages/index/index' })
          }
        })
        return
      }

      console.log('[微信支付] 成功获取 OpenID:', String(openid).substring(0, 10) + '...')
      const { couponId, pointsToUse } = getPaymentParams()
      console.log('[微信支付] 当前订单优惠信息（仅日志，不再传给 create-order）:', {
        couponId,
        pointsToUse
      })
      // 2. 调用后端API创建 JSAPI 订单，获取前端支付参数（按文档不再传 coupon_id 与 points_to_use）
      const res = await createJsapiOrder({
        orderNo: paymentData.value.orderNo,
        amount: parseFloat(paymentData.value.amount),
        description: '商品购买',
        openid: openid
      })
      
      uni.hideLoading()
      
      // 检查返回结果（兼容多种后端返回格式：data.timeStamp / data.pay_params / pay_params / prepay_id）
      const hasPayParams = Boolean(
        res && (
          (res.data && (res.data.pay_params || res.data.timeStamp)) ||
          res.pay_params ||
          (res.pay_params && res.pay_params.timeStamp) ||
          res.prepay_id ||
          (res.data && res.data.prepay_id)
        )
      )

      if (res && (res.code === 200 || res.success === true || hasPayParams || res.ok === true)) {
        // 如果后端直接返回已确认支付（例如用于服务端代付或测试），则跳过客户端支付
        if (res.ok === true && !(res.data && res.data.timeStamp)) {
          console.log('[微信支付] 后端已确认支付（测试模式），直接处理支付成功')
          handlePaymentSuccess()
          return
        }

        // 3. 调起微信支付（后端可能将支付参数放在 data.pay_params 或 pay_params）
        const payParams = (res && (res.data?.pay_params || res.pay_params)) || res.data || res

        // 确保支付参数格式正确
        if (!payParams.timeStamp || !payParams.nonceStr || !payParams.package || !payParams.paySign) {
          console.error('[微信支付] 支付参数不完整:', payParams)
          uni.showToast({ 
            title: '支付参数错误，请重试', 
            icon: 'none' 
          })
          return
        }

        uni.requestPayment({
          provider: 'wxpay',
          timeStamp: String(payParams.timeStamp),
          nonceStr: payParams.nonceStr,
          package: payParams.package || payParams.packageValue,
          signType: payParams.signType || 'MD5',
          paySign: payParams.paySign,
          success: async (payRes) => {
            // 微信支付成功
            // 注意：订单状态更新由微信支付异步通知 /wechat-pay/notify 处理，不再需要调用 /order/pay
            console.log('[微信支付] 支付成功，订单号:', paymentData.value.orderNo)
            
            // 关闭 loading
            uni.hideLoading()
            
            // 直接处理支付成功逻辑
            handlePaymentSuccess()
          },
          fail: (err) => {
            uni.hideLoading()
            console.error('支付失败', err)
            if (err.errMsg.includes('cancel')) {
              uni.showToast({ title: '已取消支付', icon: 'none' })
            } else {
              uni.showToast({ title: '支付失败：' + err.errMsg, icon: 'none' })
            }
          }
        })
      } else {
        const errorMsg = res.message || res.msg || res.result?.message || '下单失败'
        console.error('[微信支付] 统一下单失败:', res)
        uni.showToast({ 
          title: errorMsg, 
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      uni.hideLoading()
      console.error('支付异常', error)
      uni.showToast({ title: '支付异常：' + error.message, icon: 'none' })
    }
    return
  }
}

/**
 * 处理支付成功后的逻辑
 */
const handlePaymentSuccess = async () => {
  paymentSuccess.value = true
  showResult.value = true
  
  // 注意：订单状态更新由微信支付异步通知 /wechat-pay/notify 处理，不再需要调用 /order/pay
  
  // 获取订单数据（在函数开头声明一次，后续直接使用）
  const orderData = paymentData.value.orderData || {}
  
  // 如果使用了优惠券，在支付成功后调用接口标记优惠券为已使用
  const coupon = orderData.coupon || paymentData.value.coupon
  
  console.log('[支付成功] 检查优惠券信息:', {
    hasOrderData: !!paymentData.value.orderData,
    orderDataCoupon: orderData.coupon,
    paymentDataCoupon: paymentData.value.coupon,
    finalCoupon: coupon
  })
  
  if (coupon && coupon.id) {
    try {
      const userInfo = uni.getStorageSync('userInfo') || {}
      const userId = userInfo.id || userInfo.user_id
      
      if (userId) {
        // 检查订单商品类型，确定order_type
        const items = orderData.items || orderData.products || []
        const hasVipProduct = items.some(item => 
          item.isVip === true || 
          item.is_vip === true || 
          item.productType === 'vip' || 
          item.product_type === 'vip'
        )
        // 如果订单中有会员商品，order_type为'member'，否则为'normal'
        const orderType = hasVipProduct ? 'member' : 'normal'
        
        // 根据优惠券的 applicable_product_type 进行校验
        const applicableType = coupon.applicable_product_type || coupon.applicableProductType || 'all'
        if (applicableType === 'normal_only' && hasVipProduct) {
          throw new Error('该优惠券只能用于普通商品，当前订单包含会员商品')
        }
        if (applicableType === 'member_only' && !hasVipProduct) {
          throw new Error('该优惠券只能用于会员商品，当前订单不包含会员商品')
        }
        
        console.log('[支付成功] 开始使用优惠券:', {
          coupon_id: coupon.id,
          user_id: userId,
          coupon_name: coupon.name,
          applicable_product_type: applicableType,
          order_type: orderType,
          hasVipProduct: hasVipProduct
        })
        
        await useCoupon({
          coupon_id: coupon.id,
          user_id: userId,
          order_type: orderType
        })
        console.log('[支付成功] ✅ 优惠券使用成功')
      } else {
        console.warn('[支付成功] ⚠️ 无法获取用户ID，跳过优惠券使用')
      }
    } catch (couponError) {
      // 检查错误信息，如果是"优惠券不存在、已使用或不在有效期内"，说明后端在创建订单时已经使用了优惠券
      const errorMsg = couponError.message || couponError.errorMsg || couponError.detail || ''
      const isAlreadyUsed = errorMsg.includes('优惠券不存在') || 
                           errorMsg.includes('已使用') || 
                           errorMsg.includes('不在有效期内') ||
                           errorMsg.includes('不存在、已使用')
      
      if (isAlreadyUsed) {
        // 优惠券已在创建订单时使用，这是正常情况，不需要提示用户
        console.log('[支付成功] ℹ️ 优惠券已在创建订单时使用，无需重复使用')
      } else {
        // 其他错误才提示用户
        console.error('[支付成功] ❌ 优惠券使用失败:', couponError)
        uni.showToast({
          title: '优惠券使用失败: ' + errorMsg,
          icon: 'none',
          duration: 2000
        })
      }
    }
  } else {
    console.log('[支付成功] 未使用优惠券或优惠券信息不完整')
  }
  
  // 检查是否购买了会员商品（购买会员商品后星级会升一级）
  const items = orderData.items || orderData.products || []
  const hasVipProduct = items.some(item => 
    item.isVip === true || 
    item.is_vip === true || 
    item.productType === 'vip' || 
    item.product_type === 'vip'
  )
  
  if (hasVipProduct) {
    console.log('[支付成功] 检测到会员商品，刷新用户信息以更新星级')
    try {
      await refreshUserInfo()
      console.log('[支付成功] ✅ 用户信息已刷新（星级可能已升级）')
    } catch (error) {
      console.error('[支付成功] ❌ 刷新用户信息失败:', error)
      // 刷新失败不影响支付成功流程
    }
  }
  
  // 更新订单状态
  console.log('=== 开始更新订单状态 ===')
  console.log('订单ID:', paymentData.value.orderId)
  console.log('订单号:', paymentData.value.orderNo)
  
  if (paymentData.value.orderId) {
    // 如果有orderId，说明是已存在的订单，更新状态
    const storedOrders = uni.getStorageSync('orderList') || []
    console.log('本地存储的订单数量:', storedOrders.length)
    console.log('本地存储的订单:', storedOrders)
    
    // 使用 == 而不是 === 来比较，避免类型不匹配问题
    const orderIndex = storedOrders.findIndex(o => o.id == paymentData.value.orderId)
    console.log('找到的订单索引:', orderIndex)
    
    if (orderIndex > -1) {
      const currentOrder = storedOrders[orderIndex]
      currentOrder.status = 'pending_ship'  // 更新为待发货状态（支付完成）
      currentOrder.payTime = Date.now()  // 记录支付时间
      
      // 使用已声明的 orderData
      const actualAmount = parseFloat(paymentData.value.amount || currentOrder.actualAmount || 0) // 实付金额
      const productTotal = orderData.productTotal || currentOrder.productTotal || currentOrder.totalAmount || actualAmount // 商品原价
      const deductionAmount = productTotal - actualAmount // 抵扣金额（商品价格减实付价格）
      
      // 积分变动已由后端API管理，不再需要前端处理
      console.log('✅ 支付成功：积分已由后端自动处理', {
          productTotal,
        actualAmount,
        deductionAmount
        })
      
      uni.setStorageSync('orderList', storedOrders)
      console.log('✅ 支付成功：订单状态已更新为待发货', currentOrder)
      
      try {
        // 确保订单状态是paid，并包含productTotal（商品原价）
        // 优先使用orderData中的productTotal，如果没有则从订单中获取
        const productTotal = orderData.productTotal || currentOrder.productTotal || currentOrder.totalAmount || currentOrder.actualAmount
        
        const merchantOrder = { 
          ...currentOrder, 
          status: 'pending_ship',  // 支付完成，待发货
          productTotal: productTotal  // 使用商品原价
        }
        
        console.log('商家订单数据:', {
          productTotal,
          totalAmount: currentOrder.totalAmount,
          actualAmount: currentOrder.actualAmount,
          orderData: orderData
        })
        
        recordMerchantSale(merchantOrder)
      } catch (error) {
        console.error('同步平台侧数据失败', error)
      }
    } else {
      console.log('⚠️ 本地存储未找到订单，尝试使用传递的订单数据处理后续逻辑')
      
      // 如果使用了优惠券，在支付成功后调用接口标记优惠券为已使用
      const coupon = orderData.coupon || paymentData.value.coupon
      if (coupon && coupon.id) {
        try {
          const userInfo = uni.getStorageSync('userInfo') || {}
          const userId = userInfo.id || userInfo.user_id
          
          if (userId) {
            // 检查订单商品类型，确定order_type
            const items = orderData.items || orderData.products || []
            const hasVipProduct = items.some(item => 
              item.isVip === true || 
              item.is_vip === true || 
              item.productType === 'vip' || 
              item.product_type === 'vip'
            )
            // 如果订单中有会员商品，order_type为'member'，否则为'normal'
            const orderType = hasVipProduct ? 'member' : 'normal'
            
            // 根据优惠券的 applicable_product_type 进行校验
            const applicableType = coupon.applicable_product_type || coupon.applicableProductType || 'all'
            if (applicableType === 'normal_only' && hasVipProduct) {
              throw new Error('该优惠券只能用于普通商品，当前订单包含会员商品')
            }
            if (applicableType === 'member_only' && !hasVipProduct) {
              throw new Error('该优惠券只能用于会员商品，当前订单不包含会员商品')
            }
            
            console.log('[支付成功API模式] 开始使用优惠券:', {
              coupon_id: coupon.id,
              user_id: userId,
              applicable_product_type: applicableType,
              order_type: orderType,
              hasVipProduct: hasVipProduct
            })
            await useCoupon({
              coupon_id: coupon.id,
              user_id: userId,
              order_type: orderType
            })
            console.log('[支付成功API模式] ✅ 优惠券使用成功')
          }
        } catch (couponError) {
          // 检查错误信息，如果是"优惠券不存在、已使用或不在有效期内"，说明后端在创建订单时已经使用了优惠券
          const errorMsg = couponError.message || couponError.errorMsg || couponError.detail || ''
          const isAlreadyUsed = errorMsg.includes('优惠券不存在') || 
                               errorMsg.includes('已使用') || 
                               errorMsg.includes('不在有效期内') ||
                               errorMsg.includes('不存在、已使用')
          
          if (isAlreadyUsed) {
            // 优惠券已在创建订单时使用，这是正常情况，不需要提示用户
            console.log('[支付成功API模式] ℹ️ 优惠券已在创建订单时使用，无需重复使用')
          } else {
            // 其他错误才记录
            console.error('[支付成功API模式] ❌ 优惠券使用失败:', couponError)
          }
          // 优惠券使用失败不影响支付成功流程
        }
      }
      
      // 使用已声明的 orderData
      
      // 构造临时订单对象用于后续处理
      const currentOrder = {
        id: paymentData.value.orderId,
        orderNo: paymentData.value.orderNo,
        status: 'pending_ship',
        payTime: Date.now(),
        products: orderData.items || orderData.products || [],
        totalAmount: paymentData.value.amount,
        productTotal: orderData.productTotal || 0,
        actualAmount: paymentData.value.amount,
        pointsDiscount: orderData.pointsDiscount || 0,
        couponDiscount: orderData.couponDiscount || 0
      }
      
      // 获取订单数据
      const actualAmount = parseFloat(paymentData.value.amount || 0) // 实付金额
      const productTotal = orderData.productTotal || 0 // 商品原价
      const deductionAmount = productTotal - actualAmount // 抵扣金额（商品价格减实付价格）
      
      // 积分变动已由后端API管理，不再需要前端处理
      console.log('✅ 支付成功-API模式：积分已由后端自动处理')
    }
  } else {
    console.error('❌ 缺少订单ID')
  }
}

/**
 * 取消支付
 */
const cancelPayment = () => {
  uni.showModal({
    title: '取消支付',
    content: '确定要取消支付吗？',
    success: (res) => {
      if (res.confirm) {
        uni.navigateBack()
      }
    }
  })
}

/**
 * 隐藏结果弹窗
 */
const hideResult = () => {
  showResult.value = false
}

/**
 * 重新支付
 */
const retryPayment = () => {
  showResult.value = false
  handlePayment()
}

/**
 * 查看订单
 */
const goToOrders = async () => {
  // 获取已更新的订单
  const storedOrders = uni.getStorageSync('orderList') || []
  const updatedOrder = storedOrders.find(o => 
    o.orderNo === paymentData.value.orderNo || o.id === paymentData.value.orderId
  )
  
  if (updatedOrder) {
    // 发送订单通知消息
    addOrderNotification(updatedOrder)
  }
  
  console.log('=== 跳转到订单列表 ===')
  console.log('订单状态已更新，准备跳转')
  
  // 确保订单状态已更新到后端，等待一小段时间让后端处理完成
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // 关闭当前页面和订单确认页面，返回到订单列表
  // 使用 navigateBack 的 delta 参数返回多级
  const pages = getCurrentPages()
  console.log('当前页面栈:', pages.map(p => p.route))
  
  // 如果页面栈中有订单列表页面，直接返回并刷新
  const orderListIndex = pages.findIndex(p => p.route === 'page2/order/list')
  if (orderListIndex > -1) {
    const delta = pages.length - orderListIndex - 1
    console.log('返回到订单列表，delta:', delta)
    // 先返回，然后触发刷新
    uni.navigateBack({ 
      delta,
      success: () => {
        // 触发订单列表刷新
        uni.$emit('refreshOrderList')
        // 切换到待发货标签
        setTimeout(() => {
          const currentPage = getCurrentPages()[getCurrentPages().length - 1]
          if (currentPage && currentPage.route === 'page2/order/list') {
            // pending_ship 是支付完成后的待发货状态
            currentPage.$vm?.switchTab?.('pending_ship')
          }
        }, 300)
      }
    })
  } else {
    // 否则跳转到订单列表，强制刷新并切换到待发货标签
    // pending_ship 是支付完成后的待发货状态
    uni.redirectTo({ 
      url: '/subPackages/page2/pages/order/list?type=pending_ship&refresh=1&timestamp=' + Date.now()
    })
  }
}


/**
 * 添加升级通知消息
 */
const addLevelUpNotification = (oldLevel, newLevel) => {
  // 获取现有消息列表
  const messageList = uni.getStorageSync('messageList') || []
  
  // 创建新的升级通知
  const newMessage = {
    id: Date.now(),
    type: 'system',
    title: '星级升级通知',
    content: `恭喜您从${getLevelText(oldLevel)}升级为${getLevelText(newLevel)}！现在可以获得更多团队奖励权益。`,
    time: getCurrentTime(),
    read: false,
    level: newLevel,
    oldLevel: oldLevel
  }
  
  // 添加到消息列表开头
  messageList.unshift(newMessage)
  
  // 保存到本地存储
  uni.setStorageSync('messageList', messageList)
  
  // 更新未读消息数
  const unreadCount = messageList.filter(msg => !msg.read).length
  uni.setStorageSync('unreadMessageCount', unreadCount)
  
  console.log('升级通知已添加', newMessage)
}

/**
 * 添加订单通知消息（使用本地消息管理）
 */
const addOrderNotification = (order) => {
  // 使用本地消息管理函数添加消息
  addLocalMessage({
    type: 'order',
    title: '订单支付成功',
    content: `您的订单【${order.orderNo}】支付成功，商家正在备货`,
    orderId: order.id,
    orderNo: order.orderNo,
    amount: order.actualAmount || order.totalAmount
  })
  
  console.log('订单通知已添加', order.orderNo)
}

/**
 * 获取当前时间
 */
const getCurrentTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 获取完整时间
 */
const getFullTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 添加余额流水记录
 */
const addBalanceRecord = (record) => {
  const balanceRecords = uni.getStorageSync('balanceRecords') || []
  
  const newRecord = {
    id: Date.now(),
    title: record.title,
    amount: Number(record.amount).toFixed(2),
    type: record.type, // 'income' 收入, 'withdraw' 支出
    status: record.status || 'completed',
    created_at: getFullTime(),
    orderNo: record.orderNo || '',
    orderId: record.orderId || ''
  }
  
  balanceRecords.unshift(newRecord)
  uni.setStorageSync('balanceRecords', balanceRecords)
  
  console.log('余额流水已记录:', newRecord)
}

/**
 * 返回首页
 */
const goHome = () => {
  uni.switchTab({ url: '/pages/home/home' })
}

onLoad((options) => {
  if (options.data) {
    try {
      const parsedData = JSON.parse(decodeURIComponent(options.data))
      console.log('=== 支付页面接收原始数据 ===')
      console.log('原始数据:', parsedData)
      
      // 先赋值所有数据
      paymentData.value = { ...parsedData }
      selectedMethod.value = parsedData.paymentMethod || 1
      
      // 确保orderNo和orderId字段正确映射（兼容不同的字段名）
      // 优先使用已有的orderNo，如果没有则尝试其他字段名
      if (!paymentData.value.orderNo) {
        paymentData.value.orderNo = parsedData.order_number || parsedData.order_no || parsedData.orderNo || ''
      }
      
      // 优先使用已有的orderId，如果没有则尝试其他字段名
      if (!paymentData.value.orderId) {
        paymentData.value.orderId = parsedData.order_id || parsedData.orderId || parsedData.id || ''
      }
      
      console.log('=== 支付页面处理后的数据 ===')
      console.log('订单号:', paymentData.value.orderNo)
      console.log('订单ID:', paymentData.value.orderId)
      console.log('支付金额(传入):', paymentData.value.amount)
      console.log('订单数据:', paymentData.value.orderData)
      console.log('商品列表:', paymentData.value.orderData?.items)
      
      // 为避免同一订单多次支付金额不一致，必要时用后端订单详情里的实付金额「补充」本地 amount：
      // 仅在当前 amount 为空或 <=0 时才覆盖，避免正常 0.03 被错误改成 0
      if (paymentData.value.orderNo) {
        const originalAmountNum = Number(paymentData.value.amount || 0)
        getOrderDetail(paymentData.value.orderNo)
          .then((res) => {
            const od = res.data || res
            if (!od) return
            const backendAmount = Number(
              od.actual_amount ?? od.actualAmount ?? od.total_amount ?? od.totalAmount ?? 0
            )
            if (!Number.isNaN(backendAmount) && backendAmount > 0 && (!originalAmountNum || originalAmountNum <= 0)) {
              // 同步到 paymentData，用于展示与后续 create-order 的金额计算
              paymentData.value.orderData = paymentData.value.orderData || {}
              paymentData.value.orderData.actualAmount = backendAmount
              paymentData.value.orderData.totalAmount = backendAmount
              paymentData.value.amount = backendAmount.toFixed(2)
              console.log('[支付页面] 已用订单详情金额补充本地金额:', backendAmount)
            }
          })
          .catch((e) => {
            console.warn('[支付页面] 同步订单详情金额失败（不影响首次支付）:', e)
          })
      }
      
      // 如果订单号或订单ID为空，记录警告
      if (!paymentData.value.orderNo && !paymentData.value.orderId) {
        console.error('❌ 错误：订单号和订单ID都为空，无法进行支付和更新订单状态')
        uni.showModal({
          title: '订单信息错误',
          content: '订单信息不完整，请重新下单',
          showCancel: false,
          success: () => {
            uni.navigateBack()
          }
        })
      } else if (!paymentData.value.orderNo) {
        console.warn('⚠️ 警告：订单号为空，将使用订单ID更新状态')
      }
    } catch (error) {
      console.error('解析支付数据失败', error)
      uni.showToast({ title: '数据解析失败', icon: 'none' })
    }
  } else {
    console.error('❌ 支付页面未接收到订单数据')
  }
})

onMounted(() => {
  console.log('支付页面加载')
})

onShow(() => {
  // 页面显示时的逻辑
})
</script>

<style scoped>
.payment-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding: 40rpx;
}

/* 支付信息 */
.payment-info {
  background: white;
  border-radius: 16rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  text-align: center;
}

.amount-section {
  margin-bottom: 30rpx;
}

.amount-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.amount-value {
  display: block;
  font-size: 60rpx;
  color: #ff4757;
  font-weight: bold;
  margin-bottom: 8rpx;
}

/* 折扣信息 */
.discount-info {
  display: block;
  font-size: 28rpx;
  color: #ff6b6b;
  margin-top: 8rpx;
}

/* 优惠券信息 */
.coupon-info {
  padding-top: 20rpx;
  margin-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coupon-label {
  font-size: 26rpx;
  color: #666;
}

.coupon-value {
  font-size: 26rpx;
  color: #ff6b6b;
  font-weight: 500;
  margin-left: 10rpx;
}

.order-info {
  padding-top: 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.order-label {
  font-size: 26rpx;
  color: #666;
}

.order-value {
  font-size: 26rpx;
  color: #333;
}

/* 支付方式 */
.payment-methods {
  background: white;
  border-radius: 16rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
}

.methods-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.method-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
}

.method-item.active {
  border-color: #ff4757;
  background: #fff5f5;
}

.method-icon {
  font-size: 48rpx;
}

.method-info {
  flex: 1;
}

.method-name {
  display: block;
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.method-desc {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.method-radio {
  font-size: 36rpx;
  color: #ff4757;
}

/* 支付按钮 */
.payment-actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.pay-btn {
  width: 100%;
  height: 100rpx;
  background: #ff4757;
  color: white;
  font-size: 36rpx;
  font-weight: bold;
  border-radius: 50rpx;
  border: none;
}

.cancel-btn {
  width: 100%;
  height: 88rpx;
  background: white;
  color: #666;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: 2rpx solid #e0e0e0;
}

/* 支付结果弹窗 */
.payment-result {
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

.result-content {
  background: white;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  margin: 40rpx;
  text-align: center;
  max-width: 600rpx;
}

.result-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 30rpx;
  font-size: 60rpx;
}

.result-icon.success {
  background: #e8f5e9;
}

.result-icon.failed {
  background: #ffebee;
}

.result-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.result-desc {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
  margin-bottom: 30rpx;
}

/* 公益贡献提示 */
.charity-contribution {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, #fff5f5, #ffe5e5);
  border-radius: 16rpx;
  margin-bottom: 40rpx;
  text-align: left;
}

.charity-icon {
  font-size: 48rpx;
  flex-shrink: 0;
  animation: heartbeat 1.5s ease-in-out infinite;
  color: #ff4757 !important;
}

@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.charity-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.charity-title {
  font-size: 28rpx;
  color: #ff6b6b;
  font-weight: 600;
}

.charity-amount {
  font-size: 32rpx;
  color: #ff4757;
  font-weight: bold;
}

.charity-desc {
  font-size: 24rpx;
  color: #ff8787;
}

.result-actions {
  display: flex;
  gap: 20rpx;
}

.result-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.result-btn.primary {
  background: #ff4757;
  color: white;
}

.result-btn.secondary {
  background: #f5f5f5;
  color: #666;
}
</style>

<style>
@import "@/static/999/iconfont.css";
</style>