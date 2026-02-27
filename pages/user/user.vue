<template>
	<scroll-view class="user-page" :scroll-y="!showMerchantCertModal" refresher-enabled :refresher-triggered="refreshing"
		@refresherrefresh="onRefresh" @refresherrestore="onRestore">
		<!-- 用户信息区 -->
		<view class="user-header">
			<view class="user-info" @tap="isLoggedIn ? editUserInfo : goToLogin">
				<view class="avatar-block">
					<view class="avatar-wrapper">
						<image :src="avatarUrl" mode="aspectFill" class="avatar" @error="handleAvatarError" />
					</view>
					<view class="edit-icon-wrapper" @tap.stop="handleEditClick" @click.stop="handleEditClick">
						<text class="edit-icon iconfont icon-bianji"></text>
					</view>
				</view>
				<view class="info-right">
					<view v-if="!isLoggedIn" class="login-prompt" @tap.stop="goToLogin">
						<text class="login-prompt-text">点击此处立即登录</text>
					</view>
					<template v-else>
						<view class="name-row">
							<text class="nickname">{{ userInfo.name || '未设置昵称' }}</text>
							<view class="level-badge" :class="'level-' + userInfo.member_level">
								<text class="level-icon iconfont" :class="getLevelIcon(userInfo.member_level)"></text>
								<text class="level-text">{{ getLevelText(userInfo.member_level) }}</text>
							</view>
						</view>
						<view class="id-phone-row">
							<text class="user-id">ID: {{ userInfo.id }}</text>
							<text v-if="userInfo.mobile" class="user-phone">{{ userInfo.mobile }}</text>
						</view>
					</template>
				</view>
				<text v-if="isLoggedIn" class="edit-arrow">›</text>
			</view>
		</view>

		<!-- 资产概览区 -->
		<view class="asset-overview" v-if="isLoggedIn">
			<view class="asset-item" @tap="goToPage('/subPackages/page2/pages/points/balance')">
				<text class="asset-value">{{ displayPoints }}</text>
				<text class="asset-label">积分余额</text>
			</view>
			<view class="asset-divider"></view>
			<view class="asset-item" @tap="goToPage('/subPackages/page2/pages/user/coupons')">
				<text class="asset-value">{{ couponCount }}</text>
				<text class="asset-label">优惠券</text>
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
			</view>
		</view>

		<!-- 功能菜单 -->
		<view class="menu-section">
			<view class="menu-item" @tap="goToPage('/subPackages/page1/pages/favorites/favorites')">
				<view class="menu-left">
					<text class="menu-icon-like iconfont icon-shoucang"></text>
					<text class="menu-text">我的收藏</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="scanToPay">
				<view class="menu-left">
					<text class="iconfont icon-xiangji menu-icon"></text>
					<text class="menu-text">扫码付款</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="goToPage('/subPackages/page2/pages/user/coupons')">
				<view class="menu-left">
					<text class="menu-icon iconfont icon-youhuijuan"></text>
					<text class="menu-text">我的优惠券</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<!-- 暂时隐藏周补贴,保留代码 -->
			<view v-if="false" class="menu-item" @tap="goToPage('/subPackages/page2/pages/subsidy/subsidy')">
				<view class="menu-left">
					<text class="iconfont icon-butie menu-icon"></text>
					<text class="menu-text">周补贴</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="goToPage('/subPackages/page1/pages/invite/invite')">
				<view class="menu-left">
					<text class="iconfont icon-tuijianhaoyou menu-icon"></text>
					<text class="menu-text">推荐好友</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<view class="menu-item" @tap="goToPage('/subPackages/page2/pages/setting/setting')">
				<view class="menu-left">
					<text class="iconfont icon-shezhi menu-icon"></text>
					<text class="menu-text">设置</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 平台/商家入口：平台用户显示平台模式按钮；商家和普通用户统一显示商家模式按钮 -->
		<view class="merchant-entrance" v-if="isLoggedIn">
			<view class="merchant-btn" v-if="isPlatformUser" @tap="switchToMerchantMode">
				<text class="merchant-text">进入平台模式</text>
			</view>
			<view class="merchant-btn shop-mode" v-else @tap="onEnterShopMode">
				<text class="merchant-text">进入商家模式</text>
			</view>
		</view>

		<view class="logout-section bottom-fixed-area" v-if="isLoggedIn">
			<button class="logout-btn" @tap="handleLogout">退出登录</button>
		</view>

		<!-- 自定义修改昵称弹窗 -->
		<!-- 商家认证弹窗：半透明黑底、禁止背景滑动、选择框在正中央 -->
		<view class="modal-mask cert-modal-mask" v-if="showMerchantCertModal" @tap="closeMerchantCertModal" @touchmove.stop.prevent>
			<view class="modal-content merchant-cert cert-modal-center" @tap.stop>
				<view class="cert-modal-header">
					<text class="cert-modal-title">选择认证类型</text>
					<view class="cert-modal-close" @tap="closeMerchantCertModal" hover-class="cert-close-hover">
						<text class="cert-close-icon">×</text>
					</view>
				</view>
				<view class="merchant-cert-choices">
					<view class="cert-option cert-personal" @tap="chooseCertType('personal')" hover-class="cert-option-hover">
						<view class="cert-option-icon">👤</view>
						<text class="option-title">个人认证</text>
						<text class="option-desc">个体工商户 / 个人经营者</text>
					</view>
					<view class="cert-option cert-enterprise" @tap="chooseCertType('enterprise')" hover-class="cert-option-hover">
						<view class="cert-option-icon">🏢</view>
						<text class="option-title">企业认证</text>
						<text class="option-desc">企业 / 公司主体</text>
					</view>
				</view>
			</view>
		</view>
		<view class="modal-mask" v-if="showNicknameModal" @tap="closeNicknameModal" @touchmove.stop.prevent>
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">修改昵称</text>
				</view>
				<view class="modal-body">
					<input
						type="text"
						class="modal-input"
						v-model="tempNickname"
						placeholder="请输入昵称"
						placeholder-style="color: #999"
						:focus="showNicknameModal"
						maxlength="20"
					/>
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
import { ref, computed, onUnmounted, onMounted, onBeforeUnmount } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { logout, updateUserName, updateUserAvatar, updateUserMobile, updateUserPassword, checkIsMerchant, updateProfile } from '@/api/auth.js'
import { getUserInfo as getUserInfoApi, getMobileByUserId, upgradeUser, setLevel, bindReferrer, getReferDirect, getReferTeam, refreshUserInfo } from '@/api/user.js'
import { switchToMerchantMode as switchMode, switchToShopMode as switchShopMode } from '@/utils/tabbar.js'
import { getMerchantData } from '@/utils/merchant.js'
import { bindReferrerIfNeeded } from '@/utils/referral.js'
import { getPointsLog, getPointsBalance } from '@/api/points.js'
import { loadUserCoupons } from '@/utils/coupon.js'
import { onUserLogout } from '@/utils/storage.js'
import { getMyCoupons } from '@/api/coupon.js'
import { getOrderList } from '@/api/order.js'
import { getAvatarUrl } from '@/utils/avatar.js'

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

