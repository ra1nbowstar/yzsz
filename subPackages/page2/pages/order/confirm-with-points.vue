<template>
  <view class="confirm-page">
    <!-- 收货地址 -->
    <view class="address-section" @tap="selectAddress">
      <view v-if="selectedAddress" class="address-info">
        <view class="address-header">
          <text class="receiver-name">{{ selectedAddress.name }}</text>
          <text class="receiver-phone">{{ selectedAddress.phone }}</text>
          <view v-if="selectedAddress.isDefault" class="default-badge">默认</view>
        </view>
        <text class="address-detail">{{ selectedAddress.fullAddress }}</text>
      </view>
      <view v-else class="no-address">
        <text class="no-address-icon iconfont icon-dingwei"></text>
        <text class="no-address-text">请选择收货地址</text>
      </view>
      <text class="address-arrow">›</text>
    </view>

    <!-- 商品信息 -->
    <view class="products-section">
      <view class="section-header">
        <text class="section-title">商品清单</text>
      </view>
      <view 
        v-for="(item, index) in orderItems" 
        :key="`${item.id || item.product_id || index}-${item.quantity}`"
        class="product-item"
      >
        <image :src="item.image" class="product-image" mode="aspectFill" />
        <view class="product-info">
          <text class="product-name">{{ item.name }}</text>
          <text v-if="item.spec || formatSpecifications(item.specifications)" class="product-spec">
            {{ item.spec || formatSpecifications(item.specifications) }}
          </text>
          <view v-if="item.isVip" class="vip-badge">会员商品</view>
          <view class="product-price-row">
            <text class="product-price">¥{{ formatAmount(item.price) }}</text>
            <text class="product-quantity">x{{ item.quantity }}</text>
          </view>
        </view>
        <text class="product-total">¥{{ formatAmount(item.price * item.quantity) }}</text>
      </view>
    </view>

    <!-- 积分抵扣区域（仅存在可用积分的普通商品时展示） -->
    <view class="points-section" v-if="canUsePoints">
      <view class="section-header">
        <text class="section-title">积分抵扣</text>
        <text class="available-points">可用 {{ formatAmount(userPoints) }} 积分（1 积分 = 1 元）</text>
      </view>
      
      <view class="points-input-row">
        <text class="input-label">使用积分</text>
        <input 
          v-model.number="pointsToUse" 
          type="digit"
          class="points-input"
          placeholder="0"
          inputmode="decimal"
          :disabled="userPoints === 0 || maxPointsDiscount === 0"
          @input="onPointsInput"
        />
        <text class="input-unit">元</text>
        <button 
          class="use-max-btn" 
          :disabled="userPoints === 0 || maxPointsDiscount === 0"
          @click="useMaxPoints"
        >
          最大
        </button>
      </view>
      
      <view class="points-slider">
        <slider 
          :value="pointsToUse" 
          :max="maxPointsDiscount > 0 ? maxPointsDiscount : 1"
          :min="0"
          :step="maxPointsDiscount > 0 && maxPointsDiscount < 1 ? 0.0001 : 0.01"
          activeColor="#ff9800"
          :disabled="userPoints === 0 || maxPointsDiscount === 0"
          @changing="onSliderChange"
          @change="onSliderChange"
        />
      </view>
      
      <view class="points-tips">
        <text class="tip-item">• 最多可抵扣 {{ formatAmount(maxPointsDiscount) }} 积分（受商品设置和订单金额限制）</text>
        <text class="tip-item">• 会员商品不可使用积分抵扣</text>
        <text class="tip-item">• 输入框单位为「元」，与抵扣金额一致</text>
        <text class="tip-item">• 本次可获得 {{ formatAmount(actualAmount) }} 积分</text>
      </view>
    </view>

    <!-- 始终显示配送方式 -->
    <view class="delivery-way-section">
      <view class="section-header">
        <text class="section-title">配送方式</text>
      </view>
      <view class="delivery-way-options">
        <view 
          class="delivery-way-option"
          :class="{ active: deliveryWay === 'platform' }"
          @tap="selectDeliveryWay('platform')"
        >
          <text class="delivery-way-icon">🚚</text>
          <view class="delivery-way-info">
            <text class="delivery-way-name">商家配送</text>
            <text class="delivery-way-desc">商品将配送到您选择的收货地址</text>
          </view>
          <text class="delivery-way-radio">{{ deliveryWay === 'platform' ? '●' : '○' }}</text>
        </view>
        <view 
          class="delivery-way-option"
          :class="{ active: deliveryWay === 'pickup' }"
          @tap="selectDeliveryWay('pickup')"
        >
          <text class="delivery-way-icon">📦</text>
          <view class="delivery-way-info">
            <text class="delivery-way-name">自提</text>
            <text class="delivery-way-desc">到店自提，无需配送</text>
          </view>
          <text class="delivery-way-radio">{{ deliveryWay === 'pickup' ? '●' : '○' }}</text>
        </view>
      </view>
    </view>

		<!-- 优惠券（普通 / 会员商品通用，根据券类型和范围判断） -->
		<view class="coupon-section">
			<view class="section-header">
				<text class="section-title">优惠券</text>
				<text class="available-points">共有 {{ availableCoupons.length }} 张可用</text>
			</view>

      <view class="auto-coupon-info">
        <text class="info-text">已选择 {{ effectiveCouponUseCount }} 张1元券</text>
        <text class="info-desc">抵扣 ¥{{ couponDiscount }}</text>
        <text class="info-tip">（优先使用即将过期的券）</text>
      </view>
    </view>
	
	<view class="coupon-slider-row" v-if="availableCount > 0">
	  <text class="slider-label">使用张数：{{ effectiveCouponUseCount }} / {{ availableCount }}</text>
	  <slider 
	    class="coupon-slider"
	    :value="effectiveCouponUseCount"
	    :min="0"
	    :max="availableCount"
	    step="1"
	    activeColor="#ff9800"
	    @change="onCouponCountChange"
	  />
	</view>
    <!-- 无可用优惠券时的提示 -->
    <view class="coupon-section" v-else-if="!hasCashOnlyProduct && availableCoupons.length === 0">
      <view class="section-header">
        <text class="section-title">优惠券</text>
        <text class="available-points">暂无可用</text>
      </view>
      <view class="no-coupons">
        <text class="no-coupons-text">暂无可用优惠券，可先到“我的→我的优惠券”领取</text>
      </view>
    </view>

    <!-- 价格明细 -->
    <view class="price-detail">
      <view class="detail-row">
        <text class="detail-label">商品金额</text>
        <text class="detail-value">¥{{ formatAmount(productTotal) }}</text>
      </view>
      <view v-if="canUsePoints && pointsToUse > 0" class="detail-row discount">
        <text class="detail-label">积分抵扣</text>
        <text class="detail-value">-¥{{ formatAmount(pointsDiscount) }}</text>
      </view>
      <view class="detail-row total">
        <text class="detail-label">实际支付</text>
        <text class="detail-value price">¥{{ formatAmount(actualAmount) }}</text>
      </view>
      <view class="charity-row">
        <view class="charity-left">
          <text class="charity-icon iconfont icon-xihuan"></text>
          <text class="charity-label">公益贡献</text>
        </view>
        <text class="charity-value">¥{{ formatAmount(charityAmount) }}</text>
      </view>
      <view class="charity-tip">
        <text class="tip-text">本订单将有 ¥{{ formatAmount(charityAmount) }} 用于公益事业，让爱心传递</text>
      </view>
      <view class="earn-points-row">
        <text class="earn-label">本次可获得积分</text>
        <text class="earn-value">+{{ formatAmount(actualAmount) }}分</text>
      </view>
    </view>

    <!-- 提交订单按钮 -->
    <view class="submit-bar">
      <view class="total-info">
        <text class="total-label">实付</text>
        <text class="total-price">¥{{ formatAmount(actualAmount) }}</text>
      </view>
      <button 
        class="submit-btn" 
        :class="{ 'btn-free': isFreeOrder }"
        :disabled="loadingCoupons"
        @click="handleSubmit"
      >
        {{ isFreeOrder ? '免费领取' : '提交订单' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { calculateCharityFromTotalMinusPoints } from '../../config/charity.js'
import { ensureMerchantOrder, evaluateDeliveryForAddress } from '../../utils/merchant.js'
import { getMyCoupons } from '@/api/coupon.js'
import { createOrder } from '@/api/order.js'
import { addLocalMessage } from '@/api/message.js'
import { getAddressList } from '@/api/user.js'
import { setStorage, removeStorage } from '@/utils/storage.js'
import { getPointsBalance } from '@/api/points.js'
import { getStoredNumericUserId } from '@/utils/userInfo.js'

const formatAmount = (val) => {
  return Number(val || 0).toFixed(4)
}

// 保留4位小数的数值（用于积分、金额计算）
const roundTo4 = (val) => Number((Number(val || 0)).toFixed(4))

/** 从接口原始记录解析面额（元），避免只用 amount 漏掉 face_value 等字段 */
const parseCouponAmountYuan = (raw) => {
	if (!raw || typeof raw !== 'object') return null
	const tpl = raw.template && typeof raw.template === 'object' ? raw.template : null
	const v =
		raw.amount ??
		raw.face_value ??
		raw.faceValue ??
		raw.coupon_amount ??
		raw.couponAmount ??
		raw.value ??
		(tpl && (tpl.amount ?? tpl.face_value ?? tpl.faceValue ?? tpl.value))
	if (v === '' || v == null) return null
	const n = Number(v)
	return Number.isFinite(n) ? n : null
}

/** 是否视为 1 元券（兼容浮点误差，如 0.999999） */
const isOneYuanAmount = (amountYuan) => {
	const x = Number(amountYuan)
	if (!Number.isFinite(x)) return false
	if (Math.abs(x - 1) < 1e-6) return true
	return Math.round(x * 100) / 100 === 1
}

const isCouponUnused = (status) => String(status || '').toLowerCase() === 'unused'

/**
 * 格式化规格信息
 */
const formatSpecifications = (specifications) => {
  if (!specifications || typeof specifications !== 'object') return ''
  const specArray = Object.keys(specifications)
    .map(key => {
      const value = specifications[key]
      if (value !== null && value !== undefined && value !== '') {
        return `${key}：${value}`
      }
      return null
    })
    .filter(Boolean)
  return specArray.join('；')
}

// 用户积分
const userPoints = ref(0)

// 订单商品
const orderItems = ref([])


// 订单来源
const orderSource = ref('direct')

// 收货地址
const selectedAddress = ref(null)

// 配送方式
const deliveryWay = ref('platform')

// 优惠券相关变量
const availableCoupons = ref([])
// 用户选择的优惠券张数（默认使用全部可用）
const selectedCouponCount = ref(0)
const loadingCoupons = ref(true)   // 优惠券数据是否正在加载
// 配送费（目前为0）
const deliveryFee = ref(0)
const pointsToUse = ref(0)
const deliveryInfo = ref({
  allowed: true,
  reason: '',
  fee: 0,
  distance: 0
})

// 商品总金额
const productTotal = computed(() => {
  return orderItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
})

// 订单总金额（商品 + 配送费）
const originalAmount = computed(() => productTotal.value + deliveryFee.value)

// 订单中是否含「仅现金」商品（cash_only 为 1 或 '1'）
const hasCashOnlyProduct = computed(() => {
  return orderItems.value.some(item => item.cash_only == 1)
})

// 是否存在至少一个“可使用积分”的普通商品
const canUsePoints = computed(() => {
	return orderItems.value.some(item => !(item.isVip || item.productType === 'vip'))
})

// 最大可抵扣积分
// 规则：会员商品不可抵扣；普通商品使用商品接口的 max_points_discount 参数，按单件 max_points_discount×数量汇总，再受订单金额50%与用户积分上限约束
const maxPointsDiscount = computed(() => {
	// 先按商品汇总可抵扣金额
	const productCap = orderItems.value.reduce((sum, item) => {
		const isVipProduct = item.isVip || item.productType === 'vip'
		if (isVipProduct) return sum

    const quantity = item.quantity || 1
    const price = item.price || 0
    const itemAmount = price * quantity

		// 单件抵扣上限：优先使用商品接口的 max_points_discount 参数
		// 支持两种字段名：max_points_discount（后端接口字段）或 maxPointsDeduction（前端转换后的字段）
		let perItemCap = 0
		
		// 优先使用后端接口的 max_points_discount 字段（即使为0也要使用，0表示不限制）
		if (typeof item.max_points_discount === 'number') {
			perItemCap = item.max_points_discount
			console.log(`[积分抵扣] 商品 ${item.name} 使用 max_points_discount:`, perItemCap)
		} else if (typeof item.maxPointsDeduction === 'number') {
			// 兼容前端转换后的 maxPointsDeduction 字段
			perItemCap = item.maxPointsDeduction
			console.log(`[积分抵扣] 商品 ${item.name} 使用 maxPointsDeduction:`, perItemCap)
		} else {
			console.warn(`[积分抵扣] 商品 ${item.name} 没有积分抵扣上限字段，使用价格作为上限`)
		}
		
		// 如果 max_points_discount 为 0 或未设置，则不限制（以单价为上限）
		if (perItemCap <= 0) {
			perItemCap = price
			console.log(`[积分抵扣] 商品 ${item.name} 抵扣上限为0或未设置，使用价格作为上限:`, perItemCap)
		}

		// 单件抵扣上限不能超过单价
		perItemCap = Math.min(perItemCap, price)
		
		// 该商品的总抵扣上限 = 单件抵扣上限 × 数量（不超过商品总价）
		const totalCap = Math.min(itemAmount, perItemCap * quantity)
		
		console.log(`[积分抵扣] 商品 ${item.name} 计算详情:`, {
			'单价': price,
			'数量': quantity,
			'商品总价': itemAmount,
			'单件抵扣上限': perItemCap,
			'总抵扣上限': totalCap,
			'max_points_discount原始值': item.max_points_discount,
			'maxPointsDeduction原始值': item.maxPointsDeduction
		})
		
		return sum + totalCap
	}, 0)

	// 订单总金额的50%限制（仅作为最终上限，不覆盖商品设置）；精确到4位小数，避免 0.01 元订单无法抵扣
	const orderHalf = roundTo4(originalAmount.value * 0.5)
	
	console.log(`[积分抵扣] 汇总计算:`, {
		'商品抵扣上限汇总': productCap,
		'订单金额50%': orderHalf,
		'订单总金额': originalAmount.value,
		'用户积分': userPoints.value
	})
	
	// 最终限制：商品设置的抵扣上限优先，订单金额50%仅作为最终上限
	let finalLimit = productCap
	if (productCap > 0) {
		finalLimit = roundTo4(Math.min(productCap, orderHalf))
		console.log(`[积分抵扣] 商品设置了抵扣上限，使用商品设置的值（受订单50%限制）:`, finalLimit)
	} else {
		finalLimit = orderHalf
		console.log(`[积分抵扣] 商品未设置抵扣上限，使用订单金额50%:`, finalLimit)
	}
	
	// 最终可抵扣积分：取用户积分和最终限制的最小值，精确到4位小数（不再使用 Math.floor，否则 0.01 会变成 0）
	const result = roundTo4(Math.min(userPoints.value, finalLimit))
	console.log(`[积分抵扣] 最终限制:`, {
		'商品抵扣上限': productCap,
		'订单50%限制': orderHalf,
		'最终限制': finalLimit,
		'用户积分': userPoints.value,
		'最终结果': result
	})
	return Math.max(0, result)
})

// 积分抵扣金额（元）：无可用积分商品时不计入，避免残留 pointsToUse 仍写入请求、压低一元券张数上限
const pointsDiscount = computed(() => (canUsePoints.value ? pointsToUse.value : 0))

/** 将「使用积分」限制在 [0, min(用户积分, 规则上限)] */
const clampPointsToUse = (raw) => {
	const max = maxPointsDiscount.value
	if (max <= 0) return 0
	const n = roundTo4(Number(raw) || 0)
	return roundTo4(Math.max(0, Math.min(n, max)))
}

const onSliderChange = (e) => {
	const v = e?.detail?.value
	pointsToUse.value = clampPointsToUse(v)
}

const onPointsInput = (e) => {
	const raw = e?.detail?.value ?? e?.target?.value ?? ''
	const s = String(raw).trim()
	if (s === '' || s === '.') {
		pointsToUse.value = 0
		return
	}
	const n = parseFloat(s)
	if (Number.isNaN(n)) {
		pointsToUse.value = 0
		return
	}
	pointsToUse.value = clampPointsToUse(n)
}

const useMaxPoints = () => {
	pointsToUse.value = clampPointsToUse(maxPointsDiscount.value)
}

watch(maxPointsDiscount, (maxVal) => {
	if (pointsToUse.value > maxVal) {
		pointsToUse.value = roundTo4(Math.max(0, maxVal))
	}
})

// 整单无可用积分的商品（如全是会员商品）时，禁止使用积分抵扣，并清空已填写的积分（避免隐藏区仍向后端传值）
watch(canUsePoints, (ok) => {
	if (!ok) pointsToUse.value = 0
})

// 可用的 1 元券（按过期时间升序；同一 id 只保留一条，避免 coupon_ids 重复）
const availableOneYuanCoupons = computed(() => {
  const filtered = availableCoupons.value
    .filter((coupon) => isOneYuanAmount(coupon.amount) && isCouponUnused(coupon.status))
    .sort((a, b) => new Date(a.validTo) - new Date(b.validTo))
  const seen = new Set()
  const unique = []
  for (const c of filtered) {
    if (c.id == null || seen.has(c.id)) continue
    seen.add(c.id)
    unique.push(c)
  }
  if (filtered.length !== unique.length) {
    console.warn('[优惠券] 1元券列表存在重复 id，已去重:', { raw: filtered.length, unique: unique.length })
  }
  return unique
})

// 最大可使用张数（由商品原价-积分抵扣 向上取整）
const maxUsableCount = computed(() => {
  const value = Math.ceil(Math.max(0, productTotal.value - pointsDiscount.value))
  console.log('maxUsableCount:', { productTotal: productTotal.value, pointsDiscount: pointsDiscount.value, result: value })
  return value
})

// 实际可使用的张数（受库存和抵扣上限限制）
const availableCount = computed(() => {
  const oneYuanCount = availableOneYuanCoupons.value.length
  const maxUsable = maxUsableCount.value
  const count = Math.min(oneYuanCount, maxUsable)
  console.log('availableCount:', { oneYuanCount, maxUsable, count })
  return count
})

// ========== 优惠券新逻辑 ==========
// 实际参与组单的张数：必须与 coupon_ids 长度一致（每张 1 元）。
// 若 selectedCouponCount 大于「当前加载到的 1 元券张数」或大于 availableCount，
// 仅用 slice 会导致请求里 id 变少、但 couponDiscount 仍按旧张数算，与后端反馈的现象一致。
const effectiveCouponUseCount = computed(() => {
  const cap = availableCount.value
  const raw = Number(selectedCouponCount.value) || 0
  if (!Number.isFinite(cap) || cap <= 0) return 0
  return Math.max(0, Math.min(raw, cap))
})

// 自动选中的优惠券 ID（取前 effectiveCouponUseCount 张；1 元券列表已按 id 去重）
const selectedCouponIds = computed(() => {
  return availableOneYuanCoupons.value.slice(0, effectiveCouponUseCount.value).map((c) => c.id)
})

// 优惠券总抵扣金额（每张 1 元）：与 coupon_ids 长度严格一致
const couponDiscount = computed(() => selectedCouponIds.value.length)
// 实际支付金额
const actualAmount = computed(() => {
  return Math.max(0, originalAmount.value - pointsDiscount.value - couponDiscount.value)
})

// 是否为0元订单
const isFreeOrder = computed(() => actualAmount.value <= 0)

// 公益贡献金额
// 公益 = (总价券前含运费 - 积分抵扣) × 1%，与优惠券抵扣无关
const charityAmount = computed(() => {
  return calculateCharityFromTotalMinusPoints(originalAmount.value, pointsDiscount.value)
})
// =================================

// 加载可用优惠券
const loadAvailableCoupons = async () => {
  loadingCoupons.value = true
  
  try {
    const userInfo = uni.getStorageSync('userInfo') || {}
    const userId = getStoredNumericUserId(userInfo)

    if (!Number.isFinite(userId) || userId <= 0) {
      console.error('用户未登录或用户ID无效')
      availableCoupons.value = []
      return
    }

    // ========== 分页循环加载开始 ==========
    let page = 1
    const pageSize = 100        // 每页条数
    const maxPages = 100        // 最多加载100页（10000张兜底）
    let allCoupons = []
    let hasMore = true
    
    while (hasMore && page <= maxPages) {
      const res = await getMyCoupons({
        user_id: userId,
        status: 'unused',
        page: page,
        page_size: pageSize
      })
      
      const list = res.data?.coupons || res.coupons || []
      
      if (!Array.isArray(list) || list.length === 0) {
        hasMore = false
        break
      }
      
      allCoupons = allCoupons.concat(list)
      
      // 如果返回数量小于pageSize，说明没有更多数据了
      if (list.length < pageSize) {
        hasMore = false
      } else {
        page++
      }
    }
    
    console.log(`[优惠券] 分页合并原始条数 ${allCoupons.length}（${page} 页）`)

    // 分页/接口可能重复返回同一券 id，先去重再参与「张数」与 coupon_ids，避免与后端按唯一 id 核销不一致
    const byId = new Map()
    for (const c of allCoupons) {
      if (!c || c.id == null) continue
      if (!byId.has(c.id)) byId.set(c.id, c)
    }
    allCoupons = Array.from(byId.values())

    console.log(`[优惠券] 去重后条数 ${allCoupons.length}`)
    // ========== 分页循环加载结束 ==========

    const now = Date.now()

    // 过滤出未使用且未过期的优惠券（分页合并结果为 allCoupons）
    availableCoupons.value = allCoupons
      .filter((c) => {
        if (!isCouponUnused(c.status)) return false

        const validTo = c.valid_to || c.validTo
        if (validTo) {
          const validToTime = new Date(validTo).getTime()
          if (validToTime < now) return false
        }

        return true
      })
      .map((c) => {
        const amountYuan = parseCouponAmountYuan(c)
        return {
          id: c.id,
          name: c.name || `优惠券`,
          useScope: c.use_scope || c.useScope || 'all',
          applicable_product_type: c.applicable_product_type || c.applicableProductType || 'all',
          amount: amountYuan != null ? amountYuan : 0,
          minSpend: c.min_spend || c.minSpend || 0,
          validTo: c.valid_to || c.validTo,
          status: c.status
        }
      })

    console.log('可用优惠券数量:', availableCoupons.value.length)
  } catch (error) {
    console.error('加载优惠券失败', error)
    availableCoupons.value = []
  } finally {
    loadingCoupons.value = false
    nextTick(() => {
      const cap = availableCount.value
      if (Number.isFinite(cap) && selectedCouponCount.value > cap) {
        selectedCouponCount.value = cap
      }
    })
  }
}

// 优惠券是否适用于当前订单
const isCouponValidForOrder = (coupon) => {
	// 检查订单商品类型
	const hasVipProduct = orderItems.value.some(item => 
		item.isVip === true || 
		item.is_vip === true || 
		item.productType === 'vip' || 
		item.product_type === 'vip'
	)
	const hasNormalProduct = orderItems.value.some(item => 
		!(item.isVip === true || 
		item.is_vip === true || 
		item.productType === 'vip' || 
		item.product_type === 'vip')
	)
	
	// 根据 applicable_product_type 判断是否可用
	const applicableType = coupon.applicable_product_type || coupon.applicableProductType || 'all'
	if (applicableType === 'normal_only') {
		// 只能用于普通商品，订单中不能有会员商品
		if (hasVipProduct) {
			return false
		}
	} else if (applicableType === 'member_only') {
		// 只能用于会员商品，订单中必须有会员商品
		if (!hasVipProduct) {
			return false
		}
	}
	// 'all' 可以用于所有商品，不需要额外检查
	
	// 兼容旧的 useScope 字段（如果 applicable_product_type 不存在）
	let baseAmount = 0
	if (coupon.useScope === 'vip_only') {
		baseAmount = orderItems.value
			.filter(item => item.isVip || item.productType === 'vip')
			.reduce((sum, item) => sum + item.price * item.quantity, 0)
	} else if (coupon.useScope === 'normal_only') {
		baseAmount = orderItems.value
			.filter(item => !(item.isVip || item.productType === 'vip'))
			.reduce((sum, item) => sum + item.price * item.quantity, 0)
	} else {
		baseAmount = productTotal.value
	}
	
	// 检查是否满足最低消费条件
	if (coupon.minSpend > 0 && baseAmount < coupon.minSpend) {
		return false
	}
	// 必须有商品才能使用
	return baseAmount > 0
}

// 优惠券张数滑块变化
const onCouponCountChange = (e) => {
  selectedCouponCount.value = e.detail.value
}

// 重新拉券（如 onShow）后可用张数变少时，把滑块记忆值压回上限，避免「显示/本地状态」长期大于真实可组单张数
watch(availableCount, (cap) => {
  if (!Number.isFinite(cap) || cap < 0) return
  if (selectedCouponCount.value > cap) {
    selectedCouponCount.value = cap
  }
})
const handleSubmit = () => {
  console.log('[点击] isFreeOrder:', isFreeOrder.value, 'selectedCouponCount:', selectedCouponCount.value, 'actualAmount:', actualAmount.value)
  if (isFreeOrder.value) {
    submitFreeOrder()
  } else {
    submitOrder()
  }
}
// 选择收货地址
const selectAddress = () => {
  uni.navigateTo({
    url: '/subPackages/page2/pages/address/list?mode=select'
  })
}

// 加载收货地址
const loadAddress = async () => {
  try {
    const res = await getAddressList()
    let addresses = []
    if (Array.isArray(res)) {
      addresses = res
    } else if (res.rows && Array.isArray(res.rows)) {
      addresses = res.rows
    } else if (res.data && Array.isArray(res.data)) {
      addresses = res.data
    } else if (res.items && Array.isArray(res.items)) {
      addresses = res.items
    } else if (res.addresses && Array.isArray(res.addresses)) {
      addresses = res.addresses
    }

    if (addresses.length > 0) {
      const formattedAddresses = addresses.map(addr => ({
        ...addr,
        id: addr.id || addr.addr_id || addr.address_id,
        addr_id: addr.addr_id || addr.id || addr.address_id,
        phone: addr.phone || addr.mobile,
        isDefault: addr.is_default || addr.isDefault || false,
        fullAddress: addr.fullAddress || `${addr.province || ''}${addr.city || ''}${addr.district || ''}${addr.detail || ''}`
      }))

      setStorage('addressList', formattedAddresses)

      if (!selectedAddress.value) {
        const defaultAddr = formattedAddresses.find(addr => addr.isDefault || addr.is_default)
        selectedAddress.value = defaultAddr || formattedAddresses[0]
      } else {
        const found = formattedAddresses.find(addr => 
          addr.id === selectedAddress.value.id || 
          addr.addr_id === selectedAddress.value.id ||
          addr.addr_id === selectedAddress.value.addr_id ||
          addr.id === selectedAddress.value.addr_id ||
          (addr.mobile === selectedAddress.value.mobile && addr.phone === selectedAddress.value.phone)
        )
        if (!found) {
          const defaultAddr = formattedAddresses.find(addr => addr.isDefault || addr.is_default)
          selectedAddress.value = defaultAddr || formattedAddresses[0]
          uni.showToast({ title: '原地址已删除，已自动选择新地址', icon: 'none', duration: 2000 })
        } else {
          selectedAddress.value = found
        }
      }
    } else {
      removeStorage('addressList')
      selectedAddress.value = null
    }
  } catch (error) {
    console.error('[订单确认] 加载地址失败:', error)
    removeStorage('addressList')
    selectedAddress.value = null
  }
}

// 选择配送方式
const selectDeliveryWay = (way) => {
  deliveryWay.value = way
  if (way === 'pickup') {
    deliveryFee.value = 0
    deliveryInfo.value = { allowed: true, reason: '', fee: 0, distance: 0 }
  } else {
    refreshDeliveryStatus()
  }
}

const refreshDeliveryStatus = () => {
  if (!selectedAddress.value) {
    deliveryInfo.value = { allowed: false, reason: '请选择收货地址', fee: 0, distance: 0 }
    deliveryFee.value = 0
    return
  }
  const info = evaluateDeliveryForAddress(selectedAddress.value, productTotal.value)
  deliveryInfo.value = info
  deliveryFee.value = 0 // 包邮
}

watch([selectedAddress, productTotal], () => {
  refreshDeliveryStatus()
}, { immediate: true })

// 错误信息处理
const getOrderErrorTitle = (error) => {
  const msg = (error && (error.message || error.msg || error.detail)) || ''
  const s = typeof msg === 'string' ? msg : String(msg)
  if (/1452|foreign key|FOREIGN KEY|Cannot add or update a child row/i.test(s)) {
    return '当前登录信息与服务器不一致，请退出后重新登录再下单'
  }
  if (/InsufficientBalance/i.test(s)) return '余额不足或优惠券不可用，请检查后重试'
  if (/insufficient|不足/i.test(s)) return '余额或额度不足，请检查后重试'
  if (/Exception|Error|_init_|got an/i.test(s) && s.length > 30) return '服务暂时异常，请稍后重试'
  return (s && s.length <= 50) ? s : '订单创建失败，请稍后重试'
}

// 提交免费订单（零元订单）
const submitFreeOrder = async () => {
  // 👇 添加这几行
  console.log('[零元订单] 当前 selectedCouponIds:', selectedCouponIds.value)
  console.log('[零元订单] 当前 selectedCouponCount:', selectedCouponCount.value)
  console.log('[零元订单] 可用1元券列表:', availableOneYuanCoupons.value)
  console.log('[零元订单] productTotal:', productTotal.value)
  console.log('[零元订单] actualAmount:', actualAmount.value)
  if (!selectedAddress.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }
  if (canUsePoints.value && pointsToUse.value > userPoints.value) {
    uni.showToast({ title: '积分不足', icon: 'none' })
    return
  }

  uni.showLoading({ title: '提交中...' })

  try {
    try {
      const { refreshUserInfo } = await import('@/api/user.js')
      await refreshUserInfo()
    } catch (e) {
      console.warn('[零元订单] 同步用户信息失败，将使用本地缓存:', e)
    }

    const userInfo = uni.getStorageSync('userInfo') || {}
    const finalUserId = getStoredNumericUserId(userInfo)
    if (!Number.isFinite(finalUserId) || finalUserId <= 0) {
      uni.hideLoading()
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const addressId = selectedAddress.value?.id || selectedAddress.value?.addr_id || selectedAddress.value?.address_id
    if (!addressId) {
      uni.hideLoading()
      uni.showToast({ title: '地址ID无效', icon: 'none' })
      return
    }

    const finalAddressId = parseInt(String(addressId), 10)
    if (!Number.isFinite(finalAddressId) || finalAddressId <= 0) {
      uni.hideLoading()
      uni.showToast({ title: '地址ID无效', icon: 'none' })
      return
    }

    const customAddress = selectedAddress.value ? {
      name: selectedAddress.value.name || '',
      phone: selectedAddress.value.phone || selectedAddress.value.mobile || '',
      address: selectedAddress.value.fullAddress || `${selectedAddress.value.province || ''}${selectedAddress.value.city || ''}${selectedAddress.value.district || ''}${selectedAddress.value.detail || ''}`,
      province: selectedAddress.value.province || '',
      city: selectedAddress.value.city || '',
      district: selectedAddress.value.district || '',
      detail: selectedAddress.value.detail || '',
      additionalProp1: {}
    } : { additionalProp1: {} }

    const items = orderItems.value.map((item) => {
      const quantity = parseInt(item.quantity) || 1
      let specsValue = ''
      let skuValue = item.sku || item.sku_code || ''
      if (item.specifications && typeof item.specifications === 'object') {
        const specArray = Object.keys(item.specifications).map(key => {
          const value = item.specifications[key]
          if (value !== null && value !== undefined && value !== '') return `${key}：${value}`
          return null
        }).filter(Boolean)
        specsValue = specArray.join('；')
      } else if (item.specs && typeof item.specs === 'object') {
        const specArray = Object.keys(item.specs).map(key => {
          const value = item.specs[key]
          if (value !== null && value !== undefined && value !== '') return `${key}：${value}`
          return null
        }).filter(Boolean)
        specsValue = specArray.join('；')
      } else if (item.spec) {
        specsValue = item.spec
      }
      return {
        product_id: item.id,
        quantity: quantity,
        unit_price: parseFloat(item.price) || 0,
        specs: specsValue,
        sku: skuValue
      }
    })

    let orderRequestData = {}
    if (orderSource.value === 'direct') {
      const buyNowItems = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.unit_price,
        specs: item.specs || '',
        sku: item.sku || ''
      }))
      orderRequestData = {
        user_id: finalUserId,
        address_id: finalAddressId,
        custom_address: customAddress,
        buy_now: true,
        buy_now_items: buyNowItems,
        delivery_way: deliveryWay.value || 'platform',
        points_to_use: pointsDiscount.value,
        pointsDiscount: pointsDiscount.value,
        coupon_ids: selectedCouponIds.value,   // 改为 coupon_ids（下划线）
        actualAmount: 0,
        is_free_order: true
      }
    } else {
      orderRequestData = {
        user_id: finalUserId,
        address_id: finalAddressId,
        custom_address: customAddress,
        delivery_way: deliveryWay.value || 'platform',
        coupon_ids: selectedCouponIds.value,
        points_to_use: pointsDiscount.value,
        pointsDiscount: pointsDiscount.value,
        actualAmount: 0,
        is_free_order: true
      }
    }

	console.log('[submitFreeOrder] 即将发送的请求体:', JSON.stringify(orderRequestData, null, 2));
    const orderRes = await createOrder(orderRequestData)
    const orderData = orderRes.data || orderRes
    const apiOrderNo = orderData.orderNo || orderData.order_number || orderData.order_no
    const apiOrderId = orderData.id || orderData.orderId || orderData.order_id

    const finalOrderNo = apiOrderNo || `FREE${Date.now()}`
    const finalOrderId = apiOrderId || orderData.id || orderData.order_id || finalOrderNo

    const newOrder = {
      id: finalOrderId,
      orderNo: finalOrderNo,
      status: 'paid',
      totalAmount: originalAmount.value,
      productTotal: productTotal.value,
      actualAmount: 0,
      pointsUsed: pointsDiscount.value,
      pointsDiscount: pointsDiscount.value,
      couponDiscount: couponDiscount.value,
      couponIds: selectedCouponIds.value,
      earnPoints: 0,
      createTime: Date.now(),
      products: orderItems.value.map(item => ({
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        isVip: item.isVip,
        productType: item.productType,
        maxPointsDeduction: item.maxPointsDeduction
      })),
      address: selectedAddress.value,
      deliveryFee: deliveryFee.value,
      isFreeOrder: true
    }

    const storedOrders = uni.getStorageSync('orderList') || []
    storedOrders.unshift(newOrder)
    uni.setStorageSync('orderList', storedOrders)

    ensureMerchantOrder({
      id: finalOrderId,
      orderNo: apiOrderNo || newOrder.orderNo,
      status: 'paid',
      customerName: selectedAddress.value.name,
      customerPhone: selectedAddress.value.phone,
      totalAmount: originalAmount.value,
      productTotal: productTotal.value,
      actualAmount: 0,
      products: orderItems.value.map(item => ({ ...item })),
      address: selectedAddress.value,
      createTime: formatDateTime(Date.now()),
      distance: selectedAddress.value.distanceKm || 0,
      deliveryFee: deliveryFee.value,
      isFreeOrder: true
    })

    addLocalMessage({
      type: 'order',
      title: '免费订单领取成功',
      content: `您的免费订单【${apiOrderNo || newOrder.orderNo}】已成功领取`,
      orderId: finalOrderId,
      orderNo: apiOrderNo || newOrder.orderNo,
      amount: 0
    })

    uni.hideLoading()
    uni.showToast({ title: '领取成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({
        url: `/subPackages/page1/pages/order/detail?id=${finalOrderId}&orderNo=${encodeURIComponent(finalOrderNo)}&isFree=true`
      })
    }, 1500)

  } catch (error) {
    uni.hideLoading()
    console.error('创建免费订单失败:', error)
    uni.showToast({ title: getOrderErrorTitle(error), icon: 'none', duration: 3000 })
    setTimeout(() => {
      uni.navigateTo({ url: '/subPackages/page2/pages/order/list' })
    }, 2000)
  }
}

