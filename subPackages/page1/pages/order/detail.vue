<template>
	<view class="detail-page">
		<!-- 顶部状态显示 -->
		<view class="status-header">
			<view class="status-icon-large">
				<text v-if="getStatusIconClass(order.status)" class="iconfont" :class="getStatusIconClass(order.status)"></text>
				<text v-else class="iconfont">{{ getStatusIcon(order.status) }}</text>
			</view>
			<view class="status-text-large">{{ getStatusText(order.status) }}</view>
		</view>

		<view class="content-body" :style="{ marginTop: -40 + 'rpx' }">
			<!-- 物流信息卡片（仅商家配送时显示） -->
			<view class="card logistics-card" v-if="['pending_recv', 'completed'].includes(order.status) && order.deliveryWay !== 'pickup'">
				<!-- 核心物流状态 (始终显示) -->
				<view class="card-item main-logistics">
					<view class="logistics-icon">
						<view class="icon-circle">
							<text class="iconfont icon-kuaidi"></text>
						</view>
					</view>
					<view class="logistics-info">
						<text class="logistics-status-text">{{ order.logisticsStatus || '运输中' }}</text>
						<view class="logistics-no-row" v-if="order.logisticsNo">
							<text class="logistics-no">单号: {{ order.logisticsNo }}</text>
							<text class="copy-text-small" @tap.stop="copyLogisticsNo">复制</text>
						</view>
						<!-- 已签收时不显示物流详情文本 -->
						<text class="logistics-detail-text" v-if="order.logisticsStatus !== '已签收'">{{ order.logistics || '包裹正在运输中' }}</text>
						<text class="logistics-time-text">{{ order.logisticsTime }}</text>
					</view>
				</view>
				
				<!-- 物流详情列表 (展开区域) -->
				<view class="logistics-traces" v-if="order.logisticsTraces && order.logisticsTraces.length > 0 && expandStep > 0">
					<view class="trace-item" v-for="(trace, index) in visibleTraces" :key="index">
						<!-- 时间轴线 -->
						<view class="trace-timeline">
							<view class="dot" :class="{ first: index === 0 }"></view>
							<view class="line" v-if="index !== visibleTraces.length - 1 || expandStep < 2"></view>
						</view>
						<view class="trace-content">
							<text class="trace-desc">{{ trace.desc }}</text>
							<text class="trace-time">{{ trace.time }}</text>
						</view>
					</view>
				</view>
				
				<!-- 展开/收起 按钮 -->
				<view class="expand-bar" @tap="toggleLogistics" v-if="order.logisticsTraces && order.logisticsTraces.length > 0">
					<text class="expand-text">{{ expandBtnText }}</text>
					<text class="iconfont icon-arrow-down" :class="{ rotated: expandStep === 2 }">▼</text>
				</view>
			</view>
			
			<!-- 收货地址（商家配送时显示）或自提地址（自提时显示） -->
			<view class="card address-card" v-if="order.deliveryWay !== 'pickup'">
				<view class="card-item">
					<view class="address-icon">
						<text class="iconfont icon-dingwei"></text>
					</view>
					<view class="address-info">
						<view class="user-row">
							<text class="user-name">{{ order.address.name }}</text>
							<text class="user-phone">{{ order.address.phone }}</text>
						</view>
						<text class="address-text">{{ order.address.detail }}</text>
					</view>
				</view>
			</view>
			
			<!-- 自提地址（自提时显示，使用订单详情接口返回的商家地址，与平台退货地址无关） -->
			<view class="card address-card" v-if="order.deliveryWay === 'pickup'">
				<view class="card-item">
					<view class="address-icon">
						<text class="iconfont icon-dingwei"></text>
					</view>
					<view class="address-info">
						<view class="user-row">
							<text class="user-name">商家地址</text>
						</view>
						<text class="address-text">{{ order.merchantAddress || '暂无' }}</text>
					</view>
				</view>
			</view>

			<!-- 商品信息 -->
			<view class="card product-card">
				<view class="product-list">
					<view class="product-item" v-for="(item, index) in order.products" :key="index" @tap="goToProduct(item.productId)">
						<image :src="item.image" mode="aspectFill" class="product-img" />
						<view class="product-content">
							<text class="product-title">{{ item.name }}</text>
							<view class="product-specs" v-if="item.specs || formatSpecifications(item.specifications)">
								<text>{{ item.specs || formatSpecifications(item.specifications) }}</text>
							</view>
							<view class="product-price-row">
								<text class="price-symbol">¥</text>
								<text class="price-num">{{ item.price }}</text>
								<text class="product-num">x{{ item.quantity }}</text>
							</view>
						</view>
					</view>
				</view>
				<view class="order-calc">
					<view class="calc-row">
						<text class="label">商品总价</text>
						<text class="value">¥{{ format4Decimals(order.productAmount) }}</text>
					</view>
					<view class="calc-row">
						<text class="label">运费</text>
						<text class="value">¥{{ format4Decimals(order.shippingFee) }}</text>
					</view>
					<view class="calc-row" v-if="order.couponAmount > 0">
						<text class="label">优惠券</text>
						<text class="value red">-¥{{ format4Decimals(order.couponAmount) }}</text>
					</view>
					<view class="calc-row" v-if="order.pointsDeduction > 0">
						<text class="label">积分抵扣</text>
						<text class="value red">-{{ format4Decimals(order.pointsDeduction) }}点</text>
					</view>
					<view class="calc-row total-row">
						<text class="label">实付款</text>
						<text class="total-price">¥{{ format4Decimals(order.totalAmount) }}</text>
					</view>
			</view>
		</view>

			<!-- 退款信息（待售后订单或已完成订单且有退款信息时显示，退款状态不为空才显示） -->
			<view class="card refund-info-card" v-if="hasRefundStatus()">
				<view class="card-title">退款信息</view>
				<view class="refund-info-content">
					<view class="info-row">
						<text class="label">退款状态</text>
						<view class="value-box">
							<text class="refund-status-text" :class="'status-' + (getRefundStatusForDisplay())">
								{{ getRefundStatusTextForDisplay() }}
							</text>
						</view>
					</view>
					<!-- 已完成订单显示退款原因 -->
					<view class="info-row" v-if="order.status === 'completed' && (order.refundReason || (refundInfo && refundInfo.reason_code))">
						<text class="label">退款原因</text>
						<text class="value">{{ order.refundReason || (refundInfo && refundInfo.reason_code) || '无' }}</text>
					</view>
					<view class="info-row" v-if="refundInfo.refund_type">
						<text class="label">退款类型</text>
						<text class="value">{{ getRefundTypeText(refundInfo.refund_type) }}</text>
					</view>
					<view class="info-row" v-if="refundInfo.reason_code">
						<text class="label">售后原因</text>
						<text class="value">{{ refundInfo.reason_code }}</text>
					</view>
					<!-- 退货退款且已通过时显示退货地址 -->
					<view class="info-row" v-if="(refundInfo.status === 'approved' || refundInfo.status === 'success') && refundInfo.refund_type && refundInfo.refund_type.includes('return')">
						<text class="label">退货地址</text>
						<text class="value">{{ platformReturnAddress || '加载中...' }}</text>
					</view>
					<!-- 拒绝原因（非退货退款或未通过时显示） -->
					<view class="info-row" v-if="refundInfo.reject_reason && !((refundInfo.status === 'approved' || refundInfo.status === 'success') && refundInfo.refund_type && refundInfo.refund_type.includes('return'))">
						<text class="label">拒绝原因</text>
						<text class="value reject-reason">{{ refundInfo.reject_reason }}</text>
					</view>
					<view class="info-row" v-if="refundInfo.created_at">
						<text class="label">申请时间</text>
						<text class="value">{{ refundInfo.created_at }}</text>
					</view>
					<view class="info-row" v-if="refundInfo.updated_at">
						<text class="label">更新时间</text>
						<text class="value">{{ refundInfo.updated_at }}</text>
					</view>
					<view class="info-row" v-if="refundInfo.progress">
						<text class="label">进度说明</text>
						<text class="value">{{ refundInfo.progress }}</text>
					</view>
				</view>
			</view>

			<!-- 订单基础信息 -->
			<view class="card order-info-card">
				<view class="info-row">
					<text class="label">订单编号</text>
					<view class="value-box">
						<text class="value">{{ order.orderNo }}</text>
						<text class="copy-tag" @tap="copyOrderNo">复制</text>
					</view>
				</view>
				<view class="info-row">
					<text class="label">购买日期</text>
					<text class="value">{{ order.createTime }}</text>
				</view>
				<view class="info-row" v-if="order.payTime">
					<text class="label">付款时间</text>
					<text class="value">{{ order.payTime }}</text>
				</view>
				<view class="info-row" v-if="order.logisticsNo">
					<text class="label">快递单号</text>
					<view class="value-box">
						<text class="value">{{ order.logisticsNo }}</text>
						<text class="copy-tag" @tap="copyLogisticsNo">复制</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部操作栏 -->
		<view class="bottom-action-bar" v-if="order.status !== 'cancelled'">
			<view class="action-buttons">
			<!-- 待付款状态才显示取消和支付按钮 -->
			<button class="btn plain" v-if="order.status === 'pending_pay'" @tap="handleCancel">取消订单</button>
			<button class="btn primary" v-if="order.status === 'pending_pay'" @tap="handlePay">立即支付</button>
				<!-- 待收货状态显示确认收货按钮（自提时显示"确认自提"） -->
				<button class="btn primary" v-if="order.status === 'pending_recv'" @tap="handleReceive">
					{{ order.deliveryWay === 'pickup' ? '确认自提' : '确认收货' }}
				</button>
				<!-- 申请退款：待发货、待收货状态可以申请，已完成状态在15天内且未申请过退款可以申请 -->
				<button 
					class="btn secondary" 
					v-if="canApplyRefund()" 
					@tap="goToAfterSale"
				>
					申请退款
				</button>
				<!-- 待售后订单：查询退款进度 -->
				<button 
					class="btn secondary" 
					v-if="order.status === 'refunding' || order.status === 'refunded'" 
					@tap="checkRefundProgress"
				>
					查询退款进度
				</button>
			</view>
		</view>
		
		<!-- 退款进度弹窗 -->
		<view class="modal-mask" v-if="showRefundModal" @tap="closeRefundModal" @touchmove.stop.prevent>
			<view class="modal-content refund-modal" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">退款进度</text>
					<text class="modal-close" @tap="closeRefundModal">×</text>
				</view>
				<view class="modal-body">
					<view v-if="refundInfo && (refundInfo.status || refundInfo.refund_type || refundInfo.reason_code)" class="refund-info-list">
						<view class="info-item" v-if="refundInfo.status">
							<text class="info-label">退款状态</text>
							<view class="info-value">
								<text class="status-badge" :class="'status-' + (refundInfo.status || '').toLowerCase()">
									{{ getRefundStatusText(refundInfo.status) }}
								</text>
							</view>
						</view>
						<view class="info-item" v-if="refundInfo.refund_type">
							<text class="info-label">退款类型</text>
							<text class="info-value">{{ getRefundTypeText(refundInfo.refund_type) }}</text>
						</view>
						<view class="info-item" v-if="refundInfo.reason_code">
							<text class="info-label">售后原因</text>
							<text class="info-value reason-text">{{ refundInfo.reason_code }}</text>
						</view>
						<view class="info-item" v-if="refundInfo.reject_reason">
							<text class="info-label">拒绝原因</text>
							<text class="info-value reject-text">{{ refundInfo.reject_reason }}</text>
						</view>
						<view class="info-item" v-if="refundInfo.created_at || refundInfo.createdAt">
							<text class="info-label">申请时间</text>
							<text class="info-value">{{ formatTime(refundInfo.created_at || refundInfo.createdAt) }}</text>
						</view>
						<view class="info-item" v-if="refundInfo.updated_at || refundInfo.updatedAt">
							<text class="info-label">更新时间</text>
							<text class="info-value">{{ formatTime(refundInfo.updated_at || refundInfo.updatedAt) }}</text>
						</view>
					</view>
					<view v-else class="empty-refund">
						<text class="empty-text">暂无退款信息</text>
					</view>
				</view>
				<view class="modal-footer">
					<button class="modal-btn confirm" @tap="closeRefundModal">确定</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrderDetail, getLogistics, queryLogistics, cancelOrder, confirmReceive, notifyConfirmReceive } from '@/api/order.js'
