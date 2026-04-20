<template>
  <view class="distribute-page">
    <view class="page-header">
      <text class="page-title">发放优惠券</text>
      <text class="page-desc">为指定用户发放专属优惠券/红包</text>
    </view>

    <view class="form-card">
      <!-- 用户搜索 -->
      <view class="form-item">
        <text class="label">用户ID</text>
        <view class="input-wrapper">
          <input 
            class="input" 
            type="text" 
            v-model="formData.userId" 
            placeholder="请输入接收用户的ID" 
          />
        </view>
        <text class="tip">优惠券将直接发送到该用户的卡包</text>
      </view>

      <!-- 金额设置 -->
      <view class="form-item">
        <text class="label">优惠金额 (元) *</text>
        <view class="input-wrapper">
          <input 
            class="input price" 
            type="number" 
            step="1"
            v-model="formData.amount" 
            placeholder="0" 
            @input="onAmountInput"
          />
        </view>
        <text class="tip">优惠券将直接发放到用户账户</text>
      </view>

      <!-- 适用商品范围 -->
      <view class="form-item">
        <text class="label">适用商品范围 *</text>
        <view class="tags-group">
          <view 
            class="tag-item" 
            :class="{ active: formData.applicable_product_type === 'all' }"
            @tap="formData.applicable_product_type = 'all'"
          >
            不限制
          </view>
          <view 
            class="tag-item" 
            :class="{ active: formData.applicable_product_type === 'normal_only' }"
            @tap="formData.applicable_product_type = 'normal_only'"
          >
            仅普通商品
          </view>
          <view 
            class="tag-item" 
            :class="{ active: formData.applicable_product_type === 'member_only' }"
            @tap="formData.applicable_product_type = 'member_only'"
          >
            仅会员商品
          </view>
        </view>
        <text class="tip">选择优惠券适用的商品范围</text>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="footer-action">
      <!-- 原有的确认发放按钮 -->
      <button 
        class="submit-btn" 
        :loading="submitting" 
        @tap="handleDistribute"
      >
        确认发放
      </button>
	 <!-- 批量发放优惠券弹窗 -->
	 <view class="batch-dialog-mask" v-if="showBatchDialog" @tap="closeBatchDialog">
	   <view class="batch-dialog" @tap.stop>
	     <view class="dialog-title">批量发放优惠券</view>
	     <view class="dialog-item">
	       <text class="item-label">发放张数</text>
	       <input 
	         class="item-input" 
	         type="number" 
	         v-model="batchQuantity" 
	         placeholder="请输入正整数" 
	         :placeholder-style="'color:#ccc'"
	         @input="onBatchQuantityInput"
	       />
	     </view>
	     <view class="dialog-tip">* 向所有雨点余额大于0的用户发放</view>
	     <view class="dialog-buttons">
	       <button class="cancel-btn" @tap="closeBatchDialog">取消</button>
	       <button class="confirm-btn" @tap="confirmBatchGrant" :loading="batchSubmitting">确认发放</button>
	     </view>
	   </view>
	 </view>
	   <!-- 新增：批量发放优惠券按钮 -->
	   <button 
	     class="batch-btn" 
	     @tap="goBatchGrant"
	   >
	     批量发放优惠券
	   </button> 
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { distributeCoupon, exchangeCouponsApi} from '@/api/coupon.js'

const submitting = ref(false)
// 金额输入过滤，只允许整数，禁止小数点
const onAmountInput = (e) => {
  let val = e.detail.value || e.target.value || ''
  // 如果包含小数点，提示并清除小数点
  if (val.includes('.')) {
    uni.showToast({ title: '只能输入整数金额', icon: 'none' })
    val = val.replace(/\./g, '')
  }
  // 移除非数字字符
  val = val.replace(/[^\d]/g, '')
  if (val === '') {
    formData.value.amount = ''
    return
  }
  let intVal = parseInt(val, 10)
  if (isNaN(intVal)) intVal = 0
  formData.value.amount = intVal.toString()
}

const formData = ref({
  userId: '',
  amount: '',
  applicable_product_type: 'all' // 默认不限制
})
// 批量发放优惠券弹窗
const showBatchDialog = ref(false)
const batchQuantity = ref('')
const batchSubmitting = ref(false)

// 打开发放弹窗
const openBatchDialog = () => {
  batchQuantity.value = ''
  showBatchDialog.value = true
}

// 关闭弹窗
const closeBatchDialog = () => {
  showBatchDialog.value = false
}

// 确认发放
const confirmBatchGrant = async () => {
  const quantity = parseInt(batchQuantity.value, 10)
  if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    uni.showToast({ title: '请输入有效的正整数', icon: 'none' })
    return
  }

  batchSubmitting.value = true
  uni.showLoading({ title: '发放中...', mask: true })

  try {
    // 调用 API，数量作为 query 参数
    const response = await exchangeCouponsApi(quantity)
    if (response.success) {
      uni.showToast({ title: response.message || `成功发放 ${quantity} 张优惠券`, icon: 'success' })
      closeBatchDialog()
    } else {
      uni.showToast({ title: response.message || '发放失败', icon: 'none' })
    }
  } catch (error) {
    console.error('批量发放失败', error)
    uni.showToast({ title: error.message || '网络错误', icon: 'none' })
  } finally {
    batchSubmitting.value = false
    uni.hideLoading()
  }
}
// 跳转到批量发放页面
const goBatchGrant = () => {
  openBatchDialog()
}

