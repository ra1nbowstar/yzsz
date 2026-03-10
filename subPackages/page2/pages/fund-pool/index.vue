<template>
  <view class="fund-pool-page">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">我的资金</text>
      <text class="subtitle">资金可转化为优惠券使用</text>
    </view>

    <!-- 资金池转优惠券操作（资金池为选择，非手填） -->
    <view class="transform-section">
      <text class="section-title">资金池转优惠券</text>
      <view class="form-row">
        <text class="form-label">选择资金池</text>
        <picker
          mode="selector"
          :range="poolOptionsForPicker"
          range-key="name"
          :value="transformPoolIndex"
          :disabled="poolOptionsForPicker.length === 0"
          @change="onTransformPoolChange"
        >
          <view class="picker-value picker-with-arrow">
            <text class="picker-text">{{ poolDisplayText }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
        <text v-if="!loading && fundList.length === 0" class="picker-hint">暂无资金池数据，请检查接口或稍后重试</text>
      </view>
      <view class="form-row">
        <text class="form-label">接收用户ID</text>
        <input
          class="form-input"
          type="number"
          v-model="transformUserId"
          placeholder="必填，接收优惠券的用户ID"
        />
      </view>
      <view class="form-row">
        <text class="form-label">转化金额</text>
        <input
          class="form-input"
          type="digit"
          v-model="transformFormAmount"
          placeholder="必填，转正金额"
        />
      </view>
      <view class="form-row">
        <text class="form-label">优惠券类型</text>
        <picker
          mode="selector"
          :range="couponTypeOptions"
          range-key="label"
          :value="couponTypeIndex"
          @change="onCouponTypeChange"
        >
          <view class="picker-value">{{ couponTypeOptions[couponTypeIndex].label }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">适用商品</text>
        <picker
          mode="selector"
          :range="applicableTypeOptions"
          range-key="label"
          :value="applicableTypeIndex"
          @change="onApplicableTypeChange"
        >
          <view class="picker-value">{{ applicableTypeOptions[applicableTypeIndex].label }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">备注</text>
        <input
          class="form-input"
          type="text"
          v-model="transformRemark"
          placeholder="选填"
        />
      </view>
      <button
        class="submit-transform-btn"
        :disabled="!canSubmitTransform || submittingTransform"
        @tap="submitTransform"
      >
        {{ submittingTransform ? '提交中...' : '提交转正' }}
      </button>
    </view>

    <!-- 资金列表 -->
    <view class="fund-list">
      <view 
        v-for="item in fundList" 
        :key="item.type"
        class="fund-card"
      >
        <view class="fund-header">
          <text class="fund-name">{{ item.name }}</text>
          <text class="fund-amount">¥{{ formatAmount(item.balance) }}</text>
        </view>
        
        <view class="fund-info">
          <text class="fund-desc">{{ item.description }}</text>
        </view>

        <button 
          class="transform-btn"
          :disabled="item.balance <= 0 || transforming === item.type"
          @tap="openTransformModal(item)"
        >
          {{ transforming === item.type ? '处理中...' : '转为优惠券' }}
        </button>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="fundList.length === 0 && !loading" class="empty-state">
      <text class="empty-icon iconfont icon-qianbao"></text>
      <text class="empty-text">暂无可用资金</text>
    </view>

    <!-- 转化弹窗 -->
    <view v-if="showModal" class="modal-mask" @tap="closeModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">转化为优惠券</text>
          <text class="modal-close" @tap="closeModal">×</text>
        </view>

        <view class="modal-body">
          <view class="selected-fund">
            <text class="label">{{ selectedFund.name }}</text>
            <text class="value">可用余额：¥{{ formatAmount(selectedFund.balance) }}</text>
          </view>

          <view class="input-section">
            <text class="input-label">转化金额</text>
            <view class="amount-input-wrap">
              <text class="currency">¥</text>
              <input 
                class="amount-input"
                type="digit"
                v-model="transformAmount"
                placeholder="请输入金额"
                :max="selectedFund.balance"
              />
            </view>
            <text class="input-hint">最大可转：¥{{ formatAmount(selectedFund.balance) }}</text>
          </view>

          <view class="coupon-preview" v-if="transformAmount > 0">
            <text class="preview-title">预计生成</text>
            <view class="coupon-info">
              <text class="coupon-value">¥{{ formatAmount(transformAmount) }}</text>
              <text class="coupon-desc">全场通用优惠券</text>
            </view>
          </view>
        </view>

        <button 
          class="confirm-btn"
          :disabled="!canTransform || transforming"
          @tap="confirmTransform"
        >
          {{ transforming ? '处理中...' : '确认转化' }}
        </button>
      </view>
    </view>

    <!-- 转化记录入口 -->
    <view class="records-entry" @tap="goToRecords">
      <text class="records-text">查看转化记录</text>
      <text class="records-arrow">›</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTransformAllowed, transformToCoupon } from '@/api/fund-pool.js'

const fundList = ref([])
const loading = ref(false)
const transforming = ref('')
const showModal = ref(false)
const selectedFund = ref({})
const transformAmount = ref('')

// 资金池转优惠券表单（资金池为选择器）
const transformPoolIndex = ref(0)
const transformUserId = ref('')
const transformFormAmount = ref('')
const transformRemark = ref('')
const submittingTransform = ref(false)
const couponTypeOptions = ref([
  { value: 'user', label: '用户券' },
  { value: 'merchant', label: '商户券' }
])
const applicableTypeOptions = ref([
  { value: 'all', label: '全部商品' },
  { value: 'normal_only', label: '仅普通商品' },
  { value: 'member_only', label: '仅会员商品' }
])
const couponTypeIndex = ref(0)
const applicableTypeIndex = ref(0)

// 格式化金额
const formatAmount = (val) => {
  return Number(val || 0).toFixed(2)
}

// 是否可以转化（弹窗内）
const canTransform = computed(() => {
  const amount = Number(transformAmount.value)
  return amount > 0 && amount <= (selectedFund.value.balance || 0)
})

// 选择器用的资金池列表：有接口数据用接口数据，否则用默认列表（保证“选择”始终可用）
const defaultPoolOptions = [
  { type: 'public_welfare', name: '公益基金' },
  { type: 'maintain_pool', name: '维护池' },
  { type: 'subsidy_pool', name: '补贴池' },
  { type: 'director_pool', name: '联创奖励池' },
  { type: 'shop_pool', name: '店铺池' },
  { type: 'city_pool', name: '城市池' },
  { type: 'branch_pool', name: '分支池' }
]
const poolOptionsForPicker = computed(() => {
  const list = fundList.value
  if (list && list.length > 0) return list
  return defaultPoolOptions
})
const poolDisplayText = computed(() => {
  const opts = poolOptionsForPicker.value
  const idx = transformPoolIndex.value
  if (opts.length === 0) return '请选择资金池'
  if (opts[idx]) return opts[idx].name
  return opts[0].name
})

// 表单提交：资金池、用户ID、金额必填
const canSubmitTransform = computed(() => {
  const opts = poolOptionsForPicker.value
  const pool = opts[transformPoolIndex.value]
  const uid = String(transformUserId.value || '').trim()
  const amount = Number(transformFormAmount.value)
  return pool && uid && amount > 0
})

const onTransformPoolChange = (e) => {
  transformPoolIndex.value = Number(e.detail.value) || 0
}
const onCouponTypeChange = (e) => {
  couponTypeIndex.value = Number(e.detail.value) || 0
}
const onApplicableTypeChange = (e) => {
  applicableTypeIndex.value = Number(e.detail.value) || 0
}

// 提交资金池转优惠券（调用接口）
const submitTransform = async () => {
  if (!canSubmitTransform.value || submittingTransform.value) return
  const opts = poolOptionsForPicker.value
  const pool = opts[transformPoolIndex.value]
  const poolType = pool.type || pool.pool_type || pool.key
  if (!poolType) {
    uni.showToast({ title: '请选择资金池', icon: 'none' })
    return
  }
  submittingTransform.value = true
  const payload = {
    pool_type: poolType,
    user_id: Number(transformUserId.value),
    amount: Number(transformFormAmount.value),
    coupon_type: couponTypeOptions.value[couponTypeIndex.value].value,
    applicable_product_type: applicableTypeOptions.value[applicableTypeIndex.value].value,
    remark: transformRemark.value ? String(transformRemark.value).trim() : undefined
  }
  console.log('[我的资金] transformToCoupon 请求参数:', JSON.stringify(payload, null, 2))
  try {
    const res = await transformToCoupon(payload)
    console.log('[我的资金] transformToCoupon 接口完整响应:', JSON.stringify(res, null, 2))
    console.log('[我的资金] transformToCoupon res.data:', res?.data)
    console.log('[我的资金] transformToCoupon res.success:', res?.success)
    console.log('[我的资金] transformToCoupon res.message:', res?.message)
    uni.showToast({ title: '转正成功', icon: 'success' })
    transformFormAmount.value = ''
    transformRemark.value = ''
    loadFundList()
  } catch (err) {
    console.error('[我的资金] transformToCoupon 请求失败:', err)
    console.error('[我的资金] 错误详情:', err?.message, err?.data, err?.detail, err)
    uni.showToast({ title: err.message || err.msg || '转正失败', icon: 'none' })
  } finally {
    submittingTransform.value = false
  }
}

// 加载资金列表（同时用于下方「选择资金池」选择器）
const loadFundList = async () => {
  loading.value = true
  try {
    const res = await getTransformAllowed()
    // 打印后端接口返回的完整数据
    console.log('[我的资金] getTransformAllowed 接口完整响应:', JSON.stringify(res, null, 2))
    console.log('[我的资金] res.data:', res?.data)
    console.log('[我的资金] res.success:', res?.success)
    console.log('[我的资金] res.message:', res?.message)
    let raw = res.data != null ? res.data : res
    if (!Array.isArray(raw)) {
      raw = typeof raw === 'object' ? Object.keys(raw).map(key => ({ type: key, ...(raw[key] || {}) })) : []
    }
    console.log('[我的资金] 解析后的资金池列表 raw:', JSON.stringify(raw, null, 2))
    fundList.value = raw.map(item => {
      const type = item.type || item.pool_type || item.key
      return {
        ...item,
        type,
        pool_type: type,
        name: getFundName(type),
        description: getFundDesc(type)
      }
    })
    if (!transformUserId.value) {
      const userInfo = uni.getStorageSync('userInfo') || {}
      const uid = userInfo.id ?? userInfo.user_id
      if (uid) transformUserId.value = String(uid)
    }
    if (fundList.value.length > 0 && transformPoolIndex.value >= fundList.value.length) {
      transformPoolIndex.value = 0
    }
    console.log('[我的资金] 最终 fundList:', JSON.stringify(fundList.value, null, 2))
    console.log('[我的资金] fundList.length:', fundList.value.length)
  } catch (err) {
    console.error('[我的资金] getTransformAllowed 请求失败:', err)
    console.error('[我的资金] 错误详情:', err?.message, err?.data, err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 获取资金名称
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
    merchant_balance: '商户余额',
    fund_pool: '资金池'
  }
  return names[type] || (type ? String(type) : '未知')
}

// 获取资金描述
const getFundDesc = (type) => {
  const descs = {
    charity: '来源于公益捐赠，可转化为优惠券',
    community: '社区店铺补贴，可转化为优惠券',
    operation: '运营中心业绩补贴，可转化为优惠券',
    branch: '分公司业绩补贴，可转化为优惠券',
    career: '事业发展基金，可转化为优惠券'
  }
  return descs[type] || '可转化为优惠券使用'
}

// 打开转化弹窗
const openTransformModal = (fund) => {
  selectedFund.value = fund
  transformAmount.value = ''
  showModal.value = true
}

// 关闭弹窗
const closeModal = () => {
  showModal.value = false
  selectedFund.value = {}
  transformAmount.value = ''
}

// 确认转化
const confirmTransform = async () => {
  if (!canTransform.value || transforming.value) return
  
  transforming.value = selectedFund.value.type
  
  try {
    const userInfo = uni.getStorageSync('userInfo') || {}
    const userId = userInfo.id ?? userInfo.user_id
    if (!userId) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      transforming.value = ''
      return
    }
    await transformToCoupon({
      pool_type: selectedFund.value.type || selectedFund.value.pool_type,
      user_id: Number(userId),
      amount: Number(transformAmount.value),
      coupon_type: 'user',
      applicable_product_type: 'all'
    })
    
    uni.showToast({ 
      title: `成功转化¥${formatAmount(transformAmount.value)}`, 
      icon: 'success',
      duration: 2000
    })
    
    closeModal()
    // 刷新列表
    loadFundList()
    
  } catch (err) {
    uni.showToast({ 
      title: err.message || '转化失败', 
      icon: 'none' 
    })
  } finally {
    transforming.value = ''
  }
}

// 跳转记录页面
const goToRecords = () => {
  uni.navigateTo({
    url: '/subPackages/page2/pages/fund-pool/records'
  })
}

onLoad(() => {
  loadFundList()
})
</script>

<style scoped>
.fund-pool-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.subtitle {
  font-size: 26rpx;
  color: #999;
  margin-top: 10rpx;
  display: block;
}

/* 资金池转优惠券表单 */
.transform-section {
  background: white;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 28rpx;
}

.form-row {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
  background: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx solid #e8e8e8;
}

.picker-value {
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
  background: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx solid #e8e8e8;
}

.picker-with-arrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-text {
  flex: 1;
  color: #333;
}

.picker-value .picker-arrow {
  margin-left: 16rpx;
  font-size: 36rpx;
  color: #999;
  font-weight: 300;
}

.picker-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #ff6b00;
}

.submit-transform-btn {
  margin-top: 32rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;
  background: linear-gradient(135deg, #07c160, #05a350);
  color: white;
  border: none;
}

.submit-transform-btn[disabled] {
  opacity: 0.5;
  background: #ccc;
}

.fund-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.fund-card {
  background: white;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.fund-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.fund-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.fund-amount {
  font-size: 40rpx;
  font-weight: bold;
  color: #ff6b00;
}

.fund-info {
  margin-bottom: 24rpx;
}

.fund-desc {
  font-size: 26rpx;
  color: #999;
}

.transform-btn {
  background: linear-gradient(135deg, #ff9000, #ff5000);
  color: white;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  border: none;
}

.transform-btn[disabled] {
  opacity: 0.5;
  background: #ccc;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  border-radius: 24rpx;
  width: 80%;
  max-width: 600rpx;
  padding: 40rpx;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.modal-close {
  font-size: 48rpx;
  color: #999;
  padding: 10rpx;
}

.selected-fund {
  background: #fff8e1;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
}

.selected-fund .label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.selected-fund .value {
  font-size: 32rpx;
  color: #ff6b00;
  font-weight: bold;
}

.input-section {
  margin-bottom: 30rpx;
}

.input-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  border-bottom: 2rpx solid #e0e0e0;
  padding-bottom: 16rpx;
  margin-bottom: 12rpx;
}

.currency {
  font-size: 48rpx;
  color: #333;
  margin-right: 16rpx;
}

.amount-input {
  flex: 1;
  font-size: 48rpx;
  color: #333;
  height: 80rpx;
}

.input-hint {
  font-size: 24rpx;
  color: #999;
}

.coupon-preview {
  background: #e8f5e9;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
}

.preview-title {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}

.coupon-info {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}

.coupon-value {
  font-size: 48rpx;
  color: #4caf50;
  font-weight: bold;
}

.coupon-desc {
  font-size: 26rpx;
  color: #666;
}

.confirm-btn {
  background: linear-gradient(135deg, #07c160, #05a350);
  color: white;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  border: none;
}

.confirm-btn[disabled] {
  opacity: 0.5;
  background: #ccc;
}

/* 记录入口 */
.records-entry {
  margin-top: 40rpx;
  background: white;
  padding: 30rpx;
  border-radius: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.records-text {
  font-size: 30rpx;
  color: #333;
}

.records-arrow {
  font-size: 36rpx;
  color: #999;
}

/* 空状态 */
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
</style>