import { getProductDetail } from '@/api/product.js'
import { getRefundProgress } from '../../api/refund.js'
import { getReturnAddress } from '@/api/user.js'
import config from '@/utils/config.js'

const order = ref({
	id: 0,
	orderNo: '',
	status: 'pending_pay',
	createTime: '',
	createTimeStamp: 0, // 订单创建时间戳（用于计算15天）
	payTime: '',
	paymentMethod: '',
	refundStatus: null,
	productAmount: 0,
	couponAmount: 0, // 优惠券金额
	pointsDeduction: 0, // 积分抵扣数额
	shippingFee: 0,
	totalAmount: 0,
	logistics: '',
	logisticsStatus: '', 
	logisticsNo: '', // 物流单号
	logisticsTime: '',   
	logisticsTraces: [], // 具体的物流轨迹列表
	deliveryWay: 'platform', // 配送方式：'platform' 商家配送，'pickup' 自提
	merchantAddress: '', // 商家地址（自提时使用）
	address: {
		name: '',
		phone: '',
		detail: ''
	},
	products: []
})

// 退款信息
const refundInfo = ref(null)
const showRefundModal = ref(false)

const closeRefundModal = () => {
	showRefundModal.value = false
}

// 平台退货地址
const platformReturnAddress = ref('')

// 防止同一订单详情被连续请求多次（避免 /order/detail 被连续调用 3 次）
const orderDetailLoadingRef = ref(false)

// 物流展开状态: 0=不展开详情(仅头部), 1=显示5条, 2=显示全部
const expandStep = ref(0) 

const visibleTraces = computed(() => {
	if (expandStep.value === 0) return [] 
	if (expandStep.value === 1) return order.value.logisticsTraces.slice(0, 5)
	return order.value.logisticsTraces
})

const expandBtnText = computed(() => {
	if (expandStep.value === 0) return '点击展开更多物流详情'
	if (expandStep.value === 1) return '点击展开全部物流详情'
	return '收起'
})

const toggleLogistics = () => {
	if (expandStep.value === 0) {
		expandStep.value = 1
	} else if (expandStep.value === 1) {
		// 如果总数小于等于5，直接收起，否则展开全部
		if (order.value.logisticsTraces.length <= 5) {
			expandStep.value = 0
		} else {
			expandStep.value = 2
		}
	} else {
		expandStep.value = 0
	}
}

const copyLogisticsNo = () => {
	if (order.value.logisticsNo) {
		uni.setClipboardData({
			data: order.value.logisticsNo,
			success: () => {
				uni.showToast({ title: '单号已复制', icon: 'none' })
			}
		})
	}
}



/**
 * 加载订单详情
 * @param {String} orderNumber 订单号
 */