const handleDistribute = async () => {
  // 验证用户ID
  if (!formData.value.userId || !formData.value.userId.trim()) {
    return uni.showToast({ title: '请输入用户ID', icon: 'none' })
  }
  
  // 验证用户ID是否为数字
  const userId = parseInt(formData.value.userId.trim(), 10)
  if (isNaN(userId) || userId <= 0) {
    return uni.showToast({ title: '请输入有效的用户ID', icon: 'none' })
  }
  
  // 验证优惠金额（整数）
  if (!formData.value.amount || formData.value.amount.trim() === '') {
    return uni.showToast({ title: '请输入优惠金额', icon: 'none' })
  }
  const amount = parseInt(formData.value.amount, 10)
  if (isNaN(amount) || amount <= 0 || !Number.isInteger(amount)) {
    return uni.showToast({ title: '请输入有效的整数金额（大于0）', icon: 'none' })
  }

  submitting.value = true
  
  try {
    // 调用API发放优惠券（coupon_type 固定为 'user'）
    await distributeCoupon({
      user_id: userId,
      amount: amount,
      coupon_type: 'user', // 固定为用户优惠券
      applicable_product_type: formData.value.applicable_product_type || 'all'
    })
    
    uni.showToast({ title: '发放成功', icon: 'success' })
    
    // 重置表单
    setTimeout(() => {
      formData.value.userId = ''
      formData.value.amount = ''
      formData.value.applicable_product_type = 'all' // 重置为默认值
    }, 1500)
    
  } catch (error) {
    console.error('发放优惠券失败:', error)
    uni.showToast({ 
      title: error.message || error.msg || '发放失败，请重试', 
      icon: 'none',
      duration: 2000
    })
  } finally {
    submitting.value = false
  }
}
// 批量发放张数输入过滤，只允许整数
// 批量发放张数输入过滤，只允许整数
const onBatchQuantityInput = (e) => {
  let val = e.detail.value || e.target.value || ''
  if (val.includes('.')) {
    uni.showToast({ title: '只能输入整数张数', icon: 'none' })
    val = val.replace(/\./g, '')
  }
  val = val.replace(/[^\d]/g, '')
  if (val === '') {
    batchQuantity.value = ''
    return
  }
  let intVal = parseInt(val, 10)
  if (isNaN(intVal)) intVal = 0
  batchQuantity.value = intVal.toString()
}
</script>

<style scoped>
.distribute-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
}

.page-header {
  margin-bottom: 40rpx;
}

.page-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.page-desc {
  font-size: 26rpx;
  color: #999;
}

.form-card {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
}

.form-item {
  margin-bottom: 40rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.tip {
  display: block;
  font-size: 22rpx;
  color: #aaa;
  margin-top: 12rpx;
}

.input-wrapper {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 24rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  border-color: #3d6bff;
  background: #fff;
}

.input {
  font-size: 28rpx;
  color: #333;
  width: 100%;
}

.radio-group, .tags-group {
  display: flex;
  gap: 20rpx;
}

.radio-item, .tag-item {
  padding: 16rpx 32rpx;
  background: #f5f5f5;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
  border: 2rpx solid transparent;
  transition: all 0.3s;
}

.radio-item.active, .tag-item.active {
  background: rgba(61, 107, 255, 0.1);
  color: #3d6bff;
  border-color: #3d6bff;
  font-weight: 600;
}

.form-row {
  display: flex;
  gap: 30rpx;
  margin-bottom: 40rpx;
}

.form-item.half {
  flex: 1;
  margin-bottom: 0;
}

.input.price {
  font-size: 28rpx;
  color: #333;
  width: 100%;
}

.preview-box {
  background: #fff8e1;
  border-radius: 12rpx;
  padding: 20rpx;
  border: 1px dashed #ffb300;
}

.preview-label {
  font-size: 24rpx;
  color: #b38f00;
}

.preview-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff6f00;
  margin-left: 10rpx;
}

.footer-action {
  margin-top: 60rpx;
}

.submit-btn {
  background: linear-gradient(135deg, #3d6bff, #2b4cff);
  color: white;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 600;
  height: 96rpx;
  line-height: 96rpx;
  box-shadow: 0 10rpx 30rpx rgba(61, 107, 255, 0.3);
}

.submit-btn:active {
  transform: scale(0.98);
}

.batch-btn {
  margin-top: 20rpx;
  background: linear-gradient(135deg, #07c160, #06ad56);
  color: white;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 600;
  height: 88rpx;
  line-height: 88rpx;
  border: none;
  width: 100%;
}
.batch-btn:active {
  opacity: 0.8;
}
/* 批量发放弹窗 */
.batch-dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.batch-dialog {
  width: 560rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
}
.dialog-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 48rpx;
}
.dialog-item {
  margin-bottom: 24rpx;
}
.item-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}
.item-input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #ddd;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 32rpx;
  box-sizing: border-box;
}
.dialog-tip {
  font-size: 24rpx;
  color: #ff9800;
  margin-bottom: 32rpx;
}
.dialog-buttons {
  display: flex;
  gap: 24rpx;
  margin-top: 16rpx;
}
.cancel-btn, .confirm-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: none;
}
.cancel-btn {
  background: #f5f5f5;
  color: #666;
}
.confirm-btn {
  background: #ff9800;
  color: #fff;
}
</style>
