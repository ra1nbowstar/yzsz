<template>
	<view class="user-manage-page">
		<!-- 输入手机号查询 -->
		<view class="input-section">
			<view class="input-box">
				<text class="input-label">手机号</text>
				<input 
					class="input-field" 
					type="text"
					v-model="searchKeyword"
					placeholder="请输入手机号（至少11位）"
				/>
			</view>
			<button class="search-btn" @tap="loadUserInfo" :disabled="!searchKeyword || loading">
				{{ loading ? '查询中...' : '查询' }}
			</button>
		</view>

		<!-- 用户信息卡片 -->
		<view class="user-info-card" v-if="userInfo.mobile">
			<view class="user-header">
				<image 
					:src="getAvatarUrl(userInfo.avatar_path || userInfo.avatar)" 
					mode="aspectFill" 
					class="user-avatar" 
					@error="handleAvatarError"
				/>
				<view class="user-details">
					<text class="user-name">{{ userInfo.name || userInfo.nickname || '未设置昵称' }}</text>
					<text class="user-mobile">{{ userInfo.mobile || userInfo.phone }}</text>
					<view class="user-level-badge" :class="'level-' + (userInfo.member_level || 0)">
						<text class="level-icon-small iconfont" :class="getLevelIcon(userInfo.member_level || 0)"></text>
						<text class="level-text-small">{{ getLevelText(userInfo.member_level || 0) }}</text>
					</view>
					<view class="status-badge frozen" v-if="userInfo.status === 1 || userInfo.new_status === 1">
						<text class="status-text">已冻结</text>
					</view>
					<view class="status-badge normal" v-else>
						<text class="status-text">正常</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 操作区域 -->
		<view class="action-section" v-if="userInfo.mobile">
			<!-- 冻结/恢复 -->
			<view class="action-card">
				<view class="action-title">账户状态</view>
				<view class="current-status">
					<text class="status-label">当前状态：</text>
					<text class="status-value" :class="{'frozen': userInfo.status === 1 || userInfo.new_status === 1}">
						{{ (userInfo.status === 1 || userInfo.new_status === 1) ? '已冻结' : '正常' }}
					</text>
				</view>
				<button 
					class="action-btn freeze-btn" 
					:class="{'frozen': userInfo.status === 1 || userInfo.new_status === 1}"
					@tap="toggleFreezeStatus"
					:disabled="freezing"
				>
					{{ freezing ? '处理中...' : ((userInfo.status === 1 || userInfo.new_status === 1) ? '恢复账户' : '冻结账户') }}
				</button>
			</view>

			<!-- 调星 -->
			<view class="action-card">
				<view class="action-title">调整星级</view>
				<view class="current-level">
					<text class="level-label">当前星级：</text>
					<text class="level-value">{{ getLevelText(userInfo.member_level || 0) }}</text>
				</view>
				<view class="level-selector">
					<view 
						v-for="level in levelOptions" 
						:key="level.value"
						class="level-option"
						:class="{ 'selected': selectedLevel === level.value }"
						@tap="selectedLevel = level.value"
					>
						<text class="level-option-icon">{{ getLevelIcon(level.value) }}</text>
						<text class="level-option-text">{{ level.label }}</text>
					</view>
				</view>
				<view class="reason-input">
					<text class="reason-label">调整原因：</text>
					<input 
						class="reason-text" 
						placeholder="请输入调整原因"
						v-model="levelReason"
						maxlength="50"
					/>
				</view>
				<button 
					class="action-btn level-btn" 
					@tap="adjustLevel"
					:disabled="selectedLevel === null || selectedLevel === undefined || adjustingLevel || (selectedLevel === userInfo.member_level && userInfo.member_level !== null && userInfo.member_level !== undefined)"
				>
					{{ adjustingLevel ? '调整中...' : '确认调整' }}
				</button>
			</view>

			<!-- 设置联创星级 -->
			<view class="action-card">
				<view class="action-title">设置联创星级</view>
				<view class="current-level">
					<text class="level-label">当前联创星级：</text>
					<text class="level-value">{{ unilevelLevel !== null && unilevelLevel !== undefined ? unilevelLevel + '级' : '未设置' }}</text>
				</view>
				<view class="level-selector">
					<view 
						v-for="level in unilevelOptions" 
						:key="level.value"
						class="level-option"
						:class="{ 'selected': selectedUnilevel === level.value }"
						@tap="selectedUnilevel = level.value"
					>
						<text class="level-option-text">{{ level.label }}</text>
					</view>
				</view>
				<button 
					class="action-btn unilevel-btn" 
					@tap="setUnilevel"
					:disabled="selectedUnilevel === null || selectedUnilevel === undefined || settingUnilevel || (selectedUnilevel === unilevelLevel && unilevelLevel !== null && unilevelLevel !== undefined)"
				>
					{{ settingUnilevel ? '设置中...' : '确认设置' }}
				</button>
			</view>

			<!-- 修改密码 -->
			<view class="action-card">
				<view class="action-title">修改密码</view>
				<view class="password-input">
					<text class="password-label">新密码：</text>
					<input 
						class="password-text" 
						type="password"
						placeholder="请输入新密码"
						v-model="newPassword"
						maxlength="50"
					/>
				</view>
				<button 
					class="action-btn password-btn" 
					@tap="resetPassword"
					:disabled="!newPassword || resettingPassword"
				>
					{{ resettingPassword ? '重置中...' : '确认重置密码' }}
				</button>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-state" v-if="!userInfo.mobile && !loading && hasSearched">
			<text class="empty-text">未找到该用户</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getUserInfo, getUniLevel } from '@/api/user.js'
