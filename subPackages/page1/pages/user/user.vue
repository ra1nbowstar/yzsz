<template>
	<scroll-view class="user-page" scroll-y refresher-enabled :refresher-triggered="refreshing"
		@refresherrefresh="onRefresh" @refresherrestore="onRestore">
		<!-- 用户信息区 -->
		<view class="user-header">
			<view class="user-info" @tap="editUserInfo">
				<view class="avatar-wrapper">
					<image :src="avatarUrl" mode="aspectFill" class="avatar" @error="handleAvatarError" />
					<view class="edit-icon iconfont icon-bianji"></view>
				</view>
				<view class="info-right">
					<view class="name-row">
						<text class="nickname">{{ userInfo.name || '未设置昵称' }}</text>
						<view class="level-badge" :class="'level-' + userInfo.member_level">
							<text class="level-icon iconfont" :class="getLevelIcon(userInfo.member_level)"></text>
							<text class="level-text">{{ getLevelText(userInfo.member_level) }}</text>
						</view>
					</view>
					<text class="user-id">ID: {{ userInfo.id }}</text>
					<text v-if="userInfo.mobile" class="user-phone">{{ userInfo.mobile }}</text>
				</view>
				<text class="edit-arrow">›</text>
			</view>
		</view>

		<!-- 资产概览区 -->
		<view class="asset-overview">
			<view class="asset-item" @tap="goToPage('/page2/points/balance')">
				<text class="asset-value">{{ displayPoints }}</text>
				<text class="asset-label">积分余额</text>
			</view>
			<view class="asset-divider"></view>
			<view class="asset-item" @tap="goToPage('/page2/user/coupons')">
				<text class="asset-value">{{ couponCount }}</text>
				<text class="asset-label">优惠券</text>
			</view>
			<view class="asset-divider"></view>
			<view class="asset-item funds" @tap="goToPage('/page2/merchant/withdraw')">
				<text class="asset-value">¥{{ displayFunds }}</text>
				<text class="asset-label">可用资金</text>
			</view>
		</view>

		<!-- 功能入口区 -->
		<view class="function-section">
			<view class="section-title">我的订单</view>
			<view class="order-menu">
				<view class="order-item" @tap="goToOrder('all')">
					<text class="iconfont icon-rongzichanpinguanli_moren order-icon"></text>
					<text class="order-text">全部订单</text>
				</view>
				<view class="order-item" @tap="goToOrder('paid')">
					<text class="iconfont icon-daifukuan order-icon"></text>
					<text class="order-text">待发货</text>
				</view>
				<view class="order-item" @tap="goToOrder('shipping')">
					<text class="iconfont icon-daishouhuo order-icon"></text>
					<text class="order-text">待收货</text>
				</view>
				<view class="order-item" @tap="goToOrder('after_sale')">
					<text class="iconfont icon-tuikuanshouhou order-icon"></text>
					<text class="order-text">待售后</text>
				</view>
				<view class="order-item" @tap="goToOrder('completed')">
					<text class="iconfont icon-daipingjia order-icon"></text>
					<text class="order-text">已完成</text>
				</view>
				<!-- 新增商家快捷入口：付款码收款 / 创建支付单 -->
				<view class="order-item" @tap="goToPage('/page2/merchant/offline_cashier')">
					<view class="order-icon qrcode-icon"></view>
					<text class="order-text">付款码收款</text>
				</view>
				<view class="order-item" @tap="goToPage('/page2/merchant/create_payment')">
					<text class="iconfont icon-hongbao order-icon"></text>
					<text class="order-text">创建支付单</text>
				</view>
				<view class="order-item" @tap="goToPage('/page2/merchant/permanent-collection')">
					<text class="iconfont icon-hongbao order-icon"></text>
					<text class="order-text">永久收款码</text>
				</view>
			</view>
		</view>

		<!-- 功能菜单 -->
		<view class="menu-section">
			<view class="menu-item" @tap="goToPage('/page1/favorites/favorites')">
				<view class="menu-left">
					<text class="menu-icon-like iconfont icon-shoucang"></text>
					<text class="menu-text">我的收藏</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="goToPage('/page2/user/coupons')">
				<view class="menu-left">
					<text class="menu-icon iconfont icon-youhuijuan"></text>
					<text class="menu-text">我的优惠券</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="goToPage('/page2/merchant/offline_cashier')">
				<view class="menu-left">
					<text class="menu-icon iconfont icon-shangjiarenzheng"></text>
					<text class="menu-text">付款码收款</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="goToPage('/page2/merchant/create_payment')">
				<view class="menu-left">
					<text class="menu-icon iconfont icon-shangjiarenzheng"></text>
					<text class="menu-text">创建支付单</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="goToPage('/page2/merchant/permanent-collection')">
				<view class="menu-left">
					<text class="menu-icon iconfont icon-hongbao"></text>
					<text class="menu-text">永久收款码</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<!-- 暂时隐藏周补贴,保留代码 -->
			<view v-if="false" class="menu-item" @tap="goToPage('/page2/subsidy/subsidy')">
				<view class="menu-left">
					<text class="iconfont icon-butie menu-icon"></text>
					<text class="menu-text">周补贴</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="goToPage('/page1/invite/invite')">
				<view class="menu-left">
					<text class="iconfont icon-tuijianhaoyou menu-icon"></text>
					<text class="menu-text">推荐好友</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="goToPage('/page2/setting/setting')">
				<view class="menu-left">
					<text class="iconfont icon-shezhi menu-icon"></text>
					<text class="menu-text">设置</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 平台模式入口（is_merchant=2） -->
		<view class="merchant-entrance" v-if="isPlatformUser">
			<view class="merchant-btn" @tap="switchToMerchantMode">
				<text class="merchant-text">进入平台模式</text>
			</view>
		</view>
		
		<!-- 商家模式入口（is_merchant=1） -->
		<view class="merchant-entrance" v-if="isShopUser">
			<view class="merchant-btn shop-mode" @tap="switchToShopMode">
				<text class="merchant-text">进入商家模式</text>
			</view>
		</view>

		<view class="logout-section">
			<button class="logout-btn" @tap="handleLogout">退出登录</button>
		</view>

		<!-- 自定义修改昵称弹窗 -->
		<view class="modal-mask" v-if="showNicknameModal" @tap="closeNicknameModal" @touchmove.stop.prevent>
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">修改昵称</text>
				</view>
				<view class="modal-body">
					<input class="modal-input" v-model="tempNickname" placeholder="请输入新昵称"
						placeholder-style="color: #999" :focus="showNicknameModal" maxlength="20" />
				</view>
				<view class="modal-footer">
					<view class="modal-btn cancel" @tap="closeNicknameModal">取消</view>
					<view class="modal-btn confirm" @tap="confirmNickname">确定</view>
				</view>
			</view>
		</view>
	</scroll-view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { logout, updateUserName, updateUserAvatar, updateUserMobile, updateUserPassword, checkIsMerchant } from '@/api/auth.js'
