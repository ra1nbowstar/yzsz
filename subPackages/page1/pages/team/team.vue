<template>
	<scroll-view 
		class="team-page"
		scroll-y
		refresher-enabled
		:refresher-triggered="refreshing"
		@refresherrefresh="onRefresh"
		@refresherrestore="onRestore"
	>
		<!-- 顶部背景与用户信息 -->
		<view class="header-bg">
			<view class="user-row">
				<view class="user-left">
					<view class="avatar-wrapper" @tap="viewUserDetail(userInfo)">
						<image :src="getAvatarUrl(userInfo.avatar_path) + '?t=' + avatarUpdateTime" mode="aspectFill" class="avatar" @error="handleAvatarError" />
						<view class="uni-level-badge" v-if="userUniLevel > 0" :class="'uni-level-' + userUniLevel">
							<text class="uni-level-text">{{ userUniLevel }}</text>
						</view>
					</view>
					<view class="info-right">
						<view class="name-row">
							<text class="nickname">{{ userInfo.name || '未设置昵称' }}</text>
							<view class="level-badge" :class="'level-' + userLevel.level">
								<text class="level-icon iconfont" :class="userLevel.icon"></text>
								<text class="level-text">{{ userLevel.name }}</text>
							</view>
						</view>
						<view class="user-sub-row">
							<view class="unilevel-badge-small" :class="'uni-level-' + (userUniLevel || 0)">
								<text class="unilevel-text-small">{{ userUniLevel || 0 }}级联创</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 悬浮核心数据卡片 -->
		<view class="floating-card">
			<view class="core-stat-item" @tap="goToRewardLog('referral-team')">
				<text class="core-num">{{ formatPoints(rewardStats.totalReward) }}</text>
				<text class="core-lbl">累计雨点</text>
			</view>
			<view class="v-divider"></view>
			<view class="core-stat-item" @tap="goToPointsLog">
				<text class="core-num">{{ formatPoints(remainingPoints) }}</text>
				<text class="core-lbl">剩余雨点</text>
			</view>
			<view class="v-divider"></view>
			<view class="core-stat-item">
				<text class="core-num">{{ teamStats.totalCount }}</text>
				<text class="core-lbl">团队人数</text>
			</view>
			<view class="v-divider"></view>
			<view class="core-stat-item">
				<text class="core-num">{{ teamStats.directCount }}</text>
				<text class="core-lbl">直推人数</text>
			</view>
		</view>

		<!-- 各星级总人数 -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">各星级总人数</text>
				</view>
			<view class="level-distribution">
				<view class="level-item" v-for="(level, index) in levelStats" :key="index" @tap="viewLevelMembers(level)">
					<text class="level-name">{{ getLevelText(level.level) }}</text>
					<text class="level-count">{{ level.count }}人</text>
			</view>
			</view>
		</view>

		<!-- 捐赠雨点入口（暂时不显示，代码已注释）
		<view class="section">
			<view class="donate-card" @tap="goToDonate">
				<view class="donate-icon iconfont icon-gongyi"></view>
				<view class="donate-content">
					<text class="donate-title">捐赠雨点到公益基金</text>
					<text class="donate-desc">点数与资金1:1兑换，支持公益事业</text>
				</view>
				<text class="donate-arrow">›</text>
			</view>
		</view>
		-->

		<!-- 我的直推成员 -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">我的直推成员</text>
					</view>
					
			<!-- 直推成员列表 -->
			<view class="member-list-container">
				<!-- 递归显示成员 -->
				<template v-for="member in directMembers" :key="member.id || member.mobile">
					<MemberRecursiveItem
						:member="member"
						:depth="0"
						@toggle-expand="toggleMemberExpand"
						@view-detail="viewUserDetail"
					/>
				</template>
					
				<!-- 空状态 -->
				<view v-if="directMembers.length === 0 && !loading" class="empty-list">
						<text class="empty-text">暂无直推成员</text>
					</view>
				</view>
		</view>
	</scroll-view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getReferDirect, getReferTeam, getUniLevel, refreshUserInfo } from '@/api/user.js'
import { getUniLevelStatus, promoteUniLevel } from '@/api/team.js'
import { getPointsSummary } from '@/api/points.js'
import { getLevelIcon, getLevelText, getUserLevelInfo } from '@/utils/level.js'
import { getAvatarUrl } from '@/utils/avatar.js'
import MemberRecursiveItem from '@/components/member-recursive-item.vue'

