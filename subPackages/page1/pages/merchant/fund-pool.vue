<template>
  <view class="fund-pool-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <view class="page-header-text">
        <text class="page-title">资金池分配配置</text>
        <text class="page-subtitle">管理各资金池的分配比例</text>
      </view>
      <button class="btn-use" @tap="goToMyFunds">去使用</button>
    </view>

    <!-- 资金池列表（不显示商户余额，商户余额固定 80% 保持不变） -->
    <view class="pool-list">
      <view 
        v-for="pool in displayPoolList" 
        :key="pool.key"
        class="pool-item"
      >
        <view class="pool-info">
          <text class="pool-name">{{ pool.name }}</text>
          <text class="pool-desc">{{ pool.description }}</text>
          <text class="pool-balance" v-if="pool.balance !== undefined">余额：¥{{ formatBalance(pool.balance) }}</text>
        </view>
        <view class="pool-input-wrapper">
          <input 
            v-model="pool.value" 
            type="text"
            inputmode="decimal"
            class="pool-input"
            placeholder="0.00"
            @input="onInputChange(pool.key, $event)"
            @blur="onInputBlur(pool.key)"
          />
          <text class="pool-unit">%</text>
        </view>
      </view>
    </view>

    <!-- 总计提示：其他资金池合计须为 20% -->
    <view class="total-info">
      <text class="total-label">其他资金池总计：</text>
      <text class="total-value" :class="{ 'error': Math.abs(totalPercentage - 20) > 0.01 }">
        {{ totalPercentage.toFixed(2) }}%
      </text>
      <text v-if="Math.abs(totalPercentage - 20) > 0.01" class="total-tip">
        （须等于20%）
      </text>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="btn-reset" @tap="resetData">重置</button>
      <button 
        class="btn-save" 
        :disabled="saving"
        @tap="saveData"
      >
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getFundPoolAllocations, updateFundPoolAllocations } from '../../api/fund-pool.js'

// 资金池配置映射
const poolConfig = {
  merchant_balance: { name: '商户余额', description: '商户账户余额分配比例' },
  public_welfare: { name: '公益基金', description: '用于社会公益事业' },
  maintain_pool: { name: '维护池', description: '平台技术维护和系统升级' },
  subsidy_pool: { name: '补贴池', description: '消费者及商家补贴分配' },
  director_pool: { name: '联创奖励池', description: '联创级别分成' },
  shop_pool: { name: '店铺池', description: '店铺分成' },
  city_pool: { name: '城市池', description: '城市运营中心分成' },
  branch_pool: { name: '分支池', description: '分支分成' },
  fund_pool: { name: '资金池', description: '资金池分配' }
}

// 资金池列表
const poolList = ref([])

// 保存状态
const saving = ref(false)

// 仅用于展示的列表（不包含商户余额，商户余额不显示、保持不变）
const displayPoolList = computed(() => {
  return poolList.value.filter(p => p.key !== 'merchant_balance')
})

// 计算总比例（排除商户余额，其他资金池合计）
const totalPercentage = computed(() => {
  return poolList.value.reduce((sum, pool) => {
    if (pool.key === 'merchant_balance') return sum
    const value = parseFloat(pool.value) || 0
    return sum + value
  }, 0)
})

/**
 * 格式化余额显示
 */
const formatBalance = (balance) => {
  return Number(balance || 0).toFixed(2)
}

/**
 * 初始化资金池列表（data 为空时用默认比例占位，避免白屏）
 */
const initPoolList = (data) => {
  const raw = data && typeof data === 'object' ? data : {}
  poolList.value = Object.keys(poolConfig).map(key => {
    // 新数据格式：data[key] 是一个对象，包含 allocation 和 balance
    const poolData = raw[key] || {}
    const allocation = poolData.allocation ?? raw[key] ?? 0 // 兼容旧格式
    const balance = poolData.balance
    
    return {
      key,
      name: (poolConfig[key] && poolConfig[key].name) || key,
      description: (poolConfig[key] && poolConfig[key].description) || '',
      value: isNaN(parseFloat(allocation)) ? '' : (parseFloat(allocation) * 100).toFixed(4), // 转换为百分比显示，保留4位小数
      balance: balance !== undefined ? parseFloat(balance) : undefined // 余额
    }
  })
}

/**
 * 输入变化处理（通过 key 定位池子）
 */
const onInputChange = (key, event) => {
  const pool = poolList.value.find(p => p.key === key)
  if (!pool) return
  let v = event && event.detail ? String(event.detail.value) : ''
  if (v === null || v === undefined) v = ''
  v = v.replace(/[^0-9.]/g, '')
  const parts = v.split('.')
  if (parts.length > 1) {
    v = parts[0] + '.' + parts.slice(1).join('').substring(0, 4)
  }
  v = v.replace(/^0+(?=\d)/, '')
  pool.value = v
}

