<template>
  <view class="confirm-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">正在加载订单信息...</text>
    </view>

    <!-- 订单信息（参照积分确认订单页格式） -->
    <view v-else-if="orderData" class="order-body" key="order">
      <view v-if="!orderData" class="order-error-tip">接口返回异常或需登录，请核对后重试</view>

      <template v-if="orderData">
        <!-- 顶部：到店支付/门店/订单号（参照地址栏样式） -->
        <view class="address-section">
          <view class="address-info">
            <view class="address-header">
              <text class="receiver-name">到店支付</text>
              <text class="receiver-phone">{{ orderData.store_name || '—' }}</text>
            </view>
            <text class="address-detail">订单号：{{ orderData.order_no || orderData.orderNo || orderNo }}</text>
          </view>
          <text class="address-arrow" @tap="copyOrderNo">复制</text>
        </view>

        <!-- 商品清单（与积分确认订单一致） -->
        <view class="products-section">
          <view class="section-header">
            <text class="section-title">商品清单</text>
          </view>
          <template v-if="orderData.items && orderData.items.length > 0">
            <view v-for="(item, index) in orderData.items" :key="index" class="product-item">
              <image v-if="item.image || item.img" :src="item.image || item.img" class="product-image" mode="aspectFill" />
              <view class="product-info">
                <text class="product-name">{{ item.name || item.product_name }}</text>
                <text v-if="item.spec || item.sku_name" class="product-spec">{{ item.spec || item.sku_name }}</text>
                <view class="product-price-row">
                  <text class="product-price">¥{{ formatAmount(item.unit_price || item.price || 0) }}</text>
                  <text class="product-quantity">x{{ item.quantity || 1 }}</text>
                </view>
              </view>
              <text class="product-total">¥{{ formatAmount((item.unit_price || item.price || 0) * (item.quantity || 1)) }}</text>
            </view>
          </template>
          <view v-else class="product-item">
            <view class="product-info">
              <text class="product-name">{{ orderData.product_name || '商品' }}</text>
              <view class="product-price-row">
                <text class="product-price">¥{{ formatAmount(orderData.total_amount || orderData.amount || 0) }}</text>
                <text class="product-quantity">x1</text>
              </view>
            </view>
            <text class="product-total">¥{{ formatAmount(orderData.total_amount || orderData.amount || 0) }}</text>
          </view>
        </view>

        <!-- 优惠券（与积分确认订单一致） -->
        <view class="coupon-section">
          <view class="section-header">
            <text class="section-title">优惠券</text>
            <text class="available-points">共有 {{ availableCoupons.length }} 张可用</text>
          </view>
          <view v-if="selectedCoupon" class="selected-coupon">
            <view class="selected-coupon-content">
              <text class="selected-coupon-name">已选：{{ selectedCoupon.name || '优惠券' }}</text>
              <text class="selected-coupon-value">-¥{{ formatAmount(couponDiscount) }}</text>
            </view>
            <button class="cancel-coupon-btn" @tap="clearCoupon">取消</button>
          </view>
          <view v-else class="coupon-list-wrap">
            <view v-for="c in availableCoupons" :key="c.id" class="coupon-item" @tap="selectCoupon(c)">
              <view class="coupon-left">
                <text class="coupon-value">¥{{ formatAmount(couponAmount(c)) }}</text>
                <text v-if="minSpend(c) > 0" class="coupon-condition">满{{ minSpend(c) }}可用</text>
              </view>
              <view class="coupon-right">
                <text class="coupon-name">{{ c.name || c.template?.name || '优惠券' }}</text>
              </view>
            </view>
            <view v-if="availableCoupons.length === 0 && !couponLoading" class="no-coupons">
              <text class="no-coupons-text">暂无可用优惠券</text>
            </view>
            <view v-if="couponLoading" class="coupon-loading">加载中...</view>
          </view>
        </view>

        <!-- 积分抵扣（非会员商品可用，1积分=1元） -->
        <view v-if="!disablePoints" class="points-section">
          <view class="section-header">
            <text class="section-title">积分抵扣</text>
            <text class="available-points">可用 {{ userPointsBalance }} 积分</text>
          </view>
          <view class="points-row">
            <text class="input-label">使用积分</text>
            <input
              class="points-input"
              type="digit"
              v-model.number="pointsToUse"
              placeholder="0"
              :disabled="userPointsBalance === 0 || maxPointsDiscount <= 0"
              @input="onPointsInput"
            />
            <button class="use-max-btn" type="button" @tap="useMaxPoints" :disabled="userPointsBalance === 0 || maxPointsDiscount <= 0">全部使用</button>
          </view>
          <view class="points-tips">
            <text class="tip-item">• 最多可抵扣 {{ formatAmount(maxPointsDiscount) }} 积分（1积分=1元，最多抵扣原价的 50%）</text>
            <text class="tip-item">• 非会员商品可使用积分</text>
          </view>
        </view>

        <!-- 支付方式（与积分确认订单的配送方式样式一致） -->
        <view class="delivery-way-section">
          <view class="section-header">
            <text class="section-title">选择支付方式</text>
          </view>
          <view class="delivery-way-options">
            <view
              v-for="method in paymentMethods"
              :key="method.id"
              class="delivery-way-option"
              :class="{ active: selectedMethod === method.id }"
              @tap="selectMethod(method.id)"
            >
              <text class="delivery-way-icon">{{ method.id === 1 ? '💳' : method.id === 2 ? '🔵' : '💰' }}</text>
              <view class="delivery-way-info">
                <text class="delivery-way-name">{{ method.name }}</text>
                <text class="delivery-way-desc">{{ method.desc }}</text>
              </view>
              <text class="delivery-way-radio">{{ selectedMethod === method.id ? '●' : '○' }}</text>
            </view>
          </view>
        </view>

        <!-- 价格明细（与积分确认订单一致） -->
        <view class="price-detail">
          <view class="detail-row">
            <text class="detail-label">商品金额</text>
            <text class="detail-value">¥{{ formatAmount(orderAmount) }}</text>
          </view>
          <view v-if="couponDiscount > 0" class="detail-row discount">
            <text class="detail-label">优惠抵扣</text>
            <text class="detail-value">-¥{{ formatAmount(couponDiscount) }}</text>
          </view>
          <view v-if="pointsToUse > 0" class="detail-row discount">
            <text class="detail-label">积分抵扣</text>
            <text class="detail-value">-¥{{ formatAmount(pointsDiscount) }}</text>
          </view>
          <view class="detail-row total">
            <text class="detail-label">实际支付</text>
            <text class="detail-value">¥{{ formatAmount(actualPayAmount) }}</text>
          </view>
          <view v-if="orderEarnPoints > 0" class="earn-points-row">
            <text class="earn-label">本次可获得积分</text>
            <text class="earn-value">+{{ orderEarnPoints }} 分</text>
          </view>
        </view>

        <!-- 底部提交栏（与积分确认订单一致） -->
        <view class="submit-bar">
          <view class="total-info">
            <text class="total-label">实付</text>
            <text class="total-price">¥{{ formatAmount(actualPayAmount) }}</text>
          </view>
          <button
            class="submit-btn"
            :disabled="paying || !isPendingStatus(orderData.status)"
            @tap="handlePayment"
          >
            {{ paying ? '支付中...' : '提交订单' }}
          </button>
        </view>
      </template>
    </view>

    <!-- 支付结果弹窗（与支付页一致） -->
    <view v-if="showPaymentResult" class="payment-result" @tap="hidePaymentResult">
      <view class="result-content" @tap.stop>
        <view class="result-icon" :class="paymentSuccess ? 'success' : 'failed'">
          <text class="iconfont" :class="paymentSuccess ? 'icon-dianzan' : 'icon-buxihuan'"></text>
        </view>
        <text class="result-title">{{ paymentSuccess ? '支付成功' : '支付失败' }}</text>
        <text class="result-desc">{{ paymentSuccess ? '订单支付成功' : (paymentResultMsg || '支付失败，请重试或选择其他支付方式') }}</text>
        <view class="result-actions">
          <button v-if="paymentSuccess" class="result-btn primary" @tap="goToOrders">查看订单</button>
          <button v-else class="result-btn primary" @tap="hidePaymentResult">重新支付</button>
          <button class="result-btn secondary" @tap="goHome">返回首页</button>
        </view>
      </view>
    </view>

    <!-- 错误提示（无订单号、加载失败或接口异常时显示） -->
    <view v-else-if="!loading && !orderData" class="error-container">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ errorMessage || '订单信息加载失败' }}</text>
      <text class="error-hint">请重新扫码或点击下方按钮返回</text>
      <button class="retry-btn" @tap="loadOrder" v-if="orderNo">重试</button>
      <button class="back-btn" @tap="goBack">返回</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getPendingReferrer, clearPendingReferrer } from '@/utils/referral.js'
