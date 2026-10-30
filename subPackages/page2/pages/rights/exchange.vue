<template>
	<scroll-view class="exchange-page" :scroll-y="true">
		<view class="exchange-header">
			<text class="exchange-title">权益兑换中心</text>
			<text class="exchange-sub">券兑咯哒蛋 · 券兑农场实物 · 转化记录</text>
		</view>

		<view class="exchange-tabs">
			<view class="exchange-tab" :class="{ active: activeTab === 'egg' }" @tap="activeTab = 'egg'">券兑咯哒蛋</view>
			<view class="exchange-tab" :class="{ active: activeTab === 'farm' }" @tap="activeTab = 'farm'">券兑农场实物</view>
			<view class="exchange-tab" :class="{ active: activeTab === 'records' }" @tap="activeTab = 'records'">转化记录</view>
		</view>

		<!-- 券兑咯哒蛋 -->
		<view v-if="activeTab === 'egg'">
			<view class="panel">
				<view class="panel-row">
					<text class="panel-label">持有优惠券</text>
					<text class="panel-value">{{ couponBalance }}</text>
				</view>
				<view class="panel-row">
					<text class="panel-label">实时咯哒值</text>
					<text class="panel-value">{{ unitValue }}</text>
				</view>
			</view>

			<view class="panel">
				<text class="panel-title">输入兑换券额</text>
				<input class="egg-input" type="number" v-model="couponInput" placeholder="请输入优惠券数量" />
				<view class="split-info">
					<view class="split-item">
						<text class="split-num">80%</text>
						<text class="split-desc">计入底池</text>
					</view>
					<view class="split-item">
						<text class="split-num">20%</text>
						<text class="split-desc">划入补贴池</text>
					</view>
					<view class="split-item">
						<text class="split-num">{{ eggEstimate }}</text>
						<text class="split-desc">预计咯哒蛋</text>
					</view>
				</view>
				<view class="panel-tip">预估口径：券额 × 80% ÷ 实时咯哒值；最终数量以服务端报价为准。</view>
				<view class="primary-btn" @tap="doExchangeEgg">确认兑换</view>
			</view>
		</view>

		<!-- 券兑农场实物 -->
		<view v-if="activeTab === 'farm'">
			<view class="panel">
				<text class="panel-tip">通道一：消耗优惠券直接兑换农场实物，不进入咯哒蛋体系、不产生积分。</text>
			</view>
			<view class="farm-item" v-for="(p, i) in farmProducts" :key="i">
				<view class="farm-left">
					<text class="farm-name">{{ p.name }}</text>
					<text class="farm-desc">{{ p.desc }}</text>
				</view>
				<view class="farm-right">
					<text class="farm-price">券 {{ p.couponPrice }}</text>
					<view class="mini-btn" @tap="doExchangeFarm(p)">兑换</view>
				</view>
			</view>
			<view class="list-empty" v-if="farmProducts.length === 0"><text>暂无可兑换商品</text></view>
		</view>

		<!-- 转化记录 -->
		<view v-if="activeTab === 'records'">
			<view class="record-item" v-for="(r, i) in conversionRecords" :key="i">
				<view class="record-left">
					<text class="record-title">咯哒蛋自动转咯哒券</text>
					<text class="record-time">{{ r.time }}</text>
				</view>
				<view class="record-right">
					<text class="record-egg">-{{ r.eggQuantity }} 蛋</text>
					<text class="record-goda">+{{ r.godaCoupons }} 券</text>
				</view>
			</view>
			<view class="list-empty" v-if="conversionRecords.length === 0"><text>暂无转化记录</text></view>
		</view>
	</scroll-view>
</template>

<script setup>
import { ref, computed } from 'vue'

const activeTab = ref('egg')

// ===== 占位数据（后端接口未提供，暂全部置 0 / 空，接入后替换） =====
const couponBalance = ref(0)
const unitValue = ref(0)
const couponInput = ref('')