// 用户信息
const userInfo = ref({
	id: '',
	avatar_path: '',
	name: '',
	member_level: 0,
	mobile: ''
})

const userLevel = ref({
	level: 0,
	name: '普通用户',
	icon: '👤',
	rewardRate: 0
})

const userUniLevel = ref(0)

// 头像更新时间戳，用于强制刷新头像
const avatarUpdateTime = ref(Date.now())

const formatPoints = (val) => {
	return Number(val || 0).toFixed(4)
}


// 奖励统计
const rewardStats = ref({
	totalReward: 0
})

// 剩余雨点
const remainingPoints = ref(0)

// 团队统计
const teamStats = ref({
	totalCount: 0,
	directCount: 0
})

// 各星级统计
const levelStats = ref([])

// 直推成员列表
const directMembers = ref([])
const loading = ref(false)
const refreshing = ref(false)


/**
 * 检查登录状态
 */
const checkLogin = () => {
	const token = uni.getStorageSync('token')
	const userInfo = uni.getStorageSync('userInfo') || {}
	const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
	const mobile = userInfo.mobile || userInfo.phone
	const isLoggedIn = !!(token && (userId || (mobile && /^\d{11}$/.test(mobile))))
	
	if (!isLoggedIn) {
		uni.showToast({
			title: '请先登录',
			icon: 'none'
		})
		setTimeout(() => {
			uni.navigateTo({
				url: '/pages/index/index'
			})
		}, 500)
		return false
	}
	return true
}

/**
 * 跳转到登录页面
 */
const goToLogin = () => {
	uni.navigateTo({
		url: '/pages/index/index'
	})
}

/**
 * 跳转到奖励流水
 */
const goToRewardLog = (type = 'all') => {
	if (!checkLogin()) {
		return
	}
	uni.navigateTo({
		url: `/subPackages/page2/pages/points/log?type=${type}`
	})
}

/**
 * 跳转到雨点流水
 */
const goToPointsLog = () => {
	if (!checkLogin()) {
		return
	}
	uni.navigateTo({
		url: '/subPackages/page2/pages/points/log'
	})
}

/**
 * 跳转到捐赠页面
 */
// 捐赠雨点入口（暂时不显示，代码已注释）
// const goToDonate = () => {
// 	if (!checkLogin()) {
// 		return
// 	}
// 	uni.navigateTo({
// 		url: '/page1/team/donate'
// 	})
// }

/**
 * 加载奖励统计（累计雨点）和剩余雨点
 * 使用 /points/summary 接口
 */
const loadRewardStats = async () => {
	try {
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		const userId = storedUserInfo.id || storedUserInfo.user_id
		
		if (!userId) {
			rewardStats.value.totalReward = 0
			remainingPoints.value = 0
			return
		}
		
		// 调用点数汇总接口
		const res = await getPointsSummary(userId)
		const summary = res.data || res || {}
		
		// 累计雨点：cumulative_total
		if (summary.cumulative_total !== undefined) {
			rewardStats.value.totalReward = parseFloat(summary.cumulative_total || 0)
		} else {
			rewardStats.value.totalReward = 0
		}
		
		// 剩余雨点：remaining_points
		if (summary.remaining_points !== undefined) {
			remainingPoints.value = parseFloat(summary.remaining_points || 0)
		} else if (summary.true_total_points !== undefined) {
			// 兼容可能的字段名
			remainingPoints.value = parseFloat(summary.true_total_points || 0)
		} else {
			remainingPoints.value = 0
		}
		
		console.log('[团队页面] 积分汇总:', summary, '累计雨点:', rewardStats.value.totalReward, '剩余雨点:', remainingPoints.value)
	} catch (error) {
		console.error('[团队页面] 加载积分汇总失败:', error)
		rewardStats.value.totalReward = 0
		remainingPoints.value = 0
	}
}

// 兼容旧调用名称
const loadRemainingPoints = async () => {
	await loadRewardStats()
}

/**
 * 加载团队统计
 */
