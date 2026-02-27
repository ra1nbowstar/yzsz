<template>
	<view class="setting-page">
		<!-- 个人信息 -->
		<view class="setting-section">
			<view class="section-title">个人信息</view>
			<view class="setting-list">
				<view class="setting-item" @tap="editAvatar">
					<text class="item-label">头像</text>
					<view class="item-value">
						<image 
							:src="(userInfo.avatar_path || userInfo.avatar || '/static/logo.png') + '?t=' + avatarUpdateTime" 
							mode="aspectFill" 
							class="avatar-preview"
							@error="handleAvatarError"
						/>
						<text class="item-arrow iconfont icon-youjiantou"></text>
					</view>
				</view>
				<view class="setting-item" @tap="editNickname">
					<text class="item-label">昵称</text>
					<view class="item-value">
						<text class="value-text">{{ userInfo.name || userInfo.nickname || '未设置' }}</text>
						<text class="item-arrow iconfont icon-youjiantou"></text>
					</view>
				</view>
			</view>
		</view>

		<!-- 收货管理 -->
		<view class="setting-section">
			<view class="section-title">收货管理</view>
			<view class="setting-list">
				<view class="setting-item" @tap="manageAddress">
					<text class="item-label">收货地址</text>
					<view class="item-value">
						<text class="value-text">{{ addressCount }}个地址</text>
						<text class="item-arrow iconfont icon-youjiantou"></text>
					</view>
				</view>
			</view>
		</view>

		<!-- 通用设置 -->
		<view class="setting-section">
			<view class="section-title">通用设置</view>
			<view class="setting-list">
				<view class="setting-item">
					<text class="item-label">消息通知</text>
					<switch :checked="settings.notification" @change="toggleNotification" color="#3d6bff" />
				</view>
				<view class="setting-item" @tap="editPassword">
					<text class="item-label">修改密码</text>
					<view class="item-value">
						<text class="item-arrow iconfont icon-youjiantou"></text>
					</view>
				</view>
				<view class="setting-item" @tap="clearCache">
					<text class="item-label">清除缓存</text>
					<view class="item-value">
						<text class="value-text">{{ cacheSize }}</text>
						<text class="item-arrow iconfont icon-youjiantou"></text>
					</view>
				</view>
			</view>
		</view>

		<!-- 关于 -->
		<view class="setting-section">
			<view class="section-title">关于</view>
			<view class="setting-list">
				<view class="setting-item" @tap="goToAbout">
					<text class="item-label">关于我们</text>
					<text class="item-arrow iconfont icon-youjiantou"></text>
				</view>
				<view class="setting-item" @tap="goToAgreement('user')">
					<text class="item-label">用户协议</text>
					<text class="item-arrow iconfont icon-youjiantou"></text>
				</view>
				<view class="setting-item" @tap="goToAgreement('privacy')">
					<text class="item-label">隐私政策</text>
					<text class="item-arrow iconfont icon-youjiantou"></text>
				</view>
				<view class="setting-item">
					<text class="item-label">当前版本</text>
					<text class="value-text">v1.0.0</text>
				</view>
			</view>
		</view>

		<!-- 注销账号 -->
		<view class="delete-account-section">
			<button class="delete-account-btn" @tap="openDeleteAccountModal">注销账号</button>
		</view>

		<!-- 退出登录 -->
		<view class="logout-section">
			<button class="logout-btn" @tap="handleLogout">退出登录</button>
		</view>

		<!-- 修改密码弹窗 -->
		<view class="password-modal" v-if="showPasswordModal" @tap="closePasswordModal">
			<view class="password-modal-content" @tap.stop>
				<view class="password-modal-header">
					<text class="password-modal-title">修改密码</text>
					<text class="password-modal-close" @tap="closePasswordModal">×</text>
				</view>
				<view class="password-modal-body">
					<view class="password-input-group">
						<text class="password-label">旧密码</text>
						<input 
							class="password-input" 
							type="password" 
							placeholder="请输入旧密码"
							v-model="oldPassword"
							:password="!showOldPassword"
						/>
						<text class="password-toggle" @tap="showOldPassword = !showOldPassword">
							{{ showOldPassword ? '隐藏' : '显示' }}
						</text>
					</view>
					<view class="password-input-group">
						<text class="password-label">新密码</text>
						<input 
							class="password-input" 
							type="password" 
							placeholder="请输入新密码"
							v-model="newPassword"
							:password="!showNewPassword"
						/>
						<text class="password-toggle" @tap="showNewPassword = !showNewPassword">
							{{ showNewPassword ? '隐藏' : '显示' }}
						</text>
					</view>
					<view class="password-input-group">
						<text class="password-label">确认新密码</text>
						<input 
							class="password-input" 
							type="password" 
							placeholder="请再次输入新密码"
							v-model="confirmPassword"
							:password="!showConfirmPassword"
						/>
						<text class="password-toggle" @tap="showConfirmPassword = !showConfirmPassword">
							{{ showConfirmPassword ? '隐藏' : '显示' }}
						</text>
					</view>
				</view>
				<view class="password-modal-footer">
					<button class="password-btn password-btn-cancel" @tap="closePasswordModal">取消</button>
					<button class="password-btn password-btn-confirm" @tap="confirmChangePassword">确认修改</button>
				</view>
			</view>
		</view>

		<!-- 注销账号弹窗 -->
		<view class="password-modal" v-if="showDeleteAccountModal" @tap="closeDeleteAccountModal">
			<view class="password-modal-content delete-account-modal" @tap.stop>
				<view class="password-modal-header">
					<text class="password-modal-title delete-account-title">注销账号</text>
					<text class="password-modal-close" @tap="closeDeleteAccountModal">×</text>
				</view>
				<view class="password-modal-body">
					<view class="delete-account-warning">
						<text class="warning-icon">⚠️</text>
						<text class="warning-text">注销账号后，您的所有数据将被永久删除，且无法恢复。请谨慎操作！</text>
					</view>
					<view class="password-input-group">
						<text class="password-label">请输入密码确认</text>
						<input 
							class="password-input" 
							type="password" 
							placeholder="请输入您的登录密码"
							v-model="deleteAccountPassword"
							:password="!showDeletePassword"
						/>
						<text class="password-toggle" @tap="showDeletePassword = !showDeletePassword">
							{{ showDeletePassword ? '隐藏' : '显示' }}
						</text>
					</view>
				</view>
				<view class="password-modal-footer">
					<button class="password-btn password-btn-cancel" @tap="closeDeleteAccountModal">取消</button>
					<button class="password-btn password-btn-delete" @tap="confirmDeleteAccount" :disabled="!deleteAccountPassword || isDeleting">
						{{ isDeleting ? '注销中...' : '确认注销' }}
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { logout, updateUserName, updateUserAvatar, updateUserPassword, selfDelete } from '@/api/auth.js'
import { getUserInfo as getUserInfoApi, getMobileByUserId, getAddressList, refreshUserInfo, updateMobile } from '@/api/user.js'
import { onUserLogout } from '@/utils/storage.js'

