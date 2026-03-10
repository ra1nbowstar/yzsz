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
				<text class="available-points">可用 {{ formatAmount(userPoints) }} 积分</text>
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
				<text class="input-unit">分</text>
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
					:step="0.0001"
					activeColor="#ff9800"
					:disabled="userPoints === 0 || maxPointsDiscount === 0"
					@change="onSliderChange"
				/>
			</view>
			
			<view class="points-tips">
				<text class="tip-item">• 最多可抵扣 {{ formatAmount(maxPointsDiscount) }} 积分（受商品设置和订单金额限制）</text>
				<text class="tip-item">• 会员商品不可使用积分抵扣</text>
				<text class="tip-item">• 1积分 = 1元</text>
				<text class="tip-item">• 本次可获得 {{ formatAmount(actualAmount) }} 积分</text>
			</view>
		</view>

		<!-- 配送方式选择 - 0元订单时隐藏 -->
		<view class="delivery-way-section" v-if="!isFreeOrder">
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

			<view v-if="selectedCoupon" class="selected-coupon">
				<view class="selected-coupon-content">
					<text class="selected-coupon-name">已选：{{ selectedCoupon.name }}</text>
					<text class="selected-coupon-value">-¥{{ formatAmount(couponDiscount) }}</text>
				</view>
				<button class="cancel-coupon-btn" @tap="cancelCoupon">取消</button>
			</view>

			<scroll-view class="coupon-list" scroll-y>
				<view
					v-for="coupon in availableCoupons"
					:key="coupon.id"
					class="coupon-item"
					:class="{
						selected: selectedCoupon && selectedCoupon.id === coupon.id,
						disabled: !isCouponValidForOrder(coupon)
					}"
					@tap="isCouponValidForOrder(coupon) ? selectCoupon(coupon) : null"
				>
					<view class="coupon-left">
						<text class="coupon-value">¥{{ formatAmount(coupon.amount) }}</text>
						<text v-if="coupon.minSpend > 0" class="coupon-condition">满{{ coupon.minSpend }}可用</text>
					</view>
					<view class="coupon-right">
						<text class="coupon-name">{{ coupon.name }}</text>
						<text class="coupon-scope">
							{{ (() => {
								const applicableType = coupon.applicable_product_type || coupon.applicableProductType
								if (applicableType === 'normal_only') return '仅普通商品可用'
								if (applicableType === 'member_only') return '仅会员商品可用'
								// 兼容旧的 useScope 字段
								if (coupon.useScope === 'vip_only') return '仅会员商品可用'
								if (coupon.useScope === 'normal_only') return '仅普通商品可用'
								return '全场通用'
							})() }}
						</text>
						<text class="coupon-time">
							有效期至：
							{{ coupon.validTo ? new Date(coupon.validTo).toLocaleDateString() : '领取后一年' }}
						</text>
					</view>
				</view>
				<view v-if="!availableCoupons.length" class="no-coupons">
					<text class="no-coupons-text">暂无可用优惠券，可先到“我的→我的优惠券”领取</text>
				</view>
			</scroll-view>
		</view>

		<!-- 价格明细 -->
		<view class="price-detail">
			<!-- 包邮,不显示配送警告和配送信息 -->
			<!-- <view v-if="!deliveryInfo.allowed" class="delivery-warning">
				<text class="warning-icon">⚠️</text>
				<text class="warning-text">{{ deliveryInfo.reason }}</text>
			</view>
			<view v-else class="delivery-meta">
				<text class="meta-text">距离商家 {{ deliveryInfo.distance }}km</text>
				<text class="meta-text">配送费 ¥{{ formatAmount(deliveryInfo.fee) }}</text>
			</view> -->
			<view class="detail-row">
				<text class="detail-label">商品金额</text>
				<text class="detail-value">¥{{ formatAmount(productTotal) }}</text>
			</view>
			<!-- 包邮,不显示配送费 -->
			<!-- <view class="detail-row">
				<text class="detail-label">配送费</text>
				<text class="detail-value">¥{{ formatAmount(deliveryFee) }}</text>
			</view> -->
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
	        <!-- 删除免费订单标签 -->
	      </view>
	      <button 
	        class="submit-btn" 
	        :class="{ 'btn-free': isFreeOrder }"
	        @click="submitOrder"
	      >
	        {{ isFreeOrder ? '免费领取' : '提交订单' }}
	      </button>
	    </view>
	</view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { calculateCharityAmount } from '../../config/charity.js'