const loadTeamStats = async () => {
	try {
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		const mobile = storedUserInfo.mobile || storedUserInfo.phone
		if (!mobile) return
		
		// 获取团队成员
		const teamRes = await getReferTeam({ mobile, max_layer: 6 })
		const teamList = teamRes.data?.rows || teamRes.rows || []
		teamStats.value.totalCount = teamList.length
		
		// 统计各星级
		const levelCountMap = {}
		teamList.forEach(member => {
			const level = member.member_level || 0
			levelCountMap[level] = (levelCountMap[level] || 0) + 1
		})
		
		levelStats.value = [0, 1, 2, 3, 4, 5, 6].map(level => ({
			level,
			count: levelCountMap[level] || 0
		})).filter(item => item.count > 0)
		
		// 获取直推成员
		const directRes = await getReferDirect({ mobile, page: 1, size: 1000 })
		const directList = directRes.data?.rows || directRes.rows || []
		teamStats.value.directCount = directList.length
	} catch (error) {
		console.error('加载团队统计失败', error)
	}
}

/**
 * 加载直推成员
 */
const loadDirectMembers = async () => {
	try {
		loading.value = true
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		const mobile = storedUserInfo.mobile || storedUserInfo.phone
		if (!mobile) return
		
		const res = await getReferDirect({ mobile, page: 1, size: 100 })
		const memberList = res.data?.rows || res.data?.list || res.rows || res.list || []
		
		// 为每个成员获取直推人数
		directMembers.value = await Promise.all(memberList.map(async (member) => {
			let directCount = 0
			try {
				const directRes = await getReferDirect({ 
					mobile: member.mobile, 
					page: 1, 
					size: 1 
				})
				directCount = directRes.data?.total || directRes.total || 0
			} catch (e) {
				console.error('获取直推人数失败', e)
			}
			
			// 获取联创等级 - 使用新的接口
			let unilevel = 0
			try {
				// 优先使用新的接口 /unilevel/status
				if (member.user_id || member.id) {
					const userId = member.user_id || member.id
					const uniLevelRes = await getUniLevelStatus(userId)
					// 根据API返回格式：{ current_level, target_level, can_promote, reason }
					// 优先使用 current_level 字段
					if (uniLevelRes && typeof uniLevelRes === 'object') {
						if (uniLevelRes.data && typeof uniLevelRes.data === 'object' && 'current_level' in uniLevelRes.data) {
							unilevel = uniLevelRes.data.current_level
						} else if ('current_level' in uniLevelRes) {
							unilevel = uniLevelRes.current_level
						} else {
							// 兼容旧字段
							unilevel = uniLevelRes.data?.unilevel || uniLevelRes.data?.level || uniLevelRes.unilevel || 0
						}
					}
				} else {
					// 如果没有user_id，回退到旧的接口
					const uniLevelRes = await getUniLevel(member.mobile)
					unilevel = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
				}
			} catch (error) {
				console.error('获取联创等级失败', error)
			}
			
			return {
				...member,
				expanded: false,
				loading: false,
				directCount,
				unilevel,
				children: null,
				avatar_path: member.avatar_path || '',
				name: member.name || member.mobile || '未设置昵称',
				member_level: member.member_level || 0
			}
		}))
	} catch (error) {
		console.error('加载直推成员失败', error)
	} finally {
		loading.value = false
	}
}

/**
 * 切换成员展开/收起
 */
const toggleMemberExpand = async (member) => {
	if (!checkLogin()) {
		return
	}
	if (member.directCount === 0) {
		return
	}
	
	// 切换展开状态
	member.expanded = !member.expanded
	
	// 如果是展开且还没加载过团队成员
	if (member.expanded && !member.children && !member.loading) {
		await loadTeamMembers(member)
	}
}

/**
 * 加载成员的团队成员（使用 refer-team 接口）
 */
