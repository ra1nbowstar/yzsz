<template>
  <view class="create-payment-page">
    <!-- 表单项 -->
    <view class="section-card form-card">
      <view class="section-title">
        <text class="iconfont icon-dingdanxiaoxi section-icon"></text>
        <text>平台收款</text>
      </view>
      <view class="form-body">
        <!-- 1. 商户固定为自己，只读展示 -->
        <view class="form-item">
          <text class="form-label">收款方</text>
          <view class="form-input form-input-readonly">
            <text>平台官方</text>
          </view>
        </view>
        <!-- 2. 商品：不选则系统默认「店铺名+1号商品」，可选已有商品（含下架） -->
        <view class="form-item">
          <text class="form-label">商品</text>
          <view class="form-row-with-btn">
            <view class="form-input form-input-readonly flex-1">
              <text>{{ productDisplayName }}</text>
            </view>
            <button v-if="selectedProduct" class="btn-link" @tap="clearProduct">清除</button>
            <button class="btn-link primary" @tap="openProductPicker">选择已有商品</button>
          </view>
          <text class="form-hint">不选则使用默认：{{ defaultProductName }}</text>
        </view>
        <!-- 3. 金额可调整 -->
        <view class="form-item">
          <text class="form-label">金额（元）</text>
          <input
            class="form-input"
            type="digit"
            v-model="form.amount"
            placeholder="请输入金额"
            placeholder-class="placeholder"
          />
        </view>
        <view class="form-item">
          <text class="form-label">备注（选填）</text>
          <input
            class="form-input"
            v-model="form.note"
            placeholder="选填"
            placeholder-class="placeholder"
          />
        </view>
        <button
          class="btn-primary"
          :disabled="creating"
          :class="{ disabled: creating }"
          @tap="onCreate"
        >
          {{ creating ? '生成中...' : '生成支付单并生成收款码' }}
        </button>
      </view>
    </view>

    <!-- 选择已有商品弹层（含下架商品） -->
    <view v-if="productPickerVisible" class="mask" @tap="closeProductPicker"></view>
    <view v-if="productPickerVisible" class="picker-popup product-popup">
      <view class="picker-header">
        <text class="picker-title">选择商品（含下架）</text>
        <text class="picker-close iconfont" @tap="closeProductPicker">&#xe60a;</text>
      </view>
      <scroll-view scroll-y class="picker-list" @scrolltolower="loadMoreMyProducts">
        <view v-if="productListLoading" class="list-loading">加载中...</view>
        <view v-else-if="myProductList.length === 0" class="list-empty">暂无商品</view>
        <view
          v-for="p in myProductList"
          :key="p.id"
          class="picker-item product-item"
          @tap="selectMyProduct(p)"
        >
          <text class="item-main">{{ p.name || '未命名' }}</text>
          <text class="item-sub">¥{{ formatProductPrice(p) }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 收款码区域：优先小程序码，没有时用普通二维码（pay:// 或 code_token） -->
    <view v-if="paymentInfo && paymentInfo.order_no" class="section-card qrcode-card">
      <view class="section-title">
        <text class="iconfont icon-hongbao section-icon"></text>
        <text>收款码</text>
        <text class="expires-badge">{{ expiresText }}</text>
      </view>
      <view class="qrcode-wrap">
        <view class="qrcode-inner">
          <image
            v-if="qrcodeB64Ref"
            class="qrcode-img"
            mode="aspectFit"
            :src="'data:image/png;base64,' + qrcodeB64Ref"
            @error="onQrcodeImageError"
          />
          <tki-qrcode v-else-if="qrcodeContent" :key="qrcodeContent" :text="qrcodeContent" :size="220" />
        </view>
      </view>
      <view class="payment-info-list">
        <view class="info-row">
          <text class="info-label">支付单号</text>
          <text class="info-value mono">{{ (paymentInfo && paymentInfo.order_no) ? paymentInfo.order_no : '—' }}</text>
        </view>
        <view class="info-row highlight">
          <text class="info-label">金额</text>
          <text class="info-value amount">¥{{ formatAmount(paymentInfo && paymentInfo.amount) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">商品</text>
          <text class="info-value">{{ (paymentInfo && paymentInfo.product_name) ? paymentInfo.product_name : '—' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">收款方</text>
          <text class="info-value">平台官方</text>
        </view>
      </view>
      <view class="qrcode-actions">
        <button class="btn-secondary" @tap="onRefreshCode" :disabled="refreshingCode">
          {{ refreshingCode ? '刷新中...' : '刷新收款码' }}
        </button>
        <button class="btn-secondary" @tap="copyQr">复制内容</button>
        <button class="btn-secondary" @tap="regenerate">重新生成</button>
      </view>
    </view>

    <view v-else class="empty-tip">
      <text class="iconfont icon-dingdanxiaoxi empty-icon"></text>
      <text>填写上方信息并点击「生成支付单」后，将显示收款码</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import TkiQrcode from '@/components/tki-qrcode/tki-qrcode.vue'
import { createOfflinePaymentOrder, refreshCollectionCode } from '../../api/payment.js'
import { getStoreInfo } from '@/api/store.js'
import { getProductList } from '@/api/product.js'

const form = ref({ amount: '', product_name: '', store_name: '', note: '' })
const selectedStore = ref(null) // 固定为当前用户店铺 { store_id, store_name, user_id }
const selectedProduct = ref(null) // 已选已有商品 { id, name, price }，null 表示使用默认
const productPickerVisible = ref(false)
const myProductList = ref([])
const productListLoading = ref(false)
const myProductPage = ref(1)
const myProductPageSize = 20
const hasMoreMyProducts = ref(true)
const qrcodeContent = ref('')
const qrcodeB64Ref = ref('') // 后端返回的 base64 二维码图，有则优先展示
const expiresAt = ref(0)
const creating = ref(false)
const refreshingCode = ref(false)
const paymentInfo = ref({})
let timer = null

const defaultProductName = computed(() => (form.value.store_name || '我的店铺') + '1号商品')
const productDisplayName = computed(() => {
  if (selectedProduct.value) return selectedProduct.value.name
  return form.value.product_name || defaultProductName.value
})

const expiresText = computed(() => {
  if (!expiresAt.value) return '已过期'
  const sec = Math.max(0, Math.floor((expiresAt.value - Date.now()) / 1000))
  if (sec <= 0) return '已过期'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m} 分 ${s} 秒`
})

function formatAmount(v) {
  return (Number(v || 0)).toFixed(2)
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    if (!expiresAt.value || Date.now() >= expiresAt.value) {
      stopTimer()
    }
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function getMerchantId() {
  const userInfo = uni.getStorageSync('userInfo') || {}
  return userInfo.user_id ?? userInfo.id ?? userInfo.userId ?? userInfo.uid ?? 0
}

/** 加载当前用户店铺信息，商户固定为自己，默认商品名为店铺名+1号商品 */
async function loadMyStore() {
  const userId = getMerchantId()
  if (!userId) return
  try {
    const res = await getStoreInfo(userId)
    const data = res?.data ?? res
    const storeName = (data?.store_name ?? data?.storeName ?? data?.name ?? '我的店铺') || '我的店铺'
    const storeId = data?.store_id ?? data?.id ?? data?.storeId ?? null
    selectedStore.value = { store_id: storeId, store_name: storeName, user_id: userId }
    form.value.store_name = storeName
    if (!selectedProduct.value && !form.value.product_name) form.value.product_name = storeName + '1号商品'
  } catch (e) {
    console.warn('[创建支付单] 加载店铺信息失败，使用默认', e)
    selectedStore.value = { store_id: null, store_name: '我的店铺', user_id: userId }
    form.value.store_name = '我的店铺'
    if (!selectedProduct.value && !form.value.product_name) form.value.product_name = '我的店铺1号商品'
  }
}

function formatProductPrice(p) {
  if (p.skus && Array.isArray(p.skus) && p.skus.length > 0 && p.skus[0].price != null) {
    return (parseFloat(p.skus[0].price) || 0).toFixed(2)
  }
  return (parseFloat(p.price) || 0).toFixed(2)
}

function openProductPicker() {
  productPickerVisible.value = true
  myProductList.value = []
  myProductPage.value = 1
  hasMoreMyProducts.value = true
  loadMyProducts()
}

function closeProductPicker() {
  productPickerVisible.value = false
}

async function loadMyProducts(append = false) {
  if (productListLoading.value) return
  const uid = selectedStore.value?.user_id ?? getMerchantId()
  if (!uid) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  productListLoading.value = true
  try {
    if (!append) {
      myProductPage.value = 1
      hasMoreMyProducts.value = true
    }
    const res = await getProductList({ 
      page: myProductPage.value, 
      pageSize: myProductPageSize,
      include_offline: true  // 包含下架商品，获取所有商品
    })
    const raw = res?.data?.list ?? res?.data ?? res?.list ?? res?.items ?? (Array.isArray(res) ? res : [])
    const list = Array.isArray(raw) ? raw : []
    if (append) {
      myProductList.value = [...myProductList.value, ...list]
    } else {
      myProductList.value = list
    }
    hasMoreMyProducts.value = list.length >= myProductPageSize
    if (list.length >= myProductPageSize) myProductPage.value++
  } catch (e) {
    console.warn('[创建支付单] 加载商品列表失败', e)
    if (!append) myProductList.value = []
  } finally {
    productListLoading.value = false
  }
}

function loadMoreMyProducts() {
  if (!hasMoreMyProducts.value || productListLoading.value) return
  loadMyProducts(true)
}

function selectMyProduct(p) {
  const price = p.skus && p.skus[0] && p.skus[0].price != null
    ? parseFloat(p.skus[0].price)
    : parseFloat(p.price)
  selectedProduct.value = { id: p.id, name: p.name || '未命名', price: isNaN(price) ? '' : price }
  form.value.product_name = selectedProduct.value.name
  if (selectedProduct.value.price !== '' && selectedProduct.value.price > 0) {
    form.value.amount = String(selectedProduct.value.price)
  }
  closeProductPicker()
}

function clearProduct() {
  selectedProduct.value = null
  form.value.product_name = defaultProductName.value
}

async function onCreate() {
  if (creating.value) return
  const product_name = (form.value.product_name || '').trim() || defaultProductName.value
  if (!product_name) {
    uni.showToast({ title: '请选择或使用默认商品', icon: 'none' })
    return
  }
  const amount = Number(form.value.amount)
  if (!amount || amount <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' })
    return
  }
  creating.value = true
  try {
    // merchant_id 应为商户 id：选了门店用该门店的 user_id，否则用当前用户 id
    const merchantId = selectedStore.value?.user_id ?? getMerchantId()
    const res = await createOfflinePaymentOrder({
      merchant_id: 0,  // 平台特殊ID
      store_name: '平台官方',
      amount,
      product_name,
      remark: (form.value.note || '').trim(),
      product_id: selectedProduct.value?.id ?? undefined,
      is_platform: true  // 标记平台收款
    })
    console.log('[创建支付单] 后端返回', res)
    // 兼容多种响应：{ code:0, data:{ order_no, qrcode_b64 } } 或 { order_no, code_token, ... } 或 string
    const data = res && typeof res === 'object' && res.data != null ? res.data : res
    let order_no = ''
    let code_token = ''
    let expires_in = 15 * 60
    let qrcodeB64 = ''
    if (typeof data === 'string') {
      order_no = data.trim()
    } else if (data && typeof data === 'object') {
      order_no = data.order_no || data.order_number || data.orderNo || ''
      code_token = data.code_token || data.code || data.qrcode_content || ''
      expires_in = data.expires_in ?? 15 * 60
      let rawB64 = data.qrcode_b64 || data.qrcodeB64 || ''
      if (typeof rawB64 === 'string') {
        rawB64 = rawB64.trim().replace(/\s+/g, '') // 去掉换行、空格
        if (rawB64.indexOf('base64,') !== -1) {
          rawB64 = rawB64.split('base64,')[1] || ''
        }
        // 放宽：长度足够且为 base64 字符（含 url-safe 的 - _），即用于展示
        if (rawB64.length > 50 && /^[A-Za-z0-9+/=_-]+$/.test(rawB64)) {
          qrcodeB64 = rawB64
        }
      }
    }
    if (res && typeof res === 'object' && res.data == null) {
      order_no = order_no || res.order_no || res.order_number || res.orderNo || ''
      code_token = code_token || res.code_token || res.code || res.qrcode_content || ''
    }
    if (!order_no) {
      order_no = 'P' + Date.now()
    }
    paymentInfo.value = {
      order_no: String(order_no),
      amount: Number(amount),
      product_name: String(product_name),
      store_name: '平台官方'
    }
    expiresAt.value = Date.now() + expires_in * 1000
    const payUrl = `pay://${order_no}`
    qrcodeContent.value = code_token || payUrl
    qrcodeB64Ref.value = qrcodeB64
    console.log('[创建支付单] paymentInfo 已设置', paymentInfo.value)
    if (!qrcodeB64) {
      console.warn('[创建支付单] 后端未返回 qrcode_b64（小程序码），请确认接口返回该字段')
    } else {
      console.log('[创建支付单] 收款码展示: 后端返回（小程序码）')
    }
    uni.showToast({ title: '收款码已生成', icon: 'success' })
    startTimer()
  } catch (err) {
    console.error('创建支付单失败', err)
    uni.showToast({
      title: err?.message || err?.msg || '创建失败',
      icon: 'none',
      duration: 2500
    })
  } finally {
    creating.value = false
  }
}

async function onRefreshCode() {
  const order_no = paymentInfo.value?.order_no
  if (!order_no) {
    uni.showToast({ title: '请先生成支付单', icon: 'none' })
    return
  }
  if (refreshingCode.value) return
  refreshingCode.value = true
  try {
    const res = await refreshCollectionCode(order_no)
    if (res != null && typeof res === 'string' && res.trim()) {
      qrcodeContent.value = res.trim()
      uni.showToast({ title: '收款码已刷新', icon: 'success' })
    } else if (res && typeof res === 'object' && (res.qrcode_content || res.code)) {
      qrcodeContent.value = res.qrcode_content || res.code
      uni.showToast({ title: '收款码已刷新', icon: 'success' })
    } else {
      uni.showToast({ title: '刷新成功', icon: 'success' })
    }
  } catch (err) {
    console.error('刷新收款码失败', err)
    const msg = err?.errorMsg || err?.message || err?.msg || err?.detail || '订单不存在或状态异常'
    uni.showToast({
      title: String(msg).trim() || '刷新失败',
      icon: 'none',
      duration: 2500
    })
  } finally {
    refreshingCode.value = false
  }
}

async function regenerate() {
  await onCreate()
}

/** 后端小程序码图片加载失败时改用普通二维码展示 */
function onQrcodeImageError() {
  const pre = (qrcodeB64Ref.value || '').substring(0, 50)
  if (pre.startsWith('eyJ')) {
    console.warn('[创建支付单] qrcode_b64 疑似 JSON 的 base64，非图片，已改用普通二维码')
  } else {
    console.warn('[创建支付单] 小程序码图片加载失败，已改用普通二维码')
  }
  qrcodeB64Ref.value = ''
}

function copyQr() {
  if (!qrcodeContent.value) return
  uni.setClipboardData({
    data: qrcodeContent.value,
    success() {
      uni.showToast({ title: '已复制', icon: 'success' })
    }
  })
}

onMounted(() => {
  // 平台不需要加载店铺
  form.value.store_name = '平台官方'
  form.value.product_name = '平台官方1号商品'
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.create-payment-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 60rpx;
}

.section-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 28rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.section-icon {
  margin-right: 12rpx;
  color: #ff9000;
  font-size: 36rpx;
}

.expires-badge {
  margin-left: auto;
  font-size: 24rpx;
  font-weight: normal;
  color: #999;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: 28rpx;
  color: #666;
}

.form-input {
  height: 80rpx;
  padding: 0 24rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  font-size: 30rpx;
  color: #333;
}

.form-input-readonly {
  display: flex;
  align-items: center;
  color: #666;
}

.form-row-with-btn {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
}
.form-row-with-btn .flex-1 {
  flex: 1;
  min-width: 0;
}
.btn-link {
  font-size: 26rpx;
  color: #666;
  padding: 0 16rpx;
  background: transparent;
  border: none;
  height: auto;
  line-height: 1.5;
}
.btn-link.primary {
  color: #4caf50;
}
.form-hint {
  font-size: 24rpx;
  color: #999;
}

.picker-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.picker-wrap.disabled {
  color: #999;
}
.picker-arrow {
  font-size: 28rpx;
  color: #999;
}

.placeholder {
  color: #bbb;
}

.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 900;
}
.picker-popup {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 70vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 901;
  display: flex;
  flex-direction: column;
}
.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #eee;
}
.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.picker-close {
  font-size: 40rpx;
  color: #999;
  padding: 8rpx;
}
.picker-search {
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.search-input {
  height: 72rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  width: 100%;
  box-sizing: border-box;
}
.picker-list {
  flex: 1;
  height: 400rpx;
  min-height: 300rpx;
}
.list-loading,
.list-empty {
  padding: 48rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
.picker-item {
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.picker-item .item-main {
  font-size: 30rpx;
  color: #333;
}
.picker-item .item-sub {
  font-size: 24rpx;
  color: #999;
}
.picker-item.product-item {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.picker-item.product-item .item-sub {
  color: #ff9000;
  font-size: 28rpx;
}

.btn-primary {
  margin-top: 20rpx;
  display: block;
  width: 100%;
  box-sizing: border-box;
  height: 104rpx;
  line-height: 104rpx;
  padding: 0;
  background: linear-gradient(135deg, #ff9000, #ff5000);
  color: #fff;
  font-size: 36rpx;
  font-weight: 600;
  border-radius: 20rpx;
  border: none;
}

.btn-primary.disabled,
.btn-primary[disabled] {
  opacity: 0.7;
}

.qrcode-wrap {
  display: flex;
  justify-content: center;
  padding: 32rpx 0;
  background: #fafafa;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.qrcode-inner {
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  min-width: 280rpx;
  min-height: 280rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-img {
  width: 220rpx;
  height: 220rpx;
  display: block;
}

.qrcode-placeholder {
  min-width: 280rpx;
  min-height: 220rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  text-align: center;
}
.qrcode-placeholder .placeholder-text {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
}
.qrcode-placeholder .placeholder-hint {
  font-size: 22rpx;
  color: #999;
  line-height: 1.4;
}

.payment-info-list {
  margin-bottom: 28rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row.highlight {
  background: #fffbf0;
  margin: 0 -32rpx;
  padding: 20rpx 32rpx;
  border-radius: 12rpx;
}

.info-label {
  color: #666;
}

.info-value {
  color: #333;
  max-width: 60%;
  text-align: right;
  word-break: break-all;
}

.info-value.mono {
  font-family: monospace;
  font-size: 26rpx;
}

.info-value.amount {
  font-size: 36rpx;
  font-weight: 600;
  color: #ff9000;
}

.qrcode-actions {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}

.btn-secondary {
  flex: 1;
  min-width: 180rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #f5f5f5;
  color: #333;
  font-size: 28rpx;
  border-radius: 12rpx;
  border: none;
}

.btn-secondary[disabled] {
  opacity: 0.6;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.empty-icon {
  font-size: 96rpx;
  color: #ddd;
  margin-bottom: 24rpx;
}
</style>
