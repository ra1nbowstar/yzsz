<template>
  <view class="after-sale-page">
    <view class="order-info">
      <text class="info-label">订单号：</text>
      <text class="info-value">{{ orderNo }}</text>
    </view>

    <view class="form-section">
      <view class="form-item">
        <text class="form-label">售后类型</text>
        <picker mode="selector" :range="availableTypeOptions" @change="onTypeChange">
          <view class="picker-value">
            <text>{{ availableTypeOptions[typeIndex] || '仅退款' }}</text>
            <text class="picker-arrow">></text>
          </view>
        </picker>
        <text class="form-tip" v-if="orderStatus === 'pending_ship'">
          （待发货订单仅支持仅退款）
        </text>
      </view>

      <view class="form-item">
        <text class="form-label">申请原因</text>
        <picker mode="selector" :range="reasonOptions" @change="onReasonChange">
          <view class="picker-value">
            <text>{{ reasonOptions[reasonIndex] }}</text>
            <text class="picker-arrow">></text>
          </view>
        </picker>
      </view>

      <view class="form-item vertical">
        <text class="form-label">{{ isOtherReason ? '具体原因说明' : '问题描述(选填)' }}</text>
        <textarea 
          class="form-textarea" 
          v-model="description" 
          :placeholder="isOtherReason ? '请详细说明您的申请原因' : '请详细描述您遇到的问题（选填）'"
          maxlength="500"
        />
        <text class="char-count">{{ description.length }}/500</text>
      </view>
    </view>

    <view class="tips-section">
      <view class="tips-title">温馨提示</view>
      <view class="tips-item">1. 提交申请后，需要等待平台审核，审核通过后才会退款</view>
      <view class="tips-item">2. 请如实填写售后说明，我们将在1-3个工作日内处理</view>
      <view class="tips-item">3. 审核通过后，退款将原路返回到您的支付账户</view>
      <view class="tips-item">4. 如需退货，请保持商品完好并包含所有配件</view>
      <view class="tips-item">5. 如有疑问，请联系在线客服</view>
    </view>

    <view class="submit-section">
      <button class="submit-btn" @tap="submitAfterSale">提交申请</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { updateMerchantOrderStatus } from '../../utils/merchant.js'
import { applyRefund, mapRefundType } from '../../api/refund.js'
import { updateOrderStatus, getOrderDetail } from '@/api/order.js'
import config from '@/utils/config.js'

const orderId = ref('')
const orderNo = ref('')
const orderStatus = ref('') // 订单状态

// 根据订单状态动态设置可选的退款类型
// 待发货（pending_ship）时只能选择"仅退款"
// 已完成（completed）时可以选择"仅退款"或"退货退款"
const availableTypeOptions = computed(() => {
  // 待发货状态：只能仅退款
  if (orderStatus.value === 'pending_ship') {
    return ['仅退款']
  }
  // 已完成状态：可以选择仅退款或退货退款
  if (orderStatus.value === 'completed') {
    return ['仅退款', '退货退款']
  }
  // 其他状态（如 pending_recv）：默认允许两种类型（可以根据需求调整）
  return ['仅退款', '退货退款']
})

const typeIndex = ref(0)

const reasonOptions = [
  '商品质量问题',
  '商品与描述不符',
  '收到商品破损',
  '发错货',
  '不想要了',
  '其他原因'
]
const reasonIndex = ref(0)

const isOtherReason = computed(() => reasonOptions[reasonIndex.value] === '其他原因')

const description = ref('')

// 可以申请退款的状态（支付完成后的所有状态）
const refundableStatuses = ['pending_ship', 'pending_recv', 'completed']

/**
 * 检查已完成订单是否可以申请退款
 * @param {Object} order 订单数据
 * @returns {Boolean} 是否可以申请退款
 */
const canCompletedOrderRefund = (order) => {
  if (order.status !== 'completed') return true

  // 检查是否已有退款信息且状态不是 rejected
  const refundStatus = order.refund_status || order.refundStatus
  if (refundStatus && refundStatus !== 'rejected') {
    return false // 已有正在处理或已成功的退款，不能再次申请
  }

  // 检查15天限制
  if (order.created_at || order.createTime || order.create_time) {
    const createTimeStr = order.created_at || order.createTime || order.create_time
    const createTimeStamp = new Date(createTimeStr).getTime()
    if (createTimeStamp > 0) {
      const now = Date.now()
      const daysDiff = (now - createTimeStamp) / (1000 * 60 * 60 * 24)
      return daysDiff <= 15
    }
  }
  return true
}

