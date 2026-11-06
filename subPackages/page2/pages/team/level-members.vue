<template>
	<view class="level-members-page">
		<!-- 顶部标题栏 -->
		<view class="header-section">
			<text class="level-title">{{ levelName }}</text>
			<text class="member-count">共 {{ memberList.length }} 人</text>
		</view>

		<!-- 成员列表 -->
		<view class="member-list" v-if="memberList.length > 0">
			<view 
				v-for="(member, index) in memberList" 
				:key="member.id || index"
				class="member-item"
			>
				<view class="member-content" @tap="viewUserDetail(member)">
					<view class="avatar-wrapper" @tap.stop="viewUserDetail(member)">
						<image 
							:src="getAvatarUrl(member.avatar_path)" 
							mode="aspectFill" 
							class="member-avatar" 
							@error="handleAvatarError"
							@tap.stop="viewUserDetail(member)"
						/>
					</view>
					<view class="member-info">
						<view class="member-name-row">
							<text class="member-name">{{ member.name || member.mobile || '未设置昵称' }}</text>
							<view class="member-level-badge" :class="'level-' + (member.member_level || 0)">
								<text class="level-icon-small iconfont" :class="getLevelIcon(member.member_level || 0)"></text>
								<text class="level-text-small">{{ getLevelText(member.member_level || 0) }}</text>
							</view>
							<view class="status-badge frozen" v-if="member.status === 1 || member.new_status === 1">
								<text class="status-text">已冻结</text>
							</view>
						</view>
						<text class="member-mobile">{{ member.mobile }}</text>
						<text class="member-time" v-if="member.created_at">加入时间：{{ formatTime(member.created_at) }}</text>
					</view>
					<view class="arrow-icon" @tap.stop="viewUserDetail(member)">
						<text>></text>
					</view>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-state" v-else-if="!loading">
			<text class="empty-text">暂无该等级成员</text>
		</view>

		<!-- 加载中 -->
		<view class="loading-state" v-if="loading">
			<text class="loading-text">加载中...</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getReferTeam } from '@/api/user.js'
import { getLevelIcon, getLevelText } from '@/utils/level.js'
import { getAvatarUrl } from '@/utils/avatar.js'

// 等级信息
const level = ref(0)
const levelName = ref('')

// 成员列表
const memberList = ref([])
const loading = ref(false)

/**
 * 加载该等级的所有成员
 */
const loadLevelMembers = async () => {
	try {
		loading.value = true
		
		// 获取当前用户手机号
		const storedUserInfo = uni.getStorageSync('userInfo') || {}
		const mobile = storedUserInfo.mobile || storedUserInfo.phone
		if (!mobile) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			return
		}
		
		// 获取所有团队成员
		const teamRes = await getReferTeam({ mobile, max_layer: 6 })
		const teamList = teamRes.data?.rows || teamRes.rows || []
		
		// 过滤出指定等级的所有成员
		memberList.value = teamList.filter(member => {
			const memberLevel = member.member_level || 0
			return memberLevel === level.value
		})
		
		// 按加入时间倒序排序（最新的在前）
		memberList.value.sort((a, b) => {
			const timeA = a.created_at || a.createdAt || ''
			const timeB = b.created_at || b.createdAt || ''
			return timeB.localeCompare(timeA)
		})
		
	} catch (error) {
		console.error('加载等级成员失败', error)
		uni.showToast({ title: '加载失败', icon: 'none' })
		memberList.value = []
	} finally {
		loading.value = false
	}
}

/**
 * 查看用户详情
 */
const viewUserDetail = (user) => {
	if (!user) {
		uni.showToast({ title: '用户信息不存在', icon: 'none' })
		return
	}
	
	// 团队详情接口用 users.id
	if (!user.id) {
		uni.showToast({ title: '用户信息不完整', icon: 'none' })
		return
	}
	
	// 跳转到用户详情页
	uni.navigateTo({
		url: `/subPackages/page2/pages/team/member-detail?id=${encodeURIComponent(user.id)}`
	})
}

/**
 * 处理头像加载错误
 */
const handleAvatarError = (e) => {
	console.log('头像加载失败，使用默认头像')
}

/**
 * 格式化时间
 */
const formatTime = (timeStr) => {
	if (!timeStr) return ''
	
	try {
		const date = new Date(timeStr)
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	} catch (e) {
		return timeStr
	}
}


onLoad((options) => {
	// 获取等级参数
	level.value = parseInt(options.level || 0)
	levelName.value = decodeURIComponent(options.levelName || '成员列表')
	
	// 设置页面标题
	uni.setNavigationBarTitle({
		title: levelName.value
	})
	
	// 加载成员列表
	loadLevelMembers()
})
</script>

<style scoped>
.level-members-page {
	min-height: 100vh;
	background: #f7f8fc;
	padding-bottom: 40rpx;
}

/* 顶部标题栏 */
.header-section {
	background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
	padding: 40rpx 30rpx;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.level-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #fff;
}

.member-count {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.8);
}

/* 成员列表 */
.member-list {
	display: flex;
	flex-direction: column;
	gap: 0;
	margin-top: 20rpx;
}

.member-item {
	background: #fff;
	border-bottom: 1rpx solid #e8e8e8;
}

.member-item:first-child {
	border-top: none;
}

.member-item:last-child {
	border-bottom: none;
}

.member-content {
	display: flex;
	align-items: center;
	padding: 24rpx 30rpx;
	gap: 20rpx;
}

.avatar-wrapper {
	position: relative;
	flex-shrink: 0;
}

.member-avatar {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background: #f0f0f0;
	border: 2rpx solid #eee;
}

.member-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	min-width: 0;
}

.member-name-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	flex-wrap: wrap;
}

.member-name {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.member-level-badge {
	display: inline-flex;
	align-items: center;
	gap: 4rpx;
	padding: 4rpx 12rpx;
	border-radius: 12rpx;
	font-size: 20rpx;
	flex-shrink: 0;
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

.level-icon-small {
	font-size: 18rpx;
}

.level-text-small {
	color: #fff;
	font-weight: bold;
	font-size: 20rpx;
}

.member-mobile {
	font-size: 24rpx;
	color: #666;
}

.member-time {
	font-size: 22rpx;
	color: #999;
}

.status-badge {
	display: inline-flex;
	align-items: center;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	font-size: 20rpx;
	background: #ffebee;
}

.status-badge.frozen {
	background: #ffebee;
}

.status-text {
	color: #ff3b30;
	font-weight: 500;
}

.arrow-icon {
	font-size: 32rpx;
	color: #ccc;
	flex-shrink: 0;
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

/* 加载中 */
.loading-state {
	text-align: center;
	padding: 120rpx 0;
}

.loading-text {
	font-size: 28rpx;
	color: #999;
}
</style>