const loadOrderDetail = async (orderNumber) => {
	if (!orderNumber) {
		console.error('订单号不能为空')
		uni.showToast({ title: '订单号不能为空', icon: 'none' })
		return
	}
	if (orderDetailLoadingRef.value) {
		return
	}
	// 进入页面时始终关闭退款进度弹窗，仅当用户点击「查询退款进度」时再打开
	showRefundModal.value = false
	orderDetailLoadingRef.value = true
	try {
		uni.showLoading({ title: '加载中...' })
		const res = await getOrderDetail(orderNumber)
		uni.hideLoading()
		
		// 处理不同的响应格式
		let orderData = null
		if (res.data) {
			orderData = res.data
		} else if (res.order_info || res['order info']) {
			// 处理带有 "order_info" 或 "order info" 字段的响应格式
			orderData = res.order_info || res['order info']
			// 如果 items 在顶层，也需要合并进来
			if (res.items) {
				orderData.items = res.items
			}
		} else if (typeof res === 'object' && res.id) {
			orderData = res
		} else {
			console.error('无法解析的订单数据格式:', res)
			throw new Error('订单数据格式错误')
		}
		
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
		
		// 退款中/已退款/已完成且有退款信息时，仅预加载退款数据供页面展示，不自动打开退款进度弹窗（弹窗仅由用户点击「查询退款进度」打开）
		const hasRefundInfo = orderData.refund_reason || orderData.refundReason || orderData.refund_status || orderData.refundStatus
		if (orderData.status === 'refunding' || orderData.status === 'refunded' || (orderData.status === 'completed' && hasRefundInfo)) {
			try {
				const refundResult = await getRefundProgress(orderData.order_no || orderData.orderNo || orderData.order_number)
				refundInfo.value = refundResult.data || refundResult
				console.log('[订单详情] 退款信息已加载:', refundInfo.value)
			} catch (refundError) {
				console.error('[订单详情] 查询退款进度失败:', refundError)
				// 如果查询失败，但订单数据中有退款信息，使用订单数据中的退款信息
				if (hasRefundInfo) {
					refundInfo.value = {
						status: orderData.refund_status || orderData.refundStatus || null,
						reason_code: orderData.refund_reason || orderData.refundReason || null
					}
					console.log('[订单详情] 使用订单数据中的退款信息:', refundInfo.value)
				} else {
					refundInfo.value = null
				}
			}
		} else {
			refundInfo.value = null
		}
		
		// 计算订单创建时间戳
		const createTimeStr = orderData.created_at || orderData.createTime || orderData.create_time
		const createTimeStamp = createTimeStr ? new Date(createTimeStr).getTime() : 0
		
		// 从orderData中获取配送方式，用于判断是否需要加载退货地址
		const deliveryWay = orderData.delivery_way || orderData.deliveryWay || 'platform'
		
		// 自提订单的「商家地址」使用订单详情返回的 merchant_address，不调用平台退货地址接口（图2接口是退货寄回地址，非自提取货地址）
		// 仅当退款退货且已通过时，才加载平台退货地址（用于退款进度中的「退货地址」展示）
		if (refundInfo.value && 
			(refundInfo.value.status === 'approved' || refundInfo.value.status === 'success') && 
			refundInfo.value.refund_type && 
			refundInfo.value.refund_type.includes('return')) {
			console.log('[订单详情] 检测到退款退货订单，开始加载平台退货地址')
			loadPlatformReturnAddress()
		}
		
		order.value = {
			id: orderData.id,
			orderNo: orderData.order_no || orderData.orderNo || orderData.order_number,
			transaction_id: orderData.transaction_id || orderData.transactionId || '',
			merchant_id: orderData.merchant_id || orderData.mch_id || '',
			status: orderData.status,
			createTime: formatTime(createTimeStr),
			createTimeStamp: createTimeStamp, // 保存时间戳用于计算15天
			payTime: orderData.paid_at ? formatTime(orderData.paid_at) : (orderData.pay_time ? formatTime(orderData.pay_time) : ''),
			paymentMethod: orderData.payment_method || orderData.paymentMethod || '',
			refundStatus: orderData.refund_status || orderData.refundStatus || null,
			refundReason: orderData.refund_reason || orderData.refundReason || null, // 退款原因
			// 优先使用API返回的product_amount，如果没有则使用计算的商品总价，最后使用total_amount
			productAmount: parseFloat(orderData.product_amount || orderData.productAmount || calculatedProductAmount || orderData.item_amount || 0),
			couponAmount: parseFloat(orderData.coupon_amount || orderData.couponAmount || orderData.coupon_discount || orderData.couponDiscount || 0),
			pointsDeduction: parseFloat(orderData.points_deduction || orderData.pointsDeduction || orderData.points_used || orderData.pointsUsed || 0),
			shippingFee: parseFloat(orderData.shipping_fee || orderData.shippingFee || orderData.delivery_fee || orderData.deliveryFee || 0),
			totalAmount: parseFloat(orderData.actual_amount || orderData.actualAmount || orderData.total_amount || orderData.totalAmount || 0),
			// logistics 字段：优先使用后端返回的物流详情文本，如果没有则使用物流公司名称
			// 注意：如果后端返回的是物流公司名称，后续会根据物流API的最新轨迹更新为具体描述
			logistics: orderData.logistics_detail || orderData.logisticsDetail || orderData.logistics || orderData.logistics_company || orderData.logisticsCompany || '',
			// logisticsStatus 字段：根据订单状态设置，后续会根据物流API的实际状态更新
			logisticsStatus: orderData.status === 'pending_recv' ? '运输中' : (orderData.status === 'completed' ? '已签收' : ''),
			logisticsNo: orderData.logistics_no || orderData.logisticsNo || orderData.tracking_number || orderData.trackingNumber || '',
			logisticsTime: orderData.logistics_time ? formatTime(orderData.logistics_time) : (orderData.logisticsTime ? formatTime(orderData.logisticsTime) : ''),
			logisticsTraces: orderData.logistics_traces || orderData.logisticsTraces || [],
			deliveryWay: deliveryWay, // 配送方式：'platform' 商家配送，'pickup' 自提
			merchantAddress: orderData.merchant_address || orderData.merchantAddress || orderData.return_address || orderData.returnAddress || '', // 商家地址（自提时使用）
			address: orderData.address || orderData.custom_address || {
				name: orderData.consignee_name || orderData.name || '',
				phone: orderData.consignee_phone || orderData.phone || '',
				detail: orderData.shipping_address || orderData.address_detail || orderData.detail || '',
				// 地址经纬度（如果后端返回）
				latitude: orderData.address?.latitude || orderData.address?.lat || orderData.destination_lat || orderData.dest_lat || null,
				longitude: orderData.address?.longitude || orderData.address?.lng || orderData.address?.lon || orderData.destination_lng || orderData.dest_lng || null
			},
			products: await Promise.all((orderData.items || orderData.products || []).map(async (item) => {

				
				// 处理图片：优先使用 main_image，然后尝试其他字段（和主页一样的逻辑）
				const processImageUrl = (img) => {
					if (!img) return null
					if (img.startsWith('http://') || img.startsWith('https://')) return img
					if (img.startsWith('/static')) return img
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
						image = processImageUrl(item.product_image || item.image_url || item.image)

					}
				}
				
				// 5. 如果还是没有图片，尝试通过 product_id 查询商品详情获取图片
				if (!image || image === '/static/logo.png') {
					const productId = item.product_id || item.id
					if (productId) {
						try {

							const productRes = await getProductDetail(productId)
							const productData = productRes.data || productRes
							
							// 使用和主页一样的逻辑获取图片
							if (productData.main_image) {
								image = processImageUrl(productData.main_image)

							} else if (productData.banner_images && Array.isArray(productData.banner_images) && productData.banner_images.length > 0) {
								image = processImageUrl(productData.banner_images[0])

							} else if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
								image = processImageUrl(productData.images[0])

							} else if (productData.image_url || productData.image) {
								image = processImageUrl(productData.image_url || productData.image)

							}
						} catch (error) {
							console.error('[订单详情] 查询商品详情失败:', error)
						}
					}
				}
				
				// 6. 如果还是没有，使用默认图片
				if (!image) {
					image = '/static/logo.png'
					console.warn('[订单详情] 没有找到图片，使用默认图片，商品数据:', item)
				}
				
				return {
				id: item.product_id || item.id,
				productId: item.product_id || item.id,
					name: item.product_name || item.name || (item.product && item.product.name) || '',
					image: image,
					// 优先使用unit_price，如果没有则使用price，最后尝试从product对象获取
					price: parseFloat(item.unit_price || item.price || (item.product && item.product.price) || 0),
				quantity: parseInt(item.quantity || 1),
					specs: item.specs || item.spec || item.specifications || ''
				}
			}))
		}
		
		// 如果订单在待收货或已完成状态，加载物流信息（图2：POST /logistics/query 或 getLogistics）
		// 如果订单在待收货或已完成状态，加载物流信息
