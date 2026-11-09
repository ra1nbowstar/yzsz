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
						<text class="referrer-name">{{ member.referrerData.name || '未设置昵称' }}</text>
						<text class="referrer-mobile" v-if="member.referrerData.mobile">{{ member.referrerData.mobile }}</text>
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

		<!-- 最近动态（新接口不返回该数据，暂时隐藏） -->
		<view v-if="false" class="activity-section">
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
import { getTeamMemberDetail } from '@/api/user.js'
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
	if (!member.value.referrerData || !member.value.referrerData.id) {
		return
	}
	uni.navigateTo({
		url: `/subPackages/page2/pages/team/member-detail?id=${encodeURIComponent(member.value.referrerData.id)}`
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
 * 加载团队成员详情（GET /user/team/member/{id}，id 为 users.id）
 */
const loadMemberDetailById = async (id) => {
	try {
		uni.showLoading({ title: '加载中...' })
		const res = await getTeamMemberDetail(id)
		// 后端确认：直接返回对象，外层无 data/rows 包装
		const data = res && res.data ? res.data : (res || {})
		const refData = data.referrer && typeof data.referrer === 'object' ? data.referrer : null

		member.value = {
			id: data.id || id,
			avatar: data.avatar_path ? getAvatarUrl(data.avatar_path) : '/static/logo.png',
			nickname: data.name || '未设置昵称',
			level: Number(data.member_level) || 0,
			unilevel: 0, // 该接口不返回联创等级
			referrer: refData ? (refData.name || refData.id || '无') : '无',
			referrerData: refData ? {
				id: refData.id,
				mobile: '',
				name: refData.name || '',
				member_level: Number(refData.member_level) || 0,
				avatar_path: refData.avatar_path || '',
				avatar: refData.avatar_path || ''
			} : null,
			contribution: 0,
			orderCount: 0,
			teamCount: Number(data.team_total) || 0,
			directCount: Number(data.direct_count) || 0,
			teamPerformance: 0,
			activities: [],
			mobile: '',
			status: 0,
			new_status: 0,
			layer: Number(data.layer) || 0
		}
		console.log('[会员详情] 加载完成:', member.value)
	} catch (error) {
		console.error('[会员详情] 加载失败:', error)
		// 403 已由 request 层统一提示（TEAM_MEMBER_ACCESS_DENIED）
	} finally {
		uni.hideLoading()
	}
}

onLoad(async (options) => {
	const memberId = options.id
	if (!memberId) {
		uni.showToast({ title: '缺少成员ID，请从团队列表进入', icon: 'none' })
		return
	}
	await loadMemberDetailById(memberId)
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
