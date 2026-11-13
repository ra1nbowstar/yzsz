<template>
	<scroll-view class="ledger-page" :scroll-y="true" @scrolltolower="loadMore">
		<!-- 类型筛选 -->
		<scroll-view class="ledger-tabs" :scroll-x="true">
			<view
				v-for="tab in tabs"
				:key="tab.value"
				class="ledger-tab"
				:class="{ active: activeTab === tab.value }"
				@tap="onTabChange(tab.value)"
			>
				<text>{{ tab.label }}</text>
			</view>
		</scroll-view>

		<view class="ledger-list">
			<view class="ledger-item" v-for="(item, i) in ledgerList" :key="item.entryId || i">
				<view class="ledger-item-left">
					<text class="ledger-item-type">{{ item.title }}</text>
					<text class="ledger-item-time">{{ item.timeText }}</text>
				</view>
				<view class="ledger-item-right">
					<text class="ledger-item-delta" :class="item.delta > 0 ? 'up' : (item.delta < 0 ? 'down' : '')">
						{{ item.deltaText }} {{ item.unit }}
					</text>
					<text class="ledger-item-balance">计量值 {{ item.balanceAfter }}</text>
				</view>
			</view>
			<view class="ledger-empty" v-if="!loading && ledgerList.length === 0">
				<text>{{ loadError || '暂无流水' }}</text>
			</view>
			<view class="ledger-loading" v-if="loading">
				<text>加载中...</text>
			</view>
		</view>
	</scroll-view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getRightsLedger } from '@/api/rights.js'
import { formatQty, hasToken } from '@/api/assets.js'

// 筛选类型（对应 /rights/ledger 的 asset_type）
const tabs = [
	{ label: '全部', value: 'all' },
	{ label: '积分', value: 'point' },
	{ label: '雨点', value: 'rain' },
	{ label: '优惠券', value: 'coupon' },
	{ label: '咯哒蛋', value: 'egg' },
	{ label: '咯哒券', value: 'goda_coupon' }
]

const activeTab = ref('all')
const ledgerList = ref([])
const page = ref(1)
const pageSize = 200
const total = ref(0)
const hasMore = ref(true)
const loading = ref(false)
const loadError = ref('')

// event_type → 中文。未命中兜底用 event_name，并在开发环境提示新编码
const EVENT_TYPE_LABELS = {
	rain_daily_settlement: '积分生成雨点',
	rain_to_coupon: '雨点转优惠券',
	coupon_issued: '发放优惠券',
	coupon_expired_to_pool: '优惠券到期入池',
	points_expiry_backfill: '过期回补积分',
	coupon_to_egg: '券兑咯哒蛋',
	egg_issued: '发放咯哒蛋',
	egg_auto_conversion: '咯哒蛋自动转券',
	goda_coupon_issued: '自动转券',
	wine_redemption: '兑换白酒',
	wine_ownership_transfer: '酒坛权属转移',
	reversal: '冲正'
}

const eventLabel = (item) => {
	if (EVENT_TYPE_LABELS[item.event_type]) return EVENT_TYPE_LABELS[item.event_type]
	if (process.env.NODE_ENV !== 'production') {
		console.warn('[流水台账] 未映射的 event_type:', item.event_type)
	}
	return item.event_name || '权益变动'
}

const formatTime = (v) => {
	if (!v) return ''
	const s = String(v).replace('T', ' ')
	return s.length >= 16 ? s.slice(0, 16) : s
}

const toItem = (raw) => {
	const delta = Number(raw.quantity_delta || 0)
	// 酒坛权属转移没有数量变动，显示「权属变更」而不是 +0
	const isOwnershipTransfer = raw.event_type === 'wine_ownership_transfer'
	return {
		entryId: raw.entry_id || raw.id || '',
		assetType: raw.asset_type || '',
		title: eventLabel(raw),
		delta,
		deltaText: isOwnershipTransfer ? '权属变更' : ((delta > 0 ? '+' : '') + formatQty(delta)),
		balanceAfter: formatQty(raw.balance_after),
		unit: isOwnershipTransfer ? '' : (raw.unit || ''),
		timeText: formatTime(raw.occurred_at)
	}
}

const loadLedger = async (reset = false) => {
	if (!hasToken()) {
		ledgerList.value = []
		loadError.value = ''
		return
	}
	if (loading.value) return
	if (!reset && !hasMore.value) return
	loading.value = true
	if (reset) {
		page.value = 1
		ledgerList.value = []
		hasMore.value = true
		loadError.value = ''
	}
	try {
		const res = await getRightsLedger({
			asset_type: activeTab.value,
			page: page.value,
			page_size: pageSize
		})
		const data = (res && res.data) || res || {}
		const items = data.items || data.rows || data.list || []
		const mapped = items.map(toItem)
		ledgerList.value = reset ? mapped : [...ledgerList.value, ...mapped]
		total.value = Number(data.total || 0)
		hasMore.value = data.has_more !== undefined
			? !!data.has_more
			: (ledgerList.value.length < total.value)
		if (hasMore.value) page.value++
	} catch (e) {
		console.warn('[流水台账] 加载失败', e)
		loadError.value = (e && e.code === 403) ? '暂无权限查看该流水' : '流水加载失败，请稍后重试'
	} finally {
		loading.value = false
	}
}

// 切换 tab：服务端筛选，重新请求第一页
const onTabChange = (v) => {
	if (activeTab.value === v) return
	activeTab.value = v
	loadLedger(true)
}

const loadMore = () => {
	if (hasMore.value && !loading.value) loadLedger(false)
}

onShow(() => {
	if (ledgerList.value.length === 0) loadLedger(true)
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

.ledger-loading {
	padding: 30rpx 0;
	text-align: center;
}

.ledger-loading text {
	font-size: 24rpx;
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