import { getUserInfo as getUserInfoApi, getMobileByUserId, upgradeUser, setLevel, bindReferrer, getReferDirect, getReferTeam, refreshUserInfo } from '@/api/user.js'
import { switchToMerchantMode as switchMode, switchToShopMode as switchShopMode } from '@/utils/tabbar.js'
import { getMerchantData } from '../../utils/merchant.js'
import { bindReferrerIfNeeded } from '@/utils/referral.js'
import { getPointsLog, getPointsBalance } from '@/api/points.js'
import { loadUserCoupons } from '../../utils/coupon.js'
import { onUserLogout } from '@/utils/storage.js'
import { getMyCoupons } from '@/api/coupon.js'
import { getOrderList } from '@/api/order.js'
import { getAvatarUrl } from '@/utils/avatar.js'
import { getMerchantData } from '../../utils/merchant.js'

const userInfo = ref({
	id: '',
	avatar_path: '',
	name: '',
	mobile: '',
	member_level: 0,
	is_member: 0,
	referral_id: null,
	points: 0,
	status: 0,
	created_at: '',
	updated_at: ''
})

// 头像更新时间戳，用于强制刷新头像
const avatarUpdateTime = ref(Date.now())

// 计算头像URL，包含时间戳以强制刷新
const avatarUrl = computed(() => {
	const avatarPath = userInfo.value.avatar_path || userInfo.value.avatar
	const url = getAvatarUrl(avatarPath)
	return `${url}?t=${avatarUpdateTime.value}`
})

// 积分数据（只显示 member 积分）
const pointsData = ref({
	member_points: 0
})

// 可用资金（商户提现余额）
const availableFunds = ref(0)
function formatCurrency(num, decimals = 2) {
	const n = Number(num) || 0
	const fixed = n.toFixed(decimals)
	const parts = fixed.split('.')
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	return parts.join('.')
}
const displayFunds = computed(() => formatCurrency(availableFunds.value, 2))

// 显示给用户看的积分（只显示会员积分）
const displayPoints = computed(() => {
	return pointsData.value.member_points.toFixed(4)
})

// 判断是否为商户用户（用于显示平台模式按钮）
// 判断是否为平台模式用户（is_merchant=2，用于显示平台模式按钮）
const isPlatformUser = computed(() => {
	const isMerchant = userInfo.value.is_merchant || userInfo.value.isMerchant || 0
	return isMerchant === 2
})

// 判断是否为商家模式用户（is_merchant=1，用于显示商家模式按钮）
const isShopUser = computed(() => {
	const isMerchant = userInfo.value.is_merchant || userInfo.value.isMerchant || 0
	return isMerchant === 1
})

// 积分流水数量
const pointsLogCount = ref(0)

// 优惠券数量
const couponCount = ref(0)

/**
 * 加载积分余额
 */
const loadPointsBalance = async () => {
	try {
		const res = await getPointsBalance()
		if (res.data) {
			pointsData.value = {
				member_points: res.data.member_points || 0
			}
			console.log('[用户中心] 会员积分余额:', pointsData.value.member_points)
		}
	} catch (error) {
		console.error('加载积分余额失败', error)
		pointsData.value = {
			member_points: 0
		}
	}
}

const loadAvailableFunds = async () => {
	try {
		const res = await getMerchantData()
		// 支持多种返回结构
		const bal = res?.data?.available_funds ?? res?.data?.balance ?? res?.available_funds ?? res?.balance ?? 0
		availableFunds.value = Number(bal) || 0
		console.log('[用户页面] 可用资金余额:', availableFunds.value)
	} catch (err) {
		console.warn('[用户页面] 加载可用资金失败', err)
		availableFunds.value = 0
	}
}

/**
 * 加载积分流水数量（只查询 member 类型）
 */
const loadPointsLogCount = async () => {
	try {
		// 从API获取（只查询 member 类型）
		const res = await getPointsLog({ page: 1, size: 1, points_type: 'member' })
		if (res.data?.total !== undefined) {
			pointsLogCount.value = res.data.total
		} else if (res.total !== undefined) {
			pointsLogCount.value = res.total
		} else {
			// 如果没有total字段，设置为0
			pointsLogCount.value = 0
		}
	} catch (error) {
		console.error('加载积分流水数量失败', error)
		pointsLogCount.value = 0
	}
}

/**
 * 加载优惠券数量
 */
const loadCouponCount = async () => {
	try {
		// 获取用户ID
		const userInfo = uni.getStorageSync('userInfo') || {}
		const userId = userInfo.id || userInfo.user_id

		if (!userId) {
			couponCount.value = 0
			return
		}

		// 调用API获取优惠券列表（只获取未使用的）
		const res = await getMyCoupons({
			user_id: userId,
			status: 'all', // 获取所有状态，然后前端统计未使用的
			page: 1,
			page_size: 100
		})

		// 处理返回的数据
		const list = res.data?.coupons || res.coupons || []
		const now = Date.now()

		// 只统计未使用且未过期的优惠券
		const validCoupons = list.filter(coupon => {
			// 只统计状态为unused的优惠券
			if (coupon.status !== 'unused') return false

			// 检查是否过期
			const validTo = coupon.valid_to || coupon.validTo
			if (validTo) {
				const validToTime = new Date(validTo).getTime()
				if (validToTime < now) return false
			}

			return true
		})

		couponCount.value = validCoupons.length
		console.log('优惠券数量:', couponCount.value)
	} catch (error) {
		console.error('加载优惠券数量失败', error)
		couponCount.value = 0
	}
}

const orderCount = ref({
	toShip: 0,      // 待发货（paid）
	toReceive: 0,   // 待收货（shipping）
	afterSale: 0,   // 待售后（after_sale）
	completed: 0    // 已完成（completed）
})

