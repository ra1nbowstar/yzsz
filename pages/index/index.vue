<template>
	<view class="login-page">
		<view class="login-card">
			<view class="logo-wrapper">
				<text class="app-title">欢迎使用</text>
			</view>

			<button 
				class="wechat-btn" 
				hover-class="btn-hover" 
				open-type="getPhoneNumber" 
				@getphonenumber="onGetPhoneNumber"
				:disabled="!agreedToTerms"
				:class="{ 'btn-disabled': !agreedToTerms }"
			>
				一键登录
			</button>

			<view class="agreement-checkbox">
				<view class="checkbox-item" @tap="toggleAgreement">
					<view class="my-checkbox" :class="{ active: agreedToTerms }"></view>
					<text class="checkbox-label">我已阅读并同意</text>
					<text class="link" @tap.stop="openAgreement('user')">《用户协议》</text>
					<text>和</text>
					<text class="link" @tap.stop="openAgreement('privacy')">《隐私政策》</text>
				</view>
			</view>

			<text v-if="tip" class="tip">{{ tip }}</text>
		</view>

		<!-- 登录后完善资料浮层：选「使用」时在此直接设置头像、昵称，无需跳转个人中心 -->
		<view v-if="showProfileSetup" class="profile-setup-mask" @touchmove.stop.prevent>
			<view class="profile-setup-card" @tap.stop>
				<text class="profile-setup-title">完善资料</text>
				<text class="profile-setup-desc">点击头像选择微信头像，输入昵称可选用微信昵称</text>
				<view class="profile-setup-avatar-row">
					<button class="profile-setup-avatar-btn" open-type="chooseAvatar" @chooseavatar="onProfileChooseAvatar">
						<image
							v-if="profileSetupAvatarUrl"
							:src="profileSetupAvatarUrl"
							class="profile-setup-avatar-img"
							mode="aspectFill"
						/>
						<view v-else class="profile-setup-avatar-placeholder">
							<text class="profile-setup-avatar-text">点击选择头像</text>
						</view>
					</button>
				</view>
				<view class="profile-setup-nickname-row">
					<input
						type="nickname"
						class="profile-setup-input"
						v-model="profileSetupNickname"
						placeholder="请输入昵称"
						placeholder-style="color: #999"
						maxlength="20"
						@blur="onProfileNicknameBlur"
					/>
				</view>
				<view class="profile-setup-actions">
					<button class="profile-setup-btn secondary" @tap="onProfileSetupSkip">跳过</button>
					<button class="profile-setup-btn primary" @tap="onProfileSetupConfirm">确认</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { wechatLogin, phonePasswordLogin, checkIsMerchant, updateProfile, updateUserAvatar, updateUserName } from '@/api/auth.js'
import { bindReferrer, getUserInfo, getPhone, updateMobile, getMobileByUserId, refreshUserInfo } from '@/api/user.js'
import { onUserLogin, setStorage } from '@/utils/storage.js'
import { saveAuth, saveWechatSession } from '@/utils/auth.js'
import { WECHAT_APPID } from '@/utils/config.js'
import { getPendingReferrer } from '@/utils/referral.js'
import { switchToMerchantMode, switchToShopMode } from '@/utils/tabbar.js'

const postLoginRedirectKey = 'postLoginRedirect'
const consumePostLoginRedirect = () => {
	try {
		const data = uni.getStorageSync(postLoginRedirectKey)
		if (!data || !data.url) return ''
		const createdAt = Number(data.createdAt || 0)
		if (createdAt && Date.now() - createdAt > 30 * 60 * 1000) {
			uni.removeStorageSync(postLoginRedirectKey)
			return ''
		}
		uni.removeStorageSync(postLoginRedirectKey)
		return String(data.url || '').trim()
	} catch (e) {
		return ''
	}
}

const phone = ref('')
const password = ref('')
const nickname = ref('')
const inviteCode = ref('')
const isKeepLogin = ref(false)
const tip = ref('')
const showPassword = ref(false) // 控制密码显示/隐藏
const agreedToTerms = ref(false) // 用户是否同意协议（默认false，不能默认勾选）

// 用于追踪微信 code 的调试信息
const usedCodes = ref([]) // 记录已使用的 code
const currentCode = ref(null) // 当前获取的 code

// 登录后完善资料浮层（选「使用」时在当前页直接设置，无需跳转个人中心）
const showProfileSetup = ref(false)
const profileSetupUserInfo = ref(null)
const profileSetupAvatarUrl = ref('')
const profileSetupNickname = ref('')

const phonePattern = /^1[3-9]\d{9}$/

const canLogin = computed(() => {
	const phoneValid = phonePattern.test(phone.value)
	const passwordValid = password.value.trim().length >= 6
	const result = phoneValid && passwordValid
	// canLogin 计算
	return result
})

const mockRegisterIfNeeded = () =>
	new Promise((resolve) => {
		setTimeout(() => resolve(true), 500)
	})

const toggleKeepLogin = () => {
	isKeepLogin.value = !isKeepLogin.value
}

/**
 * 切换协议同意状态
 */
const toggleAgreement = () => {
	agreedToTerms.value = !agreedToTerms.value
}

/**
 * 切换密码显示/隐藏
 */
const togglePassword = () => {
	showPassword.value = !showPassword.value
}

/**
 * 扫码功能，扫描邀请码二维码
 */
const handleScanCode = () => {
	uni.scanCode({
		success: (res) => {
			// 扫码结果
			const result = res.result || ''
			
			// 尝试解析二维码内容
			// 二维码内容可能是：
			// 1. 直接的推荐码字符串
			// 2. JSON 格式：{"referralCode": "ABC123"} 或 {"inviteCode": "ABC123"}
			// 3. URL 格式：?referralCode=ABC123 或 ?inviteCode=ABC123
			
			let code = ''
			
			// 尝试解析 JSON
			try {
				const jsonData = JSON.parse(result)
				code = jsonData.referralCode || jsonData.inviteCode || jsonData.code || ''
			} catch (e) {
				// 不是 JSON，尝试解析 URL
				if (result.includes('referralCode=') || result.includes('inviteCode=')) {
					const urlParams = new URLSearchParams(result.split('?')[1] || result)
					code = urlParams.get('referralCode') || urlParams.get('inviteCode') || ''
				} else {
					// 直接作为推荐码使用
					code = result.trim()
				}
			}
			
			if (code) {
				inviteCode.value = code
				uni.showToast({ title: '邀请码已识别', icon: 'success' })
			} else {
				uni.showToast({ title: '未能识别邀请码', icon: 'none' })
			}
		},
		fail: (err) => {
			console.error('[扫码] 扫码失败:', err)
			uni.showToast({ title: '扫码失败，请重试', icon: 'none' })
		}
	})
}

/**
 * 检查并自动填充待绑定的推荐码
 */
const checkAndFillPendingReferrer = () => {
	try {
		const pending = getPendingReferrer()
		if (pending && pending.referralCode) {
			inviteCode.value = pending.referralCode
		}
	} catch (error) {
		console.error('❌ [推荐码填充] 检查待绑定推荐码失败:', error)
	}
}

const goToAppHome = () => {
	const redirectUrl = consumePostLoginRedirect()
	if (redirectUrl) {
		uni.showToast({ title: '登录成功，返回扫码页', icon: 'none', duration: 1200 })
		setTimeout(() => {
			uni.reLaunch({ url: redirectUrl })
		}, 350)
		return
	}
	// 在跳转前，如果有推荐码，保存到本地存储，供首页使用
	if (inviteCode.value && inviteCode.value.trim()) {
		const code = inviteCode.value.trim()
		uni.setStorageSync('pendingReferralCode', code)
	}
	
	const target = '/pages/home/home'
	setTimeout(() => {
		uni.switchTab({
			url: target,
			fail: () => {
				uni.reLaunch({ url: target })
			}
		})
	}, 400)
}