import { getOfflineOrderDetail, getOrderDetail, offlinePayUnified } from '@/api/order.js'
import { getMyCoupons } from '@/api/coupon.js'
import { getPointsBalance } from '@/api/points.js'
import { bindReferrer } from '@/api/user.js'

// 其余 API 按需动态 import




console.log('[线下支付] pay.vue 脚本已执行')
const loading = ref(true)
const orderData = ref(null)
const orderNo = ref('')
const errorMessage = ref('')
const rawOrderResponse = ref(null)
const showRawResponse = ref(false)  // 默认收起，与正常订单页一致
const showPaymentResult = ref(false)
const paymentSuccess = ref(false)
const paymentResultMsg = ref('')
const paying = ref(false)
const selectedMethod = ref(1) // 1-微信支付, 2-支付宝, 3-余额支付
const couponList = ref([])
const couponLoading = ref(false)
const selectedCoupon = ref(null)
const disablePoints = ref(false) // 是否禁用积分抵扣
const orderAmount = computed(() => Number(orderData.value?.total_amount ?? orderData.value?.amount ?? 0))
const userPointsBalance = ref(0)
const pointsToUse = ref(0)
const orderEarnPoints = computed(() => Number(orderData.value?.earn_points ?? orderData.value?.earnPoints ?? 0))
const maxPointsDiscount = computed(() => {
  const amt = orderAmount.value
  if (amt <= 0) return 0
  // 最多抵扣「原价的 50%」，且不能超过用户积分余额
  const half = amt * 0.5
  return Math.min(userPointsBalance.value, half)
})
const pointsDiscount = computed(() => Math.min(pointsToUse.value, maxPointsDiscount.value))
const actualPayAmount = computed(() => Math.max(0, orderAmount.value - couponDiscount.value - pointsDiscount.value))
const rawResponseText = computed(() => {
  const r = rawOrderResponse.value
  if (r == null) return '暂无数据'
  try {
    return typeof r === 'string' ? r : JSON.stringify(r, null, 2)
  } catch (e) {
    return String(r)
  }
})
const couponDiscount = computed(() => {
  if (!selectedCoupon.value || orderAmount.value <= 0) return 0
  const amt = couponAmount(selectedCoupon.value)
  return Math.min(amt, orderAmount.value)
})
const availableCoupons = computed(() => {
  const amount = orderAmount.value
  const now = Date.now()
  return couponList.value.filter((c) => {
    const min = minSpend(c)
    if (amount < min) return false
    const to = c.valid_to ?? c.validTo ?? c.expire_time ?? c.expireTime
    if (to && new Date(to).getTime() < now) return false
    return (c.status || '') !== 'used'
  })
})

