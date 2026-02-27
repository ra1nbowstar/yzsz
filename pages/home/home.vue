<template>
	<view class="home-page">
		<scroll-view 
			class="scroll-container"
			scroll-y
			refresher-enabled
			:refresher-triggered="refreshing"
			@refresherrefresh="onRefresh"
			@refresherrestore="onRestore"
			@scrolltolower="handleScrollToLower"
			:lower-threshold="50"
			enable-back-to-top
		>
		<!-- 左上角：圆形 logo + 禹泽数字 -->
		<view class="home-header">
			<image class="brand-logo" src="/static/1.jpg" mode="aspectFill" @error="handleImageError" />
			<text class="brand-name">禹泽数字</text>
		</view>
		<!-- 搜索栏 + 扫码付款 -->
		<view class="search-bar">
			<view class="search-input" @click="goToSearch">
				<text class="iconfont icon-sousuo search-icon"></text>
				<text class="search-placeholder">搜索商品</text>
			</view>
			<view class="scan-pay-btn" @tap="scanToPay">
				<text class="iconfont icon-saoyisao scan-icon"></text>
				<text class="scan-pay-text">扫码付款</text>
			</view>
		</view>

		<!-- 轮播图 -->
		<swiper class="banner-swiper" :indicator-dots="bannerList.length > 1" :autoplay="bannerList.length > 0" :interval="3000" :duration="500">
			<swiper-item v-for="(item, index) in bannerList" :key="index">
				<image :src="item.image" mode="aspectFill" class="banner-image" @tap="handleBannerClick(item)" @error="handleImageError" />
			</swiper-item>
			<!-- 如果没有轮播图数据，显示占位图 -->
			<swiper-item v-if="bannerList.length === 0">
				<view class="banner-placeholder">
					<text class="placeholder-text">暂无轮播图</text>
				</view>
			</swiper-item>
		</swiper>

		<!-- 公益播报 -->
		<view class="charity-notice">
			<view class="notice-icon iconfont icon-xihuan"></view>
			<swiper class="notice-swiper" vertical :autoplay="true" :circular="true" :interval="3000">
				<swiper-item v-for="(item, index) in charityNotices" :key="index">
					<text class="notice-text">{{ item }}</text>
				</swiper-item>
			</swiper>
		</view>

		<!-- 专区 -->
		<view class="product-section">
			<view class="section-header">
				<view class="header-left">
					<text class="section-title">专区</text>
					<text class="section-badge">VIP</text>
				</view>
				<text class="more-btn" @tap="goToProductList(1)">更多 ›</text>
			</view>
			<!-- 横向滚动，滑到最右侧时自动加载更多会员商品 -->
			<scroll-view 
				class="product-scroll" 
				scroll-x 
				@scrolltolower="onVipLoadMore" 
				:lower-threshold="50"
			>
				<view class="product-list">
					<view
						class="product-card vip-card"
						v-for="item in vipProducts"
						:key="item.id"
						@tap="goToDetail(item.id)"
					>
<image :src="item.image" mode="aspectFit" class="product-image" @error="handleImageError" />
					<view class="product-info">
						<text class="product-name">{{ item.name }}</text>
						<view class="product-tags">
								<text class="tag vip-tag">会员专享</text>
								<text class="tag level-tag" v-if="item.levelUp">升级权益</text>
							</view>
							<view class="product-price">
								<text class="price">¥{{ item.price }}</text>
								<text class="origin-price" v-if="item.originPrice">¥{{ item.originPrice }}</text>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 普通商品专区 -->
		<view class="product-section">
			<view class="section-header">
				<text class="section-title">商品</text>
				<text class="more-btn" @tap="goToProductList(2)">更多 ›</text>
			</view>
			<view class="product-grid">
				<view
					class="product-card normal-card"
					v-for="item in normalProducts"
					:key="item.id"
					@tap="goToDetail(item.id)"
				>
					<image :src="item.image" mode="aspectFit" class="product-image" @error="handleImageError" />
					<view class="product-info">
						<text class="product-name">{{ item.name }}</text>
						<view class="product-price">
							<view class="price-row">
								<text class="price">¥{{ item.price }}</text>
								<text v-if="!item.isVip && item.maxPointsDeduction > 0" class="points-deduction">可抵{{ item.maxPointsDeduction.toFixed(0) }}分</text>
							</view>
							<text class="sales">已售{{ item.sales }}</text>
						</view>
					</view>
				</view>
			</view>
			<!-- 加载更多提示 -->
			<view v-if="loadingMore" class="loading-more">
				<text class="loading-text">加载中...</text>
			</view>
			<view v-if="!hasMore && normalProducts.length > 0" class="no-more">
				<text class="no-more-text">没有更多商品了</text>
			</view>
		</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow, onReachBottom } from '@dcloudio/uni-app'
import { getBannerList, getProductList, getProductSales } from '@/api/product.js'
import { getCharityNotices } from '@/config/charity.js'
import { getSystemSentences } from '@/api/system.js'
import { getUnreadCount } from '@/api/message.js'
import { setTabBarBadge, removeTabBarBadge } from '@/utils/tabbar.js'
import { getPublicWelfareBalance } from '@/api/charity.js'
import { getPublicWelfareFlow } from '@/api/reports.js'
import { bindReferrer, getMobileByUserId } from '@/api/user.js'
import { getPendingReferrer } from '@/utils/referral.js'
import config from '@/utils/config.js'

const bannerList = ref([])
const vipProducts = ref([])
const normalProducts = ref([])
const charityNotices = ref([])
const refreshing = ref(false)
const loading = ref(true) // 添加加载状态，避免初始闪烁
const loadingMore = ref(false) // 加载更多状态
const hasMore = ref(true) // 是否还有更多商品
const currentPage = ref(1) // 当前页码
const pageSize = ref(30) // 每页数量，初始加载30个商品
const allVipProducts = ref([]) // 所有会员商品
const allNormalProducts = ref([]) // 所有普通商品

/**
 * 加载轮播图 - 从轮播图商品中获取所有轮播图
 */