const loadTeamMembers = async (member) => {
	if (member.loading) return
	
	try {
		member.loading = true
		const memberMobile = member.mobile || member.phone
		if (!memberMobile) {
			member.children = []
			member.loading = false
			return
		}
		
		// 使用 refer-team 接口获取该成员的团队列表
		const res = await getReferTeam({ 
			mobile: memberMobile, 
			max_layer: 6 
		})
		
		// 解析响应数据
		let teamList = []
		if (res.data) {
			teamList = res.data.rows || res.data || []
		} else if (res.rows) {
			teamList = res.rows
		} else if (Array.isArray(res)) {
			teamList = res
		}
		
		if (teamList.length === 0) {
		member.children = []
			member.loading = false
			return
}

		// 提取第一层团队成员（layer=0 的成员，即直推）
		let teamMembers = []
		if (teamList.length > 0 && teamList[0].layer !== undefined) {
			// 如果有 layer 字段，过滤出 layer=0 的成员（直推是第一层）
			teamMembers = teamList.filter(item => (item.layer || 0) === 0)
		} else {
			// 否则取所有成员
			teamMembers = teamList
		}
		
		if (teamMembers.length === 0) {
				member.children = []
			member.loading = false
			return
		}
		
		// 为每个团队成员获取直推人数和联创等级
		member.children = await Promise.all(teamMembers.map(async (teamMember) => {
			let directCount = 0
			try {
				const directRes = await getReferDirect({ 
					mobile: teamMember.mobile || teamMember.phone, 
						page: 1, 
						size: 1 
					})
				directCount = directRes.data?.total || directRes.total || 0
			} catch (e) {
				console.error('获取直推人数失败', e)
			}
			
			let unilevel = 0
			try {
				// 优先使用新的接口 /unilevel/status
				if (teamMember.user_id || teamMember.id) {
					const userId = teamMember.user_id || teamMember.id
					const uniLevelRes = await getUniLevelStatus(userId)
					// 根据API返回格式：{ current_level, target_level, can_promote, reason }
					// 优先使用 current_level 字段
					if (uniLevelRes && typeof uniLevelRes === 'object') {
						if (uniLevelRes.data && typeof uniLevelRes.data === 'object' && 'current_level' in uniLevelRes.data) {
							unilevel = uniLevelRes.data.current_level
						} else if ('current_level' in uniLevelRes) {
							unilevel = uniLevelRes.current_level
						} else {
							// 兼容旧字段
							unilevel = uniLevelRes.data?.unilevel || uniLevelRes.data?.level || uniLevelRes.unilevel || 0
						}
					}
				} else {
					// 如果没有user_id，回退到旧的接口
					const uniLevelRes = await getUniLevel(teamMember.mobile || teamMember.phone)
					unilevel = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
				}
			} catch (error) {
				console.error('获取联创等级失败', error)
			}
			
			return {
				...teamMember,
				expanded: false,
				loading: false,
				directCount,
				unilevel,
				children: null,
				avatar_path: teamMember.avatar_path || '',
				name: teamMember.name || teamMember.mobile || '未设置昵称',
				member_level: teamMember.member_level || 0
			}
		}))
		
	} catch (error) {
		console.error('加载团队成员失败', error)
		member.children = []
		uni.showToast({
			title: '加载失败',
			icon: 'none'
		})
	} finally {
		member.loading = false
	}
}

/**
 * 查看用户详情
 */
const viewUserDetail = (user) => {
	if (!checkLogin()) {
		return
	}
	if (!user || !user.id) return
	uni.navigateTo({
		url: `/subPackages/page2/pages/team/member-detail?id=${encodeURIComponent(user.id)}`
	})
}

/**
 * 查看等级成员
 */
const viewLevelMembers = (level) => {
	if (!checkLogin()) {
		return
	}
	if (!level || level.count === 0) return
	uni.navigateTo({
		url: `/subPackages/page2/pages/team/level-members?level=${level.level}&levelName=${encodeURIComponent(getLevelText(level.level))}`
	})
}

/**
 * 处理头像错误
 */
const handleAvatarError = () => {
	console.log('头像加载失败')
}

