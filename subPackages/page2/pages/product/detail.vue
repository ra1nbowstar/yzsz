<template>
	<view class="detail-page-wrapper">
	<scroll-view class="detail-page" scroll-y enable-back-to-top>
		<!-- 商品轮播图 -->
		<swiper class="product-swiper" :indicator-dots="product.images && product.images.length > 1" :autoplay="product.images && product.images.length > 1" :interval="3000">
			<swiper-item v-for="(img, index) in product.images" :key="index">
				<view class="swiper-item-wrapper">
					<image 
						:src="img" 
						mode="aspectFit" 
						class="swiper-image" 
						@tap="previewImage(img, product.images)"
						@error="handleImageError(img, index, 'banner')"
						:lazy-load="true"
					/>
				</view>
			</swiper-item>
		</swiper>

		<!-- 商品基础信息 -->
		<view class="product-info">
			<view class="price-row">
				<view class="price-box">
					<text class="price-symbol">¥</text>
					<text class="price-value">{{ product.price || 0 }}</text>
					<text class="origin-price" v-if="product.originPrice">¥{{ product.originPrice }}</text>
					<view v-if="product.discount" class="discount-badge">
						<text class="discount-text">{{ product.discount }}折</text>
					</view>
				</view>
				<view class="actions-row">
					<view class="action-btn" @tap="toggleFavorite">
						<text class="action-icon iconfont icon-shoucang" :class="{ 'favorited': isFavorite }"></text>
					</view>
				</view>
			</view>

			<view class="product-header">
				<text class="product-name">{{ product.name }}</text>
				<view class="badges">
					<view v-if="product.isVip" class="badge member-badge">
						<text class="badge-text">会员专享</text>
					</view>
					<view v-if="product.isHot" class="badge hot-badge">
						<text class="badge-text">热销</text>
					</view>
					<view v-if="product.isNew" class="badge new-badge">
						<text class="badge-text">新品</text>
					</view>
				</view>
			</view>

			<!-- 商品标签 -->
			<view v-if="product.tags && product.tags.length > 0" class="product-tags">
				<view v-for="tag in product.tags" :key="tag" class="tag-item">
					<text class="tag-text">{{ tag }}</text>
				</view>
			</view>

			<!-- 会员商品特殊信息 -->
			<view v-if="product.isVip" class="member-benefits">
				<view class="benefits-header">
					<text class="benefits-title">会员权益</text>
				</view>
				<view class="benefit-item">
					<text class="benefit-icon iconfont icon-shoucang"></text>
					<text class="benefit-text">购买后解锁一星等级</text>
				</view>
				<view class="benefit-item">
					<text class="benefit-icon iconfont icon-butie"></text>
					<text class="benefit-text">按实际支付金额获得等价积分</text>
				</view>
				<view class="benefit-item">
					<text class="benefit-icon iconfont icon-youhuijuan"></text>
					<text class="benefit-text">享受推荐奖励</text>
				</view>
				<view class="benefit-item">
					<text class="benefit-icon iconfont icon-xiaoshoutongji"></text>
					<text class="benefit-text">参与周补贴分配</text>
				</view>
			</view>
			
			<!-- 商品描述 -->
			<view v-if="product.desc" class="description-card">
				<view class="description-content">
					<text class="description-text">{{ product.desc }}</text>
				</view>
			</view>

			<!-- 购买规则 -->
			<view v-if="product.buy_rule && product.buy_rule.trim()" class="buy-rule-card">
				<view class="buy-rule-header">
					<text class="buy-rule-title">购买规则</text>
				</view>
				<view class="buy-rule-content">
					<text class="buy-rule-text">{{ product.buy_rule }}</text>
				</view>
			</view>
			<view v-else-if="product.buyRule && product.buyRule.trim()" class="buy-rule-card">
				<view class="buy-rule-header">
					<text class="buy-rule-title">购买规则</text>
				</view>
				<view class="buy-rule-content">
					<text class="buy-rule-text">{{ product.buyRule }}</text>
				</view>
			</view>

			<!-- 商品信息 -->
			<view class="info-row">
				<view class="info-item">
					<text class="info-label">商品编码</text>
					<text class="info-value">{{ product.sku || 'N/A' }}</text>
				</view>
				<view class="info-item">
					<text class="info-label">销量</text>
					<text class="info-value">{{ formatNumber(product.sales || 0) }}件</text>
				</view>
				<view class="info-item">
					<text class="info-label">库存</text>
					<text class="info-value">{{ product.stock || 0 }}件</text>
				</view>
				<view class="info-item">
					<text class="info-label">评价</text>
					<text class="info-value">{{ product.rating || 5.0 }}分</text>
				</view>
			</view>

			<!-- 样式选择（多种规格时展示；只有一种规格时自动选中，不展示选择区域） -->
			<view v-if="productStyles && productStyles.length > 1" class="styles-section">
				<view class="specs-header">
					<text class="specs-title">选择样式</text>
				</view>
				<view class="styles-list">
					<view 
						v-for="(style, styleIndex) in productStyles" 
						:key="styleIndex"
						class="style-option"
						:class="{ 
							active: selectedStyleIndex === styleIndex,
							disabled: !style.available 
						}"
						@tap="selectStyle(styleIndex, style.available)"
					>
						<view class="style-info">
							<text class="style-specs-text">{{ getStyleSpecsText(style.specifications) }}</text>
							<view class="style-price-info">
								<text class="style-price">¥{{ style.price }}</text>
								<text v-if="style.originalPrice && style.originalPrice > parseFloat(style.price)" class="style-original-price">¥{{ style.originalPrice }}</text>
							</view>
						</view>
						<view class="style-stock">
							<text class="stock-text">库存：{{ style.stock }}</text>
						</view>
					</view>
				</view>
				<!-- 选中样式后显示价格 -->
				<view v-if="selectedStyleIndex !== null && selectedStyleIndex >= 0" class="spec-price-display">
					<view class="price-row">
						<text class="price-label">已选样式：</text>
						<text class="price-value">{{ getStyleSpecsText(productStyles[selectedStyleIndex].specifications) }}</text>
					</view>
					<view class="price-row">
						<text class="price-label">价格：</text>
						<text class="price-value">¥{{ currentPrice }}</text>
						<text v-if="currentOriginPrice && currentOriginPrice > parseFloat(currentPrice)" class="origin-price">¥{{ currentOriginPrice }}</text>
					</view>
				</view>
			</view>

			<!-- 数量选择 -->
			<view class="quantity-section">
				<text class="quantity-label">购买数量</text>
				<view class="quantity-selector">
					<view class="quantity-btn" :class="{ disabled: quantity <= 1 }" @tap="decreaseQuantity">
						<text class="btn-text">-</text>
					</view>
					<input 
						v-model.number="quantity" 
						@input="validateQuantity"
						class="quantity-input" 
						type="number" 
						:min="1" 
						:max="product.stock || 999"
						@blur="validateQuantity"
					/>
					<view class="quantity-btn" :class="{ disabled: quantity >= (product.stock || 999) }" @tap="increaseQuantity">
						<text class="btn-text">+</text>
					</view>
				</view>
			</view>

			<!-- 店铺详情 -->
			<view v-if="product.user_id" class="store-detail-section">
				<view class="store-detail-btn" @tap="goToStoreDetail">
					<text class="store-detail-icon iconfont icon-dianpu"></text>
					<text class="store-detail-text">店铺详情</text>
					<text class="store-detail-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 商品详情 -->
		<view class="product-detail">
			<view class="detail-tabs">
				<view 
					v-for="tab in detailTabs" 
					:key="tab.value"
					class="detail-tab"
					:class="{ active: currentTab === tab.value }"
					@tap="switchTab(tab.value)"
				>
					<text class="tab-text">{{ tab.label }}</text>
				</view>
			</view>
			
			<view class="detail-content">
				<!-- 商品详情 -->
				<view v-if="currentTab === 'detail'" class="detail-info">
					<view v-if="product.detailImages && product.detailImages.length > 0" class="detail-images">
						<image 
							v-for="(img, index) in product.detailImages" 
							:key="index"
							:src="img" 
							class="detail-image" 
							mode="widthFix"
							@tap="previewImage(img, product.detailImages)"
						/>
					</view>
					<view v-else class="detail-text">
						<text class="text-content">{{ product.detailDesc || '暂无详细描述' }}</text>
					</view>
				</view>
				
				<!-- 商品参数 -->
				<view v-if="currentTab === 'params'" class="params-info">
					<view v-if="product.params && product.params.length > 0" class="params-list">
						<view v-for="param in product.params" :key="param.name" class="param-item">
							<text class="param-name">{{ param.name }}</text>
							<text class="param-value">{{ param.value }}</text>
						</view>
					</view>
					<view v-else class="no-params">
						<text class="no-params-text">暂无参数信息</text>
					</view>
				</view>
				
				<!-- 用户评价 -->
				<view v-if="currentTab === 'reviews'" class="reviews-info">
					<!-- 评价筛选 -->
					<view class="reviews-filter">
						<view 
							v-for="filter in reviewFilters" 
							:key="filter.value"
							class="filter-item"
							:class="{ active: currentReviewFilter === filter.value }"
							@tap="switchReviewFilter(filter.value)"
						>
							<text class="filter-text">{{ filter.label }}</text>
						</view>
					</view>
					
					<view v-if="filteredReviews && filteredReviews.length > 0" class="reviews-list">
						<view v-for="review in filteredReviews" :key="review.id" class="review-item">
							<view class="review-header">
								<image :src="review.avatar || '/static/logo.png'" class="reviewer-avatar" mode="aspectFill" />
								<view class="reviewer-info">
									<text class="reviewer-name">{{ review.is_anonymous ? '匿名用户' : (review.name || '用户') }}</text>
									<view class="review-rating">
										<text v-for="i in 5" :key="i" class="star iconfont" :class="i <= review.rating ? 'icon-huangguan' : 'icon-shoucang'"></text>
									</view>
								</view>
								<text class="review-time">{{ review.created_at || review.time }}</text>
							</view>
							<text class="review-content">{{ review.content }}</text>
							<view v-if="review.images && review.images.length > 0" class="review-images">
								<image 
									v-for="(img, index) in review.images" 
									:key="index"
									:src="img" 
									class="review-image" 
									mode="aspectFill"
									@tap="previewImage(img, review.images)"
								/>
							</view>
						</view>
					</view>
					<view v-else class="no-reviews">
						<text class="no-reviews-text">暂无评价</text>
					</view>
				</view>
		</view>
	</view>

	</scroll-view>

	<!-- 底部操作栏：独立于 scroll-view 外，避免 iOS 上 fixed 失效，并适配 iPhone 安全区 -->
	<view class="bottom-actions">
		<view class="contact-actions">
			<view class="contact-btn" @tap="contactService">
				<text class="contact-icon iconfont icon-xiaoxi"></text>
				<text class="contact-text">客服</text>
			</view>
			<view class="contact-btn" @tap="goToCart">
				<text class="contact-icon iconfont icon-gouwuche"></text>
				<text class="contact-text">购物车</text>
				<view v-if="cartCount > 0" class="cart-badge">
					<text class="badge-count">{{ cartCount }}</text>
				</view>
			</view>
		</view>
		<view class="purchase-actions">
			<button class="action-btn add-cart" :disabled="isAddingToCart" @tap="addToCart">
				{{ isAddingToCart ? '处理中...' : '加入购物车' }}
			</button>
			<button class="action-btn buy-now" @tap="buyNow">
				立即购买
			</button>
		</view>
	</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
