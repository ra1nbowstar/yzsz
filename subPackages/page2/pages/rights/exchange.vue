<template>
	<scroll-view class="exchange-page" :scroll-y="true">
		<view class="exchange-header">
			<text class="exchange-title">权益兑换中心</text>
			<text class="exchange-sub">券兑咯哒蛋 · 转化记录</text>
		</view>

		<view class="exchange-tabs">
			<view class="exchange-tab" :class="{ active: activeTab === 'egg' }" @tap="activeTab = 'egg'">券兑咯哒蛋</view>
			<!-- 暂时隐藏券兑农场实物,保留代码 -->
			<view v-if="false" class="exchange-tab" :class="{ active: activeTab === 'farm' }" @tap="activeTab = 'farm'">券兑农场实物</view>
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

		<!-- 券兑农场实物（暂时隐藏,保留代码） -->
		<view v-if="false">
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
					<text class="record-title">{{ r.title }}</text>
					<text class="record-time">{{ r.time }}</text>
					<text class="record-unit" v-if="r.unitValueText">触发咯哒值 {{ r.unitValueText }}</text>
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
import { onShow } from '@dcloudio/uni-app'
import { getRightsOverview, getRightsConversions } from '@/api/rights.js'
import request from '@/utils/request.js'
import { getCommerceAttempt, postCommerceAttempt } from '@/utils/commerce-attempt.js'

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

/** 数量为十进制字符串，展示时截断到 6 位再去尾零 */
const formatQty = (v) => {
	const n = Number(v)
	if (!Number.isFinite(n)) return '0'
	return String(Number(n.toFixed(6)))
}

/** 拉取本人权益（可用券 + 实时咯哒值） */
const loadRights = async () => {
	if (!uni.getStorageSync('token')) return
	try {
		const res = await getRightsOverview()
		const d = (res && res.data) || res || {}
		couponBalance.value = d.coupons?.balance ?? '0'
		const pending = getCommerceAttempt('egg-exchange')
		unitValue.value = pending ? pending.body.expected_unit_value : (d.eggs?.current_unit_value ?? '0')
		if (pending) couponInput.value = pending.body.coupon_quantity
	} catch (e) {
		console.warn('[兑换中心] 权益数据加载失败', e)
	}
}

const fmtTime = (v) => {
	if (!v) return ''
	const s = String(v).replace('T', ' ')
	return s.length >= 16 ? s.slice(0, 16) : s
}

/** 转化记录（items 字段名待后端确认，先用常见别名兜底） */
const loadConversions = async () => {
	if (!uni.getStorageSync('token')) { conversionRecords.value = []; return }
	try {
		const res = await getRightsConversions({ page: 1, page_size: 20 })
		const d = (res && res.data) || res || {}
		const items = d.items || d.rows || d.list || []
		conversionRecords.value = items.map((raw) => {
			const uv = raw.unit_value
			return {
				// TODO: items 字段名待后端确认（当前列表为空，未暴露真实字段）
				title: raw.title || raw.summary || raw.event_name || '咯哒蛋自动转咯哒券',
				time: fmtTime(raw.triggered_at || raw.created_at || raw.time),
				eggQuantity: formatQty(raw.quantity_converted ?? raw.egg_quantity ?? raw.quantity),
				godaCoupons: formatQty(raw.goda_coupons_issued ?? raw.goda_coupon_quantity ?? raw.coupons),
				unitValueText: (uv === null || uv === undefined) ? '--' : formatQty(uv)
			}
		})
	} catch (e) {
		console.warn('[兑换中心] 转化记录加载失败', e)
		conversionRecords.value = []
	}
}

onShow(() => {
	const pending = getCommerceAttempt('egg-exchange')
	if (pending) {
		couponInput.value = pending.body.coupon_quantity
		unitValue.value = pending.body.expected_unit_value
	}
	loadRights()
	loadConversions()
})


/** 券兑咯哒蛋：POST /api/v1/rights/egg-exchanges（Idempotency-Key + expected_unit_value） */
const doExchangeEgg = async () => {
	const pending = getCommerceAttempt('egg-exchange')
	const n = pending ? pending.body.coupon_quantity : String(couponInput.value).trim()
	if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/.test(n) || Number(n) <= 0) {
		uni.showToast({ title: '请输入有效的券数量', icon: 'none' })
		return
	}
	// 除零保护：实时咯哒值为 0/不可用时不做除法、不提交
	const v = pending ? pending.body.expected_unit_value : String(unitValue.value)
	if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/.test(v) || Number(v) <= 0) {
		uni.showToast({ title: '暂不可计算', icon: 'none' })
		return
	}
	uni.showLoading({ title: '兑换中...', mask: true })
	try {
		const body = pending ? pending.body : { coupon_quantity: n, expected_unit_value: v }
		await postCommerceAttempt(request, 'egg-exchange', '/api/v1/rights/egg-exchanges', body, pending?.key)
		uni.hideLoading()
		uni.showToast({ title: '兑换成功', icon: 'success' })
		couponInput.value = ''
		await loadRights()
	} catch (e) {
		uni.hideLoading()
		if (e?.statusCode === 409 && e?.code === 'QUOTE_STALE') {
			// Only an authoritative pre-write stale quote releases the retained attempt.
			await loadRights()
			uni.showToast({ title: '咯哒值已变化，请确认新的兑换结果', icon: 'none', duration: 3000 })
		}
		// 网络结果未知时，持久尝试身份会在重试时复用。
	}
}

const doExchangeFarm = () => {
	uni.showToast({ title: '农场兑换接口暂未开放', icon: 'none' })
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

.record-unit {
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