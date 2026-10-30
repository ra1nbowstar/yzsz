<template>
	<view class="detail-page">
		<!-- 会员信息卡片 -->
		<view class="member-card">
			<view class="member-avatar-wrapper">
			<image :src="member.avatar" mode="aspectFill" class="member-avatar" />
				<view class="uni-level-badge" v-if="member.unilevel > 0" :class="'uni-level-' + member.unilevel">
					<text class="uni-level-text">{{ member.unilevel }}</text>
				</view>
			</view>
			<text class="member-name">{{ member.nickname }}</text>
			<view class="member-level" :class="'level-' + member.level">
				<text class="level-icon iconfont" :class="getLevelIcon(member.level)"></text>
				<text class="level-text">{{ getLevelText(member.level) }}</text>
			</view>
			<text class="member-id">ID: {{ member.id }}</text>
		</view>

		<!-- 基础信息 -->
		<view class="info-section">
			<view class="section-title">基础信息</view>
			<view class="info-list">
				<view class="info-item">
					<text class="info-label">会员等级</text>
					<text class="info-value">{{ getLevelText(member.level) }}</text>
				</view>
				<view class="info-item" v-if="member.unilevel > 0">
					<text class="info-label">联创等级</text>
					<text class="info-value">{{ member.unilevel }}级</text>
				</view>
			</view>
			
			<!-- 推荐人卡片 -->
			<view class="referrer-section" v-if="member.referrerData">
				<view class="section-title">推荐人</view>
				<view class="referrer-card" @tap="viewReferrerDetail">
					<image 
						:src="getReferrerAvatar(member.referrerData)" 
						mode="aspectFill" 
						class="referrer-avatar" 
						@error="handleAvatarError"
					/>
					<view class="referrer-info">
						<text class="referrer-name">{{ member.referrerData.name || member.referrerData.mobile || '未设置昵称' }}</text>
						<text class="referrer-mobile">{{ member.referrerData.mobile }}</text>
					</view>
					<view class="referrer-level-badge" :class="'level-' + (member.referrerData.member_level || 0)">
						<text class="level-icon-small iconfont" :class="getLevelIcon(member.referrerData.member_level || 0)"></text>
						<text class="level-text-small">{{ getLevelText(member.referrerData.member_level || 0) }}</text>
					</view>
				</view>
			</view>
			<view class="info-item" v-else>
				<text class="info-label">推荐人</text>
				<text class="info-value">无</text>
			</view>
		</view>

		<!-- 团队信息 -->
		<view class="team-section">
			<view class="section-title">团队信息</view>
			<view class="info-list">
				<view class="info-item">
					<text class="info-label">直推人数</text>
					<text class="info-value">{{ member.directCount }}人</text>
				</view>
				<view class="info-item">
					<text class="info-label">团队总人数</text>
					<text class="info-value">{{ member.teamCount }}人</text>
				</view>
			</view>
		</view>

		<!-- 最近动态 -->
		<view class="activity-section">
			<view class="section-title">最近动态</view>
			<view class="activity-list">
				<view class="activity-item" v-for="(item, index) in member.activities" :key="index">
					<view class="activity-icon">
						<text v-if="item.icon === '⭐'" class="iconfont icon-shoucang"></text>
						<text v-else>{{ item.icon }}</text>
					</view>
					<view class="activity-content">
						<text class="activity-text">{{ item.text }}</text>
						<text class="activity-time">{{ item.time }}</text>
					</view>
				</view>
				<view class="empty-state" v-if="!member.activities || member.activities.length === 0">
					<text class="empty-text">暂无动态</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getUserInfo, getUniLevel, getReferDirect, getReferTeam } from '@/api/user.js'
import { getAvatarUrl } from '@/utils/avatar.js'
import { getLevelIcon, getLevelText } from '@/utils/level.js'

/**
 * 获取推荐人头像
 */