// 商品收藏已改为本地保存，不再使用接口
import { getProductDetail, getProductBannerImages, getProductSales, getProductRules } from '@/api/product.js'
import { addToCart as addToCartApi, getCartList, updateCartItem } from '../../api/cart.js'
// 商品评价接口暂时移除
// // 商品评价接口暂时移除
// import { getProductEvaluations } from '@/api/evaluation.js'
import config from '@/utils/config.js'

const productId = ref('')
const isFavorite = ref(false)
const quantity = ref(1)
const selectedSpecs = ref({})
const currentTab = ref('detail')
const cartCount = ref(0)
const rawProductData = ref(null) // 保存原始商品数据，用于规格选择时匹配 SKU
const isAddingToCart = ref(false) // 防止重复点击
const productStyles = ref([]) // 商品样式列表（每个样式对应一个SKU）
const selectedStyleIndex = ref(null) // 当前选中的样式索引

/**
 * 格式化数字（添加千分位）
 */
const formatNumber = (num) => {
	if (!num && num !== 0) return '0'
	const numStr = String(num)
	if (numStr.length <= 3) return numStr
	return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 评价相关
const productReviews = ref([])
const currentReviewFilter = ref('all')
const reviewFilters = [
	{ label: '全部', value: 'all' },
	{ label: '有图', value: 'image' },
	{ label: '好评', value: 'good' },
	{ label: '中评', value: 'medium' },
	{ label: '差评', value: 'bad' }
]

const filteredReviews = computed(() => {
	if (!productReviews.value || productReviews.value.length === 0) {
		return []
	}
	
	let result = [...productReviews.value]
	
	if (currentReviewFilter.value === 'image') {
		result = result.filter(r => r.images && r.images.length > 0)
	} else if (currentReviewFilter.value === 'good') {
		result = result.filter(r => r.rating >= 4)
	} else if (currentReviewFilter.value === 'medium') {
		result = result.filter(r => r.rating === 3)
	} else if (currentReviewFilter.value === 'bad') {
		result = result.filter(r => r.rating <= 2)
	}
	
	return result
})

// 详情标签
const detailTabs = [
	{ label: '商品详情', value: 'detail' },
	{ label: '规格参数', value: 'params' },
	{ label: '用户评价', value: 'reviews' }
]

// 商品信息
const product = ref({
	id: 1,
	sku: 'VIP-001-2024',
	name: '会员专享商品示例',
	price: 299.00,
	originPrice: 399.00,
	discount: 7.5,
	desc: '这是一个会员专享商品，购买后可以获得相应的会员等级和积分奖励。',
	isVip: true,
	isHot: true,
	isNew: false,
	starLevel: 2,
	points: 299,
	sales: 1580,
	stock: 999,
	rating: 4.8,
	images: [
		'/static/logo.png',
		'/static/logo.png',
		'/static/logo.png'
	],
	tags: ['会员专享', '积分奖励', '等级升级'],
	specs: [
		{
			name: '颜色',
			options: [
				{ label: '红色', value: 'red', available: true },
				{ label: '蓝色', value: 'blue', available: true },
				{ label: '绿色', value: 'green', available: false }
			]
		},
		{
			name: '尺寸',
			options: [
				{ label: 'S', value: 's', available: true },
				{ label: 'M', value: 'm', available: true },
				{ label: 'L', value: 'l', available: true, price: 20 },
				{ label: 'XL', value: 'xl', available: true, price: 50 }
			]
		}
	],
	detailImages: [
		'/static/logo.png',
		'/static/logo.png',
		'/static/logo.png'
	],
	params: [
		{ name: '品牌', value: '示例品牌' },
		{ name: '材质', value: '优质材料' },
		{ name: '产地', value: '中国' },
		{ name: '保质期', value: '2年' }
	],
	reviews: [
		{
			id: 1,
			name: '张***',
			avatar: '/static/logo.png',
			rating: 5,
			content: '商品质量很好，物流也很快，推荐购买！',
			time: '2024-01-15',
			images: ['/static/logo.png']
		},
		{
			id: 2,
			name: '李***',
			avatar: '/static/logo.png',
			rating: 4,
			content: '整体不错，性价比很高。',
			time: '2024-01-14',
			images: []
		}
	]
})

// 判断是否所有规格都已选择
const allSpecsSelected = computed(() => {
	if (!product.value.specs || product.value.specs.length === 0) {
		return false
	}
	return product.value.specs.every(spec => selectedSpecs.value[spec.name])
})

// 当前价格（根据选中的规格显示对应 SKU 的价格）
const currentPrice = computed(() => {
	// 如果所有规格都已选择，使用选中 SKU 的价格
	if (allSpecsSelected.value && rawProductData.value?.skus) {
			// 找到匹配的 SKU
			const matchedSku = rawProductData.value.skus.find(sku => {
				if (!sku.specifications || typeof sku.specifications !== 'object') return false
				return product.value.specs.every(spec => {
					const selectedValue = selectedSpecs.value[spec.name]
					return sku.specifications[spec.name] === selectedValue
				})
			})
			
			if (matchedSku && matchedSku.price !== undefined && matchedSku.price !== null) {
				return parseFloat(matchedSku.price).toFixed(2)
		}
	}
	
	// 如果没有选择规格或找不到匹配的 SKU，使用商品基础价格
	return (product.value.price || 0).toFixed(2)
})

// 当前原价（根据选中的规格显示对应 SKU 的原价）
const currentOriginPrice = computed(() => {
	// 如果所有规格都已选择，使用选中 SKU 的原价
	if (allSpecsSelected.value && rawProductData.value?.skus) {
		// 找到匹配的 SKU
		const matchedSku = rawProductData.value.skus.find(sku => {
			if (!sku.specifications || typeof sku.specifications !== 'object') return false
			return product.value.specs.every(spec => {
				const selectedValue = selectedSpecs.value[spec.name]
				return sku.specifications[spec.name] === selectedValue
			})
		})
		
		if (matchedSku && matchedSku.original_price !== undefined && matchedSku.original_price !== null) {
			return parseFloat(matchedSku.original_price).toFixed(2)
		}
	}
	
	// 如果没有选择规格或找不到匹配的 SKU，使用商品基础原价
	return product.value.originPrice ? parseFloat(product.value.originPrice).toFixed(2) : null
})


/**
 * 将相对路径转为完整网络 URL（小程序 previewImage 要求网络图必须为完整 URL）
 */
const toFullImageUrl = (url) => {
	if (!url || typeof url !== 'string') return ''
	const u = url.trim()
	if (!u) return ''
	if (u.startsWith('http://') || u.startsWith('https://')) return u
	if (u.startsWith('/static')) return u
	const path = u.startsWith('/') ? u : `/${u}`
	const base = config.baseURL || ''
	return base ? `${base.replace(/\/$/, '')}${path}` : u
}

/**
 * 预览图片
 * @param {string} current 当前要显示的图片地址
 * @param {string[]} [urlsArray] 可选，要预览的图片列表（如评价晒图）；不传则用商品轮播图/详情图
 */
const previewImage = (current, urlsArray) => {
	try {
		// 使用传入的图片列表，未传则用商品轮播图（不再根据 currentTab 判断，避免点轮播图却预览到详情图）
		let urls = Array.isArray(urlsArray) && urlsArray.length > 0
			? urlsArray
			: (product.value.images || [])
		
		if (!urls || !Array.isArray(urls)) {
			console.warn('[预览图片] 图片数组无效:', urls)
			uni.showToast({ title: '暂无图片', icon: 'none' })
			return
		}
		
		urls = urls
			.filter(url => url && typeof url === 'string' && url.trim().length > 0)
			.map(toFullImageUrl)
			.filter(Boolean)
		
		if (urls.length === 0) {
			uni.showToast({ title: '暂无图片', icon: 'none' })
			return
		}
		
		let finalCurrent = toFullImageUrl(current && current.trim() ? current : urls[0])
		if (!finalCurrent || !urls.includes(finalCurrent)) {
			finalCurrent = urls[0]
		}
		
		uni.previewImage({
			current: finalCurrent,
			urls,
			fail: (err) => {
				console.error('[预览图片] 预览失败:', err)
				uni.showToast({ title: '预览失败，请检查图片路径', icon: 'none' })
			}
		})
	} catch (error) {
		console.error('[预览图片] 预览出错:', error)
		uni.showToast({ title: '预览失败', icon: 'none' })
	}
}

// 处理图片加载错误
const handleImageError = (img, index, type) => {
	console.error(`[商品详情] 图片加载失败 (${type}, 索引${index}):`, img)
	// 如果图片路径是测试数据，尝试重新加载商品数据
	if (img && (img.includes('/static/product') || img.includes('/static/detail'))) {
		console.warn('[商品详情] 检测到测试图片路径，可能是后端未返回真实图片数据')
		// 可以在这里触发重新加载商品数据
	}
	// 尝试在页面数据中替换为默认图片，避免 500/404 导致的空白
	try {
		if (typeof index === 'number') {
			if (type === 'banner' && product.value && Array.isArray(product.value.images) && product.value.images[index]) {
				product.value.images.splice(index, 1, '/static/logo.png')
				return
			}
			if (type === 'detail' && product.value && Array.isArray(product.value.detailImages) && product.value.detailImages[index]) {
				product.value.detailImages.splice(index, 1, '/static/logo.png')
				return
			}
		}
	} catch (e) {
		console.error('[商品详情] 处理图片错误回退失败：', e)
	}
}

/**
 * 获取本地收藏列表
 */
// 导入收藏工具函数
import { getLocalFavorites, saveLocalFavorites, checkFavoriteStatus as checkFavoriteStatusUtil, addToFavorites as addToFavoritesUtil, removeFromFavorites as removeFromFavoritesUtil } from '../../utils/favorites.js'

/**
 * 检查商品收藏状态（从本地存储，按用户ID）
 */
const checkFavoriteStatusFunc = (productId) => {
	try {
		isFavorite.value = checkFavoriteStatusUtil(productId)
	} catch (error) {
		console.error('检查收藏状态失败', error)
		isFavorite.value = false
	}
}

/**
 * 获取分享用的图片URL
 */
const getShareImageUrl = (product) => {
	// 默认图片
	let productImage = '/static/logo.png'
	
	if (product?.images && product.images.length > 0) {
		const firstImage = product.images[0]
		// 如果不是完整URL，则添加基础URL
		if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
			productImage = firstImage
		} else if (firstImage.startsWith('/pic/')) {
			productImage = `${config.baseURL}${firstImage}`
		} else if (firstImage.startsWith('/')) {
			productImage = `${config.baseURL}${firstImage}`
		} else {
			productImage = `${config.baseURL}/${firstImage}`
		}
	}
	
	console.log('分享图片URL:', productImage)
	return productImage
}