/**
 * 检查并处理首次登录：当用户头像为空时，提示用户是否使用微信头像和昵称
 * @param {Object} userInfo 用户信息对象
 * @returns {Promise<Boolean>} 返回 true 表示已处理（选择是或否），false 表示已有头像，跳过提示
 */
	const checkAndHandleFirstLogin = async (userInfo) => {
		try {
			// 从本地存储读取最新的用户信息，确保头像信息是最新的
			const storedUserInfo = uni.getStorageSync('userInfo') || {}
			// 合并传入的 userInfo 和本地存储的 userInfo，优先使用本地存储（可能更完整）
			const mergedUserInfo = {
				...userInfo,
				...storedUserInfo,
				// 保留关键字段
				user_id: userInfo.user_id || storedUserInfo.user_id || userInfo.id || storedUserInfo.id,
				id: userInfo.user_id || storedUserInfo.user_id || userInfo.id || storedUserInfo.id,
				mobile: userInfo.mobile || storedUserInfo.mobile || userInfo.phone || storedUserInfo.phone,
				phone: userInfo.phone || storedUserInfo.phone || userInfo.mobile || storedUserInfo.mobile
			}
			
			// 检查头像是否为空：只有当头像为空时才弹出提示
			const avatarPath = mergedUserInfo.avatar_path || mergedUserInfo.avatar || ''
			const avatarStr = String(avatarPath).trim()
			
			// 判断头像是否有效：排除空字符串、null、undefined、默认头像
			const hasAvatar = avatarStr && 
				avatarStr !== 'null' && 
				avatarStr !== 'undefined' &&
				!avatarStr.includes('/static/logo.png') && // 排除默认logo
				avatarStr.length > 0
			
			console.log('[首次登录检查] 头像检查:', {
				userInfo_avatar_path: userInfo.avatar_path,
				userInfo_avatar: userInfo.avatar,
				stored_avatar_path: storedUserInfo.avatar_path,
				stored_avatar: storedUserInfo.avatar,
				merged_avatar_path: mergedUserInfo.avatar_path,
				merged_avatar: mergedUserInfo.avatar,
				avatarStr: avatarStr,
				hasAvatar: hasAvatar
			})
			
			// 如果已有头像，直接返回，不弹出提示
			if (hasAvatar) {
				console.log('[首次登录检查] 用户已有头像，跳过提示')
				return false
			}
		
		// 是首次登录，弹出提示
		return new Promise((resolve) => {
			uni.showModal({
				title: '完善资料',
				content: '是否使用微信头像和昵称？',
				confirmText: '使用',
				cancelText: '不使用',
				success: async (res) => {
					if (res.confirm) {
						// 用户选择"使用"：在当前页弹出完善资料浮层，直接设置头像昵称后确认，无需跳转个人中心
						console.log('[首次登录] 用户选择使用微信头像和昵称，展示完善资料浮层')
						profileSetupUserInfo.value = userInfo
						profileSetupAvatarUrl.value = ''
						profileSetupNickname.value = userInfo.name || '微信用户'
						showProfileSetup.value = true
						resolve(true)
						return
					} else {
						// 用户选择"不使用"，跳转到个人中心
						console.log('[首次登录] 用户选择不使用微信头像和昵称，跳转到个人中心')
						setTimeout(() => {
							uni.switchTab({ url: '/pages/user/user' })
						}, 500)
						resolve(true)
					}
				}
			})
		})
	} catch (error) {
		console.error('[首次登录检查] 处理失败:', error)
		return false
	}
}

/** 完善资料浮层：选择头像 */
const onProfileChooseAvatar = (e) => {
	const url = e.detail?.avatarUrl
	if (url) profileSetupAvatarUrl.value = url
}

/** 完善资料浮层：昵称失焦，同步微信回填的昵称 */
const onProfileNicknameBlur = (e) => {
	if (e?.detail?.value != null && e.detail.value !== '') {
		profileSetupNickname.value = e.detail.value
	}
}

/** 完善资料浮层：跳过，直接进首页 */
const onProfileSetupSkip = () => {
	showProfileSetup.value = false
	profileSetupUserInfo.value = null
	profileSetupAvatarUrl.value = ''
	profileSetupNickname.value = ''
	uni.removeStorageSync('pendingWeChatProfileSetup')
	goToAppHome()
}

/** 完善资料浮层：确认，上传头像/更新昵称后进首页 */
const onProfileSetupConfirm = async () => {
	const userInfo = profileSetupUserInfo.value
	if (!userInfo) {
		onProfileSetupSkip()
		return
	}
	const avatarUrl = profileSetupAvatarUrl.value
	const nickName = (profileSetupNickname.value || '').trim() || '微信用户'
	const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
	let mobile = userInfo.mobile || userInfo.phone

	uni.showLoading({ title: '更新中...', mask: true })
	try {
		// 确保本地有最新 userInfo（updateUserAvatar / updateUserName 会读 storage）
		uni.setStorageSync('userInfo', userInfo)

		// 如果没有 mobile，尝试通过 user_id 获取
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
						userInfo.mobile = mobile
						userInfo.phone = mobile
						uni.setStorageSync('userInfo', userInfo)
					}
				}
			} catch (mobileError) {
				console.warn('[完善资料] 获取 mobile 失败:', mobileError)
			}
		}

		if (avatarUrl) {
			await updateUserAvatar(avatarUrl, mobile)
		}
		if (nickName) {
			// updateProfile 需要 mobile 作为必填字段，优先使用 mobile
			if (mobile && mobile.trim()) {
				await updateUserName(nickName, mobile)
			} else if (userId) {
				// 如果实在没有 mobile，尝试用 user_id（可能失败，但至少尝试）
				console.warn('[完善资料] 缺少 mobile，尝试仅用 user_id 更新昵称')
				await updateProfile({ user_id: userId, name: nickName })
			} else {
				throw new Error('缺少用户信息（mobile 或 user_id），无法更新昵称')
			}
		}

		await refreshUserInfo()
		if (avatarUrl || (nickName && nickName !== '微信用户')) {
			uni.showToast({ title: '已更新', icon: 'success', duration: 1200 })
		}
	} catch (err) {
		console.error('[完善资料] 更新失败:', err)
		const errorMsg = err?.message || err?.detail?.[0] || '未知错误'
		uni.showToast({ title: '更新失败：' + errorMsg, icon: 'none', duration: 3000 })
	} finally {
		uni.hideLoading()
	}

	showProfileSetup.value = false
	profileSetupUserInfo.value = null
	profileSetupAvatarUrl.value = ''
	profileSetupNickname.value = ''
	uni.removeStorageSync('pendingWeChatProfileSetup')
	setTimeout(goToAppHome, 400)
}

const handleLogin = async () => {
	// handleLogin 被调用
	
	if (!canLogin.value) {
		// 登录条件不满足
		tip.value = '请输入正确的手机号和密码（至少6位）'
		uni.showToast({ title: '请输入正确的手机号和密码（至少6位）', icon: 'none' })
		return
	}
	
	tip.value = ''
	// 开始登录流程
	uni.showLoading({ title: '登录中' })
	
	try {
		// 调用手机号密码登录接口（一键登录，不存在则自动注册）
		// 开始调用登录接口
		
		// 检查 phonePasswordLogin 函数是否存在
		if (!phonePasswordLogin) {
			console.error('[登录] phonePasswordLogin 函数不存在')
			throw new Error('登录函数未正确导入')
		}
		
		const res = await phonePasswordLogin(phone.value, password.value, nickname.value.trim())
		// 登录接口响应
		
		// 保存登录信息（token 使用统一方法保存）
		if (res.token) {
			saveAuth(res)
		}
		
		// 处理用户信息，确保保存用户ID和手机号
		let userInfo = {}
		if (res.user) {
			userInfo = {
				...res.user,
				mobile: res.user.mobile || phone.value, // 确保 mobile 字段存在
				phone: res.user.phone || res.user.mobile || phone.value // 兼容 phone 字段
			}
		} else if (res.id || res.user_id || res.userId) {
			// 如果返回数据直接在 res 中，而不是 res.user
			userInfo = {
				...res,
				mobile: res.mobile || phone.value,
				phone: res.phone || res.mobile || phone.value
			}
		} else {
			// 如果都没有，至少保存手机号
			userInfo = {
				mobile: phone.value,
				phone: phone.value
			}
		}
		
		// 确保 user_id 被正确保存（这是关键字段）
		const userId = res.user_id || res.user?.user_id || res.id || res.user?.id || res.userId || res.user?.userId || res.uid || res.user?.uid
		if (userId) {
			// 优先保存 user_id，其他字段也同步保存
			userInfo.user_id = userId
			userInfo.id = userId
			userInfo.userId = userId
			userInfo.uid = userId
		} else {
			// 如果都没有，尝试从已有数据中获取
			const existingUserId = userInfo.id || userInfo.user_id || userInfo.userId || userInfo.uid
			if (existingUserId) {
				userInfo.user_id = existingUserId
				userInfo.id = existingUserId
				userInfo.userId = existingUserId
				userInfo.uid = existingUserId
			}
		}
		
		// 确保手机号被保存（这是关键字段）
		if (!userInfo.mobile && phone.value) {
			userInfo.mobile = phone.value
		}
		if (!userInfo.phone && phone.value) {
			userInfo.phone = phone.value
		}
		
		// 查询是否商户
		try {
			const mobile = userInfo.mobile || phone.value
			if (mobile) {
				const isMerchant = await checkIsMerchant(mobile)
				userInfo.is_merchant = isMerchant
				userInfo.isMerchant = isMerchant
				// 查询是否商户结果
			}
		} catch (merchantError) {
			console.error('[登录] 查询是否商户失败:', merchantError)
			userInfo.is_merchant = false
			userInfo.isMerchant = false
		}
		
		// 先保存用户信息到本地存储（userInfo是全局的，不需要隔离）
		// 这样onUserLogin才能正确读取到用户ID
		uni.setStorageSync('userInfo', userInfo)
		
		// 然后清除旧用户数据（防止数据混用）
		onUserLogin(userInfo)
		// 保存用户信息
		
		// 记录本次登录使用的邀请码，供后端绑定推荐关系时使用（使用隔离存储）
		if (inviteCode.value.trim()) {
			setStorage('inviteCode', inviteCode.value.trim())
		}
		
		uni.hideLoading()
		uni.showToast({ title: '登录成功', icon: 'success' })

		{
			const redirectUrl = consumePostLoginRedirect()
			if (redirectUrl) {
				uni.showToast({ title: '登录成功，返回扫码页', icon: 'none', duration: 1200 })
				setTimeout(() => uni.reLaunch({ url: redirectUrl }), 350)
				return
			}
		}
		
		// 保存登录时间和免登录状态
		const loginTime = Date.now()
		setStorage('loginTime', loginTime)
		if (isKeepLogin.value) {
			uni.setStorageSync('keepLogin', true)
			// 已启用7天免登录
		} else {
			uni.removeStorageSync('keepLogin')
		}
		
		// 尝试绑定推荐人
		if (inviteCode.value.trim()) {
			await tryBindReferrer(userInfo.mobile || phone.value)
		}
		
		// 使用 mobile 查询用户详情
		try {
			const mobile = userInfo.mobile || phone.value
			if (mobile) {
				// 开始查询用户详情
				const userDetailRes = await getUserInfo(mobile)
				// 用户详情查询结果
				
				// 保存当前的 user_id（关键字段，不能被覆盖）
				const preservedUserId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
				
				// 合并用户详情到 userInfo
				if (userDetailRes && userDetailRes.data) {
					userInfo = {
						...userInfo,
						...userDetailRes.data
					}
				} else if (userDetailRes) {
					// 如果返回数据直接在 res 中
					userInfo = {
						...userInfo,
						...userDetailRes
					}
				}
				
				// 确保 user_id 被保留（关键字段，不能被覆盖）
				if (preservedUserId) {
					userInfo.user_id = preservedUserId
					userInfo.id = preservedUserId
					userInfo.userId = preservedUserId
					userInfo.uid = preservedUserId
					// 已保留 user_id
				} else {
					// 如果本地没有，尝试从接口返回的数据中获取
					const apiUserId = userInfo.uid || userInfo.user_id || userInfo.id || userInfo.userId
					if (apiUserId) {
						userInfo.user_id = apiUserId
						userInfo.id = apiUserId
						userInfo.userId = apiUserId
						userInfo.uid = apiUserId
						// 从接口获取 user_id
					}
				}
				
				// 确保手机号被保留（关键字段）
				if (!userInfo.mobile && mobile) {
					userInfo.mobile = mobile
				}
				if (!userInfo.phone && mobile) {
					userInfo.phone = mobile
				}
				
				// 重新保存到本地存储（userInfo是全局的，不需要隔离）
				uni.setStorageSync('userInfo', userInfo)
				// 已更新用户详情到本地存储
				
				// 检查用户is_merchant，如果为2则进入平台模式，如果为1则进入商家模式
				const isMerchant = userInfo.is_merchant || userInfo.isMerchant || 0
				if (isMerchant === 2) {
					console.log('[登录] 检测到用户is_merchant为2，自动进入平台模式')
					// 进入平台模式
					switchToMerchantMode()
					return // 直接返回，不执行后续的goToAppHome
				} else if (isMerchant === 1) {
					console.log('[登录] 检测到用户is_merchant为1，自动进入商家模式')
					// 进入商家模式
					switchToShopMode()
					return // 直接返回，不执行后续的goToAppHome
				}
			}
		} catch (detailError) {
			console.error('[登录] 查询用户详情失败:', detailError)
			// 不影响登录流程，继续跳转
		}
		
		goToAppHome()
	} catch (error) {
		console.error('[登录] 登录失败:', error)
		console.error('[登录] 错误详情:', {
			message: error.message,
			detail: error.detail,
			code: error.code,
			msg: error.msg,
			stack: error.stack
		})
		uni.hideLoading()
		const errorMsg = error.message || error.detail || error.msg || '登录失败，请重试'
		tip.value = errorMsg
		uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 })
	}
}