const teamStats = ref({
	total: 0,           // 团队总人数
	direct: 0,          // 直推人数
	sixStar: 0          // 六星店长数量
})

// 昵称修改弹窗相关
const showNicknameModal = ref(false)
const tempNickname = ref('')

const refreshing = ref(false)

/**
 * 获取手机号并更新用户信息（与设置页面保持一致）
 */
const fetchMobileAndUpdateUserInfo = async () => {
	try {
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		// 优先使用 user_id（这是关键字段）
		const userId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid

		if (!userId) {
			console.log('[用户页面] 没有 user_id，无法获取手机号')
			// 如果没有 user_id，尝试从本地存储读取已有信息
			if (storedUserInfo && Object.keys(storedUserInfo).length > 0) {
				userInfo.value = storedUserInfo
			}
			return
		}

		console.log('[用户页面] 开始获取手机号，user_id:', userId)

		// 使用 user_id 和 key 获取手机号
		const res = await getMobileByUserId(userId, 'gm2025')
		console.log('[用户页面] 获取手机号接口响应:', res)

		// 解析返回的手机号（兼容多种响应格式）
		let mobile = null
		if (res) {
			if (typeof res === 'string') {
				mobile = res
			} else if (res.data) {
				mobile = res.data.mobile || res.data.phone || res.data
			} else if (res.mobile) {
				mobile = res.mobile
			} else if (res.phone) {
				mobile = res.phone
			}
		}

		if (!mobile) {
			console.log('[用户页面] 获取手机号失败，响应数据:', res)
			// 如果获取手机号失败，尝试使用本地存储的手机号
			mobile = storedUserInfo.mobile || storedUserInfo.phone
			if (!mobile) {
				console.log('[用户页面] 本地也没有手机号，跳过调用 user/info 接口')
				// 如果没有手机号，至少显示本地存储的信息
				if (storedUserInfo && Object.keys(storedUserInfo).length > 0) {
					userInfo.value = storedUserInfo
				}
				return
			}
		}

		console.log('[用户页面] 获取到手机号:', mobile)

		// 保存手机号到本地存储（确保 user_id 和本地头像被保留）
		const preservedUserId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
		const localAvatar = storedUserInfo.avatar_path || storedUserInfo.avatar

		storedUserInfo.mobile = mobile
		storedUserInfo.phone = mobile
		if (preservedUserId) {
			storedUserInfo.user_id = preservedUserId
			storedUserInfo.id = preservedUserId
			storedUserInfo.userId = preservedUserId
			if (storedUserInfo.uid) {
				storedUserInfo.uid = preservedUserId
			}
		}
		if (localAvatar) {
			storedUserInfo.avatar_path = localAvatar
			storedUserInfo.avatar = localAvatar
		}

		uni.setStorageSync('userInfo', storedUserInfo)

		// 更新页面显示（先显示本地数据）
		userInfo.value = {
			...userInfo.value,
			...storedUserInfo
		}

		// 不再使用手机号调用 user/info 接口（避免切换到新手机号对应的账号）
		console.log('[用户页面] 手机号已保存，不调用 user/info 接口（避免账号切换）')
	} catch (error) {
		console.error('[用户页面] 获取手机号或加载用户信息失败:', error)
		// 尝试从本地存储读取
		const storedUserInfo = uni.getStorageSync('userInfo')
		if (storedUserInfo && Object.keys(storedUserInfo).length > 0) {
			userInfo.value = storedUserInfo
		}
	}
}

/**
 * 加载用户信息（与设置页面保持一致）
 */
const loadUserInfo = async () => {
	try {
		// 只从本地存储读取，不使用手机号调用接口（避免切换到新手机号对应的账号）
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		console.log('[用户页面] loadUserInfo - 从本地存储读取:', {
			avatar_path: storedUserInfo.avatar_path,
			avatar: storedUserInfo.avatar,
			hasData: Object.keys(storedUserInfo).length > 0
		})

		if (storedUserInfo && Object.keys(storedUserInfo).length > 0) {
			// 先保存旧值用于对比
			const oldAvatarPath = userInfo.value.avatar_path
			const oldAvatar = userInfo.value.avatar

			// 使用 Object.assign 确保响应式更新
			Object.assign(userInfo.value, storedUserInfo)

			// 特别处理头像字段，确保响应式更新（即使 storedUserInfo 中没有这些字段也要处理）
			if (storedUserInfo.avatar_path !== undefined) {
				userInfo.value.avatar_path = storedUserInfo.avatar_path
			}
			if (storedUserInfo.avatar !== undefined) {
				userInfo.value.avatar = storedUserInfo.avatar
			}

			console.log('[用户页面] loadUserInfo - 更新后的 userInfo.value:', {
				avatar_path: userInfo.value.avatar_path,
				avatar: userInfo.value.avatar,
				avatarUrl: avatarUrl.value,
				changed: oldAvatarPath !== userInfo.value.avatar_path || oldAvatar !== userInfo.value.avatar
			})

			console.log('[用户页面] 从本地存储加载用户信息:', {
				user_id: storedUserInfo.user_id || storedUserInfo.id,
				name: storedUserInfo.name,
				mobile: storedUserInfo.mobile || storedUserInfo.phone,
				avatar_path: storedUserInfo.avatar_path,
				avatar: storedUserInfo.avatar,
				is_merchant: storedUserInfo.is_merchant,
				isMerchant: storedUserInfo.isMerchant,
				is_platform: storedUserInfo.is_platform,
				isPlatform: storedUserInfo.isPlatform
			})
		} else {
			console.warn('[用户页面] loadUserInfo - 本地存储中没有用户信息')
		}

		// 不再使用手机号调用 user/info 接口（避免切换到新手机号对应的账号）
	} catch (error) {
		console.error('[用户页面] 加载用户信息失败:', error)
		// 尝试从本地存储读取
		const storedUserInfo = uni.getStorageSync('userInfo')
		if (storedUserInfo && Object.keys(storedUserInfo).length > 0) {
			Object.assign(userInfo.value, storedUserInfo)
			// 特别处理头像字段
			if (storedUserInfo.avatar_path !== undefined) {
				userInfo.value.avatar_path = storedUserInfo.avatar_path
			}
			if (storedUserInfo.avatar !== undefined) {
				userInfo.value.avatar = storedUserInfo.avatar
			}
		}
	}
}