onLoad(async () => {
	try {
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		userInfo.value = {
			id: storedUserInfo.id || '',
			avatar_path: storedUserInfo.avatar_path || '',
			name: storedUserInfo.name || '未设置昵称',
			member_level: storedUserInfo.member_level || 0,
			mobile: storedUserInfo.mobile || storedUserInfo.phone || ''
		}
		const level = storedUserInfo.member_level || 0
		userLevel.value = getUserLevelInfo(level)
		
		// 获取联创等级 - 使用新的接口
		if (userInfo.value.id || userInfo.value.user_id) {
			try {
				const userId = userInfo.value.id || userInfo.value.user_id
				const uniLevelRes = await getUniLevelStatus(userId)
				console.log('[团队页面] getUniLevelStatus 完整响应:', JSON.stringify(uniLevelRes, null, 2))
				// 根据API返回格式：{ current_level, target_level, can_promote, reason }
				// 优先使用 current_level 字段
				if (uniLevelRes && typeof uniLevelRes === 'object') {
					if (uniLevelRes.data && typeof uniLevelRes.data === 'object' && 'current_level' in uniLevelRes.data) {
						userUniLevel.value = uniLevelRes.data.current_level
					} else if ('current_level' in uniLevelRes) {
						userUniLevel.value = uniLevelRes.current_level
					} else {
						// 兼容旧字段
						userUniLevel.value = uniLevelRes.data?.unilevel || uniLevelRes.data?.level || uniLevelRes.unilevel || 0
					}
				} else {
					userUniLevel.value = 0
				}
				console.log('[团队页面] 当前用户联创等级 (current_level):', userUniLevel.value)
				
				// 调用自动晋升联创接口
				try {
					const promoteResult = await promoteUniLevel(userId)
					console.log('[团队页面] 自动晋升联创接口调用成功')
					// 如果晋升成功（不是静默失败），刷新用户信息
					if (promoteResult && !promoteResult.silent) {
						await refreshUserInfo()
						console.log('[团队页面] ✅ 联创等级已更新，用户信息已刷新')
					}
				} catch (promoteError) {
					// 静默处理，不显示错误提示（因为可能已经达到最高等级或条件不满足）
					console.log('[团队页面] 自动晋升联创:', promoteError.message || '已达到最高等级或条件不满足')
				}
			} catch (error) {
				console.error('获取联创等级失败', error)
				// 如果新接口失败，尝试使用旧接口
				if (userInfo.value.mobile) {
					try {
						const uniLevelRes = await getUniLevel(userInfo.value.mobile)
						userUniLevel.value = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
					} catch (e) {
						console.error('使用旧接口获取联创等级也失败', e)
					}
				}
			}
		} else if (userInfo.value.mobile) {
			// 如果没有user_id，使用旧接口
			try {
				const uniLevelRes = await getUniLevel(userInfo.value.mobile)
				userUniLevel.value = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
			} catch (error) {
				console.error('获取联创等级失败', error)
			}
		}
	} catch (e) {
		console.error('同步用户信息失败', e)
	}
	
	loadRewardStats()
	loadRemainingPoints()
	loadTeamStats()
	loadDirectMembers()
})

/**
 * 下拉刷新
 */
