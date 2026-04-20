<template>
  <view class="product-list-page">
    <scroll-view 
      class="page-scroll"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @refresherrestore="onRestore"
      @scrolltolower="loadMore"
      :lower-threshold="100"
    >
    <!-- 类别筛选栏 -->
    <view class="category-filter-bar">
      <scroll-view class="category-scroll" scroll-x>
        <view class="category-list">
          <view 
            v-for="category in categories" 
            :key="category.value"
            class="category-item"
            :class="{ active: selectedCategory === category.value }"
            @tap="selectCategory(category.value)"
          >
            <text class="category-text">{{ category.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <!-- 排序选项 -->
    <view class="sort-bar">
      <view 
        v-for="option in sortOptions" 
        :key="option.value"
        class="sort-option"
        :class="{ active: currentSort === option.value }"
        @tap="switchSort(option.value)"
      >
        <text class="sort-text">{{ option.label }}</text>
        <text v-if="option.value === 'price'" class="sort-arrow">
          {{ sortOrder === 'asc' ? '↑' : '↓' }}
        </text>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="products-container">
      <view class="products-grid">
        <view 
          v-for="product in filteredProducts" 
          :key="product.id"
          class="product-card"
          :class="{ 'vip-card': product.isVip }"
          @tap="goToDetail(product.id)"
        >
          <view class="product-image-wrapper">
            <image :src="product.image" class="product-image" mode="aspectFill" />
            <view v-if="product.isVip" class="vip-badge">
              <text class="badge-text">VIP</text>
            </view>
            <view v-if="product.isHot" class="hot-badge">
              <text class="badge-text">热销</text>
            </view>
          </view>
          
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <view v-if="product.tags && product.tags.length > 0" class="product-tags">
              <text 
                v-for="tag in product.tags.slice(0, 2)" 
                :key="tag" 
                class="tag"
              >
                {{ tag }}
              </text>
            </view>
            
            <view class="product-price-row">
              <view class="price-info">
                <text class="current-price">¥{{ product.price }}</text>
                <text v-if="product.originPrice" class="origin-price">¥{{ product.originPrice }}</text>
              </view>
              <view class="sales-stock-info">
                <text class="sales-info">已售{{ product.sales || 0 }}</text>
                <text class="stock-info">库存{{ product.stock !== undefined ? product.stock : 0 }}</text>
              </view>
            </view>
            
            <!-- 会员商品特殊信息 -->
            <view v-if="product.isVip" class="vip-info">
              <text class="vip-text">会员专享 · 升级权益</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 加载中 -->
      <view v-if="loading && filteredProducts.length > 0" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
      
      <!-- 已加载完 -->
      <view v-if="!hasMore && filteredProducts.length > 0" class="no-more">
        <text class="no-more-text">已显示全部</text>
      </view>
      
      <!-- 空状态 -->
      <view v-if="filteredProducts.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无商品</text>
      </view>
    </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getProductList, searchProducts, getProductSales } from '@/api/product.js'
import config from '@/utils/config.js'

const productType = ref(1) // 1-会员商品，2-普通商品
const selectedCategory = ref('all')
const currentSort = ref('default')
const sortOrder = ref('desc')
const loading = ref(false)
const hasMore = ref(true)
const refreshing = ref(false)
const currentPage = ref(1)
const pageSize = ref(30) // 每页加载30个商品

// 商品类别（动态从后端数据中提取）
const categories = ref([
  { label: '全部', value: 'all' }
])

const categoryLabelMap = computed(() => {
  const map = {}
  categories.value.forEach(item => {
  map[item.value] = item.label
  })
  return map
})

// 筛选标签
const filterTabs = computed(() => {
  if (productType.value === 1) {
    return [
      { label: '全部', value: 'all' },
      { label: '一星', value: 'star1' },
      { label: '二星', value: 'star2' },
      { label: '三星', value: 'star3' },
      { label: '四星', value: 'star4' },
      { label: '五星', value: 'star5' },
      { label: '六星', value: 'star6' }
    ]
  } else {
    return [
      { label: '全部', value: 'all' },
      { label: '热销', value: 'hot' },
      { label: '新品', value: 'new' },
      { label: '推荐', value: 'recommend' }
    ]
  }
})

// 排序选项
const sortOptions = [
  { label: '默认', value: 'default' },
  { label: '价格', value: 'price' },
  { label: '销量', value: 'sales' }
]

// 商品列表 - 从API或本地存储加载，不再使用硬编码数据
const products = ref([])

// 过滤后的商品列表（主要用于排序，分类筛选已在API层面完成）
const filteredProducts = computed(() => {
  let result = [...products.value]
  
  // 如果有关键词，在前端再次过滤（API已过滤，这里作为补充）
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(product => {
      const matchName = product.name.toLowerCase().includes(keyword)
      const categoryKey = (product.category || '').toLowerCase()
      const categoryLabel = (categoryLabelMap.value[product.category] || '').toLowerCase()
      const matchCategory = categoryKey.includes(keyword) || categoryLabel.includes(keyword)
      const matchTags = (product.tags || []).some(tag => tag.toLowerCase().includes(keyword))
      return matchName || matchCategory || matchTags
    })
  }
  
  // 排序
  if (currentSort.value === 'price') {
    result.sort((a, b) => {
      return sortOrder.value === 'asc' ? a.price - b.price : b.price - a.price
    })
  } else if (currentSort.value === 'sales') {
    result.sort((a, b) => b.sales - a.sales)
  }
  
  return result
})