import { ensureMerchantOrder, evaluateDeliveryForAddress } from '../../utils/merchant.js'
import { mapCouponWithTemplate, getCouponStatusText } from '../../utils/coupon.js'
import { getMyCoupons, useCoupon } from '@/api/coupon.js'
import { createOrder } from '@/api/order.js'
import { addLocalMessage } from '@/api/message.js'
import { getAddressList } from '@/api/user.js'
import { setStorage, removeStorage } from '@/utils/storage.js'
import { getPointsBalance, updatePointsWithAutoMobile } from '@/api/points.js'
import { getCartList } from '../../api/cart.js'

const formatAmount = (val) => {
  return Number(val || 0).toFixed(4)
}

// 保留4位小数的数值（用于积分、金额计算，避免 Math.floor 导致 0.01 等小金额无法抵扣）
const roundTo4 = (val) => Number((Number(val || 0)).toFixed(4))

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

// 用户积分
const userPoints = ref(0)

// 订单商品
const orderItems = ref([])

// 订单来源：'direct' 直接购买，'cart' 购物车购买
const orderSource = ref('direct')

// 收货地址
const selectedAddress = ref(null)

// 配送方式：'platform' 商家配送，'pickup' 自提
const deliveryWay = ref('platform')

// 优惠券相关变量
const selectedCoupon = ref(null)
const availableCoupons = ref([])

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
	return orderItems.value.reduce((sum, item) => {
		return sum + item.price * item.quantity
	}, 0)
})

