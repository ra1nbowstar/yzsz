<template>
	<view class="products-page">
		<!-- 添加商品按钮 -->
		<view class="add-product-btn" @tap="addProduct">
			<text class="add-icon">+</text>
			<text class="add-text">添加新商品</text>
		</view>

		<!-- 商品列表 -->
		<view class="products-list">
			<view 
				v-for="product in products" 
				:key="product.id"
				class="product-card"
			>
				<view class="product-image-wrapper">
					<image :src="getProductImage(product)" class="product-image" mode="aspectFit" @error="onImageError" />
					<view class="product-status status-off">
						<text class="status-text">仅线下</text>
					</view>
				</view>
				
				<view class="product-content">
					<view class="product-header">
						<text class="product-name">{{ product.name }}</text>
						<view class="product-category">
							<text class="category-text">{{ product.category }}</text>
						</view>
					</view>
					
					<view class="product-details">
						<view class="detail-row">
							<text class="detail-label">价格:</text>
							<text class="detail-value price">¥{{ product.price }}</text>
						</view>
						<view class="detail-row">
							<text class="detail-label">销量:</text>
							<text class="detail-value">{{ product.sales }}</text>
						</view>
					</view>
					
					<view class="product-actions">
						<button class="action-btn" @tap="editProduct(product)">
							<text class="btn-text">编辑</text>
						</button>
					</view>
				</view>
			</view>
			
			<!-- 空状态 -->
			<view v-if="products.length === 0" class="empty-state">
				<text class="empty-icon iconfont icon-gouwuchekong"></text>
				<text class="empty-text">暂无商品</text>
				<button class="empty-btn" @tap="addProduct">添加第一个商品</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getShopProductList, getProductList } from '@/api/product.js'
import config from '@/utils/config.js'

// 优先使用商家模式接口 GET /api/users/{user_id}/products；若未导出则回退到 getProductList(only_my_products)
const fetchShopProducts = typeof getShopProductList === 'function'
  ? (params) => getShopProductList(params)
  : (params) => getProductList({ ...params, only_my_products: true })

const stats = ref({
	total: 0,
	onSale: 0,
	soldOut: 0
})

const products = ref([])

/**
 * 加载商品列表（加载所有商品）
 */