/**
 * 处理分享按钮点击
 */
const handleShareTap = () => {
	console.log('用户点击分享按钮')
	// 显示分享提示
	uni.showToast({
		title: '点击右上角分享给微信好友',
		icon: 'none',
		duration: 2000
	})
}

/**
 * 切换收藏状态（本地保存，按用户ID）
 */
const toggleFavorite = () => {
	try {
		const productData = product.value
		
		// 检查是否已登录
		const userInfo = uni.getStorageSync('userInfo') || {}
		if (!userInfo.id && !userInfo.user_id && !userInfo.userId) {
			uni.showToast({ 
				title: '请先登录', 
				icon: 'none' 
			})
			return
		}
		
		if (isFavorite.value) {
			// 取消收藏
			removeFromFavoritesUtil(productId.value)
			isFavorite.value = false
			uni.showToast({ title: '已取消收藏', icon: 'success' })
		} else {
			// 添加收藏
			const favoriteData = {
				id: productId.value,
				product_id: productId.value,
				name: productData?.name || '',
				images: productData?.images || [],
				image: productData?.image || '',
				banner_images: productData?.banner_images || [],
				price: productData?.price || 0,
				original_price: productData?.original_price || productData?.price || 0,
				is_vip: productData?.is_vip || productData?.isVip || false,
				is_hot: productData?.is_hot || productData?.isHot || false
			}
			
			addToFavoritesUtil(favoriteData)
			isFavorite.value = true
			uni.showToast({ title: '收藏成功', icon: 'success' })
		}
	} catch (error) {
		console.error('收藏操作失败:', error)
		uni.showToast({ 
			title: error.message || '操作失败，请重试', 
			icon: 'none' 
		})
	}
}

/**
 * 分享给微信好友（微信小程序标准API）
 * 使用 open-type="share" 按钮会自动触发此函数
 */
onShareAppMessage((res) => {
	console.log('分享触发', res)
	
	// 获取当前用户信息，用于携带推荐人信息
	const userInfo = uni.getStorageSync('userInfo') || {}
	const userId = userInfo.id || userInfo.user_id || ''
	
	// 构建分享路径，携带商品ID和推荐人信息
	let sharePath = `/subPackages/page2/pages/product/detail?id=${productId.value || ''}`
	if (userId) {
		sharePath += `&referrerId=${userId}`
	}
	
	// 确保有商品数据
	const productName = product.value?.name || '精选商品'
	const productImage = getShareImageUrl(product.value)
	
	// 构建更吸引人的分享内容
	const shareContent = {
		title: productName,
		desc: `我发现了一个很不错的商品，推荐给你！`,
		path: sharePath,
		imageUrl: productImage,
		success: function(res) {
			console.log('分享成功', res)
			uni.showToast({
				title: '分享成功',
				icon: 'success'
			})
		},
		fail: function(res) {
			console.log('分享失败', res)
			uni.showToast({
				title: '分享失败',
				icon: 'error'
			})
		}
	}
	
	console.log('分享内容:', shareContent)
	return shareContent
})

/**
 * 分享到朋友圈（微信小程序标准API）
 */
onShareTimeline(() => {
	console.log('分享到朋友圈触发')
	
	// 获取当前用户信息，用于携带推荐人信息
	const userInfo = uni.getStorageSync('userInfo') || {}
	const userId = userInfo.id || userInfo.user_id || ''
	
	// 构建分享查询参数
	let query = `id=${productId.value || ''}`
	if (userId) {
		query += `&referrerId=${userId}`
	}
	
	// 确保有商品数据
	const productName = product.value?.name || '精选商品'
	const productImage = getShareImageUrl(product.value)
	
	const shareContent = {
		title: `【${productName}】我发现了一个很不错的商品，推荐给你！`,
		query: query,
		imageUrl: productImage,
		success: function(res) {
			console.log('分享到朋友圈成功', res)
			uni.showToast({
				title: '分享成功',
				icon: 'success'
			})
		},
		fail: function(res) {
			console.log('分享到朋友圈失败', res)
			uni.showToast({
				title: '分享失败',
				icon: 'error'
			})
		}
	}
	
	console.log('分享到朋友圈内容:', shareContent)
	return shareContent
})

/**
 * 格式化样式规格文本
 * @param {Object} specifications 规格对象，如 { "颜色": "黑色", "尺寸": "大" }
 * @returns {String} 格式化后的规格文本，如 "颜色：黑色；尺寸：大"
 */
const getStyleSpecsText = (specifications) => {
	if (!specifications || typeof specifications !== 'object') {
		return ''
	}
	
	const specArray = Object.keys(specifications).map(key => {
		const value = specifications[key]
		if (value !== null && value !== undefined && value !== '') {
			return `${key}：${value}`
		}
		return null
	}).filter(Boolean)
	
	return specArray.join('；')
}

/**
 * 选择样式（直接选择样式，每个样式对应一个SKU）
 */
const selectStyle = (styleIndex, available) => {
	if (!available) {
		uni.showToast({ title: '该样式暂时缺货', icon: 'none' })
		return
	}
	
	selectedStyleIndex.value = styleIndex
	const selectedStyle = productStyles.value[styleIndex]
	
	// 确保数量保持为1
	quantity.value = 1
	
	// 更新商品价格和库存
	if (selectedStyle) {
		if (selectedStyle.price !== undefined && selectedStyle.price !== null) {
			product.value.price = parseFloat(selectedStyle.price)
		}
		if (selectedStyle.originalPrice !== undefined && selectedStyle.originalPrice !== null) {
			product.value.originPrice = parseFloat(selectedStyle.originalPrice)
		}
		if (selectedStyle.stock !== undefined && selectedStyle.stock !== null) {
			product.value.stock = parseInt(selectedStyle.stock) || 0
		}
		
		// 更新 selectedSpecs（用于兼容其他地方的逻辑）
		if (selectedStyle.specifications) {
			selectedSpecs.value = { ...selectedStyle.specifications }
		}
		
		console.log('[商品详情] 样式选择后更新:', {
			选中样式索引: styleIndex,
			样式规格: selectedStyle.specifications,
			新价格: product.value.price,
			新原价: product.value.originPrice,
			新库存: product.value.stock
		})
	}
}

/**
 * 减少数量
 */
const decreaseQuantity = () => {
	if (quantity.value > 1) {
		quantity.value--
	}
}

/**
 * 增加数量
 */
const increaseQuantity = () => {
	if (quantity.value < (product.value.stock || 999)) {
		quantity.value++
	}
}

/**
 * 验证数量
 */
const validateQuantity = (e) => {
	// 从输入框事件获取值，确保获取到最新的值
	const inputValue = e?.detail?.value !== undefined ? e.detail.value : (e?.target?.value !== undefined ? e.target.value : quantity.value)
	const numValue = parseInt(inputValue) || 1
	
	if (numValue < 1) {
		quantity.value = 1
	} else if (numValue > (product.value.stock || 999)) {
		quantity.value = product.value.stock || 999
	} else {
		// 确保数量正确更新
		quantity.value = numValue
	}
	
	console.log('[数量验证] 输入值:', inputValue, '处理后:', quantity.value)
}

/**
 * 切换详情标签
 */
const switchTab = (tab) => {
	currentTab.value = tab
}

/**
 * 联系客服
 */
const contactService = () => {
	uni.navigateTo({ url: '/subPackages/page1/pages/service/service' })
}

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
 * 跳转购物车
 */
const goToCart = () => {
	if (!checkLogin()) {
		return
	}
	uni.navigateTo({ url: '/subPackages/page2/pages/cart/cart' })
}

/**
 * 加入购物车
 */
