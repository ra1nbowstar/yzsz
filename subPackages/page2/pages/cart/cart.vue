<template>
  <view class="cart-page">
    <scroll-view 
      class="page-scroll"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @refresherrestore="onRestore"
    >
    <!-- 购物车列表 -->
    <view v-if="cartItems.length > 0" class="cart-content">
      <view class="cart-header">
        <view class="select-all" @tap="toggleSelectAll">
          <text class="checkbox" :class="isAllSelected ? 'checked' : ''">{{ isAllSelected ? '✓' : '' }}</text>
          <text class="select-text">全选</text>
        </view>
        <view class="header-right">
        <text class="cart-count">共{{ totalItemCount }}件商品</text>
          <button class="clear-cart-btn" @tap="clearCart">清空购物车</button>
        </view>
      </view>
      
      <view class="cart-list">
        <view 
          v-for="item in cartItems" 
          :key="item.id"
          class="cart-item"
        >
          <view class="item-select" @tap="toggleSelect(item.id)">
            <text class="checkbox" :class="item.selected ? 'checked' : ''">{{ item.selected ? '✓' : '' }}</text>
          </view>
          
          <image :src="item.image" class="item-image" mode="aspectFill" />
          
          <view class="item-info">
            <text class="item-name">{{ item.name }}</text>
            <text v-if="item.spec" class="item-spec">{{ item.spec }}</text>
            <view class="item-price-row">
              <text class="item-price">¥{{ item.price }}</text>
              <view v-if="item.isVip" class="vip-badge">
                <text class="badge-text">会员</text>
              </view>
            </view>
          </view>
          
          <view class="item-actions">
            <view class="quantity-control">
              <view 
                class="quantity-btn" 
                :class="{ disabled: item.quantity <= 1 }"
                @tap="decreaseQuantity(item.id)"
              >
                <text class="btn-text">-</text>
              </view>
              <text class="quantity-text">{{ item.quantity }}</text>
              <view 
                class="quantity-btn"
                :class="{ disabled: item.quantity >= item.stock }"
                @tap="increaseQuantity(item.id)"
              >
                <text class="btn-text">+</text>
              </view>
            </view>
            
            <view class="delete-btn" @tap="removeItem(item.id)">
              <text class="delete-text">删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 空购物车 -->
    <view v-else class="empty-cart">
      <text class="empty-icon iconfont icon-gouwuche"></text>
      <text class="empty-text">购物车是空的</text>
      <text class="empty-desc">快去挑选心仪的商品吧</text>
      <button class="go-shopping-btn" @tap="goShopping">去购物</button>
    </view>
    </scroll-view>
    
    <!-- 底部结算栏 - 固定在底部 -->
    <view v-if="cartItems.length > 0" class="bottom-bar">
      <view class="total-info">
        <text class="total-label">合计：</text>
        <text class="total-price">¥{{ totalPrice }}</text>
      </view>
      <button 
        class="checkout-btn" 
        :disabled="selectedItems.length === 0"
        @tap="checkout"
      >
        结算({{ selectedItems.length }})
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getCartList, updateCartItem, deleteCartItem, decreaseCartItem, updateCartSelection, clearCart as clearCartApi, addToCart } from '../../api/cart.js'
import { getProductDetail } from '@/api/product.js'
import config from '@/utils/config.js'
import { setTabBarBadge, removeTabBarBadge } from '@/utils/tabbar.js'

const refreshing = ref(false)

// 购物车商品列表
const cartItems = ref([])

// 已选中的商品
const selectedItems = computed(() => {
  return cartItems.value.filter(item => item.selected)
})

// 是否全选
const isAllSelected = computed(() => {
  return cartItems.value.length > 0 && cartItems.value.every(item => item.selected)
})

// 总价
const totalPrice = computed(() => {
  const total = selectedItems.value.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0
    const quantity = parseInt(item.quantity) || 0
    return sum + (price * quantity)
  }, 0)
  return total.toFixed(2)
})

// 购物车商品总数量（所有商品的数量总和）
const totalItemCount = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    return sum + (item.quantity || 0)
  }, 0)
})

/**
 * 检查登录状态
 */
const checkLogin = () => {
	const token = uni.getStorageSync('token')
	const userInfo = uni.getStorageSync('userInfo') || {}
	const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
	const mobile = userInfo.mobile || userInfo.phone
	const isLoggedIn = !!(token && (userId || (mobile && /^\d{11}$/.test(mobile))))
	
	if (!isLoggedIn) {
		uni.showToast({
			title: '请先登录',
			icon: 'none'
		})
		setTimeout(() => {
			uni.navigateTo({
				url: '/pages/index/index'
			})
		}, 500)
		return false
	}
	return true
}

