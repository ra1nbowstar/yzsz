<template>
  <view class="dividend-preview-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">分红预览管理</text>
      <text class="page-subtitle">查看和调整联创分红与积分分红配置</text>
    </view>

    <!-- 积分分红预览 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">积分分红预览</text>
        <button class="btn-refresh" @tap="loadPointsValue">刷新</button>
      </view>
      
      <view class="preview-card">
        <view class="data-block">
          <view class="data-item">
            <text class="data-label">补贴池余额</text>
            <text class="data-value">¥{{ formatCurrency(pointsData.subsidy_pool_balance) }}</text>
            <button class="btn-flow" @tap="goToFlow('subsidy_pool')">流水</button>
          </view>
          <view class="data-item">
            <text class="data-label">总会员积分</text>
            <text class="data-value">{{ formatPoints(pointsData.total_system_points) }}</text>
            <button class="btn-flow" @tap="goToMemberPointsFlow">流水</button>
          </view>
        </view>
        
        <view class="ref-row">
          <text class="ref-text">当前 {{ (pointsData.current_value * 100).toFixed(4) }}%</text>
          <text class="ref-text">上限 {{ (pointsData.max_allowed_value * 100).toFixed(2) }}%</text>
          <text class="ref-text">自动 {{ (pointsData.auto_calculated_value * 100).toFixed(4) }}%</text>
          <text class="ref-text" v-if="pointsData.is_manual_adjusted">手动 {{ (pointsData.manual_value * 100).toFixed(4) }}%</text>
        </view>
        
        <view class="action-block">
          <view class="action-row">
            <text class="action-label">积分值</text>
            <view class="input-wrapper">
              <input 
                v-model="pointsValueInput" 
                type="number"
                class="value-input"
                placeholder="0.00"
                :maxlength="6"
              />
              <text class="input-unit">%</text>
            </view>
            <button class="btn-save" @tap="savePointsValue">保存</button>
          </view>
          <view class="action-row switch-row">
            <text class="action-label">自动清除</text>
            <switch 
              :checked="pointsAutoClear" 
              @change="onAutoClearChange"
              color="#3d6bff"
            />
            <text class="switch-label">{{ pointsAutoClear ? '是' : '否' }}</text>
          </view>
        </view>
        
        <view class="info-tip">
          <text class="tip-text">积分值=补贴池余额÷系统总积分，每周最高不超过2%</text>
        </view>
      </view>
    </view>

    <!-- 联创分红预览 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">联创分红预览</text>
        <button class="btn-refresh" @tap="loadUnilevelPreview">刷新</button>
      </view>
      
      <view class="preview-card">
        <view class="info-row">
          <text class="info-label">分红池余额：</text>
          <text class="info-value">¥{{ formatCurrency(unilevelData.pool_balance) }}</text>
          <button class="btn-flow" @tap="goToFlow('honor_director')">流水</button>
        </view>
        
        <view class="info-row">
          <text class="info-label">总权重：</text>
          <text class="info-value">{{ unilevelData.total_weight || 0 }}</text>
        </view>
        
        <view class="info-row">
          <text class="info-label">用户数量：</text>
          <text class="info-value">{{ unilevelData.user_count || 0 }}</text>
        </view>
        
        <view class="info-row editable">
          <text class="info-label">每权重金额：</text>
          <view class="input-wrapper">
            <input 
              :value="formatAmountPerWeight(unilevelAmountPerWeight)" 
              type="digit"
              class="value-input"
              placeholder="0.0000"
              @input="onAmountPerWeightInput"
            />
            <text class="input-unit">元</text>
          </view>
          <button class="btn-save-small" @tap="saveUnilevelAmount">保存</button>
        </view>
        
        <view class="info-row" v-if="unilevelData.adjustment_configured">
          <text class="info-label">调整金额：</text>
          <text class="info-value">¥{{ formatCurrency(unilevelData.adjusted_amount) }}</text>
        </view>
        
        <view class="info-row" v-if="unilevelData.will_use_adjusted">
          <text class="info-label">将使用调整金额</text>
        </view>
        
        <view class="info-row">
          <text class="info-label">预计发放后余额：</text>
          <text class="info-value">¥{{ formatCurrency(unilevelData.estimated_balance_after) }}</text>
        </view>
        
        <view class="info-row">
          <text class="info-label">总需发放：</text>
          <text class="info-value">¥{{ formatCurrency(unilevelData.total_required) }}</text>
        </view>
      </view>
      
      <!-- 用户分红列表 -->
      <view class="users-section" v-if="unilevelData.users && unilevelData.users.length > 0">
        <view class="users-header">
          <text class="users-title">用户分红详情</text>
          <text class="users-count">共 {{ unilevelData.user_count }} 人</text>
        </view>
        <view class="users-list">
          <view class="user-item" v-for="(user, index) in unilevelData.users" :key="user.user_id || index">
            <view class="user-header">
              <text class="user-name">{{ user.user_name || '未知用户' }}</text>
              <text class="user-id">ID: {{ user.user_id }}</text>
            </view>
            <view class="user-details">
              <view class="user-detail-row">
                <text class="detail-label">联创等级：</text>
                <text class="detail-value">{{ user.unilevel_level || 0 }}</text>
              </view>
              <view class="user-detail-row">
                <text class="detail-label">会员等级：</text>
                <text class="detail-value">{{ user.member_level || 0 }}</text>
              </view>
              <view class="user-detail-row">
                <text class="detail-label">权重：</text>
                <text class="detail-value highlight">{{ user.weight || 0 }}</text>
              </view>
              <view class="user-detail-row">
                <text class="detail-label">预计分红：</text>
                <text class="detail-value highlight">¥{{ formatCurrency(user.estimated_dividend) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUnilevelDividendPreview, adjustUnilevelDividend } from '../../api/unilevel.js'
import { getPointsValue, adjustPointsValue } from '../../api/subsidy.js'

// 联创分红数据
const unilevelData = ref({
  pool_balance: 0,
  total_weight: 0,
  amount_per_weight_auto: 0,
  user_count: 0,
  adjustment_configured: false,
  adjusted_amount: null,
  will_use_adjusted: false,
  estimated_balance_after: 0,
  total_required: 0,
  users: []
})

// 积分分红数据
const pointsData = ref({
  current_value: 0,
  is_manual_adjusted: false,
  manual_value: null,
  auto_clear: false,
  auto_calculated_value: 0,
  subsidy_pool_balance: 0,
  total_member_points: 0,
  total_system_points: 0,
  max_allowed_value: 0.02,
  remark: ''
})

// 编辑值
const unilevelAmountPerWeight = ref(0)
const pointsValueInput = ref(0)
const pointsAutoClear = ref(true)

/**
 * 格式化货币
 */
const formatCurrency = (value) => {
  return Number(value || 0).toFixed(4)
}

/**
 * 本地时区偏移，格式 +HH:mm 或 -HH:mm
 */
const getLocalTZOffset = () => {
  const offsetMin = -new Date().getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const absMin = Math.abs(offsetMin)
  const hh = String(Math.floor(absMin / 60)).padStart(2, '0')
  const mm = String(absMin % 60).padStart(2, '0')
  return `${sign}${hh}:${mm}`
}

let _dateFormatWarningShown = false

const normalizeToISO = (time) => {
  if (!time) return time
  if (time instanceof Date) return time.toISOString()
  if (typeof time === 'number') return new Date(time).toISOString()
  let s = String(time).trim()

  if (/T/.test(s) && /[Zz]|[+\-]\d{2}:?\d{2}$/.test(s)) {
    if (/T\d{2}:\d{2}$/.test(s)) s = s.replace(/T(\d{2}:\d{2})$/, 'T$1:00')
    s = s.replace(/([+\-]\d{2})(\d{2})$/, '$1:$2')
    return s
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s) || /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
    try {
      const suppressed = uni.getStorageSync && uni.getStorageSync('suppressDateFormatWarning')
      if (!suppressed && !_dateFormatWarningShown) {
        _dateFormatWarningShown = true
        uni.showModal({
          title: '时间格式兼容提示',
          content: '检测到后端返回的时间字符串格式可能在部分 iOS 环境下无法解析（例如 "yyyy-MM-dd HH:mm:ss"）。客户端已自动转换为兼容的 ISO 时间字符串（例如 yyyy-MM-ddTHH:mm:ss+08:00）。如果不想再看到此提示，请点击“不再提醒”，变更将在下次编译后生效。',
          showCancel: true,
          cancelText: '不再提醒',
          confirmText: '知道了',
          success: (res) => {
            if (!res.confirm) {
              try {
                uni.setStorageSync && uni.setStorageSync('suppressDateFormatWarning', '1')
                uni.showToast && uni.showToast({ title: '已设置，不再提醒（下次编译后生效）', icon: 'none' })
              } catch (e) {
                console.warn('[时间提示] 无法写入本地存储', e)
              }
            }
          }
        })
      }
    } catch (e) {
      console.warn('[时间提示] 检查不再提醒失败', e)
    }

    s = s.replace(' ', 'T')
    s = s.replace(/\//g, '-')
    if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(s)) {
      s = s + getLocalTZOffset()
    } else {
      s = s.replace(/([+\-]\d{2})(\d{2})$/, '$1:$2')
    }
    return s
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    s = s + 'T00:00:00' + getLocalTZOffset()
    return s
  }

  return s
}