/**
 * 选择类别
 */
const selectCategory = (category) => {
  selectedCategory.value = category
  // 切换分类时重新加载商品
  loadProducts()
}

/**
 * 切换筛选条件
 */
const switchFilter = (filter) => {
  currentFilter.value = filter
}

/**
 * 切换排序方式
 */
const switchSort = (sort) => {
  if (sort === 'price' && currentSort.value === 'price') {
    // 切换价格排序顺序
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    currentSort.value = sort
    if (sort === 'price') {
      sortOrder.value = 'desc'
    }
  }
}

/**
 * 跳转到商品详情
 */
const goToDetail = (productId) => {
  uni.navigateTo({ url: `/subPackages/page2/pages/product/detail?id=${productId}` })
}

/**
 * 加载更多（不断增加页数查询，直到没有商品）
 */
const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  
  try {
    loading.value = true
    currentPage.value++
    
    console.log('[商品列表] 加载更多，页码:', currentPage.value)
    
    let res
    // 如果有关键词，使用搜索接口；否则使用商品列表接口
    if (searchKeyword.value && searchKeyword.value.trim()) {
      res = await searchProducts({
        keyword: searchKeyword.value.trim(),
        page: currentPage.value,
        pageSize: pageSize.value
      })
    } else {
      res = await getProductList({
        page: currentPage.value,
        size: pageSize.value
      })
    }
    
    // 处理不同的响应格式
    let productList = []
    if (Array.isArray(res.data)) {
      productList = res.data
    } else if (res.data?.list && Array.isArray(res.data.list)) {
      productList = res.data.list
    } else if (Array.isArray(res.list)) {
      productList = res.list
    } else if (res.data?.data && Array.isArray(res.data.data)) {
      productList = res.data.data
    }
    
    console.log('[商品列表] 加载更多返回', productList.length, '个商品')
    
    // 如果没有商品了，停止加载
    if (productList.length === 0) {
      hasMore.value = false
      uni.showToast({ title: '没有更多商品了', icon: 'none' })
      return
    }
    
    // 过滤在售商品，并排除轮播图商品
    const onSaleProducts = productList.filter(p => {
      const isOnSale = p.status === 1 || p.status === 'on_sale' || p.status === 'active'
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
    
    // 根据商品类型筛选
    let filteredList = []
    if (productType.value === 1) {
      filteredList = onSaleProducts.filter(p => {
        return p.is_member_product === true || p.is_member_product === 1 || p.is_member_product === 'true'
      })
    } else if (productType.value === 2) {
      filteredList = onSaleProducts.filter(p => {
        return p.is_member_product === false || 
               p.is_member_product === 0 || 
               p.is_member_product === 'false' || 
               p.is_member_product === null || 
               p.is_member_product === undefined
      })
    } else {
      filteredList = onSaleProducts
    }
    
    // 分类筛选
    if (selectedCategory.value !== 'all') {
      filteredList = filteredList.filter(p => {
        const productCategory = (p.category || '').toString().trim()
        const selectedCategoryValue = selectedCategory.value.toString().trim()
        return productCategory === selectedCategoryValue
      })
    }
    
    // 格式化商品数据
    const formattedProducts = filteredList.map(p => {
      let price = 0
      let originPrice = null
      const isMemberProduct = p.is_member_product === 1 || p.is_member_product === true
      
      if (p.skus && p.skus.length > 0) {
        const firstSku = p.skus[0]
        if (firstSku.price !== undefined && firstSku.price !== null) {
          price = parseFloat(firstSku.price)
        }
        if (firstSku.original_price !== undefined && firstSku.original_price !== null) {
          originPrice = parseFloat(firstSku.original_price)
        }
      } else if (p.price) {
        price = parseFloat(p.price)
      }
      
      const processImageUrl = (img) => {
        if (!img) return null
        if (img.startsWith('http://') || img.startsWith('https://')) return img
        if (img.startsWith('/static')) return img
        const imagePath = img.startsWith('/') ? img : `/${img}`
        return `${config.baseURL}${imagePath}`
      }
      
      let image = null
      if (p.banner_images && Array.isArray(p.banner_images) && p.banner_images.length > 0) {
        image = processImageUrl(p.banner_images[0])
      }
      if (!image && p.images && Array.isArray(p.images) && p.images.length > 0) {
        image = processImageUrl(p.images[0])
      }
      if (!image && p.main_image) {
        image = processImageUrl(p.main_image)
      }
      if (!image) {
        image = processImageUrl(p.image_url) || processImageUrl(p.image) || '/static/logo.png'
      }
      
      let skuCode = ''
      if (p.skus && p.skus.length > 0 && p.skus[0].sku_code) {
        skuCode = p.skus[0].sku_code
      } else if (p.sku_code) {
        skuCode = p.sku_code
      } else {
        skuCode = `PROD-${String(p.id).padStart(3, '0')}-2024`
      }
      
      let stock = 0
      if (p.skus && Array.isArray(p.skus) && p.skus.length > 0) {
        stock = p.skus.reduce((sum, sku) => {
          const skuStock = parseInt(sku.stock) || 0
          return sum + skuStock
        }, 0)
      } else if (p.stock !== undefined && p.stock !== null) {
        stock = parseInt(p.stock) || 0
      }
      
      return {
        id: p.id,
        name: p.name || '未命名商品',
        price: price,
        originPrice: originPrice,
        image: image,
        sales: p.sales || 0,
        stock: stock,
        isVip: p.is_member_product || p.is_vip || p.isVip || false,
        category: p.category || '',
        tags: (p.attributes || []).map(attr => attr.value).filter(Boolean) || p.tags || [],
        sku: skuCode
      }
    })
    
    // 批量获取商品销量
    const salesPromises = formattedProducts.map(product => 
      getProductSales(product.id).catch(() => null)
    )
    const salesResults = await Promise.allSettled(salesPromises)
    
    salesResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value?.data) {
        const salesData = result.value.data
        const salesCount = salesData.sales_count || salesData.sold_count || salesData.total_quantity || salesData.quantity || salesData.sales_quantity || 0
        if (formattedProducts[index]) {
          formattedProducts[index].sales = parseInt(salesCount)
        }
      }
    })
    
    // 追加到现有商品列表
    products.value = [...products.value, ...formattedProducts]
    
    // 如果返回的商品数量少于每页数量，说明没有更多了
    if (productList.length < pageSize.value) {
      hasMore.value = false
    }
    
    console.log('[商品列表] 加载更多完成，当前商品总数:', products.value.length)
  } catch (error) {
    console.error('[商品列表] 加载更多失败:', error)
    currentPage.value-- // 回退页码
    uni.showToast({ 
      title: error.message || '加载失败，请重试', 
      icon: 'none' 
    })
  } finally {
    loading.value = false
  }
}