const getReferrerAvatar = (referrerData) => {
	if (!referrerData) {
		console.log('[推荐人头像] 推荐人数据为空')
		return '/static/logo.png'
	}
	
	console.log('[推荐人头像] 推荐人数据:', referrerData)
	
	// 优先使用 avatar_path
	if (referrerData.avatar_path) {
		const avatarUrl = getAvatarUrl(referrerData.avatar_path)
		console.log('[推荐人头像] 使用 avatar_path:', referrerData.avatar_path, '->', avatarUrl)
		return avatarUrl
	}
	
	// 其次使用 avatar
	if (referrerData.avatar) {
		const avatarUrl = getAvatarUrl(referrerData.avatar)
		console.log('[推荐人头像] 使用 avatar:', referrerData.avatar, '->', avatarUrl)
		return avatarUrl
	}
	
	// 尝试其他可能的字段
	if (referrerData.image || referrerData.image_url) {
		const avatarUrl = getAvatarUrl(referrerData.image || referrerData.image_url)
		console.log('[推荐人头像] 使用 image/image_url:', referrerData.image || referrerData.image_url, '->', avatarUrl)
		return avatarUrl
	}
	
	console.log('[推荐人头像] 没有找到头像字段，使用默认头像')
	return '/static/logo.png'
}

/**
 * 处理头像错误
 */
const handleAvatarError = () => {
	// 头像加载失败时使用默认头像
}

/**
 * 查看推荐人详情
 */
const viewReferrerDetail = () => {
	if (!member.value.referrerData || !member.value.referrerData.mobile) {
		return
	}
	uni.navigateTo({
		url: `/subPackages/page2/pages/team/member-detail?mobile=${encodeURIComponent(member.value.referrerData.mobile)}`
	})
}

const member = ref({
	id: '',
	avatar: '',
	nickname: '',
	level: 0,
	unilevel: 0,
	referrer: '',
	referrerData: null, // 推荐人详细信息
	contribution: 0,
	orderCount: 0,
	teamCount: 0,
	directCount: 0,
	teamPerformance: 0,
	activities: [],
	mobile: '',
	status: 0,
	new_status: 0
})


/**
 * 加载会员详情
 */
