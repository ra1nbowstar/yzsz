<template>
	<scroll-view class="rights-page" :scroll-y="true">
		<!-- 权益总览 -->
		<view class="rights-header">
			<text class="rights-title">权益中心</text>
			<text class="rights-subtitle">会员消费回馈福利</text>
		</view>

		<view class="rights-assets">
			<view class="rights-asset" v-for="item in assetList" :key="item.label" @tap="onAssetTap(item)">
				<text class="rights-asset-value">{{ item.value }}</text>
				<text class="rights-asset-label">{{ item.label }}</text>
			</view>
		</view>

		<!-- 咯哒蛋板块 -->
		<view class="rights-section">
			<view class="rights-section-head">
				<text class="rights-section-title">咯哒蛋</text>
				<text class="rights-section-tag">权益计量</text>
			</view>

			<view class="egg-main">
				<view class="egg-main-item">
					<text class="egg-main-value">{{ eggData.quantity }}</text>
					<text class="egg-main-label">持有数量</text>
				</view>
				<view class="egg-main-item">
					<text class="egg-main-value">{{ eggData.currentUnitValue }}</text>
					<text class="egg-main-label">实时咯哒值</text>
				</view>
				<view class="egg-main-item">
					<text class="egg-main-value">{{ eggData.currentValue }}</text>
					<text class="egg-main-label">当前权益计量值</text>
				</view>
			</view>

			<view class="egg-progress" v-if="progressPercent !== null">
				<view class="egg-progress-bar">
					<view class="egg-progress-fill" :style="{ width: progressPercent + '%' }"></view>
					<view class="egg-progress-mark"></view>
				</view>
				<view class="egg-progress-labels">
					<text>增值进度 {{ progressPercent }}%</text>
					<text>达到 {{ thresholdPercent }}% 自动转咯哒券</text>
				</view>
			</view>
			<view class="egg-progress-pending" v-else>
				<text>增值进度：暂不可计算</text>
			</view>

			<view class="egg-action-btn" @tap="goExchangeCouponToEgg">
				<text>优惠券兑换咯哒蛋</text>
			</view>
		</view>

		<!-- 咯哒券板块 -->
		<view class="rights-section">
			<view class="rights-section-head">
				<text class="rights-section-title">咯哒券</text>
				<text class="rights-section-tag" v-if="showWineTag">可兑坛装白酒</text>
			</view>
			<view class="rights-row">
				<text class="rights-row-label">持有数量</text>
				<text class="rights-row-value">{{ godaCouponData.balance }}</text>
			</view>
			<view class="goda-record" v-for="(r, i) in godaCouponRecords" :key="i">
				<view class="goda-record-left">
					<text class="goda-record-title">{{ r.title }}</text>
					<text class="goda-record-time">{{ r.time }}</text>
				</view>
				<text class="goda-record-delta">{{ r.delta }}</text>
			</view>
			<view class="list-empty" v-if="godaCouponRecords.length === 0">
				<text>功能即将开放</text>
			</view>
		</view>

		<!-- 流水台账 -->
		<view class="rights-section">
			<view class="rights-section-head">
				<text class="rights-section-title">流水台账</text>
				<text class="rights-more" @tap="goLedger">查看全部 ›</text>
			</view>
			<view class="ledger-item" v-for="(item, i) in recentLedger" :key="i">
				<view class="ledger-item-left">
					<text class="ledger-item-type">{{ item.eventType }}</text>
					<text class="ledger-item-time">{{ item.time }}</text>
				</view>
				<view class="ledger-item-right">
					<text class="ledger-item-delta" :class="item.delta > 0 ? 'up' : 'down'">
						{{ item.delta > 0 ? '+' : '' }}{{ item.delta }} {{ item.assetLabel }}
					</text>
					<text class="ledger-item-balance">计量值 {{ item.balanceAfter }}</text>
				</view>
			</view>
			<view class="list-empty" v-if="recentLedger.length === 0">
				<text>功能即将开放</text>
			</view>
		</view>
		<!-- 合规声明（后端 disclaimer） -->
		<view class="rights-disclaimer" v-if="disclaimer">
			<text>{{ disclaimer }}</text>
		</view>
	</scroll-view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAssets, formatQty, hasToken } from '@/api/assets.js'

// null = 未取到（未登录/加载中/失败），展示为 --；0 才是真实零
const rights = ref({
	points: null,      // 积分
	rain: null,        // 剩余雨点
	coupons: null,     // 可用券张数
	kadaEgg: null,     // 咯哒蛋
	kadaCoupon: null   // 咯哒券
})