const onRefresh = async () => {
	refreshing.value = true
	try {
		// 先刷新用户信息（调用查询个人信息接口）
		await refreshUserInfo()
		
		// 然后重新加载页面数据
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		console.log('[团队页面] 下拉刷新 - 从本地存储读取用户信息:', {
			avatar_path: storedUserInfo.avatar_path,
			avatar: storedUserInfo.avatar,
			name: storedUserInfo.name,
			member_level: storedUserInfo.member_level
		})
		
		// 使用 Object.assign 确保响应式更新
		Object.assign(userInfo.value, {
			id: storedUserInfo.id || storedUserInfo.user_id || '',
			avatar_path: storedUserInfo.avatar_path || storedUserInfo.avatar || '',
			name: storedUserInfo.name || '未设置昵称',
			member_level: storedUserInfo.member_level || 0,
			mobile: storedUserInfo.mobile || storedUserInfo.phone || ''
		})
		
		// 特别处理头像字段，确保响应式更新
		if (storedUserInfo.avatar_path) {
			userInfo.value.avatar_path = storedUserInfo.avatar_path
		}
		if (storedUserInfo.avatar) {
			userInfo.value.avatar = storedUserInfo.avatar
		}
		
		const level = storedUserInfo.member_level || 0
		userLevel.value = getUserLevelInfo(level)
		
		// 刷新其他数据
		await Promise.all([
			loadRewardStats(),
			loadRemainingPoints(),
			loadTeamStats(),
			loadDirectMembers()
		])
		
		// 获取联创等级 - 使用新的接口
		if (userInfo.value.id || userInfo.value.user_id) {
			try {
				const userId = userInfo.value.id || userInfo.value.user_id
				const uniLevelRes = await getUniLevelStatus(userId)
				console.log('[团队页面] onRefresh getUniLevelStatus 完整响应:', JSON.stringify(uniLevelRes, null, 2))
				// 根据API返回格式：{ current_level, target_level, can_promote, reason }
				// 优先使用 current_level 字段
				if (uniLevelRes && typeof uniLevelRes === 'object') {
					if (uniLevelRes.data && typeof uniLevelRes.data === 'object' && 'current_level' in uniLevelRes.data) {
						userUniLevel.value = uniLevelRes.data.current_level
					} else if ('current_level' in uniLevelRes) {
						userUniLevel.value = uniLevelRes.current_level
					} else {
						// 兼容旧字段
						userUniLevel.value = uniLevelRes.data?.unilevel || uniLevelRes.data?.level || uniLevelRes.unilevel || 0
					}
				} else {
					userUniLevel.value = 0
				}
				console.log('[团队页面] onRefresh 当前用户联创等级 (current_level):', userUniLevel.value)
				
				// 调用自动晋升联创接口
				try {
					const promoteResult = await promoteUniLevel(userId)
					console.log('[团队页面] 自动晋升联创接口调用成功 (onRefresh)')
					// 如果晋升成功（不是静默失败），刷新用户信息并重新获取联创等级
					if (promoteResult && !promoteResult.silent) {
						await refreshUserInfo()
						// 重新获取联创等级
						const updatedUniLevelRes = await getUniLevelStatus(userId)
						if (updatedUniLevelRes && typeof updatedUniLevelRes === 'object') {
							if (updatedUniLevelRes.data && typeof updatedUniLevelRes.data === 'object' && 'current_level' in updatedUniLevelRes.data) {
								userUniLevel.value = updatedUniLevelRes.data.current_level
							} else if ('current_level' in updatedUniLevelRes) {
								userUniLevel.value = updatedUniLevelRes.current_level
							}
						}
						console.log('[团队页面] ✅ 联创等级已更新，用户信息已刷新 (onRefresh)')
					}
				} catch (promoteError) {
					// 静默处理，不显示错误提示（因为可能已经达到最高等级或条件不满足）
					console.log('[团队页面] 自动晋升联创 (onRefresh):', promoteError.message || '已达到最高等级或条件不满足')
				}
			} catch (error) {
				console.error('获取联创等级失败', error)
				// 如果新接口失败，尝试使用旧接口
				if (userInfo.value.mobile) {
					try {
						const uniLevelRes = await getUniLevel(userInfo.value.mobile)
						userUniLevel.value = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
					} catch (e) {
						console.error('使用旧接口获取联创等级也失败', e)
					}
				}
			}
		} else if (userInfo.value.mobile) {
			// 如果没有user_id，使用旧接口
			try {
				const uniLevelRes = await getUniLevel(userInfo.value.mobile)
				userUniLevel.value = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
			} catch (error) {
				console.error('获取联创等级失败', error)
			}
		}
		
		// 更新头像时间戳，强制刷新头像显示
		avatarUpdateTime.value = Date.now()
		console.log('[团队页面] 下拉刷新 - 更新后的头像URL:', getAvatarUrl(userInfo.value.avatar_path) + '?t=' + avatarUpdateTime.value)
		setTimeout(() => {
			avatarUpdateTime.value = Date.now()
		}, 100)
		
		uni.showToast({ title: '刷新成功', icon: 'success', duration: 1000 })
	} catch (error) {
		console.error('刷新失败', error)
		uni.showToast({ title: '刷新失败', icon: 'none', duration: 1000 })
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
	try {
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		userInfo.value = {
			id: storedUserInfo.id || '',
			avatar_path: storedUserInfo.avatar_path || '',
			name: storedUserInfo.name || '未设置昵称',
			member_level: storedUserInfo.member_level || 0,
			mobile: storedUserInfo.mobile || storedUserInfo.phone || ''
		}
		const level = storedUserInfo.member_level || 0
		userLevel.value = getUserLevelInfo(level)
		
		// 获取联创等级并调用自动晋升接口
		if (userInfo.value.id || userInfo.value.user_id) {
			try {
				const userId = userInfo.value.id || userInfo.value.user_id
				
				// 先查询当前联创状态
				const uniLevelRes = await getUniLevelStatus(userId)
				console.log('[团队页面] onShow getUniLevelStatus 完整响应:', JSON.stringify(uniLevelRes, null, 2))
				
				// 更新联创等级显示
				if (uniLevelRes && typeof uniLevelRes === 'object') {
					if (uniLevelRes.data && typeof uniLevelRes.data === 'object' && 'current_level' in uniLevelRes.data) {
						userUniLevel.value = uniLevelRes.data.current_level
					} else if ('current_level' in uniLevelRes) {
						userUniLevel.value = uniLevelRes.current_level
					} else {
						// 兼容旧字段
						userUniLevel.value = uniLevelRes.data?.unilevel || uniLevelRes.data?.level || uniLevelRes.unilevel || 0
					}
				} else {
					userUniLevel.value = 0
				}
				console.log('[团队页面] onShow 当前用户联创等级 (current_level):', userUniLevel.value)
				
				// 调用自动晋升联创接口
				try {
					const promoteResult = await promoteUniLevel(userId)
					console.log('[团队页面] 自动晋升联创接口调用成功 (onShow)')
					// 如果晋升成功（不是静默失败），刷新用户信息并重新获取联创等级
					if (promoteResult && !promoteResult.silent) {
						await refreshUserInfo()
						// 重新获取联创等级
						const updatedUniLevelRes = await getUniLevelStatus(userId)
						if (updatedUniLevelRes && typeof updatedUniLevelRes === 'object') {
							if (updatedUniLevelRes.data && typeof updatedUniLevelRes.data === 'object' && 'current_level' in updatedUniLevelRes.data) {
								userUniLevel.value = updatedUniLevelRes.data.current_level
							} else if ('current_level' in updatedUniLevelRes) {
								userUniLevel.value = updatedUniLevelRes.current_level
							}
						}
						console.log('[团队页面] ✅ 联创等级已更新，用户信息已刷新 (onShow)')
					}
				} catch (promoteError) {
					// 静默处理，不显示错误提示（因为可能已经达到最高等级或条件不满足）
					console.log('[团队页面] 自动晋升联创 (onShow):', promoteError.message || '已达到最高等级或条件不满足')
				}
			} catch (error) {
				console.error('[团队页面] onShow 获取联创等级失败', error)
			}
		}
	} catch (e) {
		console.error('同步用户信息失败', e)
	}
	
	loadRewardStats()
	loadRemainingPoints()
})
</script>