const loadBanners = async () => {
	try {
		// 从商品列表中查找轮播图商品（name='首页轮播图'）
		const productListRes = await getProductList({ page: 1, pageSize: 100 })
		const products = productListRes.data?.list || productListRes.data || productListRes.list || []
		
		// 查找轮播图商品：name='首页轮播图' 且 category='其他'
		const bannerProduct = products.find(p => 
			p.name === '首页轮播图' && p.category === '其他'
		)
		
		if (!bannerProduct) {
			// 未找到轮播图商品
			bannerList.value = []
			return
		}
		
		// 找到轮播图商品
		
		// 从轮播图商品的 banner_images 中获取所有轮播图
		const bannerImages = bannerProduct.banner_images && Array.isArray(bannerProduct.banner_images) 
			? bannerProduct.banner_images 
			: []
		
		// 从轮播图商品获取轮播图
		
		// 转换为轮播图格式
		bannerList.value = bannerImages.map((imageUrl, index) => {
			// 处理图片URL（如果是相对路径，添加服务器地址）
			let processedUrl = imageUrl
			if (processedUrl && !processedUrl.startsWith('http://') && !processedUrl.startsWith('https://') && !processedUrl.startsWith('/static')) {
				if (processedUrl.startsWith('/')) {
					processedUrl = `${config.baseURL}${processedUrl}`
				} else {
					processedUrl = `${config.baseURL}/${processedUrl}`
				}
			}
			
			return {
				id: index, // 使用索引作为ID
				image: processedUrl,
				link: '' // 不设置跳转链接
			}
		})
		
		// 轮播图加载成功
	} catch (error) {
		console.error('加载轮播图失败', error)
		bannerList.value = []
	}
}

/**
 * 格式化商品数据
 */
const formatProduct = (product) => {
	// 处理价格：使用 SKU 中的 price（现价）和 original_price（原价）
	let price = 0
	let originPrice = null
	const isMemberProduct = product.is_member_product === 1 || product.is_member_product === true
	
	// 优先使用第一个 SKU 的价格
	if (product.skus && product.skus.length > 0) {
		const firstSku = product.skus[0]
		if (firstSku.price !== undefined && firstSku.price !== null) {
			price = parseFloat(firstSku.price)
		}
		if (firstSku.original_price !== undefined && firstSku.original_price !== null) {
			originPrice = parseFloat(firstSku.original_price)
		}
	} else if (product.price) {
		// 如果没有 SKU，使用商品级别的价格
		price = parseFloat(product.price)
	}
	
	// 处理商品编号：使用 sku_code（优先使用 skus 中的 sku_code）
	let skuCode = ''
	if (product.skus && product.skus.length > 0 && product.skus[0].sku_code) {
		skuCode = product.skus[0].sku_code
	} else if (product.sku_code) {
		skuCode = product.sku_code
	} else {
		skuCode = `PROD-${String(product.id).padStart(3, '0')}-2024`
	}
	
	// 处理图片：优先使用 main_image，然后尝试其他字段
	const processImageUrl = (img) => {
		if (!img) return null
		if (img.startsWith('http://') || img.startsWith('https://')) return img
		if (img.startsWith('/static')) return img
		const imagePath = img.startsWith('/') ? img : `/${img}`
		return `${config.baseURL}${imagePath}`
	}
	
	let image = null
	// 1. 优先使用 main_image
	if (product.main_image) {
		image = processImageUrl(product.main_image)
			// 使用 main_image
	}
	
	// 2. 如果没有 main_image，尝试使用 detail_images
	if (!image && product.detail_images && Array.isArray(product.detail_images) && product.detail_images.length > 0) {
		image = processImageUrl(product.detail_images[0])
			// 使用 detail_images[0]
	}
	
	// 3. 如果没有，尝试使用 images
	if (!image && product.images && Array.isArray(product.images) && product.images.length > 0) {
		image = processImageUrl(product.images[0])
			// 使用 images[0]
	}
	
	// 4. 如果没有，尝试其他字段
	if (!image) {
		image = processImageUrl(product.image_url || product.image)
		if (image) {
			// 使用 image_url/image
		}
	}
	
	// 5. 如果还是没有，使用默认图片
	if (!image) {
		image = '/static/logo.png'
		// 使用默认图片
	}
	
	// 处理库存：从 skus 中汇总，或使用 stock 字段
	let stock = 0
	if (product.skus && Array.isArray(product.skus) && product.skus.length > 0) {
		// 从所有 SKU 中汇总库存
		stock = product.skus.reduce((sum, sku) => {
			const skuStock = parseInt(sku.stock) || 0
			return sum + skuStock
		}, 0)
		console.log(`[首页] 商品 ${product.id} 从SKU汇总库存:`, stock, 'SKU数据:', product.skus)
	} else if (product.stock !== undefined && product.stock !== null) {
		stock = parseInt(product.stock) || 0
		console.log(`[首页] 商品 ${product.id} 使用stock字段:`, stock)
	} else {
		console.warn(`[首页] 商品 ${product.id} 没有库存数据`)
	}
	
	// 获取积分抵扣上限（仅普通商品）
	const maxPointsDeduction = isMemberProduct ? 0 : (parseFloat(product.max_points_discount) || 0)
	
	return {
		id: product.id,
		name: product.name || '未命名商品',
		price: price,
		originPrice: originPrice, // 使用 SKU 中的 original_price
		image: image,
		sales: parseInt(product.sales || 0), // 如果后续有销量映射，会被覆盖
		user_id: product.user_id || null, // 保存商品所属用户的ID
		stock: stock,
		levelUp: product.level_up || false,
		sku: skuCode,
		isVip: isMemberProduct,
		maxPointsDeduction: maxPointsDeduction // 积分抵扣上限（仅普通商品）
	}
}

/**
 * 加载商品列表（会员商品和普通商品）
 */