/**
 * 格式化时间为 yyyy-MM-ddTHH:mm:ss+HH:mm（保证在 iOS 上解析可靠）
 */
const formatTime = (time) => {
  if (!time) return ''
  const normalized = normalizeToISO(time)
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return String(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const tz = getLocalTZOffset()
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${tz}`
}

/**
 * 格式化积分
 */
const formatPoints = (value) => {
  return Number(value || 0).toFixed(4)
}

/**
 * 加载联创分红预览
 */
const loadUnilevelPreview = async () => {
  try {
    uni.showLoading({ title: '加载中...' })
    const res = await getUnilevelDividendPreview()
    console.log('[分红预览] 联创分红响应:', res)
    
    if (res.success && res.data) {
      unilevelData.value = {
        pool_balance: res.data.pool_balance || 0,
        total_weight: res.data.total_weight || 0,
        amount_per_weight_auto: res.data.amount_per_weight_auto || 0,
        user_count: res.data.user_count || 0,
        adjustment_configured: res.data.adjustment_configured || false,
        adjusted_amount: res.data.adjusted_amount || null,
        will_use_adjusted: res.data.will_use_adjusted || false,
        estimated_balance_after: res.data.estimated_balance_after !== undefined ? res.data.estimated_balance_after : 0,
        total_required: res.data.total_required || 0,
        users: res.data.users || []
      }
      // 设置编辑值（如果有调整金额且将使用调整金额，则显示调整金额，否则显示自动计算值）
      // 格式化为4位小数显示
      if (unilevelData.value.will_use_adjusted && unilevelData.value.adjusted_amount !== null) {
        unilevelAmountPerWeight.value = parseFloat((unilevelData.value.adjusted_amount || 0).toFixed(4))
      } else {
        unilevelAmountPerWeight.value = parseFloat((unilevelData.value.amount_per_weight_auto || 0).toFixed(4))
      }
    }
  } catch (error) {
    console.error('[分红预览] 加载联创分红失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

/**
 * 格式化每权重金额显示（4位小数）
 */
const formatAmountPerWeight = (value) => {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  const num = parseFloat(value)
  if (isNaN(num)) {
    return ''
  }
  return num.toFixed(4)
}

/**
 * 处理每权重金额输入
 */
const onAmountPerWeightInput = (e) => {
  const value = e.detail.value
  if (value === '' || value === null || value === undefined) {
    unilevelAmountPerWeight.value = 0
    return
  }
  const num = parseFloat(value)
  if (!isNaN(num)) {
    unilevelAmountPerWeight.value = num
  }
}

/**
 * 保存联创分红金额
 */
const saveUnilevelAmount = async () => {
  const amount = parseFloat(unilevelAmountPerWeight.value)
  if (isNaN(amount) || amount < 0) {
    uni.showToast({ title: '请输入有效的金额', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '保存中...' })
    const res = await adjustUnilevelDividend(amount === 0 ? null : amount)
    console.log('[分红预览] 调整联创分红响应:', res)
    
    if (res.success) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      // 重新加载数据
      await loadUnilevelPreview()
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch (error) {
    console.error('[分红预览] 保存联创分红失败:', error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

/**
 * 加载积分值配置
 */
const loadPointsValue = async () => {
  try {
    uni.showLoading({ title: '加载中...' })
    const res = await getPointsValue()
    console.log('[分红预览] 积分值响应:', res)
    
    if (res.success && res.data) {
      pointsData.value = {
        current_value: res.data.current_value || 0,
        is_manual_adjusted: res.data.is_manual_adjusted || false,
        manual_value: res.data.manual_value || null,
        auto_clear: res.data.auto_clear !== undefined ? res.data.auto_clear : true,
        auto_calculated_value: res.data.auto_calculated_value || 0,
        subsidy_pool_balance: res.data.subsidy_pool_balance || 0,
        total_member_points: res.data.total_member_points || 0,
        total_system_points: res.data.total_system_points ?? res.data.total_member_points ?? 0,
        max_allowed_value: res.data.max_allowed_value || 0.02,
        remark: res.data.remark || ''
      }
      // 设置编辑值
      pointsValueInput.value = (pointsData.value.current_value * 100).toFixed(4)
      pointsAutoClear.value = pointsData.value.auto_clear
    }
  } catch (error) {
    console.error('[分红预览] 加载积分值失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

/**
 * 保存积分值
 */
const savePointsValue = async () => {
  const value = parseFloat(pointsValueInput.value)
  if (isNaN(value) || value < 0 || value > 2) {
    uni.showToast({ title: '请输入0-2之间的值', icon: 'none' })
    return
  }
  
  // 转换为小数（0-0.02）
  const decimalValue = value / 100
  
  try {
    uni.showLoading({ title: '保存中...' })
    const res = await adjustPointsValue(
      decimalValue === 0 ? null : decimalValue,
      pointsAutoClear.value
    )
    console.log('[分红预览] 调整积分值响应:', res)
    
    if (res.success) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      // 重新加载数据
      await loadPointsValue()
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch (error) {
    console.error('[分红预览] 保存积分值失败:', error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

/**
 * 自动清除开关变化
 */
const onAutoClearChange = (e) => {
  pointsAutoClear.value = e.detail.value
}

/**
 * 跳转到流水页面
 */
const goToFlow = (accountType) => {
  const typeMap = {
    'subsidy_pool': '补贴池',
    'director_pool': '分红池',
    'honor_director': '分红池'
  }
  const title = typeMap[accountType] || '资金池'
  uni.navigateTo({
    url: `/subPackages/page2/pages/merchant/pool-flow?account_type=${accountType}&title=${encodeURIComponent(title + '流水')}`
  })
}

/**
 * 跳转到总会员积分明细流水页面
 */
const goToMemberPointsFlow = () => {
  uni.navigateTo({
    url: `/subPackages/page2/pages/merchant/member-points-flow?title=${encodeURIComponent('总会员积分流水')}`
  })
}

onMounted(() => {
  loadUnilevelPreview()
  loadPointsValue()
})
</script>

<style scoped>
.dividend-preview-page {
  padding: 24rpx;
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 48rpx;
}

.page-header {
  margin-bottom: 24rpx;
}

.page-title {
  display: block;
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 6rpx;
}

.page-subtitle {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.section {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.btn-refresh {
  padding: 10rpx 24rpx;
  background: #3d6bff;
  color: white;
  border-radius: 10rpx;
  font-size: 24rpx;
  border: none;
}

.preview-card {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 积分：核心数据块 */
.data-block {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.data-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.data-item:last-of-type {
  border-bottom: none;
}

.data-label {
  font-size: 26rpx;
  color: #666;
  min-width: 140rpx;
}

.data-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  flex: 1;
}

/* 参考值一行展示 */
.ref-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 24rpx;
  padding: 12rpx 0;
  margin-bottom: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.ref-text {
  font-size: 22rpx;
  color: #999;
}

/* 操作区 */
.action-block {
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.action-row:last-child {
  margin-bottom: 0;
}

.action-row.switch-row {
  margin-bottom: 0;
}

.action-label {
  font-size: 28rpx;
  color: #333;
  min-width: 120rpx;
}

.input-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.value-input {
  flex: 1;
  padding: 14rpx 16rpx;
  background: #fff;
  border-radius: 10rpx;
  font-size: 28rpx;
  border: 1rpx solid #e0e0e0;
}

.input-unit {
  margin-left: 10rpx;
  font-size: 24rpx;
  color: #999;
}

.btn-save {
  padding: 14rpx 28rpx;
  background: #3d6bff;
  color: white;
  border-radius: 10rpx;
  font-size: 26rpx;
  border: none;
  flex-shrink: 0;
}

.btn-flow {
  padding: 10rpx 22rpx;
  background: #3d6bff;
  color: white;
  border-radius: 8rpx;
  font-size: 24rpx;
  border: none;
}

.switch-label {
  margin-left: 8rpx;
  font-size: 26rpx;
  color: #666;
}

.info-tip {
  margin-top: 0;
  padding: 12rpx 14rpx;
  background: #f5f9ff;
  border-radius: 10rpx;
  border-left: 4rpx solid #3d6bff;
}

.tip-text {
  font-size: 22rpx;
  color: #888;
  line-height: 1.5;
}

/* 联创区块沿用 */
.info-row {
  display: flex;
  align-items: center;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: #666;
  min-width: 180rpx;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  flex: 1;
}

.info-value.highlight {
  color: #3d6bff;
}

.info-row.editable {
  border-bottom: none;
  padding: 18rpx 0;
}

.btn-save-small {
  padding: 12rpx 24rpx;
  background: #3d6bff;
  color: white;
  border-radius: 10rpx;
  font-size: 24rpx;
  border: none;
  margin-left: 12rpx;
}

/* 用户分红列表 */
.users-section {
  margin-top: 30rpx;
  padding-top: 30rpx;
  border-top: 2rpx solid #f0f0f0;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.users-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.users-count {
  font-size: 24rpx;
  color: #999;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.user-item {
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 20rpx;
  border: 1rpx solid #e0e0e0;
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #e0e0e0;
}

.user-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.user-id {
  font-size: 24rpx;
  color: #999;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.user-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 26rpx;
  color: #666;
}

.detail-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.detail-value.highlight {
  color: #3d6bff;
  font-weight: 600;
}
</style>

