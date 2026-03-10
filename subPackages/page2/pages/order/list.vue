<template>
	<view class="order-page">
		<scroll-view 
			class="page-scroll"
			scroll-y
			refresher-enabled
			:refresher-triggered="refreshing"
			@refresherrefresh="onRefresh"
			@refresherrestore="onRestore"
			@scrolltolower="loadMore"
			:lower-threshold="100"
		>
		<!-- 订单状态标签 -->
		<view class="tabs-section">
			<scroll-view class="tabs-scroll" scroll-x>
				<view class="tabs-list">
					<view
						class="tab-item"
						:class="{ active: currentTab === item.value }"
						v-for="item in tabs"
						:key="item.value"
						@tap="switchTab(item.value)"
					>
						<text class="tab-text">{{ item.label }}</text>
						<view class="tab-badge" v-if="item.count > 0">{{ item.count }}</view>
					</view>
				</view>
			</scroll-view>
		</view>
		
		<!-- 排序栏 -->
		<view class="sort-bar">
			<text class="sort-btn" @tap="showSortMenu">
				{{ currentSort.label }}
				<text class="sort-icon">▼</text>
			</text>
			<text class="mark-read-btn" @tap="markAllOrdersAsRead" :class="{ disabled: markingRead }">
				{{ markingRead ? '处理中...' : '一键已读' }}
			</text>
		</view>

		<!-- 订单列表 -->
		<view class="order-list">
			<view class="order-item" v-for="item in orderList" :key="item.id" @tap="goToDetail(item.orderNo || item.id)">
				<view class="order-header">
					<text class="order-no">订单号：{{ item.orderNo }}</text>
					<view class="header-right">
						<!-- 待付款订单显示倒计时 -->
						<view class="countdown-wrapper" v-if="item.status === 'pending_pay' && item.expireAt">
							<text class="countdown-label">剩余支付时间：</text>
							<text class="countdown-time" :class="{ 'countdown-warning': getCountdown(item.expireAt, countdownTick).isWarning }">
								{{ getCountdown(item.expireAt, countdownTick).text }}
							</text>
						</view>
						<text class="order-status" :class="'status-' + item.status">{{ getStatusText(item.status) }}</text>
					</view>
				</view>

				<view class="order-products">
					<view class="product-item" v-for="(product, index) in item.products" :key="index">
						<image 
							:src="product.image || '/static/logo.png'" 
							mode="aspectFill" 
							class="product-image"
							@error="handleImageError"
						/>
						<view class="product-info">
							<text class="product-name">{{ product.name }}</text>
							<view class="product-bottom">
								<text class="product-price">¥{{ product.price }}</text>
								<text class="product-quantity">x{{ product.quantity }}</text>
							</view>
						</view>
					</view>
				</view>

				<view class="order-footer">
					<view class="order-amount">
						<text class="amount-label">实付款：</text>
						<text class="amount-value">¥{{ item.actualAmount || item.totalAmount }}</text>
					</view>
					<view class="order-actions">
						<!-- 待付款状态才显示"去支付"按钮 -->
						<button class="action-btn" v-if="item.status === 'pending_pay'" @tap.stop="handlePay(item)">
							去支付
						</button>
						<!-- 待收货状态显示"确认收货"按钮 -->
						<button class="action-btn" v-if="item.status === 'pending_recv'" @tap.stop="handleReceive(item)">
							确认收货
						</button>
					<!-- 申请退款：待发货、待收货状态可以申请，已完成状态在15天内且未申请过退款可以申请 -->
					<button 
						class="action-btn refund" 
						v-if="canApplyRefundInList(item)" 
						@tap.stop="goToAfterSale(item)"
					>
						申请退款
					</button>
					<!-- 已完成状态：显示联系客服按钮（如果不可申请退款） -->
					<button 
						class="action-btn contact" 
						v-if="item.status === 'completed' && !canApplyRefundInList(item)" 
						@tap.stop="showContactService"
					>
						联系客服
					</button>
					<!-- 待售后订单：查询退款进度 -->
					<button 
						class="action-btn secondary" 
						v-if="item.status === 'refunding'" 
						@tap.stop="checkRefundProgress(item)"
					>
						查询退款进度
					</button>
						<button class="action-btn secondary" @tap.stop="goToDetail(item.orderNo || item.id)">查看详情</button>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-state" v-if="orderList.length === 0">
				<text class="empty-icon">📦</text>
				<text class="empty-text">暂无订单</text>
			</view>

			<!-- 分页：加载更多 / 没有更多 -->
			<view v-if="orderList.length > 0" class="load-more-bar">
				<text v-if="loadingMore" class="load-more-text">加载中...</text>
				<text v-else-if="!hasMore" class="load-more-text no-more">没有更多了</text>
				<text v-else class="load-more-text">上拉加载更多</text>
			</view>
		</view>
		</scroll-view>
		
		<!-- 退款进度弹窗 -->
		<view class="modal-mask" v-if="showRefundModal" @tap="closeRefundModal" @touchmove.stop.prevent>
			<view class="modal-content refund-modal" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">退款进度</text>
					<text class="modal-close" @tap="closeRefundModal">×</text>
				</view>
				<view class="modal-body">
					<view v-if="currentRefundInfo && (currentRefundInfo.status || currentRefundInfo.refund_type || currentRefundInfo.reason_code)" class="refund-info-list">
						<view class="info-item" v-if="currentRefundInfo.status">
							<text class="info-label">退款状态</text>
							<view class="info-value">
								<text class="status-badge" :class="'status-' + (currentRefundInfo.status || '').toLowerCase()">
									{{ getRefundStatusText(currentRefundInfo.status) }}
								</text>
							</view>
						</view>
						<view class="info-item" v-if="currentRefundInfo.refund_type">
							<text class="info-label">退款类型</text>
							<text class="info-value">{{ getRefundTypeText(currentRefundInfo.refund_type) }}</text>
						</view>
						<view class="info-item" v-if="currentRefundInfo.reason_code">
							<text class="info-label">售后原因</text>
							<text class="info-value reason-text">{{ currentRefundInfo.reason_code }}</text>
						</view>
						<view class="info-item" v-if="currentRefundInfo.reject_reason">
							<text class="info-label">
								{{ (currentRefundInfo.status === 'approved' || currentRefundInfo.status === 'success') && currentRefundInfo.refund_type && currentRefundInfo.refund_type.includes('return') ? '退货地址' : '拒绝原因' }}
							</text>
							<text class="info-value" :class="(currentRefundInfo.status === 'approved' || currentRefundInfo.status === 'success') && currentRefundInfo.refund_type && currentRefundInfo.refund_type.includes('return') ? '' : 'reject-text'">
								{{ currentRefundInfo.reject_reason }}
							</text>
						</view>
						<view class="info-item" v-if="currentRefundInfo.created_at || currentRefundInfo.createdAt">
							<text class="info-label">申请时间</text>
							<text class="info-value">{{ formatTime(currentRefundInfo.created_at || currentRefundInfo.createdAt) }}</text>
						</view>
						<view class="info-item" v-if="currentRefundInfo.updated_at || currentRefundInfo.updatedAt">
							<text class="info-label">更新时间</text>
							<text class="info-value">{{ formatTime(currentRefundInfo.updated_at || currentRefundInfo.updatedAt) }}</text>
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
import { ref, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrderList, getOrderDetail, confirmReceive } from '@/api/order.js'
import { getRefundProgress } from '../../api/refund.js'