/**
 * 加载用户订单状态数量
 * 来源：本地存储的 orderList（与订单列表页、商家订单管理页保持一致）
 */
/**
 * 加载订单数量（从后端API获取）
 */
const loadOrderCount = async () => {
	try {
		// 获取当前用户ID
		const userInfo = uni.getStorageSync('userInfo') || {}
		const userId = userInfo.id || userInfo.user_id

		if (!userId) {
			console.warn('用户ID不存在，无法加载订单数量')
			orderCount.value = {
				toShip: 0,
				toReceive: 0,
				afterSale: 0,
				completed: 0
			}
			return
		}

		// 优先从本地存储获取订单列表（包含已读状态）
		let orderData = []
		try {
			const localOrders = uni.getStorageSync('orderList') || []
			if (localOrders.length > 0) {
				orderData = localOrders
				console.log('[我的页面] 从本地存储加载订单，共', orderData.length, '条')
			}
		} catch (e) {
			console.warn('[我的页面] 从本地存储加载订单失败:', e)
		}

		// 如果本地存储没有数据，从后端API获取
		if (orderData.length === 0) {
			const res = await getOrderList({ userId: userId })

			// 解析订单列表
			if (Array.isArray(res.data?.list)) {
				orderData = res.data.list
			} else if (Array.isArray(res.data)) {
				orderData = res.data
			} else if (Array.isArray(res)) {
				orderData = res
			}

			// 为API返回的订单添加 is_read 字段（默认为未读）
			orderData = orderData.map(order => ({
				...order,
				is_read: order.is_read !== undefined ? order.is_read : (order.is_read === 0 ? 0 : 1)
			}))
		}

		// 统计各状态未读订单数量（只统计未读订单）
		const toShip = orderData.filter(o => {
			return o.status === 'pending_ship' && (o.is_read === 0 || o.is_read === false || o.is_read === null || o.is_read === undefined)
		}).length
		const toReceive = orderData.filter(o => {
			return o.status === 'pending_recv' && (o.is_read === 0 || o.is_read === false || o.is_read === null || o.is_read === undefined)
		}).length
		const afterSale = orderData.filter(o => {
			return (o.status === 'refunding' || o.status === 'refunded') && (o.is_read === 0 || o.is_read === false || o.is_read === null || o.is_read === undefined)
		}).length
		const completed = orderData.filter(o => {
			return o.status === 'completed' && (o.is_read === 0 || o.is_read === false || o.is_read === null || o.is_read === undefined)
		}).length

		orderCount.value = {
			toShip,
			toReceive,
			afterSale,
			completed
		}

		console.log('[我的页面] 订单数量统计（未读）:', orderCount.value)
	} catch (error) {
		console.error('加载订单数量失败', error)
		// 如果API失败，尝试从本地存储获取（降级方案）
		try {
			const orders = uni.getStorageSync('orderList') || []
			// 只统计未读订单
			const toShip = orders.filter(o => {
				return o.status === 'pending_ship' && (o.is_read === 0 || o.is_read === false || o.is_read === null || o.is_read === undefined)
			}).length
			const toReceive = orders.filter(o => {
				return o.status === 'pending_recv' && (o.is_read === 0 || o.is_read === false || o.is_read === null || o.is_read === undefined)
			}).length
			const afterSale = orders.filter(o => {
				return (o.status === 'refunding' || o.status === 'refunded') && (o.is_read === 0 || o.is_read === false || o.is_read === null || o.is_read === undefined)
			}).length
			const completed = orders.filter(o => {
				return o.status === 'completed' && (o.is_read === 0 || o.is_read === false || o.is_read === null || o.is_read === undefined)
			}).length

			orderCount.value = {
				toShip,
				toReceive,
				afterSale,
				completed
			}
		} catch (localError) {
			orderCount.value = {
				toShip: 0,
				toReceive: 0,
				afterSale: 0,
				completed: 0
			}
		}
	}
}

import { getLevelIcon, getLevelText } from '@/utils/level.js'

const getLevelParts = (level) => {
	const text = getLevelText(level)
	if (text && text.length >= 4) {
		return {
			top: text.substring(0, 2),
			bottom: text.substring(2)
		}
	}
	// 少于4个字或者其他情况，尝试从中间拆分或者放到第一行
	if (text && text.length > 2) {
		const mid = Math.ceil(text.length / 2)
		return {
			top: text.substring(0, mid),
			bottom: text.substring(mid)
		}
	}
	return { top: text, bottom: '' }
}


/**
 * 加载团队统计
 */
const loadTeamStats = async () => {
	try {
		// 这里应该调用团队统计接口
		// const res = await getTeamStats()
		// teamStats.value = res.data

		// 如果没有接口数据，返回空数据
		teamStats.value = {
			total: 0,
			direct: 0,
			sixStar: 0
		}
	} catch (error) {
		console.error('加载团队统计失败', error)
	}
}

/**
 * 跳转到订单页
 */
const goToOrder = (type) => {
	// 将用户页面的参数映射到订单列表页的状态值
	const statusMap = {
		'all': 'all',                    // 全部订单
		'paid': 'pending_ship',          // 待发货（用户页面用paid，订单列表页用pending_ship）
		'shipping': 'pending_recv',      // 待收货（用户页面用shipping，订单列表页用pending_recv）
		'after_sale': 'refunding',       // 待售后（用户页面用after_sale，订单列表页用refunding）
		'completed': 'completed'         // 已完成
	}

	const mappedType = statusMap[type] || type
	console.log('[我的页面] 跳转订单页，原始参数:', type, '映射后:', mappedType)
	uni.navigateTo({ url: `/subPackages/page2/pages/order/list?type=${mappedType}` })
}

/**
 * 跳转到指定页面
 */
const goToPage = (url) => {
	// 自动将短路径转换为子包完整路径，兼容传入 '/page1/...' 或 '/page2/...'
	if (typeof url === 'string') {
		if (url.startsWith('/page2/')) {
			url = url.replace(/^\/page2\/(.*)/, '/subPackages/page2/pages/$1')
		} else if (url.startsWith('/page1/')) {
			url = url.replace(/^\/page1\/(.*)/, '/subPackages/page1/pages/$1')
		}
	}
	uni.navigateTo({ url })
}

/**
 * 编辑用户信息
 */