// 提交订单
const submitOrder = async () => {
  // 若优惠券数据还在加载，提示并返回
  if (loadingCoupons.value) {
    uni.showToast({ title: '数据加载中，请稍后再试', icon: 'none' })
    return
  }
  // 再次检查可用券数量（可选）
  if (availableCoupons.value.length === 0 && availableCount.value === 0) {
    // 若无券，直接继续（免费订单判断基于实际金额）
  }
  if (!deliveryInfo.value.allowed) {
    uni.showToast({ title: deliveryInfo.value.reason || '暂不支持该地址', icon: 'none' })
    return
  }
  if (!selectedAddress.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }
  if (canUsePoints.value && pointsToUse.value > userPoints.value) {
    uni.showToast({ title: '积分不足', icon: 'none' })
    return
  }

  const orderId = Date.now()
  const orderNo = 'ORDER' + orderId

  const newOrder = {
    id: orderId,
    orderNo: orderNo,
    status: 'pending',
    totalAmount: originalAmount.value,
    productTotal: productTotal.value,
    actualAmount: actualAmount.value,
    pointsUsed: pointsDiscount.value,
    pointsDiscount: pointsDiscount.value,
    couponDiscount: couponDiscount.value,
    couponIds: selectedCouponIds.value,
    earnPoints: Math.floor(actualAmount.value),
    createTime: Date.now(),
    products: orderItems.value.map(item => ({
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      isVip: item.isVip,
      productType: item.productType,
      maxPointsDeduction: item.maxPointsDeduction
    })),
    address: selectedAddress.value,
    deliveryFee: deliveryFee.value
  }

  const storedOrders = uni.getStorageSync('orderList') || []
  storedOrders.unshift(newOrder)
  uni.setStorageSync('orderList', storedOrders)

  addLocalMessage({
    type: 'order',
    title: '订单已提交',
    content: `您的订单【${orderNo}】已提交，请尽快完成支付`,
    orderId: orderId,
    orderNo: orderNo,
    amount: actualAmount.value
  })

  ensureMerchantOrder({
    id: orderId,
    orderNo,
    status: 'pending_payment',
    customerName: selectedAddress.value.name,
    customerPhone: selectedAddress.value.phone,
    totalAmount: originalAmount.value,
    productTotal: productTotal.value,
    actualAmount: actualAmount.value,
    products: orderItems.value.map(item => ({ ...item })),
    address: selectedAddress.value,
    createTime: formatDateTime(orderId),
    distance: selectedAddress.value.distanceKm || deliveryInfo.value.distance,
    deliveryFee: deliveryFee.value
  })

  const orderData = {
    items: orderItems.value,
    address: selectedAddress.value,
    productTotal: productTotal.value,
    deliveryFee: deliveryFee.value,
    originalAmount: originalAmount.value,
    points_to_use: pointsDiscount.value,
    pointsDiscount: pointsDiscount.value,
    couponDiscount: couponDiscount.value,
    couponIds: selectedCouponIds.value,
    actualAmount: actualAmount.value,
    earnPoints: Math.floor(actualAmount.value),
    hasVipProduct: orderItems.value.some(item => item.isVip || item.productType === 'vip')
  }

  const paymentData = {
    orderNo: orderNo,
    orderId: orderId,
    amount: actualAmount.value.toFixed(4),
    paymentMethod: 1,
    couponIds: selectedCouponIds.value,
    orderData: orderData
  }

  const userInfo = uni.getStorageSync('userInfo') || {}
  const finalUserIdPrecheck = getStoredNumericUserId(userInfo)
  if (!Number.isFinite(finalUserIdPrecheck) || finalUserIdPrecheck <= 0) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (!orderItems.value || orderItems.value.length === 0) {
    uni.showToast({ title: '购物车为空', icon: 'none' })
    return
  }

  const addressId = selectedAddress.value?.id || selectedAddress.value?.addr_id || selectedAddress.value?.address_id
  if (!addressId) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }

  uni.showLoading({ title: '提交中...' })

  try {
    const { refreshUserInfo } = await import('@/api/user.js')
    await refreshUserInfo()
  } catch (e) {
    console.warn('[订单确认] 下单前同步用户信息失败，将使用本地缓存:', e)
  }

  const userInfoSynced = uni.getStorageSync('userInfo') || {}
  const finalUserId = getStoredNumericUserId(userInfoSynced)
  const finalAddressId = parseInt(String(addressId), 10)

  if (!Number.isFinite(finalUserId) || finalUserId <= 0) {
    uni.hideLoading()
    uni.showToast({ title: '用户ID无效，请重新登录', icon: 'none' })
    return
  }
  if (!finalAddressId || finalAddressId === 0) {
    uni.hideLoading()
    uni.showToast({ title: '地址ID无效，请选择收货地址', icon: 'none' })
    return
  }

  const customAddress = selectedAddress.value ? {
    name: selectedAddress.value.name || '',
    phone: selectedAddress.value.phone || selectedAddress.value.mobile || '',
    address: selectedAddress.value.fullAddress || `${selectedAddress.value.province || ''}${selectedAddress.value.city || ''}${selectedAddress.value.district || ''}${selectedAddress.value.detail || ''}`,
    province: selectedAddress.value.province || '',
    city: selectedAddress.value.city || '',
    district: selectedAddress.value.district || '',
    detail: selectedAddress.value.detail || '',
    additionalProp1: {}
  } : { additionalProp1: {} }

  const address = selectedAddress.value ? {
    name: selectedAddress.value.name || '',
    phone: selectedAddress.value.phone || selectedAddress.value.mobile || '',
    address: selectedAddress.value.fullAddress || `${selectedAddress.value.province || ''}${selectedAddress.value.city || ''}${selectedAddress.value.district || ''}${selectedAddress.value.detail || ''}`
  } : {}

  const items = orderItems.value.map((item) => {
    const quantity = parseInt(item.quantity) || 1
    let specsValue = ''
    let skuValue = item.sku || item.sku_code || ''
    if (item.specifications && typeof item.specifications === 'object') {
      const specArray = Object.keys(item.specifications).map(key => {
        const value = item.specifications[key]
        if (value !== null && value !== undefined && value !== '') return `${key}：${value}`
        return null
      }).filter(Boolean)
      specsValue = specArray.join('；')
    } else if (item.specs && typeof item.specs === 'object') {
      const specArray = Object.keys(item.specs).map(key => {
        const value = item.specs[key]
        if (value !== null && value !== undefined && value !== '') return `${key}：${value}`
        return null
      }).filter(Boolean)
      specsValue = specArray.join('；')
    } else if (item.spec) {
      specsValue = item.spec
    }
    return {
      product_id: item.id,
      quantity: quantity,
      unit_price: parseFloat(item.price) || 0,
      specs: specsValue,
      sku: skuValue
    }
  })

  let orderRequestData = {}
  if (orderSource.value === 'direct') {
    const buyNowItems = items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.unit_price,
      specs: item.specs || '',
      sku: item.sku || ''
    }))
    orderRequestData = {
      user_id: finalUserId,
      address_id: finalAddressId,
      custom_address: customAddress,
      buy_now: true,
      buy_now_items: buyNowItems,
      delivery_way: deliveryWay.value,
      points_to_use: pointsDiscount.value,
      pointsDiscount: pointsDiscount.value,
      coupon_ids: selectedCouponIds.value,
      actualAmount: actualAmount.value
    }
  } else {
    orderRequestData = {
      user_id: finalUserId,
      address_id: finalAddressId,
      custom_address: customAddress,
      delivery_way: deliveryWay.value,
      coupon_ids: selectedCouponIds.value,
      points_to_use: pointsDiscount.value,
      pointsDiscount: pointsDiscount.value,
      actualAmount: actualAmount.value
    }
  }

  createOrder(orderRequestData)
    .then(async (orderRes) => {
      const orderDataRes = orderRes.data || orderRes
      const apiOrderNo = orderDataRes.orderNo || orderDataRes.order_number || orderDataRes.order_no
      const apiOrderId = orderDataRes.id || orderDataRes.orderId || orderDataRes.order_id

      if (apiOrderNo) paymentData.orderNo = apiOrderNo
      if (apiOrderId) paymentData.orderId = apiOrderId
      else if (orderId) paymentData.orderId = orderId

      uni.hideLoading()
      uni.navigateTo({
        url: `/page1/payment/payment?data=${encodeURIComponent(JSON.stringify(paymentData))}`
      })
    })
    .catch((error) => {
      console.error('创建订单失败:', error)
      uni.hideLoading()
      uni.showToast({ title: getOrderErrorTitle(error), icon: 'none', duration: 3000 })
    })
}