const loadMemberDetail = async (mobile) => {
	if (!mobile) {
		uni.showToast({ title: '缺少手机号', icon: 'none' })
		return
	}
	
	try {
		uni.showLoading({ title: '加载中...' })
		
		// 1. 获取用户基本信息
		const userInfoRes = await getUserInfo(mobile)
		const userData = userInfoRes.data || userInfoRes
		
		console.log('[会员详情] 用户信息:', userData)
		
		// 2. 获取联创等级
		let unilevel = 0
		try {
			const uniLevelRes = await getUniLevel(mobile)
			unilevel = uniLevelRes.data?.unilevel || uniLevelRes.unilevel || 0
		} catch (error) {
			console.error('加载联创等级失败', error)
		}
		
		// 3. 获取直推人数
		let directCount = 0
		try {
			const directRes = await getReferDirect({ mobile, page: 1, size: 1 })
			directCount = directRes.data?.total || directRes.total || 0
		} catch (error) {
			console.error('获取直推人数失败', error)
		}
		
		// 4. 获取团队总人数
		let teamCount = 0
		try {
			const teamRes = await getReferTeam({ mobile, max_layer: 6 })
			const teamList = teamRes.data?.rows || teamRes.rows || []
			// 排除自己（layer=0的成员，即直推），返回团队总人数
			teamCount = teamList.filter(m => m.layer !== 0).length
		} catch (error) {
			console.error('获取团队总人数失败', error)
		}
		
		// 5. 处理头像URL
		let avatarUrl = '/static/logo.png'
		if (userData.avatar_path) {
			avatarUrl = getAvatarUrl(userData.avatar_path)
		} else if (userData.avatar) {
			avatarUrl = getAvatarUrl(userData.avatar)
		}
		
		// 6. 处理推荐人数据（根据 /user/info 接口获取）
		let referrerData = null
		// 优先使用 referrer_mobile 或 referrerMobile 字段获取推荐人手机号
		const referrerMobile = userData.referrer_mobile || userData.referrerMobile || userData.referrer?.mobile
		if (referrerMobile) {
			try {
				console.log('[会员详情] 通过手机号调用 /user/info 接口获取推荐人信息:', String(referrerMobile).slice(0, 3) + '****' + String(referrerMobile).slice(-4))
				const referrerInfoRes = await getUserInfo(referrerMobile)
				const referrerInfo = referrerInfoRes.data || referrerInfoRes
				console.log('[会员详情] 推荐人信息API返回')
				
				// 处理头像路径（可能是JSON字符串数组格式）
				let avatarPath = referrerInfo.avatar_path || referrerInfo.avatar || ''
				if (avatarPath && typeof avatarPath === 'string') {
					// 尝试解析JSON字符串数组
					if (avatarPath.trim().startsWith('[') && avatarPath.trim().endsWith(']')) {
						try {
							const parsed = JSON.parse(avatarPath)
							if (Array.isArray(parsed) && parsed.length > 0) {
								avatarPath = parsed[0]
							}
						} catch (e) {
							console.warn('[会员详情] 推荐人头像JSON解析失败，使用原始字符串:', e)
						}
					}
				}
				
				referrerData = {
					mobile: referrerMobile,
					name: referrerInfo.name || referrerInfo.nickname || '',
					member_level: referrerInfo.member_level || referrerInfo.level || 0,
					avatar_path: avatarPath,
					avatar: avatarPath
				}
				console.log('[会员详情] 处理后的推荐人数据:', referrerData)
			} catch (error) {
				console.error('[会员详情] 获取推荐人信息失败:', error)
				// 如果获取失败，尝试使用referrer对象中的数据
				if (userData.referrer && typeof userData.referrer === 'object' && userData.referrer !== null) {
					let fallbackAvatarPath = userData.referrer.avatar_path || userData.referrer.avatar || ''
					// 处理JSON字符串数组格式
					if (fallbackAvatarPath && typeof fallbackAvatarPath === 'string') {
						if (fallbackAvatarPath.trim().startsWith('[') && fallbackAvatarPath.trim().endsWith(']')) {
							try {
								const parsed = JSON.parse(fallbackAvatarPath)
								if (Array.isArray(parsed) && parsed.length > 0) {
									fallbackAvatarPath = parsed[0]
								}
							} catch (e) {
								console.warn('[会员详情] 推荐人头像JSON解析失败:', e)
							}
						}
					}
					referrerData = {
						mobile: userData.referrer.mobile || referrerMobile || '',
						name: userData.referrer.name || '',
						member_level: userData.referrer.member_level || 0,
						avatar_path: fallbackAvatarPath,
						avatar: fallbackAvatarPath
					}
				}
			}
		} else if (userData.referrer && typeof userData.referrer === 'object' && userData.referrer !== null) {
			// 如果没有手机号，但有referrer对象，直接使用
			let fallbackAvatarPath = userData.referrer.avatar_path || userData.referrer.avatar || ''
			// 处理JSON字符串数组格式
			if (fallbackAvatarPath && typeof fallbackAvatarPath === 'string') {
				if (fallbackAvatarPath.trim().startsWith('[') && fallbackAvatarPath.trim().endsWith(']')) {
					try {
						const parsed = JSON.parse(fallbackAvatarPath)
						if (Array.isArray(parsed) && parsed.length > 0) {
							fallbackAvatarPath = parsed[0]
						}
					} catch (e) {
						console.warn('[会员详情] 推荐人头像JSON解析失败:', e)
					}
				}
			}
			referrerData = {
				mobile: userData.referrer.mobile || '',
				name: userData.referrer.name || '',
				member_level: userData.referrer.member_level || 0,
				avatar_path: fallbackAvatarPath,
				avatar: fallbackAvatarPath
			}
			console.log('[会员详情] 从referrer对象获取推荐人数据:', referrerData)
		}
		
		// 7. 更新会员数据
		member.value = {
			id: userData.uid || userData.id || userData.user_id || mobile,
			avatar: avatarUrl,
			nickname: userData.name || userData.nickname || '未设置昵称',
			level: userData.member_level || userData.level || 0,
			unilevel: unilevel,
			referrer: referrerData ? (referrerData.name || referrerData.mobile) : (userData.referrer_name || userData.referrer || '无'),
			referrerData: referrerData,
			contribution: parseFloat(userData.total_contribution || userData.contribution || 0),
			orderCount: parseInt(userData.order_count || userData.orderCount || 0),
			teamCount: teamCount,
			directCount: directCount,
			teamPerformance: parseFloat(userData.team_performance || userData.teamPerformance || 0),
			activities: [], // 动态数据暂时为空，后续可以添加接口获取
			mobile: mobile || userData.mobile || userData.phone || '',
			status: userData.status || userData.new_status || 0,
			new_status: userData.new_status || userData.status || 0
		}
		
		console.log('[会员详情] 加载完成:', member.value)
	} catch (error) {
		console.error('加载会员详情失败', error)
		uni.showToast({ title: error.message || '加载失败', icon: 'none' })
	} finally {
		uni.hideLoading()
	}
}