const editUserInfo = () => {
	uni.showActionSheet({
		itemList: ['修改头像', '修改昵称'],
		success: (res) => {
			if (res.tapIndex === 0) {
				editAvatar()
			} else if (res.tapIndex === 1) {
				editNickname()
			}
		}
	})
}

/**
 * 头像加载失败处理
 */
const handleAvatarError = (e) => {
	console.log('[用户页面] 头像加载失败，使用默认头像:', e)
	userInfo.value.avatar_path = '/static/logo.png'
	userInfo.value.avatar = '/static/logo.png'
}

/**
 * 头像裁剪回调
 */
const onAvatarCropped = (croppedImagePath) => {
	if (!croppedImagePath) {
		uni.showToast({ title: '图片处理失败', icon: 'none' })
		return
	}

	// 使用裁剪后的图片
	handleAvatarUpdate(croppedImagePath)
}

/**
 * 处理头像更新
 */
const handleAvatarUpdate = async (tempFilePath) => {
	// 获取当前用户信息
	const storedUserInfo = uni.getStorageSync('userInfo') || {}

	// 检查必需字段
	const preservedUserId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
	const preservedMobile = storedUserInfo.mobile || storedUserInfo.phone

	if (!preservedUserId) {
		console.error('[用户页面] 缺少 user_id，无法上传头像')
		uni.showToast({
			title: '缺少用户ID，请重新登录',
			icon: 'none',
			duration: 3000
		})
		return
	}

	if (!preservedMobile) {
		console.error('[用户页面] 缺少手机号，无法更新头像')
		uni.showToast({
			title: '缺少手机号，请重新登录',
			icon: 'none',
			duration: 3000
		})
		return
	}

	// 显示加载提示
	uni.showLoading({ title: '上传头像中...', mask: true })

	try {
		// 步骤1: 上传头像并更新个人信息
		const result = await updateUserAvatar(tempFilePath, preservedMobile)
		console.log('[用户页面] 头像上传结果:', result)

		// 步骤2: 等待一小段时间，确保服务器已更新数据
		await new Promise(resolve => setTimeout(resolve, 500))

		// 步骤3: 调用接口刷新用户信息并更新本地数据
		await refreshUserInfo()

		// 检查本地存储中的头像路径
		const afterRefresh = uni.getStorageSync('userInfo') || {}
		console.log('[用户页面] 刷新后本地存储的头像路径:', {
			avatar_path: afterRefresh.avatar_path,
			avatar: afterRefresh.avatar,
			hasAvatarPath: !!afterRefresh.avatar_path,
			hasAvatar: !!afterRefresh.avatar
		})

		// 如果刷新后仍然没有头像路径，再等待并重试一次
		if (!afterRefresh.avatar_path && !afterRefresh.avatar) {
			console.warn('[用户页面] 第一次刷新后未获取到头像，等待后重试...')
			await new Promise(resolve => setTimeout(resolve, 1000))
			await refreshUserInfo()
			const retryRefresh = uni.getStorageSync('userInfo') || {}
			console.log('[用户页面] 重试刷新后的头像路径:', {
				avatar_path: retryRefresh.avatar_path,
				avatar: retryRefresh.avatar
			})
		}

		// 步骤3: 重新加载页面显示的用户信息
		await loadUserInfo()

		// 检查 userInfo.value 中的头像路径
		console.log('[用户页面] loadUserInfo 后的 userInfo.value:', {
			avatar_path: userInfo.value.avatar_path,
			avatar: userInfo.value.avatar,
			avatarUrl: avatarUrl.value
		})

		// 步骤4: 强制触发响应式更新
		// 使用 nextTick 确保 DOM 更新
		await uni.$nextTick ? uni.$nextTick() : new Promise(resolve => setTimeout(resolve, 50))

		// 再次确保头像字段正确设置
		const finalStoredInfo = uni.getStorageSync('userInfo') || {}
		if (finalStoredInfo.avatar_path) {
			userInfo.value.avatar_path = finalStoredInfo.avatar_path
		}
		if (finalStoredInfo.avatar) {
			userInfo.value.avatar = finalStoredInfo.avatar
		}

		// 步骤5: 更新头像时间戳，强制刷新头像显示
		avatarUpdateTime.value = Date.now()
		console.log('[用户页面] 第一次更新时间戳后的 avatarUrl:', avatarUrl.value)

		// 再次等待并更新时间戳，确保浏览器重新加载图片
		await uni.$nextTick ? uni.$nextTick() : new Promise(resolve => setTimeout(resolve, 50))
		avatarUpdateTime.value = Date.now()
		console.log('[用户页面] 第二次更新时间戳后的 avatarUrl:', avatarUrl.value)

		setTimeout(() => {
			avatarUpdateTime.value = Date.now()
			console.log('[用户页面] 最终头像URL:', avatarUrl.value)
		}, 100)

		uni.hideLoading()
		uni.showToast({
			title: '头像已更新',
			icon: 'success',
			duration: 2000
		})
	} catch (error) {
		uni.hideLoading()
		console.error('[用户页面] 头像更新失败:', error)
		console.error('[用户页面] 错误详情:', {
			message: error.message,
			stack: error.stack,
			response: error.response || error.data
		})

		// 即使上传失败，也保留本地显示（用户可以看到选择的头像）
		// 但提示用户上传失败
		uni.showToast({
			title: '上传失败：' + (error.message || '未知错误'),
			icon: 'none',
			duration: 3000
		})
	}
}

/**
 * 修改头像
 */
const editAvatar = () => {
	uni.chooseImage({
		count: 1,
		sizeType: ['compressed', 'original'],
		sourceType: ['album', 'camera'],
		success: (res) => {
			const tempFilePath = res.tempFilePaths[0]

			if (!tempFilePath) {
				uni.showToast({ title: '图片选择失败', icon: 'none' })
				return
			}

			console.log('[用户页面] 选择的图片路径:', tempFilePath)

			// 跳转到裁剪页面
			uni.navigateTo({
				url: `/subPackages/page2/pages/user/crop-avatar?imageSrc=${encodeURIComponent(tempFilePath)}`
			})
		},
		fail: (err) => {
			console.error('[用户页面] 选择图片失败:', err)
			uni.showToast({ title: '选择图片失败', icon: 'none' })
		}
	})
}

/**
 * 修改昵称 - 打开弹窗
 */