const tabs = ref([
	{ label: '全部', value: 'all', count: 0 },
	{ label: '待付款', value: 'pending_pay', count: 0 },
	{ label: '待发货', value: 'pending_ship', count: 0 },
	{ label: '待收货', value: 'pending_recv', count: 0 },
	{ label: '待售后', value: 'refunding', count: 0 },
	{ label: '已完成', value: 'completed', count: 0 }
])

// 默认进入时选中「全部」
const currentTab = ref('all')
const orderList = ref([])
const refreshing = ref(false)
const markingRead = ref(false)

// 分页：先看一页，滑到底再加载下一页
const page = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
const loadingMore = ref(false)

// 排序选项
const sortOptions = [
	{ label: '按时间排序', value: 'time', order: 'desc' },
	{ label: '按金额排序', value: 'amount', order: 'desc' }
]
const currentSort = ref(sortOptions[0])

// 所有订单数据
const allOrders = ref([])
/** 本会话内已确认收货的订单号（下拉/接口若仍返回待收货，则优先以 completed 展示，避免闪回待收货） */
const recentlyConfirmedOrderNos = ref(new Set())

// 倒计时定时器
let countdownTimer = null

// 倒计时更新计数器（用于触发响应式更新）
const countdownTick = ref(0)

/**
 * 切换标签
 */
const switchTab = (tab) => {
	console.log('[订单列表] 切换标签:', tab, '当前标签:', currentTab.value)
	currentTab.value = tab
	filterOrderList()
	console.log('[订单列表] 切换后，当前标签:', currentTab.value, '订单数量:', orderList.value.length)
}

/**
 * 加载订单列表（分页：先一页，滑到底加载下一页）
 * @param {boolean} append 是否追加模式（触底加载下一页）
 */