const addToCart = async () => {
	// 防止重复点击
	if (isAddingToCart.value) {
		console.log('[加入购物车] 正在处理中，忽略重复点击')
		return
	}
	
	// 检查库存
	if (!product.value.stock || product.value.stock <= 0) {
		uni.showToast({ title: '商品已售罄', icon: 'none' })
		return
	}
	
	// 检查是否选择了样式
	if (productStyles.value && productStyles.value.length > 0) {
		if (selectedStyleIndex.value === null || selectedStyleIndex.value < 0) {
			uni.showToast({ title: '请选择样式', icon: 'none' })
			return
		}
	}
	
	try {
		isAddingToCart.value = true
		
		// 获取用户信息
		const userInfo = uni.getStorageSync('userInfo') || {}
		const userId = userInfo.id || userInfo.user_id
		
		if (!userId) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			isAddingToCart.value = false
			return
		}
		
		// 获取选中的SKU信息（从选中的样式获取）
		let skuCode = null
		let selectedSku = null
		if (selectedStyleIndex.value !== null && selectedStyleIndex.value >= 0 && productStyles.value[selectedStyleIndex.value]) {
			const selectedStyle = productStyles.value[selectedStyleIndex.value]
			skuCode = selectedStyle.sku_code
			selectedSku = rawProductData.value?.skus?.[selectedStyleIndex.value]
		}
		
		console.log('[加入购物车] 准备添加商品:', {
			product_id: product.value.id,
			quantity: quantity.value,
			sku: skuCode
		})
		
		// 先检查购物车中是否已存在相同的商品和规格
		try {
			const cartRes = await getCartList(userId)
			const cartItems = cartRes.data?.list || cartRes.data || cartRes || []
			
			console.log('[加入购物车] 检查购物车，当前商品:', {
				product_id: product.value.id,
				sku: skuCode,
				quantity: quantity.value
			})
			console.log('[加入购物车] 购物车现有商品:', cartItems)
			
			if (Array.isArray(cartItems) && cartItems.length > 0) {
				// 查找购物车中是否已存在相同的商品和SKU
				const existingItem = cartItems.find(item => {
					// 检查商品ID是否相同
					const itemProductId = item.product_id || item.productId
					if (itemProductId !== product.value.id) {
						return false
					}
					
					// 从购物车项中获取SKU信息（可能存储在多个字段中）
					const itemSku = item.sku || item.sku_code || item.spec || ''
					
					// 如果有SKU，检查SKU是否相同
					if (skuCode) {
						const isMatch = itemSku === skuCode || itemSku === String(skuCode)
						console.log('[加入购物车] SKU匹配检查:', {
							购物车项SKU: itemSku,
							当前SKU: skuCode,
							是否匹配: isMatch
						})
						return isMatch
					} else {
						// 如果没有SKU，检查是否也没有SKU（普通商品）
						const isMatch = !itemSku || itemSku === '' || itemSku === null
						console.log('[加入购物车] 无SKU匹配检查:', {
							购物车项SKU: itemSku,
							是否匹配: isMatch
						})
						return isMatch
					}
				})
				
				if (existingItem) {
					console.log('[加入购物车] 购物车中已存在相同商品，更新数量:', {
						购物车项: existingItem,
						当前数量: existingItem.quantity,
						要添加数量: quantity.value
					})
					
					// 如果已存在，更新数量
					const currentQuantity = parseInt(existingItem.quantity) || 0
					const newQuantity = currentQuantity + quantity.value
					
					// 检查库存限制
					if (newQuantity > product.value.stock) {
						uni.showToast({ 
							title: `库存不足，当前库存${product.value.stock}件`, 
							icon: 'none' 
						})
						isAddingToCart.value = false
						return
					}
					
					// 更新购物车商品数量
					await updateCartItem(existingItem.id, newQuantity)
					
					console.log('[加入购物车] 已更新购物车数量:', {
						购物车项ID: existingItem.id,
						新数量: newQuantity
					})
					
					// 重新加载购物车数量
					await loadCartCount()
					
					uni.showToast({ title: '已更新购物车数量', icon: 'success' })
					isAddingToCart.value = false
					return
				} else {
					console.log('[加入购物车] 购物车中不存在相同商品，将添加新商品')
				}
			} else {
				console.log('[加入购物车] 购物车为空，将添加新商品')
			}
		} catch (cartError) {
			console.error('[加入购物车] 检查购物车失败:', cartError)
			// 如果检查购物车失败，继续执行添加操作（避免因为检查失败而阻止添加）
		}
		
		// 如果购物车中不存在，则添加新商品
		// 确保数量为1（防止被错误设置为其他值）
		const addQuantity = Math.max(1, Math.min(parseInt(quantity.value) || 1, product.value.stock || 999))
		console.log('[加入购物车] 最终添加数量:', addQuantity, '原始数量:', quantity.value)
		
		// 构建规格信息对象（只包含选中的规格）
		const specifications = {}
		if (selectedSpecs.value && typeof selectedSpecs.value === 'object') {
			Object.keys(selectedSpecs.value).forEach(key => {
				const value = selectedSpecs.value[key]
				if (value !== null && value !== undefined && value !== '') {
					specifications[key] = value
				}
			})
		}
		
		await addToCartApi({
			user_id: userId,
			product_id: product.value.id,
			quantity: addQuantity,
			specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
			sku: skuCode // 保留sku字段作为兼容
		})
		
		// 重新加载购物车数量（从接口获取实际数量）
		await loadCartCount()
		
		uni.showToast({ title: '已加入购物车', icon: 'success' })
	} catch (error) {
		console.error('加入购物车失败:', error)
		uni.showToast({ 
			title: error.message || error.msg || '操作失败', 
			icon: 'none' 
		})
	} finally {
		isAddingToCart.value = false
	}
}

/**
 * 立即购买
 */
/**
 * 立即购买
 */
const buyNow = async () => {
	// 1. 基础验证
	const userInfo = uni.getStorageSync('userInfo') || {}
	const userId = userInfo.id || userInfo.user_id
	
	if (!userId) {
		uni.showToast({ title: '请先登录', icon: 'none' })
		return
	}
	
	// 检查库存
	if (!product.value.stock || product.value.stock <= 0) {
		uni.showToast({ title: '商品已售罄', icon: 'none' })
		return
	}
	
	// 检查购买数量是否超过库存
	if (quantity.value > (product.value.stock || 0)) {
		uni.showToast({ title: `库存不足，当前库存${product.value.stock}件`, icon: 'none' })
		return
	}
	
	// 检查是否选择了样式
	if (productStyles.value && productStyles.value.length > 0) {
		if (selectedStyleIndex.value === null || selectedStyleIndex.value < 0) {
			uni.showToast({ title: '请选择样式', icon: 'none' })
			return
		}
	}
	
	// 2. 获取选中的SKU信息（从选中的样式获取）
	let skuCode = null
	let specifications = {}
	if (selectedStyleIndex.value !== null && selectedStyleIndex.value >= 0 && productStyles.value[selectedStyleIndex.value]) {
		const selectedStyle = productStyles.value[selectedStyleIndex.value]
		skuCode = selectedStyle.sku_code
		specifications = selectedStyle.specifications || {}
	}
	
	// 3. 直接跳转到订单确认页面，不加入购物车
	try {
		// 获取用户ID
		const userInfo = uni.getStorageSync('userInfo') || {}
		const userId = userInfo.id || userInfo.user_id
		
		if (!userId) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			return
		}
		
		// 确保数量是整数（从当前值获取，确保是最新的）
		const finalQuantity = Math.max(1, parseInt(quantity.value) || 1)
		console.log('[立即购买] 当前数量值:', quantity.value, '类型:', typeof quantity.value, '最终数量:', finalQuantity)
		
		// 构建当前商品的订单数据（只包含当前商品，不是从购物车）
		const currentProduct = {
			id: product.value.id,
			product_id: product.value.id,
			name: product.value.name,
			price: currentPrice.value || product.value.price || 0,
			quantity: finalQuantity, // 使用处理后的数量
			image: product.value.image || product.value.images?.[0] || '/static/logo.png',
			isVip: product.value.isVip || product.value.productType === 'vip' || false,
			productType: product.value.productType || 'normal',
			max_points_discount: product.value.maxPointsDeduction || product.value.max_points_discount || 0,
			maxPointsDeduction: product.value.maxPointsDeduction || product.value.max_points_discount || 0,
			cash_only: product.value.cash_only, // 新增：传递现金标识
			sku: skuCode || '',
			specs: selectedSpecs.value || {},
			specifications: Object.keys(specifications).length > 0 ? specifications : undefined
		}
		// 添加日志，查看传递给订单确认页的 cash_only 值
		console.log('[立即购买] currentProduct.cash_only:', currentProduct.cash_only);
		const orderData = {
			items: [currentProduct], // 确保只有一个商品
			source: 'direct' // 立即购买是直接购买，不是从购物车结算
		}
		
		// ========== 检查点1：商品详情页 - 立即购买时的数据 ==========
		console.log('========== [检查点1] 商品详情页 - 立即购买 ==========')
		console.log('[检查点1] quantity.value 原始值:', quantity.value, '类型:', typeof quantity.value)
		console.log('[检查点1] parseInt(quantity.value):', parseInt(quantity.value))
		console.log('[检查点1] 最终商品数量:', currentProduct.quantity)
		console.log('[检查点1] 商品信息:', {
			商品ID: currentProduct.id,
			商品名称: currentProduct.name,
			数量: currentProduct.quantity,
			价格: currentProduct.price,
			SKU: currentProduct.sku
		})
		console.log('[检查点1] orderData.items 数组长度:', orderData.items.length)
		console.log('[检查点1] orderData.items 内容:', JSON.stringify(orderData.items, null, 2))
		console.log('========== [检查点1] 结束 ==========')
		
		// 直接跳转到订单确认页面，传递当前商品信息
		uni.navigateTo({ 
			url: `/subPackages/page2/pages/order/confirm-with-points?data=${encodeURIComponent(JSON.stringify(orderData))}` 
		})
	} catch (error) {
		console.error('立即购买失败:', error)
		uni.showToast({ 
			title: error.message || '操作失败', 
			icon: 'none' 
		})
	}
}