const onInputBlur = (key) => {
  const pool = poolList.value.find(p => p.key === key)
  if (!pool) return
  let v = pool.value
  if (v === '' || v === null || v === undefined) {
    pool.value = ''
    return
  }
  v = String(v).trim()
  v = v.replace(/^\./, '0.')
  v = v.replace(/\.$/, '')
  const m = v.match(/^(-?\d+)(?:\.(\d{0,}))?$/)
  if (m) {
    const intPart = m[1]
    const decPart = (m[2] || '').substring(0, 4)
    pool.value = decPart ? `${intPart}.${decPart}` : `${intPart}`
  } else {
    pool.value = ''
  }
}

/**
 * 加载资金池配置
 */
const loadData = async () => {
  try {
    uni.showLoading({ title: '加载中...' })
    const res = await getFundPoolAllocations()
    console.log('[资金池] 获取配置成功:', res)
    
    if (res && res.success && res.data != null) {
      initPoolList(res.data)
    } else {
      initPoolList({})
      if (res && res.message) uni.showToast({ title: res.message, icon: 'none' })
    }
  } catch (error) {
    console.error('[资金池] 获取配置失败:', error)
    initPoolList({})
    uni.showToast({ 
      title: (error && error.message) ? error.message : '加载失败，请重试', 
      icon: 'none' 
    })
  } finally {
    uni.hideLoading()
  }
}

/**
 * 重置数据
 */
const resetData = () => {
  uni.showModal({
    title: '确认重置',
    content: '确定要重置为原始数据吗？',
    success: (res) => {
      if (res.confirm) {
        loadData()
      }
    }
  })
}

/**
 * 保存配置
 */
const saveData = async () => {
  // 验证总比例：其他资金池合计须等于 20%（允许 0.01% 误差）
  const total = totalPercentage.value
  if (Math.abs(total - 20) > 0.01) {
    uni.showToast({ 
      title: `其他资金池合计须为 20%，当前为 ${total.toFixed(2)}%`, 
      icon: 'none',
      duration: 3000
    })
    return
  }

  // 构建请求数据（转换为小数，保持字符串格式以匹配后端）
  // 使用query参数格式，直接传递各个字段
  const data = {}
  poolList.value.forEach(pool => {
    const num = parseFloat(pool.value)
    const decimalValue = isNaN(num) ? '0.0000' : (num / 100).toFixed(4)
    data[pool.key] = decimalValue // 转换为小数字符串格式，如 "0.9000"
  })

  try {
    saving.value = true
    uni.showLoading({ title: '保存中...' })
    
    const res = await updateFundPoolAllocations(data)
    console.log('[资金池] 更新配置成功:', res)
    
    if (res.success) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      // 重新加载数据
      setTimeout(() => {
        loadData()
      }, 1000)
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch (error) {
    console.error('[资金池] 更新配置失败:', error)
    uni.showToast({ 
      title: error.message || '保存失败，请重试', 
      icon: 'none' 
    })
  } finally {
    saving.value = false
    uni.hideLoading()
  }
}

/** 跳转到「我的资金」页面 */
const goToMyFunds = () => {
  uni.navigateTo({
    url: '/subPackages/page2/pages/fund-pool/index'
  })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.fund-pool-page {
  padding: 40rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

/* 页面标题 */
.page-header {
  margin-bottom: 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24rpx;
}

.page-header-text {
  flex: 1;
  text-align: left;
}

.page-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.page-subtitle {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.btn-use {
  flex-shrink: 0;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 48rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #3d6bff, #5a7fff);
  border: none;
  border-radius: 44rpx;
  box-shadow: 0 8rpx 24rpx rgba(61, 107, 255, 0.35);
}

.btn-use::after {
  border: none;
}

.btn-use:active {
  opacity: 0.9;
  transform: scale(0.98);
}

/* 资金池列表 */
.pool-list {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.pool-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.pool-item:last-child {
  border-bottom: none;
}

.pool-info {
  flex: 1;
  margin-right: 20rpx;
}

.pool-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.pool-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
  line-height: 1.4;
  margin-bottom: 8rpx;
}

.pool-balance {
  display: block;
  font-size: 22rpx;
  color: #3d6bff;
  font-weight: 500;
  margin-top: 4rpx;
}

.pool-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 180rpx;
}

.pool-input {
  flex: 1;
  text-align: right;
  font-size: 30rpx;
  color: #333;
  padding: 16rpx 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx solid #e0e0e0;
}

.pool-input:focus {
  border-color: #3d6bff;
  background: white;
}

.pool-unit {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

/* 总计信息 */
.total-info {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.total-label {
  font-size: 28rpx;
  color: #666;
}

.total-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #3d6bff;
}

.total-value.error {
  color: #ff4757;
}

.total-tip {
  font-size: 24rpx;
  color: #ff4757;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 20rpx;
  padding: 0 0 40rpx;
}

.action-buttons .btn-reset, .action-buttons .btn-save {
  flex: 1;
  height: 88rpx;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
}

.btn-reset {
  background: #f5f5f5;
  color: #666;
}

.btn-reset:active {
  background: #e0e0e0;
}

.btn-save {
  background: linear-gradient(135deg, #3d6bff, #5a7fff);
  color: white;
}

.btn-save:disabled {
  background: #ccc;
  color: #999;
}

.btn-save:not(:disabled):active {
  opacity: 0.8;
}
</style>