const loadProducts = async () => {
	try {
		console.log('[商家商品管理] 开始加载商品列表...')
		
		let allProducts = []
		let page = 1
		const pageSize = 100 // 每次加载100个商品
		let hasMore = true
		
		// 循环加载所有商品，直到返回的data为空数组
		while (hasMore) {
			// 商家管理页面：只查询当前用户的商品
			const res = await fetchShopProducts({ page: page, size: pageSize })
			console.log(`[商家商品管理] 第${page}页API响应:`, res)
			
			// 检查响应格式：可能返回 { status, total, page, size, data: [] }
			let productList = []
			if (res.data && Array.isArray(res.data)) {
				// 如果 data 是数组
				productList = res.data
			} else if (res.data?.data && Array.isArray(res.data.data)) {
				// 如果 data.data 是数组
				productList = res.data.data
			} else if (res.data?.list && Array.isArray(res.data.list)) {
				// 如果 data.list 是数组
				productList = res.data.list
			} else if (Array.isArray(res.list)) {
				// 如果 list 是数组
				productList = res.list
			} else if (Array.isArray(res.data)) {
				// 如果直接是数组
				productList = res.data
			}
			
			console.log(`[商家商品管理] 第${page}页解析出的商品数量:`, productList.length)
			
			// 如果返回的data为空数组，停止加载
			if (productList.length === 0) {
				console.log(`[商家商品管理] 第${page}页返回空数组，停止加载`)
				hasMore = false
				break
			}
			
			allProducts = [...allProducts, ...productList]
			console.log(`[商家商品管理] 累计商品数量:`, allProducts.length)
			
			// 继续加载下一页
			page++
		}
		
		console.log('[商家商品管理] 总共加载商品数量:', allProducts.length)
		
		const productList = allProducts
		
		// 过滤掉轮播图商品（名称包含"轮播图"或SKU以"BANNER-"开头）
		const filteredProductList = productList.filter(p => {
			const productName = (p.name || '').toLowerCase()
			const isBannerByName = productName.includes('轮播图')
			
			// 检查SKU
			let isBannerBySku = false
			if (p.skus && p.skus.length > 0) {
				const skuCode = (p.skus[0].sku_code || p.skus[0].sku || '').toUpperCase()
				isBannerBySku = skuCode.startsWith('BANNER-')
			}
			if (p.sku_code) {
				const skuCode = (p.sku_code || '').toUpperCase()
				isBannerBySku = isBannerBySku || skuCode.startsWith('BANNER-')
			}
			
			if (isBannerByName || isBannerBySku) {
				console.log(`[商家商品管理] 过滤掉轮播图商品: ${p.name} (ID: ${p.id})`)
				return false
			}
			return true
		})
		
		console.log('[商家商品管理] 过滤轮播图后商品数量:', filteredProductList.length, '原始数量:', productList.length)
		
		// 转换为前端格式
		products.value = filteredProductList.map(p => {
			// 处理价格：优先使用 skus 中的价格
			let price = 0
			if (p.skus && p.skus.length > 0 && p.skus[0].price) {
				price = parseFloat(p.skus[0].price)
			} else if (p.price) {
				price = parseFloat(p.price)
			}
			
			// 处理图片：优先使用 main_image，然后尝试其他字段
			let image = p.main_image || 
				p.image_url || 
				p.image || 
				(p.images && p.images.length > 0 ? p.images[0] : null) ||
				(p.banner_images && p.banner_images.length > 0 ? p.banner_images[0] : null) ||
				null
			
			// 如果图片是相对路径，需要拼接服务器地址
			if (image && !image.startsWith('http') && !image.startsWith('/static')) {
				const imagePath = image.startsWith('/') ? image : `/${image}`
				image = `${config.baseURL}${imagePath}`
			}
			
			// 处理库存：从 skus 中汇总
			let stock = 0
			if (p.skus && Array.isArray(p.skus)) {
				stock = p.skus.reduce((sum, sku) => sum + (parseInt(sku.stock) || 0), 0)
			} else if (p.stock !== undefined) {
				stock = parseInt(p.stock)
			}
			
			const product = {
				id: p.id,
				name: p.name,
				category: p.category,
				price: price,
				stock: stock,
				sales: parseInt(p.sales || 0),
				status: p.status === 1 || p.status === 'on_sale' ? 'on_sale' : 
				         p.status === 2 || p.status === 'sold_out' ? 'sold_out' : 'off_sale',
				image: image, // 主图
				main_image: image, // 兼容字段
				banner_images: p.banner_images || (image ? [image] : []), // 轮播图数组
				images: p.banner_images || (image ? [image] : []), // 兼容字段
				description: p.description || '',
				isVip: p.is_member_product || false,
				productType: p.is_member_product ? 'vip' : 'normal'
			}
			console.log(`[商家商品管理] 商品 ${p.id} 图片信息:`, {
				main_image: p.main_image,
				banner_images: p.banner_images,
				images: p.images,
				final_image: product.image,
				price: product.price,
				stock: product.stock
			})
			return product
		})
		
		console.log('[商家商品管理] 转换后的商品列表:', products.value)
	
	// 更新统计
	updateStats()
		
		if (products.value.length === 0) {
			console.warn('[商家商品管理] 商品列表为空')
		}
	} catch (error) {
		console.error('[商家商品管理] 加载商品列表失败', error)
		products.value = []
		updateStats()
		uni.showToast({ title: '加载商品失败: ' + (error.message || '网络错误'), icon: 'none' })
	}
}

/**
 * 更新统计数据
 */
const updateStats = () => {
	stats.value.total = products.value.length
	stats.value.onSale = products.value.filter(p => p.status === 'on_sale').length
	stats.value.soldOut = products.value.filter(p => p.status === 'sold_out' || p.stock === 0).length
}

// 页面加载时加载商品
onMounted(async () => {
	await loadProducts()
})

// 每次显示页面时重新加载商品
onShow(async () => {
	await loadProducts()
})

const getStatusText = (status) => {
	if (status === 'on_sale' || status === 'on' || status === 1) return '在售'
	if (status === 'sold_out' || status === 2) return '售空'
	return '下架'
}

const getStatusClass = (status) => {
	if (status === 'on_sale' || status === 'on' || status === 1) return 'status-on'
	if (status === 'sold_out' || status === 2) return 'status-sold-out'
	return 'status-off'
}

const getStockClass = (stock) => {
	if (stock === 0) return 'out'
	if (stock < 10) return 'low'
	return 'normal'
}

const addProduct = () => {
	uni.navigateTo({ url: '/subPackages/page1/pages/merchant/product-add?from=shop' })
}

const editProduct = (product) => {
	uni.navigateTo({ url: `/subPackages/page1/pages/merchant/product-add?id=${product.id}&from=shop` })
}

/**
 * 获取商品图片
 */
