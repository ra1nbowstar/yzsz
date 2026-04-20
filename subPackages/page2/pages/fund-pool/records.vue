<template>
  <view class="records-page">

    <view class="filter-bar">
      <text class="filter-label">资金池</text>
      <picker
        mode="selector"
        :range="poolOptions"
        range-key="name"
        :value="poolIndex"
        :disabled="poolOptions.length === 0"
        @change="onPoolChange"
      >
        <view class="filter-value">
          <text class="filter-text">{{ poolDisplayText }}</text>
          <text class="filter-arrow">›</text>
        </view>
      </picker>
    </view>

    <scroll-view 
      scroll-y 
      class="records-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="record-item" v-for="item in records" :key="item.id">
        <view class="record-header">
          <text class="fund-type">{{ getFundName(item.pool_type || item.fund_type || item.type) }}</text>
          <text class="record-amount">-¥{{ formatAmount(item.amount) }}</text>
        </view>
      
        <!-- 仅显示时间 -->
        <view class="record-time">{{ formatTime(item.created_at) }}</view>
      
        <!-- 新增的用户和余额信息（保持不变） -->
        <view class="record-extra" v-if="item.user_name || item.pre_balance !== undefined || item.balance_after !== undefined">
          <view class="extra-row" v-if="item.user_name">
            <text class="extra-label">发放用户：</text>
            <text class="extra-value">{{ item.user_name }}</text>
          </view>
          <view class="extra-row balance-row" v-if="item.pre_balance !== undefined || item.balance_after !== undefined">
            <text class="extra-label">发前余额：<text class="extra-value">{{ formatPreBalance(item.pre_balance) }}</text></text>
            <text class="extra-label">发后余额：<text class="extra-value">{{ formatAmount(item.balance_after) }}</text></text>
          </view>
        </view>
      
        <view class="record-status" :class="item.status">
          <text>{{ getStatusText(item.status) }}</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading" class="loading-more">加载中...</view>
      <view v-if="noMore" class="no-more">没有更多了</view>
      
      <!-- 空状态 -->
      <view v-if="records.length === 0 && !loading" class="empty-state">
        <text class="empty-icon iconfont icon-dingdanxiaoxi"></text>
        <text class="empty-text">暂无转化记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTransformAllowed, getTransformLogs } from '@/api/fund-pool.js'

const records = ref([])
const loading = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)
const poolOptions = ref([])
const poolIndex = ref(0)

const poolDisplayText = computed(() => {
  const opts = poolOptions.value
  if (!opts || opts.length === 0) return '全部资金池'
  const idx = poolIndex.value
  if (opts[idx]) return opts[idx].name
  return opts[0].name
})

const getSelectedPoolType = () => {
  const opts = poolOptions.value || []
  const idx = poolIndex.value
  const p = opts[idx]
  const t = p && (p.type || p.pool_type || p.key)
  return t ? String(t).trim() : ''
}

const formatAmount = (val) => {
  return Number(val || 0).toFixed(2)
}

const formatTime = (time) => {
  if (!time) return ''
  let ts = time
  if (typeof ts === 'string') {
    ts = ts.trim()
    if (/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$/.test(ts)) ts = ts.replace(' ', 'T')
    else if (/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$/.test(ts)) ts = ts.replace(' ', 'T')
  }
  const date = new Date(ts)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
}

const getFundName = (type) => {
  const names = {
    charity: '公益基金',
    community: '社区店补',
    operation: '运营中心补贴',
    branch: '分公司补贴',
    career: '事业基金',
    public: '公益基金',
    store: '社区店补',
    operation_center: '运营中心补贴',
    company: '分公司补贴',
    career_fund: '事业基金',
    public_welfare: '公益基金',
    maintain_pool: '维护池',
    subsidy_pool: '补贴池',
    director_pool: '联创奖励池',
    shop_pool: '店铺池',
    city_pool: '城市池',
    branch_pool: '分支池',
    fund_pool: '资金池',
    merchant_balance: '商户余额'
  }
  const key = type != null ? String(type).trim() : ''
  return names[key] || key
}

const getStatusText = (status) => {
  const texts = {
    success: '成功',
    pending: '处理中',
    failed: '失败'
  }
  return texts[status] || status
}