const loadOrderList = async (append = false) => {
	try {
		// 获取当前用户ID
		const userInfo = uni.getStorageSync('userInfo') || {}
		const userId = userInfo.id || userInfo.user_id
		
		if (!userId) {
			console.error('用户ID不存在，无法加载订单列表')
			allOrders.value = []
			filterOrderList()
			return
		}
		
		if (!append) {
			page.value = 1
			hasMore.value = true
		}
		
		// GET /order/{user_id}，分页参数 page、pageSize（与商户端一致：先一页，触底再加载下一页）
		const params = {
			userId,
			page: page.value,
			pageSize: pageSize.value,
			_t: append ? undefined : Date.now()
		}
		
		const res = await getOrderList(params)
		
		// 将后端数据转换为前端格式
		// 支持多种响应格式：res.data.list, res.data, res（直接是数组）
		let orderData = []
		if (Array.isArray(res.data?.list)) {
			orderData = res.data.list
		} else if (Array.isArray(res.data)) {
			orderData = res.data
		} else if (Array.isArray(res)) {
			orderData = res
		}
		
		const pagination = res.data?.pagination || res.pagination
		// 分页信息：有则用，没有则根据本页条数判断；追加时若本页为空则不再加载
		if (append && orderData.length === 0) {
			hasMore.value = false
		} else {
			if (pagination && (pagination.total != null || pagination.has_next !== undefined)) {
				if (pagination.has_next === false) hasMore.value = false
				else if (pagination.total != null) hasMore.value = (allOrders.value.length + orderData.length) < pagination.total
				else hasMore.value = orderData.length >= pageSize.value
			} else {
				hasMore.value = orderData.length >= pageSize.value
			}
		}
		
		const orders = orderData.map(order => {
			const rawStatus = order.status ?? order.order_status ?? order.state
			const status = normalizeOrderStatus(rawStatus)
			// 订单号归一化：优先业务单号，避免同单多条/漏显
			const rawOrderNo = (order.order_no || order.orderNo || order.order_number || order.trade_no || order.out_trade_no || '').toString().trim()
			const orderNo = rawOrderNo || String(order.id || '')
			return {
			id: order.id,
			orderNo,
			transaction_id: order.transaction_id || order.transactionId || '',
			merchant_id: order.merchant_id || order.mch_id || '',
			deliveryWay: order.delivery_way || order.deliveryWay || 'platform',
			status,
			totalAmount: parseFloat(order.total_amount || order.totalAmount || 0),
			actualAmount: parseFloat(order.actual_amount || order.actualAmount || order.total_amount || order.totalAmount || 0),
			createTime: new Date(order.created_at || order.createTime || order.create_time).getTime(),
			expireAt: order.expire_at || order.expireAt || null, // 订单过期时间（待付款订单自动删除时间）
			refundStatus: order.refund_status || order.refundStatus || null, // 退款状态
			is_read: order.is_read !== undefined ? order.is_read : (order.is_read === 0 ? 0 : 1), // 默认已读，除非明确标记为未读
			products: (order.items || order.products || order.order_items || []).map(item => ({
				id: item.product_id || item.id,
				name: item.product_name || item.name,
				image: item.product_image || item.image || '/static/logo.png',
				price: parseFloat(item.unit_price || item.price || 0),
				quantity: parseInt(item.quantity || 1)
			}))
		}
		})
		
		// 按订单号去重：同一订单号只保留一条（保留 createTime 最新的一条），避免重复展示
		const toTime = (t) => (t ? new Date(t).getTime() : 0)
		const baseList = append ? [...allOrders.value] : []
		const merged = [...baseList, ...orders]
		const byOrderNo = {}
		merged.forEach(o => {
			const no = String(o.orderNo || '').trim()
			if (!no) return
			const existing = byOrderNo[no]
			if (!existing || toTime(o.createTime) >= toTime(existing.createTime)) {
				byOrderNo[no] = o
			}
		})
		allOrders.value = Object.values(byOrderNo).sort((a, b) => toTime(b.createTime) - toTime(a.createTime))
		if (pagination && pagination.total != null) {
			hasMore.value = allOrders.value.length < pagination.total
		}
		console.log('[订单列表] 加载成功，共', allOrders.value.length, '条订单', append ? '(追加)' : '(首页)')
		
		// 启动倒计时（如果有待付款订单）
		startCountdown()
	
	// 更新标签计数 - 只统计未读订单
	updateTabCounts()
	
	filterOrderList()
	} catch (error) {
		console.error('获取订单列表失败', error)
		allOrders.value = []
		// 更新标签计数 - 确保没有订单时不显示红点
		tabs.value.forEach(tab => {
			tab.count = 0
		})
		filterOrderList()
	}
}

/**
 * 筛选订单列表
 */
const filterOrderList = () => {
	console.log('[订单列表] 筛选订单，当前标签:', currentTab.value, '总订单数:', allOrders.value.length)
	if (currentTab.value === 'all') {
		orderList.value = [...allOrders.value]
	} else {
		// 按状态筛选：pending_pay（待付款）、pending_ship（待发货）、pending_recv（待收货）、refunding（退款中）、completed（已完成）
		orderList.value = allOrders.value.filter(order => {
			const match = order.status === currentTab.value
			if (currentTab.value === 'completed') {
				console.log('[订单列表] 筛选已完成订单，订单号:', order.orderNo, '状态:', order.status, '匹配:', match)
			}
			return match
		})
	}
	console.log('[订单列表] 筛选后，显示订单数:', orderList.value.length)
	sortOrderList()
}