function couponAmount(c) {
  return Number(c.amount ?? c.template?.amount ?? 0)
}
function minSpend(c) {
  return Number(c.min_spend ?? c.minSpend ?? c.template?.minSpend ?? 0)
}
function selectCoupon(c) {
  selectedCoupon.value = c
}
function clearCoupon() {
  selectedCoupon.value = null
}

function onPointsInput(e) {
  const v = e.detail?.value ?? e.target?.value ?? ''
  const n = parseInt(String(v).replace(/\D/g, ''), 10)
  if (isNaN(n) || n < 0) {
    pointsToUse.value = 0
    return
  }
  pointsToUse.value = Math.min(n, maxPointsDiscount.value)
}
function useMaxPoints() {
  pointsToUse.value = maxPointsDiscount.value
}

/**
 * 加载用户积分余额
 */
async function loadUserPoints() {
  const token = uni.getStorageSync('token')
  if (!token) return
  try {
    const res = await getPointsBalance()
    const pts = res.data?.total_points ?? res.data?.member_points ?? res.data?.points ?? res.data?.balance ?? 0
    userPointsBalance.value = Number(pts)
    if (pointsToUse.value > userPointsBalance.value || pointsToUse.value > maxPointsDiscount.value) {
      pointsToUse.value = Math.min(userPointsBalance.value, maxPointsDiscount.value)
    }
  } catch (e) {
    console.warn('[线下支付] 加载积分失败', e)
    userPointsBalance.value = 0
  }
}

watch(maxPointsDiscount, (maxVal) => {
  if (pointsToUse.value > maxVal) pointsToUse.value = maxVal
})

// 线下支付只保留微信支付
const paymentMethods = [
  {
    id: 1,
    name: '微信支付',
    desc: '使用微信支付',
    iconClass: 'icon-weixin'
  }
]

/**
 * 格式化金额
 */
const formatAmount = (amount) => {
  return Number(amount || 0).toFixed(2)
}

/**
 * 获取订单状态文本（支持后端数字状态：0/1=待支付，2=已支付等）
 */
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待支付',
    'paid': '已支付',
    'pending_ship': '待发货',
    'shipping': '配送中',
    'pending_recv': '待收货',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunding': '退款中',
    'refunded': '已退款',
    0: '待支付',
    1: '待支付',
    2: '已支付',
    3: '待发货',
    4: '已退款',
    5: '待收货',
    6: '已完成',
    7: '已取消',
    8: '退款中',
    9: '已退款'
  }
  return statusMap[status] ?? statusMap[String(status)] ?? '未知状态'
}

/** 是否为可支付状态（待支付） */
const isPendingStatus = (status) => {
  if (status === 'pending' || status === 0 || status === 1) return true
  if (status != null && String(status) === 'pending') return true
  return false
}

/**
 * 加载可用优惠券
 */
async function loadCoupons() {
  const token = uni.getStorageSync('token')
  if (!token) return
  const userInfo = uni.getStorageSync('userInfo') || {}
  const userId = userInfo.user_id ?? userInfo.id ?? userInfo.userId ?? userInfo.uid
  if (!userId) return
  couponLoading.value = true
  try {
    const res = await getMyCoupons({ user_id: userId, status: 'unused', page: 1, page_size: 50 })
    const list = res.data?.coupons ?? res.coupons ?? res.data?.rows ?? res.data?.list ?? res.rows ?? res.list ?? []
    couponList.value = Array.isArray(list) ? list : []
  } catch (e) {
    console.warn('[线下支付] 加载优惠券失败', e)
    couponList.value = []
  } finally {
    couponLoading.value = false
  }
}