<style scoped>
.team-page {
	min-height: 100vh;
	height: 100vh;
	background: #f7f8fc;
	padding-bottom: 40rpx;
}

/* 顶部背景 */
.header-bg {
	background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
	padding: 40rpx 40rpx 120rpx;
	border-bottom-left-radius: 40rpx;
	border-bottom-right-radius: 40rpx;
}

.user-row {
	display: flex;
	align-items: center;
}

.user-left {
	display: flex;
	align-items: center;
	gap: 24rpx;
	width: 100%;
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

.uni-level-badge {
	position: absolute;
	bottom: -4rpx;
	right: -4rpx;
	width: 32rpx;
	height: 32rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2rpx solid #fff;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.uni-level-badge.uni-level-1 {
	background: linear-gradient(135deg, #ffd700, #ffed4e);
}

.uni-level-badge.uni-level-2 {
	background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
}

.uni-level-badge.uni-level-3 {
	background: linear-gradient(135deg, #ff6b6b, #ff8787);
}

.uni-level-text {
	font-size: 18rpx;
	font-weight: bold;
	color: #333;
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

.level-0 { background: rgba(205, 127, 50, 0.9); }
.level-1 { background: rgba(192, 192, 192, 0.9); }
.level-2 { background: rgba(255, 215, 0, 0.9); }
.level-3 { background: rgba(185, 242, 255, 0.9); }
.level-4 { background: rgba(255, 105, 180, 0.9); }
.level-5 { background: rgba(138, 43, 226, 0.9); }
.level-6 { background: rgba(255, 20, 147, 0.9); }

.level-icon {
	font-size: 20rpx;
}

.level-text {
	color: #fff;
	font-weight: bold;
}

.user-sub-row {
	display: flex;
	align-items: center;
	margin-top: 8rpx;
}

.unilevel-badge-small {
	display: inline-flex;
	align-items: center;
	padding: 6rpx 16rpx;
	border-radius: 20rpx;
	font-size: 22rpx;
}

.unilevel-badge-small.uni-level-0 {
	background: rgba(255, 255, 255, 0.2);
	border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.unilevel-badge-small.uni-level-1 {
	background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 237, 78, 0.3));
	border: 1rpx solid rgba(255, 215, 0, 0.5);
}

.unilevel-badge-small.uni-level-2 {
	background: linear-gradient(135deg, rgba(192, 192, 192, 0.3), rgba(232, 232, 232, 0.3));
	border: 1rpx solid rgba(192, 192, 192, 0.5);
}

.unilevel-badge-small.uni-level-3 {
	background: linear-gradient(135deg, rgba(255, 107, 107, 0.3), rgba(255, 135, 135, 0.3));
	border: 1rpx solid rgba(255, 107, 107, 0.5);
}

.unilevel-text-small {
	color: rgba(255, 255, 255, 0.9);
	font-weight: 500;
	font-size: 22rpx;
}

/* 悬浮卡片 */
.floating-card {
	background: #fff;
	margin: -80rpx 30rpx 30rpx;
	border-radius: 24rpx;
	padding: 40rpx 20rpx;
	display: flex;
	align-items: center;
	justify-content: space-around;
	box-shadow: 0 8rpx 20rpx rgba(30, 60, 114, 0.08);
}

.core-stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	flex: 1;
}

.core-num {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}

.core-lbl {
	font-size: 22rpx;
	color: #999;
}

.v-divider {
	width: 1px;
	height: 40rpx;
	background: #eee;
}

/* Section */
.section {
	background: white;
	margin: 0 30rpx 24rpx;
	border-radius: 20rpx;
	padding: 30rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.02);
}

.section-header {
	margin-bottom: 24rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}

/* 星级分布 */
.level-distribution {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12rpx;
}

.level-item {
	display: flex;
	align-items: center;
	gap: 10rpx;
	padding: 14rpx 16rpx;
	background: #f8f9fa;
	border-radius: 8rpx;
}

.level-name {
	flex: 1;
	font-size: 24rpx;
	color: #333;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.level-count {
	font-size: 24rpx;
	color: #666;
}

/* 捐赠卡片 */
.donate-card {
	display: flex;
	align-items: center;
	padding: 30rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 16rpx;
	box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
}

.donate-icon {
	font-size: 56rpx;
	margin-right: 24rpx;
}

.donate-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.donate-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #ffffff;
}