const editNickname = () => {
	tempNickname.value = userInfo.value.name
	showNicknameModal.value = true
}

/**
 * 关闭昵称弹窗
 */
const closeNicknameModal = () => {
	showNicknameModal.value = false
}

/**
 * 确认修改昵称
 */
const confirmNickname = async () => {
	const newName = tempNickname.value.trim()
	if (!newName) {
		uni.showToast({ title: '昵称不能为空', icon: 'none' })
		return
	}

	// 关闭弹窗
	showNicknameModal.value = false

	userInfo.value.name = newName

	// 保存到本地存储
	const storedUserInfo = uni.getStorageSync('userInfo') || {}
	storedUserInfo.name = newName
	uni.setStorageSync('userInfo', storedUserInfo)

	// 调用接口更新（只更新名字）
	try {
		await updateUserName(newName)
		// 更新完成后，调用接口刷新用户信息并更新本地数据
		await refreshUserInfo()
		// 重新加载页面显示的用户信息
		await loadUserInfo()
		// 更新头像时间戳（虽然只改了名字，但可能头像也更新了）
		avatarUpdateTime.value = Date.now()
		setTimeout(() => {
			avatarUpdateTime.value = Date.now()
		}, 100)
		uni.showToast({ title: '昵称已更新', icon: 'success' })
	} catch (error) {
		console.error('更新昵称失败', error)
		uni.showToast({ title: error.message || '更新失败', icon: 'none' })
	}
}


/**
 * 切换到平台模式（不再强制平台认证）
 */
const switchToMerchantMode = () => {
	uni.showModal({
		title: '切换模式',
		content: '确定要切换到平台模式吗？',
		success: (res) => {
			if (res.confirm) {
				switchMode()
			}
		}
	})
}

/**
 * 切换到商家模式（is_merchant=1）
 */
const switchToShopMode = () => {
	uni.showModal({
		title: '切换模式',
		content: '确定要切换到商家模式吗？',
		success: (res) => {
			if (res.confirm) {
				switchShopMode()
			}
		}
	})
}

/**
 * 退出登录
 */
const handleLogout = () => {
	uni.showModal({
		title: '提示',
		content: '确定要退出登录吗？',
		success: async (res) => {
			if (res.confirm) {
				try {
					await logout()
				} catch (error) {
					console.error('退出登录API调用失败', error)
				}

				// 无论API是否成功，都清除本地数据
				try {
					onUserLogout() // 清除所有用户数据（包括隔离的数据）
				} catch (error) {
					console.error('清除本地数据失败', error)
				}

				// 立即跳转到登录页（清除操作已优化，不需要延迟）
				try {
					uni.reLaunch({ url: '/pages/index/index' })
				} catch (error) {
					console.error('跳转失败', error)
					// 如果reLaunch失败，尝试使用redirectTo
					try {
						uni.redirectTo({ url: '/pages/index/index' })
					} catch (e) {
						// 如果都失败，使用navigateTo
						uni.navigateTo({ url: '/pages/index/index' })
					}
				}
			}
		}
	})
}

/**
 * 下拉刷新
 */
const onRefresh = async () => {
	refreshing.value = true
	try {
		console.log('[用户页面] 开始下拉刷新...')

		// 先刷新用户信息（调用查询个人信息接口）
		const updatedInfo = await refreshUserInfo()
		console.log('[用户页面] 下拉刷新 - refreshUserInfo 返回:', {
			avatar_path: updatedInfo?.avatar_path,
			avatar: updatedInfo?.avatar,
			name: updatedInfo?.name
		})

		// 检查本地存储是否已更新
		const afterRefresh = uni.getStorageSync('userInfo') || {}
		console.log('[用户页面] 下拉刷新 - 本地存储中的头像路径:', {
			avatar_path: afterRefresh.avatar_path,
			avatar: afterRefresh.avatar,
			hasAvatarPath: !!afterRefresh.avatar_path,
			hasAvatar: !!afterRefresh.avatar
		})

		// 然后加载用户信息到页面
		await loadUserInfo()

		// 强制更新头像：先清空再重新赋值，确保响应式更新
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		if (storedUserInfo.avatar_path || storedUserInfo.avatar) {
			// 先更新头像路径
			userInfo.value.avatar_path = storedUserInfo.avatar_path || storedUserInfo.avatar
			userInfo.value.avatar = storedUserInfo.avatar_path || storedUserInfo.avatar

			console.log('[用户页面] 下拉刷新 - 更新后的 userInfo.value:', {
				avatar_path: userInfo.value.avatar_path,
				avatar: userInfo.value.avatar,
				avatarUrl: avatarUrl.value
			})

			// 更新头像时间戳，强制刷新头像显示
			avatarUpdateTime.value = Date.now()
			// 使用 nextTick 确保 DOM 更新后再更新时间戳
			await uni.$nextTick ? uni.$nextTick() : new Promise(resolve => setTimeout(resolve, 50))
			avatarUpdateTime.value = Date.now()
			setTimeout(() => {
				avatarUpdateTime.value = Date.now()
				console.log('[用户页面] 下拉刷新 - 最终头像URL:', avatarUrl.value)
			}, 100)
		} else {
			console.warn('[用户页面] 下拉刷新 - 本地存储中没有头像路径')
		}

		// 并行加载其他数据（即使失败也不影响整体刷新）
		try {
			await Promise.all([
				loadTeamStats().catch(err => console.warn('[用户页面] 加载团队统计失败:', err)),
				loadPointsBalance().catch(err => console.warn('[用户页面] 加载积分余额失败:', err))
			])
		} catch (error) {
			console.warn('[用户页面] 部分数据加载失败，但不影响刷新:', error)
		}
		
		// 同步刷新订单数量（即使失败也不影响整体刷新）
		try {
			loadOrderCount()
		} catch (error) {
			console.warn('[用户页面] 加载订单数量失败:', error)
		}

		uni.showToast({ title: '刷新成功', icon: 'success', duration: 1000 })
	} catch (error) {
		console.error('[用户页面] 刷新失败', error)
		// 即使主要刷新失败，也尝试从本地加载数据
		try {
			await loadUserInfo()
		} catch (loadError) {
			console.error('[用户页面] 从本地加载用户信息也失败:', loadError)
		}
		uni.showToast({ title: '刷新失败，请重试', icon: 'none', duration: 1500 })
	} finally {
		setTimeout(() => {
			refreshing.value = false
		}, 500)
	}
}