/**
 * 切换全选
 */
const toggleSelectAll = async () => {
	if (!checkLogin()) {
		return
	}
  const selectAll = !isAllSelected.value
  try {
    const ids = cartItems.value.map(item => item.id)
    await updateCartSelection(ids, selectAll)
    
    cartItems.value.forEach(item => {
      item.selected = selectAll
    })
  } catch (error) {
    console.error('更新选中状态失败', error)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

/**
 * 切换单个商品选中状态
 */
const toggleSelect = (itemId) => {
	if (!checkLogin()) {
		return
	}
  const item = cartItems.value.find(item => item.id === itemId)
  if (item) {
    item.selected = !item.selected
  }
}

/**
 * 加载购物车列表
 */
const loadCartList = async () => {
  try {
    if (!checkLogin()) {
      cartItems.value = []
      return
    }
    
    const userInfo = uni.getStorageSync('userInfo') || {}
    const userId = userInfo.id || userInfo.user_id || userInfo.userId || userInfo.uid
    
    if (!userId) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      cartItems.value = []
      setTimeout(() => {
        uni.navigateTo({
          url: '/pages/index/index'
        })
      }, 500)
      return
    }
    
    const res = await getCartList(userId)
    console.log('[购物车] 接口返回数据:', res)
    
    // 获取购物车原始数据
    const rawItems = res.data?.list || res.data || res || []
    console.log('[购物车] 原始购物车数据:', rawItems)
    
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      cartItems.value = []
      console.log('[购物车] 购物车为空')
      return
    }
    
    // 通过 product_id 获取每个商品的详细信息
    const items = await Promise.all(rawItems.map(async (item) => {
      try {
        // 通过 product_id 获取商品详情
        const productId = item.product_id
        if (!productId) {
          console.warn('[购物车] 商品ID为空，跳过:', item)
          return null
        }
        
        console.log('[购物车] 获取商品详情，product_id:', productId)
        const productRes = await getProductDetail(productId)
        const productData = productRes.data || productRes
        
        console.log('[购物车] 商品详情:', productData)
        
        // 获取商品图片（优先使用轮播图的第一张）
        let productImage = '/static/logo.png'
        if (productData.banner_images && Array.isArray(productData.banner_images) && productData.banner_images.length > 0) {
          productImage = productData.banner_images[0]
        } else if (productData.main_image) {
          productImage = productData.main_image
        } else if (productData.image) {
          productImage = productData.image
        }
        
        // 如果是相对路径，拼接服务器地址
        if (productImage && !productImage.startsWith('http') && !productImage.startsWith('/static')) {
          const imagePath = productImage.startsWith('/') ? productImage : `/${productImage}`
          productImage = `${config.baseURL}${imagePath}`
        }
        
        // 获取商品价格（优先使用SKU的价格）
        let productPrice = parseFloat(item.unit_price || item.price || 0)
        if (productData.skus && productData.skus.length > 0 && productData.skus[0].price) {
          productPrice = parseFloat(productData.skus[0].price)
        } else if (productData.price) {
          productPrice = parseFloat(productData.price)
        }
        
        // 获取商品库存（从SKU中汇总）
        let productStock = 999
        if (productData.skus && Array.isArray(productData.skus)) {
          productStock = productData.skus.reduce((sum, sku) => sum + (parseInt(sku.stock) || 0), 0)
        } else if (productData.stock !== undefined) {
          productStock = parseInt(productData.stock)
        }
        
        // 处理规格信息：从 specifications 对象转换为可读的文本格式
        let specText = ''
        if (item.specifications && typeof item.specifications === 'object') {
          // 将规格对象转换为文本，如：{ "颜色": "黑色", "尺寸": "大" } -> "颜色：黑色；尺寸：大"
          const specArray = Object.keys(item.specifications).map(key => {
            const value = item.specifications[key]
            if (value !== null && value !== undefined && value !== '') {
              return `${key}：${value}`
            }
            return null
          }).filter(Boolean)
          specText = specArray.join('；')
        } else if (item.spec) {
          specText = item.spec
        } else if (item.sku) {
          specText = item.sku
        }
        
        return {
          id: item.id || item.cart_id,
          productId: productId,
          sku_id: item.sku_id ?? item.skuId ?? null,
          name: productData.name || item.product_name || item.name || '未知商品',
          price: productPrice,
          quantity: parseInt(item.quantity || 1),
          stock: productStock,
          spec: specText,
          specifications: item.specifications || null, // 保留原始规格对象
          image: productImage,
          isVip: productData.is_member_product === true || productData.is_member_product === 1 || item.is_member_product === 1 || false,
          selected: item.selected === 1 || item.selected === true || false
        }
      } catch (productError) {
        console.error('[购物车] 获取商品详情失败:', productError, 'item:', item)
        // 如果获取商品详情失败，使用购物车返回的基本信息
        // 处理规格信息：从 specifications 对象转换为可读的文本格式
        let specText = ''
        if (item.specifications && typeof item.specifications === 'object') {
          const specArray = Object.keys(item.specifications).map(key => {
            const value = item.specifications[key]
            if (value !== null && value !== undefined && value !== '') {
              return `${key}：${value}`
            }
            return null
          }).filter(Boolean)
          specText = specArray.join('；')
        } else if (item.spec) {
          specText = item.spec
        } else if (item.sku) {
          specText = item.sku
        }
        
        return {
          id: item.id || item.cart_id,
          productId: item.product_id,
          sku_id: item.sku_id ?? item.skuId ?? null,
          name: item.product_name || item.name || '未知商品',
          price: parseFloat(item.unit_price || item.price || 0),
          quantity: parseInt(item.quantity || 1),
          stock: parseInt(item.stock || 999),
          spec: specText,
          specifications: item.specifications || null, // 保留原始规格对象
          image: item.product_image || item.image || '/static/logo.png',
          isVip: item.is_member_product === 1 || false,
          selected: item.selected === 1 || item.selected === true || false
        }
      }
    }))
    
    // 过滤掉 null 值
    cartItems.value = items.filter(item => item !== null)
    console.log('[购物车] 加载成功，共', cartItems.value.length, '件商品')
    
    // 更新tabbar购物车数量徽章（购物车tabbar索引通常是1）
    updateCartBadge()
  } catch (error) {
    console.error('加载购物车失败', error)
    cartItems.value = []
    // 如果加载失败，也更新徽章（可能购物车为空）
    updateCartBadge()
    uni.showToast({ title: '加载购物车失败', icon: 'none' })
  }
}