const showQty = (v) => (v === null || v === undefined ? '--' : formatQty(v))

const assetList = computed(() => [
	{ label: '积分', value: showQty(rights.value.points), route: '/subPackages/page2/pages/points/balance' },
	{ label: '剩余雨点', value: showQty(rights.value.rain), route: '/subPackages/page2/pages/points/log?type=rain' },
	{ label: '优惠券', value: showQty(rights.value.coupons), route: '/subPackages/page2/pages/user/coupons' },
	{ label: '咯哒蛋', value: showQty(rights.value.kadaEgg) },
	{ label: '咯哒券', value: showQty(rights.value.kadaCoupon) }
])

// 点击资产卡片：带 route 的跳转对应页面（当前仅「优惠券」→ 我的优惠券）
const onAssetTap = (item) => {
	if (!item || !item.route) return
	uni.navigateTo({ url: item.route })
}

// 咯哒蛋
const eggData = ref({
	quantity: '--',         // 持有数量
	currentUnitValue: '--', // 实时咯哒值
	currentValue: '--',     // 当前权益计量值（不是可提现金额）
	growthRatio: null,      // 增值比例（null 表示规则未确认，不可计算）
	conversionThreshold: 1  // 转券触发线（后端 conversion_threshold_ratio）
})

// 合规声明（后端 disclaimer，不用前端自拟措辞）
const disclaimer = ref('')

// 能力声明（后端 capabilities，控制白酒等入口显隐）
const capabilities = ref(null)

// 白酒标签：优先用后端 capabilities.can_list_wine；缺省时按咯哒券数量兜底
const showWineTag = computed(() => {
	const cap = capabilities.value
	if (cap && cap.can_list_wine !== undefined) return !!cap.can_list_wine
	return Number(rights.value.kadaCoupon) > 0
})

// 增值进度（0-100）；growthRatio 为 null 时返回 null，不按 0% 呈现
const progressPercent = computed(() => {
	const r = eggData.value.growthRatio
	if (r === null || r === undefined) return null
	const p = Math.round(Number(r) * 100)
	return Math.max(0, Math.min(p, 100))
})

// 触发线百分比（后端 conversion_threshold_ratio，默认 1.0）
const thresholdPercent = computed(() => {
	const t = Number(eggData.value.conversionThreshold)
	return Number.isFinite(t) ? Math.round(t * 100) : 100
})

// 咯哒券
const godaCouponData = ref({ balance: 0 })

const godaCouponRecords = ref([])

// 流水台账（最近几条）
const recentLedger = ref([])

/**
 * 加载权益数据：统一走 api/assets.js 适配层（页面不直接调接口）。
 * 过渡态：points/rain/coupons 由适配层临时取旧接口；蛋/券/规则字段取 /rights/me。
 * 任一区块失败只影响自己（值为 null → 显示 --），不影响其它区块。
 */
const loadRightsData = async () => {
	if (!hasToken()) {
		rights.value = { points: null, rain: null, coupons: null, kadaEgg: null, kadaCoupon: null }
		eggData.value.quantity = '--'
		eggData.value.currentUnitValue = '--'
		eggData.value.currentValue = '--'
		eggData.value.growthRatio = null
		disclaimer.value = ''
		return
	}
	try {
		const assets = await getAssets()
		rights.value.points = assets.points
		rights.value.rain = assets.rain
		rights.value.coupons = assets.coupons
		rights.value.kadaEgg = assets.kadaEgg
		rights.value.kadaCoupon = assets.kadaCoupon

		if (assets.eggs) {
			eggData.value.quantity = formatQty(assets.eggs.quantity)
			eggData.value.currentUnitValue = formatQty(assets.eggs.currentUnitValue)
			eggData.value.currentValue = formatQty(assets.eggs.currentValue)
			eggData.value.growthRatio = assets.eggs.growthRatio
			eggData.value.conversionThreshold = assets.eggs.conversionThreshold || 1
		} else {
			eggData.value.quantity = '--'
			eggData.value.currentUnitValue = '--'
			eggData.value.currentValue = '--'
			eggData.value.growthRatio = null
		}
		godaCouponData.value.balance = assets.kadaCoupon === null ? '--' : formatQty(assets.kadaCoupon)
		disclaimer.value = assets.disclaimer || ''
		capabilities.value = assets.capabilities || null
	} catch (error) {
		console.warn('[权益中心] 资产加载失败', error)
	}
}