// 显示给用户看的积分（只显示会员积分）
const displayPoints = computed(() => {
	return pointsData.value.member_points.toFixed(4)
})

// 判断是否已登录
const isLoggedIn = computed(() => {
	const token = uni.getStorageSync('token')
	const userId = userInfo.value.user_id || userInfo.value.id || userInfo.value.userId || userInfo.value.uid
	const mobile = userInfo.value.mobile || userInfo.value.phone
	return !!(token && (userId || (mobile && /^\d{11}$/.test(mobile))))
})

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
			// 会员积分余额已加载
		}
	} catch (error) {
		console.error('加载积分余额失败', error)
		pointsData.value = {
			member_points: 0
		}
	}
}

// 商户已绑定银行卡信息（用来在页面中响应外部变更）
const merchantBank = ref(uni.getStorageSync('merchant_bound_bank') || null)

function loadMerchantBank() {
	try {
		merchantBank.value = uni.getStorageSync('merchant_bound_bank') || null
	} catch (e) { console.error('读取本地 merchant_bound_bank 失败', e) }
}

function onMerchantBankUpdated(ev) {
	merchantBank.value = ev || uni.getStorageSync('merchant_bound_bank') || null
	try { uni.showToast && uni.showToast({ title: '银行卡信息已更新', icon: 'none' }) } catch (e) { }
}

function onMerchantBankRemoved() {
	merchantBank.value = null
	try { uni.showToast && uni.showToast({ title: '银行卡已解绑', icon: 'none' }) } catch (e) { }
}

onMounted(() => {
	loadMerchantBank()
	uni.$on && uni.$on('merchant:bank:updated', onMerchantBankUpdated)
	uni.$on && uni.$on('merchant:bank:removed', onMerchantBankRemoved)
})