const eggEstimate = computed(() => {
	const n = Number(couponInput.value)
	if (!Number.isFinite(n) || n <= 0) return '--'
	const v = Number(unitValue.value)
	if (!Number.isFinite(v) || v <= 0) return '--'
	return Math.floor((n * 0.8) / v)
})

const farmProducts = ref([])

const conversionRecords = ref([])

const doExchangeEgg = () => {
	uni.showToast({ title: '敬请期待', icon: 'none' })
}

const doExchangeFarm = () => {
	uni.showToast({ title: '敬请期待', icon: 'none' })
}
</script>

<style scoped>
.exchange-page {
	height: 100vh;
	background: #f5f5f5;
}

.exchange-header {
	background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
	padding: 40rpx 30rpx 40rpx;
}

.exchange-title {
	display: block;
	font-size: 38rpx;
	font-weight: bold;
	color: #fff;
}

.exchange-sub {
	display: block;
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-top: 8rpx;
}

.exchange-tabs {
	display: flex;
	background: #fff;
	padding: 0 20rpx;
}

.exchange-tab {
	flex: 1;
	text-align: center;
	padding: 24rpx 0;
	font-size: 26rpx;
	color: #666;
	position: relative;
}

.exchange-tab.active {
	color: #3d6bff;
	font-weight: 600;
}

.exchange-tab.active::after {
	content: '';
	position: absolute;
	left: 50%;
	bottom: 8rpx;
	transform: translateX(-50%);
	width: 48rpx;
	height: 6rpx;
	border-radius: 3rpx;
	background: #3d6bff;
}

.panel {
	background: #fff;
	margin: 20rpx 30rpx;
	border-radius: 16rpx;
	padding: 30rpx;
}

.panel-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12rpx 0;
}

.panel-label {
	font-size: 26rpx;
	color: #666;
}

.panel-value {
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
}

.panel-title {
	display: block;
	font-size: 28rpx;
	color: #333;
	font-weight: 600;
	margin-bottom: 16rpx;
}

.egg-input {
	height: 80rpx;
	background: #f5f7fa;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 30rpx;
	color: #333;
}

.split-info {
	display: flex;
	margin-top: 24rpx;
}

.split-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.split-num {
	font-size: 32rpx;
	font-weight: bold;
	color: #3d6bff;
}

.split-desc {
	font-size: 22rpx;
	color: #999;
}

.panel-tip {
	display: block;
	margin-top: 16rpx;
	font-size: 22rpx;
	color: #999;
	line-height: 1.5;
}

.primary-btn {
	margin-top: 24rpx;
	height: 80rpx;
	background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	color: #fff;
	font-weight: 600;
}

/* 农场兑换 */
.farm-item {
	background: #fff;
	margin: 0 30rpx 20rpx;
	border-radius: 16rpx;
	padding: 30rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.farm-left {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.farm-name {
	font-size: 30rpx;
	color: #333;
	font-weight: 600;
}

.farm-desc {
	font-size: 22rpx;
	color: #999;
}

.farm-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 12rpx;
}

.farm-price {
	font-size: 26rpx;
	color: #ff9800;
	font-weight: 600;
}

.mini-btn {
	padding: 10rpx 28rpx;
	background: #3d6bff;
	color: #fff;
	font-size: 24rpx;
	border-radius: 28rpx;
}

/* 转化记录 */
.record-item {
	background: #fff;
	margin: 0 30rpx 20rpx;
	border-radius: 16rpx;
	padding: 30rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.record-left {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.record-title {
	font-size: 28rpx;
	color: #333;
}

.record-time {
	font-size: 22rpx;
	color: #999;
}

.record-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 8rpx;
}

.record-egg {
	font-size: 24rpx;
	color: #ff4757;
}

.record-goda {
	font-size: 24rpx;
	color: #4caf50;
}

.list-empty {
	padding: 80rpx 0;
	text-align: center;
}

.list-empty text {
	font-size: 24rpx;
	color: #999;
}
</style>