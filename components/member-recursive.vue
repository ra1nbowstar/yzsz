<template>
	<view class="member-recursive-item">
		<!-- 成员信息行 -->
		<view class="member-row" @tap="handleToggle">
			<view class="member-avatar-wrapper">
				<image 
					:src="getAvatarUrl(member.avatar_path)" 
					mode="aspectFill" 
					class="member-avatar"
					@tap.stop="handleViewDetail"
				/>
				<!-- 层级数字徽章（左上角） -->
				<view class="layer-badge" v-if="depth > 0">
					<text class="layer-badge-text">{{ depth }}</text>
				</view>
				<!-- 联创等级徽章（右下角） -->
				<view class="uni-level-badge" v-if="member.unilevel > 0" :class="'uni-level-' + member.unilevel">
					<text class="uni-level-text">{{ member.unilevel }}</text>
				</view>
			</view>
			
			<view class="member-info">
				<text class="member-name">{{ member.name || member.mobile || '未设置昵称' }}</text>
				<text class="member-mobile">{{ member.mobile }}</text>
				<view class="member-level-badge" :class="'level-' + (member.member_level || 0)">
					<text class="level-icon">{{ getLevelIcon(member.member_level || 0) }}</text>
					<text class="level-text">{{ getLevelText(member.member_level || 0) }}</text>
				</view>
			</view>
			
			<!-- 展开按钮（如果有直推成员） -->
			<view class="expand-icon-wrapper" v-if="member.directCount > 0">
				<text class="expand-icon" :class="{ expanded: member.expanded }">▼</text>
				<text class="expand-count">{{ member.directCount }}</text>
			</view>
		</view>
		
		<!-- 加载状态 -->
		<view v-if="member.expanded && member.loading" class="loading-state">
			<text class="loading-text">加载中...</text>
		</view>
		
		<!-- 空状态 -->
		<view v-if="member.expanded && !member.loading && member.children !== null && (!member.children || member.children.length === 0)" class="empty-state">
			<text class="empty-text">暂无直推成员</text>
		</view>
		
		<!-- 递归显示子成员 -->
		<template v-if="member.expanded && member.children && Array.isArray(member.children) && member.children.length > 0">
			<member-recursive
				v-for="(child, index) in member.children"
				:key="`child-${child.id || index}-${depth}`"
				:member="child"
				:depth="depth + 1"
				@toggle-expand="$emit('toggle-expand', $event)"
				@view-detail="$emit('view-detail', $event)"
			/>
		</template>
	</view>
</template>

<script setup>
import { computed } from 'vue'
import { getLevelIcon, getLevelText } from '@/utils/level.js'
import { getAvatarUrl } from '@/utils/avatar.js'

const props = defineProps({
	member: {
		type: Object,
		required: true
	},
	depth: {
		type: Number,
		default: 0
	}
})

const emit = defineEmits(['toggle-expand', 'view-detail'])

// 使用 computed 确保响应式更新
const hasChildren = computed(() => {
	const member = props.member
	if (!member.expanded) return false
	if (!member.children) return false
	if (!Array.isArray(member.children)) return false
	return member.children.length > 0
})

const handleToggle = () => {
	emit('toggle-expand', props.member)
}

const handleViewDetail = () => {
	emit('view-detail', props.member)
}
</script>

<style scoped>
.member-recursive-item {
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

/* 联创等级徽章（右下角） */
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
	font-size: 18rpx;
	font-weight: bold;
	color: #333;
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

/* 等级徽章颜色 */
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
.level-5 {
	background: rgba(138, 43, 226, 0.9);
}
.level-6 {
	background: rgba(255, 20, 147, 0.9);
}
</style>