const searchKeyword = ref('')

onLoad(async (options) => {
  console.log('[商品列表] 页面加载，参数:', options)
  
  if (options.type) {
    productType.value = parseInt(options.type)
    console.log('[商品列表] 商品类型:', productType.value === 1 ? '会员商品' : '普通商品')
  }
  
  // 接收搜索关键词
  if (options.keyword) {
    searchKeyword.value = decodeURIComponent(options.keyword)
    console.log('[商品列表] 搜索关键词:', searchKeyword.value)
  }
  
  // 设置页面标题
  if (searchKeyword.value) {
    uni.setNavigationBarTitle({ title: `搜索: ${searchKeyword.value}` })
  } else {
    uni.setNavigationBarTitle({
      title: productType.value === 1 ? '会员商品' : '普通商品'
    })
  }
  
  // 加载商品
  console.log('[商品列表] 开始加载商品...')
  await loadProducts()
})

// 每次显示页面时重新加载商品
onShow(async () => {
  console.log('[商品列表] 页面显示，重新加载商品...')
  await loadProducts()
})

/**
 * 加载商品列表（和首页逻辑一样，只是加了分类筛选）
 */
const loadProducts = async () => {
  loading.value = true
  // 重置分页状态
  currentPage.value = 1
  hasMore.value = true
  products.value = []
  
  try {
    let res
    // 如果有关键词，使用搜索接口；否则使用商品列表接口（和首页一样）
    if (searchKeyword.value && searchKeyword.value.trim()) {
      console.log('[商品列表] 使用搜索接口，关键词:', searchKeyword.value)
      res = await searchProducts({
        keyword: searchKeyword.value.trim(),
        page: currentPage.value,
        pageSize: pageSize.value
      })
    } else {
      // 和首页一样，不传type参数，获取所有商品
      // 注意：选择"全部"时，不传category参数，获取所有商品后再在前端筛选
      const params = { 
        page: currentPage.value, 
        size: pageSize.value
      }
      
      // 不在这里传category参数，而是在前端筛选
      // 因为后端可能不支持category参数，或者需要获取所有商品后再筛选
      
      console.log('[商品列表] 调用商品列表接口，参数:', params)
      res = await getProductList(params)
      console.log('[商品列表] API响应:', res)
    }
    
    // 处理不同的响应格式（和首页一样）
    let productList = []
    if (Array.isArray(res.data)) {
      productList = res.data
    } else if (res.data?.list && Array.isArray(res.data.list)) {
      productList = res.data.list
    } else if (Array.isArray(res.list)) {
      productList = res.list
    } else if (res.data?.data && Array.isArray(res.data.data)) {
      productList = res.data.data
    }
    
    console.log('[商品列表] 解析出的商品列表，数量:', productList.length)
    console.log('[商品列表] 当前选择的分类:', selectedCategory.value)
    console.log('[商品列表] 商品类型:', productType.value === 1 ? '会员商品' : '普通商品')
    
    // 从所有商品数据中提取分类（在过滤之前，确保能获取所有分类）
    // 同时包含预设的分类列表，确保所有分类都能显示
    const presetCategories = ['服装鞋帽', '数码电器', '美妆护肤', '母婴用品', '家居生活', '运动户外', '食品饮料', '生鲜', '其他']
    const categorySet = new Set(presetCategories)
    
    // 从商品数据中提取实际存在的分类
    productList.forEach(p => {
      if (p.category && p.category.trim() && p.category.trim() !== '图书文具') {
        categorySet.add(p.category.trim())
      }
    })
    
    // 更新分类列表：全部 + 预设分类 + 从数据中提取的其他分类
    const dynamicCategories = [{ label: '全部', value: 'all' }]
    // 先添加预设分类（按顺序）
    presetCategories.forEach(cat => {
      if (categorySet.has(cat)) {
        dynamicCategories.push({ label: cat, value: cat })
        categorySet.delete(cat) // 从Set中移除，避免重复
      }
    })
    // 再添加其他从数据中提取的分类（按字母顺序）
    Array.from(categorySet).sort().forEach(cat => {
      dynamicCategories.push({ label: cat, value: cat })
    })
    categories.value = dynamicCategories
    
    console.log('[商品列表] 动态提取的分类（从所有商品）:', categories.value.map(c => c.label))
    
    // 过滤在售商品，并排除轮播图商品（和首页一样）
    const onSaleProducts = productList.filter(p => {
      // 必须是上架状态
      const isOnSale = p.status === 1 || p.status === 'on_sale' || p.status === 'active'
      // 排除轮播图商品（名称包含"轮播图"或SKU以"BANNER-"开头）
      const productName = (p.name || '').toLowerCase()
      const isBannerByName = productName.includes('轮播图'	)
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
    
    // 根据 is_member_product 字段区分会员商品和普通商品（和首页一样）
    let filteredList = []
    if (productType.value === 1) {
      // 会员商品
      filteredList = onSaleProducts.filter(p => {
        return p.is_member_product === true || p.is_member_product === 1 || p.is_member_product === 'true'
      })
    } else if (productType.value === 2) {
      // 普通商品
      filteredList = onSaleProducts.filter(p => {
        return p.is_member_product === false || 
               p.is_member_product === 0 || 
               p.is_member_product === 'false' || 
               p.is_member_product === null || 
               p.is_member_product === undefined
      })
    } else {
      filteredList = onSaleProducts
    }
    
    // 分类筛选（如果选择了分类，且不是"全部"）
    const beforeCategoryFilter = filteredList.length
    if (selectedCategory.value !== 'all') {
      filteredList = filteredList.filter(p => {
        const productCategory = (p.category || '').toString().trim()
        const selectedCategoryValue = selectedCategory.value.toString().trim()
        return productCategory === selectedCategoryValue
      })
      console.log(`[商品列表] 分类筛选: ${beforeCategoryFilter} -> ${filteredList.length} (筛选条件: ${selectedCategory.value})`)
    } else {
      console.log(`[商品列表] 选择"全部"分类，不进行分类筛选，显示所有商品 (${filteredList.length}个)`)
    }
    
    console.log('[商品列表] 最终过滤后的商品数量:', filteredList.length, {
      商品类型: productType.value === 1 ? '会员商品' : '普通商品',
      选择分类: selectedCategory.value,
      筛选前数量: beforeCategoryFilter,
      筛选后数量: filteredList.length
    })
    
    // 格式化商品数据（和首页的formatProduct逻辑一样）
    products.value = filteredList.map(p => {
      // 处理价格：使用 SKU 中的 price（现价）和 original_price（原价）
      let price = 0
      let originPrice = null
      const isMemberProduct = p.is_member_product === 1 || p.is_member_product === true
      
      // 优先使用第一个 SKU 的价格
      if (p.skus && p.skus.length > 0) {
        const firstSku = p.skus[0]
        if (firstSku.price !== undefined && firstSku.price !== null) {
          price = parseFloat(firstSku.price)
        }
        if (firstSku.original_price !== undefined && firstSku.original_price !== null) {
          originPrice = parseFloat(firstSku.original_price)
        }
      } else if (p.price) {
        // 如果没有 SKU，使用商品级别的价格
        price = parseFloat(p.price)
      }
      
      // 处理图片：优先使用 banner_images 数组的第一张，然后尝试其他字段
      let image = null
      
      // 处理图片URL的辅助函数
      const processImageUrl = (img) => {
        if (!img) return null
        if (img.startsWith('http://') || img.startsWith('https://')) return img
        if (img.startsWith('/static')) return img
        const imagePath = img.startsWith('/') ? img : `/${img}`
        return `${config.baseURL}${imagePath}`
      }
      
      // 优先使用 banner_images 数组的第一张
      if (p.banner_images && Array.isArray(p.banner_images) && p.banner_images.length > 0) {
        image = processImageUrl(p.banner_images[0])
      }
      
      // 如果没有 banner_images，尝试使用 images 数组
      if (!image && p.images && Array.isArray(p.images) && p.images.length > 0) {
        image = processImageUrl(p.images[0])
      }
      
      // 如果还没有，尝试使用 main_image
      if (!image && p.main_image) {
        image = processImageUrl(p.main_image)
      }
      
      // 如果还没有，尝试其他字段
      if (!image) {
        image = processImageUrl(p.image_url) || processImageUrl(p.image) || '/static/logo.png'
      }
      
      // 处理商品编号：使用 sku_code（优先使用 skus 中的 sku_code）
      let skuCode = ''
      if (p.skus && p.skus.length > 0 && p.skus[0].sku_code) {
        skuCode = p.skus[0].sku_code
      } else if (p.sku_code) {
        skuCode = p.sku_code
      } else {
        skuCode = `PROD-${String(p.id).padStart(3, '0')}-2024`
      }
      
      // 处理库存：从 skus 中汇总，或使用 stock 字段
      let stock = 0
      if (p.skus && Array.isArray(p.skus) && p.skus.length > 0) {
        // 从所有 SKU 中汇总库存
        stock = p.skus.reduce((sum, sku) => {
          const skuStock = parseInt(sku.stock) || 0
          return sum + skuStock
        }, 0)
        console.log(`[商品列表] 商品 ${p.id} 从SKU汇总库存:`, stock, 'SKU数据:', p.skus)
      } else if (p.stock !== undefined && p.stock !== null) {
        stock = parseInt(p.stock) || 0
        console.log(`[商品列表] 商品 ${p.id} 使用stock字段:`, stock)
      } else {
        console.warn(`[商品列表] 商品 ${p.id} 没有库存数据`)
      }
      
      return {
          id: p.id,
        name: p.name || '未命名商品',
        price: price,
          originPrice: originPrice, // 使用 SKU 中的 original_price
        image: image,
          sales: p.sales || 0, // 如果后续有销量映射，会被覆盖
        stock: stock,
          isVip: p.is_member_product || p.is_vip || p.isVip || false,
          category: p.category || '',
        tags: (p.attributes || []).map(attr => attr.value).filter(Boolean) || p.tags || [],
        sku: skuCode
      }
    })
    
    // 批量获取商品销量
    console.log('[商品列表] 开始获取商品销量，商品数量:', products.value.length)
    const salesPromises = products.value.map(product => 
      getProductSales(product.id).catch(() => null)
    )
    const salesResults = await Promise.allSettled(salesPromises)
    
    // 应用销量数据
    salesResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value?.data) {
        const salesData = result.value.data
        // 优先使用 sales_count，如果没有则尝试其他字段
        const salesCount = salesData.sales_count || salesData.sold_count || salesData.total_quantity || salesData.quantity || salesData.sales_quantity || 0
        if (products.value[index]) {
          products.value[index].sales = parseInt(salesCount)
        }
      }
    })
    console.log('[商品列表] 销量数据获取完成')
    
    // 如果返回的商品数量少于每页数量，说明没有更多了
    if (productList.length < pageSize.value) {
      hasMore.value = false
    } else {
      // 如果还有更多，增加页码
      currentPage.value++
    }
  } catch (error) {
    console.error('[商品列表] 加载失败:', error)
    products.value = []
    hasMore.value = false
    uni.showToast({ 
      title: error.message || '加载失败，请重试', 
      icon: 'none',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

/**
 * 下拉刷新
 */
const onRefresh = async () => {
  refreshing.value = true
  try {
    await loadProducts()
    uni.showToast({ title: '刷新成功', icon: 'success', duration: 1000 })
  } catch (error) {
    console.error('刷新失败', error)
    uni.showToast({ title: '刷新失败', icon: 'none', duration: 1000 })
  } finally {
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

onMounted(() => {
  console.log('商品列表页面加载')
})

onShow(() => {
  console.log('商品列表页面显示')
})
</script>

<style scoped>
.product-list-page {
  background: #f5f5f5;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-scroll {
  flex: 1;
  height: 100%;
}

/* 类别筛选栏 */
.category-filter-bar {
  background: white;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.category-scroll {
  width: 100%;
  white-space: nowrap;
}

.category-list {
  display: inline-flex;
  padding: 0 30rpx;
  gap: 20rpx;
}

.category-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 40rpx;
  background: #f8f9fa;
  transition: all 0.3s;
}

.category-item.active {
  background: linear-gradient(135deg, #ff6b6b, #ff8787);
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.3);
}

.category-text {
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
}

.category-item.active .category-text {
  color: white;
  font-weight: 600;
}

/* 排序栏 */
.sort-bar {
  background: white;
  padding: 20rpx 40rpx;
  display: flex;
  gap: 40rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.sort-option {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #666;
}

.sort-option.active {
  color: #ff4757;
  font-weight: 600;
}

.sort-arrow {
  font-size: 20rpx;
}

/* 商品列表 */
.products-container {
  padding: 40rpx;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.product-card {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.product-card.vip-card {
  border: 2rpx solid #ffd700;
}

.product-image-wrapper {
  position: relative;
  width: 100%;
  height: 300rpx;
}

.product-image {
  width: 100%;
  height: 100%;
}

.vip-badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #8b4513;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  font-size: 20rpx;
  font-weight: bold;
}

.hot-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: #ff4757;
  color: white;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  font-size: 20rpx;
  font-weight: bold;
}

.product-info {
  padding: 24rpx;
}

.product-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 12rpx;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-tags {
  display: flex;
  gap: 8rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}

.tag {
  padding: 4rpx 12rpx;
  background: #f0f4ff;
  color: #667eea;
  border-radius: 12rpx;
  font-size: 20rpx;
}

.product-price-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 12rpx;
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.current-price {
  font-size: 32rpx;
  color: #ff4757;
  font-weight: bold;
}

.origin-price {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
}

.sales-stock-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.sales-info {
  font-size: 22rpx;
  color: #999;
}

.stock-info {
  font-size: 22rpx;
  color: #999;
}

.vip-info {
  padding: 8rpx 16rpx;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #8b4513;
  border-radius: 12rpx;
  text-align: center;
}

.vip-text {
  font-size: 22rpx;
  font-weight: 600;
}

/* 加载中 */
.loading-state {
  text-align: center;
  padding: 40rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

/* 已加载完 */
.no-more {
  text-align: center;
  padding: 40rpx 0;
}

.no-more-text {
  font-size: 24rpx;
  color: #ccc;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 200rpx 0;
}

.empty-icon {
  display: block;
  font-size: 120rpx;
  margin-bottom: 30rpx;
  opacity: 0.5;
}

.empty-text {
  display: block;
  font-size: 32rpx;
  color: #999;
}
</style>