onLoad(async (options) => {
	console.log('订单确认页 - 接收到的参数:', options)

	// 新进入结算页时清零，避免上一笔订单残留的积分/券张数影响本单（页面实例复用或仅触发 onShow 时尤为明显）
	pointsToUse.value = 0
	selectedCouponCount.value = 0

	// 判断订单来源
		if (options.data) {
		// 从URL参数获取订单数据（直接购买）
			try {
				const data = JSON.parse(decodeURIComponent(options.data))
				console.log('解析后的订单数据:', data)
				
				// 判断订单来源：如果有 source 字段，使用它；否则根据是否有 cart_id 判断
				if (data.source) {
					orderSource.value = data.source
				} else if (data.items && data.items.some(item => item.cart_id || item.cartId)) {
					// 如果商品有 cart_id，说明来自购物车
					orderSource.value = 'cart'
				} else {
					// 默认是直接购买
					orderSource.value = 'direct'
				}
				
				console.log('订单来源:', orderSource.value)
				
			if (data.items && data.items.length > 0) {
				// ========== 检查点2：订单确认页 - 接收到的原始数据 ==========
				console.log('========== [检查点2] 订单确认页 - 接收数据 ==========')
				console.log('[检查点2] 接收到的 data.items 数组长度:', data.items.length)
				console.log('[检查点2] 接收到的 data.items 原始数据:', JSON.stringify(data.items, null, 2))
				data.items.forEach((item, index) => {
					console.log(`[检查点2] 商品 ${index + 1}:`, {
						商品ID: item.id || item.product_id,
						商品名称: item.name,
						原始数量: item.quantity,
						数量类型: typeof item.quantity,
						parseInt后: parseInt(item.quantity) || 1
					})
				})
				
				// 确保数量是整数，并去重相同商品
				const processedItems = []
				const itemMap = new Map()
				
				data.items.forEach((item, index) => {
					const productId = item.id || item.product_id
					const quantity = parseInt(item.quantity) || 1
					
					console.log(`[检查点2] 处理商品 ${index + 1}:`, {
						商品ID: productId,
						原始数量: item.quantity,
						处理后数量: quantity,
						是否已存在: itemMap.has(productId)
					})
					
					// 如果已存在相同商品，合并数量（理论上不应该发生，但为了安全）
					if (itemMap.has(productId)) {
						const existingItem = itemMap.get(productId)
						const oldQuantity = parseInt(existingItem.quantity)
						existingItem.quantity = oldQuantity + quantity
						console.warn('========== [检查点2] ⚠️ 发现重复商品，合并数量 ==========')
						console.warn('[检查点2] 商品ID:', productId)
						console.warn('[检查点2] 原数量:', oldQuantity)
						console.warn('[检查点2] 新增数量:', quantity)
						console.warn('[检查点2] 合并后数量:', existingItem.quantity)
						console.warn('========== [检查点2] 重复商品警告结束 ==========')
					} else {
						const processedItem = {
							...item,
							quantity: quantity // 确保数量是整数
						}
						itemMap.set(productId, processedItem)
						processedItems.push(processedItem)
					}
				})
				
				orderItems.value = processedItems
				console.log('[检查点2] 处理后的订单商品数量:', orderItems.value.length)
				console.log('[检查点2] 处理后的订单商品:', orderItems.value.map(item => ({
					商品ID: item.id || item.product_id,
					商品名称: item.name,
					数量: item.quantity,
					价格: item.price
				})))
				console.log('========== [检查点2] 结束 ==========')
					
					// 调试：检查每个商品的积分抵扣上限
					orderItems.value.forEach((item, index) => {
						console.log(`订单商品 ${index + 1} 积分抵扣信息:`, {
							商品名称: item.name,
							max_points_discount: item.max_points_discount,
							maxPointsDeduction: item.maxPointsDeduction,
							价格: item.price,
							数量: item.quantity,
							是否会员商品: item.isVip || item.productType === 'vip'
						})
					})
				} else {
					console.warn('订单数据中没有商品')
				orderItems.value = []
				}
			} catch (error) {
				console.error('解析订单数据失败', error)
				orderItems.value = []
			}
		} else {
			console.warn('没有接收到订单数据')
			orderItems.value = []
		}
	
	// 加载用户积分余额
	loadUserPoints()
	
	// 加载收货地址
	loadAddress()
	
	// 加载可用优惠券
	loadAvailableCoupons()
	
	// 输出计算结果用于调试
	console.log('商品总金额:', productTotal.value)
	console.log('配送费:', deliveryFee.value)
	console.log('订单总金额:', originalAmount.value)
})