const loadProducts = async (page = 1, append = false) => {
	try {
		if (!append) {
			// 重置状态（仅首次加载时）
			currentPage.value = page - 1 // 设置为上一页，这样下次加载时 nextPage = currentPage + 1
			allVipProducts.value = []
			allNormalProducts.value = []
			hasMore.value = true
		}
		
		const res = await getProductList({ 
			page: page, 
			size: pageSize.value // 使用 size 参数，每页30个商品
		})
		
		// 处理不同的响应格式
		let productList = []
		if (Array.isArray(res.data)) {
			productList = res.data
		} else if (res.data?.list && Array.isArray(res.data.list)) {
			productList = res.data.list
		} else if (Array.isArray(res.list)) {
			productList = res.list
		}
		
		console.log('[首页] 商品API返回:', { 
			productCount: productList.length,
			firstProduct: productList[0] // 打印第一个商品的数据结构
		})
		
		// 过滤在售商品，并排除轮播图商品
		const onSaleProducts = productList.filter(p => {
			// 必须是上架状态
			const isOnSale = p.status === 1 || p.status === 'on_sale' || p.status === 'active'
			// 排除轮播图商品（名称包含"轮播图"或SKU以"BANNER-"开头）
			const productName = (p.name || '').toLowerCase()
			const isBannerByName = productName.includes('轮播图')
			let isBannerBySku = false
			if (p.skus && p.skus.length > 0) {
				const skuCode = (p.skus[0].sku_code || p.skus[0].sku || '').toUpperCase()
				isBannerBySku = skuCode.startsWith('BANNER-')
			}
			if (p.sku_code) {
				const skuCode = (p.sku_code || '').toUpperCase()
				isBannerBySku = isBannerBySku || skuCode.startsWith('BANNER-')
			}
			const isNotBanner = !(isBannerByName || isBannerBySku)
			return isOnSale && isNotBanner
		})
		
		// 批量获取商品销量
		console.log('[首页] 开始获取商品销量，商品数量:', onSaleProducts.length)
		const salesPromises = onSaleProducts.map(product => 
			getProductSales(product.id).catch(() => null)
		)
		const salesResults = await Promise.allSettled(salesPromises)
		
		// 创建销量映射表
		const salesMap = {}
		salesResults.forEach((result, index) => {
			if (result.status === 'fulfilled' && result.value?.data) {
				const salesData = result.value.data
				const productId = onSaleProducts[index].id
				// 优先使用 sales_count，如果没有则尝试其他字段
				const salesCount = salesData.sales_count || salesData.sold_count || salesData.total_quantity || salesData.quantity || salesData.sales_quantity || 0
				salesMap[productId] = parseInt(salesCount)
			}
		})
		console.log('[首页] 销量数据获取完成，销量映射:', salesMap)
		
		// 根据 is_member_product 字段区分会员商品和普通商品
		const memberProducts = onSaleProducts.filter(p => {
			// 会员商品：is_member_product 为 true、1 或 'true'
			const isMember = p.is_member_product === true || p.is_member_product === 1 || p.is_member_product === 'true'
			if (isMember) {
				console.log(`[首页] 识别为会员商品:`, {
					id: p.id,
					name: p.name,
					is_member_product: p.is_member_product,
					main_image: p.main_image
				})
			}
			return isMember
		})
		
		const normalProductsList = onSaleProducts.filter(p => {
			// 普通商品：is_member_product 为 false、0、'false'、null 或 undefined
			return p.is_member_product === false || 
			       p.is_member_product === 0 || 
			       p.is_member_product === 'false' || 
			       p.is_member_product === null || 
			       p.is_member_product === undefined
		})
		
		console.log('[首页] 过滤结果:', {
			总商品数: productList.length,
			在售商品数: onSaleProducts.length,
			会员商品数: memberProducts.length,
			普通商品数: normalProductsList.length,
			会员商品详情: memberProducts.map(p => ({
				id: p.id,
				name: p.name,
				is_member_product: p.is_member_product,
				main_image: p.main_image
			}))
		})
		
		// 格式化并应用销量数据
		const formattedVipProducts = memberProducts.map(product => {
			const formatted = formatProduct(product)
			// 如果有销量数据，使用销量接口返回的数据
			if (salesMap[product.id] !== undefined) {
				formatted.sales = salesMap[product.id]
			}
			return formatted
		})
		
		const formattedNormalProducts = normalProductsList.map(product => {
			const formatted = formatProduct(product)
			// 如果有销量数据，使用销量接口返回的数据
			if (salesMap[product.id] !== undefined) {
				formatted.sales = salesMap[product.id]
			}
			return formatted
		})
		
		// 追加或替换商品列表
		if (append) {
			// 追加模式：合并新商品，避免重复
			const existingVipIds = new Set(allVipProducts.value.map(p => p.id))
			const existingNormalIds = new Set(allNormalProducts.value.map(p => p.id))
			
			const newVipProducts = formattedVipProducts.filter(p => !existingVipIds.has(p.id))
			const newNormalProducts = formattedNormalProducts.filter(p => !existingNormalIds.has(p.id))
			
			allVipProducts.value = [...allVipProducts.value, ...newVipProducts]
			allNormalProducts.value = [...allNormalProducts.value, ...newNormalProducts]
			
			console.log('[首页] 追加商品:', {
				新增会员商品: newVipProducts.length,
				新增普通商品: newNormalProducts.length,
				总会员商品: allVipProducts.value.length,
				总普通商品: allNormalProducts.value.length
			})
		} else {
			// 首次加载：直接替换
			allVipProducts.value = formattedVipProducts
			allNormalProducts.value = formattedNormalProducts
			currentPage.value = 1
		}
		
		// 检查是否还有更多数据
		const totalNewProducts = formattedVipProducts.length + formattedNormalProducts.length
		const totalRawProducts = productList.length // 原始返回的商品数量（未过滤）
		
		console.log('[首页] 商品数量检查:', {
			原始商品数: totalRawProducts,
			过滤后商品数: totalNewProducts,
			会员商品: formattedVipProducts.length,
			普通商品: formattedNormalProducts.length,
			pageSize: pageSize.value,
			追加模式: append
		})
		
		// 只有在追加模式下，才根据返回数量判断是否还有更多
		// 如果返回的原始商品数量等于或大于pageSize，说明可能还有更多
		// 如果返回的原始商品数量为0，说明确实没有更多了
		if (append) {
			// 追加模式：如果原始返回的商品数量为0，说明没有更多了
			if (totalRawProducts === 0) {
				hasMore.value = false
				console.log('[首页] 追加模式：返回0个商品，没有更多了')
			} else if (totalRawProducts < pageSize.value) {
				// 如果返回的商品数量少于pageSize，可能没有更多了，但先设置为true，让用户再试一次
				hasMore.value = true
				currentPage.value = page
				console.log('[首页] 追加模式：返回商品数少于pageSize，但继续尝试')
			} else {
				// 返回的商品数量等于pageSize，肯定还有更多
				hasMore.value = true
				currentPage.value = page
				console.log('[首页] 追加模式：返回商品数等于pageSize，还有更多')
			}
		} else {
			// 首次加载：总是设置为true，允许加载更多
			hasMore.value = true
			currentPage.value = page
			console.log('[首页] 首次加载：设置hasMore为true，允许加载更多')
		}
		
		// 显示前10个会员商品和所有普通商品
		vipProducts.value = allVipProducts.value.slice(0, 10)
		normalProducts.value = allNormalProducts.value
		
		console.log('[首页] 商品显示更新:', {
			显示会员商品: vipProducts.value.length,
			显示普通商品: normalProducts.value.length,
			总会员商品: allVipProducts.value.length,
			总普通商品: allNormalProducts.value.length
		})
		
		console.log('[首页] 商品分类结果:', {
			会员商品: vipProducts.value.length,
			普通商品: normalProducts.value.length,
			会员商品列表: vipProducts.value.map(p => ({ id: p.id, name: p.name, image: p.image }))
		})
	} catch (error) {
		console.error('加载商品失败', error)
		vipProducts.value = []
		normalProducts.value = []
	}
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
 * 跳转到商品详情
 * 允许未登录用户浏览商品详情，只有在购买或加入购物车时才要求登录
 */
const goToDetail = (id) => {
	uni.navigateTo({ url: `/subPackages/page2/pages/product/detail?id=${id}` })
}

/**
 * 轮播图点击
 * 有链接则跳转，无链接则预览当前轮播图（支持左右滑动查看全部）
 */
const handleBannerClick = (item) => {
	if (item.link) {
		uni.navigateTo({ url: item.link })
		return
	}
	const urls = bannerList.value.map(i => i && i.image).filter(Boolean)
	if (urls.length === 0) return
	uni.previewImage({
		current: item.image || urls[0],
		urls,
		fail: (err) => {
			console.error('[首页] 轮播图预览失败:', err)
			uni.showToast({ title: '预览失败', icon: 'none' })
		}
	})
}

/**
 * 跳转到商品列表
 * 允许未登录用户浏览商品列表
 */
const goToProductList = (type) => {
	uni.navigateTo({ url: `/subPackages/page1/pages/product/list?type=${type}` })
}

/**
 * 跳转到搜索页面
 * 允许未登录用户搜索商品
 */
const goToSearch = () => {
	uni.navigateTo({ url: '/subPackages/page2/pages/product/search' })
}

/**
 * 扫码付款：扫商户收款码后跳转线下支付页
 * 支持 pay://订单号、订单号 等格式
 */
const scanToPay = () => {
	uni.scanCode({
		success: (res) => {
			const raw = (res.result || res.scanResult || '').trim()
			let orderNo = ''
			if (raw.startsWith('pay://')) {
				orderNo = raw.slice(6).trim()
			} else if (raw) {
				// 纯订单号或后端返回的 code_token（当 token 即订单号时）
				orderNo = raw
			}
			if (orderNo) {
				uni.navigateTo({ url: `/pages/offline/pay?order_no=${encodeURIComponent(orderNo)}` })
			} else {
				uni.showToast({ title: '无法识别的收款码', icon: 'none' })
			}
		},
		fail: (err) => {
			if (err.errMsg && !err.errMsg.includes('cancel')) {
				uni.showToast({ title: '扫码失败，请重试', icon: 'none' })
			}
		}
	})
}

/**
 * 脱敏处理姓名
 */
const maskName = (name) => {
	if (!name || name === '未知') return '未知'
	const str = String(name)
	if (str.length <= 1) return str + '*'
	return str.charAt(0) + '*'.repeat(Math.min(str.length - 1, 3))
}

/**
 * 计算时间差（几分钟前）
 * 兼容部分 iOS 不支持空格分隔日期与时间的情况，先规范化为 `yyyy-MM-ddTHH:mm:ss`
 */
const getTimeAgo = (timestamp) => {
	if (!timestamp) return '未知时间'

	let ts = timestamp
	if (typeof ts === 'string') {
		ts = ts.trim()
		// 将 "yyyy-MM-dd HH:mm:ss" -> "yyyy-MM-ddTHH:mm:ss"
		if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ts)) {
			ts = ts.replace(' ', 'T')
		} else if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(ts)) {
			// 将斜杠改为短横并替换空格
			ts = ts.replace(/\//g, '-').replace(' ', 'T')
		} else if (ts.indexOf(' ') !== -1 && ts.indexOf('T') === -1) {
			// 通用替换首个空格为 T，避免 iOS 解析失败
			ts = ts.replace(' ', 'T')
		}
	}

	const now = Date.now()
	const time = new Date(ts).getTime()
	const diff = Math.floor((now - time) / 1000) // 秒数差

	if (diff < 60) {
		return '刚刚'
	} else if (diff < 3600) {
		const minutes = Math.floor(diff / 60)
		return `${minutes}分钟前`
	} else if (diff < 86400) {
		const hours = Math.floor(diff / 3600)
		return `${hours}小时前`
	} else {
		const days = Math.floor(diff / 86400)
		return `${days}天前`
	}
}