// 订单总金额（商品 + 配送费）
const originalAmount = computed(() => {
	return productTotal.value + deliveryFee.value
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

// 积分抵扣金额
const pointsDiscount = computed(() => {
	return pointsToUse.value
})

// 加载可用优惠券（从API获取）
const loadAvailableCoupons = async () => {
	try {
		// 获取用户ID
		const userInfo = uni.getStorageSync('userInfo') || {}
		const userId = userInfo.id || userInfo.user_id
		
		if (!userId) {
			console.error('用户未登录')
			availableCoupons.value = []
			return
		}
		
		// 调用API获取用户优惠券（只获取未使用的）
		const res = await getMyCoupons({
			user_id: userId,
			status: 'all', // 获取所有状态，然后前端过滤未使用的
			page: 1,
			page_size: 100
		})
		
		// 处理返回的数据
		const list = res.data?.coupons || res.coupons || []
	const now = Date.now()

		// 过滤出未使用且未过期的优惠券
		availableCoupons.value = list
		.filter((c) => {
				// 只使用状态为unused的优惠券
				if (c.status !== 'unused') return false
				
				// 检查是否过期
				const validTo = c.valid_to || c.validTo
				if (validTo) {
					const validToTime = new Date(validTo).getTime()
					if (validToTime < now) return false
				}
				
			return true
		})
		.map((c) => {
				// 映射为前端使用的格式
			return {
				id: c.id,
					name: c.name || `优惠券`,
					useScope: c.use_scope || c.useScope || 'all',
					applicable_product_type: c.applicable_product_type || c.applicableProductType || 'all', // 适用商品范围
					amount: c.amount || 0,
					minSpend: c.min_spend || c.minSpend || 0,
					validTo: c.valid_to || c.validTo,
					status: c.status
			}
		})
		
		console.log('可用优惠券数量:', availableCoupons.value.length)
	} catch (error) {
		console.error('加载优惠券失败', error)
		availableCoupons.value = []
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

// 优惠券优惠金额
const couponDiscount = computed(() => {
	if (!selectedCoupon.value) return 0

	const coupon = selectedCoupon.value
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

	if (coupon.minSpend > 0 && baseAmount < coupon.minSpend) {
		return 0
	}

	return Math.min(coupon.amount, baseAmount)
})

// 实际支付金额
const actualAmount = computed(() => {
	return Math.max(0, originalAmount.value - pointsDiscount.value - couponDiscount.value)
})
// 是否为0元订单
const isFreeOrder = computed(() => {
  return actualAmount.value <= 0
})
const submitFreeOrder = async () => {
	// 检查收货地址（免费订单也需要地址）
	if (!selectedAddress.value) {
		uni.showToast({ title: '请选择收货地址', icon: 'none' })
		return
	}
	
	// 检查用户积分是否足够
	if (pointsToUse.value > userPoints.value) {
		uni.showToast({ title: '积分不足', icon: 'none' })
		return
	}
	
	console.log('=== 开始提交免费订单 ===')
	uni.showLoading({ title: '提交中...' })
	
	try {
		// 获取用户信息
		const userInfo = uni.getStorageSync('userInfo') || {}
		const userId = userInfo.id || userInfo.user_id
		
		if (!userId) {
			uni.hideLoading()
			uni.showToast({ title: '请先登录', icon: 'none' })
			return
		}
		
		// 检查商品列表
		if (!orderItems.value || orderItems.value.length === 0) {
			uni.hideLoading()
			uni.showToast({ title: '购物车为空', icon: 'none' })
			return
		}
		
		// 获取地址ID
		const addressId = selectedAddress.value?.id || 
		                   selectedAddress.value?.addr_id || 
		                   selectedAddress.value?.address_id
		
		if (!addressId) {
			uni.hideLoading()
			uni.showToast({ title: '地址ID无效', icon: 'none' })
			return
		}
		
		const finalUserId = parseInt(userId)
		const finalAddressId = parseInt(addressId)
		
		// 构建地址对象
		const customAddress = selectedAddress.value ? {
			name: selectedAddress.value.name || '',
			phone: selectedAddress.value.phone || selectedAddress.value.mobile || '',
			address: selectedAddress.value.fullAddress || 
			         `${selectedAddress.value.province || ''}${selectedAddress.value.city || ''}${selectedAddress.value.district || ''}${selectedAddress.value.detail || ''}`,
			province: selectedAddress.value.province || '',
			city: selectedAddress.value.city || '',
			district: selectedAddress.value.district || '',
			detail: selectedAddress.value.detail || '',
			additionalProp1: {}
		} : { additionalProp1: {} }
		
		// 构建商品列表
		const items = orderItems.value.map((item) => {
			const quantity = parseInt(item.quantity) || 1
			
			let specsValue = ''
			let skuValue = item.sku || item.sku_code || ''
			
			if (item.specifications && typeof item.specifications === 'object') {
				const specArray = Object.keys(item.specifications).map(key => {
					const value = item.specifications[key]
					if (value !== null && value !== undefined && value !== '') {
						return `${key}：${value}`
					}
					return null
				}).filter(Boolean)
				specsValue = specArray.join('；')
			} else if (item.specs && typeof item.specs === 'object') {
				const specArray = Object.keys(item.specs).map(key => {
					const value = item.specs[key]
					if (value !== null && value !== undefined && value !== '') {
						return `${key}：${value}`
					}
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
		
		// 构建订单请求数据
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
				points_to_use: pointsToUse.value,
				pointsDiscount: pointsDiscount.value,
				coupon_id: selectedCoupon.value ? selectedCoupon.value.id : null,
				couponDiscount: couponDiscount.value,
				actualAmount: 0,
				is_free_order: true
			}
		} else {
			orderRequestData = {
				user_id: finalUserId,
				address_id: finalAddressId,
				custom_address: customAddress,
				delivery_way: deliveryWay.value || 'platform',
				coupon_id: selectedCoupon.value ? selectedCoupon.value.id : null,
				points_to_use: pointsToUse.value,
				pointsDiscount: pointsDiscount.value,
				actualAmount: 0,
				is_free_order: true
			}
		}
		
		console.log('[免费订单] 提交数据:', JSON.stringify(orderRequestData, null, 2))
		
		// 创建订单
		const orderRes = await createOrder(orderRequestData)
		
		const orderData = orderRes.data || orderRes
		// 后端创建订单返回：{ order_number: 'xxx' }，不一定有 id
		const apiOrderNo = orderData.orderNo || orderData.order_number || orderData.order_no
		const apiOrderId = orderData.id || orderData.orderId || orderData.order_id
		
		
		

		
		// 统一订单号（必有其一）：优先使用后端返回的 order_number
		const finalOrderNo = apiOrderNo || `FREE${Date.now()}`
		// 对于免费订单，部分接口可能没有返回 id，这里用订单号兜底作为本地 ID
		const finalOrderId = apiOrderId || orderData.id || orderData.order_id || finalOrderNo
		
		// ===== 所有数据操作必须在跳转前完成 =====
		
		// 1. 保存订单到本地存储（本地 ID 使用 finalOrderId，订单号使用 finalOrderNo）
		const newOrder = {
			id: finalOrderId,
			orderNo: finalOrderNo,
			status: 'paid',
			totalAmount: originalAmount.value,
			productTotal: productTotal.value,
			actualAmount: 0,
			pointsUsed: pointsToUse.value,
			pointsDiscount: pointsDiscount.value,
			couponDiscount: couponDiscount.value,
			coupon: selectedCoupon.value,
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
		
		// 2. 同步到商家端
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
		
		// 3. 添加订单消息
		addLocalMessage({
			type: 'order',
			title: '免费订单领取成功',
			content: `您的免费订单【${apiOrderNo || newOrder.orderNo}】已成功领取`,
			orderId: finalOrderId,
			orderNo: apiOrderNo || newOrder.orderNo,
			amount: 0
		})
		
		// 4. 隐藏loading并显示成功提示
		uni.hideLoading()
		uni.showToast({ title: '领取成功', icon: 'success' })
		
		// 5. 只有一个跳转：跳转到订单详情页（带 isFree 标记）
		setTimeout(() => {
			uni.redirectTo({
				url: `/subPackages/page1/pages/order/detail?id=${finalOrderId}&orderNo=${encodeURIComponent(finalOrderNo)}&isFree=true`
			})
		}, 1500)
		
	} catch (error) {
		uni.hideLoading()
		console.error('创建免费订单失败:', error)
		uni.showToast({ 
			title: getOrderErrorTitle(error), 
			icon: 'none',
			duration: 3000
		})
		// 错误时也可以跳转到订单列表（分包路径）
		setTimeout(() => {
			uni.navigateTo({ url: '/subPackages/page2/pages/order/list' })
		}, 2000)
	}
}
// 可获得积分：商品实付价格的1倍（不含配送费）
// 商品实付价格 = 商品原价 - 积分抵扣 - 优惠券折扣
const productActualAmount = computed(() => {
	return Math.max(0, productTotal.value - pointsDiscount.value - couponDiscount.value)
})

// 可获得积分：按实付金额的 100% 发放（使用优惠券时也按实付金额）
const earnPoints = computed(() => {
	return Math.floor(actualAmount.value)
})

// 公益贡献金额：按去掉积分抵扣后的实际支付金额的 1%
const charityAmount = computed(() => {
	// 积分抵扣后的实际支付金额 × 1%
	const baseAmount = Math.max(0, actualAmount.value)
	return calculateCharityAmount(baseAmount)
})

// 积分输入处理
const onPointsInput = () => {
	// 如果本单全部是会员商品，则不允许输入积分
	if (!canUsePoints.value) {
		pointsToUse.value = 0
		return
	}
	
	// 如果可用积分为0，不允许输入
	if (userPoints.value === 0 || maxPointsDiscount.value === 0) {
		pointsToUse.value = 0
		return
	}
	
	// 验证不能超过最大可抵扣积分
	if (pointsToUse.value > maxPointsDiscount.value) {
		pointsToUse.value = maxPointsDiscount.value
		uni.showToast({ title: `最多可抵扣 ${maxPointsDiscount.value} 积分`, icon: 'none' })
	}
	// 验证不能超过用户可用积分
	if (pointsToUse.value > userPoints.value) {
		pointsToUse.value = userPoints.value
		uni.showToast({ title: '积分不足', icon: 'none' })
	}
	if (pointsToUse.value < 0) {
		pointsToUse.value = 0
	}
}

// 滑块变化处理
const onSliderChange = (e) => {
	// 如果可用积分为0，不允许滑动
	if (userPoints.value === 0 || maxPointsDiscount.value === 0) {
		pointsToUse.value = 0
		return
	}
	
	let value = e.detail.value
	// 确保不超过用户可用积分
	if (value > userPoints.value) {
		value = userPoints.value
		uni.showToast({ title: '积分不足', icon: 'none' })
	}
	// 确保不超过最大可抵扣积分
	if (value > maxPointsDiscount.value) {
		value = maxPointsDiscount.value
	}
	pointsToUse.value = value
}

// 监听可用积分和最大可抵扣积分的变化，确保当它们为0时，滑块也在最左边
watch([userPoints, maxPointsDiscount], () => {
	if (userPoints.value === 0 || maxPointsDiscount.value === 0) {
		pointsToUse.value = 0
	}
}, { immediate: true })

// 使用最大积分
const useMaxPoints = () => {
	// 取最大可抵扣积分和用户可用积分的最小值
	pointsToUse.value = Math.min(maxPointsDiscount.value, userPoints.value)
	if (pointsToUse.value < maxPointsDiscount.value) {
		uni.showToast({ title: '积分不足，已使用全部可用积分', icon: 'none' })
	}
}

// 选择优惠券
const selectCoupon = async (coupon) => {
	if (selectedCoupon.value && selectedCoupon.value.id === coupon.id) {
		selectedCoupon.value = null
		return
	}
	selectedCoupon.value = { ...coupon }
	
	// 选择优惠券后，不需要立即调用使用接口
	// 优惠券会在订单创建成功后调用使用接口
}

// 取消优惠券
const cancelCoupon = () => {
	selectedCoupon.value = null
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
		// 从API获取最新地址列表（不再先读取本地存储，避免显示其他用户的地址）
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
			// 格式化地址数据，确保ID字段统一
			const formattedAddresses = addresses.map(addr => ({
				...addr,
				// 统一ID字段，支持 id, addr_id, address_id
				id: addr.id || addr.addr_id || addr.address_id,
				addr_id: addr.addr_id || addr.id || addr.address_id,
				phone: addr.phone || addr.mobile,
				isDefault: addr.is_default || addr.isDefault || false,
				fullAddress: addr.fullAddress || `${addr.province || ''}${addr.city || ''}${addr.district || ''}${addr.detail || ''}`
			}))
			
			// 更新本地存储（使用隔离存储）
			setStorage('addressList', formattedAddresses)
			
			// 如果当前没有选中地址，优先选择默认地址
			if (!selectedAddress.value) {
				const defaultAddr = formattedAddresses.find(addr => addr.isDefault || addr.is_default)
				selectedAddress.value = defaultAddr || formattedAddresses[0]
				console.log('[订单确认] 从API加载地址成功:', selectedAddress.value)
			} else {
				// 如果已有选中地址，检查是否还在列表中
				const found = formattedAddresses.find(addr => 
					addr.id === selectedAddress.value.id || 
					addr.addr_id === selectedAddress.value.id ||
					addr.addr_id === selectedAddress.value.addr_id ||
					addr.id === selectedAddress.value.addr_id ||
					(addr.mobile === selectedAddress.value.mobile && addr.phone === selectedAddress.value.phone)
				)
				if (!found) {
					// 选中的地址已被删除，重新选择默认地址或第一个
					const defaultAddr = formattedAddresses.find(addr => addr.isDefault || addr.is_default)
					selectedAddress.value = defaultAddr || formattedAddresses[0]
					console.log('[订单确认] 原选中地址已删除，重新选择:', selectedAddress.value)
					uni.showToast({ 
						title: '原地址已删除，已自动选择新地址', 
						icon: 'none',
						duration: 2000
					})
				} else {
					// 如果找到匹配的地址，更新为列表中的地址（确保数据最新）
					selectedAddress.value = found
					console.log('[订单确认] 选中地址仍在列表中，更新地址信息:', selectedAddress.value)
				}
			}
		} else {
			// 如果API返回空数组，清除本地缓存（避免显示其他用户的地址）
			console.warn('[订单确认] 地址列表为空，清除本地缓存')
			removeStorage('addressList')
			selectedAddress.value = null
		}
	} catch (error) {
		console.error('[订单确认] 加载地址失败:', error)
		// 如果API失败，清除本地缓存，避免显示错误的地址
		console.warn('[订单确认] API请求失败，清除本地地址缓存')
		removeStorage('addressList')
		selectedAddress.value = null
	}
}

/**
 * 选择配送方式（自提/商家配送）
 */
const selectDeliveryWay = (way) => {
	deliveryWay.value = way
	console.log('[订单确认] 选择配送方式:', way)
	console.log('[订单确认] delivery_way 已设置为:', deliveryWay.value)
	
	// 如果选择自提，配送费为0，允许提交订单
	if (way === 'pickup') {
		deliveryFee.value = 0
		deliveryInfo.value = { allowed: true, reason: '', fee: 0, distance: 0 }
		console.log('[订单确认] 自提模式：配送费已设置为0，delivery_way = pickup')
	} else {
		// 商家配送时，重新计算配送费
		refreshDeliveryStatus()
		console.log('[订单确认] 商家配送模式：delivery_way = platform')
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
	// 包邮:强制将配送费设置为0
	deliveryFee.value = 0
}

watch([selectedAddress, productTotal], () => {
	refreshDeliveryStatus()
}, { immediate: true })

// 将创建订单接口返回的原始错误转为用户可读提示
const getOrderErrorTitle = (error) => {
	const msg = (error && (error.message || error.msg || error.detail)) || ''
	const s = typeof msg === 'string' ? msg : String(msg)
	if (/InsufficientBalance/i.test(s)) return '余额不足或优惠券不可用，请检查后重试'
	if (/insufficient|不足/i.test(s)) return '余额或额度不足，请检查后重试'
	if (/Exception|Error|_init_|got an/i.test(s) && s.length > 30) return '服务暂时异常，请稍后重试'
	return (s && s.length <= 50) ? s : '订单创建失败，请稍后重试'
}

// 提交订单
const submitOrder = async () => {  // ← 添加 async
	// 0元订单特殊处理
	if (isFreeOrder.value) {
	    await submitFreeOrder()  // ← 添加 await
	    return
	  }
	if (!deliveryInfo.value.allowed) {
		uni.showToast({ title: deliveryInfo.value.reason || '暂不支持该地址', icon: 'none' })
		return
	}

	// 检查收货地址
	if (!selectedAddress.value) {
		uni.showToast({ title: '请选择收货地址', icon: 'none' })
		return
	}
	
	// 检查用户积分是否足够
	if (pointsToUse.value > userPoints.value) {
		uni.showToast({ title: '积分不足', icon: 'none' })
		return
	}
	
	console.log('=== 开始提交订单 ===')
	
	// 生成订单号和订单ID
	const orderId = Date.now()
	const orderNo = 'ORDER' + orderId
	
	// 创建订单对象
	const newOrder = {
		id: orderId,
		orderNo: orderNo,
		status: 'pending',  // 待付款
		totalAmount: originalAmount.value,
		productTotal: productTotal.value, // 商品原价，用于计算商家积分
		actualAmount: actualAmount.value,
		pointsUsed: pointsToUse.value,
		pointsDiscount: pointsDiscount.value,
		couponDiscount: couponDiscount.value,
		coupon: selectedCoupon.value,
		earnPoints: earnPoints.value,
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
	
	console.log('创建的订单:', newOrder)
	
	// 保存订单到本地存储
	const storedOrders = uni.getStorageSync('orderList') || []
	storedOrders.unshift(newOrder)  // 添加到列表开头
	uni.setStorageSync('orderList', storedOrders)
	console.log('订单已保存到本地存储，当前订单总数:', storedOrders.length)
	
	// 添加订单提交消息
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
		productTotal: productTotal.value, // 商品原价，用于计算商家积分
		actualAmount: actualAmount.value,
		products: orderItems.value.map(item => ({ ...item })),
		address: selectedAddress.value,
		createTime: formatDateTime(orderId),
		distance: selectedAddress.value.distanceKm || deliveryInfo.value.distance,
		deliveryFee: deliveryFee.value
	})

	// 积分变动已由后端API管理，不再需要前端保存本地流水
	
	const orderData = {
		items: orderItems.value,
		address: selectedAddress.value,
		productTotal: productTotal.value,
		deliveryFee: deliveryFee.value,
		originalAmount: originalAmount.value,
		points_to_use: pointsToUse.value,
		pointsDiscount: pointsDiscount.value,
		couponDiscount: couponDiscount.value,
		coupon: selectedCoupon.value,  // 添加优惠券信息，用于支付成功后调用使用接口
		actualAmount: actualAmount.value,
		earnPoints: earnPoints.value,
		hasVipProduct: orderItems.value.some(item => item.isVip || item.productType === 'vip')
	}
	
	// 支付页面需要的数据格式
	const paymentData = {
		orderNo: orderNo,
		orderId: orderId,  // 传递订单ID
		amount: actualAmount.value.toFixed(4),
		paymentMethod: 1,
		coupon: selectedCoupon.value,  // 同时在顶层也添加优惠券信息，确保支付页面能获取到
		orderData: orderData  // 完整订单数据
	}
	
	console.log('支付数据:', paymentData)
	
	// 获取用户信息
	const userInfo = uni.getStorageSync('userInfo') || {}
	const userId = userInfo.id || userInfo.user_id
	
	if (!userId) {
		uni.hideLoading()
		uni.showToast({ title: '请先登录', icon: 'none' })
		return
	}
	
	// 检查商品列表
	if (!orderItems.value || orderItems.value.length === 0) {
		uni.hideLoading()
		uni.showToast({ title: '购物车为空', icon: 'none' })
		return
	}
	
	// 获取地址ID（支持多种字段名：id, addr_id, address_id）
	const addressId = selectedAddress.value?.id || 
	                   selectedAddress.value?.addr_id || 
	                   selectedAddress.value?.address_id
	
	console.log('[订单创建] 地址对象:', selectedAddress.value)
	console.log('[订单创建] 尝试获取地址ID:', {
		id: selectedAddress.value?.id,
		addr_id: selectedAddress.value?.addr_id,
		address_id: selectedAddress.value?.address_id,
		最终地址ID: addressId
	})
	
	if (!addressId) {
		uni.hideLoading()
		uni.showToast({ title: '请选择收货地址', icon: 'none' })
		return
	}
	
	console.log('[订单创建] 准备提交的数据:', {
		user_id: userId,
		address_id: addressId,
		地址信息: selectedAddress.value,
		商品数量: orderItems.value.length,
		商品列表: orderItems.value
	})
	
	uni.showLoading({ title: '提交中...' })
	
	// 确保 user_id 和 address_id 是有效的数字
	const finalUserId = parseInt(userId)
	const finalAddressId = parseInt(addressId)
	
	if (!finalUserId || finalUserId === 0) {
		uni.hideLoading()
		uni.showToast({ title: '用户ID无效，请重新登录', icon: 'none' })
		return
	}
	
	if (!finalAddressId || finalAddressId === 0) {
		uni.hideLoading()
		uni.showToast({ title: '地址ID无效，请选择收货地址', icon: 'none' })
		return
	}
	
	// 构建地址对象（custom_address）- 根据API文档要求
	const customAddress = selectedAddress.value ? {
		name: selectedAddress.value.name || '',
		phone: selectedAddress.value.phone || selectedAddress.value.mobile || '',
		address: selectedAddress.value.fullAddress || 
		         `${selectedAddress.value.province || ''}${selectedAddress.value.city || ''}${selectedAddress.value.district || ''}${selectedAddress.value.detail || ''}`,
		province: selectedAddress.value.province || '',
		city: selectedAddress.value.city || '',
		district: selectedAddress.value.district || '',
		detail: selectedAddress.value.detail || '',
		// 保留其他可能的字段
		...(selectedAddress.value.lng ? { lng: selectedAddress.value.lng } : {}),
		...(selectedAddress.value.lat ? { lat: selectedAddress.value.lat } : {}),
		...(selectedAddress.value.isDefault !== undefined ? { isDefault: selectedAddress.value.isDefault } : {}),
		...(selectedAddress.value.is_default !== undefined ? { is_default: selectedAddress.value.is_default } : {}),
		// API 文档要求的字段
		additionalProp1: {}
	} : {
		additionalProp1: {}
	}
	
	// 构建地址对象（address）- API 文档要求的格式
	const address = selectedAddress.value ? {
		name: selectedAddress.value.name || '',
		phone: selectedAddress.value.phone || selectedAddress.value.mobile || '',
		address: selectedAddress.value.fullAddress || 
		         `${selectedAddress.value.province || ''}${selectedAddress.value.city || ''}${selectedAddress.value.district || ''}${selectedAddress.value.detail || ''}`
	} : {}
	
	// ========== 检查点3：订单确认页 - 提交订单前的数据 ==========
	console.log('========== [检查点3] 订单确认页 - 提交订单前 ==========')
	console.log('[检查点3] orderItems.value 数组长度:', orderItems.value.length)
	console.log('[检查点3] orderItems.value 完整数据:', JSON.stringify(orderItems.value, null, 2))
	orderItems.value.forEach((item, index) => {
		console.log(`[检查点3] 订单商品 ${index + 1}:`, {
			商品ID: item.id || item.product_id,
			商品名称: item.name,
			数量: item.quantity,
			数量类型: typeof item.quantity,
			价格: item.price
		})
	})
	
	// 构建商品列表（items）- 直接购买时需要传递商品信息
	const items = orderItems.value.map((item, index) => {
		// 确保数量是整数，防止重复计算
		const quantity = parseInt(item.quantity) || 1
		
		console.log(`[检查点3] 构建提交数据 - 商品 ${index + 1}:`, {
			商品ID: item.id || item.product_id,
			原始数量: item.quantity,
			处理后数量: quantity
		})
		
		// 处理规格信息：优先使用 specifications 对象，其次使用 specs 对象，最后使用 spec 字符串
		let specsValue = ''
		let skuValue = item.sku || item.sku_code || ''
		
		if (item.specifications && typeof item.specifications === 'object') {
			// 规格对象转换为字符串格式（如："颜色：黑色；尺寸：大"）
			const specArray = Object.keys(item.specifications).map(key => {
				const value = item.specifications[key]
				if (value !== null && value !== undefined && value !== '') {
					return `${key}：${value}`
				}
				return null
			}).filter(Boolean)
			specsValue = specArray.join('；')
		} else if (item.specs && typeof item.specs === 'object') {
			// specs 对象也转换为字符串
			const specArray = Object.keys(item.specs).map(key => {
				const value = item.specs[key]
				if (value !== null && value !== undefined && value !== '') {
					return `${key}：${value}`
				}
				return null
			}).filter(Boolean)
			specsValue = specArray.join('；')
		} else if (item.spec) {
			// 直接使用字符串格式的 spec
			specsValue = item.spec
		}
		
		console.log('[检查点3] 商品信息处理:', {
			商品ID: item.id,
			商品名称: item.name,
			数量: quantity,
			价格: parseFloat(item.price) || 0,
			规格: specsValue,
			SKU: skuValue,
			规格对象: item.specifications || item.specs
		})
		
		return {
			product_id: item.id,
			quantity: quantity,
			unit_price: parseFloat(item.price) || 0,
			specs: specsValue, // 规格字符串
			sku: skuValue // SKU代码
		}
	})
	
	console.log('[检查点3] 构建的 items 数组长度:', items.length)
	console.log('[检查点3] 构建的 items 完整数据:', JSON.stringify(items, null, 2))
	console.log('========== [检查点3] 结束 ==========')
	
	// 构建订单请求数据
	let orderRequestData = {}
	
	if (orderSource.value === 'direct') {
		// 直接购买：直接传递 buy_now_items，不传递 items，避免后端重复处理
		// 将 items 转换为 buy_now_items 格式
		const buyNowItems = items.map(item => ({
			product_id: item.product_id,
			quantity: item.quantity,
			price: item.unit_price || item.price || 0,
			specs: item.specs || '',
			sku: item.sku || ''
		}))
		
		orderRequestData = {
			user_id: finalUserId,
			address_id: finalAddressId,
			custom_address: customAddress,
			buy_now: true, // 明确设置为 true，表示直接购买
			buy_now_items: buyNowItems, // 直接传递 buy_now_items，不传递 items
			delivery_way: deliveryWay.value, // 配送方式：'platform' 或 'pickup'
			// 以下字段可能不会被后端使用，但保留以防需要
			address: address,
			productTotal: productTotal.value,
			deliveryFee: deliveryFee.value,
			originalAmount: originalAmount.value,
			points_to_use: pointsToUse.value,
			pointsDiscount: pointsDiscount.value,
			coupon_id: selectedCoupon.value ? selectedCoupon.value.id : null,
			couponDiscount: couponDiscount.value,
			actualAmount: actualAmount.value, // 已经是积分和优惠券抵扣完的价格
			earnPoints: earnPoints.value,
			hasVipProduct: orderItems.value.some(item => item.isVip || item.productType === 'vip')
		}
		console.log('[订单创建] 直接购买，传递 buy_now_items，不传递 items，配送方式:', deliveryWay.value)
	} else {
		// 从购物车购买：只传递 user_id, address_id, custom_address（后端从购物车读取），并透传优惠券与积分
		orderRequestData = {
			user_id: finalUserId,
			address_id: finalAddressId,
			custom_address: customAddress,
			delivery_way: deliveryWay.value, // 配送方式：'platform' 或 'pickup'
			coupon_id: selectedCoupon.value ? selectedCoupon.value.id : null,
			points_to_use: pointsToUse.value,
			pointsDiscount: pointsDiscount.value,
			actualAmount: actualAmount.value
		}
		console.log('[订单创建] 从购物车购买，后端从购物车读取商品，配送方式:', deliveryWay.value)
	}
	
	console.log('[订单创建] 最终提交的数据:', JSON.stringify(orderRequestData, null, 2))
	console.log('[订单创建] 用户ID:', userId, '->', orderRequestData.user_id)
	console.log('[订单创建] 地址ID:', addressId, '->', orderRequestData.address_id)
	console.log('[订单创建] 订单来源:', orderSource.value)
	
	// 创建订单
	createOrder(orderRequestData)
		.then(async (orderRes) => {
			console.log('订单创建成功:', orderRes)
			console.log('订单创建响应数据:', JSON.stringify(orderRes, null, 2))
			
			// 从API响应中提取订单信息（支持多种响应格式）
			const orderData = orderRes.data || orderRes
			const apiOrderNo = orderData.orderNo || orderData.order_number || orderData.order_no
			const apiOrderId = orderData.id || orderData.orderId || orderData.order_id
			
			// 如果API返回了订单号，使用API返回的订单号（优先使用API返回的）
			if (apiOrderNo) {
				paymentData.orderNo = apiOrderNo
				console.log('[订单创建] 使用API返回的订单号:', apiOrderNo)
			}
			
			// 如果API返回了订单ID，使用API返回的订单ID（优先使用API返回的）
			if (apiOrderId) {
				paymentData.orderId = apiOrderId
				console.log('[订单创建] 使用API返回的订单ID:', apiOrderId)
			} else if (orderId) {
				// 如果没有API返回的订单ID，使用本地生成的
				paymentData.orderId = orderId
				console.log('[订单创建] 使用本地生成的订单ID:', orderId)
			}
			
			console.log('[订单创建] 最终支付数据:', {
				orderNo: paymentData.orderNo,
				orderId: paymentData.orderId,
				amount: paymentData.amount
			})
			
			
			
			uni.hideLoading()
			
			// 跳转到支付页面
			uni.navigateTo({
				url: `/page1/payment/payment?data=${encodeURIComponent(JSON.stringify(paymentData))}`
			})
		})
		.catch((error) => {
			console.error('创建订单失败:', error)
			uni.hideLoading()
			uni.showToast({ 
				title: getOrderErrorTitle(error), 
				icon: 'none',
				duration: 3000
			})
		})
}

onLoad(async (options) => {
	console.log('订单确认页 - 接收到的参数:', options)
	
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
	// 从地址列表页面返回后，重新加载地址列表，确保选中地址正确
	loadAddress()
	loadAddress()
	loadAvailableCoupons() // 刷新优惠券列表
	loadUserPoints() // 刷新积分余额
	console.log('订单确认页显示，刷新地址列表和优惠券')
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
</style>