const formatDateTime = (timestamp) => {
	const date = new Date(timestamp)
	const pad = (num) => String(num).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 加载用户积分余额
 */
const loadUserPoints = async () => {
	try {
		const res = await getPointsBalance()
		console.log('[订单确认] 积分余额API响应:', res)
		
		// 解析积分余额
		let points = 0
		if (res.data && typeof res.data === 'object') {
			points = Number(res.data.member_points || 0)
		} else if (res.member_points !== undefined) {
			points = Number(res.member_points || 0)
		}
		
		userPoints.value = roundTo4(points)
		console.log('[订单确认] 用户积分余额:', userPoints.value)
		
		// 如果积分为0，确保滑块在最左边
		if (points === 0) {
			pointsToUse.value = 0
		}
		
		// 更新本地存储
		const userInfo = uni.getStorageSync('userInfo') || {}
		userInfo.points = points
		uni.setStorageSync('userInfo', userInfo)
	} catch (error) {
		console.error('[订单确认] 加载积分余额失败:', error)
		// 如果API失败，尝试从本地存储获取
		const userInfo = uni.getStorageSync('userInfo') || {}
		if (userInfo.points !== undefined) {
			const localPoints = Number(userInfo.points || 0)
			userPoints.value = localPoints
			// 如果积分为0，确保滑块在最左边
			if (localPoints === 0) {
				pointsToUse.value = 0
			}
		}
	}
}

// 页面显示时刷新地址列表和优惠券
onShow(() => {
  loadAddress()
  loadAvailableCoupons()
  loadUserPoints()
})
</script>

<style scoped>
.confirm-page {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: 120rpx;
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
}

/* 收货地址 */
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

.default-badge {
	background: #ff4757;
	color: white;
	font-size: 20rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.address-detail {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
}

.no-address {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.no-address-icon {
	font-size: 32rpx;
}

.no-address-text {
	font-size: 28rpx;
	color: #999;
}

.address-arrow {
	font-size: 24rpx;
	color: #ccc;
}

.products-section {
	background: white;
	padding: 30rpx;
	margin-bottom: 20rpx;
}

.product-item {
	display: flex;
	gap: 20rpx;
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
	margin-bottom: 20rpx;
}

.product-item:last-child {
	margin-bottom: 0;
}

.product-image {
	width: 120rpx;
	height: 120rpx;
	border-radius: 12rpx;
	flex-shrink: 0;
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
	font-weight: 600;
	line-height: 1.4;
	margin-bottom: 8rpx;
}

.vip-badge {
	display: inline-block;
	background: linear-gradient(135deg, #ffd700, #ffed4e);
	color: #8b4513;
	font-size: 20rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	margin-bottom: 8rpx;
	width: fit-content;
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
	align-self: flex-end;
}

/* 配送方式选择 */
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

/* 积分抵扣区域 */
.points-section {
	background: white;
	padding: 30rpx;
	margin-bottom: 20rpx;
}

/* 优惠券区域 */
.coupon-section {
	background: #fff8e1;
	padding: 30rpx;
	margin-top: 20rpx;   /* 与积分区域拉开一点距离，整体下移 */
	margin-bottom: 20rpx;
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
	max-height: 360rpx;
}

.coupon-item {
	display: flex;
	background: white;
	margin-bottom: 16rpx;
	border-radius: 12rpx;
	overflow: hidden;
	border: 2rpx solid #f0f0f0;
}

.coupon-item.selected {
	border-color: #ff4757;
	background: #fff5f5;
}

.coupon-item.disabled {
	opacity: 0.5;
}

.coupon-left {
	width: 180rpx;
	background: linear-gradient(135deg, #ff4757, #ff6b6b);
	color: white;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	padding: 20rpx 0;
}

.coupon-value {
	font-size: 36rpx;
	font-weight: bold;
}

.coupon-condition {
	font-size: 22rpx;
	margin-top: 8rpx;
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
	margin-bottom: 8rpx;
}

.coupon-scope {
	font-size: 24rpx;
	color: #ff4757;
	margin-bottom: 6rpx;
}

.coupon-time {
	font-size: 22rpx;
	color: #999;
}

.no-coupons {
	text-align: center;
	padding: 40rpx 0;
}

.no-coupons-text {
	font-size: 26rpx;
	color: #999;
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

.available-points {
	font-size: 24rpx;
	color: #ff9800;
}

.points-input-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
	margin-bottom: 20rpx;
}

.input-label {
	font-size: 26rpx;
	color: #666;
}

.points-input {
	flex: 1;
	text-align: right;
	font-size: 32rpx;
	font-weight: bold;
	color: #ff9800;
}

.points-input:disabled {
	color: #ccc;
	opacity: 0.6;
}

.input-unit {
	font-size: 24rpx;
	color: #999;
}

.use-max-btn {
	padding: 8rpx 20rpx;
	background: #ff9800;
	color: white;
	font-size: 24rpx;
	border-radius: 20rpx;
	border: none;
	height: auto;
	line-height: 1.5;
}

.use-max-btn:disabled {
	background: #ccc;
	opacity: 0.6;
}

.points-slider {
	margin-bottom: 20rpx;
}

.points-tips {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.tip-item {
	font-size: 22rpx;
	color: #999;
}

/* 价格明细 */
.price-detail {
	background: white;
	padding: 30rpx;
	margin-bottom: 20rpx;
}

.delivery-warning {
	display: flex;
	align-items: center;
	gap: 12rpx;
	background: #fff4e5;
	border-radius: 12rpx;
	padding: 16rpx 20rpx;
	margin-bottom: 20rpx;
}

.warning-icon {
	font-size: 30rpx;
	color: #ff8a00;
}

.warning-text {
	font-size: 26rpx;
	color: #c86400;
}

.delivery-meta {
	display: flex;
	justify-content: space-between;
	font-size: 24rpx;
	color: #666;
	margin-bottom: 12rpx;
}

.meta-text {
	color: #333;
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

/* 公益贡献 */
.charity-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16rpx;
	background: linear-gradient(135deg, #fff5f5, #ffe5e5);
	border-radius: 8rpx;
	margin: 16rpx 0;
}

.charity-left {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.charity-icon {
	font-size: 28rpx;
	color: #ff4757 !important;
}

.charity-icon.iconfont {
	color: #ff4757 !important;
}

.charity-label {
	font-size: 26rpx;
	color: #ff6b6b;
	font-weight: 600;
}

.charity-value {
	font-size: 28rpx;
	color: #ff4757;
	font-weight: bold;
}

.charity-tip {
	padding: 12rpx 16rpx;
	background: linear-gradient(135deg, #fff9f9, #fff0f0);
	border-radius: 8rpx;
	margin-bottom: 16rpx;
}

.charity-tip .tip-text {
	font-size: 24rpx;
	color: #ff6b6b;
	line-height: 1.5;
}

.earn-points-row {
	display: flex;
	justify-content: space-between;
	padding: 16rpx;
	background: #fff3e0;
	margin: 0 -30rpx -30rpx;
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

/* 提交栏 */
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

.coupon-slider-row {
  margin-top: 20rpx;
  padding: 20rpx 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.slider-label {
  font-size: 26rpx;
  color: #666;
  width: 180rpx;
}
.coupon-slider {
  flex: 1;
}
</style>