const onGetPhoneNumber = async (e) => {
	console.log('[手机号登录] 获取手机号回调')

	// 0. 检查用户是否同意协议
	if (!agreedToTerms.value) {
		uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
		return
	}

	// 1. 检查用户是否同意授权
	if (e.detail.errMsg !== 'getPhoneNumber:ok') {
		uni.showToast({ title: '已取消授权手机号', icon: 'none' })
		// 如果用户拒绝，降级为普通登录（无手机号）
		return
	}

	// 2. 获取手机号快速验证组件返回的 code（新版：仅用 code 调 /api/user/get-phone 换手机号，不再用 encryptedData/iv 解码）
	const phoneCode = e.detail.code
	if (!phoneCode) {
		uni.showToast({ title: '获取手机号凭证失败', icon: 'none' })
		return
	}

	// 3. 执行微信登录流程
	uni.showLoading({ title: '登录中...' })

	try {
		// 3.1 获取登录凭证
		const loginRes = await new Promise((resolve, reject) => {
			uni.login({
				provider: 'weixin',
				success: resolve,
				fail: reject
			})
		})
		const code = loginRes.code

		if (!code) throw new Error('获取登录凭证失败')

		// 3.2 准备参数（新版 mp-phone-number 快速验证：只传 code + phone_code，后端用 get-phone 换手机号）
		const payload = {
			code: code,
			phone_code: phoneCode,
			nickName: '微信用户' // 默认昵称，登录成功后用户可选择是否使用微信昵称
		}
		
		console.log('[手机号快捷登录] 发送参数（get-phone 流程）')

		// 3.3 调用后端（后端用 phone_code 调 get-phone / 微信接口换取手机号）
		const res = await wechatLogin(payload)

		// 3.4 处理登录成功逻辑 (这里直接复用 handleWeChatLogin 内部相同的成功处理逻辑)
		// 注意：为了避免大量代码重复，理想情况是提取公共函数，但为了减少修改风险，这里将 handleWeChatLogin 的核心成功逻辑复制一份。
		// 由于代码结构限制，这里我们模拟 success 后的处理:
		
		// ------------------ 成功处理逻辑开始 ------------------
		// 保存登录信息（token 使用统一方法保存）
		if (res.token) {
			saveAuth(res)
		}
		
		// 处理用户信息，确保保存用户ID
		let userInfo = {}
		if (res.user) {
			userInfo = {
				...res.user,
				mobile: res.user.mobile || res.user.phone || '', 
				phone: res.user.phone || res.user.mobile || ''
			}
		} else if (res.id || res.user_id || res.userId) {
			userInfo = {
				...res,
				mobile: res.mobile || res.phone || '',
				phone: res.phone || res.mobile || ''
			}
		}

		// 确保 user_id 被正确保存
		const userId = res.user_id || res.user?.user_id || res.id || res.user?.id || res.userId || res.user?.userId || res.uid || res.user?.uid
		if (userId) {
			userInfo.user_id = userId
			userInfo.id = userId
			userInfo.userId = userId
			userInfo.uid = userId
		} else {
			const existingUserId = userInfo.id || userInfo.user_id || userInfo.userId || userInfo.uid
			if (existingUserId) {
				userInfo.user_id = existingUserId
				userInfo.id = existingUserId
				userInfo.userId = existingUserId
				userInfo.uid = existingUserId
			}
		}
		// 查询是否商户（如果有手机号）
		if (userInfo.mobile || userInfo.phone) {
			try {
				const mobile = userInfo.mobile || userInfo.phone
				const isMerchant = await checkIsMerchant(mobile)
				userInfo.is_merchant = isMerchant
				userInfo.isMerchant = isMerchant
			} catch (merchantError) {
				console.error('[微信登录] 查询是否商户失败:', merchantError)
				userInfo.is_merchant = false
				userInfo.isMerchant = false
			}
		} else {
			userInfo.is_merchant = false
			userInfo.isMerchant = false
		}
		
		uni.setStorageSync('userInfo', userInfo)
		onUserLogin(userInfo)
		
		// 新版 get-phone 流程：手机号由后端用 phone_code 换取并写入 user，此处仅做兜底（若后端未返回 11 位手机号则用 getPhone 再取一次）
		const uid = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
		let profileMobile = (userInfo.mobile || userInfo.phone || '').trim()
		if (!profileMobile && uid) {
			try {
				const mb = await getMobileByUserId(uid, 'gm2025')
				const m = (mb?.data && typeof mb.data === 'object' && mb.data.mobile) ? mb.data.mobile : (mb?.mobile ?? (typeof mb?.data === 'string' ? mb.data : ''))
				profileMobile = (m && typeof m === 'string') ? String(m).trim() : ''
			} catch (_) {}
		}
		if (/^\d{11}$/.test(profileMobile)) {
			console.log('[手机号快捷登录] 用户手机号已为 11 位（get-phone 流程）')
		} else if (uid && phoneCode) {
			// 兜底：后端未返回手机号时，前端用 phone_code 调 get-phone 取手机号并更新（传 id 供后端关联用户）
			try {
				const getPhoneRes = await getPhone(phoneCode, uid)
				const newMobile = (getPhoneRes && (getPhoneRes.phone || getPhoneRes.data?.phone)) ? String(getPhoneRes.phone || getPhoneRes.data.phone).trim() : ''
				if (/^\d{11}$/.test(newMobile)) {
					if (profileMobile) {
						await updateMobile(uid, profileMobile, newMobile, 'gm2025')
					}
					userInfo.mobile = userInfo.phone = newMobile
					uni.setStorageSync('userInfo', userInfo)
					console.log('[手机号快捷登录] 兜底通过 get-phone 获取并更新手机号')
				}
			} catch (err) {
				console.warn('[手机号快捷登录] get-phone 兜底失败:', err)
			}
		}
		
		// 保存微信Session信息
		let openidToSave = null
		if (res.openid) openidToSave = res.openid
		else if (res.user?.openid) openidToSave = res.user.openid
		else if (res.wechat_info?.openid) openidToSave = res.wechat_info.openid
		
		if (res.wechat_info) {
			saveWechatSession(res.wechat_info)
			if (res.wechat_info.openid && !openidToSave) openidToSave = res.wechat_info.openid
		} else {
			const possibleSession = res.session || res.session_key || res.jscode2session || res
			try { saveWechatSession(possibleSession) } catch (e) { }
		}
		
		if (openidToSave) uni.setStorageSync('openid', openidToSave)
		
		uni.hideLoading()
		uni.showToast({ title: '登录成功', icon: 'success' })

		{
			const redirectUrl = consumePostLoginRedirect()
			if (redirectUrl) {
				uni.showToast({ title: '登录成功，返回扫码页', icon: 'none', duration: 1200 })
				setTimeout(() => uni.reLaunch({ url: redirectUrl }), 350)
				return
			}
		}
		
		// 记录登录时间
		uni.setStorageSync('loginTime', Date.now())
		uni.setStorageSync('keepLogin', true)
		
		// 尝试绑定推荐人
		if (inviteCode.value.trim()) {
			await tryBindReferrer(userInfo.mobile || userInfo.phone)
		}
		
		// 使用 mobile 查询用户详情，检查status
		try {
			const mobile = userInfo.mobile || userInfo.phone
			if (mobile) {
				// 查询用户详情
				const userDetailRes = await getUserInfo(mobile)
				
				// 合并用户详情到 userInfo
				if (userDetailRes && userDetailRes.data) {
					userInfo = {
						...userInfo,
						...userDetailRes.data
					}
				} else if (userDetailRes) {
					userInfo = {
						...userInfo,
						...userDetailRes
					}
				}
				
				// 确保关键字段被保留
				const preservedUserId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
				if (preservedUserId) {
					userInfo.user_id = preservedUserId
					userInfo.id = preservedUserId
					userInfo.userId = preservedUserId
					userInfo.uid = preservedUserId
				}
				
				if (!userInfo.mobile && mobile) {
					userInfo.mobile = mobile
				}
				if (!userInfo.phone && mobile) {
					userInfo.phone = mobile
				}
				
				// 重新保存到本地存储
				uni.setStorageSync('userInfo', userInfo)
				
				// 检查用户is_merchant，如果为2则进入平台模式，如果为1则进入商家模式
				const isMerchant = userInfo.is_merchant || userInfo.isMerchant || 0
				if (isMerchant === 2) {
					console.log('[手机号快捷登录] 检测到用户is_merchant为2，自动进入平台模式')
					// 进入平台模式
					switchToMerchantMode()
					return // 直接返回，不执行后续的goToAppHome
				} else if (isMerchant === 1) {
					console.log('[手机号快捷登录] 检测到用户is_merchant为1，自动进入商家模式')
					// 进入商家模式
					switchToShopMode()
					return // 直接返回，不执行后续的goToAppHome
				}
			}
		} catch (detailError) {
			console.error('[手机号快捷登录] 查询用户详情失败:', detailError)
			// 不影响登录流程，继续跳转
		}
		
		// 拉取最新用户信息（含头像），再判断是否弹窗
		try {
			await refreshUserInfo()
		} catch (refreshErr) {
			console.warn('[手机号快捷登录] 刷新用户信息失败，继续用当前 userInfo 判断:', refreshErr)
		}
		const latestUserInfo = uni.getStorageSync('userInfo') || userInfo
		// 检查并处理首次登录：提示是否使用微信头像和昵称（仅当头像为空时弹窗）
		const isFirstLogin = await checkAndHandleFirstLogin(latestUserInfo)
		
		// 如果不是首次登录或用户已选择，跳转到首页
		if (!isFirstLogin) {
			setTimeout(() => {
				goToAppHome()
			}, 1500)
		}
		// ------------------ 成功处理逻辑结束 ------------------

	} catch (error) {
		uni.hideLoading()
		console.error('[手机号快捷登录] 失败:', error)
		const errorMsg = error.message || error.detail || '登录失败'
		uni.showToast({ title: errorMsg, icon: 'none' })
	}
}