/**
 * 加载公益播报（实时更新）
 */
const loadCharityNotices = async () => {
	try {
		console.log('[首页] 开始实时加载公益播报')
		
		// 获取公益基金余额
		let balance = 0
		try {
			const balanceRes = await getPublicWelfareBalance()
			console.log('[首页] 公益基金余额响应:', balanceRes)
			
			// 解析响应数据
			if (balanceRes.success && balanceRes.data) {
				const data = balanceRes.data
				if (data.balance !== undefined) {
					balance = Number(data.balance)
				}
			} else if (balanceRes.data && balanceRes.data.balance !== undefined) {
				balance = Number(balanceRes.data.balance)
			} else if (balanceRes.balance !== undefined) {
				balance = Number(balanceRes.balance)
			}
			
			console.log('[首页] 解析后的公益基金余额:', balance)
		} catch (balanceError) {
			console.error('[首页] 获取公益基金余额失败:', balanceError)
		}
		
		// 获取最近5条流水明细
		let flows = []
		try {
			const flowRes = await getPublicWelfareFlow({
				page: 1,
				pageSize: 5
			})
			console.log('[首页] 公益基金流水响应:', flowRes)
			
			// 解析响应数据
			if (flowRes && flowRes.data) {
				if (Array.isArray(flowRes.data)) {
					flows = flowRes.data
				} else if (flowRes.data.list && Array.isArray(flowRes.data.list)) {
					flows = flowRes.data.list
				} else if (flowRes.data.flows && Array.isArray(flowRes.data.flows)) {
					flows = flowRes.data.flows
				} else if (flowRes.data.rows && Array.isArray(flowRes.data.rows)) {
					flows = flowRes.data.rows
				}
			} else if (Array.isArray(flowRes)) {
				flows = flowRes
			}
			
			// 只取收入类型的流水（贡献）
			flows = flows
				.filter(item => {
					const flowType = item.flow_type || item.type
					return flowType === 'income' || flowType === 'in' || (item.change_amount && item.change_amount > 0)
				})
				.slice(0, 5) // 最多5条
			
			console.log('[首页] 解析后的流水明细:', flows)
		} catch (flowError) {
			console.error('[首页] 获取公益基金流水失败:', flowError)
		}
		
		// 生成播报内容
		let contentLines = []
		
		// 第一行：总余额
		contentLines.push(`公益基金总余额：¥${balance.toFixed(4)}`)
		
		// 添加流水明细
		if (flows.length > 0) {
			flows.forEach(flow => {
				const userName = maskName(flow.user_name || flow.name || flow.customer_name || '用户')
				const timeAgo = getTimeAgo(flow.created_at || flow.create_time || flow.time)
				const amount = Math.abs(flow.change_amount || flow.amount || 0)
				contentLines.push(`${userName}${timeAgo}贡献¥${amount.toFixed(4)}`)
			})
		} else {
			contentLines.push('暂无最新贡献记录')
		}
		
		// 将内容转换为数组，每行一条
		charityNotices.value = contentLines
		console.log('[首页] 实时播报内容已更新，共', contentLines.length, '条')
	} catch (error) {
		console.error('[首页] 加载公益播报失败', error)
		charityNotices.value = ['您的每一笔订单都在为公益事业贡献力量']
	}
}

