<template>
	<view class="login-page">
		<view class="login-card">
			<view class="logo-wrapper">
				<text class="app-title">欢迎使用</text>
			</view>

			<button 
				class="wechat-btn" 
				hover-class="btn-hover" 
				@tap="handleWeChatLogin"
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
	</view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { wechatLogin, phonePasswordLogin, checkIsMerchant } from '@/api/auth.js'
import { bindReferrer, getUserInfo } from '@/api/user.js'
import { onUserLogin, setStorage } from '@/utils/storage.js'
import { saveAuth } from '@/utils/auth.js'
import { WECHAT_APPID } from '@/utils/config.js'
import { getPendingReferrer } from '@/utils/referral.js'
import { switchToMerchantMode, switchToShopMode } from '@/utils/tabbar.js'

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

const phonePattern = /^1[3-9]\d{9}$/

const canLogin = computed(() => {
	const phoneValid = phonePattern.test(phone.value)
	const passwordValid = password.value.trim().length >= 6
	const result = phoneValid && passwordValid
	console.log('[登录] canLogin 计算:', {
		phone: phone.value,
		phoneValid,
		passwordLength: password.value.trim().length,
		passwordValid,
		result
	})
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
			console.log('[扫码] 扫码结果:', res)
			const result = res.result || ''
			
			// 尝试解析二维码内容
			// 二维码内容可能是：
			// 1. 直接的推荐码字符串
			// 2. JSON 格式：{"referralCode": "ABC123"} 或 {"inviteCode": "ABC123"}
			// 3. URL 格式：?r=ABC123 或 ?referralCode=ABC123 或 ?inviteCode=ABC123
			
			let code = ''
			
			// 尝试解析 JSON
			try {
				const jsonData = JSON.parse(result)
				code = jsonData.referralCode || jsonData.inviteCode || jsonData.code || jsonData.r || ''
			} catch (e) {
				// 不是 JSON，尝试解析 URL
				if (result.includes('?') || result.includes('&') || result.includes('=')) {
					// 提取 URL 参数部分
					const urlPart = result.includes('?') ? result.split('?')[1] : result
					const urlParams = new URLSearchParams(urlPart)
					// 支持多种参数名：r, referralCode, inviteCode, referral_code, invite_code
					code = urlParams.get('r') || 
					       urlParams.get('referralCode') || 
					       urlParams.get('inviteCode') || 
					       urlParams.get('referral_code') || 
					       urlParams.get('invite_code') || 
					       urlParams.get('code') || ''
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
			console.log('[登录] 自动填充待绑定推荐码:', pending.referralCode)
		}
	} catch (error) {
		console.error('[登录] 检查待绑定推荐码失败:', error)
	}
}

const goToAppHome = () => {
			const target = '/subPackages/page2/pages/home/home'
	setTimeout(() => {
		uni.switchTab({
			url: target,
			fail: () => {
				uni.reLaunch({ url: target })
			}
		})
	}, 400)
}

const handleLogin = async () => {
	console.log('[登录] handleLogin 被调用')
	console.log('[登录] canLogin.value:', canLogin.value)
	console.log('[登录] phone.value:', phone.value)
	console.log('[登录] password.value:', password.value ? '***' : '')
	
	if (!canLogin.value) {
		console.log('[登录] 登录条件不满足')
		tip.value = '请输入正确的手机号和密码（至少6位）'
		uni.showToast({ title: '请输入正确的手机号和密码（至少6位）', icon: 'none' })
		return
	}
	
	tip.value = ''
	console.log('[登录] 开始登录流程')
	uni.showLoading({ title: '登录中' })
	
	try {
		// 调用手机号密码登录接口（一键登录，不存在则自动注册）
		console.log('[登录] 开始调用登录接口，参数:', {
			mobile: phone.value,
			password: password.value ? '***' : '',
			name: nickname.value.trim() || '(未填写)'
		})
		
		// 检查 phonePasswordLogin 函数是否存在
		if (!phonePasswordLogin) {
			console.error('[登录] phonePasswordLogin 函数不存在')
			throw new Error('登录函数未正确导入')
		}
		
		const res = await phonePasswordLogin(phone.value, password.value, nickname.value.trim())
		console.log('[登录] 登录接口响应:', res)
		
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
				console.log('[登录] 查询是否商户结果:', isMerchant)
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
		console.log('[登录] 保存用户信息:', {
			user_id: userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid,
			mobile: userInfo.mobile,
			phone: userInfo.phone,
			is_merchant: userInfo.is_merchant,
			allKeys: Object.keys(userInfo)
		})
		
		// 记录本次登录使用的邀请码，供后端绑定推荐关系时使用（使用隔离存储）
		if (inviteCode.value.trim()) {
			setStorage('inviteCode', inviteCode.value.trim())
		}
		
		uni.hideLoading()
		uni.showToast({ title: '登录成功', icon: 'success' })
		
		// 保存登录时间和免登录状态
		const loginTime = Date.now()
		setStorage('loginTime', loginTime)
		if (isKeepLogin.value) {
			uni.setStorageSync('keepLogin', true)
			console.log('[登录] 已启用7天免登录')
		} else {
			uni.removeStorageSync('keepLogin')
		}
		
		// 尝试绑定推荐人（使用推荐码）
		if (inviteCode.value.trim()) {
			await tryBindReferrer()
		}
		
		// 使用 mobile 查询用户详情
		try {
			const mobile = userInfo.mobile || phone.value
			if (mobile) {
				console.log('[登录] 开始查询用户详情，mobile:', mobile)
				const userDetailRes = await getUserInfo(mobile)
				console.log('[登录] 用户详情查询结果:', userDetailRes)
				
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
					console.log('[登录] 已保留 user_id:', preservedUserId)
				} else {
					// 如果本地没有，尝试从接口返回的数据中获取
					const apiUserId = userInfo.uid || userInfo.user_id || userInfo.id || userInfo.userId
					if (apiUserId) {
						userInfo.user_id = apiUserId
						userInfo.id = apiUserId
						userInfo.userId = apiUserId
						userInfo.uid = apiUserId
						console.log('[登录] 从接口获取 user_id:', apiUserId)
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
				console.log('[登录] 已更新用户详情到本地存储，user_id:', userInfo.user_id || userInfo.id)
				
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

const handleWeChatLogin = async () => {
	// 检查用户是否同意协议
	if (!agreedToTerms.value) {
		uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
		return
	}

	uni.getProvider({
		service: 'oauth',
		success: ({ provider }) => {
			if (!provider.includes('weixin')) {
				uni.showToast({ title: '当前环境不支持登录', icon: 'none' })
				return
			}
			
			// 先获取用户信息（获取昵称）
			uni.getUserProfile({
				desc: '用于完善用户资料',
				success: async (userInfoRes) => {
					console.log('[微信登录] getUserProfile 返回数据:', {
						userInfo: userInfoRes.userInfo ? '存在' : '缺失',
						nickName: userInfoRes.userInfo?.nickName || '缺失'
					})
					
					// 获取登录凭证
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
							
							// 准备参数（匹配后端接口要求：只需要 code 和 nickName）
							const nickName = userInfoRes.userInfo?.nickName || '用户'
							
							console.log('[微信登录] 最终使用的参数:', {
								code: wxCode,
								codeLength: wxCode.length,
								nickName: nickName,
								isFirstUse: !isDuplicate
							})
							
							if (!nickName) {
								uni.hideLoading()
								uni.showToast({ title: '获取用户昵称失败', icon: 'none' })
								return
							}
							
							try {
								// 调用微信登录接口，传递对象参数
								const res = await wechatLogin({
									code: wxCode,
									nickName: nickName
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
							console.log('[微信登录] 已保存 Token，长度:', String(res.token).length)
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
						
						if (res.wechat_info) {
							uni.setStorageSync('wechatInfo', res.wechat_info)
							// 如果 wechat_info 中有 openid，也单独保存
							if (res.wechat_info.openid && !openidToSave) {
								openidToSave = res.wechat_info.openid
							}
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
						
						uni.showToast({ title: '登录成功', icon: 'success' })
						
						// 记录登录时间和免登录状态（微信登录默认启用7天免登录）
						const loginTime = Date.now()
						uni.setStorageSync('loginTime', loginTime)
						uni.setStorageSync('keepLogin', true)
						console.log('[微信登录] 已启用7天免登录（默认）')
						
						// 记录本次登录使用的邀请码，供后端绑定推荐关系时使用
						if (inviteCode.value.trim()) {
							uni.setStorageSync('inviteCode', inviteCode.value.trim())
						}
						
						// 尝试绑定推荐人（使用推荐码）
						if (inviteCode.value.trim()) {
							await tryBindReferrer()
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
									console.log('[微信登录] 检测到用户is_merchant为2，自动进入平台模式')
									// 进入平台模式
									switchToMerchantMode()
									return // 直接返回，不执行后续的goToAppHome
								} else if (isMerchant === 1) {
									console.log('[微信登录] 检测到用户is_merchant为1，自动进入商家模式')
									// 进入商家模式
									switchToShopMode()
									return // 直接返回，不执行后续的goToAppHome
								}
							}
						} catch (detailError) {
							console.error('[微信登录] 查询用户详情失败:', detailError)
							// 不影响登录流程，继续跳转
						}
						
						setTimeout(() => {
							goToAppHome()
						}, 1500)
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
						let userMessage = '登录失败'
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
		fail: (error) => {
			console.error('获取用户信息失败', error)
			uni.showToast({ title: '需要授权才能登录', icon: 'none' })
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
	const map = {
		user: '用户协议',
		privacy: '隐私政策'
	}
	uni.showToast({ title: `查看${map[type]}`, icon: 'none' })
}


/**
 * 尝试绑定推荐人
 * 使用 userInfo.mobile 的值（可能是电话号码或微信号）和扫码获取的推荐码进行绑定
 */
const tryBindReferrer = async () => {
	// 获取推荐码
	const code = inviteCode.value.trim()
	if (!code) {
		console.log('[登录] 没有推荐码，跳过绑定推荐人')
		return
	}
	
	// 获取当前用户的 mobile 值（可能是电话号码或微信号）
	const userInfo = uni.getStorageSync('userInfo') || {}
	const currentUserMobile = userInfo.mobile
	
	if (!currentUserMobile) {
		console.warn('[登录] 无法获取用户 mobile 值，跳过绑定推荐人')
		return
	}
	
	console.log('[登录] 尝试绑定推荐人:', { mobile: currentUserMobile, referrer_code: code })
	try {
		const params = {
			mobile: currentUserMobile,  // 使用 userInfo.mobile 的值（可能是电话或微信号）
			referrer_code: code  // 扫码获取的推荐码
		}
		
		await bindReferrer(params)
		console.log('[登录] 绑定推荐人成功')
	} catch (error) {
		console.error('[登录] 绑定推荐人失败:', error)
		if (error.message && error.message.includes('已绑定')) {
			console.log('用户已绑定过推荐人，忽略')
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
		
		// 检查用户信息是否完整（至少要有user_id或手机号）
		const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
		const mobile = userInfo.mobile || userInfo.phone
		
		if (!userId && (!mobile || !/^\d{11}$/.test(mobile))) {
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
	console.log('[登录页] 页面加载参数:', options)
	
	// 优先从路径参数中获取推荐码（微信小程序码扫码传递的参数）
	// 支持多种参数名：r, referralCode, inviteCode, referral_code, invite_code
	if (options) {
		const referralCode = options.r || 
		                    options.referralCode || 
		                    options.inviteCode || 
		                    options.referral_code || 
		                    options.invite_code || 
		                    options.code || ''
		
		if (referralCode) {
			inviteCode.value = referralCode.trim()
			console.log('[登录页] 从路径参数获取推荐码:', referralCode)
		}
	}
	
	// 如果没有从路径参数获取到，则检查待绑定的推荐码（App.vue 中保存的）
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

/* 使用999文件夹的iconfont，已在App.vue中全局引入 */
/* icon-biyanjing 和 icon-yanjing 已在999的iconfont.css中定义 */
</style>