onLoad(async (options) => {
	// 优先使用 mobile，如果没有则使用 id
	const mobile = options.mobile || options.id
	if (!mobile) {
		uni.showToast({ title: '缺少参数', icon: 'none' })
		return
	}
	
	// 调用API获取会员详情
	await loadMemberDetail(mobile)
})
</script>

<style scoped>
.detail-page {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: 40rpx;
}

/* 会员卡片 */
.member-card {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 60rpx 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16rpx;
}

.member-avatar-wrapper {
	position: relative;
}

.member-avatar {
	width: 160rpx;
	height: 160rpx;
	border-radius: 50%;
	border: 6rpx solid rgba(255, 255, 255, 0.3);
}

/* 联创等级徽章 */
.uni-level-badge {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 48rpx;
	height: 48rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 3rpx solid #fff;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
	z-index: 10;
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
	font-size: 24rpx;
	font-weight: bold;
	color: #333;
}

.member-name {
	font-size: 36rpx;
	font-weight: bold;
	color: #fff;
}

.member-level {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 8rpx 24rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.2);
}

.level-icon {
	font-size: 24rpx;
	color: #fff;
}

.level-icon.icon-shoucang {
  color: #ff4757 !important;
}

.level-text {
	font-size: 24rpx;
	color: #fff;
	font-weight: bold;
}

.member-id {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.8);
}

/* 信息区块 */
.info-section,
.team-section {
	margin-top: 20rpx;
	padding: 30rpx;
	background: #fff;
	border-radius: 16rpx;
}

.activity-section {
	background: #fff;
	margin: 20rpx 30rpx 0;
	border-radius: 16rpx;
	padding: 30rpx;
}

.section-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 24rpx;
}

.info-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.info-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
}

.info-label {
	font-size: 26rpx;
	color: #666;
}

.info-value {
	font-size: 26rpx;
	color: #333;
	font-weight: bold;
}

/* 动态列表 */
.activity-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.activity-item {
	display: flex;
	gap: 20rpx;
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
}

.activity-icon {
	width: 60rpx;
	height: 60rpx;
	background: #fff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	flex-shrink: 0;
}

.activity-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.activity-text {
	font-size: 26rpx;
	color: #333;
}

.activity-time {
	font-size: 22rpx;
	color: #999;
}

.empty-state {
	text-align: center;
	padding: 60rpx 0;
}

.empty-text {
	font-size: 26rpx;
	color: #999;
}

/* 推荐人卡片 */
.referrer-section {
	margin-top: 20rpx;
}

.referrer-card {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
}

.referrer-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: #f0f0f0;
	flex-shrink: 0;
}

.referrer-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.referrer-name {
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
}

.referrer-mobile {
	font-size: 24rpx;
	color: #999;
}

.referrer-level-badge {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 8rpx 16rpx;
	border-radius: 20rpx;
	font-size: 22rpx;
	flex-shrink: 0;
}

.level-icon-small {
	font-size: 20rpx;
}

.level-text-small {
	font-size: 22rpx;
	font-weight: 500;
}

/* 等级样式 */
.referrer-level-badge.level-0 {
	background: #d4a574;
	color: #fff;
}

.referrer-level-badge.level-1 {
	background: #ffd700;
	color: #8b4513;
}

.referrer-level-badge.level-2 {
	background: #c0c0c0;
	color: #333;
}

.referrer-level-badge.level-3 {
	background: #cd7f32;
	color: #fff;
}

.referrer-level-badge.level-4 {
	background: #ff6b6b;
	color: #fff;
}

.referrer-level-badge.level-5 {
	background: #4ecdc4;
	color: #fff;
}

.referrer-level-badge.level-6 {
	background: #95e1d3;
	color: #fff;
}

.referrer-level-badge.level-7 {
	background: #f38181;
	color: #fff;
}
</style>
