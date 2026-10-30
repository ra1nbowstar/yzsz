<template>
	<scroll-view class="ledger-page" :scroll-y="true">
		<!-- 类型筛选 -->
		<scroll-view class="ledger-tabs" :scroll-x="true">
			<view
				v-for="tab in tabs"
				:key="tab.value"
				class="ledger-tab"
				:class="{ active: activeTab === tab.value }"
				@tap="activeTab = tab.value"
			>
				<text>{{ tab.label }}</text>
			</view>
		</scroll-view>

		<view class="ledger-list">
			<view class="ledger-item" v-for="(item, i) in filteredList" :key="i">
				<view class="ledger-item-left">
					<text class="ledger-item-type">{{ item.eventType }}</text>
					<text class="ledger-item-time">{{ item.time }}</text>
				</view>
				<view class="ledger-item-right">
					<text class="ledger-item-delta" :class="item.delta > 0 ? 'up' : 'down'">
						{{ item.delta > 0 ? '+' : '' }}{{ item.delta }} {{ item.assetLabel }}
					</text>
					<text class="ledger-item-balance">余额 {{ item.balanceAfter }}</text>
				</view>
			</view>
			<view class="ledger-empty" v-if="filteredList.length === 0">
				<text>暂无流水</text>
			</view>
		</view>
	</scroll-view>
</template>

<script setup>
import { ref, computed } from 'vue'

// 筛选类型（对应接口文档 10.2 ledger 的 asset_type）
const tabs = [
	{ label: '全部', value: 'all' },
	{ label: '积分', value: 'point' },
	{ label: '雨点', value: 'rain' },
	{ label: '优惠券', value: 'coupon' },
	{ label: '咯哒蛋', value: 'egg' },
	{ label: '咯哒券', value: 'goda_coupon' }
]

const activeTab = ref('all')

// 占位数据（后端接口未提供，暂为空，接入后替换）
const ledgerList = ref([])

const filteredList = computed(() => {
	if (activeTab.value === 'all') return ledgerList.value
	return ledgerList.value.filter((it) => it.assetType === activeTab.value)
})
</script>

<style scoped>
.ledger-page {
	height: 100vh;
	background: #f5f5f5;
}

/* 类型筛选 */
.ledger-tabs {
	background: #fff;
	white-space: nowrap;
	padding: 20rpx 10rpx;
}

.ledger-tab {
	display: inline-block;
	padding: 10rpx 24rpx;
	margin: 0 8rpx;
	border-radius: 28rpx;
	background: #f5f5f5;
}

.ledger-tab text {
	font-size: 24rpx;
	color: #666;
}

.ledger-tab.active {
	background: #3d6bff;
}

.ledger-tab.active text {
	color: #fff;
}

/* 列表 */
.ledger-list {
	margin: 20rpx 30rpx;
	background: #fff;
	border-radius: 16rpx;
	padding: 0 30rpx;
}

.ledger-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 0;
	border-bottom: 1rpx solid #f5f5f5;
}

.ledger-item:last-child {
	border-bottom: none;
}

.ledger-item-left {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.ledger-item-type {
	font-size: 28rpx;
	color: #333;
}

.ledger-item-time {
	font-size: 22rpx;
	color: #999;
}

.ledger-item-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 6rpx;
}

.ledger-item-delta {
	font-size: 28rpx;
	font-weight: 600;
}

.ledger-item-delta.up {
	color: #4caf50;
}

.ledger-item-delta.down {
	color: #ff4757;
}

.ledger-item-balance {
	font-size: 22rpx;
	color: #999;
}

.ledger-empty {
	padding: 80rpx 0;
	text-align: center;
}

.ledger-empty text {
	font-size: 24rpx;
	color: #999;
}
</style>