/**
 * 排序订单列表
 */
const sortOrderList = () => {
	orderList.value.sort((a, b) => {
		if (currentSort.value.value === 'amount') {
			return currentSort.value.order === 'desc' 
				? b.totalAmount - a.totalAmount 
				: a.totalAmount - b.totalAmount
		} else {
			// 按时间排序
			return currentSort.value.order === 'desc' 
				? b.createTime - a.createTime 
				: a.createTime - b.createTime
		}
	})
}

/**
 * 显示排序菜单
 */
const showSortMenu = () => {
	uni.showActionSheet({
		itemList: sortOptions.map(item => item.label),
		success: (res) => {
			currentSort.value = sortOptions[res.tapIndex]
			sortOrderList()
		}
	})
}

/**
 * 规范化订单状态：兼容后端返回 order_status/state、数字或大小写不一致
 */
const normalizeOrderStatus = (raw) => {
	if (raw == null || raw === '') return 'pending_pay'
	const s = String(raw).trim().toLowerCase()
	const known = ['pending_pay', 'pending_ship', 'pending_recv', 'completed', 'cancelled', 'refunding', 'refunded']
	if (known.includes(s)) return s
	const n = parseInt(raw, 10)
	if (!isNaN(n)) {
		const map = { 4: 'completed', 3: 'pending_recv', 2: 'pending_ship', 1: 'pending_pay', 0: 'pending_pay' }
		return map[n] ?? s
	}
	return s || 'pending_pay'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
	const texts = {
		pending_pay: '待付款',      // 默认值，下单后的初始状态
		pending_ship: '待发货',     // 支付完成
		pending_recv: '待收货',     // 商家已发货
		completed: '已完成',        // 用户确认或自动收货
		cancelled: '已取消',        // 用户/系统关闭订单
		refunding: '退款中',        // 发起退款申请
		refunded: '已退款'          // 退款流程结束
	}
	return texts[status] || '未知'
}

/**
 * 跳转订单详情
 * @param {String|Number} orderNumber 订单号
 */
const goToDetail = (orderNumber) => {
	// 使用订单号跳转
	uni.navigateTo({ url: `/subPackages/page1/pages/order/detail?orderNo=${encodeURIComponent(orderNumber)}` })
}

/**
 * 图片加载失败处理
 */
const handleImageError = (e) => {
	console.log('图片加载失败', e)
	// 使用默认图片
	if (e.target) {
		e.target.src = '/static/logo.png'
	}
}

/**
 * 去支付
 */
const handlePay = (order) => {
	// 构造支付数据
	const paymentData = {
		orderNo: order.orderNo,
		orderId: order.id,
		amount: order.totalAmount.toFixed(2),
		paymentMethod: 1,
		orderData: {
			items: order.products,
			totalAmount: order.totalAmount,
			actualAmount: order.actualAmount || order.totalAmount
		}
	}
	
	// 跳转到支付页面
	uni.navigateTo({
		url: `/subPackages/page1/pages/payment/payment?data=${encodeURIComponent(JSON.stringify(paymentData))}`
	})
}

/**
 * 若列表项没有 transaction_id，则拉取订单详情并补全后返回
 */
const ensureOrderTransactionId = async (order) => {
	const tid = order.transaction_id ?? order.transactionId
	if (tid != null && String(tid).trim() !== '') return order
	const orderNo = order.orderNo || order.order_number
	if (!orderNo) return order
	try {
		const res = await getOrderDetail(orderNo)
		const detail = res?.data ?? res
		const fromDetail = detail?.transaction_id ?? detail?.transactionId
		if (fromDetail != null) {
			return { ...order, transaction_id: fromDetail, transactionId: fromDetail }
		}
	} catch (e) {
		console.warn('[订单列表] 拉取订单详情获取 transaction_id 失败:', e)
	}
	return order
}

/**
 * 确认收货（仅调后端接口，不调起微信官方组件）
 */
const handleReceive = async (order) => {
	await doConfirmReceiveApi(order)
}