/**
 * 图片加载失败处理
 */
const handleImageError = (e) => {
	console.log('图片加载失败:', e)
	// 使用默认图片
	if (e.target) {
		e.target.src = '/static/logo.png'
	}
}

/**
 * 加载未读消息数（消息功能已去掉，仅清除导航栏红点，不再请求接口或设置红点）
 */
const loadUnreadCount = async () => {
	removeTabBarBadge(2)
}

/**
 * 加载所有数据
 */
const loadAllData = async () => {
	loading.value = true
	try {
	await Promise.all([
		loadBanners(),
		loadProducts(), // 统一加载商品列表
		loadUnreadCount(),
		loadCharityNotices()
	])
	console.log('[首页] 所有数据加载完成', {
		banners: bannerList.value.length,
		vipProducts: vipProducts.value.length,
		normalProducts: normalProducts.value.length
	})
	} catch (error) {
		console.error('[首页] 加载数据失败', error)
	} finally {
		loading.value = false
	}
}

/**
 * 下拉刷新 - 页码加一，加载下一页
 */
const onRefresh = async () => {
	refreshing.value = true
	loading.value = true
	try {
		// 页码加一，加载下一页
		const nextPage = currentPage.value + 1
		console.log(`[首页] 下拉刷新，加载第${nextPage}页商品，每页${pageSize.value}个`)
		
		await loadProducts(nextPage, true) // append=true 追加模式
		
		uni.showToast({
			title: '加载成功',
			icon: 'success',
			duration: 1500
		})
	} catch (error) {
		console.error('刷新失败', error)
		uni.showToast({
			title: '刷新失败',
			icon: 'none',
			duration: 1500
		})
	} finally {
		loading.value = false
		// 延迟关闭刷新状态，让用户看到刷新动画
		setTimeout(() => {
			refreshing.value = false
		}, 500)
	}
}

/**
 * 刷新恢复
 */
const onRestore = () => {
	refreshing.value = false
}

/**
 * scroll-view 滚动到底部事件处理
 */
const handleScrollToLower = (e) => {
	console.log('[首页] scroll-view scrolltolower 事件触发', e)
	onLoadMore()
}

/**
 * 滚动到底部自动加载更多商品
 */
const onLoadMore = async () => {
	console.log('[首页] 滚动到底部，开始加载更多商品', {
		loadingMore: loadingMore.value,
		hasMore: hasMore.value,
		currentPage: currentPage.value,
		timestamp: new Date().toISOString()
	})
	
	if (loadingMore.value || !hasMore.value) {
		console.log('[首页] 跳过加载：正在加载中或没有更多数据', {
			loadingMore: loadingMore.value,
			hasMore: hasMore.value
		})
		return
	}
	
	loadingMore.value = true
	try {
		const nextPage = currentPage.value + 1
		console.log(`[首页] 滚动到底部，加载第${nextPage}页商品，每页${pageSize.value}个`)
		
		await loadProducts(nextPage, true)
		
		console.log('[首页] 加载更多商品成功', {
			vipProducts: allVipProducts.value.length,
			normalProducts: allNormalProducts.value.length,
			hasMore: hasMore.value,
			currentPage: currentPage.value
		})
	} catch (error) {
		console.error('[首页] 加载更多商品失败', error)
		uni.showToast({
			title: '加载失败',
			icon: 'none',
			duration: 1500
		})
	} finally {
		loadingMore.value = false
	}
}

/**
 * 会员专区横向滚动到底部时加载更多会员商品
 * 实际上也是加载下一页商品，但触发条件是 VIP 列表右滑到尽头
 */
const onVipLoadMore = async () => {
	console.log('[首页] 会员商品右滑到底，尝试加载更多', {
		loadingMore: loadingMore.value,
		hasMore: hasMore.value,
		currentPage: currentPage.value
	})
	
	if (loadingMore.value || !hasMore.value) {
		console.log('[首页] 会员商品加载更多被跳过（正在加载或没有更多）')
		return
	}
	
	// 直接复用纵向加载逻辑
	await onLoadMore()
}

/**
 * 尝试在首页绑定推荐人（带重试和备用方案）
 * @param {Number} retryCount 当前重试次数
 * @param {Number} maxRetries 最大重试次数
 */