const handleWeChatLogin = async () => {
	uni.getProvider({
		service: 'oauth',
		success: ({ provider }) => {
			if (!provider.includes('weixin')) {
				uni.showToast({ title: '当前环境不支持微信登录', icon: 'none' })
				return
			}
			
			// 获取登录凭证（不再提前获取用户信息，登录成功后根据用户选择决定）
			uni.login({
				provider: 'weixin',
				success: async ({ code: wxCode }) => {
					if (!wxCode) {
						uni.showToast({ title: '获取微信登录凭证失败', icon: 'none' })
						return
					}
					
					// 显示加载提示
					uni.showLoading({ title: '登录中...' })
					
					// ========== Code 重复调用检查 ==========
					const now = Date.now()
					const codeInfo = {
						code: wxCode,
						timestamp: now,
						time: new Date(now).toLocaleTimeString()
					}
					
					// 检查是否重复使用
					const isDuplicate = usedCodes.value.some(item => item.code === wxCode)
					if (isDuplicate) {
						const previousUse = usedCodes.value.find(item => item.code === wxCode)
						console.error('❌ [Code重复调用检测] 检测到重复的 code!', {
							currentCode: wxCode,
							currentTime: codeInfo.time,
							previousUse: previousUse ? {
								time: previousUse.time,
								timestamp: previousUse.timestamp,
								timeDiff: now - previousUse.timestamp + 'ms'
							} : '未知',
							allUsedCodes: usedCodes.value
						})
						uni.hideLoading()
						uni.showToast({ 
							title: 'Code已使用过，请重新登录', 
							icon: 'none',
							duration: 3000
						})
						return
					}
					
					// 记录当前 code
					currentCode.value = wxCode
					usedCodes.value.push(codeInfo)
					
					console.log('✅ [Code重复调用检测] 新的 code 获取:', {
						code: wxCode,
						codeLength: wxCode.length,
						timestamp: now,
						time: codeInfo.time,
						totalUsedCodes: usedCodes.value.length,
						previousCodes: usedCodes.value.slice(0, -1).map(item => ({
							code: item.code.substring(0, 10) + '...',
							time: item.time
						}))
					})
					// ========== Code 重复调用检查结束 ==========
					
					try {
						// 调用微信登录接口（nickName 传默认值，登录成功后根据用户选择决定是否使用微信昵称）
						const res = await wechatLogin({
							code: wxCode,
							nickName: '微信用户' // 默认昵称，登录成功后用户可选择是否使用微信昵称
						})
						
						// 登录成功后，标记 code 已使用
								const codeIndex = usedCodes.value.findIndex(item => item.code === wxCode)
								if (codeIndex !== -1) {
									usedCodes.value[codeIndex].used = true
									usedCodes.value[codeIndex].usedAt = Date.now()
									console.log('✅ [Code使用记录] Code 已成功使用:', {
										code: wxCode.substring(0, 10) + '...',
										usedAt: new Date().toLocaleTimeString()
									})
								}
						
						// 保存登录信息（token 使用统一方法保存）
						if (res.token) {
							saveAuth(res)
						}
						
						// 处理用户信息，确保保存用户ID
						let userInfo = {}
						if (res.user) {
							userInfo = {
								...res.user,
								mobile: res.user.mobile || res.user.phone || '', // 微信登录可能没有手机号
								phone: res.user.phone || res.user.mobile || ''
							}
						} else if (res.id || res.user_id || res.userId) {
							// 如果返回数据直接在 res 中，而不是 res.user
							userInfo = {
								...res,
								mobile: res.mobile || res.phone || '',
								phone: res.phone || res.mobile || ''
							}
						}
						
						// 确保 user_id 被正确保存（这是关键字段）
						const userId = res.user_id || res.user?.user_id || res.id || res.user?.id || res.userId || res.user?.userId || res.uid || res.user?.uid
						if (userId) {
							// 优先保存 user_id，其他字段也同步保存
							userInfo.user_id = userId
							userInfo.id = userId
							userInfo.userId = userId
							userInfo.uid = userId
						} else {
							// 如果都没有，尝试从已有数据中获取
							const existingUserId = userInfo.id || userInfo.user_id || userInfo.userId || userInfo.uid
							if (existingUserId) {
								userInfo.user_id = existingUserId
								userInfo.id = existingUserId
								userInfo.userId = existingUserId
								userInfo.uid = existingUserId
							}
						}
						
						// 查询是否商户（如果有手机号）
						if (userInfo.mobile || userInfo.phone) {
							try {
								const mobile = userInfo.mobile || userInfo.phone
								const isMerchant = await checkIsMerchant(mobile)
								userInfo.is_merchant = isMerchant
								userInfo.isMerchant = isMerchant
								console.log('[微信登录] 查询是否商户结果:', isMerchant)
							} catch (merchantError) {
								console.error('[微信登录] 查询是否商户失败:', merchantError)
								userInfo.is_merchant = false
								userInfo.isMerchant = false
							}
						} else {
							userInfo.is_merchant = false
							userInfo.isMerchant = false
						}
						
						// 先保存用户信息到本地存储（即使没有手机号也要保存user_id）
						// 这样onUserLogin才能正确读取到用户ID
						uni.setStorageSync('userInfo', userInfo)
						
						// 然后清除旧用户数据（防止数据混用）
						onUserLogin(userInfo)
						console.log('[微信登录] 保存用户信息:', {
							user_id: userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid,
							mobile: userInfo.mobile,
							phone: userInfo.phone,
							is_merchant: userInfo.is_merchant,
							allKeys: Object.keys(userInfo)
						})
						// 保存微信相关信息（从多个可能的位置获取）
						let openidToSave = null
						if (res.openid) {
							openidToSave = res.openid
						} else if (res.user?.openid) {
							openidToSave = res.user.openid
						} else if (res.wechat_info?.openid) {
							openidToSave = res.wechat_info.openid
						} else if (userInfo.openid) {
							openidToSave = userInfo.openid
						} else if (userInfo.wechat_openid) {
							openidToSave = userInfo.wechat_openid
						}
						
						// 保存 wechat_info 或后端直接返回的 jscode2session 信息（优先使用完整会话数据）
						if (res.wechat_info) {
							// 直接保存对象
							saveWechatSession(res.wechat_info)
							if (res.wechat_info.openid && !openidToSave) openidToSave = res.wechat_info.openid
						} else {
							// 有些后端直接返回 jscode2session 字段或原始 openid/session_key
							const possibleSession = res.session || res.session_key || res.jscode2session || res
							try { saveWechatSession(possibleSession) } catch (e) { console.warn('[微信登录] 保存 wechat session 失败', e) }
							// 如果 res 中包含 openid 字段也尝试保存
							if (res.openid && !openidToSave) openidToSave = res.openid
						}
						
						if (openidToSave) {
							uni.setStorageSync('openid', openidToSave)
							console.log('[微信登录] 已保存 OpenID')
						} else {
							console.warn('[微信登录] 未找到 OpenID，后端返回数据:', {
								hasOpenid: !!res.openid,
								hasUserOpenid: !!res.user?.openid,
								hasWechatInfo: !!res.wechat_info,
								hasWechatInfoOpenid: !!res.wechat_info?.openid,
								hasUserInfoOpenid: !!userInfo.openid
							})
						}
						
						uni.hideLoading()
						
						uni.showToast({ title: '微信登录成功', icon: 'success' })

						{
							const redirectUrl = consumePostLoginRedirect()
							if (redirectUrl) {
								uni.showToast({ title: '登录成功，返回扫码页', icon: 'none', duration: 1200 })
								setTimeout(() => uni.reLaunch({ url: redirectUrl }), 350)
								return
							}
						}
						
						// 记录登录时间和免登录状态（微信登录默认启用7天免登录）
						const loginTime = Date.now()
						uni.setStorageSync('loginTime', loginTime)
						uni.setStorageSync('keepLogin', true)
						console.log('[微信登录] 已启用7天免登录（默认）')
						
						// 记录本次登录使用的邀请码，供后端绑定推荐关系时使用
						if (inviteCode.value.trim()) {
							uni.setStorageSync('inviteCode', inviteCode.value.trim())
						// 尝试绑定推荐人
						if (inviteCode.value.trim()) {
							await tryBindReferrer(userInfo.mobile || userInfo.phone)
						}
						}
						
						// 使用 mobile 查询用户详情，检查status
						try {
							const mobile = userInfo.mobile || userInfo.phone
							if (mobile) {
								// 查询用户详情
								const userDetailRes = await getUserInfo(mobile)
								
								// 合并用户详情到 userInfo
								if (userDetailRes && userDetailRes.data) {
									userInfo = {
										...userInfo,
										...userDetailRes.data
									}
								} else if (userDetailRes) {
									userInfo = {
										...userInfo,
										...userDetailRes
									}
								}
								
								// 确保关键字段被保留
								const preservedUserId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
								if (preservedUserId) {
									userInfo.user_id = preservedUserId
									userInfo.id = preservedUserId
									userInfo.userId = preservedUserId
									userInfo.uid = preservedUserId
								}
								
								if (!userInfo.mobile && mobile) {
									userInfo.mobile = mobile
								}
								if (!userInfo.phone && mobile) {
									userInfo.phone = mobile
								}
								
								// 重新保存到本地存储
								uni.setStorageSync('userInfo', userInfo)
								
								// 检查用户status，如果为3则进入平台模式
								const userStatus = userInfo.status || userInfo.new_status || 0
								if (userStatus === 3) {
									console.log('[微信登录] 检测到用户status为3，自动进入平台模式')
									// 进入平台模式
									switchToMerchantMode()
									return // 直接返回，不执行后续的goToAppHome
								}
							}
						} catch (detailError) {
							console.error('[微信登录] 查询用户详情失败:', detailError)
							// 不影响登录流程，继续跳转
						}
						
						// 拉取最新用户信息（含头像），再判断是否弹窗
						try {
							await refreshUserInfo()
						} catch (refreshErr) {
							console.warn('[微信登录] 刷新用户信息失败，继续用当前 userInfo 判断:', refreshErr)
						}
						const latestUserInfo = uni.getStorageSync('userInfo') || userInfo
						// 检查并处理首次登录：提示是否使用微信头像和昵称（仅当头像为空时弹窗）
						const isFirstLogin = await checkAndHandleFirstLogin(latestUserInfo)
						
						// 如果不是首次登录或用户已选择，跳转到首页
						if (!isFirstLogin) {
							setTimeout(() => {
								goToAppHome()
							}, 1500)
						}
					} catch (error) {
						uni.hideLoading()
						
						// 提取错误信息
						const errorMsg = error.detail || error.message || ''
						const errorCode = error.code || ''
						
						console.error('========== [登录错误分析] ==========')
						console.error('[错误信息]', errorMsg)
						console.error('[错误代码]', errorCode)
						console.error('[完整错误对象]', error)
						
						// 检查是否是数据库错误
						const isDatabaseError = errorMsg.includes('Unknown column') || 
						                        errorMsg.includes('referral_code') ||
						                        errorMsg.includes('where clause') ||
						                        errorMsg.includes('1054')
						
						// 检查是否是 code 相关错误（更精确的判断，避免误判数据库错误）
						const isCodeError = !isDatabaseError && (
						                   errorMsg.includes('登录凭证') ||
						                   errorMsg.includes('code 已') ||
						                   errorMsg.includes('code已') ||
						                   errorMsg.includes('已使用') || 
						                   errorMsg.includes('invalid code') ||
						                   errorMsg.includes('40029') ||
						                   errorMsg.includes('code expired') ||
						                   errorMsg.includes('code已过期'))
						
						// 检查是否是微信接口调用失败
						const isWechatApiError = errorMsg.includes('openid') || 
						                        errorMsg.includes('session_key') ||
						                        errorMsg.includes('无法获取')
						
						if (isDatabaseError) {
							console.error('❌ [数据库错误] 后端数据库配置问题:', {
								error: errorMsg,
								'问题': '数据库表缺少 referral_code 字段',
								'解决方案': '需要后端在数据库表中添加 referral_code 字段'
							})
						}
						
						if (isCodeError) {
							console.error('❌ [Code错误] 可能是 code 相关错误:', {
								code: wxCode,
								error: errorMsg,
								usedCodes: usedCodes.value,
								'可能原因': [
									'1. code 已过期（有效期5分钟）',
									'2. code 已使用过（每个code只能使用一次）',
									'3. code 格式错误'
								]
							})
						}
						
						if (isWechatApiError) {
							console.error('❌ [微信接口错误] 后端无法调用微信接口:', {
								error: errorMsg,
								'可能原因': [
									'1. 后端 appid 配置错误（应为: ' + WECHAT_APPID + '，须与小程序一致）',
									'2. 后端 secret 配置错误或未配置',
									'3. 后端网络问题，无法访问微信服务器',
									'4. code 已过期或已使用',
									'5. 后端代码逻辑错误'
								],
								'建议': '请检查后端配置和代码，确保能正确调用微信 jscode2session 接口'
							})
						}
						
						console.error('[Code状态] 当前使用的 code:', {
							code: wxCode,
							codeLength: wxCode.length,
							usedCodesCount: usedCodes.value.length,
							allCodes: usedCodes.value.map(item => ({
								code: item.code.substring(0, 10) + '...',
								time: item.time,
								used: item.used || false,
								timeDiff: item.usedAt ? (item.usedAt - item.timestamp) + 'ms' : '未使用'
							}))
						})
						console.error('====================================')
						
						// 显示用户友好的错误提示
						let userMessage = '微信登录失败'
						if (isDatabaseError) {
							userMessage = '服务器配置错误，请联系管理员'
						} else if (isWechatApiError) {
							userMessage = '后端配置错误，请联系管理员'
						} else if (isCodeError) {
							userMessage = '登录凭证已失效，请重新登录'
						} else if (errorMsg) {
							// 如果错误信息太长，截取前50个字符
							userMessage = errorMsg.length > 50 ? errorMsg.substring(0, 50) + '...' : errorMsg
						}
						
						uni.showToast({ 
							title: userMessage, 
							icon: 'none',
							duration: 3000
						})
					}
				},
				fail: (error) => {
					console.error('获取微信登录凭证失败', error)
					uni.hideLoading()
					uni.showToast({ title: '获取微信登录凭证失败', icon: 'none' })
				}
			})
		},
		fail: () => {
			uni.showToast({ title: '无法获取登录渠道', icon: 'none' })
		}
	})
}