const doConfirmReceiveApi = async (order) => {
	try {
		order = await ensureOrderTransactionId(order)
		const tid = String(order.transaction_id || order.transactionId || '').trim()
		if (!tid) {
			uni.showToast({
				title: '该订单暂无支付流水号，无法确认收货。请联系商家或稍后再试。',
				icon: 'none',
				duration: 3000
			})
			return
		}
		uni.showLoading({ title: '处理中...', mask: true })
		console.log('[订单列表] 确认收货，订单号:', order.orderNo)
		await confirmReceive({
			order_number: order.orderNo,
			transaction_id: tid
		})
		
		// 立即切换到已完成标签
		switchTab('completed')
		
		// 立即更新本地订单状态为 completed
		const orderIndex = allOrders.value.findIndex(o => o.orderNo === order.orderNo)
		if (orderIndex !== -1) {
			allOrders.value[orderIndex].status = 'completed'
			console.log('[订单列表] 已更新本地订单状态为 completed:', allOrders.value[orderIndex])
		}
		
		// 更新标签计数
		updateTabCounts()
		// 重新筛选订单列表（此时已经在 completed 标签下）
		filterOrderList()
		
		uni.hideLoading()
		uni.showToast({ title: '收货成功', icon: 'success' })
		
		// 延迟刷新订单列表，确保从服务器获取最新数据
		setTimeout(async () => {
			await loadOrderList()
			// 刷新后确保仍在已完成标签
			if (currentTab.value !== 'completed') {
				switchTab('completed')
			}
		}, 500)
	} catch (error) {
		uni.hideLoading()
		console.error('[订单列表] 确认收货失败:', error)
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
					if (res.confirm) doConfirmReceiveApi(order)
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

/**
 * 申请售后
 */
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
 * 获取倒计时文本
 * @param {String} expireAt 过期时间字符串（ISO格式）
 * @param {Number} tick 倒计时更新计数器（用于触发响应式更新）
 * @returns {Object} { text: '倒计时文本', isWarning: 是否警告（小于5分钟） }
 */
const getCountdown = (expireAt, tick) => {
	// 使用 tick 参数确保响应式更新（即使不使用它的值）
	if (tick !== undefined) {
		// 这个参数用于触发响应式更新
	}
	
	if (!expireAt) {
		return { text: '', isWarning: false }
	}
	
	try {
		const expireTime = new Date(expireAt).getTime()
		const now = Date.now()
		const diff = expireTime - now
		
		// 如果已经过期
		if (diff <= 0) {
			return { text: '已过期', isWarning: true }
		}
		
		// 计算剩余时间
		const hours = Math.floor(diff / (1000 * 60 * 60))
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
		const seconds = Math.floor((diff % (1000 * 60)) / 1000)
		
		// 如果剩余时间小于5分钟，显示警告样式
		const isWarning = diff < 5 * 60 * 1000
		
		// 格式化显示
		if (hours > 0) {
			return { text: `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`, isWarning }
		} else {
			return { text: `${minutes}:${String(seconds).padStart(2, '0')}`, isWarning }
		}
	} catch (error) {
		console.error('[订单列表] 计算倒计时失败:', error)
		return { text: '', isWarning: false }
	}
}

/**
 * 检查并移除已过期的待付款订单
 */
const removeExpiredOrders = () => {
	const now = Date.now()
	let hasExpired = false
	
	// 检查所有订单，移除已过期的待付款订单
	allOrders.value = allOrders.value.filter(order => {
		if (order.status === 'pending_pay' && order.expireAt) {
			try {
				const expireTime = new Date(order.expireAt).getTime()
				if (expireTime <= now) {
					console.log('[订单列表] 订单已过期，自动移除:', order.orderNo)
					hasExpired = true
					return false // 移除已过期的订单
				}
			} catch (error) {
				console.error('[订单列表] 检查订单过期时间失败:', error)
			}
		}
		return true
	})
	
	// 如果有订单被移除，重新筛选和更新计数
	if (hasExpired) {
		filterOrderList()
		updateTabCounts()
	}
}

/**
 * 启动倒计时定时器
 */
const startCountdown = () => {
	// 清除旧的定时器
	if (countdownTimer) {
		clearInterval(countdownTimer)
	}
	
	// 每秒更新一次倒计时，并检查是否有订单过期
	countdownTimer = setInterval(() => {
		// 检查并移除已过期的订单
		removeExpiredOrders()
		
		// 更新计数器，触发响应式更新
		countdownTick.value = Date.now()
	}, 1000)
}

/**
 * 停止倒计时定时器
 */
const stopCountdown = () => {
	if (countdownTimer) {
		clearInterval(countdownTimer)
		countdownTimer = null
	}
}

/**
 * 检查订单列表中的订单是否可以申请退款
 */
const canApplyRefundInList = (order) => {
	// 待发货和待收货状态可以申请
	if (order.status === 'pending_ship' || order.status === 'pending_recv') {
		return true
	}
	
	// 已完成状态需要检查条件
	if (order.status === 'completed') {
		// 1. 检查是否已经申请过退款（如果 refundStatus 不为空，说明已经申请过）
		if (order.refundStatus) {
			return false // 已经申请过退款，不能再次申请
		}
		
		// 2. 检查订单创建时间是否超过15天
		if (order.createTime > 0) {
			const now = Date.now()
			const daysDiff = (now - order.createTime) / (1000 * 60 * 60 * 24) // 转换为天数
			if (daysDiff > 15) {
				return false // 超过15天，不能申请退款
			}
		}
		
		// 15天内且未申请过退款，可以申请
		return true
	}
	
	return false
}

const goToAfterSale = (order) => {
	uni.navigateTo({
		url: `/subPackages/page1/pages/order/after-sale?orderId=${order.id}&orderNo=${order.orderNo}`
	})
}

const showRefundModal = ref(false)
const currentRefundInfo = ref(null)

const closeRefundModal = () => {
	showRefundModal.value = false
}

/**
 * 更新标签计数 - 只统计未读订单
 */
const updateTabCounts = () => {
	tabs.value.forEach(tab => {
		if (tab.value === 'all') {
			// 全部：统计所有未读订单
			tab.count = allOrders.value.filter(order => {
				return order.is_read === 0 || order.is_read === false || order.is_read === null || order.is_read === undefined
			}).length
		} else if (tab.value === 'pending_pay') {
			// 待付款：只统计未读的待付款订单
			tab.count = allOrders.value.filter(order => {
				return order.status === 'pending_pay' && (order.is_read === 0 || order.is_read === false || order.is_read === null || order.is_read === undefined)
			}).length
		} else if (tab.value === 'pending_ship') {
			// 待发货：只统计未读的待发货订单
			tab.count = allOrders.value.filter(order => {
				return order.status === 'pending_ship' && (order.is_read === 0 || order.is_read === false || order.is_read === null || order.is_read === undefined)
			}).length
		} else if (tab.value === 'pending_recv') {
			// 待收货：只统计未读的待收货订单
			tab.count = allOrders.value.filter(order => {
				return order.status === 'pending_recv' && (order.is_read === 0 || order.is_read === false || order.is_read === null || order.is_read === undefined)
			}).length
		} else if (tab.value === 'refunding') {
			// 待售后：只统计未读的退款中订单
			tab.count = allOrders.value.filter(order => {
				return order.status === 'refunding' && (order.is_read === 0 || order.is_read === false || order.is_read === null || order.is_read === undefined)
			}).length
		} else {
			// 其他状态：只统计未读订单
			tab.count = allOrders.value.filter(order => {
				return order.status === tab.value && (order.is_read === 0 || order.is_read === false || order.is_read === null || order.is_read === undefined)
			}).length
		}
	})
}

/**
 * 一键已读所有订单
 */
const markAllOrdersAsRead = async () => {
	if (markingRead.value) {
		return
	}
	
	if (allOrders.value.length === 0) {
		uni.showToast({ title: '暂无订单', icon: 'none' })
		return
	}
	
	// 检查是否有未读订单（假设订单有 is_read 字段，0或false表示未读）
	const unreadOrders = allOrders.value.filter(order => {
		return order.is_read === 0 || order.is_read === false || order.is_read === null || order.is_read === undefined
	})
	
	if (unreadOrders.length === 0) {
		uni.showToast({ title: '所有订单已读', icon: 'none' })
		return
	}
	
	uni.showModal({
		title: '一键已读',
		content: `确定要将所有订单标记为已读吗？`,
		confirmText: '确定',
		confirmColor: '#3d6bff',
		cancelText: '取消',
		success: async (res) => {
			if (res.confirm) {
				markingRead.value = true
				uni.showLoading({ title: '处理中...', mask: true })
				
				try {
					// 本地标记所有订单为已读
					allOrders.value.forEach(order => {
						order.is_read = 1
					})
					
					// 更新标签计数（清除所有红点）
					updateTabCounts()
					
					// 更新订单列表显示
					filterOrderList()
					
					// 更新本地存储（如果有的话）
					try {
						uni.setStorageSync('orderList', allOrders.value)
					} catch (e) {
						console.warn('保存订单列表到本地存储失败:', e)
					}
					
					// 发送事件通知其他页面更新订单计数
					uni.$emit('ordersMarkedAsRead')
					
					uni.hideLoading()
					uni.showToast({ 
						title: '已标记为已读', 
						icon: 'success',
						duration: 2000
					})
				} catch (error) {
					uni.hideLoading()
					console.error('一键已读失败:', error)
					uni.showToast({ 
						title: error.message || '操作失败，请重试', 
						icon: 'none',
						duration: 2000
					})
				} finally {
					markingRead.value = false
				}
			}
		}
	})
}

/**
 * 查询退款进度
 */
const checkRefundProgress = async (order) => {
	try {
		uni.showLoading({ title: '查询中...' })
		
		const orderNumber = order.orderNo || order.order_number || String(order.id)
		const result = await getRefundProgress(orderNumber)
		const refundInfo = result.data || result
		
		uni.hideLoading()
		
		// 显示自定义退款进度弹窗
		currentRefundInfo.value = refundInfo
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
		completed: '已完成'
	}
	return statusMap[statusLower] || status || '待审核'
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
 * 下拉刷新
 */
/**
 * 触底加载下一页（与商户端一致：先看一页，滑到底再刷新下一页）
 */
const loadMore = async () => {
	if (loadingMore.value || refreshing.value || !hasMore.value) return
	loadingMore.value = true
	try {
		page.value++
		await loadOrderList(true)
	} catch (e) {
		page.value--
		console.error('[订单列表] 加载更多失败', e)
	} finally {
		loadingMore.value = false
	}
}

const onRefresh = async () => {
	refreshing.value = true
	page.value = 1
	hasMore.value = true
	await loadOrderList()
	setTimeout(() => {
		refreshing.value = false
	}, 500)
}

/**
 * 刷新恢复
 */
const onRestore = () => {
	refreshing.value = false
}

/**
 * 监听支付成功事件
 */
const handlePaymentSuccess = (data) => {
	// 刷新订单列表
	loadOrderList()
	
	// 显示提示
	uni.showToast({
		title: '支付成功',
		icon: 'success',
		duration: 2000
	})
}

onLoad((options) => {
	if (options.type) {
		currentTab.value = options.type
	} else {
		// 未传 type 时，保持默认的「待发货」
		currentTab.value = 'paid'
	}
	
	// 如果有refresh参数，说明是从支付页面跳转过来的
	if (options.refresh === '1') {
		// 延迟一下，确保后端订单状态已更新
		setTimeout(() => {
			loadOrderList()
		uni.showToast({
			title: '订单已更新',
			icon: 'success',
			duration: 2000
		})
		}, 500)
	} else {
		loadOrderList()
	}
	
	// 监听支付成功事件
	uni.$on('paymentSuccess', handlePaymentSuccess)
	
	// 监听刷新订单列表事件
	uni.$on('refreshOrderList', () => {
		console.log('[订单列表] 收到刷新事件')
		loadOrderList()
	})
})

onShow(() => {
	// 兜底：从确认收货组件返回时，若 App.onShow 未收到 referrerInfo，在此调后端同步
	try {
		const raw = uni.getStorageSync('pending_confirm_receive')
		if (raw) {
			const p = JSON.parse(raw)
			if (p && p.orderNo && (Date.now() - (p.at || 0)) < 120000) {
				// 延迟 3s 再调后端，给微信侧更新订单状态的时间；若仍报「未知状态」则自动再等 3s 重试一次
				const doSync = (isRetry) => {
				    console.log('[订单列表] onShow 兜底：调后端确认收货', p.orderNo, isRetry ? '(重试)' : '')
				    
				    // 新增：如果没有 transactionId，则无法同步，清除记录并返回
				    if (!p.transactionId) {
				        console.warn('[订单列表] transactionId 为空，无法同步确认收货，清除记录')
				        uni.removeStorageSync('pending_confirm_receive')
				        return
				    }
				
				    confirmReceive({ 
				        order_number: p.orderNo, 
				        transaction_id: p.transactionId 
				    }).then(() => {
				        uni.removeStorageSync('pending_confirm_receive')
				        uni.showToast({ title: '收货已同步', icon: 'success' })
				        switchTab('completed')
				        loadOrderList()
				    })
					.catch((err) => {
					            console.warn('[订单列表] onShow 兜底确认收货失败', err)
					            const msg = err && (err.message || err.msg || err.errorMsg) || ''
					            
					            // 新增：如果错误是 400 且订单已处于 completed 状态，视为同步成功
					            const isAlreadyCompleted = err.statusCode === 400 && /已完成|completed/i.test(msg)
					            if (isAlreadyCompleted) {
					                console.log('[订单列表] 订单已处于完成状态，清除记录')
					                uni.removeStorageSync('pending_confirm_receive')
					                // 可选：刷新订单列表
					                loadOrderList()
					                return
					            }
						if (isUnknownState && isRetry) {
							uni.showModal({
								title: '状态同步中',
								content: '微信收货状态可能尚未更新。请稍后点击「重试」或下拉刷新列表。',
								confirmText: '重试',
								cancelText: '知道了',
								success: (res) => {
									if (res.confirm) doSync(true)
								}
							})
						} else {
							uni.showToast({ title: msg || '同步失败', icon: 'none' })
						}
					})
				}
				setTimeout(() => doSync(false), 3000)
			}
		}
	} catch (e) {
		// ignore
	}
	// 每次显示页面时刷新订单列表
	loadOrderList()
	// 启动倒计时
	startCountdown()
})

onUnmounted(() => {
	// 停止倒计时定时器
	stopCountdown()
	// 移除事件监听
	uni.$off('paymentSuccess', handlePaymentSuccess)
	uni.$off('refreshOrderList')
})
</script>

<style scoped>
.order-page {
	min-height: 100vh;
	background: #f5f5f5;
	display: flex;
	flex-direction: column;
}

.page-scroll {
	flex: 1;
	height: 100vh;
}

/* 标签页 */
.tabs-section {
	background: #fff;
	position: sticky;
	top: 0;
	z-index: 10;
	border-bottom: 1rpx solid #f0f0f0;
}

/* 排序栏 */
.sort-bar {
	background: #fff;
	padding: 20rpx 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.sort-btn {
	font-size: 26rpx;
	color: #666;
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 8rpx 16rpx;
	background: #f8f9fa;
	border-radius: 16rpx;
}

.mark-read-btn {
	font-size: 26rpx;
	color: #3d6bff;
	padding: 8rpx 20rpx;
	border: 1rpx solid #3d6bff;
	border-radius: 16rpx;
	background: #fff;
	transition: all 0.3s;
}

.mark-read-btn:active {
	background: #f0f7ff;
	opacity: 0.8;
}

.mark-read-btn.disabled {
	opacity: 0.5;
	color: #999;
	border-color: #ccc;
}

.sort-icon {
	font-size: 20rpx;
}

.tabs-scroll {
	white-space: nowrap;
}

.tabs-list {
	display: inline-flex;
	padding: 0 30rpx;
}

.tab-item {
	padding: 30rpx 24rpx;
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 8rpx;
}

.tab-text {
	font-size: 28rpx;
	color: #666;
}

.tab-item.active .tab-text {
	color: #3d6bff;
	font-weight: bold;
}

.tab-badge {
	background: #ff5252;
	color: #fff;
	font-size: 20rpx;
	padding: 2rpx 8rpx;
	border-radius: 10rpx;
	min-width: 32rpx;
	text-align: center;
}

/* 订单列表 */
.order-list {
	padding: 20rpx 30rpx;
}

.order-item {
	background: #fff;
	border-radius: 16rpx;
	margin-bottom: 20rpx;
	overflow: hidden;
}

.order-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 30rpx;
	border-bottom: 1rpx solid #f5f5f5;
}

.order-no {
	font-size: 24rpx;
	color: #999;
}

.header-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 8rpx;
}

.countdown-wrapper {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.countdown-label {
	font-size: 22rpx;
	color: #666;
}

.countdown-time {
	font-size: 24rpx;
	font-weight: bold;
	color: #ff9800;
	font-family: 'Courier New', monospace;
}

.countdown-time.countdown-warning {
	color: #f44336;
	animation: blink 1s infinite;
}

@keyframes blink {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.5; }
}

.order-status {
	font-size: 26rpx;
	font-weight: bold;
}

.status-pending {
	color: #ff9800;
}

.status-paid {
	color: #2196f3;
}

.status-pending_ship {
	color: #2196f3;
}

.status-shipping {
	color: #4caf50;
}

.status-pending_recv {
	color: #4caf50;
}

.status-refunding {
	color: #ff9800;
}

.status-refunded {
	color: #999;
}

.status-completed {
	color: #999;
}

/* 商品列表 */
.order-products {
	padding: 20rpx 30rpx;
}

.product-item {
	display: flex;
	gap: 20rpx;
	margin-bottom: 20rpx;
}

.product-item:last-child {
	margin-bottom: 0;
}

.product-image {
	width: 160rpx;
	height: 160rpx;
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
	line-height: 1.5;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	line-clamp: 2;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.product-bottom {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.product-price {
	font-size: 28rpx;
	color: #ff5252;
	font-weight: bold;
}

.product-quantity {
	font-size: 24rpx;
	color: #999;
}

/* 订单底部 */
.order-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 30rpx;
	border-top: 1rpx solid #f5f5f5;
	gap: 20rpx;
}

.order-amount {
	display: flex;
	align-items: baseline;
	gap: 8rpx;
	flex-shrink: 0;
}

.amount-label {
	font-size: 24rpx;
	color: #999;
}

.amount-value {
	font-size: 32rpx;
	color: #f44336;
	font-weight: bold;
}

.order-actions {
	display: flex;
	gap: 12rpx;
	flex-wrap: nowrap;
}

.action-btn {
	padding: 10rpx 20rpx;
	font-size: 22rpx;
	border-radius: 40rpx;
	background: #3d6bff;
	color: #fff;
	border: none;
	height: auto;
	line-height: 1.5;
	white-space: nowrap;
	flex-shrink: 0;
}

.action-btn.secondary {
	background: #fff;
	color: #3d6bff;
	border: 2rpx solid #3d6bff;
}

/* 申请退款按钮样式（橙色/警告色，更醒目） */
.action-btn.refund {
	background: #fff;
	color: #ff9800;
	border: 2rpx solid #ff9800;
	font-weight: 600;
}

.action-btn.refund:active {
	background: #fff7e6;
}

/* 联系客服按钮样式（灰色，次要操作） */
.action-btn.contact {
	background: #f5f5f5;
	color: #666;
	border: 2rpx solid #e0e0e0;
}

.action-btn.contact:active {
	background: #eeeeee;
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20rpx;
	padding: 120rpx 0;
}

.empty-icon {
	font-size: 120rpx;
	opacity: 0.3;
}

.empty-text {
	font-size: 28rpx;
	color: #999;
}

.load-more-bar {
	text-align: center;
	padding: 24rpx 0 32rpx;
}
.load-more-text {
	font-size: 26rpx;
	color: #999;
}
.load-more-text.no-more {
	color: #ccc;
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