/**
 * 更新购物车tabbar徽章
 */
const updateCartBadge = () => {
  try {
    // 计算购物车总数量（所有商品的数量总和）
    const totalQuantity = cartItems.value.reduce((sum, item) => {
      return sum + (item.quantity || 0)
    }, 0)
    
    console.log('[购物车] 更新tabbar徽章，总数量:', totalQuantity, '商品种类:', cartItems.value.length)
    
    // 注意：根据pages.json，tabbar中没有购物车页面
    // tabbar顺序：0-首页, 1-团队, 2-通知, 3-我的
    // 购物车徽章可能显示在商品详情页的底部操作栏，而不是tabbar
    // 这里我们保存到本地存储，供其他页面使用
    // 如果将来购物车加入tabbar，可以在这里更新徽章
    
    // 同时保存到本地存储，供其他页面使用
    uni.setStorageSync('cartCount', totalQuantity)
  } catch (error) {
    console.error('[购物车] 更新徽章失败:', error)
  }
}

/**
 * 减少数量（调用扣减接口）
 */
const decreaseQuantity = async (itemId) => {
	if (!checkLogin()) {
		return
	}
  const item = cartItems.value.find(item => item.id === itemId)
  if (!item) {
    uni.showToast({ title: '商品不存在', icon: 'none' })
    return
  }
  
  if (item.quantity <= 1) {
    // 如果数量为1，直接删除商品
    removeItem(itemId)
    return
  }
  
  try {
    const userInfo = uni.getStorageSync('userInfo') || {}
    const userId = userInfo.id || userInfo.user_id || userInfo.userId || userInfo.uid
    
    if (!item.productId) {
      uni.showToast({ title: '商品信息错误', icon: 'none' })
      return
    }
    
    console.log('[购物车] 减少数量，调用扣减接口，userId:', userId, 'productId:', item.productId, 'quantity:', item.quantity)
    
    // 构建扣减请求数据
    const decreaseData = {
      user_id: userId,
      product_id: item.productId,
      quantity: 1 // 每次减少1个
    }
    
    // 如果有规格信息，也传递过去
    if (item.specifications && typeof item.specifications === 'object') {
      decreaseData.specifications = item.specifications
    }
    
    // 调用 POST /cart/decrease 接口
    await decreaseCartItem(decreaseData)
    
    // 重新加载购物车数据以确保数据同步
    await loadCartList()
    
    uni.showToast({ title: '已更新', icon: 'success' })
  } catch (error) {
    console.error('[购物车] 扣减商品数量失败:', error)
    uni.showToast({ 
      title: error.message || error.msg || '更新失败，请重试', 
      icon: 'none' 
    })
    // 如果更新失败，重新加载数据恢复状态
    await loadCartList()
  }
}

