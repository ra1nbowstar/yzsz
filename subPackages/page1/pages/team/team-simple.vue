<template>
	<view class="team-page">
		<!-- 顶部背景与用户信息 -->
		<view class="header-bg">
			<view class="user-row">
				<view class="user-left">
					<view class="avatar-wrapper" @tap="viewUserDetail(userInfo)">
						<image :src="getAvatarUrl(userInfo.avatar_path)" mode="aspectFill" class="avatar" @error="handleAvatarError" />
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
						<text class="user-sub">当前奖励比例 {{ userLevel.rewardRate }}%</text>
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
					<text class="level-icon iconfont" :class="getLevelIcon(level.level)"></text>
					<text class="level-name">{{ getLevelText(level.level) }}</text>
					<text class="level-count">{{ level.count }}人</text>
				</view>
			</view>
		</view>

		<!-- 联创等级 -->
		<view class="section" v-if="userUniLevel > 0">
			<view class="section-header">
				<text class="section-title">联创等级</text>
			</view>
			<view class="unilevel-content">
				<view class="unilevel-status">
					<view class="unilevel-badge-display" :class="'uni-level-' + userUniLevel">
						<text class="unilevel-level-text">{{ userUniLevel }}级联创</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 我的直推成员 - 简化版 -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">我的直推成员</text>
			</view>
			
			<!-- 直推成员列表 -->
			<view class="simple-member-list">
				<view v-if="directMembers && directMembers.length > 0">
					<member-item-node 
						v-for="(member, index) in directMembers" 
						:key="member.id"
						:member="member"
						:depth="1"
						@toggle-expand="toggleMember"
						@view-detail="viewUserDetail"
					/>
				</view>
				
				<!-- 空状态 -->
				<view v-if="directMembers.length === 0 && !loading" class="empty-list">
					<text>暂无直推成员</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getReferDirect, getReferTeam, getUniLevel } from '@/api/user.js'
import { getRewardList, getReferralRewards, getSpecialPoints } from '../../api/reward.js'
import { getLevelIcon, getLevelText, getUserLevelInfo } from '@/utils/level.js'
import { getAvatarUrl } from '@/utils/avatar.js'
import MemberItemNode from '@/components/member-item-node.vue'

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

const formatPoints = (val) => {
	return Number(val || 0).toFixed(4)
}

// 奖励统计
const rewardStats = ref({
	totalReward: 0
})

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

/**
 * 跳转到奖励流水
 */
const goToRewardLog = (type = 'all') => {
	uni.navigateTo({
		url: `/subPackages/page2/pages/points/log?type=${type}`
	})
}

/**
 * 加载奖励统计
 */
const loadRewardStats = async () => {
	try {
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		const userId = storedUserInfo.id || storedUserInfo.user_id
		
		if (!userId) return
		
		const specialRes = await getSpecialPoints({ user_id: userId })
		const specialData = specialRes.data || specialRes
		const teamPoints = parseFloat(specialData.team_reward_points || 0)
		const referralPoints = parseFloat(specialData.referral_points || 0)
		rewardStats.value.totalReward = teamPoints + referralPoints
	} catch (error) {
		console.error('加载奖励统计失败', error)
	}
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
/**
 * 处理成员数据（获取直推人数和联创等级）
 */
const processMembers = async (list) => {
	return await Promise.all(list.map(async (member) => {
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
		
		let unilevel = 0
		try {
			const uniLevelRes = await getUniLevel(member.mobile)
			unilevel = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
		} catch (error) {
			console.error('获取联创等级失败', error)
		}
		
		return {
			...member,
			expanded: false,
			loading: false,
			childrenLoaded: false,
			directCount,
			unilevel,
			children: null
		}
	}))
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
		
		directMembers.value = await processMembers(memberList)
	} catch (error) {
		console.error('加载直推成员失败', error)
	} finally {
		loading.value = false
	}
}

/**
 * 切换成员展开/收起
 */
const toggleMember = async (member) => {
	if (member.directCount === 0) return
	
	member.expanded = !member.expanded
	
	// 如果是展开且还没加载过子成员
	if (member.expanded && !member.children) {
		member.loading = true // UI on component uses member.loading if handled, or we can use member.childrenLoaded
		try {
			const res = await getReferDirect({ 
				mobile: member.mobile, 
				page: 1, 
				size: 100 
			})
			const rawList = res.data?.rows || res.data?.list || res.rows || res.list || []
			if (rawList.length > 0) {
				member.children = await processMembers(rawList)
			} else {
				member.children = []
			}
			member.childrenLoaded = true
		} catch (error) {
			console.error('加载子成员失败', error)
			member.children = []
			member.childrenLoaded = true 
		} finally {
			member.loading = false
		}
	}
}

/**
 * 查看用户详情
 */
const viewUserDetail = (user) => {
	if (!user || !user.id) return
	uni.navigateTo({
		url: `/subPackages/page2/pages/team/member-detail?id=${encodeURIComponent(user.id)}`
	})
}

/**
 * 查看等级成员
 */
const viewLevelMembers = (level) => {
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
		
		// 获取联创等级
		if (userInfo.value.mobile) {
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
	loadTeamStats()
	loadDirectMembers()
})

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
	} catch (e) {
		console.error('同步用户信息失败', e)
	}
	
	loadRewardStats()
})
</script>

<style scoped>
.team-page {
	min-height: 100vh;
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

.user-sub {
	font-size: 24rpx;
	color: rgba(255,255,255,0.7);
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
	font-size: 36rpx;
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
}

.level-count {
	font-size: 24rpx;
	color: #666;
}

/* 联创等级 */
.unilevel-content {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20rpx 0;
}

.unilevel-badge-display {
	padding: 16rpx 40rpx;
	border-radius: 30rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.unilevel-badge-display.uni-level-1 {
	background: linear-gradient(135deg, #ffd700, #ffed4e);
	box-shadow: 0 4rpx 12rpx rgba(255, 215, 0, 0.3);
}

.unilevel-badge-display.uni-level-2 {
	background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
	box-shadow: 0 4rpx 12rpx rgba(192, 192, 192, 0.3);
}

.unilevel-badge-display.uni-level-3 {
	background: linear-gradient(135deg, #ff6b6b, #ff8787);
	box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.3);
}

.unilevel-level-text {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}



.empty-list {
	text-align: center;
	padding: 60rpx;
	font-size: 26rpx;
	color: #999;
}
</style>