import { setStatus, setLevel, setUnilevel as setUnilevelApi, adminResetPwd } from '@/api/auth.js'
import { getUniLevelStatus } from '@/api/team.js'
import { getLevelIcon, getLevelText } from '@/utils/level.js'
import { getAvatarUrl } from '@/utils/avatar.js'

// 输入手机号（至少11位）
const searchKeyword = ref('')
const loading = ref(false)
const hasSearched = ref(false)

// 用户信息
const userInfo = ref({})

// 冻结相关
const freezing = ref(false)

// 调星相关
const selectedLevel = ref(null)
const levelReason = ref('')
const adjustingLevel = ref(false)

// 星级选项
const levelOptions = [
	{ value: 0, label: '普通会员' },
	{ value: 1, label: '一星店长' },
	{ value: 2, label: '二星店长' },
	{ value: 3, label: '三星店长' },
	{ value: 4, label: '四星店长' },
	{ value: 5, label: '五星店长' },
	{ value: 6, label: '六星店长' }
]

// 联创星级相关
const unilevelLevel = ref(null)
const selectedUnilevel = ref(null)
const settingUnilevel = ref(false)

// 联创星级选项（0-3级）
const unilevelOptions = [
	{ value: 0, label: '0级' },
	{ value: 1, label: '1级' },
	{ value: 2, label: '2级' },
	{ value: 3, label: '3级' }
]

// 修改密码相关
const newPassword = ref('')
const resettingPassword = ref(false)

/**
 * 加载用户信息（仅支持手机号查询，输入至少11位）
 */