/**
 * 计算签名 (sha1(rawData + appId))
 * 使用纯JavaScript实现的SHA1算法（不依赖外部库）
 */
const calculateSignature = async (rawData, appId) => {
	// 确保rawData是字符串
	const rawDataStr = typeof rawData === 'string' ? rawData : JSON.stringify(rawData)
	// 拼接字符串：rawData + appId
	const signStr = rawDataStr + appId
	
	console.log('[签名计算] 原始字符串长度:', signStr.length)
	console.log('[签名计算] 原始字符串:', signStr.substring(0, 100) + '...')
	
	// 使用纯JavaScript实现SHA1
	try {
		const signature = sha1(signStr)
		console.log('[签名计算] SHA1结果:', signature)
		return signature
	} catch (error) {
		console.error('SHA1计算失败:', error)
		throw new Error('SHA1计算失败: ' + error.message)
	}
}

/**
 * SHA1哈希算法实现（修复版本，确保与后端Python hashlib.sha1一致）
 * 参考标准SHA1算法实现，修复填充逻辑
 */
function sha1(message) {
	// 将字符串转换为UTF-8字节数组
	function stringToUtf8Bytes(str) {
		const bytes = []
		for (let i = 0; i < str.length; i++) {
			const charCode = str.charCodeAt(i)
			if (charCode < 0x80) {
				bytes.push(charCode)
			} else if (charCode < 0x800) {
				bytes.push(0xC0 | (charCode >> 6))
				bytes.push(0x80 | (charCode & 0x3F))
			} else if (charCode < 0xD800 || charCode >= 0xE000) {
				bytes.push(0xE0 | (charCode >> 12))
				bytes.push(0x80 | ((charCode >> 6) & 0x3F))
				bytes.push(0x80 | (charCode & 0x3F))
			} else {
				// 代理对
				i++
				const charCode2 = str.charCodeAt(i)
				const codePoint = 0x10000 + (((charCode & 0x3FF) << 10) | (charCode2 & 0x3FF))
				bytes.push(0xF0 | (codePoint >> 18))
				bytes.push(0x80 | ((codePoint >> 12) & 0x3F))
				bytes.push(0x80 | ((codePoint >> 6) & 0x3F))
				bytes.push(0x80 | (codePoint & 0x3F))
			}
		}
		return bytes
	}
	
	function rotateLeft(value, amount) {
		return (value << amount) | (value >>> (32 - amount))
	}
	
	function addUnsigned(x, y) {
		const lsw = (x & 0xFFFF) + (y & 0xFFFF)
		const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
		return (msw << 16) | (lsw & 0xFFFF)
	}
	
	function sha1ft(t, b, c, d) {
		if (t < 20) return (b & c) | ((~b) & d)
		if (t < 40) return b ^ c ^ d
		if (t < 60) return (b & c) | (b & d) | (c & d)
		return b ^ c ^ d
	}
	
	function sha1kt(t) {
		return (t < 20) ? 0x5A827999 : (t < 40) ? 0x6ED9EBA1 : (t < 60) ? 0x8F1BBCDC : 0xCA62C1D6
	}
	
	// 转换为UTF-8字节数组
	const bytes = stringToUtf8Bytes(message)
	const messageLength = bytes.length
	const bitLength = messageLength * 8
	
	let h0 = 0x67452301
	let h1 = 0xEFCDAB89
	let h2 = 0x98BADCFE
	let h3 = 0x10325476
	let h4 = 0xC3D2E1F0
	
	// 预处理：添加填充位（修复版本）
	// SHA1要求消息长度必须是512位的倍数，所以需要填充
	const padding = []
	padding.push(0x80) // 添加 0x80 字节
	
	// 计算需要填充的字节数，使得 (messageLength + paddingLength + 8) % 64 === 0
	const paddingLength = (64 - ((messageLength + 9) % 64)) % 64
	for (let i = 0; i < paddingLength; i++) {
		padding.push(0x00)
	}
	
	// 添加消息长度（64位，大端序）
	const lengthBytes = []
	for (let i = 7; i >= 0; i--) {
		lengthBytes.push((bitLength >>> (i * 8)) & 0xFF)
	}
	
	// 合并所有字节
	const allBytes = [...bytes, ...padding, ...lengthBytes]
	
	// 处理每个512位块
	for (let blockStart = 0; blockStart < allBytes.length; blockStart += 64) {
		const w = []
		// 将512位块转换为16个32位字
		for (let i = 0; i < 16; i++) {
			const offset = blockStart + i * 4
			w[i] = ((allBytes[offset] || 0) << 24) |
				((allBytes[offset + 1] || 0) << 16) |
				((allBytes[offset + 2] || 0) << 8) |
				(allBytes[offset + 3] || 0)
		}
		
		// 扩展到80个字
		for (let i = 16; i < 80; i++) {
			w[i] = rotateLeft(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1)
		}
		
		let a = h0
		let b = h1
		let c = h2
		let d = h3
		let e = h4
		
		// 主循环
		for (let i = 0; i < 80; i++) {
			const temp = addUnsigned(addUnsigned(rotateLeft(a, 5), sha1ft(i, b, c, d)), addUnsigned(addUnsigned(e, w[i]), sha1kt(i)))
			e = d
			d = c
			c = rotateLeft(b, 30)
			b = a
			a = temp
		}
		
		h0 = addUnsigned(h0, a)
		h1 = addUnsigned(h1, b)
		h2 = addUnsigned(h2, c)
		h3 = addUnsigned(h3, d)
		h4 = addUnsigned(h4, e)
	}
	
	// 转换为十六进制字符串
	function toHex(value) {
		let hex = ''
		for (let i = 7; i >= 0; i--) {
			const byte = (value >>> (i * 4)) & 0xF
			hex += byte.toString(16)
		}
		return hex
	}
	
	return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4)
}