let logisticsDataFromApi = null
if (order.value.status === 'pending_recv' || order.value.status === 'completed') {
    const trackingNo = order.value.logisticsNo || order.value.tracking_number || order.value.trackingNumber
    const companyCode = order.value.logisticsCompanyCode || order.value.company_code || order.value.express_company
    // 仅当有运单号时才尝试查询物流
    if (trackingNo) {
        try {
            const logisticsRes = await queryLogistics({ tracking_number: trackingNo, company_code: companyCode || 'auto' })
            logisticsDataFromApi = logisticsRes.data || logisticsRes
        } catch (err) {
            console.error('获取物流信息失败', err)
        }
    }
    if (logisticsDataFromApi) {
        // 快递100返回的数据格式：
        // { message: "ok", nu: "单号", com: "公司编码", state: "状态", data: [...] }
        
        // 提取快递公司（com字段是公司编码，需要转换为公司名称）
        const companyCode = logisticsDataFromApi.com || logisticsDataFromApi.company_code
        if (companyCode) {
            // 可以保留编码，或者转换为公司名称
            order.value.logistics = logisticsDataFromApi.company || logisticsDataFromApi.company_name || logisticsDataFromApi.logistics_company || companyCode || order.value.logistics
        } else {
            order.value.logistics = logisticsDataFromApi.company || logisticsDataFromApi.company_name || logisticsDataFromApi.logistics_company || order.value.logistics
        }
        
        // 提取快递单号（nu字段）
        order.value.logisticsNo = logisticsDataFromApi.nu || logisticsDataFromApi.tracking_number || logisticsDataFromApi.trackingNumber || logisticsDataFromApi.number || order.value.logisticsNo
        
        // 提取物流状态（state字段：0在途，1揽收，2疑难，3签收；或 status/statusText 已签收）
        const state = logisticsDataFromApi.state
        const statusText = (logisticsDataFromApi.status || logisticsDataFromApi.statusText || logisticsDataFromApi.state_text || '').toString()
        const isSigned = state === '3' || state === 3 || /已签收|签收|妥投/i.test(statusText)
        if (isSigned) {
            order.value.logisticsStatus = '已签收'
            // 当物流显示已签收时发送确认收货提醒（POST /merchant/notify-confirm-receive，每个订单只能调用一次）
            // 仅在此处触发：用户打开本详情页且物流接口返回已签收。若需在用户未打开详情时也发提醒，需后端在物流回调解到已签收时主动调该接口。
            const orderNo = order.value.orderNo || order.value.order_number || String(order.value.id)
            const sentKey = 'notifyConfirmReceiveSent_' + orderNo
            if (orderNo && !uni.getStorageSync(sentKey)) {
                notifyConfirmReceive(orderNo).then(() => {
                    uni.setStorageSync(sentKey, '1')
                }).catch(() => {})
            }
        } else if (state === '1' || state === 1) {
            order.value.logisticsStatus = '已揽收'
        } else if (state === '2' || state === 2) {
            order.value.logisticsStatus = '疑难件'
        } else {
            order.value.logisticsStatus = '运输中'
        }
        
        // 处理物流轨迹（快递100的data字段是数组，倒序排列，最新的在第一个）
        const tracesData = logisticsDataFromApi.data || logisticsDataFromApi.traces || logisticsDataFromApi.trace || logisticsDataFromApi.logistics_traces || []
        if (Array.isArray(tracesData) && tracesData.length > 0) {
            // 转换快递100的数据格式为统一格式
            // 注意：实际数据可能只有 time, ftime, context 字段
            order.value.logisticsTraces = tracesData.map(trace => ({
                desc: trace.context || trace.desc || trace.description || trace.remark || '',
                time: trace.ftime || trace.time || trace.datetime || trace.accept_time || '',
                // 以下字段可能不存在，但保留兼容性
                areaCode: trace.areaCode || trace.area_code || '',
                areaName: trace.areaName || trace.area_name || '',
                status: trace.status || trace.statusCode || '',
                statusCode: trace.statusCode || trace.status_code || ''
            }))
            
            // 如果有轨迹，使用最新轨迹的时间作为物流时间
            if (order.value.logisticsTraces.length > 0) {
                order.value.logisticsTime = order.value.logisticsTraces[0].time || order.value.logisticsTime
                // 始终使用最新轨迹的描述作为物流详情，确保与物流状态一致
                const latestTraceDesc = order.value.logisticsTraces[0].desc || ''
                if (latestTraceDesc) {
                    order.value.logistics = latestTraceDesc
                } else if (!order.value.logistics || order.value.logistics === '') {
                    // 如果没有轨迹描述，根据物流状态设置默认描述
                    if (order.value.logisticsStatus === '已签收') {
                        order.value.logistics = '包裹已签收'
                    } else if (order.value.logisticsStatus === '已揽收') {
                        order.value.logistics = '包裹已揽收'
                    } else {
                        order.value.logistics = '包裹正在运输中'
                    }
                }
            }
        } else {
            order.value.logisticsTraces = []
            // 如果没有轨迹数据，根据物流状态设置描述
            if (order.value.logisticsStatus === '已签收') {
                order.value.logistics = '包裹已签收'
            } else if (order.value.logisticsStatus === '已揽收') {
                order.value.logistics = '包裹已揽收'
            } else if (!order.value.logistics || order.value.logistics === '') {
                order.value.logistics = '包裹正在运输中'
            }
        }
        
        console.log('[订单详情] 获取到物流数据（快递100格式）:', {
            message: logisticsDataFromApi.message,
            nu: logisticsDataFromApi.nu,
            com: logisticsDataFromApi.com,
            state: logisticsDataFromApi.state,
            ischeck: logisticsDataFromApi.ischeck,
            tracesCount: order.value.logisticsTraces.length,
            logisticsStatus: order.value.logisticsStatus
        })
    } else {
        // 没有物流数据时，设置默认状态
        order.value.logisticsTraces = []
        if (order.value.status === 'pending_recv') {
            order.value.logisticsStatus = '运输中'
            order.value.logistics = '包裹正在运输中'
        } else if (order.value.status === 'completed') {
            order.value.logisticsStatus = '已签收'
            order.value.logistics = '包裹已签收'
        }
    }
}
			

	} catch (error) {
		uni.hideLoading()
		console.error('获取订单详情失败', error)
		uni.showToast({ 
			title: error.message || error.msg || '加载订单失败', 
			icon: 'none',
			duration: 3000
		})
		// API 失败时返回空数据
		order.value = {
			id: 0,
			orderNo: orderNumber || '',
			status: '',
			createTime: '',
			payTime: '',
			productAmount: 0,
			shippingFee: 0,
			couponAmount: 0,
			pointsDeduction: 0,
			totalAmount: 0,
			logistics: '',
			logisticsStatus: '',
			logisticsNo: '',
			logisticsTime: '',
			logisticsTraces: [],
			address: {},
			products: []
		}
	} finally {
		orderDetailLoadingRef.value = false
	}
}


const formatTime = (timestamp) => {
	if (!timestamp) return ''
	const date = new Date(timestamp)
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	return `${year}-${month}-${day} ${hours}:${minutes}`
}