const tryBindReferrerOnHome = async (retryCount = 0, maxRetries = 3) => {
	console.log('🔄 [首页推荐人绑定] ========== 开始绑定流程 ==========')
	console.log(`🔄 [首页推荐人绑定] 当前重试次数: ${retryCount}/${maxRetries}`)
	
	try {
		// 1. 获取推荐码（优先从 pendingReferralCode，然后从 pendingReferrer）
		console.log('📝 [首页推荐人绑定] 步骤1: 获取推荐码')
		let referralCode = uni.getStorageSync('pendingReferralCode') || ''
		console.log('📝 [首页推荐人绑定] 从 pendingReferralCode 获取:', referralCode || '无')
		
		// 如果没有，尝试从 pendingReferrer 获取
		if (!referralCode) {
			const pending = getPendingReferrer()
			console.log('📝 [首页推荐人绑定] 从 pendingReferrer 获取:', pending)
			if (pending && pending.referralCode) {
				referralCode = pending.referralCode
				console.log('✅ [首页推荐人绑定] 从 pendingReferrer 获取到推荐码:', referralCode)
			}
		}
		
		// 检查是否是扫码进入（通过 pendingReferrer 的 source 判断）
		const pending = getPendingReferrer()
		const isFromQrcode = pending && (pending.source === 'qrcode' || pending.referrerId)
		
		if (!referralCode || !referralCode.trim()) {
		console.log('❌ [首页推荐人绑定] 未找到推荐码，结束绑定流程')
		// 如果是扫码登录且没有推荐码，静默处理（不提示）
		if (isFromQrcode) {
			console.log('ℹ️ [首页推荐人绑定] 扫码进入但未找到推荐码')
		}
		return
		}
		
		console.log('✅ [首页推荐人绑定] 推荐码:', referralCode)
		
		// 2. 获取用户信息
		console.log('📝 [首页推荐人绑定] 步骤2: 获取用户信息')
		const userInfo = uni.getStorageSync('userInfo') || {}
		let userMobile = userInfo.mobile || userInfo.phone || ''
		const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
		
		console.log('📝 [首页推荐人绑定] 用户信息:', {
			user_id: userId || '无',
			mobile: userMobile || '无',
			phone: userInfo.phone || '无',
			hasUserInfo: Object.keys(userInfo).length > 0
		})
		
		// 3. 如果 userMobile 为空，尝试通过 user_id 获取手机号
		if (!userMobile || !userMobile.trim()) {
			if (userId) {
				console.log('🔄 [首页推荐人绑定] 步骤3: userMobile为空，尝试通过user_id获取手机号')
				console.log('🔄 [首页推荐人绑定] user_id:', userId)
				try {
					console.log('📤 [首页推荐人绑定] 调用 getMobileByUserId 接口...')
					const mobileRes = await getMobileByUserId(userId, 'gm2025')
					console.log('📥 [首页推荐人绑定] 通过user_id获取手机号响应:', mobileRes)
					
					// 解析手机号（兼容多种响应格式）
					if (mobileRes) {
						if (typeof mobileRes === 'string') {
							userMobile = mobileRes
							console.log('✅ [首页推荐人绑定] 解析方式: 直接字符串')
						} else if (mobileRes.data && typeof mobileRes.data === 'object' && mobileRes.data.mobile) {
							userMobile = mobileRes.data.mobile
							console.log('✅ [首页推荐人绑定] 解析方式: res.data.mobile')
						} else if (mobileRes.mobile) {
							userMobile = mobileRes.mobile
							console.log('✅ [首页推荐人绑定] 解析方式: res.mobile')
						} else if (mobileRes.data && typeof mobileRes.data === 'string') {
							userMobile = mobileRes.data
							console.log('✅ [首页推荐人绑定] 解析方式: res.data (字符串)')
						} else if (mobileRes.phone) {
							userMobile = mobileRes.phone
							console.log('✅ [首页推荐人绑定] 解析方式: res.phone')
						}
						
						if (userMobile) {
							console.log('✅ [首页推荐人绑定] 通过user_id成功获取手机号:', userMobile)
							// 保存手机号到本地存储
							userInfo.mobile = userMobile
							userInfo.phone = userMobile
							uni.setStorageSync('userInfo', userInfo)
							console.log('💾 [首页推荐人绑定] 手机号已保存到本地存储')
						} else {
							console.warn('⚠️ [首页推荐人绑定] 无法从响应中解析出手机号')
						}
					} else {
						console.warn('⚠️ [首页推荐人绑定] 响应为空')
					}
				} catch (mobileError) {
					console.error('❌ [首页推荐人绑定] 通过user_id获取手机号失败:', mobileError)
					console.error('❌ [首页推荐人绑定] 错误详情:', {
						message: mobileError.message,
						stack: mobileError.stack
					})
				}
			} else {
				console.warn('⚠️ [首页推荐人绑定] 没有user_id，无法通过user_id获取手机号')
			}
		} else {
			console.log('✅ [首页推荐人绑定] 从userInfo中获取到手机号:', userMobile)
		}
		
		// 4. 如果还是没有 userMobile，且未达到最大重试次数，等待后重试
		if (!userMobile || !userMobile.trim()) {
			if (retryCount < maxRetries) {
				const waitTime = (retryCount + 1) * 1000
				console.log(`⏳ [首页推荐人绑定] 无法获取用户标识，等待 ${waitTime}ms 后重试 (${retryCount + 1}/${maxRetries})`)
				setTimeout(() => {
					tryBindReferrerOnHome(retryCount + 1, maxRetries)
				}, waitTime)
				return
			} else {
				console.warn('⚠️ [首页推荐人绑定] 已达到最大重试次数，无法获取用户标识，跳过绑定推荐人')
				console.warn('⚠️ [首页推荐人绑定] 最终用户信息:', userInfo)
				return
			}
		}
		
		// 5. 清理推荐码
		console.log('📝 [首页推荐人绑定] 步骤4: 清理推荐码')
		let cleanCode = referralCode.trim()
		const originalCode = cleanCode
		cleanCode = cleanCode.replace(/^["']|["']$/g, '').replace(/\\/g, '').trim()
		console.log('📝 [首页推荐人绑定] 推荐码清理:', {
			原始值: originalCode,
			清理后: cleanCode,
			长度: cleanCode.length
		})
		
		if (!cleanCode) {
			console.warn('⚠️ [首页推荐人绑定] 推荐码清理后为空，结束绑定流程')
			return
		}
		
		// 6. 调用绑定接口
		console.log('📝 [首页推荐人绑定] 步骤5: 调用绑定接口')
		const params = {
			mobile: userMobile,
			referrer_code: cleanCode
		}
		
		console.log('📤 [首页推荐人绑定] 发送绑定请求，参数:', JSON.stringify(params, null, 2))
		console.log('📤 [首页推荐人绑定] 请求URL: POST /user/bind-referrer')
		console.log('📤 [首页推荐人绑定] 请求时间:', new Date().toLocaleString())
		
		const result = await bindReferrer(params)
		
		console.log('📥 [首页推荐人绑定] 步骤6: 接收绑定响应')
		console.log('📥 [首页推荐人绑定] 完整响应对象:', result)
		console.log('📥 [首页推荐人绑定] 响应类型:', typeof result)
		console.log('📥 [首页推荐人绑定] 响应数据结构:', {
			原始响应: result,
			响应数据: result?.data,
			嵌套数据: result?.data?.data,
			响应消息: result?.message || result?.msg || result?.data?.message,
			响应状态: result?.success,
			响应码: result?.code || result?.statusCode
		})
		
		// 7. 检查响应是否成功
		const isSuccess = result?.success === true || 
		                  result?.code === 200 || 
		                  result?.code === 0 ||
		                  (result?.data && result.data.success === true) ||
		                  (!result?.code && !result?.error && !result?.message?.includes('失败'))
		
		console.log('📝 [首页推荐人绑定] 步骤7: 判断绑定结果')
		console.log('📝 [首页推荐人绑定] 是否成功:', isSuccess)
		
		if (isSuccess) {
			console.log('✅ [首页推荐人绑定] ========== 绑定成功 ==========')
			console.log('✅ [首页推荐人绑定] 成功响应数据:', JSON.stringify(result, null, 2))
			
			// 清除已使用的推荐码
			console.log('📝 [首页推荐人绑定] 步骤8: 清除已使用的推荐码')
			uni.removeStorageSync('pendingReferralCode')
			console.log('✅ [首页推荐人绑定] 已清除 pendingReferralCode')
			
			const pending = getPendingReferrer()
			if (pending && pending.referralCode === cleanCode) {
				uni.removeStorageSync('pendingReferrer')
				console.log('✅ [首页推荐人绑定] 已清除 pendingReferrer')
			}
			
			// 绑定成功，不显示提示（静默成功）
			
			console.log('✅ [首页推荐人绑定] ========== 绑定流程完成 ==========')
		} else {
			console.warn('⚠️ [首页推荐人绑定] ========== 绑定失败 ==========')
			console.warn('⚠️ [首页推荐人绑定] 失败响应:', result)
			console.warn('⚠️ [首页推荐人绑定] 失败原因分析:', {
				响应码: result?.code || result?.statusCode,
				响应消息: result?.message || result?.msg,
				是否有错误: !!result?.error
			})
			
			// 检查是否是"已绑定"的错误
			const errorMsg = result?.message || result?.msg || result?.errorMsg || result?.detail || ''
			const isAlreadyBound = errorMsg.includes('已有推荐人') || 
			                      errorMsg.includes('不能重复绑定') || 
			                      errorMsg.includes('已绑定') ||
			                      errorMsg.includes('重复绑定')
			
			if (isAlreadyBound) {
				console.log('ℹ️ [首页推荐人绑定] 用户已绑定过推荐人，清除推荐码，不再重试')
				uni.removeStorageSync('pendingReferralCode')
				const pending = getPendingReferrer()
				if (pending) {
					uni.removeStorageSync('pendingReferrer')
				}
				console.log('✅ [首页推荐人绑定] 推荐码已清除，停止绑定流程')
				
				// 提示已绑定
				uni.showToast({
					title: '已绑定',
					icon: 'none',
					duration: 2000
				})
				
				return // 直接返回，不再重试
			} else {
				// 绑定失败，显示失败信息
				const failMsg = errorMsg || result?.message || result?.msg || '绑定失败'
				console.error('❌ [首页推荐人绑定] 绑定失败，失败信息:', failMsg)
				uni.showToast({
					title: failMsg,
					icon: 'none',
					duration: 3000
				})
			}
		}
	} catch (error) {
		console.error('❌ [首页推荐人绑定] ========== 绑定异常 ==========')
		console.error('❌ [首页推荐人绑定] 异常类型:', error.name)
		console.error('❌ [首页推荐人绑定] 异常消息:', error.message)
		console.error('❌ [首页推荐人绑定] 异常堆栈:', error.stack)
		console.error('❌ [首页推荐人绑定] 完整错误对象:', error)
		
		// 检查错误信息中是否包含"已绑定"相关提示
		const errorMsg = error.message || error.detail || error.errorMsg || ''
		const errorData = error.data || error.response || {}
		const errorDataMsg = errorData.message || errorData.msg || errorData.errorMsg || errorData.detail || ''
		const fullErrorMsg = (errorMsg + ' ' + errorDataMsg).toLowerCase()
		
		const isAlreadyBound = fullErrorMsg.includes('已有推荐人') || 
		                      fullErrorMsg.includes('不能重复绑定') || 
		                      fullErrorMsg.includes('已绑定') ||
		                      fullErrorMsg.includes('重复绑定') ||
		                      error.message?.includes('已有推荐人') ||
		                      error.message?.includes('不能重复绑定') ||
		                      error.message?.includes('已绑定')
		
		if (isAlreadyBound) {
			console.log('ℹ️ [首页推荐人绑定] 检测到"已绑定"错误，清除推荐码，不再重试')
			console.log('ℹ️ [首页推荐人绑定] 错误信息:', errorMsg || errorDataMsg)
			// 已绑定过，清除推荐码，不再重试
			uni.removeStorageSync('pendingReferralCode')
			const pending = getPendingReferrer()
			if (pending) {
				uni.removeStorageSync('pendingReferrer')
			}
			console.log('✅ [首页推荐人绑定] 推荐码已清除，停止绑定流程')
			
			// 提示已绑定
			uni.showToast({
				title: '已绑定',
				icon: 'none',
				duration: 2000
			})
			
			return // 直接返回，不再重试
		} else {
			// 绑定失败，显示失败信息
			const failMsg = errorMsg || errorDataMsg || error.message || '绑定失败'
			console.error('❌ [首页推荐人绑定] 绑定失败，失败信息:', failMsg)
			uni.showToast({
				title: failMsg,
				icon: 'none',
				duration: 3000
			})
			
			// 如果是网络错误或其他可重试的错误，且未达到最大重试次数，等待后重试
			if (retryCount < maxRetries) {
				const waitTime = (retryCount + 1) * 1000
				console.log(`⏳ [首页推荐人绑定] 绑定失败，等待 ${waitTime}ms 后重试 (${retryCount + 1}/${maxRetries})`)
				setTimeout(() => {
					tryBindReferrerOnHome(retryCount + 1, maxRetries)
				}, waitTime)
			} else {
				console.error('❌ [首页推荐人绑定] 已达到最大重试次数，结束绑定流程')
			}
		}
	}
}

onLoad(async () => {
	loading.value = true
	try {
		// 首次加载：重置页码为0，加载第一页
		currentPage.value = 0
		await Promise.all([
			loadBanners(),
			loadProducts(1, false), // 首次加载第一页，不追加
			loadUnreadCount(),
			loadCharityNotices()
		])
		console.log('[首页] 首次加载完成', {
			banners: bannerList.value.length,
			vipProducts: vipProducts.value.length,
			normalProducts: normalProducts.value.length
		})
		
		// 延迟执行绑定，确保用户信息已加载
		setTimeout(() => {
			tryBindReferrerOnHome()
		}, 1000)
	} catch (error) {
		console.error('首页数据加载失败', error)
	} finally {
		loading.value = false
	}
})

onShow(() => {
	// 每次显示页面时更新未读消息数和播报内容
	loadUnreadCount()
	loadCharityNotices() // 实时更新播报内容

	// 尝试绑定推荐人（延迟执行，确保用户信息已加载）
	setTimeout(() => {
		tryBindReferrerOnHome()
	}, 500)
})

/**
 * 页面滚动到底部时触发（作为 scroll-view 的备用方案）
 */
onReachBottom(() => {
	console.log('[首页] onReachBottom 触发，尝试加载更多')
	onLoadMore()
})
</script>

<style scoped>
.home-page {
	min-height: 100vh;
	background: #f5f5f5;
}

.scroll-container {
	height: 100vh;
}

/* 左上角品牌：圆形 logo + 禹泽数字 */
.home-header {
	display: flex;
	align-items: center;
	padding: 24rpx 30rpx 16rpx;
	background: white;
	gap: 20rpx;
}
.brand-logo {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: #f5f5f5;
	flex-shrink: 0;
}
.brand-name {
	font-size: 36rpx;
	font-weight: 600;
	color: #333;
}

/* 搜索栏 */
.search-bar {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 20rpx 30rpx;
	background: white;
}

.search-input {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 20rpx 30rpx;
	background: #f5f5f5;
	border-radius: 50rpx;
}

.scan-pay-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 16rpx 20rpx;
	min-width: 120rpx;
}

.scan-icon {
	font-size: 44rpx;
	color: #ff9000;
	margin-bottom: 4rpx;
}

.scan-pay-text {
	font-size: 22rpx;
	color: #666;
}

.search-icon {
	font-size: 36rpx;
	color: #999;
}

.search-placeholder {
	font-size: 28rpx;
	color: #999;
}

/* 轮播图 */
.banner-swiper {
	width: 100%;
	height: 360rpx;
}

.banner-image {
	width: 100%;
	height: 100%;
}

.banner-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f5f5f5;
}