const openAgreement = (type) => {
	// 跳转到对应的协议页面
	const url = `/subPackages/page1/pages/agreement/${type}`
	console.log(`[登录页] 跳转到协议页面: ${type}, URL: ${url}`)
	uni.navigateTo({
		url: url,
		fail: (err) => {
			console.error(`[登录页] 跳转协议页面失败: ${type}`, err)
			uni.showToast({ 
				title: `无法打开${type === 'user' ? '用户协议' : '隐私政策'}`, 
				icon: 'none' 
			})
		}
	})
}


/**
 * 尝试绑定推荐人
 * @param {String} userMobile 当前用户手机号
 */
const tryBindReferrer = async (userMobile) => {
	const code = inviteCode.value.trim()
	
	// 检查是否是扫码进入
	const pending = getPendingReferrer()
	const isFromQrcode = pending && (pending.source === 'qrcode' || pending.referrerId)
	
	if (!code) {
		// 如果是扫码登录且没有推荐码，静默处理（不提示）
		if (isFromQrcode) {
			console.log('ℹ️ [推荐人绑定] 扫码进入但未找到推荐码')
		}
		return
	}
	
	// 获取当前用户标识（mobile参数，只要有值就调用接口，不验证格式）
	// 优先使用传入的参数，然后尝试从本地存储获取
	const userInfo = uni.getStorageSync('userInfo') || {}
	const currentUserMobile = userMobile || 
	                          phone.value || 
	                          userInfo.mobile || 
	                          userInfo.phone ||
	                          ''
	
	// 只要有值就调用接口，不验证是否为手机号格式
	if (!currentUserMobile || !currentUserMobile.trim()) {
		console.warn('❌ [推荐人绑定] 无法获取用户标识，跳过绑定推荐人')
		// 如果无法获取标识，保存推荐码到本地，等待首页绑定
		if (code) {
			uni.setStorageSync('pendingReferralCode', code)
		}
		return
	}
	
	
	try {
		// 清理推荐码：去除所有空白字符和可能的引号/转义字符
		let cleanCode = code.trim()
		cleanCode = cleanCode.replace(/^["']|["']$/g, '').replace(/\\/g, '').trim()
		
		// 根据API文档，只传递 mobile 和 referrer_code
		const params = {
			mobile: currentUserMobile,
			referrer_code: cleanCode
		}
		
		const result = await bindReferrer(params)
		
		// 检查响应是否成功
		const isSuccess = result?.success === true || 
		                  result?.code === 200 || 
		                  result?.code === 0 ||
		                  (result?.data && result.data.success === true) ||
		                  (!result?.code && !result?.error && !result?.message?.includes('失败'))
		
		if (isSuccess) {
			console.log('✅ [推荐人绑定] 绑定成功')
			// 绑定成功，不显示提示（静默成功）
		} else {
			console.warn('⚠️ [推荐人绑定] 绑定失败:', result)
			
			// 检查是否是"已绑定"的错误
			const errorMsg = result?.message || result?.msg || result?.errorMsg || result?.detail || ''
			const isAlreadyBound = errorMsg.includes('已有推荐人') || 
			                      errorMsg.includes('不能重复绑定') || 
			                      errorMsg.includes('已绑定') ||
			                      errorMsg.includes('重复绑定')
			
			if (isAlreadyBound) {
				// 提示已绑定
				uni.showToast({
					title: '已绑定',
					icon: 'none',
					duration: 2000
				})
			} else {
				// 绑定失败，显示失败信息
				const failMsg = errorMsg || '绑定失败'
				console.error('❌ [推荐人绑定] 绑定失败，失败信息:', failMsg)
				uni.showToast({
					title: failMsg,
					icon: 'none',
					duration: 3000
				})
			}
		}
	} catch (error) {
		// 检查错误信息中是否包含"已绑定"相关提示
		const errorMsg = error.message || error.detail || error.errorMsg || ''
		const errorData = error.data || error.response || {}
		const errorDataMsg = errorData.message || errorData.msg || errorData.errorMsg || errorData.detail || ''
		const fullErrorMsg = (errorMsg + ' ' + errorDataMsg).toLowerCase()
		
		const isAlreadyBound = fullErrorMsg.includes('已有推荐人') || 
		                      fullErrorMsg.includes('不能重复绑定') || 
		                      fullErrorMsg.includes('已绑定') ||
		                      fullErrorMsg.includes('重复绑定') ||
		                      error.message?.includes('已有推荐人') ||
		                      error.message?.includes('不能重复绑定') ||
		                      error.message?.includes('已绑定')
		
		if (isAlreadyBound) {
			console.log('ℹ️ [推荐人绑定] 检测到"已绑定"错误，清除推荐码')
			// 清除推荐码，不再尝试
			uni.removeStorageSync('pendingReferralCode')
			const pending = getPendingReferrer()
			if (pending) {
				uni.removeStorageSync('pendingReferrer')
			}
			// 提示已绑定
			uni.showToast({ 
				title: '已绑定', 
				icon: 'none',
				duration: 2000
			})
		} else {
			// 绑定失败，显示失败信息
			const failMsg = errorMsg || errorDataMsg || error.message || '绑定失败'
			console.error('❌ [推荐人绑定] 绑定失败，失败信息:', failMsg)
			uni.showToast({ 
				title: failMsg, 
				icon: 'none',
				duration: 3000
			})
		}
	}
}

/**
 * 检查是否满足7天免登录条件
 */
const checkAutoLogin = () => {
	try {
		const token = uni.getStorageSync('token')
		const userInfo = uni.getStorageSync('userInfo')
		const keepLogin = uni.getStorageSync('keepLogin')
		const loginTime = uni.getStorageSync('loginTime')
		
		// 如果没有token或用户信息，不自动登录
		if (!token || !userInfo || Object.keys(userInfo).length === 0) {
			console.log('[自动登录] 没有token或用户信息，跳过自动登录')
			return false
		}
		
		// 如果没有勾选免登录，不自动登录
		if (!keepLogin) {
			console.log('[自动登录] 未勾选7天免登录，跳过自动登录')
			return false
		}
		
		// 检查登录时间是否在7天内（7天 = 7 * 24 * 60 * 60 * 1000 毫秒）
		if (!loginTime) {
			console.log('[自动登录] 没有登录时间记录，跳过自动登录')
			return false
		}
		
		const now = Date.now()
		const sevenDays = 7 * 24 * 60 * 60 * 1000
		const timeDiff = now - loginTime
		
		if (timeDiff > sevenDays) {
			console.log('[自动登录] 登录时间已超过7天，跳过自动登录')
			// 清除免登录状态
			uni.removeStorageSync('keepLogin')
			return false
		}
		
		// 检查用户信息是否完整（至少要有user_id或mobile标识）
		const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
		const mobile = userInfo.mobile || userInfo.phone
		
		// 只要有user_id或mobile标识（不验证格式）就可以自动登录
		if (!userId && (!mobile || !mobile.trim())) {
			console.log('[自动登录] 用户信息不完整，跳过自动登录')
			return false
		}
		
		console.log('[自动登录] 满足条件，自动跳转到首页', {
			hasToken: !!token,
			hasUserInfo: !!userInfo,
			keepLogin: keepLogin,
			loginTime: new Date(loginTime).toLocaleString(),
			timeDiff: Math.floor(timeDiff / (24 * 60 * 60 * 1000)) + '天',
			userId: userId,
			mobile: mobile
		})
		
		// 自动登录时，如果有推荐码，也需要绑定推荐人
		// 注意：这里需要在跳转前检查，因为跳转后页面可能被卸载
		const currentReferralCode = inviteCode.value ? inviteCode.value.trim() : ''
		if (currentReferralCode) {
			// 获取用户标识（mobile参数，只要有值就调用接口，不验证格式）
			const userMobile = mobile || userInfo.mobile || userInfo.phone
			if (userMobile && userMobile.trim()) {
				// 异步执行绑定，不阻塞跳转
				tryBindReferrer(userMobile).catch((error) => {
					console.error('❌ [自动登录] 推荐人绑定失败:', error)
				})
			} else {
				// 保存推荐码到本地，供首页使用
				if (currentReferralCode) {
					uni.setStorageSync('pendingReferralCode', currentReferralCode)
				}
			}
		}
		
		// 自动跳转到首页
		setTimeout(() => {
			goToAppHome()
		}, 500)
		
		return true
	} catch (error) {
		console.error('[自动登录] 检查失败:', error)
		return false
	}
}

// 页面加载时检查并自动填充待绑定的推荐码，同时检查自动登录
onLoad((options) => {
	// ========== 打印扫码内容 ==========
	console.log('========== [登录页] 扫码进入 - 完整参数信息 ==========')
	console.log('📋 [登录页] options 完整对象:', JSON.stringify(options, null, 2))
	console.log('📋 [登录页] options 原始对象:', options)
	console.log('📋 [登录页] options.scene:', options?.scene)
	console.log('📋 [登录页] options.query:', options?.query)
	console.log('📋 [登录页] options.path:', options?.path)
	console.log('📋 [登录页] options.shareTicket:', options?.shareTicket)
	
	// 打印所有 options 中的键值对
	if (options) {
		console.log('📋 [登录页] options 所有键:', Object.keys(options))
		Object.keys(options).forEach(key => {
			console.log(`📋 [登录页] options.${key}:`, options[key], `(类型: ${typeof options[key]})`)
		})
	}
	
	// 如果存在 scene 参数，打印详细信息
	if (options?.scene) {
		console.log('📋 [登录页] scene 原始值:', options.scene)
		try {
			const decoded = decodeURIComponent(options.scene)
			console.log('📋 [登录页] scene 解码后:', decoded)
			// 解析 scene 参数
			const sceneParams = {}
			decoded.split('&').forEach((pair) => {
				if (pair) {
					const equalIndex = pair.indexOf('=')
					if (equalIndex !== -1) {
						const k = pair.substring(0, equalIndex).trim()
						const v = pair.substring(equalIndex + 1).trim()
						sceneParams[k] = v
					}
				}
			})
			console.log('📋 [登录页] scene 解析后的参数对象:', sceneParams)
		} catch (e) {
			console.error('❌ [登录页] scene 解码失败:', e)
		}
	}
	
	// 打印 query 中的所有参数
	if (options?.query) {
		console.log('📋 [登录页] query 所有参数:', options.query)
		Object.keys(options.query).forEach(key => {
			console.log(`📋 [登录页] query.${key}:`, options.query[key])
		})
	}
	
	console.log('========== [登录页] 扫码内容打印结束 ==========')
	// ========== 打印扫码内容结束 ==========
	
	// 优先从页面参数中获取推荐码（如果直接通过路径参数传递）
	if (options) {
		const referralCode = options.r || 
		                    options.referralCode || 
		                    options.inviteCode || 
		                    options.referral_code || 
		                    options.invite_code || 
		                    options.code || ''
		
		if (referralCode) {
			inviteCode.value = referralCode.trim()
		}
		
		// 检查是否有 scene 参数（某些情况下 scene 可能在页面参数中）
		if (options.scene) {
			try {
				let decoded = options.scene
				try {
					decoded = decodeURIComponent(options.scene)
				} catch (e) {
					decoded = options.scene
				}
				
				// 检查是否包含 key=value 格式（包含 = 符号）
				if (decoded.includes('=')) {
					// 按 & 分割参数，解析 key=value 格式
					decoded.split('&').forEach((pair) => {
						if (!pair) return
						const equalIndex = pair.indexOf('=')
						if (equalIndex === -1) return
						const k = pair.substring(0, equalIndex).trim()
						let v = pair.substring(equalIndex + 1).trim()
						// 清理推荐码：去除可能的引号和转义字符
						v = v.replace(/^["']|["']$/g, '').replace(/\\/g, '').trim()
						if (k === 'r' && v) {
							inviteCode.value = v
						}
					})
				} else {
					// 如果 scene 是纯字符串（没有 = 符号），直接作为推荐码
					const cleanCode = decoded.replace(/^["']|["']$/g, '').replace(/\\/g, '').trim()
					if (cleanCode) {
						inviteCode.value = cleanCode
						console.log('✅ [登录页] scene 是纯字符串，直接作为推荐码:', inviteCode.value)
					}
				}
			} catch (e) {
				console.error('❌ [登录页] 解析页面 scene 参数失败:', e)
			}
		}
	}
	
	// 如果没有从页面参数获取到，则检查待绑定的推荐码（App.vue 中保存的）
	if (!inviteCode.value) {
		checkAndFillPendingReferrer()
	}
	
	// 检查是否满足自动登录条件
	const autoLoggedIn = checkAutoLogin()
	if (autoLoggedIn) {
		console.log('[登录页] 已自动登录，跳转到首页')
	}
})
</script>

<style scoped>
/* 引入 iconfont 样式 */
@import "@/static/999/iconfont.css";

.login-page {
	position: relative;
	height: 100vh;
	background: linear-gradient(135deg, #eef1f6, #dae2f2);
	padding: 40rpx;
	box-sizing: border-box;
	overflow: hidden;
	display: flex;
	justify-content: center;
	align-items: center;
}

.login-card {
	position: relative;
	background: rgba(255, 255, 255, 0.95);
	border-radius: 40rpx;
	padding: 40rpx 50rpx;
	box-shadow: 0 40rpx 110rpx rgba(18, 53, 93, 0.16);
	width: min(1100rpx, 100%);
	height: calc(100% - 80rpx);
	max-height: 100%;
	backdrop-filter: blur(12rpx);
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	justify-content: center;
	align-items: center;
}

.login-card::after {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: 42rpx;
	border: 2rpx solid rgba(255, 255, 255, 0.4);
	pointer-events: none;
}

.logo-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 80rpx;
}

.app-title {
	font-size: 46rpx;
	font-weight: 700;
	color: #111a34;
	letter-spacing: 2rpx;
}

.input-group {
	display: flex;
	flex-direction: column;
	margin-bottom: 36rpx;
}

.label {
	font-size: 28rpx;
	color: #4f4f4f;
	margin-bottom: 14rpx;
}

.input {
	background: #f7f8fa;
	border-radius: 22rpx;
	padding: 30rpx;
	font-size: 32rpx;
	color: #1f1f1f;
	height: 92rpx;
	box-sizing: border-box;
}

.placeholder {
	color: #b8b8b8;
}

.input-with-icon {
	display: flex;
	align-items: center;
	background: #f7f8fa;
	border-radius: 22rpx;
	padding-left: 22rpx;
	padding-right: 22rpx;
	border: 2rpx solid transparent;
	transition: border-color 0.2s ease, box-shadow 0.2s ease;
	height: 92rpx;
	box-sizing: border-box;
}

.input-with-icon .input {
	border: none;
	background: transparent;
	padding: 0;
	flex: 1;
	height: 100%;
}

.scan-btn {
	padding: 8rpx 12rpx;
	margin-left: 12rpx;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-left: 1rpx solid rgba(0, 0, 0, 0.1);
	min-width: 48rpx;
	transition: opacity 0.2s;
}

.scan-btn:active {
	opacity: 0.7;
}

.scan-icon {
	font-size: 40rpx;
	line-height: 1;
}

.scan-icon.iconfont {
	font-size: 40rpx;
	color: #3d6bff;
	font-family: "iconfont" !important;
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	display: inline-block;
	line-height: 1;
}

.iconfont {
	font-family: "iconfont" !important;
	font-size: 34rpx;
	color: #8c9eff;
	min-width: 34rpx;
	text-align: center;
}

.eye-icon {
	padding: 8rpx;
	margin-left: 12rpx;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 40rpx;
}

.eye-iconfont {
	font-family: "iconfont" !important;
	font-size: 36rpx;
	font-style: normal;
	color: #999;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	user-select: none;
}

.input-with-icon:focus-within {
	border-color: rgba(61, 107, 255, 0.4);
	box-shadow: 0 0 0 6rpx rgba(61, 107, 255, 0.08);
}

.code-row {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.code-input {
	flex: 1;
}

.code-btn {
	width: 230rpx;
	background: #f0f4ff;
	color: #3d6bff;
	font-size: 28rpx;
	border-radius: 20rpx;
	padding: 0 20rpx;
	height: 92rpx;
	line-height: 92rpx;
}

.code-btn:disabled {
	background: #f1f1f1;
	color: #a6a6a6;
}

.login-btn,
.wechat-btn {
	position: relative;
	width: 100%;
	height: 92rpx;
	border-radius: 22rpx;
	font-size: 32rpx;
	font-weight: 600;
	overflow: hidden;
	transition: box-shadow 0.25s ease, filter 0.25s ease;
	box-shadow: 0 20rpx 45rpx rgba(61, 107, 255, 0.25);
	display: flex;
	align-items: center;
	justify-content: center;
	line-height: 92rpx;
}

.login-options {
	margin-bottom: 30rpx;
	padding: 0 10rpx;
}

.checkbox-item {
	display: flex;
	align-items: center;
	gap: 8rpx;
	justify-content: center;
	flex-wrap: nowrap;
	white-space: nowrap;
}

.my-checkbox {
	width: 28rpx;
	height: 28rpx;
	border: 2rpx solid #c0c4cc;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
	background: #fff;
	flex-shrink: 0;
}

.my-checkbox.active {
	background: #3d6bff;
	border-color: #3d6bff;
}

.my-checkbox.active::after {
	content: '';
	width: 16rpx;
	height: 8rpx;
	border-left: 4rpx solid #fff;
	border-bottom: 4rpx solid #fff;
	transform: rotate(-45deg) translateY(-2rpx);
}

.checkbox-label {
	font-size: 22rpx;
	color: #666;
	white-space: nowrap;
}

.login-btn {
	background: linear-gradient(135deg, #3d6bff, #6ca4ff);
	background-size: 200% 200%;
	color: #fff;
	margin-top: 40rpx;
	margin-bottom: 30rpx;
	animation: flow 3s ease infinite;
}

.login-btn.btn-disabled {
	opacity: 0.6;
	box-shadow: none;
	pointer-events: auto;
	cursor: not-allowed;
}

.login-btn.btn-disabled:active {
	opacity: 0.6;
}

.helper-text {
	display: block;
	text-align: center;
	font-size: 26rpx;
	color: #9c9ca0;
	margin: 0 0 30rpx;
}

.wechat-btn {
	background: linear-gradient(120deg, #07c160, #23d37a, #07c160);
	background-size: 200% 200%;
	color: #fff;
	margin-bottom: 30rpx;
	animation: flow 2.6s ease infinite;
	box-shadow: 0 20rpx 45rpx rgba(7, 193, 96, 0.25);
	margin-top: 0;
}

.wechat-btn.btn-disabled {
	opacity: 0.6;
	box-shadow: none;
	pointer-events: auto;
	cursor: not-allowed;
	animation: none;
}

.wechat-btn.btn-disabled:active {
	opacity: 0.6;
}

.tip {
	display: block;
	margin-top: 12rpx;
	text-align: center;
	font-size: 24rpx;
	color: #ff5252;
}

.agreement-checkbox {
	margin-top: 20rpx;
	margin-bottom: 0;
	width: 100%;
}

.agreement {
	margin-top: 16rpx;
	font-size: 24rpx;
	color: #9c9ca0;
	text-align: center;
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 4rpx;
}

.link {
	color: #3d6bff;
	font-weight: 500;
	font-size: 22rpx;
	white-space: nowrap;
}

/* 完善资料浮层 */
.profile-setup-mask {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
	box-sizing: border-box;
}
.profile-setup-card {
	width: 100%;
	max-width: 620rpx;
	background: #fff;
	border-radius: 32rpx;
	padding: 48rpx 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.profile-setup-title {
	font-size: 36rpx;
	font-weight: 600;
	color: #111a34;
	margin-bottom: 12rpx;
}
.profile-setup-desc {
	font-size: 26rpx;
	color: #6b7280;
	text-align: center;
	margin-bottom: 36rpx;
	line-height: 1.4;
}
.profile-setup-avatar-row {
	margin-bottom: 32rpx;
}
.profile-setup-avatar-btn {
	padding: 0;
	margin: 0;
	background: transparent;
	border: none;
	line-height: 0;
	width: 160rpx;
	height: 160rpx;
	border-radius: 50%;
	overflow: hidden;
}
.profile-setup-avatar-btn::after {
	border: none;
}
.profile-setup-avatar-img {
	width: 100%;
	height: 100%;
	display: block;
}
.profile-setup-avatar-placeholder {
	width: 160rpx;
	height: 160rpx;
	border-radius: 50%;
	background: #f0f2f5;
	display: flex;
	align-items: center;
	justify-content: center;
}
.profile-setup-avatar-text {
	font-size: 24rpx;
	color: #9ca3af;
}
.profile-setup-nickname-row {
	width: 100%;
	margin-bottom: 40rpx;
}
.profile-setup-input {
	width: 100%;
	height: 88rpx;
	background: #f7f8fa;
	border-radius: 20rpx;
	padding: 0 28rpx;
	font-size: 30rpx;
	color: #1f1f1f;
	box-sizing: border-box;
}
.profile-setup-actions {
	display: flex;
	gap: 24rpx;
	width: 100%;
	justify-content: center;
}
.profile-setup-btn {
	flex: 1;
	max-width: 260rpx;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 24rpx;
	font-size: 30rpx;
	font-weight: 500;
}
.profile-setup-btn.primary {
	background: linear-gradient(135deg, #3d6bff, #5b8def);
	color: #fff;
	border: none;
}
.profile-setup-btn.secondary {
	background: #f0f2f5;
	color: #4f4f4f;
	border: none;
}

@keyframes flow {
	0% {
		background-position: 0% 50%;
	}
	50% {
		background-position: 100% 50%;
	}
	100% {
		background-position: 0% 50%;
	}
}

/* 使用888文件夹的iconfont，已在App.vue中全局引入 */
/* icon-biyanjing 和 icon-yanjing 已在999的iconfont.css中定义 */
</style>