/**
 * 选择支付方式
 */
const selectMethod = (methodId) => {
  selectedMethod.value = methodId
}

/**
 * 加载订单信息
 */
const loadOrder = async () => {
  if (!orderNo.value) {
    errorMessage.value = '订单号不能为空'
    loading.value = false
    return
  }
  // 根据订单号前缀设置禁用积分标志（例如 OFF 开头的线下订单）
  if (orderNo.value.startsWith('OFF')) {
      disablePoints.value = true
    }
  if (disablePoints.value) pointsToUse.value = 0
  try {
    loading.value = true
    errorMessage.value = ''
    rawOrderResponse.value = null

    const no = orderNo.value
    console.log('[线下支付] 开始加载订单，订单号:', no, '（来源 pay:// 时仅用线下订单详情接口）')
    // pay://OFF... 的订单号只用 GET /api/offline/dingdan/xiangqing/{order_no}，与普通订单详情不是同一接口
    const isOfflineOrderNo = /^OFF/i.test(no)
    const isOtherOfflineLike = /^P\d+/i.test(no) || no.length >= 10
    let res = null
	
    if (isOfflineOrderNo) {
      // OFF 开头：仅调线下订单详情接口，不 fallback 到普通订单详情
      try {
        res = await getOfflineOrderDetail(no)
        rawOrderResponse.value = res
      } catch (e) {
        rawOrderResponse.value = {
          _from: 'getOfflineOrderDetail',
          _api: '/api/offline/dingdan/xiangqing/{order_no}',
          error: true,
          statusCode: e.statusCode ?? e.code,
          message: e.message || e.errorMsg || e.msg,
          detail: e.detail || (e.message ? undefined : e)
        }
        console.warn('[线下支付] 线下订单详情接口失败（如 401 需登录）:', e)
        throw e
      }
    } else if (isOtherOfflineLike) {
      try {
        res = await getOfflineOrderDetail(no)
        rawOrderResponse.value = res
      } catch (e) {
        rawOrderResponse.value = rawOrderResponse.value || {
          _from: 'getOfflineOrderDetail',
          error: true,
          statusCode: e.statusCode ?? e.code,
          message: e.message || e.errorMsg || e.msg,
          detail: e.detail || (e.message ? undefined : e)
        }
        res = null
      }
    }
    if (res == null && !isOfflineOrderNo) {
      try {
        res = await getOrderDetail(no)
        rawOrderResponse.value = rawOrderResponse.value || res
      } catch (e) {
        if (!rawOrderResponse.value) {
          rawOrderResponse.value = {
            _from: 'getOrderDetail',
            error: true,
            statusCode: e.statusCode ?? e.code,
            message: e.message || e.errorMsg || e.msg,
            detail: e.detail || (e.message ? undefined : e)
          }
        }
        throw e
      }
    }
    if (res == null) {
      throw new Error(isOfflineOrderNo ? '未获取到线下订单数据，请确认已登录' : '未获取到订单数据')
    }

    // 处理不同的响应格式
    let order = null
    if (res.data) {
      order = res.data
    } else if (res.order_info || res['order info']) {
      order = res.order_info || res['order info']
      if (res.items) order.items = res.items
    } else if (typeof res === 'object' && (res.id || res.order_no || res.orderNo)) {
      order = res
    } else {
      throw new Error('订单数据格式错误')
    }
    if (order && !order.order_no && no) order.order_no = no

    // 线下订单接口返回的 amount 单位为「分」，需转为「元」再展示和支付
    const isOfflineAmountFen = /^OFF/i.test(order?.order_no || no) || /^P\d+/i.test(order?.order_no || no)
    if (isOfflineAmountFen && order) {
      if (order.amount != null && typeof order.amount === 'number') order.amount = order.amount / 100
      if (order.total_amount != null && typeof order.total_amount === 'number') order.total_amount = order.total_amount / 100
    }

    orderData.value = order
    console.log('[线下支付] 订单加载成功:', order)
    loading.value = false
    nextTick(() => {
      console.log('[线下支付] 已置 loading=false，orderData 已设置，应显示订单内容')
    })
    loadCoupons()
    loadUserPoints()

    // 检查订单状态（支持数字 0/1 表示待支付）
    if (!isPendingStatus(order.status)) {
      uni.showModal({
        title: '提示',
        content: `订单状态为：${getStatusText(order.status)}，无法支付`,
        showCancel: false,
        success: () => {
          goBack()
        }
      })
    }
  } catch (error) {
    console.error('[线下支付] 加载订单失败:', error)
    if (!rawOrderResponse.value) {
      rawOrderResponse.value = {
        error: true,
        statusCode: error.statusCode ?? error.code,
        message: error.message || error.errorMsg || error.msg,
        detail: error.detail || (error.message ? undefined : error)
      }
    }
    errorMessage.value = error.message || '加载订单信息失败，请重试'
    uni.showToast({
      title: errorMessage.value,
      icon: 'none',
      duration: 3000
    })
  } finally {
    loading.value = false
  }
}