/** 优惠券兑换咯哒蛋：跳转权益兑换中心 */
const goExchangeCouponToEgg = () => {
	uni.navigateTo({ url: '/subPackages/page2/pages/rights/exchange' })
}

/** 查看全部流水 */
const goLedger = () => {
	uni.navigateTo({ url: '/subPackages/page2/pages/rights/ledger' })
}

onShow(() => {
	loadRightsData()
})
</script>

<style scoped>
.rights-page {
	height: 100vh;
	background: #f5f5f5;
}

/* 权益总览头部 */
.rights-header {
	background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
	padding: 40rpx 30rpx 60rpx;
}

.rights-title {
	display: block;
	font-size: 40rpx;
	font-weight: bold;
	color: #fff;
}

.rights-subtitle {
	display: block;
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-top: 8rpx;
}

/* 权益资产卡片 */
.rights-assets {
	background: #fff;
	margin: -40rpx 30rpx 20rpx;
	border-radius: 16rpx;
	padding: 40rpx 0;
	display: flex;
	box-shadow: 0 8rpx 24rpx rgba(61, 107, 255, 0.15);
}

.rights-asset {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
}

.rights-asset-value {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.rights-asset-label {
	font-size: 22rpx;
	color: #999;
}

/* 详情区块 */
.rights-section {
	background: #fff;
	margin: 0 30rpx 20rpx;
	border-radius: 16rpx;
	padding: 30rpx;
}

.rights-section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 16rpx;
}

.rights-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f5f5f5;
}

.rights-row:last-child {
	border-bottom: none;
}

.rights-row-label {
	font-size: 26rpx;
	color: #666;
}

.rights-row-value {
	font-size: 26rpx;
	color: #333;
	font-weight: 600;
}

/* 优惠券兑换咯哒蛋按钮 */
.egg-action-btn {
	margin-top: 24rpx;
	height: 80rpx;
	background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.egg-action-btn text {
	font-size: 28rpx;
	color: #fff;
	font-weight: 600;
}

/* 区块头部 */
.rights-section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.rights-section-tag {
	font-size: 20rpx;
	color: #999;
	background: #f5f7fa;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.rights-more {
	font-size: 24rpx;
	color: #3d6bff;
}

/* 咯哒蛋主数据 */
.egg-main {
	display: flex;
	padding: 20rpx 0 10rpx;
}

.egg-main-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.egg-main-value {
	font-size: 34rpx;
	font-weight: bold;
	color: #333;
}

.egg-main-label {
	font-size: 22rpx;
	color: #999;
}

/* 增值进度条 */
.egg-progress {
	margin-top: 20rpx;
}

.egg-progress-bar {
	position: relative;
	height: 16rpx;
	background: #f0f2f5;
	border-radius: 8rpx;
	overflow: hidden;
}

.egg-progress-fill {
	position: absolute;
	left: 0;
	top: 0;
	height: 100%;
	background: linear-gradient(90deg, #3d6bff 0%, #66a3ff 100%);
	border-radius: 8rpx;
}

.egg-progress-mark {
	position: absolute;
	top: -4rpx;
	right: 0;
	width: 2rpx;
	height: 24rpx;
	background: #ff4757;
}

.egg-progress-labels {
	display: flex;
	justify-content: space-between;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #999;
}

.egg-progress-pending {
	margin-top: 20rpx;
	font-size: 24rpx;
	color: #999;
}

/* 咯哒券使用记录 */
.goda-record {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f5f5f5;
}

.goda-record:last-child {
	border-bottom: none;
}

.goda-record-left {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.goda-record-title {
	font-size: 26rpx;
	color: #333;
}

.goda-record-time {
	font-size: 22rpx;
	color: #999;
}

.goda-record-delta {
	font-size: 28rpx;
	font-weight: 600;
	color: #3d6bff;
}

/* 流水台账 */
.ledger-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 0;
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
	font-size: 26rpx;
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

.list-empty {
	padding: 40rpx 0;
	text-align: center;
}

.list-empty text {
	font-size: 24rpx;
	color: #999;
}

/* 合规声明 */
.rights-disclaimer {
	margin: 20rpx 30rpx 40rpx;
	padding: 20rpx 24rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
}

.rights-disclaimer text {
	font-size: 22rpx;
	color: #999;
	line-height: 1.6;
}
</style>