.placeholder-text {
	font-size: 28rpx;
	color: #999;
}

/* 公益播报 */
.charity-notice {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 20rpx 30rpx;
	background: linear-gradient(135deg, #fff5f5, #ffe5e5);
	margin: 20rpx 30rpx;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.1);
}

.notice-icon {
	font-size: 36rpx;
	flex-shrink: 0;
	color: #ff6b6b;
	animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
	0%, 100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.1);
	}
}

.notice-swiper {
	flex: 1;
	height: 60rpx;
}

.notice-text {
	font-size: 26rpx;
	color: #ff6b6b;
	line-height: 60rpx;
	display: block;
}

.notice-more {
	display: flex;
	align-items: center;
	gap: 4rpx;
	flex-shrink: 0;
}

.more-text {
	font-size: 24rpx;
	color: #ff6b6b;
}

.more-arrow {
	font-size: 20rpx;
	color: #ff6b6b;
}

/* 商品专区 */
.product-section {
	background: #fff;
	margin-bottom: 20rpx;
	padding: 30rpx;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24rpx;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.section-badge {
	background: linear-gradient(135deg, #ffd700, #ffed4e);
	color: #8b4513;
	font-size: 20rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	font-weight: bold;
}

.more-btn {
	font-size: 26rpx;
	color: #999;
}

/* 横向滚动商品列表 */
.product-scroll {
	white-space: nowrap;
}

.product-list {
	display: inline-flex;
	gap: 20rpx;
}

/* 商品卡片 */
.product-card {
	display: inline-block;
	background: #fff;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.vip-card {
	width: 280rpx;
	border: 2rpx solid #ffd700;
}

.normal-card {
	width: 330rpx;
	margin-bottom: 20rpx;
}

.product-image {
	width: 100%;
	height: 280rpx;
}

.product-info {
	padding: 20rpx;
}

.product-name {
	font-size: 28rpx;
	color: #333;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: 1.4;
	min-height: 78rpx;
}

.product-tags {
	display: flex;
	gap: 8rpx;
	margin: 12rpx 0;
}

.tag {
	font-size: 20rpx;
	padding: 4rpx 12rpx;
	border-radius: 6rpx;
}

.vip-tag {
	background: linear-gradient(135deg, #ffd700, #ffed4e);
	color: #8b4513;
}

.level-tag {
	background: #fff0f0;
	color: #ff5252;
}

.product-price {
	display: flex;
	flex-direction: column;
	margin-top: 12rpx;
}

.price-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 8rpx;
}

.price {
	font-size: 32rpx;
	color: #ff5252;
	font-weight: bold;
}

.points-deduction {
	font-size: 22rpx;
	color: #ff9800;
	background: #fff5e6;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.origin-price {
	font-size: 24rpx;
	color: #999;
	text-decoration: line-through;
}

.sales {
	font-size: 24rpx;
	color: #999;
}

/* 网格布局 */
.product-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
}

.product-grid .normal-card {
	width: 330rpx;
	margin-bottom: 20rpx;
}

/* 加载更多提示 */
.loading-more {
	width: 100%;
	text-align: center;
	padding: 40rpx 0;
}

.loading-text {
	font-size: 26rpx;
	color: #999;
}

.no-more {
	width: 100%;
	text-align: center;
	padding: 40rpx 0;
}

.no-more-text {
	font-size: 24rpx;
	color: #ccc;
}
</style>
