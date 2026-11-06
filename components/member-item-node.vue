<template>
	<view class="member-item-node">
		<view class="member-header" @tap="handleToggleExpand">
			<view class="member-info">
				<view class="member-avatar-wrapper">
					<image 
						:src="getAvatarUrl(member.avatar_path)" 
						mode="aspectFill" 
						class="member-avatar" 
						@error="handleAvatarError"
						@tap.stop="handleViewDetail"
					/>
					<!-- 层级数字显示在头像旁边（左上角） -->
					<view class="layer-badge" v-if="depth > 0">
						<text class="layer-badge-text">{{ depth }}</text>
					</view>
					<!-- 联创等级徽章 -->
					<view class="uni-level-badge" v-if="member.unilevel > 0" :class="'uni-level-' + member.unilevel">
						<text class="uni-level-text">{{ member.unilevel }}</text>
					</view>
				</view>
				<view class="member-details">
					<text class="member-name">{{ member.name || member.mobile || '未设置昵称' }}</text>
					<text class="member-mobile">{{ member.mobile }}</text>
					<view class="member-level-badge" :class="'level-' + (member.member_level || 0)">
						<text class="level-icon-small">{{ getLevelIcon(member.member_level || 0) }}</text>
						<text class="level-text-small">{{ getLevelText(member.member_level || 0) }}</text>
					</view>
				</view>
			</view>
			<view class="expand-icon" v-if="member.directCount > 0" :class="{ expanded: member.expanded }">
				<text class="icon">▼</text>
			</view>
		</view>
		
		
		<!-- 加载状态 -->
		<view v-if="member.expanded && !member.childrenLoaded" class="member-expand-loading">
			<text class="loading-text">加载中...</text>
		</view>
		
		<!-- 空状态 -->
		<view v-if="member.expanded && member.childrenLoaded && (!member.children || member.children.length === 0)" class="member-expand-empty">
			<text class="empty-text">暂无直推成员</text>
		</view>
		
		<!-- 递归显示子成员 -->
		<template v-if="member.expanded && member.childrenLoaded && member.children && member.children.length > 0">
			<MemberItemNode 
				v-for="(child, index) in member.children" 
				:key="child.id || index"
				:member="child"
				:depth="depth + 1"
				@toggle-expand="$emit('toggle-expand', $event)"
				@load-children="$emit('load-children', $event)"
				@view-detail="$emit('view-detail', $event)"
			/>
		</template>
	</view>
</template>

<script setup>
// 声明组件名称以支持递归
defineOptions({
	name: 'MemberItemNode'
})

import { computed, watch } from 'vue'
import { getLevelIcon, getLevelText } from '@/utils/level.js'
import { getAvatarUrl } from '@/utils/avatar.js'

const props = defineProps({
	member: {
		type: Object,
		required: true
	},
	depth: {
		type: Number,
		default: 1
	}
})

const emit = defineEmits(['toggle-expand', 'load-children', 'view-detail'])


const handleToggleExpand = () => {
	emit('toggle-expand', props.member)
}

const handleViewDetail = () => {
	emit('view-detail', props.member)
}

const handleAvatarError = () => {
	// 处理头像加载错误
}
</script>

<style scoped>
.member-item-node {
	width: 100%;
}

.member-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
	background: #fff;
	border-bottom: 1rpx solid #e8e8e8;
	position: relative;
}


.member-info {
	display: flex;
	align-items: center;
	gap: 20rpx;
	flex: 1;
}

.member-avatar-wrapper {
	position: relative;
	flex-shrink: 0;
}

.member-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: #f0f0f0;
}

/* 层级数字徽章 */
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

/* 联创等级徽章 */
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

.member-details {
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

.level-icon-small {
	font-size: 18rpx;
}

.level-text-small {
	color: #fff;
	font-weight: bold;
}

.expand-icon {
	width: 40rpx;
	height: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: transform 0.3s;
}

.expand-icon.expanded {
	transform: rotate(180deg);
}

.expand-icon .icon {
	font-size: 24rpx;
	color: #999;
}

.member-expand-loading,
.member-expand-empty {
	padding: 20rpx 30rpx;
	background: #fafafa;
	border-top: 1rpx solid #f0f0f0;
	text-align: center;
}

.member-expand-loading .loading-text,
.member-expand-empty .empty-text {
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