/**
 * 处理支付
 */
const handlePayment = async () => {
  if (paying.value) return
  
  if (!orderData.value) {
    uni.showToast({ title: '订单信息不存在', icon: 'none' })
    return
  }

  const amount = actualPayAmount.value

  // 检查登录状态
  const token = uni.getStorageSync('token')
  if (!token) {
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

  try {
    paying.value = true
    uni.showLoading({ title: '正在支付...' })

    const orderNumber = orderData.value.order_no || orderData.value.orderNo || orderNo.value
    const couponId = selectedCoupon.value ? selectedCoupon.value.id : null
	const pts = !disablePoints.value && pointsToUse.value > 0 ? pointsToUse.value * 100 : null

    if (selectedMethod.value === 1) {
      // 微信支付（统一下单）
      const { refreshUserInfo, getUserInfo } = await import('@/api/user.js')
      const parseMaybeJson = (v) => {
        if (!v) return null
        if (typeof v === 'object') return v
        try { return JSON.parse(v) } catch (e) { return null }
      }

      const resolveOpenid = async () => {
        let wechatInfoRaw = uni.getStorageSync('wechatInfo')
        let wechatInfo = parseMaybeJson(wechatInfoRaw) || wechatInfoRaw
        let userInfo = uni.getStorageSync('userInfo') || {}
        const list = [
          wechatInfo && (wechatInfo.openid || wechatInfo.wechat_openid || wechatInfo.wx_openid || wechatInfo.mp_openid),
          uni.getStorageSync('openid'),
          userInfo && (userInfo.openid || userInfo.wechat_openid || userInfo.wx_openid || userInfo.mp_openid || (userInfo.wechat_info && userInfo.wechat_info.openid))
        ]
        for (const v of list) if (v) return v

        try {
          console.log('[线下支付] OpenID 未在本地找到，尝试刷新用户信息')
          const refreshed = await refreshUserInfo()
          const refreshedWechat = parseMaybeJson(refreshed?.wechat_info || refreshed?.wechatInfo || uni.getStorageSync('wechatInfo')) || refreshed?.wechat_info || refreshed?.wechatInfo
          const refreshedUser = uni.getStorageSync('userInfo') || refreshed
          const afterList = [
            refreshedWechat && (refreshedWechat.openid || refreshedWechat.wechat_openid),
            refreshedUser && (refreshedUser.openid || refreshedUser.wechat_openid || refreshedUser.wx_openid || refreshedUser.mp_openid),
            uni.getStorageSync('openid')
          ]
          for (const v of afterList) if (v) return v
        } catch (err) {
          console.warn('[线下支付] 刷新用户信息失败:', err)
        }

        try {
          const userInfoStored = uni.getStorageSync('userInfo') || {}
          const mobile = userInfoStored.mobile || userInfoStored.phone
          if (mobile) {
            const resp = await getUserInfo(mobile)
            const data = resp && (resp.data || resp)
            const cand = data && (data.openid || data.wechat_openid || (data.wechat_info && data.wechat_info.openid))
            if (cand) {
              try { uni.setStorageSync('openid', cand) } catch (e) {}
              return cand
            }
          }
        } catch (err) {
          console.warn('[线下支付] getUserInfo 获取 openid 失败:', err)
        }
        return null
      }

      const openid = await resolveOpenid()
      if (!openid) {
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

      const userInfo = uni.getStorageSync('userInfo') || {}
      const userId = userInfo.user_id ?? userInfo.id ?? userInfo.userId ?? userInfo.uid ?? null
      const totalFeeFen = Math.round((Number(amount) || 0) * 100)

      const res = await offlinePayUnified(orderNumber, couponId, openid, userId, totalFeeFen, pts)


      const payParams =
        (res && (res.data?.pay_params || res.pay_params)) ||
        (res && (res.data?.wechat_pay_params || res.wechat_pay_params)) ||
        res?.data ||
        res

      console.log('[线下支付] 统一下单响应:', JSON.stringify(res, null, 2))
      console.log('[线下支付] 解析出的 payParams:', JSON.stringify(payParams, null, 2))

      if (payParams.paySign === 'ZERO_ORDER_SIGN') {
        console.log('[线下支付] 零元订单，直接成功')
        paymentSuccess.value = true
        showPaymentResult.value = true
        await bindToMerchantIfOffline()
        await handleReferralCode()
      } else {
        if (!payParams.timeStamp || !payParams.nonceStr || !payParams.package || !payParams.paySign) {
          throw new Error('支付参数错误，请重试')
        }

        const wxPayOnly = {
          provider: 'wxpay',
          timeStamp: String(payParams.timeStamp),
          nonceStr: payParams.nonceStr,
          package: payParams.package || payParams.packageValue,
          signType: payParams.signType || 'MD5',
          paySign: payParams.paySign
        }

        await new Promise((resolve, reject) => {
          uni.requestPayment({
            ...wxPayOnly,
            success: async (payRes) => {
              console.log('[线下支付] 微信支付成功:', payRes)
              try {
                await bindToMerchantIfOffline()
                await handleReferralCode()
              } catch (e) {
                console.warn('[线下支付] 支付回调处理异常', e)
              }
              paymentSuccess.value = true
              paymentResultMsg.value = ''
              showPaymentResult.value = true
              resolve(payRes)
            },
            fail: (err) => {
              console.error('[线下支付] 微信支付失败:', err)
              const rawMsg = String(err?.errMsg || err?.message || err?.msg || '')
              const isCancel = rawMsg.includes('cancel')
              const isParamError = /total_fee|缺少参数|参数错误/i.test(rawMsg)
              let friendlyMsg
              if (isCancel && !isParamError) {
                friendlyMsg = '用户已取消支付'
              } else if (isParamError) {
                friendlyMsg = '支付参数异常，请重试或联系商户'
              } else {
                friendlyMsg = rawMsg.replace(/requestPayment:fail\s*/i, '').trim() || '支付失败，请稍后重试'
              }
              reject(new Error(friendlyMsg))
            }
          })
        })
      }
    } else if (selectedMethod.value === 2) {
      uni.showToast({ title: '支付宝支付暂未开通', icon: 'none' })
    }
  } catch (error) {
    console.error('[线下支付] 支付失败:', error)
    paymentSuccess.value = false
    paymentResultMsg.value = error.message || '支付失败，请重试'
    showPaymentResult.value = true
  } finally {
    paying.value = false
    uni.hideLoading()
  }
}

/**
 * 微信支付（与正常购物支付页一致：多来源获取 openid + 刷新用户信息回退）
 */




/**
 * 线下支付成功：把当前用户绑到商家下面（推荐人=商家）
 */
const bindToMerchantIfOffline = async () => {
  try {
    // 直接使用静态导入的 bindReferrer，不再动态导入
    const order = orderData.value
    const merchantId = order?.merchant_id ?? order?.merchantId
    if (merchantId == null || merchantId === '') {
      return
    }
    const userInfo = uni.getStorageSync('userInfo') || {}
    if (userInfo.referrer_id || userInfo.referrerId) {
      console.log('[线下支付] 用户已有推荐人，跳过绑商家')
      return
    }
    const mobile = userInfo.mobile || userInfo.phone
    const userId = userInfo.user_id ?? userInfo.id ?? userInfo.userId ?? userInfo.uid
    const referrerId = Number(merchantId) || String(merchantId).trim()
    if (!referrerId) return
    const payload = { referrer_id: referrerId }
    if (mobile) payload.mobile = mobile
    else if (userId != null && userId !== '') payload.user_id = userId
    else {
      console.warn('[线下支付] 无法获取用户 mobile/user_id，跳过绑商家')
      return
    }
    console.log('[线下支付] 支付成功，绑定用户到商家:', payload)
    await bindReferrer(payload)
    console.log('[线下支付] 绑商家成功')
  } catch (e) {
    console.warn('[线下支付] 绑商家失败（不影响支付）:', e)
  }
}

const handleReferralCode = async () => {
  try {
    // 直接使用静态导入的 bindReferrer 和 clearPendingReferrer
    const pending = getPendingReferrer()
    if (!pending || !pending.referralCode) {
      console.log('[线下支付] 没有待绑定的推荐码')
      return
    }

    const userInfo = uni.getStorageSync('userInfo') || {}
    const mobile = userInfo.mobile || userInfo.phone
    
    if (!mobile) {
      console.warn('[线下支付] 无法获取用户 mobile，跳过绑定推荐人')
      return
    }

    if (userInfo.referrer_id || userInfo.referrerId) {
      console.log('[线下支付] 用户已有推荐人，跳过绑定')
      clearPendingReferrer()
      return
    }

    console.log('[线下支付] 尝试绑定推荐人:', { mobile, referrer_code: pending.referralCode })
    
    await bindReferrer({
      mobile: mobile,
      referrer_code: pending.referralCode
    })
    
    console.log('[线下支付] 绑定推荐人成功')
    clearPendingReferrer()
  } catch (error) {
    console.error('[线下支付] 绑定推荐人失败:', error)
  }
}

/**
 * 返回
 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({ url: '/pages/home/home' })
    }
  })
}

/** 复制订单号 */
const copyOrderNo = () => {
  const no = orderData.value?.order_no || orderData.value?.orderNo || orderNo.value
  if (!no) return
  uni.setClipboardData({ data: no, success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
}

/** 关闭支付结果弹窗 */
const hidePaymentResult = () => {
  showPaymentResult.value = false
}

/** 查看订单（支付成功） */
const goToOrders = () => {
  showPaymentResult.value = false
  uni.switchTab({ url: '/pages/user/user' })
  setTimeout(() => { uni.navigateTo({ url: '/subPackages/page2/pages/order/list' }) }, 100)
}

/** 返回首页 */
const goHome = () => {
  showPaymentResult.value = false
  uni.switchTab({ url: '/pages/home/home' })
}

/** 从扫码结果或参数字符串中解析订单号（支持 pay://订单号、纯订单号） */
function parseOrderNoFromOptions(options) {
  if (!options || typeof options !== 'object') return ''
  let orderNo = (options.orderNo || options.order_no || options.o || '').trim()
  if (orderNo) return orderNo
  const q = (options.q || options.scene || '').trim()
  if (q) {
    try {
      const decoded = decodeURIComponent(q)
      if (decoded.startsWith('pay://')) return decoded.slice(6).trim()
      if (/^(OFF|P)\w+/.test(decoded)) return decoded
    } catch (e) {}
    if (q.startsWith('pay://')) return q.slice(6).trim()
    if (/^(OFF|P)\w+/.test(q)) return q
  }
  for (const v of Object.values(options)) {
    const s = String(v || '').trim()
    if (s && (/^OFF/i.test(s) || /^P\d+/.test(s))) return s
  }
  return ''
}

/** 微信小程序等环境下 onLoad 的 options 可能为空，从当前页实例再取一次 */
function getPageOptions() {
  try {
    if (typeof getCurrentPages !== 'function') return {}
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1]
    if (!cur) return {}
    const opts = cur.options || (cur.$page && cur.$page.options) || {}
    return opts
  } catch (e) {
    return {}
  }
}

onLoad((options) => {
  const opts = options && Object.keys(options || {}).length > 0 ? options : getPageOptions()
  console.log('[线下支付] 页面加载参数 onLoad:', options, 'getPageOptions:', opts)
  
  let orderNoFromParams = parseOrderNoFromOptions(opts || {})
  
  if (!orderNoFromParams) {
    const pending = getPendingReferrer()
    if (pending && pending.orderNo) {
      orderNoFromParams = pending.orderNo
      console.log('[线下支付] 从本地存储获取订单号:', orderNoFromParams)
    }
  }
  
  if (!orderNoFromParams) {
    errorMessage.value = '未识别到订单号，请重新扫码或通过链接进入'
    loading.value = false
    rawOrderResponse.value = null
    return
  }
  
  orderNo.value = orderNoFromParams.trim()
  // 判断是否禁用积分：如果 URL 参数中 noPoints=1 或订单号以 OFF 开头
  if (opts.noPoints === '1' || orderNo.value.startsWith('OFF')) {
      disablePoints.value = true
  }
  if (disablePoints.value) pointsToUse.value = 0
  console.log('[线下支付] 解析到订单号:', orderNo.value)
  loadOrder()
})

onShow(() => {
  if (orderNo.value) return
  const opts = getPageOptions()
  const parsed = parseOrderNoFromOptions(opts)
  if (parsed) {
    orderNo.value = parsed
    console.log('[线下支付] onShow 兜底解析到订单号:', orderNo.value)
    loadOrder()
  }
})

onMounted(() => {
  console.log('[线下支付] 页面已挂载')
})
</script>

<style scoped>
/* 与积分确认订单页一致的整体布局 */
.confirm-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.order-body {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 加载中 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.loading-text {
  margin-top: 30rpx;
  font-size: 28rpx;
  color: #999;
}

.order-error-tip {
  padding: 20rpx 24rpx;
  background: #fff3cd;
  color: #856404;
  font-size: 26rpx;
  border-radius: 12rpx;
  margin: 20rpx;
}

/* 到店支付/门店/订单号（参照地址栏） */
.address-section {
  background: white;
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
  line-height: 1.5;
}

.address-arrow {
  font-size: 24rpx;
  color: #1989fa;
  padding: 8rpx 16rpx;
}

/* 商品清单 */
.products-section {
  background: white;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.product-item {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  align-items: center;
}

.product-item:last-child {
  margin-bottom: 0;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8rpx;
}

.product-spec {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.product-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 28rpx;
  color: #ff4757;
  font-weight: bold;
}

.product-quantity {
  font-size: 24rpx;
  color: #999;
}

.product-total {
  font-size: 32rpx;
  color: #ff4757;
  font-weight: bold;
  flex-shrink: 0;
}

/* 优惠券区域 */
.coupon-section {
  background: #fff8e1;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

/* 积分抵扣区域 */
.points-section {
  background: #e8f5e9;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.points-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 16rpx;
}

.points-row .input-label {
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.points-input {
  flex: 1;
  height: 64rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #c8e6c9;
}

.use-max-btn {
  font-size: 26rpx;
  color: #2e7d32;
  padding: 12rpx 24rpx;
  background: #fff;
  border: 1rpx solid #2e7d32;
  border-radius: 20rpx;
  height: auto;
  line-height: 1.4;
}

.points-tips {
  margin-top: 16rpx;
  padding: 0 4rpx;
}

.points-tips .tip-item {
  display: block;
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
}

.available-points {
  font-size: 24rpx;
  color: #ff9800;
}

.selected-coupon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: #fff3e0;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.selected-coupon-content {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.selected-coupon-name {
  font-size: 28rpx;
  color: #333;
}

.selected-coupon-value {
  font-size: 28rpx;
  color: #ff9800;
  font-weight: 600;
}

.cancel-coupon-btn {
  font-size: 26rpx;
  color: #ff9800;
  padding: 8rpx 20rpx;
  background: transparent;
  border: 1rpx solid #ff9800;
  border-radius: 20rpx;
  height: auto;
  line-height: 1.5;
}

.coupon-list-wrap {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.coupon-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #ffe0b2;
}

.coupon-left {
  display: flex;
  flex-direction: column;
  margin-right: 20rpx;
}

.coupon-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #ff9800;
}

.coupon-condition {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.coupon-right {
  flex: 1;
}

.coupon-name {
  font-size: 26rpx;
  color: #666;
}

.no-coupons,
.coupon-loading {
  padding: 24rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}

.no-coupons-text {
  font-size: 26rpx;
  color: #999;
}

/* 支付方式（配送方式样式） */
.delivery-way-section {
  background: white;
  padding: 30rpx;
  margin-bottom: 20rpx;
  border-radius: 16rpx;
}

.delivery-way-options {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 20rpx;
}

.delivery-way-option {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
}

.delivery-way-option.active {
  background: #f0f4ff;
  border-color: #3d6bff;
}

.delivery-way-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.delivery-way-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.delivery-way-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.delivery-way-desc {
  font-size: 24rpx;
  color: #999;
}

.delivery-way-radio {
  font-size: 32rpx;
  color: #3d6bff;
  margin-left: 20rpx;
}

/* 价格明细 */
.price-detail {
  background: white;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
}

.detail-label {
  font-size: 26rpx;
  color: #666;
}

.detail-value {
  font-size: 26rpx;
  color: #333;
}

.detail-row.discount .detail-value {
  color: #4caf50;
}

.detail-row.total {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 16rpx;
  margin-top: 8rpx;
}

.detail-row.total .detail-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff4757;
}

.earn-points-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx;
  background: #fff3e0;
  margin: 20rpx -30rpx -30rpx;
  border-radius: 0 0 16rpx 16rpx;
}

.earn-label {
  font-size: 26rpx;
  color: #666;
}

.earn-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff9800;
}

/* 底部提交栏 */
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 20rpx 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.total-info {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  flex: 1;
}

.total-label {
  font-size: 26rpx;
  color: #666;
}

.total-price {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff4757;
}

.submit-btn {
  padding: 24rpx 60rpx;
  background: linear-gradient(135deg, #ff6b6b, #ff8787);
  color: white;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: none;
  height: auto;
  line-height: 1;
  margin-left: 20rpx;
  flex-shrink: 0;
}

.submit-btn:disabled {
  background: #ccc;
  opacity: 0.7;
}

/* 订单详情接口原始返回 */
.raw-response-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid #eee;
  margin: 20rpx;
}

.raw-response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  background: #f8f9fa;
}

.raw-response-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.raw-response-toggle {
  font-size: 26rpx;
  color: #666;
}

.raw-response-body {
  max-height: 400rpx;
  padding: 20rpx 28rpx;
}

.raw-response-text {
  font-size: 24rpx;
  color: #555;
  word-break: break-all;
  white-space: pre-wrap;
  line-height: 1.5;
}

/* 支付结果弹窗 */
.payment-result {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.result-content {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx;
  text-align: center;
}

.result-icon { font-size: 100rpx; margin-bottom: 24rpx; }
.result-icon.success { color: #07c160; }
.result-icon.failed { color: #ee0a24; }
.result-title { font-size: 34rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
.result-desc { font-size: 28rpx; color: #666; display: block; margin-bottom: 40rpx; }
.result-actions { display: flex; flex-direction: column; gap: 20rpx; }
.result-btn { padding: 24rpx; border-radius: 12rpx; font-size: 30rpx; }
.result-btn.primary { background: #07c160; color: #fff; border: none; }
.result-btn.secondary { background: #f5f5f5; color: #333; border: none; }

/* 错误提示（无订单时） */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
  min-height: 400rpx;
}

.error-icon {
  font-size: 80rpx;
  margin-bottom: 30rpx;
}

.error-text {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
  text-align: center;
}

.error-hint {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 40rpx;
  text-align: center;
}

.retry-btn,
.back-btn {
  width: 200rpx;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  margin: 10rpx;
}

.retry-btn {
  background: #3d6bff;
  color: white;
  border: none;
}

.back-btn {
  background: white;
  color: #666;
  border: 1rpx solid #ddd;
}
</style>