const loadPoolOptions = async () => {
  try {
    const res = await getTransformAllowed()
    let raw = res.data != null ? res.data : res
    if (raw && typeof raw === 'object' && Array.isArray(raw.pools)) {
      raw = raw.pools
    }
    const list = Array.isArray(raw) ? raw : []
    poolOptions.value = [{ type: '', name: '全部资金池' }, ...list.map((p) => ({
      ...p,
      type: p.type || p.pool_type || p.key,
      name: p.name || String(p.type || p.pool_type || p.key || '资金池')
    }))]
    if (poolIndex.value >= poolOptions.value.length) poolIndex.value = 0
  } catch (e) {
    poolOptions.value = [{ type: '', name: '全部资金池' }]
  }
}

const loadRecords = async (isRefresh = false) => {
  if (loading.value) return
  
  loading.value = true
  if (isRefresh) page.value = 1
  
  try {
    const poolType = getSelectedPoolType()
    const params = { page: page.value, page_size: pageSize }
    // “全部资金池”时不要传 pool_type（传空字符串会被后端当成过滤条件）
    if (poolType) params.pool_type = poolType
    const res = await getTransformLogs(params)
	console.log('接口原始响应:', JSON.stringify(res, null, 2))	
    const data = res && (res.data != null ? res.data : res)
    const list =
      (data && (data.rows || data.list || data.records)) ||
      res?.rows ||
      res?.list ||
      []
    const arr = Array.isArray(list) ? list : []
    console.log('第一条记录:', arr[0])   // 查看实际返回的 pre_balance 和 balance_after 值
    if (isRefresh) {
      records.value = arr
    } else {
      records.value = [...records.value, ...arr]
    }
    const total = Number(data?.total ?? data?.count ?? res?.total ?? res?.count ?? NaN)
    const size = Number(data?.size ?? data?.page_size ?? pageSize)
    if (!isNaN(total) && total >= 0) {
      noMore.value = records.value.length >= total
    } else {
      noMore.value = arr.length < size
    }
    if (!noMore.value && arr.length > 0) page.value++
    
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const loadMore = () => {
  if (noMore.value || loading.value) return
  loadRecords()
}

const onRefresh = () => {
  refreshing.value = true
  loadRecords(true)
}

const onPoolChange = (e) => {
  poolIndex.value = Number(e.detail.value) || 0
  refreshing.value = true
  noMore.value = false
  records.value = []
  loadRecords(true)
}
const formatPreBalance = (val) => {
  if (val === undefined || val === null) return '--';
  return '¥' + Number(val).toFixed(2);
}

onLoad(() => {
  loadPoolOptions().finally(() => {
    loadRecords(true)
  })
})
</script>

<style scoped>
.records-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  padding: 30rpx;
  text-align: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}
.filter-label {
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}
.filter-value {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 18rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  min-width: 320rpx;
  justify-content: flex-end;
}
.filter-text {
  font-size: 26rpx;
  color: #666;
  max-width: 280rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.filter-arrow {
  font-size: 28rpx;
  color: #999;
}

.records-list {
  height: calc(100vh - 190rpx);
  padding: 20rpx;
}

.record-item {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.fund-type {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.record-amount {
  font-size: 32rpx;
  color: #ff6b00;
  font-weight: bold;
}

.record-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.coupon-info {
  font-size: 26rpx;
  color: #4caf50;
}

.record-time {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.record-status {
  display: inline-block;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.record-status.success {
  background: #e8f5e9;
  color: #4caf50;
}

.record-status.pending {
  background: #fff8e1;
  color: #ff8f00;
}

.record-status.failed {
  background: #ffebee;
  color: #f44336;
}

.loading-more, .no-more {
  text-align: center;
  padding: 30rpx;
  color: #999;
  font-size: 26rpx;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 100rpx;
  color: #ddd;
  margin-bottom: 20rpx;
  display: block;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
.record-extra {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #eee;
  font-size: 24rpx;
  color: #666;
}
.extra-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}
.extra-label {
  color: #999;
  margin-right: 8rpx;
}
.extra-value {
  color: #333;
}
.balance-row {
  justify-content: space-between;
}
.balance-row .extra-label {
  color: #666;  /* 余额标签颜色稍深，与用户信息区分 */
}
</style>