/**
 * 加载商品详情
 */
const loadProductDetail = async (id) => {
	try {
		uni.showLoading({ title: '加载中...' })
		// 调用API获取商品详情（轮播图接口不存在，从商品详情接口获取）
		const [detailRes, salesRes, rulesRes] = await Promise.allSettled([
			getProductDetail(id),
			getProductSales(id).catch(() => null),
			getProductRules(id).catch(() => null)
		])
		
		// 轮播图接口不存在，不再调用
		const bannerImagesRes = { status: 'rejected', value: null }
		
		// 处理商品详情
		console.log('[商品详情] API 响应状态:', {
			detailRes_status: detailRes.status,
			detailRes_value: detailRes.value,
			detailRes_reason: detailRes.reason,
			detailRes_error: detailRes.reason?.message || detailRes.reason
		})
		
		// 如果 API 调用失败，抛出更详细的错误
		if (detailRes.status === 'rejected') {
			const errorMsg = detailRes.reason?.message || detailRes.reason?.msg || detailRes.reason || '获取商品详情失败'
			console.error('[商品详情] API 调用失败:', {
				error: detailRes.reason,
				message: errorMsg,
				stack: detailRes.reason?.stack
			})
			throw new Error(errorMsg)
		}
		
		if (detailRes.status === 'fulfilled' && detailRes.value) {
			// 处理后端返回的数据：可能是数组或单个对象
			let productData = detailRes.value.data || detailRes.value
			let productsArray = []
			
			console.log('[商品详情] 原始返回数据:', {
				detailRes_value: detailRes.value,
				detailRes_value_data: detailRes.value.data,
				productData: productData,
				productData_type: typeof productData,
				productData_isArray: Array.isArray(productData),
				productData_keys: productData && typeof productData === 'object' ? Object.keys(productData) : [],
				max_points_discount: productData.max_points_discount,
				max_points_discount类型: typeof productData.max_points_discount
			})
			
			// 验证数据有效性（更宽松的验证）
			if (!productData) {
				console.error('[商品详情] API 返回的数据为 null 或 undefined')
				throw new Error('商品数据为空')
			}
			
			// 如果返回的是数组，提取所有商品数据
			if (Array.isArray(productData)) {
				if (productData.length === 0) {
					console.error('[商品详情] API 返回的数组为空')
					throw new Error('商品数据为空')
				}
				productsArray = productData
				// 使用第一个商品作为主要商品信息
				productData = productData[0] || {}
				console.log('[商品详情] 后端返回数组数据，商品数量:', productsArray.length)
			} else if (typeof productData === 'object') {
				// 如果是单个对象，也放入数组以便统一处理
				productsArray = [productData]
				console.log('[商品详情] 后端返回单个对象数据')
			} else {
				console.error('[商品详情] API 返回的数据格式不正确:', typeof productData)
				throw new Error('商品数据格式不正确')
			}
			
			// 再次验证 productData 是否有效（允许没有 id，使用其他标识）
			if (!productData || (typeof productData === 'object' && Object.keys(productData).length === 0)) {
				console.error('[商品详情] 商品数据无效或为空对象:', productData)
				throw new Error('商品数据无效')
			}
			
			// 如果没有 id，尝试使用其他字段或生成一个临时 id
			if (!productData.id && !productData.product_id) {
				console.warn('[商品详情] 商品数据缺少 id 字段，但继续处理:', productData)
			}
			
			rawProductData.value = productData // 保存原始数据，用于规格选择时匹配 SKU
			console.log('[商品详情] 接口返回的 cash_only 原始值:', productData.cash_only); // ← 添加这一行

			// 处理价格：计算所有 SKU 中的最低价格和最低原价
			let price = 0
			let originPrice = null
			const isMemberProduct = productData.is_member_product === 1 || productData.is_member_product === true
			
			// 从所有 SKU 中找出最低价格和最低原价
			if (productData.skus && productData.skus.length > 0) {
				const prices = productData.skus
					.map(sku => parseFloat(sku.price) || 0)
					.filter(p => p > 0)
				const originalPrices = productData.skus
					.map(sku => parseFloat(sku.original_price) || 0)
					.filter(p => p > 0)
				
				if (prices.length > 0) {
					price = Math.min(...prices)
				}
				if (originalPrices.length > 0) {
					originPrice = Math.min(...originalPrices)
				}
			} else if (productData.price) {
				// 如果没有 SKU，使用商品级别的价格
				price = parseFloat(productData.price)
				if (productData.original_price) {
					originPrice = parseFloat(productData.original_price)
				}
			}
			
			console.log('[商品详情] 价格处理:', {
				price: price,
				originPrice: originPrice,
				skus: productData.skus?.map(sku => ({ price: sku.price, original_price: sku.original_price }))
			})
			
			// 处理轮播图：只使用所有的 banner_image，不使用 main_image
			let bannerImages = []
			
			// 处理图片URL的辅助函数
			const processImageUrl = (img) => {
				if (!img) {
					console.warn('[商品详情] 图片URL为空')
					return null
				}
				// 如果已经是完整URL，直接返回
				if (img.startsWith('http://') || img.startsWith('https://')) {
					console.log(`[商品详情] 图片已是完整URL: ${img}`)
					return img
				}
				// 如果是静态资源，直接返回
				if (img.startsWith('/static')) {
					console.log(`[商品详情] 图片是静态资源: ${img}`)
					return img
				}
				// 处理相对路径：确保以 / 开头
				const imagePath = img.startsWith('/') ? img : `/${img}`
				// 拼接服务器地址（路径中的中文会自动编码）
				const fullUrl = `${config.baseURL}${imagePath}`
				console.log(`[商品详情] 处理图片URL: ${img} -> ${fullUrl}`)
				return fullUrl
			}
			
			// 解析图片数组的辅助函数：处理数组、字符串、null等格式
			const parseImageArray = (images) => {
				if (!images) {
					return []
				}
				// 如果已经是数组，直接返回
				if (Array.isArray(images)) {
					return images.filter(Boolean) // 过滤掉空值
				}
				// 如果是字符串，尝试解析为JSON数组
				if (typeof images === 'string') {
					try {
						const parsed = JSON.parse(images)
						if (Array.isArray(parsed)) {
							return parsed.filter(Boolean)
						}
						// 如果解析后不是数组，当作单个图片路径
						return [images].filter(Boolean)
					} catch (e) {
						// 解析失败，当作单个图片路径
						return [images].filter(Boolean)
					}
				}
				// 其他情况返回空数组
				return []
			}
			
			// 用于去重的 Set
			const addedImagePaths = new Set()
			
			// 第一步：从轮播图列表API获取所有的 banner_image（按 sort_order 排序）
			if (bannerImagesRes.status === 'fulfilled' && bannerImagesRes.value?.data) {
				const bannerList = Array.isArray(bannerImagesRes.value.data) 
					? bannerImagesRes.value.data 
					: (bannerImagesRes.value.data?.list || [])
				
				// 按 sort_order 排序，获取所有有效的 banner_image
				const sortedBanners = bannerList
					.filter(item => item.image_url && item.status !== 0)
					.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
				
				// 添加所有 banner_image（去重）
				sortedBanners.forEach((item, idx) => {
					const bannerUrl = processImageUrl(item.image_url)
					if (bannerUrl) {
						// 检查是否重复（通过路径比较）
						const imagePath = item.image_url.startsWith('/') ? item.image_url : `/${item.image_url}`
						
						if (!addedImagePaths.has(imagePath)) {
							bannerImages.push(bannerUrl)
							addedImagePaths.add(imagePath)
							console.log(`[商品详情] 从轮播图列表API添加图片 ${idx + 1}/${sortedBanners.length}:`, bannerUrl)
						} else {
							console.log(`[商品详情] 跳过重复的图片:`, bannerUrl)
						}
					}
				})
				
				console.log('[商品详情] 从轮播图列表API获取:', {
					总数: sortedBanners.length,
					已添加: bannerImages.length,
					去重后总数: bannerImages.length
				})
			}
			
			// 第二步：使用 productData.banner_images 字段中的所有 banner_image
			const bannerImagesFromData = parseImageArray(productData.banner_images)
			if (bannerImagesFromData.length > 0) {
				console.log('[商品详情] 从 productData.banner_images 字段获取轮播图:', bannerImagesFromData.length, '张')
				
				bannerImagesFromData.forEach((img, idx) => {
					const processedUrl = processImageUrl(img)
					if (processedUrl) {
						// 检查是否重复
						let imagePath = img
						if (img.startsWith('http://') || img.startsWith('https://')) {
							try {
								const url = new URL(img)
								imagePath = url.pathname
							} catch {
								imagePath = img
							}
						} else {
							imagePath = img.startsWith('/') ? img : `/${img}`
						}
						
						if (!addedImagePaths.has(imagePath)) {
							bannerImages.push(processedUrl)
							addedImagePaths.add(imagePath)
							console.log(`[商品详情] 从 banner_images 字段添加图片 ${idx + 1}/${bannerImagesFromData.length}:`, processedUrl)
						} else {
							console.log(`[商品详情] 跳过重复的 banner_image:`, processedUrl)
						}
					}
				})
			}
			
			// 第三步：从 productsArray 中收集所有的 banner_images
			if (productsArray.length > 1) {
				console.log('[商品详情] 从 productsArray 中收集所有 banner_images')
				
				productsArray.forEach((item, index) => {
					if (item.banner_images) {
						const itemBannerImages = parseImageArray(item.banner_images)
						itemBannerImages.forEach(img => {
							const processedUrl = processImageUrl(img)
							if (processedUrl) {
								let imagePath = img
								if (img.startsWith('http://') || img.startsWith('https://')) {
									try {
										const url = new URL(img)
										imagePath = url.pathname
									} catch {
										imagePath = img
									}
								} else {
									imagePath = img.startsWith('/') ? img : `/${img}`
								}
								
								if (!addedImagePaths.has(imagePath)) {
									bannerImages.push(processedUrl)
									addedImagePaths.add(imagePath)
									console.log(`[商品详情] 从商品 ${index + 1} 添加 banner_image:`, processedUrl)
								}
							}
						})
					}
				})
			}
			
			// 如果没有图片，使用默认图片
			if (bannerImages.length === 0) {
				console.warn('[商品详情] 没有找到任何轮播图，使用默认图片')
				bannerImages = ['/static/logo.png']
			} else {
				console.log(`[商品详情] ✅ 成功加载 ${bannerImages.length} 张轮播图（全部为 banner_images）`)
			}
			
			console.log('[商品详情] 轮播图处理完成:', {
				轮播图列表API数量: bannerImagesRes.status === 'fulfilled' ? (Array.isArray(bannerImagesRes.value?.data) ? bannerImagesRes.value.data.length : 0) : 0,
				productData_banner_images数量: bannerImagesFromData?.length || 0,
				最终轮播图数量: bannerImages.length,
				图片列表: bannerImages
			})
			
			// 处理详情图：优先使用当前商品的 detail_images 数组
			let detailImages = []
			const detailImagesArray = parseImageArray(productData.detail_images)
			if (detailImagesArray.length > 0) {
				detailImagesArray.forEach((img, idx) => {
					const processedUrl = processImageUrl(img)
					if (processedUrl) {
						detailImages.push(processedUrl)
						console.log(`[商品详情] 添加详情图 ${idx + 1}/${detailImagesArray.length}:`, processedUrl)
					} else {
						console.warn(`[商品详情] 详情图处理失败，跳过:`, img)
					}
				})
			}
			
			// 如果没有 detail_images，合并所有商品的 detail_images
			if (detailImages.length === 0) {
				productsArray.forEach((item, index) => {
					const itemDetailImages = parseImageArray(item.detail_images)
					if (itemDetailImages.length > 0) {
						itemDetailImages.forEach(img => {
							const processedUrl = processImageUrl(img)
							if (processedUrl) {
								detailImages.push(processedUrl)
								console.log(`[商品详情] 商品 ${index + 1} 添加详情图:`, processedUrl)
							}
						})
					}
				})
			}
			
			console.log('[商品详情] 详情图处理:', {
				商品数量: productsArray.length,
				处理后的数量: detailImages.length,
				图片列表: detailImages
			})
			
			// 处理商品编号：使用 sku_code（优先使用 skus 中的 sku_code）
			let skuCode = ''
			if (productData.skus && productData.skus.length > 0 && productData.skus[0].sku_code) {
				skuCode = productData.skus[0].sku_code
			} else if (productData.sku_code) {
				skuCode = productData.sku_code
			} else {
				skuCode = `PROD-${String(productData.id).padStart(3, '0')}-2024`
			}
			
			// 处理库存：从 skus 中汇总，或使用 stock 字段
			let stock = 0
			if (productData.skus && Array.isArray(productData.skus) && productData.skus.length > 0) {
				// 从所有 SKU 中汇总库存
				stock = productData.skus.reduce((sum, sku) => {
					const skuStock = parseInt(sku.stock) || 0
					return sum + skuStock
				}, 0)
				console.log(`[商品详情] 商品 ${productData.id} 从SKU汇总库存:`, stock, 'SKU数据:', productData.skus)
			} else if (productData.stock !== undefined && productData.stock !== null) {
				stock = parseInt(productData.stock) || 0
				console.log(`[商品详情] 商品 ${productData.id} 使用stock字段:`, stock)
			} else {
				console.warn(`[商品详情] 商品 ${productData.id} 没有库存数据`)
			}
			
			// 处理规格：从 SKU 的 specifications 中提取规格选项，并为每个选项添加价格信息
			// SKU 格式：{ specifications: { "版本": "标准版", "颜色": "黑色" }, price: 299.99, original_price: 399.99 }
			// 需要转换为前端格式：{ name: "颜色", options: [{ label: "黑色", value: "黑色", price: 299.99, originalPrice: 399.99 }] }
			const specsMap = new Map()
			
			console.log('[商品详情] ========== 开始处理规格 ==========')
			console.log('[商品详情] SKU数量:', productData.skus?.length || 0)
			console.log('[商品详情] 所有SKU数据:', JSON.stringify(productData.skus, null, 2))
			
			if (productData.skus && Array.isArray(productData.skus)) {
				productData.skus.forEach((sku, skuIndex) => {
					console.log(`[商品详情] 处理SKU ${skuIndex + 1}:`, {
						sku_code: sku.sku_code,
						specifications: sku.specifications,
						price: sku.price,
						stock: sku.stock
					})
					
					if (sku.specifications && typeof sku.specifications === 'object') {
						Object.keys(sku.specifications).forEach(specName => {
							if (!specsMap.has(specName)) {
								specsMap.set(specName, new Map()) // 使用 Map 存储选项，key 是选项值，value 是包含价格的选项对象
								console.log(`[商品详情] 创建新规格类型: ${specName}`)
							}
							const specValue = sku.specifications[specName]
							const optionMap = specsMap.get(specName)
							
							// 如果该选项值已存在，比较价格，保留价格更低的（用于显示最低价）
							if (!optionMap.has(specValue)) {
								optionMap.set(specValue, {
									label: specValue,
									value: specValue,
									price: parseFloat(sku.price || 0),
									originalPrice: sku.original_price ? parseFloat(sku.original_price) : null,
									available: (parseInt(sku.stock || 0) > 0)
								})
								console.log(`[商品详情] 添加新规格选项: ${specName} = ${specValue}, 价格: ${sku.price}, 库存: ${sku.stock}`)
							} else {
								const existingOption = optionMap.get(specValue)
								const currentPrice = parseFloat(sku.price || 0)
								// 如果当前 SKU 的价格更低，更新价格
								if (currentPrice < existingOption.price) {
									existingOption.price = currentPrice
									if (sku.original_price) {
										existingOption.originalPrice = parseFloat(sku.original_price)
									}
								}
								// 如果有库存，标记为可用
								if (parseInt(sku.stock || 0) > 0) {
									existingOption.available = true
								}
								console.log(`[商品详情] 规格选项已存在: ${specName} = ${specValue}, 更新可用性`)
							}
						})
					} else {
						console.warn(`[商品详情] SKU ${skuIndex + 1} 没有有效的specifications:`, sku)
					}
				})
			} else {
				console.warn('[商品详情] 没有SKU数据或SKU不是数组:', productData.skus)
			}
			
			// 转换为前端格式（保留用于兼容，但主要使用样式列表）
			const specs = Array.from(specsMap.entries()).map(([specName, optionMap]) => ({
				name: specName,
				options: Array.from(optionMap.values())
			}))
			
			// 生成样式列表（每个SKU对应一个样式）
			const styles = productData.skus.map((sku, index) => {
				return {
					index: index,
					specifications: sku.specifications && typeof sku.specifications === 'object' 
						? { ...sku.specifications } 
						: {},
					price: parseFloat(sku.price || 0).toFixed(2),
					originalPrice: sku.original_price ? parseFloat(sku.original_price).toFixed(2) : null,
					stock: parseInt(sku.stock || 0),
					available: parseInt(sku.stock || 0) > 0,
					sku_code: sku.sku_code || '',
					sku_id: sku.id || null
				}
			})
			
			productStyles.value = styles
			// 只有一种规格时自动选中，无需用户再选样式
			if (styles.length === 1) {
				selectedStyleIndex.value = 0
				selectedSpecs.value = { ...(styles[0].specifications || {}) }
			} else {
				selectedStyleIndex.value = null
				selectedSpecs.value = {}
			}
			
			console.log('[商品详情] ========== 样式处理完成 ==========')
			console.log('[商品详情] 原始SKU数量:', productData.skus?.length || 0)
			console.log('[商品详情] 生成的样式数量:', styles.length)
			styles.forEach((style, idx) => {
				console.log(`[商品详情] 样式 ${idx + 1}:`, {
					规格: style.specifications,
					价格: style.price,
					原价: style.originalPrice,
					库存: style.stock,
					可用: style.available
				})
			})
			
			// 转换API数据为前端格式
			product.value = {
				id: productData.id,
				name: productData.name,
				price: price,
				originPrice: originPrice, // 使用 SKU 中的 original_price
				desc: productData.description || '',
				isVip: isMemberProduct,
				isHot: productData.is_hot || false,
				isNew: productData.is_new || false,
				points: Math.floor(price),
				sales: parseInt(productData.sales || 0),
				stock: stock,
				rating: parseFloat(productData.rating || 4.5),
				images: bannerImages.length > 0 ? bannerImages : ['/static/logo.png'], // 轮播图，确保至少有一张
				detailImages: detailImages, // 详情图
				tags: (productData.attributes || []).map(attr => attr.value).filter(Boolean),
				specs: specs, // 从 SKU 的 specifications 转换而来，包含价格信息
				params: productData.attributes || [], // attributes 作为规格参数显示
				sku: skuCode, // 使用 sku_code
				buyRule: productData.buy_rule || productData.buyRule || '',
				buy_rule: productData.buy_rule || productData.buyRule || '', // 同时保存两种字段名，确保显示
				freight: parseFloat(productData.freight || 0),
				maxPointsDeduction: parseFloat(productData.max_points_discount || 0), // 积分抵扣上限（从接口获取）
				cash_only: productData.cash_only, // 新增：仅限现金支付标识
				user_id: productData.user_id || null // 保存商品所属用户的ID
			}
			
			// 调试：检查积分抵扣上限是否正确获取
			console.log('[商品详情] ========== 积分抵扣上限信息 ==========')
			console.log('[商品详情] 接口返回的完整商品数据:', JSON.stringify(productData, null, 2))
			console.log('[商品详情] 接口返回的原始数据:', {
				max_points_discount: productData.max_points_discount,
				类型: typeof productData.max_points_discount,
				是否为数字: typeof productData.max_points_discount === 'number',
				是否为undefined: productData.max_points_discount === undefined,
				是否为null: productData.max_points_discount === null,
				所有字段: Object.keys(productData || {})
			})
			console.log('[商品详情] 转换后的值:', {
				maxPointsDeduction: product.value.maxPointsDeduction,
				类型: typeof product.value.maxPointsDeduction,
				计算过程: `parseFloat(${productData.max_points_discount} || 0) = ${parseFloat(productData.max_points_discount || 0)}`
			})
			console.log('[商品详情] =================================')
			
			// 如果有销售数据，更新销量
			if (salesRes.status === 'fulfilled' && salesRes.value?.data) {
				const salesData = salesRes.value.data
				// total_sales 是销售总金额，应该使用销售数量字段
				// 优先使用 sales_count，如果没有则尝试其他可能的字段
				const salesCount = salesData.sales_count || salesData.sold_count || salesData.total_quantity || salesData.quantity || salesData.sales_quantity
				if (salesCount !== undefined && salesCount !== null) {
					product.value.sales = parseInt(salesCount)
					console.log('[商品详情] 更新销量:', {
						原始数据: salesData,
						使用的字段: salesData.sales_count ? 'sales_count' : (salesData.sold_count ? 'sold_count' : (salesData.total_quantity ? 'total_quantity' : (salesData.quantity ? 'quantity' : 'sales_quantity'))),
						销量值: product.value.sales
					})
				} else {
					console.warn('[商品详情] 销售数据中没有找到数量字段，使用默认值:', salesData)
				}
			}
			
			// 如果有购买规则，更新规则
			if (rulesRes.status === 'fulfilled' && rulesRes.value?.data) {
				const rulesData = rulesRes.value.data
				product.value.buyRule = rulesData.buy_rule || product.value.buyRule
			}
			
			// 确保数量重置为1（防止被错误设置为规格数量）
			quantity.value = 1
			selectedSpecs.value = {}
		} else {
			throw new Error('获取商品详情失败')
		}
		
		uni.hideLoading()
		console.log('加载商品详情成功:', id, product.value.isVip ? '会员商品' : '普通商品')
	} catch (error) {
		uni.hideLoading()
		console.error('[商品详情] 加载失败，完整错误信息:', {
			message: error.message,
			error: error,
			stack: error.stack,
			productId: id,
			errorType: error.constructor?.name,
			errorString: String(error)
		})
		
		// 显示更详细的错误信息
		const errorMessage = error.message || error.msg || '加载失败，请检查网络连接'
		uni.showToast({ 
			title: errorMessage, 
			icon: 'none', 
			duration: 3000 
		})
		
		// API失败时设置最小化的默认值，确保页面不会完全空白
		product.value = {
			id: id || 0,
			name: '加载失败',
			price: 0,
			originPrice: null,
			desc: '商品数据加载失败，请稍后重试',
			images: ['/static/logo.png'], // 至少保留一张默认图片
			detailImages: [],
			tags: [],
			specs: [],
			params: [],
			stock: 0,
			sales: 0,
			sku: 'N/A',
			isVip: false,
			rating: 0
		}
	}
}