const format4Decimals = (val) => {
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

const getStatusIcon = (status) => {
	const icons = {
		pending_pay: '💰',
		pending_ship: '📦',
		pending_recv: '🚚',
		completed: '✅',
		cancelled: '❌',
		refunding: '🔄',
		refunded: '✅'
	}
	return icons[status] || '❓'
}

const getStatusIconClass = (status) => {
	const iconClasses = {
		pending: 'icon-butie',
		pending_pay: 'icon-butie',
		completed: 'icon-chenggong',
		cancelled: 'icon-shibai'
	}
	return iconClasses[status] || ''
}

const getStatusText = (status) => {
	const texts = {
		pending_pay: '待付款',      // 默认值，下单后的初始状态
		pending_ship: '待发货',     // 支付完成
		pending_recv: '待收货',     // 商家已发货
		completed: '交易成功',      // 用户确认或自动收货
		cancelled: '交易关闭',      // 用户/系统关闭订单
		refunding: '退款中',        // 发起退款申请
		refunded: '已退款'          // 退款流程结束
	}
	return texts[status] || '未知状态'
}

const handleCancel = () => {
	uni.showModal({
		title: '取消订单',
		content: '确定要取消该订单吗？',
		success: (res) => {
			if (res.confirm) {
				// 调用取消订单的异步函数
				doCancelOrder()
			}
		}
	})
}

// 执行取消订单操作
const doCancelOrder = async () => {
	try {
		await cancelOrder(order.value.orderNo)
		order.value.status = 'cancelled'
		uni.showToast({ title: '订单已取消' })
		// 延迟返回上一页
		setTimeout(() => {
			uni.navigateBack()
		}, 1500)
	} catch (error) {
		console.error('取消订单失败', error)
		uni.showToast({ title: '取消失败', icon: 'none' })
	}
}

const handlePay = () => {
	uni.showToast({ title: '跳转支付...', icon: 'loading' })
}

const handleReceive = () => {
	// 统一流程：先调起微信确认收货组件（须传 transaction_id 或 merchant_id+merchant_trade_no），用户确认后由 App.onShow 回调里调用 confirm-receive
	// #ifdef MP-WEIXIN
	const wxEnv = typeof wx !== 'undefined' ? wx : null
	const transactionId = String(order.value.transaction_id || order.value.transactionId || '').trim()
	const merchantId = String(order.value.merchant_id || order.value.mch_id || config.wechatMerchantId || uni.getStorageSync('wechat_merchant_id') || '').trim()
	const merchantTradeNo = String(order.value.orderNo || '').trim()
	const canOpenComponent = transactionId || (merchantId && merchantTradeNo)
	if (wxEnv && wxEnv.openBusinessView && canOpenComponent) {
		const extraData = {
			merchant_trade_no: merchantTradeNo,
			transaction_id: transactionId || undefined
		}
		if (merchantId) extraData.merchant_id = String(merchantId)
		console.log('[订单详情] 调起确认收货组件 extraData', extraData)
		uni.setStorageSync('pending_confirm_receive', JSON.stringify({
			orderNo: order.value.orderNo,
			transactionId: order.value.transaction_id || order.value.transactionId || null,
			at: Date.now()
		}))
		wxEnv.openBusinessView({
			businessType: 'weappOrderConfirm',
			extraData,
			success: () => {},
			fail: (err) => {
				const errMsg = err && (err.errMsg || err.message || err.errorMessage || JSON.stringify(err))
				console.warn('[订单详情] 打开微信确认收货组件失败', { err, errMsg, extraData })
				const isDevToolsOnly = /开发者工具|暂不支持此 API|请使用真机/i.test(String(errMsg))
				if (isDevToolsOnly) {
					uni.showModal({
						title: '请在真机上操作',
						content: '确认收货功能需在真机微信中使用，开发者工具暂不支持。请用手机扫码预览或真机调试后再点击「确认收货」。',
						showCancel: false,
						confirmText: '知道了'
					})
					return
				}
				uni.showModal({
					title: '无法打开确认收货页',
					content: '可能原因：① 商家尚未向微信同步该订单的发货信息；② 订单号/商户号与微信侧不一致。请确认商家已发货并同步到微信后，再点击「确认收货」。\n\n微信错误：' + (errMsg || '未知'),
					showCancel: true,
					confirmText: '重试',
					cancelText: '知道了',
					success: (res) => {
						if (res.confirm) handleReceive()
					}
				})
			}
		})
	} else {
		if (!canOpenComponent) {
			console.warn('[订单详情] 缺少 transaction_id 或 merchant_id，无法调起微信组件，直接调后端')
		}
		doConfirmReceive()
	}
	// #endif
	// #ifndef MP-WEIXIN
	doConfirmReceive()
	// #endif
}

/**
 * 导航到商家（自提时使用）
 */
const navigateToMerchant = () => {
	if (!order.value.merchantAddress) {
		uni.showToast({ 
			title: '商家地址未设置', 
			icon: 'none',
			duration: 2000
		})
		return
	}
	
	// 尝试使用地址字符串打开地图导航
	// 注意：uni.openLocation 需要经纬度，如果没有经纬度，可以提示用户手动导航
	// 或者使用第三方地图API进行地理编码
	uni.showActionSheet({
		itemList: ['复制地址', '在地图中搜索'],
		success: (res) => {
			if (res.tapIndex === 0) {
				// 复制地址
				uni.setClipboardData({
					data: order.value.merchantAddress,
					success: () => {
						uni.showToast({ 
							title: '地址已复制', 
							icon: 'success',
							duration: 2000
						})
					}
				})
			} else if (res.tapIndex === 1) {
				// 在地图中搜索（使用地址字符串）
				// 注意：不同平台可能需要不同的处理方式
				// #ifdef MP-WEIXIN
				// 微信小程序可以使用 wx.openLocation，但需要经纬度
				// 如果没有经纬度，提示用户手动搜索
				uni.showModal({
					title: '导航提示',
					content: `商家地址：${order.value.merchantAddress}\n\n请在地图应用中搜索该地址进行导航`,
					showCancel: false,
					confirmText: '知道了'
				})
				// #endif
				
				// #ifdef APP-PLUS
				// APP可以使用 plus.maps 打开地图
				// 或者使用第三方地图应用
				uni.showModal({
					title: '导航提示',
					content: `商家地址：${order.value.merchantAddress}\n\n请在地图应用中搜索该地址进行导航`,
					showCancel: false,
					confirmText: '知道了'
				})
				// #endif
				
				// #ifdef H5
				// H5可以使用百度地图、高德地图等
				uni.showModal({
					title: '导航提示',
					content: `商家地址：${order.value.merchantAddress}\n\n请在地图应用中搜索该地址进行导航`,
					showCancel: false,
					confirmText: '知道了'
				})
				// #endif
			}
		}
	})
}

// 执行确认收货操作
const doConfirmReceive = async () => {
	try {
		uni.showLoading({ title: '处理中...', mask: true })
		console.log('[订单详情] 确认收货，订单号:', order.value.orderNo)
		await confirmReceive({
			order_number: order.value.orderNo,
			transaction_id: order.value.transaction_id || order.value.transactionId || undefined
		})
		
		// 立即更新本地订单状态为 completed
		order.value.status = 'completed'
		console.log('[订单详情] 已更新本地订单状态为 completed:', order.value.status)
		
		uni.hideLoading()
		uni.showToast({ title: '交易完成', icon: 'success' })
		
		// 刷新订单详情（从服务器获取最新状态）
		setTimeout(() => {
			loadOrderDetail(order.value.orderNo)
		}, 1000)
	} catch (error) {
		uni.hideLoading()
		console.error('[订单详情] 确认收货失败:', error)
		const errorMsg = error?.message || error?.msg || error?.errorMsg || '操作失败，请稍后重试'
		// 微信端未确认收货时：引导用户先去微信内确认，再点「同步收货状态」
		const isWechatNotConfirmed = /微信端未确认|微信侧未确认|未知状态/i.test(errorMsg)
		if (isWechatNotConfirmed) {
			uni.showModal({
				title: '需先在微信内确认收货',
				content: '请先在微信小程序内（订单列表或服务通知）点击「确认收货」完成操作。完成后再回到本页，点击「同步收货状态」更新订单。',
				confirmText: '同步收货状态',
				cancelText: '知道了',
				success: (res) => {
					if (res.confirm) doConfirmReceive()
				}
			})
			return
		}
		uni.showToast({ 
			title: errorMsg, 
			icon: 'none',
			duration: 2000
		})
	}
}

const copyOrderNo = () => {
	uni.setClipboardData({
		data: order.value.orderNo,
		success: () => {
			uni.showToast({ title: '复制成功', icon: 'none' })
		}
	})
}

const goToProduct = (productId) => {
	if (productId) {
		uni.navigateTo({
			url: `/subPackages/page2/pages/product/detail?id=${productId}`
		})
	}
}

/**
 * 跳转到评价页面
 */
const goToEvaluation = () => {
	if (!order.value || !order.value.products || order.value.products.length === 0) {
		uni.showToast({ title: '订单信息异常', icon: 'none' })
		return
	}
	
	// 跳转到评价页面，传递第一个商品信息（如果有多个商品，可以后续优化为列表选择）
	const product = order.value.products[0]
	uni.navigateTo({
		url: `/subPackages/page1/pages/evaluation/submit?orderId=${order.value.id}&productId=${product.productId || product.id}&productName=${encodeURIComponent(product.name)}&productImage=${encodeURIComponent(product.image || '')}&productSpec=${encodeURIComponent(product.specs || '')}`
	})
}

/**
 * 查看评价
 */
/**
 * 检查是否可以申请退款
 */
const canApplyRefund = () => {
	// 待发货和待收货状态可以申请
	if (order.value.status === 'pending_ship' || order.value.status === 'pending_recv') {
		return true
	}
	
	// 已完成状态需要检查条件
	if (order.value.status === 'completed') {
		// 1. 检查是否已经申请过退款（如果 refundStatus 不为空，说明已经申请过）
		if (order.value.refundStatus || (refundInfo.value && refundInfo.value.status)) {
			return false // 已经申请过退款，不能再次申请
		}
		
		// 2. 检查订单创建时间是否超过15天
		if (order.value.createTimeStamp > 0) {
			const now = Date.now()
			const daysDiff = (now - order.value.createTimeStamp) / (1000 * 60 * 60 * 24) // 转换为天数
			if (daysDiff > 15) {
				return false // 超过15天，不能申请退款
			}
		}
		
		// 15天内且未申请过退款，可以申请
		return true
	}
	
	return false
}

/**
 * 申请退款
 */
const goToAfterSale = () => {
	if (!order.value || !order.value.orderNo) {
		uni.showToast({ title: '订单信息异常', icon: 'none' })
		return
	}
	
	// 检查是否可以申请退款
	if (!canApplyRefund()) {
		if (order.value.status === 'completed') {
			// 检查具体原因
			if (order.value.refundStatus || (refundInfo.value && refundInfo.value.status)) {
				uni.showToast({ 
					title: '该订单已申请过退款，不能重复申请', 
					icon: 'none',
					duration: 3000
				})
			} else if (order.value.createTimeStamp > 0) {
				const now = Date.now()
				const daysDiff = (now - order.value.createTimeStamp) / (1000 * 60 * 60 * 24)
				if (daysDiff > 15) {
					uni.showToast({ 
						title: '订单已超过15天，无法申请退款', 
						icon: 'none',
						duration: 3000
					})
				}
			} else {
				uni.showToast({ 
					title: '无法申请退款，如有疑问请联系客服', 
					icon: 'none',
					duration: 3000
				})
			}
		} else {
			uni.showToast({ 
				title: '只有已支付的订单才能申请退款', 
				icon: 'none',
				duration: 3000
			})
		}
		return
	}
	
	uni.navigateTo({
		url: `/subPackages/page1/pages/order/after-sale?orderId=${order.value.id}&orderNo=${order.value.orderNo}`
	})
}

/**
 * 查询退款进度
 */
const checkRefundProgress = async () => {
	if (!order.value || !order.value.orderNo) {
		uni.showToast({ title: '订单信息异常', icon: 'none' })
		return
	}
	
	try {
		uni.showLoading({ title: '查询中...' })
		
		const result = await getRefundProgress(order.value.orderNo)
		const refund = result.data || result
		
		// 更新退款信息
		refundInfo.value = refund
		
		uni.hideLoading()
		
		// 显示自定义退款进度弹窗
		showRefundModal.value = true
	} catch (error) {
		uni.hideLoading()
		console.error('查询退款进度失败:', error)
		uni.showToast({
			title: error.message || '查询失败',
			icon: 'none',
			duration: 2000
		})
	}
}

/**
 * 获取退款状态文本
 */
const getRefundStatusText = (status) => {
	if (!status) return '未知'
	const statusLower = String(status).toLowerCase()
	const statusMap = {
		pending: '待审核',
		applied: '待审核',
		approved: '已通过',
		rejected: '已拒绝',
		completed: '已完成',
		success: '退款成功',
		refunded: '已退款'
	}
	return statusMap[statusLower] || status || '待审核'
}

/**
 * 检查是否有退款状态（用于判断是否显示退款信息卡片）
 */
const hasRefundStatus = () => {
	// 如果是退款中或已退款状态，且有退款信息，则显示
	if ((order.value.status === 'refunding' || order.value.status === 'refunded') && refundInfo.value) {
		return true
	}
	
	// 如果是已完成状态，检查是否有退款状态
	if (order.value.status === 'completed') {
		// 检查退款状态是否不为空
		const refundStatus = (refundInfo.value && refundInfo.value.status) || order.value.refundStatus
		// 只有当退款状态不为空（不是 null、undefined、空字符串）时才显示
		if (refundStatus && String(refundStatus).trim() !== '') {
			return true
		}
	}
	
	return false
}

/**
 * 获取退款状态用于显示（已完成订单）
 */
const getRefundStatusForDisplay = () => {
	// 优先使用 refundInfo.status，其次使用 order.refundStatus
	const status = (refundInfo.value && refundInfo.value.status) || order.value.refundStatus || 'pending'
	const statusLower = String(status).toLowerCase()
	
	// 如果是 success，返回 success；如果是 rejected，返回 rejected；其他返回 pending
	if (statusLower === 'success' || statusLower === 'approved' || statusLower === 'completed' || statusLower === 'refunded') {
		return 'success'
	} else if (statusLower === 'rejected') {
		return 'rejected'
	}
	return 'pending'
}

/**
 * 获取退款状态文本用于显示（已完成订单）
 */
const getRefundStatusTextForDisplay = () => {
	// 优先使用 refundInfo.status，其次使用 order.refundStatus
	const status = (refundInfo.value && refundInfo.value.status) || order.value.refundStatus || null
	
	if (!status) {
		// 如果没有状态但有退款原因，说明是退款订单
		if (order.value.refundReason || (refundInfo.value && refundInfo.value.reason_code)) {
			return '退款处理中'
		}
		return '未知'
	}
	
	const statusLower = String(status).toLowerCase()
	
	// 根据状态返回对应的文本
	if (statusLower === 'success' || statusLower === 'approved' || statusLower === 'completed' || statusLower === 'refunded') {
		return '退款成功'
	} else if (statusLower === 'rejected') {
		return '退款失败'
	} else if (statusLower === 'pending' || statusLower === 'applied') {
		return '退款处理中'
	}
	
	return getRefundStatusText(status)
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
 * 加载平台退货地址
 */
const loadPlatformReturnAddress = async () => {
	try {
		console.log('[订单详情] 开始加载平台退货地址')
		const res = await getReturnAddress()
		console.log('[订单详情] 平台退货地址API完整响应:', JSON.stringify(res, null, 2))
		
		// 解析响应数据
		// 根据API文档，返回的是字符串格式
		let data = null
		
		// 处理不同的响应格式
		if (res && typeof res === 'object') {
			// 如果res有data字段
			if (res.data !== undefined) {
				data = res.data
			} 
			// 如果res本身就是数据
			else if (typeof res === 'string' || res.province || res.city || res.detail || res.address) {
				data = res
			}
		} else if (typeof res === 'string') {
			data = res
		}
		
		console.log('[订单详情] 解析后的数据:', data, '类型:', typeof data)
		
		if (data) {
			// 如果返回的是字符串（API文档显示返回string）
			if (typeof data === 'string') {
				platformReturnAddress.value = data.trim()
				console.log('[订单详情] 设置退货地址为字符串:', platformReturnAddress.value)
			} 
			// 如果返回的是对象，尝试提取地址信息
			else if (data.address) {
				platformReturnAddress.value = typeof data.address === 'string' ? data.address.trim() : String(data.address)
				console.log('[订单详情] 设置退货地址从address字段:', platformReturnAddress.value)
			} else if (data.detail || data.province || data.city) {
				// 格式化地址
				const parts = []
				if (data.province) parts.push(data.province)
				if (data.city) parts.push(data.city)
				if (data.district) parts.push(data.district)
				if (data.detail) parts.push(data.detail)
				platformReturnAddress.value = parts.join('')
				console.log('[订单详情] 设置退货地址从对象拼接:', platformReturnAddress.value)
			} else {
				console.warn('[订单详情] 无法解析退货地址数据，数据格式:', data)
				platformReturnAddress.value = ''
			}
		} else {
			console.warn('[订单详情] 退货地址数据为空')
			platformReturnAddress.value = ''
		}
		
		console.log('[订单详情] 最终设置的退货地址:', platformReturnAddress.value)
	} catch (error) {
		console.error('[订单详情] 加载平台退货地址失败', error)
		console.error('[订单详情] 错误详情:', {
			message: error.message,
			code: error.code,
			statusCode: error.statusCode,
			data: error.data
		})
		platformReturnAddress.value = ''
	}
}


const viewEvaluation = () => {
	// 跳转到我的评价页面
	uni.navigateTo({
		url: '/subPackages/page1/pages/evaluation/list'
	})
}

let currentOrderNumber = null

/**
 * 从多种来源解析订单号（兼容微信通知跳转时 query 在不同位置的情况）
 */
function resolveOrderNumberFromLoad(options) {
	// 1) 直接参数（navigateTo 或 订阅消息 page 带 ?orderNo=xxx）
	const direct = options.orderNo || options.id || options.order_no
	if (direct) return String(direct).trim()

	// 2) 从启动/进入参数取（部分环境下微信通知点击后 query 在这里）
	try {
		if (typeof uni.getEnterOptionsSync === 'function') {
			const enter = uni.getEnterOptionsSync()
			const q = (enter && enter.query) || {}
			const fromEnter = q.orderNo || q.id || q.order_no
			if (fromEnter) return String(fromEnter).trim()
		}
	} catch (e) {
		// ignore
	}

	// 3) 从 path 中解析（如 path 为 "pages/order/detail?orderNo=ORDER123"）
	const path = (options && options.path) || ''
	const qIndex = path.indexOf('?')
	if (qIndex !== -1) {
		const queryStr = path.substring(qIndex + 1)
		const params = new URLSearchParams(queryStr)
		const fromPath = params.get('orderNo') || params.get('id') || params.get('order_no')
		if (fromPath) return String(fromPath).trim()
	}
	return ''
}

onLoad((options) => {
	options = options || {}
	const orderNumber = resolveOrderNumberFromLoad(options)
	if (orderNumber) {
		currentOrderNumber = orderNumber
		loadOrderDetail(orderNumber)
	} else {
		uni.showToast({ title: '订单号不能为空', icon: 'none' })
		setTimeout(() => {
			uni.navigateBack()
		}, 1500)
	}
})

onShow(() => {
	// 兜底：从确认收货组件返回时，若 App.onShow 未收到 referrerInfo，在此调后端同步
	try {
		const raw = uni.getStorageSync('pending_confirm_receive')
		if (raw) {
			const p = JSON.parse(raw)
			if (p && p.orderNo && (Date.now() - (p.at || 0)) < 120000) {
				const doSync = (isRetry) => {
				    console.log('[订单详情] onShow 兜底：调后端确认收货', p.orderNo, isRetry ? '(重试)' : '')
				    // 新增：如果没有 transactionId，则无法同步，清除记录并返回
				    if (!p.transactionId) {
				        console.warn('[订单详情] transactionId 为空，无法同步确认收货，清除记录')
				        uni.removeStorageSync('pending_confirm_receive')
				        return
				    }
				    confirmReceive({ order_number: p.orderNo, transaction_id: p.transactionId || undefined }).then(() => {
						uni.removeStorageSync('pending_confirm_receive')
						uni.showToast({ title: '收货已同步', icon: 'success' })
						if (currentOrderNumber) loadOrderDetail(currentOrderNumber)
					}).catch((err) => {
						console.warn('[订单详情] onShow 兜底确认收货失败', err)
						const msg = err && (err.message || err.msg || err.errorMsg) || ''
						const isUnknownState = /未知状态|None|未确认收货/i.test(msg)
						if (isUnknownState && !isRetry) {
							setTimeout(() => doSync(true), 3000)
							return
						}
						if (isUnknownState && isRetry) {
							uni.showModal({
								title: '状态同步中',
								content: '微信收货状态可能尚未更新。请稍后点击「重试」或返回刷新。',
								confirmText: '重试',
								cancelText: '知道了',
								success: (res) => {
									if (res.confirm) doSync(true)
								}
							})
						} else {
							uni.showToast({ title: msg || '同步失败', icon: 'none' })
							if (currentOrderNumber) loadOrderDetail(currentOrderNumber)
						}
					})
				}
				setTimeout(() => doSync(false), 3000)
			}
		}
	} catch (e) {
		// ignore
	}
	// 注意：不要在此处无条件调用 loadOrderDetail，否则每次 onShow（含首次进入、从后台切回）都会重复请求订单详情，导致同一订单号被请求多次
})
</script>

<style scoped>
.detail-page {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: 120rpx;
}

/* 状态头部 (无地图时) */
.status-header {
	background: linear-gradient(135deg, #ff9000, #ff5000);
	padding: 60rpx 40rpx 100rpx;
	display: flex;
	align-items: center;
	gap: 20rpx;
	color: #fff;
}

.status-icon-large .iconfont {
	font-size: 56rpx;
}

.status-text-large {
	font-size: 36rpx;
	font-weight: bold;
}

/* 内容主体：边距缩小，内容更宽 */
.content-body {
	position: relative;
	z-index: 10;
	padding: 0 10rpx; /* 改为10rpx左右边距，更贴合边缘 */
}

.card {
	background: #fff;
	border-radius: 20rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
}

/* 物流卡片 */
.logistics-card {
	border-top-left-radius: 20rpx;
	border-top-right-radius: 20rpx;
	padding-bottom: 20rpx;
	background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
	box-shadow: 0 4rpx 16rpx rgba(61, 107, 255, 0.08);
	border: 1rpx solid rgba(61, 107, 255, 0.1);
}

.card-item {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.icon-circle {
	width: 88rpx;
	height: 88rpx;
	background: linear-gradient(135deg, #3d6bff 0%, #5b7fff 100%);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 12rpx rgba(61, 107, 255, 0.3);
	flex-shrink: 0;
}

.icon-circle .iconfont {
	color: #ffffff;
	font-size: 40rpx;
	font-weight: bold;
}

.logistics-info {
	flex: 1;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.logistics-status-text {
	font-size: 32rpx;
	color: #3d6bff;
	font-weight: 600;
	letter-spacing: 1rpx;
	margin-bottom: 4rpx;
}

.logistics-no-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin: 8rpx 0;
}

.logistics-no {
	font-size: 26rpx;
	color: #666;
	font-weight: 500;
	background: #f5f7fa;
	padding: 6rpx 12rpx;
	border-radius: 8rpx;
	font-family: 'Courier New', monospace;
}

.copy-text-small {
	font-size: 22rpx;
	color: #3d6bff;
	border: 1rpx solid #3d6bff;
	padding: 4rpx 12rpx;
	border-radius: 6rpx;
	background: rgba(61, 107, 255, 0.05);
	transition: all 0.3s;
}

.copy-text-small:active {
	background: rgba(61, 107, 255, 0.15);
	transform: scale(0.95);
}

.logistics-detail-text {
	font-size: 28rpx;
	color: #333;
	line-height: 1.6;
	margin: 8rpx 0;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	text-overflow: ellipsis;
}

.logistics-time-text {
	font-size: 24rpx;
	color: #999;
	margin-top: 4rpx;
	display: flex;
	align-items: center;
	gap: 6rpx;
}

.logistics-time-text::before {
	content: '🕐';
	font-size: 20rpx;
}

/* 物流展开详情列表 */
.logistics-traces {
	margin-top: 32rpx;
	border-top: 2rpx dashed #e8ecf0;
	padding-top: 24rpx;
	background: linear-gradient(to bottom, rgba(248, 249, 255, 0.5) 0%, transparent 100%);
	border-radius: 0 0 20rpx 20rpx;
	margin-left: -32rpx;
	margin-right: -32rpx;
	padding-left: 32rpx;
	padding-right: 32rpx;
}

.trace-item {
	display: flex;
	gap: 24rpx;
	margin-bottom: 28rpx;
	position: relative;
	padding-left: 8rpx;
	transition: all 0.3s;
}

.trace-item:last-child {
	margin-bottom: 0;
}

.trace-timeline {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 36rpx;
	flex-shrink: 0;
}

.dot {
	width: 14rpx;
	height: 14rpx;
	background: #d0d7e3;
	border-radius: 50%;
	margin-top: 10rpx;
	border: 3rpx solid #ffffff;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
	z-index: 2;
	position: relative;
}

.dot.first {
	width: 20rpx;
	height: 20rpx;
	background: linear-gradient(135deg, #3d6bff 0%, #5b7fff 100%);
	border: 4rpx solid #ffffff;
	box-shadow: 0 4rpx 12rpx rgba(61, 107, 255, 0.4), 0 0 0 4rpx rgba(61, 107, 255, 0.1);
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0%, 100% {
		box-shadow: 0 4rpx 12rpx rgba(61, 107, 255, 0.4), 0 0 0 4rpx rgba(61, 107, 255, 0.1);
	}
	50% {
		box-shadow: 0 4rpx 12rpx rgba(61, 107, 255, 0.4), 0 0 0 8rpx rgba(61, 107, 255, 0.05);
	}
}

.line {
	width: 3rpx;
	flex: 1;
	background: linear-gradient(to bottom, #e8ecf0 0%, #f0f4f8 100%);
	margin-top: 10rpx;
	border-radius: 2rpx;
}

.trace-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	padding: 8rpx 0;
}

.trace-desc {
	font-size: 28rpx;
	color: #333;
	line-height: 1.6;
	font-weight: 400;
	word-break: break-all;
}

.trace-item:first-child .trace-desc {
	color: #3d6bff;
	font-weight: 500;
}

.trace-time {
	font-size: 22rpx;
	color: #999;
	display: flex;
	align-items: center;
	gap: 6rpx;
}

.trace-time::before {
	content: '⏰';
	font-size: 18rpx;
}

.expand-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	padding: 20rpx 0;
	margin-top: 16rpx;
	border-top: 1rpx solid #f0f4f8;
	cursor: pointer;
	transition: all 0.3s;
}

.expand-bar:active {
	background: rgba(61, 107, 255, 0.05);
	border-radius: 12rpx;
}

.expand-text {
	font-size: 26rpx;
	color: #3d6bff;
	font-weight: 500;
}

.icon-arrow-down {
	font-size: 24rpx;
	color: #3d6bff;
	transition: transform 0.3s ease;
	font-weight: bold;
}

.icon-arrow-down.rotated {
	transform: rotate(180deg);
}

/* 地址卡片 */
.address-icon .iconfont {
	color: #ff5000;
	font-size: 40rpx;
}

.address-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.user-row {
	display: flex;
	align-items: baseline;
	gap: 16rpx;
}

.user-name {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}

.user-phone {
	font-size: 26rpx;
	color: #999;
}

.navigate-btn {
	font-size: 24rpx;
	color: #3d6bff;
	background: #f0f4ff;
	border: 1rpx solid #3d6bff;
	border-radius: 20rpx;
	padding: 8rpx 20rpx;
	margin-left: auto;
}

.address-text {
	font-size: 26rpx;
	color: #333;
	line-height: 1.4;
}

/* 商品列表 */
.product-item {
	display: flex;
	gap: 20rpx;
	margin-bottom: 24rpx;
}

.product-img {
	width: 160rpx;
	height: 160rpx;
	border-radius: 12rpx;
	background: #f9f9f9;
}

.product-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.product-title {
	font-size: 28rpx;
	color: #333;
	line-height: 1.4;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.product-specs {
	font-size: 24rpx;
	color: #999;
	background: #f9f9f9;
	padding: 4rpx 10rpx;
	border-radius: 4rpx;
	align-self: flex-start;
}

.product-price-row {
	display: flex;
	align-items: baseline;
}

.price-symbol {
	font-size: 24rpx;
	color: #ff5000;
}

.price-num {
	font-size: 36rpx;
	font-weight: bold;
	color: #ff5000;
	margin-right: 10rpx;
}

.product-num {
	font-size: 24rpx;
	color: #999;
}

.order-calc {
	border-top: 1rpx solid #eee;
	padding-top: 20rpx;
}

.calc-row {
	display: flex;
	justify-content: space-between;
	font-size: 26rpx;
	color: #666;
	margin-bottom: 12rpx;
}

.calc-row .value.red {
	color: #ff5000;
}

.calc-row.total-row {
	margin-top: 20rpx;
	align-items: flex-end;
}

.total-price {
	font-size: 34rpx;
	color: #ff5000;
	font-weight: bold;
}

/* 订单信息 */
.info-row {
	display: flex;
	justify-content: space-between;
	font-size: 24rpx;
	margin-bottom: 16rpx;
}

.info-row:last-child {
	margin-bottom: 0;
}

.info-row .label {
	color: #999;
}

.info-row .value {
	color: #333;
}

/* 退款信息卡片 */
.refund-info-card {
	margin-bottom: 20rpx;
}

.card-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
	padding: 30rpx 30rpx 20rpx;
	border-bottom: 1rpx solid #f5f5f5;
}

.refund-info-content {
	padding: 20rpx 30rpx 30rpx;
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

.refund-status-text.status-success {
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

.value-box {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.copy-tag {
	font-size: 20rpx;
	color: #666;
	border: 1rpx solid #ddd;
	padding: 2rpx 10rpx;
	border-radius: 12rpx;
}

/* 底部栏 */
.bottom-action-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: #fff;
	padding: 20rpx 30rpx;
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	display: flex;
	justify-content: flex-end;
	box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
	z-index: 100;
}

.action-buttons {
	display: flex;
	gap: 20rpx;
}

.btn {
	margin: 0;
	font-size: 28rpx;
	padding: 0 36rpx;
	height: 68rpx;
	line-height: 68rpx;
	border-radius: 34rpx;
}

.btn.plain {
	background: #fff;
	color: #666;
	border: 1rpx solid #ccc;
}

.btn.primary {
	background: linear-gradient(90deg, #ff9000, #ff5000);
	color: #fff;
	border: none;
}

.btn.secondary {
	background: #fff;
	color: #ff5000;
	border: 1rpx solid #ff5000;
}

/* 退款进度弹窗 */
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
	animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.refund-modal {
	width: 90%;
	max-width: 600rpx;
	background: #fff;
	border-radius: 24rpx;
	overflow: hidden;
	animation: slideUp 0.3s ease;
}

@keyframes slideUp {
	from {
		transform: translateY(100rpx);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

.modal-header {
	position: relative;
	padding: 40rpx 30rpx 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
	text-align: center;
}

.modal-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.modal-close {
	position: absolute;
	right: 30rpx;
	top: 50%;
	transform: translateY(-50%);
	font-size: 48rpx;
	color: #999;
	width: 60rpx;
	height: 60rpx;
	line-height: 60rpx;
	text-align: center;
	border-radius: 50%;
	transition: all 0.3s;
}

.modal-close:active {
	background: #f5f5f5;
}

.modal-body {
	padding: 30rpx;
	max-height: 60vh;
	overflow-y: auto;
}

.refund-info-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.info-item {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	padding-bottom: 24rpx;
	border-bottom: 1rpx solid #f5f5f5;
}

.info-item:last-child {
	border-bottom: none;
	padding-bottom: 0;
}

.info-label {
	font-size: 28rpx;
	color: #666;
	min-width: 140rpx;
	flex-shrink: 0;
}

.info-value {
	font-size: 28rpx;
	color: #333;
	flex: 1;
	text-align: right;
	word-break: break-all;
}

.info-value.reason-text,
.info-value.reject-text {
	text-align: left;
	margin-top: 8rpx;
	line-height: 1.6;
}

.info-value.reject-text {
	color: #ff4d4f;
}

.status-badge {
	display: inline-block;
	padding: 8rpx 20rpx;
	border-radius: 20rpx;
	font-size: 24rpx;
	font-weight: 500;
}

.status-badge.status-pending,
.status-badge.status-applied {
	background: #fff7e6;
	color: #fa8c16;
}

.status-badge.status-approved {
	background: #f6ffed;
	color: #52c41a;
}

.status-badge.status-rejected {
	background: #fff2f0;
	color: #ff4d4f;
}

.status-badge.status-completed {
	background: #e6f7ff;
	color: #1890ff;
}

.empty-refund {
	text-align: center;
	padding: 60rpx 0;
}

.empty-text {
	font-size: 28rpx;
	color: #999;
}

.modal-footer {
	padding: 20rpx 30rpx 30rpx;
	border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border-radius: 44rpx;
	font-size: 32rpx;
	font-weight: bold;
	border: none;
	text-align: center;
}

.modal-btn:active {
	opacity: 0.8;
}
</style>