.donate-desc {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.9);
}

.donate-arrow {
	font-size: 48rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-left: 20rpx;
}

/* 成员列表容器 */
.member-list-container {
	display: flex;
	flex-direction: column;
	background: #fff;
	border-radius: 12rpx;
	overflow: hidden;
}

.member-item {
	width: 100%;
}

.member-row {
	display: flex;
	align-items: center;
	padding: 24rpx;
	border-bottom: 1rpx solid #f0f0f0;
	background: #fff;
}

.member-avatar-wrapper {
	position: relative;
	margin-right: 20rpx;
	flex-shrink: 0;
}

.member-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: #f0f0f0;
}

/* 层级数字徽章（左上角） */
.layer-badge {
	position: absolute;
	top: -4rpx;
	left: -4rpx;
	width: 32rpx;
	height: 32rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2rpx solid #fff;
	box-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.3);
	z-index: 10;
}

.layer-badge-text {
	font-size: 18rpx;
	color: #fff;
	font-weight: bold;
}

.member-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	min-width: 0;
}

.member-name {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	line-height: 1.4;
}

.member-mobile {
	font-size: 24rpx;
	color: #999;
	line-height: 1.3;
}

.member-level-badge {
	display: inline-flex;
	align-items: center;
	gap: 4rpx;
	padding: 4rpx 12rpx;
	border-radius: 12rpx;
	font-size: 20rpx;
	align-self: flex-start;
}

.level-icon {
	font-size: 18rpx;
}

.level-text {
	color: #fff;
	font-weight: bold;
}

.expand-icon-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	padding: 0 10rpx;
	flex-shrink: 0;
}

.expand-icon {
	font-size: 24rpx;
	color: #999;
	transition: transform 0.3s;
}

.expand-icon.expanded {
	transform: rotate(180deg);
}

.expand-count {
	font-size: 20rpx;
	color: #999;
}

.loading-state,
.empty-state {
	padding: 20rpx 30rpx;
	text-align: center;
	background: #fafafa;
	border-bottom: 1rpx solid #f0f0f0;
}

.loading-text,
.empty-text {
	font-size: 24rpx;
	color: #999;
}

.empty-list {
	text-align: center;
	padding: 60rpx;
	font-size: 26rpx;
	color: #999;
}
</style>