/**
 * 加载商品评价（暂时移除接口调用）
 */
const loadProductEvaluations = async (id) => {
	try {
		// 商品评价接口暂时移除
		// const res = await getProductEvaluations({
		// 	product_id: id,
		// 	page: 1,
		// 	pageSize: 20
		// })
		// if (res && res.data) {
		// 	productReviews.value = res.data.list || res.data || []
		// }
		productReviews.value = []
	} catch (error) {
		console.error('加载商品评价失败:', error)
		// 失败时使用空数组，不影响页面显示
		productReviews.value = []
	}
}

/**
 * 切换评价筛选
 */
const switchReviewFilter = (value) => {
	currentReviewFilter.value = value
}

/**
 * 格式化评价时间
 */
const formatReviewTime = (time) => {
	if (!time) return ''
	if (typeof time === 'string' && time.includes('T')) {
		// ISO格式时间
		const date = new Date(time)
		const now = new Date()
		const diff = now - date
		const days = Math.floor(diff / (1000 * 60 * 60 * 24))
		
		if (days === 0) {
			return '今天'
		} else if (days === 1) {
			return '昨天'
		} else if (days < 7) {
			return `${days}天前`
		} else {
			return `${date.getMonth() + 1}-${date.getDate()}`
		}
	}
	return time
}