const loadUserInfo = async () => {
	const keyword = (searchKeyword.value || '').trim()
	if (!keyword) {
		uni.showToast({ title: '请输入手机号', icon: 'none' })
		return
	}
	if (keyword.length < 11) {
		uni.showToast({ title: '手机号至少11位', icon: 'none' })
		return
	}

	try {
		loading.value = true
		hasSearched.value = true
		console.log('[用户管理] 通过手机号查询，keyword:', keyword)
		const res = await getUserInfo(keyword)
		
		// 解析用户信息
		console.log('[用户管理] 用户信息API响应:', res)
		const data = res.data || res
		console.log('[用户管理] 解析后的用户数据:', data)
		userInfo.value = {
			...data,
			id: data.id || data.user_id || data.uid || data.userId || null,
			user_id: data.user_id || data.id || data.uid || data.userId || null,
			uid: data.uid || data.id || data.user_id || data.userId || null,
			mobile: data.mobile || data.phone || keyword,
			phone: data.phone || data.mobile || keyword,
			member_level: data.member_level || data.level || 0,
			status: data.status || data.new_status || 0,
			new_status: data.new_status || data.status || 0
		}
		
		// 重置调星相关
		selectedLevel.value = userInfo.value.member_level || 0
		levelReason.value = ''
		
		// 获取联创星级 - 需要单独调用接口
		console.log('[用户管理] 开始获取联创星级')
		try {
			const userId = userInfo.value.id || userInfo.value.user_id || userInfo.value.uid || userInfo.value.userId
			const mobile = userInfo.value.mobile || userInfo.value.phone
			
			console.log('[用户管理] 提取的userId:', userId, 'mobile:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
			
			let unilevel = null
			// 优先使用 user_id 查询（更准确）
			if (userId) {
				console.log('[用户管理] 准备调用 getUniLevelStatus，userId:', userId)
				try {
					const uniLevelRes = await getUniLevelStatus(userId)
					console.log('[用户管理] getUniLevelStatus 完整响应:', JSON.stringify(uniLevelRes, null, 2))
					
					// 根据API返回格式：{ current_level, target_level, can_promote, reason }
					// 尝试多种可能的响应结构
					// 注意：request.get 可能返回 { data: {...} } 或直接返回 {...}
					if (uniLevelRes && typeof uniLevelRes === 'object') {
						// 先检查 data 字段
						if (uniLevelRes.data && typeof uniLevelRes.data === 'object' && 'current_level' in uniLevelRes.data) {
							unilevel = uniLevelRes.data.current_level
							console.log('[用户管理] 从 data.current_level 获取:', unilevel)
						} 
						// 再检查根级别的 current_level
						else if ('current_level' in uniLevelRes) {
							unilevel = uniLevelRes.current_level
							console.log('[用户管理] 从根级别 current_level 获取:', unilevel)
						}
						// 兼容其他字段名
						else if (uniLevelRes.data && typeof uniLevelRes.data === 'object') {
							unilevel = uniLevelRes.data.unilevel ?? uniLevelRes.data.level ?? null
							console.log('[用户管理] 从 data 中获取兼容字段:', unilevel)
						}
						else if ('unilevel' in uniLevelRes) {
							unilevel = uniLevelRes.unilevel
							console.log('[用户管理] 从根级别 unilevel 获取:', unilevel)
						}
						else if ('level' in uniLevelRes) {
							unilevel = uniLevelRes.level
							console.log('[用户管理] 从根级别 level 获取:', unilevel)
						}
						else {
							unilevel = null
							console.warn('[用户管理] 无法找到联创星级字段，响应结构:', Object.keys(uniLevelRes))
						}
					} else {
						unilevel = null
						console.error('[用户管理] 响应不是对象:', typeof uniLevelRes, uniLevelRes)
					}
					
					console.log('[用户管理] 通过user_id获取联创星级:', unilevel, '原始值类型:', typeof unilevel)
				} catch (error) {
					console.error('[用户管理] 通过user_id获取联创星级失败:', error)
					// 如果失败，尝试使用手机号
					if (mobile) {
						try {
							const uniLevelRes = await getUniLevel(mobile)
							unilevel = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
							console.log('[用户管理] 通过手机号获取联创星级:', unilevel)
						} catch (error2) {
							console.error('[用户管理] 通过手机号获取联创星级失败:', error2)
						}
					}
				}
			} else if (mobile) {
				// 如果没有user_id，使用手机号查询
				console.log('[用户管理] 准备调用 getUniLevel，mobile:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
				try {
					const uniLevelRes = await getUniLevel(mobile)
					console.log('[用户管理] getUniLevel 响应成功')
					unilevel = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
					console.log('[用户管理] 通过手机号获取联创星级:', unilevel)
				} catch (error) {
					console.error('[用户管理] 通过手机号获取联创星级失败:', error)
				}
			} else {
				console.warn('[用户管理] 既没有userId也没有mobile，无法查询联创星级')
			}
			
			// 如果接口查询失败，尝试从用户信息中获取
			if (unilevel === null || unilevel === undefined) {
				unilevel = userInfo.value.unilevel_level || userInfo.value.unilevel || 0
				console.log('[用户管理] 从用户信息中获取联创星级:', unilevel)
			}
			
			// 确保 unilevel 是数字类型，且不是 null/undefined
			if (unilevel === null || unilevel === undefined) {
				console.warn('[用户管理] unilevel 为 null/undefined，使用默认值 0')
				unilevel = 0
			} else {
				unilevel = Number(unilevel)
				if (isNaN(unilevel)) {
					console.warn('[用户管理] unilevel 转换数字失败，使用默认值 0，原始值:', unilevel)
					unilevel = 0
				}
			}
			
			console.log('[用户管理] 最终设置的联创星级:', unilevel, '类型:', typeof unilevel)
			unilevelLevel.value = unilevel
			selectedUnilevel.value = unilevel
			console.log('[用户管理] unilevelLevel.value 已设置为:', unilevelLevel.value)
		} catch (error) {
			console.error('[用户管理] 获取联创星级失败:', error)
			console.error('[用户管理] 错误详情:', error.message, error.stack)
			// 如果都失败，使用默认值0
			unilevelLevel.value = userInfo.value.unilevel_level || userInfo.value.unilevel || 0
			selectedUnilevel.value = unilevelLevel.value
			console.log('[用户管理] 异常处理：unilevelLevel.value 设置为:', unilevelLevel.value)
		}
		
		console.log('[用户管理] 加载用户信息成功')
		console.log('[用户管理] 联创星级:', unilevelLevel.value)
	} catch (error) {
		console.error('加载用户信息失败', error)
		uni.showToast({ 
			title: error.message || error.msg || '查询失败，请重试', 
			icon: 'none' 
		})
		userInfo.value = {}
	} finally {
		loading.value = false
	}
}

/**
 * 切换冻结状态
 */
const toggleFreezeStatus = async () => {
	if (!userInfo.value || !userInfo.value.mobile) {
		uni.showToast({ title: '用户信息不完整', icon: 'none' })
		return
	}
	
	const currentStatus = userInfo.value.status || userInfo.value.new_status || 0
	const newStatus = currentStatus === 1 ? 0 : 1
	const action = newStatus === 1 ? '冻结' : '恢复'
	
	uni.showModal({
		title: `${action}账户`,
		content: `确定要${action}用户 ${userInfo.value.name || userInfo.value.mobile} 的账户吗？`,
		confirmText: `确认${action}`,
		confirmColor: newStatus === 1 ? '#ff3b30' : '#1989fa',
		success: async (res) => {
			if (res.confirm) {
				freezing.value = true
				uni.showLoading({ title: `${action}中...`, mask: true })
				
				try {
					await setStatus({
						mobile: userInfo.value.mobile,
						new_status: newStatus,
						reason: `平台管理-${action}账户`
					})
					
					// 更新本地状态
					userInfo.value.status = newStatus
					userInfo.value.new_status = newStatus
					
					uni.hideLoading()
					uni.showToast({ 
						title: `${action}成功`, 
						icon: 'success',
						duration: 2000
					})
				} catch (error) {
					uni.hideLoading()
					console.error(`${action}账户失败:`, error)
					const errorMsg = error.message || error.msg || error.detail || `${action}失败，请重试`
					uni.showToast({ 
						title: errorMsg, 
						icon: 'none',
						duration: 2000
					})
				} finally {
					freezing.value = false
				}
			}
		}
	})
}

/**
 * 调整星级
 */
const adjustLevel = async () => {
	if (!userInfo.value || !userInfo.value.mobile) {
		uni.showToast({ title: '用户信息不完整', icon: 'none' })
		return
	}
	
	if (selectedLevel.value === null || selectedLevel.value === undefined) {
		uni.showToast({ title: '请选择新星级', icon: 'none' })
		return
	}
	
	if (!levelReason.value.trim()) {
		uni.showToast({ title: '请输入调整原因', icon: 'none' })
		return
	}
	
	const oldLevel = userInfo.value.member_level || 0
	const newLevel = selectedLevel.value
	
	if (oldLevel === newLevel) {
		uni.showToast({ title: '星级未变化', icon: 'none' })
		return
	}
	
	adjustingLevel.value = true
	uni.showLoading({ title: '调整中...', mask: true })
	
	try {
		await setLevel({
			mobile: userInfo.value.mobile,
			new_level: newLevel,
			reason: levelReason.value.trim() || '平台管理-调整星级'
		})
		
		// 更新本地状态
		userInfo.value.member_level = newLevel
		selectedLevel.value = newLevel
		
		uni.hideLoading()
		uni.showToast({ 
			title: '调整成功', 
			icon: 'success',
			duration: 2000
		})
	} catch (error) {
		uni.hideLoading()
		console.error('调整星级失败:', error)
		const errorMsg = error.message || error.msg || error.detail || '调整失败，请重试'
		uni.showToast({ 
			title: errorMsg, 
			icon: 'none',
			duration: 2000
		})
	} finally {
		adjustingLevel.value = false
	}
}

/**
 * 设置联创星级
 */
const setUnilevel = async () => {
	if (!userInfo.value) {
		uni.showToast({ title: '用户信息不完整', icon: 'none' })
		return
	}
	
	// 尝试多种可能的用户ID字段名
	const userId = userInfo.value.id || userInfo.value.user_id || userInfo.value.uid || userInfo.value.userId
	
	if (!userId) {
		uni.showToast({ title: '用户信息不完整，缺少用户ID', icon: 'none' })
		console.error('[设置联创星级] 用户信息不完整，缺少用户ID')
		return
	}
	
	if (selectedUnilevel.value === null || selectedUnilevel.value === undefined) {
		uni.showToast({ title: '请选择联创星级', icon: 'none' })
		return
	}
	const newLevel = selectedUnilevel.value
	
	if (unilevelLevel.value === newLevel) {
		uni.showToast({ title: '联创星级未变化', icon: 'none' })
		return
	}
	
	uni.showModal({
		title: '设置联创星级',
		content: `确定要将用户 ${userInfo.value.name || userInfo.value.mobile} 的联创星级设置为 ${newLevel} 级吗？`,
		confirmText: '确认设置',
		confirmColor: '#3d6bff',
		success: async (res) => {
			if (res.confirm) {
				settingUnilevel.value = true
				uni.showLoading({ title: '设置中...', mask: true })
				
				try {
					await setUnilevelApi({
						user_id: userId,
						level: newLevel,
						admin_key: 'admin2025'
					})
					
					// 更新本地状态
					unilevelLevel.value = newLevel
					
					uni.hideLoading()
					uni.showToast({ 
						title: '设置成功', 
						icon: 'success',
						duration: 2000
					})
				} catch (error) {
					uni.hideLoading()
					console.error('设置联创星级失败:', error)
					const errorMsg = error.message || error.msg || error.detail || '设置失败，请重试'
					uni.showToast({ 
						title: errorMsg, 
						icon: 'none',
						duration: 2000
					})
				} finally {
					settingUnilevel.value = false
				}
			}
		}
	})
}

/**
 * 重置密码
 */
const resetPassword = async () => {
	if (!userInfo.value || !userInfo.value.mobile) {
		uni.showToast({ title: '用户信息不完整', icon: 'none' })
		return
	}
	
	if (!newPassword.value || newPassword.value.trim().length < 6) {
		uni.showToast({ title: '密码长度至少6位', icon: 'none' })
		return
	}
	
	uni.showModal({
		title: '重置密码',
		content: `确定要重置用户 ${userInfo.value.name || userInfo.value.mobile} 的密码吗？`,
		confirmText: '确认重置',
		confirmColor: '#ff5722',
		success: async (res) => {
			if (res.confirm) {
				resettingPassword.value = true
				uni.showLoading({ title: '重置中...', mask: true })
				
				try {
					await adminResetPwd({
						mobile: userInfo.value.mobile,
						new_password: newPassword.value.trim(),
						admin_key: 'admin2025'
					})
					
					// 清空密码输入
					newPassword.value = ''
					
					uni.hideLoading()
					uni.showToast({ 
						title: '密码重置成功', 
						icon: 'success',
						duration: 2000
					})
				} catch (error) {
					uni.hideLoading()
					console.error('重置密码失败:', error)
					const errorMsg = error.message || error.msg || error.detail || '重置失败，请重试'
					uni.showToast({ 
						title: errorMsg, 
						icon: 'none',
						duration: 2000
					})
				} finally {
					resettingPassword.value = false
				}
			}
		}
	})
}

/**
 * 处理头像加载错误
 */
const handleAvatarError = (e) => {
	console.log('头像加载失败，使用默认头像')
}

onLoad(() => {
	uni.setNavigationBarTitle({ title: '冻结/恢复/升星' })
})
</script>

<style scoped>
.user-manage-page {
	min-height: 100vh;
	background: #f7f8fc;
	padding: 30rpx;
}

/* 输入区域 */
.input-section {
	background: #fff;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	display: flex;
	align-items: flex-end;
	gap: 20rpx;
}

.input-box {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.input-label {
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
}

.input-field {
	height: 80rpx;
	padding: 0 20rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	font-size: 28rpx;
	color: #333;
	box-sizing: border-box;
}

.search-btn {
	width: 160rpx;
	height: 80rpx;
	line-height: 80rpx;
	text-align: center;
	background: #3d6bff;
	color: #fff;
	border-radius: 12rpx;
	font-size: 28rpx;
	font-weight: 500;
	border: none;
	flex-shrink: 0;
	align-self: flex-end;
}

.search-btn:disabled {
	opacity: 0.5;
}

/* 用户信息卡片 */
.user-info-card {
	background: #fff;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
}

.user-header {
	display: flex;
	align-items: center;
	gap: 24rpx;
}

.user-avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	background: #f0f0f0;
	border: 2rpx solid #eee;
	flex-shrink: 0;
}

.user-details {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.user-name {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.user-mobile {
	font-size: 26rpx;
	color: #666;
}

.user-level-badge {
	display: inline-flex;
	align-items: center;
	gap: 4rpx;
	padding: 6rpx 16rpx;
	border-radius: 12rpx;
	font-size: 22rpx;
	width: fit-content;
}

.level-0 { background: rgba(205, 127, 50, 0.9); }
.level-1 { background: rgba(192, 192, 192, 0.9); }
.level-2 { background: rgba(255, 215, 0, 0.9); }
.level-3 { background: rgba(185, 242, 255, 0.9); }
.level-4 { background: rgba(255, 105, 180, 0.9); }
.level-5 { background: rgba(138, 43, 226, 0.9); }
.level-6 { background: rgba(255, 20, 147, 0.9); }

.level-icon-small {
	font-size: 20rpx;
}

.level-text-small {
	color: #fff;
	font-weight: bold;
	font-size: 22rpx;
}

.status-badge {
	display: inline-flex;
	align-items: center;
	padding: 6rpx 16rpx;
	border-radius: 8rpx;
	font-size: 22rpx;
	width: fit-content;
}

.status-badge.normal {
	background: #e8f5e9;
}

.status-badge.frozen {
	background: #ffebee;
}

.status-text {
	font-weight: 500;
	font-size: 22rpx;
}

.status-badge.normal .status-text {
	color: #4caf50;
}

.status-badge.frozen .status-text {
	color: #ff3b30;
}

/* 操作区域 */
.action-section {
	display: flex;
	flex-direction: column;
	gap: 30rpx;
}

.action-card {
	background: #fff;
	border-radius: 16rpx;
	padding: 30rpx;
}

.action-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 24rpx;
}

.current-status,
.current-level {
	display: flex;
	align-items: center;
	margin-bottom: 24rpx;
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
}

.status-label,
.level-label {
	font-size: 28rpx;
	color: #666;
	margin-right: 20rpx;
}

.status-value,
.level-value {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}

.status-value.frozen {
	color: #ff3b30;
}

.level-selector {
	margin-bottom: 24rpx;
}

.level-options {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.level-option {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 12rpx 20rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 12rpx;
	background: #fff;
	transition: all 0.3s;
}

.level-option.selected {
	border-color: #3d6bff;
	background: #e8f0ff;
}

.level-option-icon {
	font-size: 24rpx;
}

.level-option-text {
	font-size: 24rpx;
	color: #333;
}

.reason-input {
	margin-bottom: 24rpx;
}

.reason-label {
	display: block;
	font-size: 28rpx;
	color: #666;
	margin-bottom: 16rpx;
}

.reason-text {
	width: 100%;
	height: 80rpx;
	padding: 0 20rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	font-size: 28rpx;
	color: #333;
	box-sizing: border-box;
}

.action-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	text-align: center;
	font-size: 30rpx;
	border-radius: 12rpx;
	border: 2rpx solid;
	font-weight: 500;
}

.freeze-btn {
	border-color: #ff3b30;
	background: #fff;
	color: #ff3b30;
}

.freeze-btn.frozen {
	border-color: #1989fa;
	color: #1989fa;
}

.level-btn {
	border-color: #3d6bff;
	background: #3d6bff;
	color: #fff;
}

.unilevel-btn {
	border-color: #ff9800;
	background: #ff9800;
	color: #fff;
}

.password-btn {
	border-color: #ff5722;
	background: #ff5722;
	color: #fff;
}

.password-input {
	margin-bottom: 24rpx;
}

.password-label {
	display: block;
	font-size: 28rpx;
	color: #666;
	margin-bottom: 16rpx;
}

.password-text {
	width: 100%;
	height: 80rpx;
	padding: 0 20rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	font-size: 28rpx;
	color: #333;
	box-sizing: border-box;
}

.action-btn:disabled {
	opacity: 0.5;
}

.action-btn:active {
	opacity: 0.8;
}

/* 空状态 */
.empty-state {
	text-align: center;
	padding: 120rpx 0;
}

.empty-text {
	font-size: 28rpx;
	color: #999;
}
</style>