/**
 * 增加数量（把同样的商品加入购物车）
 */
const increaseQuantity = async (itemId) => {
	if (!checkLogin()) {
		return
	}
  const item = cartItems.value.find(item => item.id === itemId)
  if (!item) {
    uni.showToast({ title: '商品不存在', icon: 'none' })
    return
  }
  
  if (item.quantity >= item.stock) {
    uni.showToast({ title: '库存不足', icon: 'none' })
    return
  }
  
  try {
    const userInfo = uni.getStorageSync('userInfo') || {}
    const userId = userInfo.id || userInfo.user_id || userInfo.userId || userInfo.uid
    
    if (!item.productId) {
      uni.showToast({ title: '商品信息错误', icon: 'none' })
      return
    }
    
    console.log('[购物车] 增加数量，把同样的商品加入购物车，userId:', userId, 'productId:', item.productId)
    
    // 构建加入购物车的数据
    const cartData = {
      user_id: userId,
      product_id: item.productId,
      quantity: 1 // 每次增加1个
    }
    
    // 如果有规格信息，也传递过去
    if (item.specifications && typeof item.specifications === 'object') {
      cartData.specifications = item.specifications
    }
    
    // 调用加入购物车接口
    await addToCart(cartData)
    
    // 重新加载购物车数据以确保数据同步
    await loadCartList()
    
    uni.showToast({ title: '已更新', icon: 'success' })
  } catch (error) {
    console.error('[购物车] 加入购物车失败:', error)
    uni.showToast({ 
      title: error.message || error.msg || '更新失败，请重试', 
      icon: 'none' 
    })
    // 如果更新失败，重新加载数据恢复状态
    await loadCartList()
  }
}

/**
 * 删除商品
 */
const removeItem = (itemId) => {
	if (!checkLogin()) {
		return
	}
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const item = cartItems.value.find(item => item.id === itemId)
          const userInfo = uni.getStorageSync('userInfo') || {}
          const userId = userInfo.id || userInfo.user_id
          
          if (!item || !item.productId) {
            uni.showToast({ title: '商品信息错误', icon: 'none' })
            return
          }
          
          // 调用API删除商品
          await deleteCartItem(userId, item.productId)
          
          // API调用成功后才从列表中删除
          const index = cartItems.value.findIndex(item => item.id === itemId)
          if (index > -1) {
            cartItems.value.splice(index, 1)
          }
          
          updateCartBadge() // 更新徽章
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch (error) {
          console.error('删除失败', error)
          uni.showToast({ 
            title: error.message || error.msg || '删除失败，请重试', 
            icon: 'none' 
          })
        }
      }
    }
  })
}

/**
 * 去购物
 */
const goShopping = () => {
  uni.switchTab({ url: '/pages/home/home' })
}

/**
 * 清空购物车
 */
const clearCart = () => {
	if (!checkLogin()) {
		return
	}
  uni.showModal({
    title: '确认清空',
    content: '确定要清空购物车吗？此操作不可恢复',
    success: async (res) => {
      if (res.confirm) {
        try {
          const userInfo = uni.getStorageSync('userInfo') || {}
          const userId = userInfo.id || userInfo.user_id
          
          if (cartItems.value.length === 0) {
            uni.showToast({ title: '购物车已为空', icon: 'none' })
            return
          }
          
          uni.showLoading({ title: '清空中...' })
          
          // 逐个删除购物车中的商品
          const deletePromises = cartItems.value.map(item => {
            if (item && item.productId) {
              return deleteCartItem(userId, item.productId).catch(error => {
                console.error(`删除商品 ${item.productId} 失败:`, error)
                // 即使某个商品删除失败，也继续删除其他商品
                return null
              })
            }
            return Promise.resolve(null)
          })
          
          // 等待所有删除操作完成
          await Promise.all(deletePromises)
          
          // 清空本地购物车列表
          cartItems.value = []
          
          // 更新徽章
          updateCartBadge()
          
          uni.hideLoading()
          uni.showToast({ title: '已清空购物车', icon: 'success' })
        } catch (error) {
          console.error('清空购物车失败', error)
          uni.hideLoading()
          uni.showToast({ 
            title: error.message || error.msg || '清空失败，请重试', 
            icon: 'none' 
          })
        }
      }
    }
  })
}