/**
 * 加载购物车数量
 */
const loadCartCount = async () => {
	try {
		const userInfo = uni.getStorageSync('userInfo') || {}
		const userId = userInfo.id || userInfo.user_id || userInfo.userId || userInfo.uid
		
		if (!userId) {
			cartCount.value = 0
			return
		}
		
		const res = await getCartList(userId)
		const rawItems = res.data?.list || res.data || res || []
		
		if (!Array.isArray(rawItems) || rawItems.length === 0) {
			cartCount.value = 0
			return
		}
		
		// 计算购物车总数量（所有商品的数量总和）
		const totalQuantity = rawItems.reduce((sum, item) => {
			return sum + (parseInt(item.quantity || 0))
		}, 0)
		
		cartCount.value = totalQuantity
		console.log('[商品详情] 购物车数量已更新:', {
			总数量: totalQuantity,
			商品种类: rawItems.length,
			购物车数据: rawItems
		})
	} catch (error) {
		console.error('[商品详情] 加载购物车数量失败:', error)
		cartCount.value = 0
	}
}

/**
 * 跳转到店铺详情
 */
const goToStoreDetail = () => {
	const userId = product.value.user_id
	if (!userId) {
		uni.showToast({ title: '店铺信息不存在', icon: 'none' })
		return
	}
	uni.navigateTo({
		url: `/pages/store/detail?user_id=${userId}`
	})
}

onLoad((options) => {
	if (options.id) {
		productId.value = options.id
		loadProductDetail(options.id)
		checkFavoriteStatusFunc(options.id)
		loadCartCount() // 加载购物车数量
		// 商品评价接口暂时移除
		// loadProductEvaluations(options.id)
	}
})

onShow(() => {
	// 每次显示页面时刷新购物车数量
	loadCartCount()
})

onMounted(() => {
	// 初始化默认规格选择
	if (product.value.specs) {
		product.value.specs.forEach(spec => {
			const firstAvailable = spec.options.find(opt => opt.available)
			if (firstAvailable) {
				selectedSpecs.value[spec.name] = firstAvailable.value
			}
		})
	}
})
</script>

<style scoped>
/* 引入 iconfont 样式 */
@import "@/static/999/iconfont.css";

/* 页面外层：占满视口，底部栏在此外与 scroll-view 平级，保证 iOS/Android 上 fixed 生效 */
.detail-page-wrapper {
	position: relative;
	width: 100%;
	height: 100vh;
	height: 100dvh; /* 动态视口，适配移动端地址栏显隐 */
	box-sizing: border-box;
}

.detail-page {
	background: #f5f5f5;
	height: 100%;
	box-sizing: border-box;
	/* 预留底部栏高度 + iPhone 安全区，避免内容被遮挡 */
	padding-bottom: 120rpx;
	padding-bottom: calc(120rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

/* 商品轮播图 */
.product-swiper {
	width: 100%;
	height: 750rpx;
	background: white;
}

.swiper-item-wrapper {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f5f5f5;
}

.swiper-image {
	width: 100%;
	height: 100%;
	max-width: 100%;
	max-height: 100%;
}

/* 商品信息 */
.product-info {
	background: white;
	padding: 40rpx;
	margin-bottom: 20rpx;
}

.price-row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 30rpx;
}

.price-box {
	display: flex;
	align-items: baseline;
	gap: 8rpx;
	position: relative;
}

.price-symbol {
	font-size: 32rpx;
	color: #ff4757;
	font-weight: bold;
}

.price-value {
	font-size: 48rpx;
	color: #ff4757;
	font-weight: bold;
}

.origin-price {
	font-size: 28rpx;
	color: #999;
	text-decoration: line-through;
}

.discount-badge {
	position: absolute;
	top: -10rpx;
	right: -60rpx;
	background: #ff4757;
	color: white;
	padding: 4rpx 12rpx;
	border-radius: 12rpx;
	font-size: 20rpx;
}

.actions-row {
	display: flex;
	gap: 20rpx;
}

.action-btn {
	width: 80rpx;
	height: 80rpx;
	background: #f5f5f5;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	padding: 0;
	margin: 0;
	line-height: 1;
}

.share-btn {
	background: transparent;
	position: relative;
	flex-direction: column;
	gap: 4rpx;
	z-index: 10;
}

.action-hint {
	font-size: 20rpx;
	color: #666;
	text-align: center;
}

.button-hover {
	opacity: 0.7;
}

.action-icon {
	font-size: 36rpx;
}

.action-icon.icon-shoucang {
	font-family: "iconfont" !important;
	font-size: 36rpx !important;
	line-height: 1 !important;
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	color: #999 !important; /* 默认灰色 - 未收藏 */
	display: inline-block;
}

.action-icon.icon-shoucang.favorited {
	color: #ffc107 !important; /* 金黄色 - 已收藏 */
}

.product-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 20rpx;
}

.product-name {
	flex: 1;
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	line-height: 1.4;
	margin-right: 20rpx;
}