/**
 * 刷新恢复
 */
const onRestore = () => {
	refreshing.value = false
}

onShow(async () => {
	// 监听头像裁剪完成事件
	uni.$on('avatarCropped', (croppedImagePath) => {
		console.log('[用户页面] 收到头像裁剪事件:', croppedImagePath)
		onAvatarCropped(croppedImagePath)
	})

	// 监听订单已读事件，更新订单计数
	uni.$on('ordersMarkedAsRead', () => {
		console.log('[用户页面] 收到订单已读事件，更新订单计数')
		loadOrderCount()
	})

	// 每次显示页面时，先调用接口刷新用户信息，然后从本地存储加载
	// 这样可以确保显示的是最新数据
		try {
			// 拉取远端最新用户信息
			const refreshed = await refreshUserInfo()
			console.log('[用户页面] refreshUserInfo 原始返回：', refreshed)
			// 合并并持久化到本地存储，优先使用远端返回值（兼容 res.data 结构）
			const stored = uni.getStorageSync('userInfo') || {}
			const remotePayload = (refreshed && (refreshed.data || refreshed)) || {}
			const merged = Object.assign({}, stored, remotePayload)
			// 如果远端显式包含商户字段，保证写入本地（兼容多种字段名）
			if (remotePayload.is_merchant !== undefined) merged.is_merchant = remotePayload.is_merchant
			if (remotePayload.isMerchant !== undefined) merged.isMerchant = remotePayload.isMerchant
			if (remotePayload.is_platform !== undefined) merged.is_platform = remotePayload.is_platform
			if (remotePayload.isPlatform !== undefined) merged.isPlatform = remotePayload.isPlatform

			// 优先调用专用接口以确保商户身份判断准确（通过手机号查询）
			try {
				let mobileForCheck = merged.mobile || merged.phone || stored.mobile || stored.phone
				// 如果仍然没有手机号，尝试通过 user_id 获取手机号
				if (!mobileForCheck) {
					const uid = merged.user_id || merged.id || merged.userId || stored.user_id || stored.id || stored.userId
					if (uid) {
						try {
							const mobileRes = await getMobileByUserId(uid, 'gm2025')
							if (mobileRes) {
								if (mobileRes.data && typeof mobileRes.data === 'object' && mobileRes.data.mobile) {
									mobileForCheck = mobileRes.data.mobile
								} else if (typeof mobileRes === 'string') {
									mobileForCheck = mobileRes
								} else if (mobileRes.mobile) {
									mobileForCheck = mobileRes.mobile
								} else if (mobileRes.data && typeof mobileRes.data === 'string') {
									mobileForCheck = mobileRes.data
								}
							}
						} catch (merr) {
							console.warn('[用户页面] 通过 user_id 获取手机号失败:', merr)
						}
					}
				}

				if (mobileForCheck) {
					const isMerchantFlag = await checkIsMerchant(mobileForCheck)
					// 将返回的布尔值合并到本地数据，兼容多种字段名
					merged.is_merchant = isMerchantFlag
					merged.isMerchant = isMerchantFlag
					merged.is_platform = isMerchantFlag
					merged.isPlatform = isMerchantFlag
					console.log('[用户页面] checkIsMerchant 返回:', isMerchantFlag, 'mobile:', mobileForCheck)
				}
			} catch (e) {
				console.warn('[用户页面] 调用 checkIsMerchant 失败:', e)
			}

			try{ uni.setStorageSync('userInfo', merged) }catch(e){ console.warn('[用户页面] 写入本地 userInfo 失败', e) }
			// 立即更新页面内响应式 userInfo
			Object.assign(userInfo.value, merged)
			// 再执行 loadUserInfo 以完成本地字段的兼容处理
			await loadUserInfo()
			// 更新头像时间戳，确保头像显示最新
			avatarUpdateTime.value = Date.now()
		} catch (error) {
		console.error('[用户页面] onShow 刷新用户信息失败:', error)
		// 如果刷新失败，至少从本地存储加载
		loadUserInfo()
	}

	// 加载其他数据
	loadTeamStats()
	loadOrderCount()
	loadPointsBalance()
	loadAvailableFunds()
	loadPointsLogCount()
	loadCouponCount()
})

// 页面卸载时移除事件监听
onUnmounted(() => {
	uni.$off('avatarCropped')
	uni.$off('ordersMarkedAsRead')
})
</script>

<style scoped>
/* 引入 iconfont 样式 */
@import "@/static/999/iconfont.css";

.user-page {
	height: 100vh;
	background: #f5f5f5;
	padding-bottom: 40rpx;
}

/* 用户信息区 */
.user-header {
	background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
	padding: 60rpx 30rpx 40rpx;
}

.user-info {
	display: flex;
	align-items: center;
	gap: 24rpx;
	position: relative;
}

.avatar-wrapper {
	position: relative;
}

.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.edit-icon {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 36rpx;
	height: 36rpx;
	background: #fff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.edit-arrow {
	font-size: 32rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-left: auto;
}

.info-right {
	flex: 1;
}

.name-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 12rpx;
}

.nickname {
	font-size: 36rpx;
	font-weight: bold;
	color: #fff;
}

.level-badge {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 6rpx 16rpx;
	border-radius: 20rpx;
	font-size: 22rpx;
}

.level-0 {
	background: rgba(205, 127, 50, 0.9);
}

.level-1 {
	background: rgba(192, 192, 192, 0.9);
}

.level-2 {
	background: rgba(255, 215, 0, 0.9);
}

.level-3 {
	background: rgba(185, 242, 255, 0.9);
}

.level-4 {
	background: rgba(255, 105, 180, 0.9);
}

.level-icon {
	font-size: 20rpx;
}

.level-text {
	color: #fff;
	font-weight: bold;
}

.user-id {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-bottom: 4rpx;
}

.user-email,
.user-phone {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.7);
	margin-bottom: 2rpx;
}

.auth-status {
	padding: 4rpx 12rpx;
	border-radius: 12rpx;
	font-size: 22rpx;
}

.auth-status.verified {
	background: #e8f5e9;
	color: #4caf50;
}

.auth-status.pending {
	background: #fff3cd;
	color: #856404;
}

.toggle-icon {
	font-size: 24rpx;
	color: #999;
}