onLoad(async (options) => {
  if (options.orderId) {
    orderId.value = options.orderId
  }
  if (options.orderNo) {
    orderNo.value = options.orderNo
  }
  
  // 如果有订单号，尝试获取订单状态
  if (orderNo.value) {
    try {
      const orderDetail = await getOrderDetail(orderNo.value)
      const order = orderDetail.data || orderDetail
      if (order && order.status) {
        orderStatus.value = order.status
        
        // 检查订单状态是否可以申请退款
        if (!refundableStatuses.includes(order.status)) {
          uni.showModal({
            title: '无法申请退款',
            content: '只有已支付的订单才能申请退款',
            showCancel: false,
            success: () => {
              uni.navigateBack()
            }
          })
          return
        }
        
        // 对于已完成订单，检查是否可以申请退款
        if (order.status === 'completed') {
          if (!canCompletedOrderRefund(order)) {
            // 检查具体原因
            let errorMsg = '无法申请退款'
            if (order.refund_status || order.refundStatus) {
              errorMsg = '该订单已申请过退款，不能重复申请'
            } else if (order.created_at || order.createTime || order.create_time) {
              const createTimeStr = order.created_at || order.createTime || order.create_time
              const createTimeStamp = new Date(createTimeStr).getTime()
              if (createTimeStamp > 0) {
                const now = Date.now()
                const daysDiff = (now - createTimeStamp) / (1000 * 60 * 60 * 24)
                if (daysDiff > 15) {
                  errorMsg = '订单已超过15天，无法申请退款'
                }
              }
            }
            
            uni.showModal({
              title: '无法申请退款',
              content: errorMsg,
              showCancel: false,
              success: () => {
                uni.navigateBack()
              }
            })
            return
          }
        }
        
        // 根据订单状态重置退款类型选择
        // 如果是待发货状态，强制选择"仅退款"（索引0）
        if (order.status === 'pending_ship') {
          typeIndex.value = 0 // 仅退款
        }
      }
    } catch (error) {
      console.warn('[申请退款] 获取订单状态失败:', error)
    }
  }
})

const onTypeChange = (e) => {
  typeIndex.value = e.detail.value
}

const onReasonChange = (e) => {
  reasonIndex.value = e.detail.value
}

const submitAfterSale = async () => {
  // 验证订单号
  if (!orderNo.value) {
    uni.showToast({ title: '订单号不能为空', icon: 'none' })
    return
  }

  // 验证订单状态（如果已获取）
  if (orderStatus.value && !refundableStatuses.includes(orderStatus.value)) {
    uni.showToast({
      title: '只有已支付的订单才能申请退款',
      icon: 'none',
      duration: 3000
    })
    return
  }
  
  // 如果是“其他原因”，强制要求填写描述
  if (isOtherReason.value && !description.value.trim()) {
    uni.showToast({
      title: '请填写具体原因说明',
      icon: 'none'
    })
    return
  }

  uni.showModal({
    title: '确认提交',
    content: '确认提交售后申请？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '提交中...' })
        
        try {
          // 转换退款类型（使用动态的可用选项）
          const selectedType = availableTypeOptions.value[typeIndex.value] || '仅退款'
          const refundType = mapRefundType(selectedType)
          
          // 再次验证：待发货状态不允许退货退款
          if (orderStatus.value === 'pending_ship' && selectedType === '退货退款') {
            uni.hideLoading()
            uni.showToast({
              title: '待发货订单仅支持仅退款',
              icon: 'none',
              duration: 2000
            })
            return
          }
          
          // 合并原因：如果是“其他原因”，直接使用描述；否则拼接选项和描述
          let combinedReason = reasonOptions[reasonIndex.value]
          if (isOtherReason.value) {
            combinedReason = description.value
          } else if (description.value.trim()) {
            combinedReason = `${combinedReason}: ${description.value}`
          }
          
          console.log('[申请退款] 参数:', {
            order_number: orderNo.value,
            refund_type: refundType,
            reason_code: combinedReason
          })
          
          // 调用申请退款接口 (合并参数名为 reason_code)
          // 调用申请退款接口
          const result = await applyRefund({
            order_number: orderNo.value,
            refund_type: refundType,
            reason_code: combinedReason
          })
          
          console.log('[申请退款] 申请提交成功:', result)
          
          uni.hideLoading()

          uni.showToast({
            title: '申请已提交，等待审核',
            icon: 'success',
            duration: 2500
          })
          
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } catch (error) {
          uni.hideLoading()
          console.error('[申请退款] 申请失败:', error)
          
          let errorMsg = '申请失败，请重试'
          if (error.message) {
            errorMsg = error.message
          } else if (error.response?.data?.detail) {
            errorMsg = typeof error.response.data.detail === 'string' 
              ? error.response.data.detail 
              : JSON.stringify(error.response.data.detail)
          }
          
          uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          })
        }
      }
    }
  })
}
</script>

<style scoped>
.after-sale-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.order-info {
  background: #fff;
  padding: 30rpx;
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.form-section {
  background: #fff;
  margin-bottom: 20rpx;
}

.form-item {
  padding: 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.form-item.vertical {
  flex-direction: column;
  align-items: flex-start;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #333;
}

.picker-arrow {
  color: #999;
}

.form-tip {
  font-size: 24rpx;
  color: #999;
  margin-top: 12rpx;
  display: block;
}

.form-input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.6;
}

.char-count {
  font-size: 24rpx;
  color: #999;
  text-align: right;
  margin-top: 12rpx;
  display: block;
}

.upload-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 20rpx;
}

.image-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
}

.upload-image {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.delete-btn {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 40rpx;
  height: 40rpx;
  background: #f44336;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  line-height: 1;
}

.upload-btn {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed #e0e0e0;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.upload-icon {
  font-size: 48rpx;
  color: #999;
}

.upload-text {
  font-size: 24rpx;
  color: #999;
}

.upload-tip {
  font-size: 24rpx;
  color: #999;
  margin-top: 20rpx;
  display: block;
}

.tips-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.tips-title {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.tips-item {
  font-size: 24rpx;
  color: #666;
  line-height: 1.8;
  margin-bottom: 12rpx;
}

.submit-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
}
</style>