const getProductImage = (product) => {
	// 优先使用处理好的 image 字段
	if (product.image) {
		return product.image
	}
	// 然后尝试 main_image
	if (product.main_image) {
		return product.main_image
	}
	// 尝试数组字段
	if (product.banner_images && product.banner_images.length > 0) {
		const img = product.banner_images[0]
		// 如果是相对路径，拼接服务器地址
		if (img && !img.startsWith('http') && !img.startsWith('/static')) {
			const imagePath = img.startsWith('/') ? img : `/${img}`
			return `${config.baseURL}${imagePath}`
		}
		return img
	}
	if (product.images && product.images.length > 0) {
		const img = product.images[0]
		if (img && !img.startsWith('http') && !img.startsWith('/static')) {
			const imagePath = img.startsWith('/') ? img : `/${img}`
			return `${config.baseURL}${imagePath}`
		}
		return img
	}
	// 默认图片
	return '/static/product1.jpg'
}

/**
 * 图片加载错误处理
 */
const onImageError = (e) => {
	console.log('商品图片加载失败:', e)
	// 可以在这里设置默认图片
}

</script>

<style scoped>
/* 引入 iconfont 样式 */
@import "@/static/999/iconfont.css";

.products-page {
	min-height: 100vh;
	background: #f5f5f5;
	padding: 24rpx 0 40rpx;
}

.add-product-btn {
	margin: 30rpx;
	background: linear-gradient(135deg, #4caf50, #66bb6a);
	border-radius: 16rpx;
	padding: 30rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	color: white;
	box-shadow: 0 8rpx 24rpx rgba(76, 175, 80, 0.3);
}

.add-icon {
	font-size: 32rpx;
	font-weight: bold;
}

.add-text {
	font-size: 28rpx;
	font-weight: 600;
}

.products-list {
	padding: 0 20rpx 20rpx;
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	grid-column-gap: 20rpx;
	grid-row-gap: 20rpx;
}

.product-card {
	background: white;
	border-radius: 20rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.product-image-wrapper {
	position: relative;
	width: 100%;
	/* 1:1 比例，图片用 aspectFit 完整显示不裁剪 */
	aspect-ratio: 1;
	background: #f5f5f5;
}

.product-image {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.product-status {
	position: absolute;
	top: 16rpx;
	right: 16rpx;
	padding: 8rpx 20rpx;
	border-radius: 20rpx;
	font-size: 22rpx;
	font-weight: 600;
}

.product-status.status-on {
	background: #4caf50;
	color: white;
}

.product-status.status-sold-out {
	background: #ff9800;
	color: white;
}

.product-status.status-off {
	background: #f44336;
	color: white;
}

.product-content {
	padding: 16rpx;
}

.product-header {
	margin-bottom: 8rpx;
}

.product-name {
	font-size: 26rpx;
	font-weight: 600;
	color: #333;
	line-height: 1.4;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.product-category {
	margin-top: 6rpx;
	padding: 4rpx 10rpx;
	background: #f0f4ff;
	border-radius: 10rpx;
	display: inline-block;
}

.category-text {
	font-size: 20rpx;
	color: #667eea;
}

.product-details {
	background: #f8f9fa;
	border-radius: 12rpx;
	padding: 12rpx;
	margin: 8rpx 0 12rpx;
}

.detail-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12rpx;
}

.detail-row:last-child {
	margin-bottom: 0;
}

.detail-label {
	font-size: 22rpx;
	color: #666;
}

.detail-value {
	font-size: 24rpx;
	color: #333;
	font-weight: 600;
}

.detail-value.price {
	color: #4caf50;
	font-size: 26rpx;
}

.detail-value.normal {
	color: #4caf50;
}

.detail-value.low {
	color: #ff9800;
}

.detail-value.out {
	color: #f44336;
}

.product-actions {
	display: flex;
	gap: 8rpx;
}

.action-btn {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 12rpx;
	background: #f5f5f5;
	border-radius: 999rpx;
	border: none;
	font-size: 22rpx;
	color: #666;
}

.action-btn.danger {
	background: #ffebee;
	color: #f44336;
}

.btn-text {
	font-size: 24rpx;
}

.empty-state {
	text-align: center;
	padding: 120rpx 0;
	grid-column: 1 / -1;
}

.empty-icon {
	display: block;
	font-size: 120rpx;
	margin-bottom: 20rpx;
	opacity: 0.3;
	color: #ddd;
}

.empty-text {
	display: block;
	font-size: 28rpx;
	color: #999;
	margin-bottom: 30rpx;
}

.empty-btn {
	width: 300rpx;
	height: 72rpx;
	background: #4caf50;
	color: white;
	font-size: 26rpx;
	border-radius: 36rpx;
	border: none;
}
</style>