const userInfo = ref({
	id: '',
	avatar_path: '/static/logo.png',
	avatar: '/static/logo.png',
	name: '会员用户',
	nickname: '会员用户',
	phone: '',
	mobile: '',
	email: ''
})

const addressCount = ref(0)

const avatarUpdateTime = ref(Date.now())

const settings = ref({
	notification: true
})

const cacheSize = ref('12.5MB')

// 修改密码相关
const showPasswordModal = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// 注销账号相关
const showDeleteAccountModal = ref(false)
const deleteAccountPassword = ref('')
const showDeletePassword = ref(false)
const isDeleting = ref(false)

/**
 * 显示手机号（过滤掉非数字的手机号，如微信ID）
 */
const displayPhone = computed(() => {
	const phone = userInfo.value.phone || userInfo.value.mobile || ''
	// 如果是纯数字且长度为11位，显示手机号（脱敏处理）
	if (/^\d{11}$/.test(phone)) {
		// 显示格式：138****8000
		return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
	}
	// 如果不是有效的手机号格式，显示"未绑定"
	return '未绑定'
})

/**
 * 处理头像加载错误
 */
const handleAvatarError = (e) => {
	console.error('[设置页面] 头像加载失败:', e)
	// 如果头像加载失败，使用默认头像
	if (userInfo.value.avatar_path || userInfo.value.avatar) {
		userInfo.value.avatar_path = '/static/logo.png'
		userInfo.value.avatar = '/static/logo.png'
	}
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
	// 获取当前用户信息（优先使用页面显示的userInfo，然后从本地存储获取）
	const storedUserInfo = uni.getStorageSync('userInfo') || {}
	
	// 优先使用页面显示的userInfo中的mobile（ID下面显示的那个）
	const preservedMobile = userInfo.value.mobile || userInfo.value.phone || storedUserInfo.mobile || storedUserInfo.phone
	const preservedUserId = userInfo.value.user_id || userInfo.value.id || userInfo.value.userId || userInfo.value.uid || storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
	
	if (!preservedUserId) {
		console.error('[设置页面] 缺少 user_id，无法上传头像')
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
		
		// 步骤2: 调用接口刷新用户信息并更新本地数据（如果失败也不影响，因为头像已经上传成功）
		try {
			await refreshUserInfo()
		} catch (refreshError) {
			console.warn('[设置页面] 刷新用户信息失败，但不影响头像更新:', refreshError)
		}
		
		// 步骤3: 重新加载页面显示的用户信息
		await loadUserInfo()
		
		// 步骤4: 更新头像时间戳，触发图片重新加载
		avatarUpdateTime.value = Date.now()
		setTimeout(() => {
			avatarUpdateTime.value = Date.now()
		}, 100)
		
		uni.hideLoading()
		uni.showToast({ 
			title: '头像已更新', 
			icon: 'success',
			duration: 2000
		})
	} catch (error) {
		uni.hideLoading()
		console.error('[设置页面] 头像更新失败:', error)
		console.error('[设置页面] 错误详情:', {
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
 * 编辑头像
 */
const editAvatar = () => {
	console.log('[设置页面] editAvatar 被调用')
	console.log('[设置页面] 开始选择头像')
	uni.chooseImage({
		count: 1,
		sizeType: ['compressed', 'original'],
		sourceType: ['album', 'camera'],
		success: (res) => {
			console.log('[设置页面] 图片选择成功:', res)
			const tempFilePath = res.tempFilePaths && res.tempFilePaths[0]
			
			if (!tempFilePath) {
				console.error('[设置页面] 图片路径为空')
				uni.showToast({ title: '图片选择失败', icon: 'none' })
				return
			}
			
			console.log('[设置页面] 选择的图片路径:', tempFilePath)
			
			// 跳转到裁剪页面
			uni.navigateTo({
				url: `/subPackages/page2/pages/user/crop-avatar?imageSrc=${encodeURIComponent(tempFilePath)}`
			})
		},
		fail: (err) => {
			console.error('[设置页面] 选择图片失败:', err)
			uni.showToast({ title: '选择图片失败: ' + (err.errMsg || '未知错误'), icon: 'none' })
		}
	})
}

/**
 * 编辑昵称
 */
const editNickname = () => {
	console.log('[设置页面] editNickname 被调用')
	const currentName = userInfo.value.name || userInfo.value.nickname || ''
	uni.showModal({
		title: '修改昵称',
		editable: true,
		placeholderText: currentName,
		success: async (res) => {
			if (res.confirm && res.content) {
				const newName = res.content.trim()
				if (!newName) {
					uni.showToast({ title: '昵称不能为空', icon: 'none' })
					return
				}
				
				// 临时更新显示
				userInfo.value.name = newName
				userInfo.value.nickname = newName
				
				// 保存到本地存储
				const storedUserInfo = uni.getStorageSync('userInfo') || {}
				storedUserInfo.name = newName
				storedUserInfo.nickname = newName
				uni.setStorageSync('userInfo', storedUserInfo)
				
				// 调用接口更新（只更新名字）
				try {
					// 获取手机号或user_id，不验证格式，后端返回什么就用什么
					const mobile = userInfo.value.mobile || userInfo.value.phone || storedUserInfo.mobile || storedUserInfo.phone
					const userId = userInfo.value.user_id || userInfo.value.id || userInfo.value.userId || userInfo.value.uid || storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
					
					// 优先使用mobile（不验证格式），如果没有则使用user_id
					if (mobile && mobile.trim()) {
						console.log('[设置页面] 更新昵称，使用mobile:', mobile)
						await updateUserName(newName, mobile)
					} else if (userId) {
						console.log('[设置页面] 更新昵称，使用user_id:', userId)
						await updateProfile({
							user_id: userId,
							name: newName
						})
					} else {
						uni.showToast({ title: '缺少用户信息，无法更新', icon: 'none' })
						return
					}
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
		}
	})
}

/**
 * 编辑手机号（支持首次绑定）
 */
const editPhone = async () => {
	console.log('[设置页面] editPhone 被调用')
	const currentPhone = userInfo.value.phone || userInfo.value.mobile || ''
	const currentDisplayPhone = /^\d{11}$/.test(currentPhone) ? currentPhone : ''
	const isFirstBind = !currentDisplayPhone // 判断是否是首次绑定
	
	uni.showModal({
		title: isFirstBind ? '绑定手机号' : '修改手机号',
		editable: true,
		placeholderText: '请输入11位手机号',
		content: currentDisplayPhone,
		success: async (res) => {
			if (res.confirm && res.content) {
				const newPhone = res.content.trim()
				// 验证手机号格式
				if (!/^\d{11}$/.test(newPhone)) {
					uni.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
					return
				}
				
				// 如果新手机号和当前手机号相同，不需要更新
				if (newPhone === currentDisplayPhone) {
					uni.showToast({ title: '手机号未变化', icon: 'none' })
					return
				}
				
				// 获取用户ID和原手机号
				const storedUserInfo = uni.getStorageSync('userInfo') || {}
				const userId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
				
				if (!userId) {
					uni.showToast({ title: '无法获取用户ID，请重新登录', icon: 'none' })
					return
				}
				
				// 确定原手机号（oldMobile）：优先使用本地显示手机号
				let oldMobile = currentDisplayPhone || ''

				// 如果本地没有原手机号，尝试从后端获取并使用后端记录的手机号作为 oldMobile
				if (!oldMobile) {
					try {
						const mobileRes = await getMobileByUserId(userId, 'gm2025')
						let backendMobile = null
						if (mobileRes) {
							if (mobileRes.data && typeof mobileRes.data === 'object' && mobileRes.data.mobile) {
								backendMobile = mobileRes.data.mobile
							} else if (mobileRes.mobile) {
								backendMobile = mobileRes.mobile
							} else if (mobileRes.data && typeof mobileRes.data === 'string') {
								backendMobile = mobileRes.data
							} else if (typeof mobileRes === 'string') {
								backendMobile = mobileRes
							}
						}
						if (backendMobile && typeof backendMobile === 'string' && backendMobile.trim()) {
							// 直接使用后端返回的非空字符串作为 oldMobile（支持 wx_... 等格式）
							oldMobile = backendMobile.trim()
							console.log('[设置页面] 使用后端手机号作为 oldMobile:', oldMobile)
						} else {
							// 保留空字符串，由 api 层决定是否发送 old_mobile
							console.warn('[设置页面] 未从后端解析到可用手机号字符串，后续将由 api 层决定是否包含 old_mobile')
						}
					} catch (err) {
						console.warn('[设置页面] 获取后端手机号失败，后续将使用占位 old_mobile', err)
					}
				}

				// 如果仍然没有可用的 oldMobile，保持为空，由 `updateMobile` 决定是否发送该参数
				
				try {
					uni.showLoading({ title: isFirstBind ? '绑定中...' : '修改中...' })
					
					// 调用API修改/绑定手机号
					await updateMobile(userId, oldMobile, newPhone, 'gm2025')
					
					console.log('[设置页面] 手机号绑定/修改成功')
					
					// 更新本地存储
					userInfo.value.mobile = newPhone
					userInfo.value.phone = newPhone
					
					const preservedRealMobile = storedUserInfo.real_mobile // 保留微信ID等
					const preservedUserId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
					const preservedAvatar = storedUserInfo.avatar_path || storedUserInfo.avatar
					
					// 保留所有原有字段，只更新手机号
					const updatedUserInfo = {
						...storedUserInfo,
						mobile: newPhone,
						phone: newPhone,
						// 确保关键字段不被覆盖
						user_id: preservedUserId || storedUserInfo.user_id,
						id: preservedUserId || storedUserInfo.id,
						userId: preservedUserId || storedUserInfo.userId,
						uid: preservedUserId || storedUserInfo.uid,
						avatar_path: preservedAvatar || storedUserInfo.avatar_path,
						avatar: preservedAvatar || storedUserInfo.avatar
					}
					
					// 如果有real_mobile（微信ID），保留它
					if (preservedRealMobile) {
						updatedUserInfo.real_mobile = preservedRealMobile
					}
					
					uni.setStorageSync('userInfo', updatedUserInfo)
					
					// 刷新用户信息
					await refreshUserInfo()
					await loadUserInfo()
					
					uni.hideLoading()
					uni.showToast({ title: isFirstBind ? '手机号绑定成功' : '手机号修改成功', icon: 'success' })
					
					// 如果是首次绑定，跳转回首页
					if (isFirstBind) {
						setTimeout(() => {
							uni.switchTab({ url: '/pages/home/home' })
						}, 1500)
					}
				} catch (error) {
					uni.hideLoading()
					console.error('[设置页面] 绑定/修改手机号失败:', error)
					uni.showToast({ 
						title: error.message || (isFirstBind ? '绑定手机号失败，请重试' : '修改手机号失败，请重试'), 
						icon: 'none',
						duration: 3000
					})
				}
			}
		}
	})
}

/**
 * 编辑邮箱
 */
const editEmail = () => {
	uni.navigateTo({ url: '/subPackages/page2/pages/setting/edit-email' })
}

/**
 * 管理收货地址
 */
const manageAddress = () => {
	uni.navigateTo({ url: '/subPackages/page2/pages/address/list' })
}

/**
 * 打开修改密码弹窗
 */
const editPassword = () => {
	showPasswordModal.value = true
	oldPassword.value = ''
	newPassword.value = ''
	confirmPassword.value = ''
	showOldPassword.value = false
	showNewPassword.value = false
	showConfirmPassword.value = false
}

/**
 * 关闭修改密码弹窗
 */
const closePasswordModal = () => {
	showPasswordModal.value = false
	oldPassword.value = ''
	newPassword.value = ''
	confirmPassword.value = ''
}

/**
 * 确认修改密码
 */
const confirmChangePassword = async () => {
	// 验证输入
	if (!oldPassword.value || !oldPassword.value.trim()) {
		uni.showToast({ title: '请输入旧密码', icon: 'none' })
		return
	}
	
	if (!newPassword.value || !newPassword.value.trim()) {
		uni.showToast({ title: '请输入新密码', icon: 'none' })
		return
	}
	
	if (newPassword.value.length < 6) {
		uni.showToast({ title: '新密码长度不能少于6位', icon: 'none' })
		return
	}
	
	if (newPassword.value !== confirmPassword.value) {
		uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
		return
	}
	
	if (oldPassword.value === newPassword.value) {
		uni.showToast({ title: '新密码不能与旧密码相同', icon: 'none' })
		return
	}
	
	// 显示加载提示
	uni.showLoading({ title: '修改中...', mask: true })
	
	try {
		// 调用修改密码接口
		await updateUserPassword(oldPassword.value.trim(), newPassword.value.trim())
		
		uni.hideLoading()
		
		// 修改成功，提示用户需要重新登录
		uni.showModal({
			title: '修改成功',
			content: '密码已修改成功，请重新登录',
			showCancel: false,
			confirmText: '确定',
			success: async () => {
				// 清除登录信息
				try {
					await logout()
				} catch (error) {
					console.error('退出登录失败', error)
				} finally {
					// 无论接口是否成功，都清除本地数据
					uni.removeStorageSync('token')
					uni.removeStorageSync('userInfo')
					uni.removeStorageSync('wechatInfo')
					// 跳转到登录页面
					uni.reLaunch({ url: '/pages/index/index' })
				}
			}
		})
	} catch (error) {
		uni.hideLoading()
		console.error('[设置页面] 修改密码失败:', error)
		uni.showToast({ 
			title: error.message || '修改密码失败', 
			icon: 'none',
			duration: 2000
		})
	}
}


/**
 * 切换通知
 */
const toggleNotification = (e) => {
	settings.value.notification = e.detail.value
	uni.showToast({
		title: e.detail.value ? '已开启通知' : '已关闭通知',
		icon: 'none'
	})
}

/**
 * 清除缓存
 */
const clearCache = () => {
	uni.showModal({
		title: '清除缓存',
		content: '确定要清除缓存吗？',
		success: (res) => {
			if (res.confirm) {
				uni.showLoading({ title: '清除中...' })
				setTimeout(() => {
					uni.hideLoading()
					cacheSize.value = '0MB'
					uni.showToast({ title: '缓存已清除', icon: 'success' })
				}, 1000)
			}
		}
	})
}

/**
 * 关于我们
 */
const goToAbout = () => {
	uni.showToast({ title: '关于页面开发中', icon: 'none' })
}


/**
 * 用户协议/隐私政策
 */
const goToAgreement = (type) => {
	uni.navigateTo({
		url: `/page1/agreement/${type}`
	})
}

/**
 * 打开注销账号弹窗
 */
const openDeleteAccountModal = () => {
	showDeleteAccountModal.value = true
	deleteAccountPassword.value = ''
	showDeletePassword.value = false
}

/**
 * 关闭注销账号弹窗
 */
const closeDeleteAccountModal = () => {
	showDeleteAccountModal.value = false
	deleteAccountPassword.value = ''
	showDeletePassword.value = false
}

/**
 * 确认注销账号
 */
const confirmDeleteAccount = async () => {
	// 验证密码
	if (!deleteAccountPassword.value || !deleteAccountPassword.value.trim()) {
		uni.showToast({ title: '请输入密码', icon: 'none' })
		return
	}
	
	// 二次确认
	uni.showModal({
		title: '确认注销',
		content: '注销账号后，您的所有数据将被永久删除，且无法恢复。确定要继续吗？',
		confirmText: '确认注销',
		confirmColor: '#ff3b30',
		success: async (res) => {
			if (res.confirm) {
				isDeleting.value = true
				uni.showLoading({ title: '注销中...', mask: true })
				
				try {
					// 获取当前用户信息
					const userInfo = uni.getStorageSync('userInfo') || {}
					const mobile = userInfo.mobile || userInfo.phone
					
					if (!mobile) {
						throw new Error('无法获取用户手机号')
					}
					
					// 调用注销接口
					await selfDelete({
						mobile: mobile,
						password: deleteAccountPassword.value.trim(),
						reason: '用户自助注销'
					})
					
					uni.hideLoading()
					uni.showToast({ 
						title: '账号已注销', 
						icon: 'success',
						duration: 2000
					})
					
					// 清除所有本地数据
					onUserLogout()
					
					// 延迟跳转到登录页
					setTimeout(async () => {
						try {
							await uni.reLaunch({ url: '/pages/index/index' })
						} catch (reLaunchError) {
							console.error('[注销跳转失败]', reLaunchError)
						}
					}, 2000)
				} catch (error) {
					uni.hideLoading()
					isDeleting.value = false
					
					console.error('注销账号失败:', error)
					const errorMsg = error.message || error.msg || '注销失败，请检查密码是否正确'
					uni.showModal({
						title: '注销失败',
						content: errorMsg,
						showCancel: false
					})
				}
			}
		}
	})
}

/**
 * 退出登录
 */
const handleLogout = () => {
	uni.showModal({
		title: '退出登录',
		content: '确定要退出登录吗？',
		success: async (res) => {
			if (res.confirm) {
				try {
					await logout()
				} catch (error) {
					console.error('退出登录API调用失败', error)
				}
				
				// 无论API是否成功，都清除本地数据并跳转
				try {
					onUserLogout() // 清除所有用户数据（包括隔离的数据）
				} catch (error) {
					console.error('清除本地数据失败', error)
				}
				
				// 立即跳转到登录页（清除操作已优化，不需要延迟）
				try {
					await uni.reLaunch({ url: '/pages/index/index' })
				} catch (error) {
					console.error('跳转失败', error)
					// 如果reLaunch失败，尝试使用redirectTo
					try {
						await uni.redirectTo({ url: '/pages/index/index' })
					} catch (e) {
						// 如果都失败，使用navigateTo
						await uni.navigateTo({ url: '/pages/index/index' })
					}
				}
			}
		}
	})
}

/**
 * 加载用户信息（与user页面保持一致）
 */
const loadUserInfo = async () => {
	try {
		// 只从本地存储读取，不使用手机号调用接口（避免切换到新手机号对应的账号）
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		if (storedUserInfo) {
			// 使用 Object.assign 确保响应式更新
			Object.assign(userInfo.value, storedUserInfo)
			console.log('[设置页面] 从本地存储加载用户信息:', {
				user_id: storedUserInfo.user_id || storedUserInfo.id,
				name: storedUserInfo.name,
				mobile: storedUserInfo.mobile || storedUserInfo.phone,
				avatar_path: storedUserInfo.avatar_path
			})
		}
	} catch (error) {
		console.error('[设置页面] 加载用户信息失败:', error)
		// 尝试从本地存储读取
		const storedUserInfo = uni.getStorageSync('userInfo')
		if (storedUserInfo) {
			Object.assign(userInfo.value, storedUserInfo)
		}
	}
}

/**
 * 获取手机号并更新用户信息
 */
const fetchMobileAndUpdateUserInfo = async () => {
	try {
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		// 优先使用 user_id（这是关键字段）
		const userId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
		
		console.log('[设置页面] 当前用户信息:', {
			id: storedUserInfo.id,
			user_id: storedUserInfo.user_id,
			userId: storedUserInfo.userId,
			foundUserId: userId,
			allKeys: Object.keys(storedUserInfo)
		})
		
		if (!userId) {
			console.warn('[设置页面] 未找到用户ID，无法获取手机号')
			console.warn('[设置页面] 请确保已登录，且登录接口返回了用户ID')
			// 尝试从token中获取用户信息（如果后端支持）
			uni.showToast({
				title: '未找到用户ID，请重新登录',
				icon: 'none',
				duration: 2000
			})
			return
		}
		
		console.log('[设置页面] 开始获取手机号，用户ID:', userId)
		
		// 步骤1: 调用接口获取手机号
		const res = await getMobileByUserId(userId, 'gm2025')
		console.log('[设置页面] 获取手机号接口响应:', res)
		
		// 解析返回的手机号（兼容多种响应格式）
		let mobile = null
		if (res) {
			// 格式1: { data: { mobile: "138..." } }
			if (res.data && typeof res.data === 'object' && res.data.mobile) {
				mobile = res.data.mobile
			}
			// 格式2: { mobile: "138..." }
			else if (res.mobile) {
				mobile = res.mobile
			}
			// 格式3: { data: "138..." } (直接返回字符串)
			else if (res.data && typeof res.data === 'string') {
				mobile = res.data
			}
			// 格式4: 直接返回字符串
			else if (typeof res === 'string') {
				mobile = res
			}
		}
		
		if (!mobile || typeof mobile !== 'string' || !mobile.trim()) {
			console.warn('[设置页面] 未能从接口响应中解析出手机号')
			return
		}
		
		mobile = mobile.trim()
		console.log('[设置页面] 解析到的手机号:', mobile)
		
		// 步骤2: 保存手机号到本地存储（确保保留 user_id 和头像）
		const preservedUserId = storedUserInfo.user_id || storedUserInfo.id || storedUserInfo.userId || storedUserInfo.uid
		const preservedAvatar = storedUserInfo.avatar_path || storedUserInfo.avatar
		
		// 判断是否是有效的手机号（11位数字）
		const isValidPhone = /^\d{11}$/.test(mobile)
		
		const updatedUserInfo = {
			...storedUserInfo,
			// 确保 user_id 被保留（这是关键字段）
			user_id: preservedUserId || storedUserInfo.user_id,
			id: preservedUserId || storedUserInfo.id,
			userId: preservedUserId || storedUserInfo.userId,
			// 确保头像被保留（头像没有接口，必须在本地保存）
			avatar_path: preservedAvatar || storedUserInfo.avatar_path || '/static/logo.png',
			avatar: preservedAvatar || storedUserInfo.avatar || '/static/logo.png',
		}
		
		// 如果本地已有有效的手机号（用户可能手动修改过），优先保留本地的
		const existingMobile = storedUserInfo.mobile || storedUserInfo.phone
		if (existingMobile && /^\d{11}$/.test(existingMobile)) {
			// 本地已有有效手机号，保留它（用户可能手动修改过）
			console.log('[设置页面] 本地已有有效手机号，保留本地手机号:', existingMobile)
			updatedUserInfo.mobile = existingMobile
			updatedUserInfo.phone = existingMobile
		} else if (isValidPhone) {
			// 本地没有有效手机号，使用接口返回的手机号
			updatedUserInfo.mobile = mobile
			updatedUserInfo.phone = mobile
		} else {
			// 如果是字母串（如微信ID），保存到real_mobile字段，不显示
			updatedUserInfo.real_mobile = mobile
			// 如果本地已有有效手机号，保留；否则清空显示
			if (!updatedUserInfo.mobile || !/^\d{11}$/.test(updatedUserInfo.mobile)) {
				updatedUserInfo.mobile = ''
				updatedUserInfo.phone = ''
			}
		}
		uni.setStorageSync('userInfo', updatedUserInfo)
		console.log('[设置页面] 手机号已保存到本地存储:', {
			user_id: preservedUserId,
			mobile: mobile,
			avatar: preservedAvatar || '未设置'
		})
		
		// 步骤3: 更新页面显示
		userInfo.value.mobile = mobile
		userInfo.value.phone = mobile
		
		// 不再使用手机号调用 user/info 接口（避免切换到新手机号对应的账号）
		console.log('[设置页面] 手机号已保存，不调用 user/info 接口（避免账号切换）')
	} catch (error) {
		console.error('[设置页面] 获取手机号失败:', error)
		// 显示错误提示
		uni.showToast({
			title: '获取手机号失败',
			icon: 'none',
			duration: 2000
		})
	}
}

/**
 * 加载地址数量
 */
const loadAddressCount = async () => {
	try {
		// 从API获取地址列表
		const response = await getAddressList()
		
		// 解析地址数据
		let addresses = []
		if (Array.isArray(response)) {
			addresses = response
		} else if (response.rows && Array.isArray(response.rows)) {
			addresses = response.rows
		} else if (response.data && Array.isArray(response.data)) {
			addresses = response.data
		} else if (response.items && Array.isArray(response.items)) {
			addresses = response.items
		} else if (response.addresses && Array.isArray(response.addresses)) {
			addresses = response.addresses
		}
		
		// 更新地址数量
		addressCount.value = addresses.length
		
		// 保存到本地存储（供其他地方使用）
		uni.setStorageSync('addressList', addresses)
		
		console.log('[设置页面] 地址数量已更新:', addressCount.value)
	} catch (error) {
		console.error('[设置页面] 获取地址列表失败:', error)
		// 如果API失败，尝试从本地存储获取
		const addressList = uni.getStorageSync('addressList') || []
		addressCount.value = addressList.length
	}
}

onLoad(async (options) => {
	await loadUserInfo()
	loadAddressCount()
	// 在用户信息加载完成后再获取手机号
	fetchMobileAndUpdateUserInfo()
	
	// 如果需要绑定手机号，自动打开绑定弹窗
	if (options && options.needBindMobile === 'true') {
		setTimeout(() => {
			editPhone()
		}, 500)
	}
	
	// 监听头像裁剪完成事件
	uni.$on('avatarCropped', onAvatarCropped)
})

onShow(async () => {
	
	// 监听头像裁剪完成事件（每次显示页面时重新注册，确保事件监听有效）
	uni.$on('avatarCropped', onAvatarCropped)
	
	// 每次显示页面时，优先从本地存储加载（确保用户修改的数据不丢失）
	const storedUserInfo = uni.getStorageSync('userInfo') || {}
	if (storedUserInfo && Object.keys(storedUserInfo).length > 0) {
		// 优先使用本地保存的数据（包括用户修改的手机号和头像）
		userInfo.value = {
			...userInfo.value,
			...storedUserInfo
		}
		console.log('[设置页面] 从本地存储加载用户信息:', {
			mobile: storedUserInfo.mobile,
			phone: storedUserInfo.phone,
			avatar_path: storedUserInfo.avatar_path
		})
	}
	
	// 只从本地存储加载，不再调用接口（避免覆盖用户修改的手机号）
	await loadUserInfo()
	loadAddressCount()
	// 不再自动获取手机号，避免覆盖用户手动修改的手机号
	// 如果用户需要获取手机号，可以手动触发
})

// 页面卸载时移除事件监听
onUnmounted(() => {
	uni.$off('avatarCropped', onAvatarCropped)
})
</script>

<style scoped>
.setting-page {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: 40rpx;
}

.setting-section {
	margin-bottom: 20rpx;
}

.section-title {
	font-size: 24rpx;
	color: #999;
	padding: 30rpx 30rpx 16rpx;
}

.setting-list {
	background: #fff;
}

.setting-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 32rpx 30rpx;
	border-bottom: 1rpx solid #f5f5f5;
	position: relative;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
	z-index: 1;
}

.setting-item:active {
	background-color: #f5f5f5;
}


.setting-item:last-child {
	border-bottom: none;
}

.item-label {
	font-size: 28rpx;
	color: #333;
}

.item-value {
	display: flex;
	align-items: center;
	gap: 16rpx;
	pointer-events: none;
}

.value-text {
	font-size: 26rpx;
	color: #999;
}

.server-badge {
	padding: 4rpx 12rpx;
	background-color: #f0f9ff;
	color: #1989fa;
	border-radius: 8rpx;
	font-size: 24rpx;
}

.item-arrow {
	font-size: 24rpx;
	color: #ccc;
}

.avatar-preview {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	pointer-events: none;
}

.delete-account-section {
	margin-top: 40rpx;
	padding: 0 30rpx 20rpx;
}

.delete-account-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background: #fff;
	border: 2rpx solid #ff3b30;
	border-radius: 16rpx;
	color: #ff3b30;
	font-size: 32rpx;
	font-weight: 500;
}

.delete-account-btn:active {
	background: #fff5f5;
}

.logout-section {
	margin-top: 20rpx;
	padding: 0 30rpx 40rpx;
}

.logout-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background: #fff;
	color: #666;
	font-size: 32rpx;
	border-radius: 16rpx;
	border: 2rpx solid #e5e5e5;
}

/* 修改密码弹窗样式 */
.password-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
}

.password-modal-content {
	width: 600rpx;
	background-color: #fff;
	border-radius: 24rpx;
	overflow: hidden;
}

.password-modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 40rpx 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.password-modal-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
}

.password-modal-close {
	font-size: 48rpx;
	color: #999;
	line-height: 1;
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.password-modal-body {
	padding: 40rpx 30rpx;
}

.password-input-group {
	position: relative;
	margin-bottom: 40rpx;
}

.password-input-group:last-child {
	margin-bottom: 0;
}

.password-label {
	display: block;
	font-size: 28rpx;
	color: #333;
	margin-bottom: 20rpx;
}

.password-input {
	width: 100%;
	height: 88rpx;
	padding: 0 120rpx 0 24rpx;
	background-color: #f5f5f5;
	border-radius: 12rpx;
	font-size: 28rpx;
	color: #333;
	box-sizing: border-box;
}

.password-toggle {
	position: absolute;
	right: 24rpx;
	bottom: 24rpx;
	font-size: 24rpx;
	color: #1989fa;
	line-height: 40rpx;
}

.password-modal-footer {
	display: flex;
	border-top: 1rpx solid #f0f0f0;
}

.password-btn {
	flex: 1;
	height: 100rpx;
	line-height: 100rpx;
	text-align: center;
	font-size: 28rpx;
	border: none;
	background-color: #fff;
}

.password-btn-cancel {
	color: #666;
	border-right: 1rpx solid #f0f0f0;
}

.password-btn-confirm {
	color: #1989fa;
	font-weight: 600;
}

.password-btn-delete {
	color: #ff3b30;
	font-weight: 600;
}

.password-btn-delete:disabled {
	color: #ccc;
	background-color: #f5f5f5;
}

/* 注销账号弹窗特殊样式 */
.delete-account-modal {
	max-width: 600rpx;
}

.delete-account-title {
	color: #ff3b30;
}

.delete-account-warning {
	display: flex;
	align-items: flex-start;
	padding: 24rpx;
	background-color: #fff5f5;
	border-radius: 12rpx;
	margin-bottom: 40rpx;
	border: 1rpx solid #ffebee;
}

.warning-icon {
	font-size: 32rpx;
	margin-right: 16rpx;
	flex-shrink: 0;
}

.warning-text {
	flex: 1;
	font-size: 26rpx;
	color: #ff3b30;
	line-height: 1.6;
}
</style>