.badges {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.badge {
	padding: 6rpx 16rpx;
	border-radius: 12rpx;
	font-size: 22rpx;
}

.member-badge {
	background: linear-gradient(135deg, #ffd700, #ffed4e);
	color: #8b4513;
}

.hot-badge {
	background: #ff4757;
	color: white;
}

.new-badge {
	background: #5dade2;
	color: white;
}

.product-desc {
	font-size: 28rpx;
	color: #666;
	line-height: 1.5;
	margin-bottom: 30rpx;
}

.product-tags {
	display: flex;
	gap: 16rpx;
	margin-bottom: 30rpx;
	flex-wrap: wrap;
}

.tag-item {
	padding: 8rpx 20rpx;
	background: #f0f4ff;
	color: #667eea;
	border-radius: 20rpx;
	font-size: 24rpx;
}

.member-benefits {
	background: linear-gradient(135deg, #ffd700, #ffed4e);
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
}

.benefits-header {
	margin-bottom: 20rpx;
}

.benefits-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #8b4513;
}

.benefit-item {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 16rpx;
}

.benefit-item:last-child {
	margin-bottom: 0;
}

.benefit-icon {
	font-family: "iconfont" !important;
	font-size: 28rpx;
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	color: #8b4513;
	display: inline-block;
	line-height: 1;
}

.benefit-icon.iconfont {
	font-family: "iconfont" !important;
}

.benefit-text {
	font-size: 26rpx;
	color: #8b4513;
	line-height: 1.4;
}

/* 普通商品积分信息 */
.normal-benefits {
	background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 30rpx;
}

.normal-benefits .benefit-item {
	margin-bottom: 0;
}

.normal-benefits .benefit-icon {
	color: #4caf50;
}

.normal-benefits .benefit-text {
	color: #2e7d32;
	font-weight: 600;
}

.info-row {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 20rpx;
	padding: 32rpx 24rpx;
	background: #fafafa;
	border-radius: 12rpx;
	margin-bottom: 30rpx;
}

.info-item {
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.info-label {
	display: block;
	font-size: 24rpx;
	color: #666;
	margin-bottom: 10rpx;
	font-weight: 400;
	line-height: 1.3;
}

.info-value {
	display: block;
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
	line-height: 1.4;
	word-break: break-all;
}

.specs-section {
	margin-bottom: 30rpx;
}

.specs-header {
	margin-bottom: 20rpx;
}

.specs-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.spec-group {
	margin-bottom: 30rpx;
}

.spec-name {
	display: block;
	font-size: 28rpx;
	color: #333;
	margin-bottom: 16rpx;
}

.spec-options {
	display: flex;
	gap: 16rpx;
	flex-wrap: wrap;
}

.spec-option {
	padding: 16rpx 24rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 8rpx;
	font-size: 26rpx;
	color: #666;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
}

.spec-option.active {
	border-color: #ff4757;
	color: #ff4757;
	background: #fff5f5;
}

.spec-option.disabled {
	opacity: 0.5;
	background: #f5f5f5;
}

.option-price-info {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 4rpx;
}

.option-price {
	font-size: 22rpx;
	color: #ff4757;
	font-weight: bold;
}

.option-original-price {
	font-size: 20rpx;
	color: #999;
	text-decoration: line-through;
}

.spec-price-display {
	margin-top: 30rpx;
	padding: 24rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
}

.price-row {
	display: flex;
	align-items: baseline;
	gap: 12rpx;
}

.price-label {
	font-size: 28rpx;
	color: #666;
}

.price-value {
	font-size: 36rpx;
	color: #ff4757;
	font-weight: bold;
}

.origin-price {
	font-size: 24rpx;
	color: #999;
	text-decoration: line-through;
	margin-left: 8rpx;
}

.quantity-section {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.quantity-label {
	font-size: 28rpx;
	color: #333;
}

.quantity-selector {
	display: flex;
	align-items: center;
	gap: 0;
	border: 2rpx solid #e0e0e0;
	border-radius: 8rpx;
	overflow: hidden;
}

.quantity-btn {
	width: 80rpx;
	height: 60rpx;
	background: #f5f5f5;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	color: #666;
}

.quantity-btn.disabled {
	opacity: 0.5;
}

.quantity-input {
	width: 120rpx;
	height: 60rpx;
	text-align: center;
	font-size: 28rpx;
	border: none;
	background: white;
}

/* 店铺详情部分 */
.store-detail-section {
	margin-top: 30rpx;
	padding-top: 30rpx;
	border-top: 1rpx solid #f0f0f0;
}

.store-detail-btn {
	display: flex;
	align-items: center;
	padding: 24rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
}

.store-detail-btn:active {
	background: #e9ecef;
}

.store-detail-icon {
	font-size: 32rpx;
	color: #666;
	margin-right: 12rpx;
}

.store-detail-text {
	flex: 1;
	font-size: 28rpx;
	color: #333;
}

.store-detail-arrow {
	font-size: 32rpx;
	color: #999;
}

/* 商品详情 */
.product-detail {
	background: white;
	margin-bottom: 20rpx;
}

.detail-tabs {
	display: flex;
	border-bottom: 1rpx solid #f0f0f0;
}

.detail-tab {
	flex: 1;
	text-align: center;
	padding: 30rpx 0;
	font-size: 28rpx;
	color: #666;
	position: relative;
}

.detail-tab.active {
	color: #ff4757;
}

.detail-tab.active::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 60rpx;
	height: 4rpx;
	background: #ff4757;
	border-radius: 2rpx;
}

.detail-content {
	padding: 40rpx;
}

.detail-images {
	display: flex;
	flex-direction: column;
	gap: 0;
	margin: 0;
	padding: 0;
}

.detail-image {
	width: 100%;
	border-radius: 0;
	margin: 0;
	padding: 0;
	display: block;
	vertical-align: top;
}

.detail-text {
	padding: 40rpx 0;
}

.text-content {
	font-size: 28rpx;
	color: #666;
	line-height: 1.6;
}

/* 商品描述卡片 */
.description-card {
	background: white;
	padding: 40rpx;
	margin-bottom: 20rpx;
	border-radius: 16rpx;
}

.description-content {
	padding: 0;
}

.description-text {
	font-size: 32rpx;
	color: #000;
	line-height: 1.8;
	white-space: pre-wrap;
	word-break: break-word;
	font-weight: 400;
}

/* 购买规则卡片 */
.buy-rule-card {
	background: #fff8e1;
	border-radius: 16rpx;
	padding: 30rpx;
	margin: 0 30rpx 20rpx;
	border-left: 4rpx solid #ff9800;
}

.buy-rule-header {
	margin-bottom: 16rpx;
}

.buy-rule-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #ff9800;
}

.buy-rule-content {
	padding: 16rpx 0;
}

.buy-rule-text {
	font-size: 28rpx;
	color: #666;
	line-height: 1.6;
	white-space: pre-wrap;
	word-break: break-word;
}

.params-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.param-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.param-name {
	font-size: 28rpx;
	color: #666;
}

.param-value {
	font-size: 28rpx;
	color: #333;
}

.reviews-list {
	display: flex;
	flex-direction: column;
	gap: 30rpx;
}

/* 评价筛选 */
.reviews-filter {
	display: flex;
	background: white;
	padding: 0 20rpx;
	border-bottom: 1rpx solid #f0f0f0;
	margin-bottom: 20rpx;
}

.reviews-filter .filter-item {
	flex: 1;
	padding: 20rpx 0;
	text-align: center;
	position: relative;
}

.reviews-filter .filter-item.active::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 60rpx;
	height: 4rpx;
	background: #ff4757;
	border-radius: 2rpx;
}

.reviews-filter .filter-text {
	font-size: 26rpx;
	color: #666;
}

.reviews-filter .filter-item.active .filter-text {
	color: #ff4757;
	font-weight: 600;
}

.review-item {
	padding: 30rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.review-header {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-bottom: 16rpx;
}

.reviewer-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
}

.reviewer-info {
	flex: 1;
}

.reviewer-name {
	display: block;
	font-size: 28rpx;
	color: #333;
	margin-bottom: 8rpx;
}

.review-rating {
	display: flex;
	gap: 4rpx;
}

.star {
	font-size: 24rpx;
}

.review-time {
	font-size: 24rpx;
	color: #999;
}

.review-content {
	font-size: 28rpx;
	color: #666;
	line-height: 1.5;
	margin-bottom: 16rpx;
}

.review-images {
	display: flex;
	gap: 16rpx;
	flex-wrap: wrap;
}

.review-image {
	width: 160rpx;
	height: 160rpx;
	border-radius: 12rpx;
}

.no-params,
.no-reviews {
	text-align: center;
	padding: 80rpx 0;
}

.no-params-text,
.no-reviews-text {
	font-size: 28rpx;
	color: #999;
}

/* 底部操作栏：独立于 scroll-view 外，适配所有 iPhone 与安卓机型 */
.bottom-actions {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 100;
	background: white;
	padding: 20rpx 40rpx;
	display: flex;
	gap: 20rpx;
	align-items: center;
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
	/* iPhone 刘海/横条机型：底部安全区，避免被 Home 指示条遮挡 */
	padding-bottom: 20rpx;
	padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.contact-actions {
	display: flex;
	gap: 20rpx;
}

.contact-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	position: relative;
}

.contact-icon {
	font-size: 36rpx;
}

.contact-text {
	font-size: 22rpx;
	color: #666;
}

.cart-badge {
	position: absolute;
	top: -8rpx;
	right: -8rpx;
	background: #ff4757;
	color: white;
	font-size: 20rpx;
	padding: 4rpx 8rpx;
	border-radius: 20rpx;
	min-width: 32rpx;
	text-align: center;
}

.purchase-actions {
	flex: 1;
	display: flex;
	gap: 20rpx;
}

.action-btn {
	flex: 1;
	height: 88rpx;
	border-radius: 44rpx;
	font-size: 32rpx;
	font-weight: bold;
	border: none;
}

.add-cart {
	background: #ff9800;
	color: white;
}

.buy-now {
	background: #ff4757;
	color: white;
}

/* 样式选择部分 */
.styles-section {
	margin-bottom: 30rpx;
}

.styles-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.style-option {
	padding: 24rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 12rpx;
	background: white;
	transition: all 0.3s;
}

.style-option.active {
	border-color: #ff4757;
	background: #fff5f5;
	box-shadow: 0 4rpx 12rpx rgba(255, 71, 87, 0.15);
}

.style-option.disabled {
	opacity: 0.5;
	background: #f5f5f5;
}

.style-info {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12rpx;
}

.style-specs-text {
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
	flex: 1;
}

.style-price-info {
	display: flex;
	align-items: baseline;
	gap: 12rpx;
}

.style-price {
	font-size: 32rpx;
	color: #ff4757;
	font-weight: bold;
}

.style-original-price {
	font-size: 24rpx;
	color: #999;
	text-decoration: line-through;
}

.style-stock {
	margin-top: 8rpx;
}

.stock-text {
	font-size: 24rpx;
	color: #999;
}
</style>