onBeforeUnmount(() => {
	uni.$off && uni.$off('merchant:bank:updated', onMerchantBankUpdated)
	uni.$off && uni.$off('merchant:bank:removed', onMerchantBankRemoved)
})

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
 * 加载优惠券数量（加载用户可用的未使用且未过期优惠券）
 */
const loadCouponCount = async () => {
	try {
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		const userId = storedUserInfo.id || storedUserInfo.user_id
		if (!userId) { couponCount.value = 0; return }

		const res = await getMyCoupons({ user_id: userId, status: 'all', page: 1, page_size: 200 })
		const list = res.data?.coupons || res.coupons || res.data || res || []
		const now = Date.now()
		const validCoupons = (Array.isArray(list) ? list : []).filter(coupon => {
			if (!coupon) return false
			if ((coupon.status || '').toString() !== 'unused') return false
			const validTo = coupon.valid_to || coupon.validTo
			if (validTo) {
				const t = new Date(validTo).getTime()
				if (isNaN(t) || t < now) return false
			}
			return true
		})
		couponCount.value = validCoupons.length
	} catch (err) {
		console.error('加载优惠券数量失败', err)
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

// 商家认证弹窗相关
const showMerchantCertModal = ref(false)

const refreshing = ref(false)

/** 打开商家认证弹窗（用于用户中心） */
function goToMerchant() {
	showMerchantCertModal.value = true
}

function openCertification() {
	// 检查登录状态
	if (!checkLogin()) {
		return
	}
	// 每次点击都弹出「选择认证类型」，让用户可选个人/企业
	showMerchantCertModal.value = true
}

function closeMerchantCertModal() {
	showMerchantCertModal.value = false
}

function chooseCertType(type) {
	try { uni.setStorageSync('cert_last_type', type) } catch (e) {}
	// 关闭弹窗并跳转到独立页面，传递 type 参数
	showMerchantCertModal.value = false
	uni.navigateTo({ url: `/subPackages/page2/pages/merchant/certification?type=${type}` })
}



function openWithdraw() {
	console.log('api代码为调用，跳转到 提现 页面，前端运行正常')
	uni.navigateTo({ url: '/subPackages/page2/pages/merchant/withdraw' })
}

/**
 * 获取手机号并更新用户信息（与设置页面保持一致）
 */
const fetchMobileAndUpdateUserInfo = async () => {
	try {
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		// 优先使用 user_id（这是关键字段）
		const userId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid

		if (!userId) {
			// 没有 user_id，无法获取手机号
			// 如果没有 user_id，尝试从本地存储读取已有信息
			if (storedUserInfo && Object.keys(storedUserInfo).length > 0) {
				userInfo.value = storedUserInfo
			}
			return
		}

		// 开始获取手机号

		// 使用 user_id 和 key 获取手机号
		const res = await getMobileByUserId(userId, 'gm2025')
		// 获取手机号接口响应

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
			// 获取手机号失败
			// 如果获取手机号失败，尝试使用本地存储的手机号
			mobile = storedUserInfo.mobile || storedUserInfo.phone
			if (!mobile) {
				// 本地也没有手机号，跳过调用 user/info 接口
				// 如果没有手机号，至少显示本地存储的信息
				if (storedUserInfo && Object.keys(storedUserInfo).length > 0) {
					userInfo.value = storedUserInfo
				}
				return
			}
		}

		// 获取到手机号

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
		// 手机号已保存，不调用 user/info 接口
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
		// loadUserInfo - 从本地存储读取

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

			// loadUserInfo - 更新后的 userInfo
			// 从本地存储加载用户信息
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
	// 检查登录状态
	if (!checkLogin()) {
		return
	}
	
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
 * 归一化并跳转到指定页面（兼容不同写法）
 */
/**
 * 跳转到登录页面
 */
const goToLogin = () => {
	uni.navigateTo({
		url: '/pages/index/index'
	})
}

/**
 * 检查登录状态，如果未登录则跳转到登录页
 */
const checkLogin = () => {
	if (!isLoggedIn.value) {
		uni.showToast({
			title: '请先登录',
			icon: 'none'
		})
		setTimeout(() => {
			goToLogin()
		}, 500)
		return false
	}
	return true
}

/** 扫码付款：扫商户收款码跳转线下支付页 */
const scanToPay = () => {
	if (!checkLogin()) return
	uni.scanCode({
		success: (res) => {
			const raw = (res.result || res.scanResult || '').trim()
			let orderNo = ''
			if (raw.startsWith('pay://')) {
				orderNo = raw.slice(6).trim()
			} else if (raw) {
				orderNo = raw
			}
			if (orderNo) {
				uni.navigateTo({ url: `/pages/offline/pay?order_no=${encodeURIComponent(orderNo)}` })
			} else {
				uni.showToast({ title: '无法识别的收款码', icon: 'none' })
			}
		},
		fail: (err) => {
			if (err.errMsg && !err.errMsg.includes('cancel')) {
				uni.showToast({ title: '扫码失败，请重试', icon: 'none' })
			}
		}
	})
}

const goToPage = (rawUrl) => {
	// 检查登录状态
	if (!checkLogin()) {
		return
	}
	
	if (!rawUrl || typeof rawUrl !== 'string') return
	let url = rawUrl.trim()

	if (url.startsWith('/subPackages') || url.startsWith('/pages') || url.startsWith('http')) {
		if (!url.startsWith('/')) url = '/' + url
		uni.navigateTo({ url })
		return
	}

	const m1 = url.match(/^\/?page1\/(.*)$/)
	if (m1) {
		url = `/subPackages/page1/pages/${m1[1]}`
		uni.navigateTo({ url })
		return
	}

	const m2 = url.match(/^\/?pages\/(.*)$/)
	if (m2) {
		url = `/subPackages/page1/pages/${m2[1]}`
		uni.navigateTo({ url })
		return
	}

	if (!url.startsWith('/')) url = '/' + url
	uni.navigateTo({ url })
}

/**
 * 处理编辑图标点击
 */
const handleEditClick = (e) => {
	console.log('[用户页面] 编辑图标被点击', e)
	if (e && e.stopPropagation) {
		e.stopPropagation()
	}
	if (!isLoggedIn.value) {
		goToLogin()
		return
	}
	editUserInfo()
}

/**
 * 编辑用户信息
 */
const editUserInfo = () => {
	console.log('[用户页面] editUserInfo 被调用')
	// 检查登录状态
	if (!checkLogin()) {
		return
	}
	
	uni.showActionSheet({
		itemList: ['修改头像', '修改昵称'],
		success: (res) => {
			console.log('[用户页面] showActionSheet 选择:', res.tapIndex)
			if (res.tapIndex === 0) {
				editAvatar()
			} else if (res.tapIndex === 1) {
				editNickname()
			}
		},
		fail: (err) => {
			console.error('[用户页面] showActionSheet 失败:', err)
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
 * 头像裁剪回调（从相册/拍照选图后经裁剪页上传）
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
	// 获取当前用户信息（优先使用页面显示的userInfo，然后从本地存储获取）
	const storedUserInfo = uni.getStorageSync('userInfo') || {}
	
	// 优先使用页面显示的userInfo中的mobile（ID下面显示的那个）
	const preservedMobile = userInfo.value.mobile || userInfo.value.phone || storedUserInfo.mobile || storedUserInfo.phone
	const preservedUserId = userInfo.value.user_id || userInfo.value.id || userInfo.value.userId || userInfo.value.uid || storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid

	if (!preservedUserId) {
		console.error('[用户页面] 缺少 user_id，无法上传头像')
		uni.showToast({
			title: '缺少用户ID，请重新登录',
			icon: 'none',
			duration: 3000
		})
		return
	}

	// 显示加载提示
	uni.showLoading({ title: '上传头像中...', mask: true })

	try {
		// 步骤1: 上传头像并更新个人信息（只需要user_id，不需要手机号）
		const result = await updateUserAvatar(tempFilePath, null)
		console.log('[用户页面] 头像上传结果:', result)

		// 步骤2: 等待一小段时间，确保服务器已更新数据
		await new Promise(resolve => setTimeout(resolve, 500))

		// 步骤3: 调用接口刷新用户信息并更新本地数据（如果失败也不影响，因为头像已经上传成功）
		try {
			await refreshUserInfo()
		} catch (refreshError) {
			console.warn('[用户页面] 刷新用户信息失败，但不影响头像更新:', refreshError)
		}

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
			try {
				await refreshUserInfo()
			} catch (refreshError) {
				console.warn('[用户页面] 重试刷新用户信息失败:', refreshError)
			}
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
	// 清除首次登录设置标记（用户开始操作）
	uni.removeStorageSync('pendingWeChatProfileSetup')
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

	const storedUserInfo = uni.getStorageSync('userInfo') || {}
	const userId = userInfo.value.user_id || userInfo.value.id || userInfo.value.userId || userInfo.value.uid || storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
	let mobile = userInfo.value.mobile || userInfo.value.phone || storedUserInfo.mobile || storedUserInfo.phone

	// 后端 update-profile 必填 mobile，没有则用 user_id 拉取
	if (!mobile && userId) {
		try {
			const mobileRes = await getMobileByUserId(userId, 'gm2025')
			if (mobileRes) {
				if (mobileRes.data && typeof mobileRes.data === 'object' && mobileRes.data.mobile) {
					mobile = mobileRes.data.mobile
				} else if (typeof mobileRes === 'string') {
					mobile = mobileRes
				} else if (mobileRes.mobile) {
					mobile = mobileRes.mobile
				} else if (mobileRes.data && typeof mobileRes.data === 'string') {
					mobile = mobileRes.data
				}
				if (mobile) {
					storedUserInfo.mobile = mobile
					storedUserInfo.phone = mobile
					userInfo.value.mobile = mobile
					userInfo.value.phone = mobile
					uni.setStorageSync('userInfo', storedUserInfo)
				}
			}
		} catch (e) {
			console.warn('[用户页面] 获取 mobile 失败:', e)
		}
	}

	uni.showLoading({ title: '更新中...', mask: true })
	try {
		if (mobile && mobile.trim()) {
			await updateUserName(newName, mobile)
		} else if (userId) {
			await updateProfile({ user_id: userId, name: newName })
		} else {
			uni.hideLoading()
			uni.showToast({ title: '缺少用户信息，无法更新', icon: 'none' })
			return
		}
		// 刷新前先本地更新，避免被旧数据覆盖
		userInfo.value.name = newName
		storedUserInfo.name = newName
		uni.setStorageSync('userInfo', storedUserInfo)

		await refreshUserInfo()
		await loadUserInfo()

		// 刷新后再次确保昵称为刚提交的值，防止接口返回旧数据覆盖
		userInfo.value.name = newName
		const after = uni.getStorageSync('userInfo') || {}
		after.name = newName
		uni.setStorageSync('userInfo', after)

		avatarUpdateTime.value = Date.now()
		uni.hideLoading()
		uni.showToast({ title: '昵称已更新', icon: 'success' })
	} catch (error) {
		uni.hideLoading()
		console.error('❌ [用户页面] 更新昵称失败:', error)
		const errorMsg = error.message || error.msg || error.data?.message || '更新失败，请重试'
		uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 })
	}
}


/**
 * 切换到平台模式（is_merchant=2）
 */
const switchToMerchantMode = () => {
	// 检查登录状态
	if (!checkLogin()) {
		return
	}
	
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
 * 进入商家模式：商家身份直接进入商家中心，普通用户跳转商家认证并提示
 */
const onEnterShopMode = () => {
	if (!checkLogin()) return
	if (isShopUser.value) {
		// 商家点击直接进入
		switchShopMode()
	} else {
		// 普通用户：先弹出认证类型选择弹窗，再进入对应的认证信息填写页
		openCertification()
	}
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
	// 每次进入个人中心时关闭弹窗，避免未点击就显示
	showMerchantCertModal.value = false
	showNicknameModal.value = false

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
		const updated = await refreshUserInfo()
		// 如果后端返回了数据则使用它，否则回退到本地存储
		await loadUserInfo()
		// 若刷新后仍缺少手机号，给用户友好提示（提示可引导到设置或重新登录）
		const effective = updated || uni.getStorageSync('userInfo') || {}
		if (!effective.mobile && !effective.phone) {
			try { uni.showToast({ title: '未能获取完整用户信息，请重新登录或在设置中补全手机号', icon: 'none', duration: 2500 }) } catch (e) {}
		}
		// 更新头像时间戳，确保头像显示最新
		avatarUpdateTime.value = Date.now()
	} catch (error) {
		console.error('[用户页面] onShow 刷新用户信息失败:', error)
		// 如果刷新失败，至少从本地存储加载并提示用户
		loadUserInfo()
		try { uni.showToast({ title: '无法获取用户信息，若已登录请稍后重试或重新登录', icon: 'none', duration: 2000 }) } catch (e) {}
	}

	// 检查是否需要提示用户设置微信头像和昵称
	const pendingSetup = uni.getStorageSync('pendingWeChatProfileSetup')
	if (pendingSetup && isLoggedIn.value) {
		// 延迟显示提示，确保页面已加载完成
		setTimeout(() => {
			uni.showModal({
				title: '完善资料',
				content: '请点击头像选择微信头像，点击昵称可输入或选择微信昵称',
				showCancel: false,
				confirmText: '知道了',
				success: () => {
					// 提示已显示，标记会在用户实际操作时清除
				}
			})
		}, 500)
	}

	// 加载其他数据
	loadTeamStats()
	loadOrderCount()
	loadPointsBalance()
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

.avatar-block {
	position: relative;
	width: 108rpx;
	height: 108rpx;
	flex-shrink: 0;
}

.avatar-wrapper {
	width: 108rpx;
	height: 108rpx;
	border-radius: 50%;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.2);
}

.avatar {
	width: 100%;
	height: 100%;
	display: block;
	border-radius: 50%;
	pointer-events: none;
}

.edit-icon-wrapper {
	position: absolute;
	top: -6rpx;
	right: -6rpx;
	width: 36rpx;
	height: 36rpx;
	background: #fff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
	z-index: 2;
	pointer-events: auto;
}

.edit-icon {
	font-size: 20rpx;
	color: #333;
}

.edit-arrow {
	font-size: 32rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-left: auto;
}

.info-right {
	flex: 1;
}

.login-prompt {
	padding: 20rpx 0;
}

.login-prompt-text {
	font-size: 32rpx;
	color: #fff;
	font-weight: 500;
	text-decoration: underline;
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

.id-phone-row {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.user-id {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.8);
	display: block;
}

.user-email,
.user-phone {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.7);
	display: block;
	margin-top: 0;
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

/* 商家认证弹窗：无半透明黑底，仅居中展示选择框 */
.cert-modal-mask {
	background: transparent;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}
.cert-modal-center {
	margin: 0 auto;
}

/* 商家认证弹窗样式 */
.merchant-cert {
	width: 640rpx;
	max-width: 90%;
	padding: 0;
	position: relative;
	background: #fff;
	border-radius: 28rpx;
	overflow: hidden;
	box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.15);
}
.cert-modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 36rpx 40rpx 24rpx;
	border-bottom: 1rpx solid #f0f0f0;
}
.cert-modal-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
	letter-spacing: 0.5rpx;
}
.cert-modal-close {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: #f5f5f5;
}
.cert-close-hover {
	background: #eee !important;
}
.cert-close-icon {
	font-size: 40rpx;
	color: #8c8c8c;
	line-height: 1;
}
.merchant-cert-choices {
	display: flex;
	gap: 24rpx;
	padding: 32rpx 40rpx 40rpx;
}
.cert-option {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	padding: 36rpx 24rpx;
	border-radius: 20rpx;
	border: 2rpx solid transparent;
	transition: all 0.2s;
}
.cert-option-hover {
	transform: scale(0.98);
	opacity: 0.95;
}
.cert-personal {
	background: linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%);
	border-color: #d6e9ff;
}
.cert-enterprise {
	background: linear-gradient(135deg, #fff8f0 0%, #fff0e6 100%);
	border-color: #ffe4d0;
}
.cert-option-icon {
	font-size: 56rpx;
	line-height: 1;
	margin-bottom: 4rpx;
}
.cert-option .option-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #1a1a1a;
}
.cert-option .option-desc {
	font-size: 22rpx;
	color: #8c8c8c;
	line-height: 1.3;
}
.merchant-cert-body { margin-top: 12rpx }

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
}

/* 二维码小图标（蓝色） */
.qrcode-icon {
	background-repeat: no-repeat;
	background-size: 48%;
	background-position: center;
	color: transparent;
	/* 使用内联 SVG 作为背景，颜色为蓝色 rgb(25,118,210) */
	background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect x='2' y='2' width='6' height='6' fill='rgb(25,118,210)'/><rect x='16' y='2' width='6' height='6' fill='rgb(25,118,210)'/><rect x='2' y='16' width='6' height='6' fill='rgb(25,118,210)'/><rect x='10' y='10' width='4' height='4' fill='rgb(25,118,210)'/><rect x='14' y='10' width='2' height='2' fill='rgb(25,118,210)'/></svg>");
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
	padding: 0 30rpx 20rpx;
}
.logout-section.bottom-fixed-area {
	padding-bottom: 0;
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