/* 商家模式入口 */
.merchant-entrance {
	background: white;
	border-radius: 16rpx;
	padding: 30rpx;
	margin: 0 30rpx 20rpx;
}

.merchant-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	padding: 20rpx;
	background: #f8f9fa;
	border: 2rpx solid #e0e0e0;
	border-radius: 12rpx;
	transition: all 0.3s;
}

.merchant-btn:not(.disabled) {
	background: #e8f5e9;
	border-color: #4caf50;
}

.merchant-btn.disabled {
	opacity: 0.6;
}

.merchant-text {
	font-size: 28rpx;
	color: #333;
	font-weight: 600;
}

.merchant-btn:not(.disabled) .merchant-text {
	color: #4caf50;
}

.merchant-tip {
	font-size: 22rpx;
	color: #999;
}

.balance-display,
.points-display,
.commission-display {
	font-size: 24rpx;
	color: #ff9800;
	font-weight: 600;
	margin-right: 8rpx;
}


/* 资产概览 */
.asset-overview {
	background: #fff;
	margin: -40rpx 30rpx 20rpx;
	border-radius: 16rpx;
	padding: 40rpx 0;
	display: flex;
	box-shadow: 0 8rpx 24rpx rgba(61, 107, 255, 0.15);
}

/* 自定义弹窗样式 */
.modal-mask {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.5);
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
}

.modal-content {
	width: 600rpx;
	background: #fff;
	border-radius: 20rpx;
	overflow: hidden;
	animation: modal-pop 0.3s ease-out;
}

@keyframes modal-pop {
	0% {
		transform: scale(0.9);
		opacity: 0;
	}

	100% {
		transform: scale(1);
		opacity: 1;
	}
}

.modal-header {
	padding: 30rpx 0 10rpx;
	text-align: center;
}

.modal-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.modal-body {
	padding: 30rpx 40rpx;
}

.modal-input {
	height: 80rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 20rpx;
	font-size: 30rpx;
	color: #333;
	/* 确保文字颜色为黑色 */
	width: 100%;
	box-sizing: border-box;
}

.modal-footer {
	display: flex;
	border-top: 1rpx solid #eee;
}

.modal-btn {
	flex: 1;
	height: 90rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
}

.modal-btn.cancel {
	color: #999;
	border-right: 1rpx solid #eee;
}

.modal-btn.confirm {
	color: #576b95;
	/* 微信风格蓝色 */
	font-weight: bold;
}

.asset-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
}

.asset-value {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.asset-item.funds .asset-value {
	color: #4caf50;
}

.asset-label {
	font-size: 24rpx;
	color: #999;
}

.asset-divider {
	width: 1rpx;
	height: 60rpx;
	background: #eee;
}

/* 功能区 */
.function-section {
	background: #fff;
	margin: 0 30rpx 20rpx;
}


.function-section {
	border-radius: 16rpx;
	padding: 30rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 24rpx;
}

.order-menu {
	display: flex;
	justify-content: space-between;
}

.order-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
	position: relative;
}

.order-icon {
	width: 80rpx;
	height: 80rpx;
	background: #f5f7fa;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 40rpx;
	color: #3d6bff;
	font-family: "iconfont" !important;
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

.order-icon.iconfont {
	font-family: "iconfont" !important;
	font-size: 40rpx;
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	display: inline-block;
	line-height: 1;
}

/* 订单图标颜色 */
.icon-rongzichanpinguanli_moren {
	color: #3d6bff;
}

.icon-daifukuan {
	color: #ff9800;
}

.icon-daishouhuo {
	color: #2196f3;
}

.icon-daipingjia {
	color: #4caf50;
}

.icon-tuikuanshouhou {
	color: #f44336;
}

.order-text {
	font-size: 24rpx;
	color: #666;
}

/* 二维码小图标（蓝色） */
.qrcode-icon {
	background-repeat: no-repeat;
	background-size: 48%;
	background-position: center;
	color: transparent;
	background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect x='2' y='2' width='6' height='6' fill='rgb(25,118,210)'/><rect x='16' y='2' width='6' height='6' fill='rgb(25,118,210)'/><rect x='2' y='16' width='6' height='6' fill='rgb(25,118,210)'/><rect x='10' y='10' width='4' height='4' fill='rgb(25,118,210)'/><rect x='14' y='10' width='2' height='2' fill='rgb(25,118,210)'/></svg>");
}

.order-badge {
	position: absolute;
	top: -8rpx;
	right: -8rpx;
	background: #ff5252;
	color: #fff;
	font-size: 20rpx;
	padding: 4rpx 8rpx;
	border-radius: 20rpx;
	min-width: 32rpx;
	text-align: center;
}

/* 菜单区 */
.menu-section {
	background: #fff;
	margin: 0 30rpx 20rpx;
	border-radius: 16rpx;
	overflow: hidden;
}

.menu-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 32rpx 30rpx;
	border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-left {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.menu-icon {
	font-size: 40rpx;
	color: #333;
}

.menu-icon.iconfont {
	font-family: "iconfont" !important;
	font-size: 40rpx;
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	display: inline-block;
	line-height: 1;
}

.menu-icon-like {
	font-size: 40rpx;
	color: #ffff00;
}

.menu-icon-like.iconfont {
	font-family: "iconfont" !important;
	font-size: 40rpx;
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	display: inline-block;
	line-height: 1;
}


/* 菜单图标颜色 - 统一黑色 */
/* .icon-wodejiangli, .icon-butie, .icon-tuijianhaoyou, 
   .icon-tixian, .icon-zongzijinfenpei, .icon-shangjiarenzheng, 
   .icon-shezhi { color: #333; } */

.menu-text {
	font-size: 28rpx;
	color: #333;
}

.menu-right {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.menu-arrow {
	font-size: 24rpx;
	color: #ccc;
}

.team-count {
	color: #4caf50;
	font-weight: 600;
}

.reward-amount {
	color: #4caf50;
	font-weight: 600;
}

.subsidy-tip {
	color: #2196f3;
}

.invite-code {
	color: #ff9800;
	font-weight: 600;
}

.withdraw-tip {
	color: #f44336;
}

.allocation-tip {
	color: #9c27b0;
}


/* 退出登录 */
.logout-section {
	padding: 0 30rpx;
}

.logout-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background: #fff;
	color: #ff5252;
	font-size: 28rpx;
	border-radius: 16rpx;
	border: none;
}
</style>
