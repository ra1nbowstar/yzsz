<template>
  <view class="fund-pool-page">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">我的资金</text>
      <text class="subtitle">资金可转化为优惠券使用</text>
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

// 格式化金额
const formatAmount = (val) => {
  return Number(val || 0).toFixed(2)
}

// 是否可以转化
const canTransform = computed(() => {
  const amount = Number(transformAmount.value)
  return amount > 0 && amount <= (selectedFund.value.balance || 0)
})

// 加载资金列表
const loadFundList = async () => {
  loading.value = true
  try {
    const res = await getTransformAllowed()
    // 映射资金类型名称
    fundList.value = (res.data || res || []).map(item => ({
      ...item,
      name: getFundName(item.type),
      description: getFundDesc(item.type)
    }))
  } catch (err) {
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
    career_fund: '事业基金'
  }
  return names[type] || type
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
    const res = await transformToCoupon({
      fund_type: selectedFund.value.type,
      amount: Number(transformAmount.value)
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