/**
 * 结算
 */
const checkout = () => {
	if (!checkLogin()) {
		return
	}
  if (selectedItems.value.length === 0) {
    uni.showToast({ title: '请选择商品', icon: 'none' })
    return
  }
  
  // 跳转到订单确认页面（带积分抵扣功能）
  // 标识订单来源为购物车，后端会根据此标识决定是否清空购物车
  // 确保传递的商品数据格式正确
  const orderItems = selectedItems.value.map(item => ({
    id: item.productId,
    sku_id: item.sku_id ?? null,
    name: item.name,
    price: parseFloat(item.price) || 0,
    quantity: parseInt(item.quantity) || 1,
    image: item.image || '/static/logo.png',
    isVip: item.isVip || false,
    spec: item.spec || '', // 规格文本
    specifications: item.specifications || null, // 保留原始规格对象
    cart_id: item.id // 保留购物车项ID，用于后端识别
  }))
  
  const orderData = {
    items: orderItems,
    totalPrice: parseFloat(totalPrice.value) || 0,
    source: 'cart'  // 标识来自购物车
  }
  
  console.log('[购物车结算] 订单数据:', orderData)
  console.log('[购物车结算] 选中商品数量:', selectedItems.value.length)
  console.log('[购物车结算] 总价:', totalPrice.value)
  
  uni.navigateTo({ 
    url: `/subPackages/page2/pages/order/confirm-with-points?data=${encodeURIComponent(JSON.stringify(orderData))}` 
  })
}

/**
 * 下拉刷新
 */
const onRefresh = async () => {
  refreshing.value = true
  await loadCartList()
  setTimeout(() => {
    refreshing.value = false
  }, 500)
}

/**
 * 刷新恢复
 */
const onRestore = () => {
  refreshing.value = false
}

onMounted(() => {
  console.log('购物车页面加载')
  loadCartList()
})

onShow(() => {
  // 页面显示时刷新购物车数据
  console.log('购物车页面显示')
  loadCartList()
})
</script>

<style scoped>
.cart-page {
  background: #f5f5f5;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-scroll {
  flex: 1;
  height: 100%;
  padding-bottom: 120rpx; /* 为底部结算栏留出空间 */
}

.cart-content {
  padding: 40rpx;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.checkbox {
  font-size: 32rpx;
}

.select-text {
  font-size: 28rpx;
  color: #333;
}

.cart-count {
  font-size: 26rpx;
  color: #666;
}

.clear-cart-btn {
  padding: 8rpx 20rpx;
  background: #ffebee;
  color: #f44336;
  border-radius: 20rpx;
  font-size: 24rpx;
  border: none;
  height: auto;
  line-height: 1.5;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.cart-item {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.item-select {
  display: flex;
  align-items: center;
}

.item-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
}

.item-info {
  flex: 1;
}

.item-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.item-spec {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.item-price-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.item-price {
  font-size: 32rpx;
  color: #ff4757;
  font-weight: bold;
}

.vip-badge {
  padding: 4rpx 12rpx;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #8b4513;
  border-radius: 12rpx;
  font-size: 20rpx;
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  overflow: hidden;
}

.quantity-btn {
  width: 60rpx;
  height: 50rpx;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #666;
}

.quantity-btn.disabled {
  opacity: 0.5;
}

.quantity-text {
  width: 80rpx;
  height: 50rpx;
  line-height: 50rpx;
  text-align: center;
  font-size: 26rpx;
  background: white;
}

.delete-btn {
  padding: 8rpx 20rpx;
  background: #ffebee;
  color: #f44336;
  border-radius: 20rpx;
  font-size: 24rpx;
}

/* 空购物车 */
.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
  text-align: center;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 36rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 60rpx;
}

.go-shopping-btn {
  width: 300rpx;
  height: 88rpx;
  background: #ff4757;
  color: white;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;
}

/* 底部结算栏 - 固定在底部 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 20rpx 40rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); /* 适配安全区域 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
  z-index: 100; /* 确保在其他内容之上 */
}

.total-info {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 28rpx;
  color: #333;
}

.total-price {
  font-size: 36rpx;
  color: #ff4757;
  font-weight: bold;
}

.checkout-btn {
  width: 240rpx;
  height: 80rpx;
  background: #ff4757;
  color: white;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 40rpx;
  border: none;
}

.checkout-btn:disabled {
  opacity: 0.5;
}
</style>

<style>
@import "@/static/999/iconfont.css";
</style>