<template>
  <view class="product-add-page">
    <!-- 商家仅线下提示 -->
    <view v-if="isMerchantOfflineOnly" class="merchant-offline-tip">
      <text class="tip-text">商家商品仅线下售卖，无上架/库存概念，保存后为下架状态且不可更改。</text>
    </view>
    <!-- 商品基本信息 -->
    <view class="form-section">
      <view class="section-header">
        <text class="section-title">基本信息</text>
      </view>
      
      <view class="form-content">
        <view class="form-item">
          <text class="form-label">商品名称 *</text>
          <input 
            v-model="productForm.name"
            class="form-input"
            placeholder="请输入商品名称"
            maxlength="50"
          />
        </view>
        
        <view class="form-item">
          <text class="form-label">商品分类 *</text>
          <picker 
            :value="categoryIndex" 
            :range="categoryOptions"
            @change="onCategoryChange"
          >
            <view class="picker-input">
              <text class="picker-text">{{ productForm.category || '请选择商品分类' }}</text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>
        
        <view class="form-item">
          <text class="form-label">商品描述</text>
          <textarea 
            v-model="productForm.description"
            class="form-textarea"
            placeholder="请输入商品描述"
            maxlength="200"
          />
          <text class="char-count">{{ productForm.description.length }}/200</text>
        </view>
        
        <view class="form-item">
          <text class="form-label">购买规则</text>
          <textarea 
            v-model="productForm.buyRule"
            class="form-textarea"
            placeholder="请输入购买规则（选填，如：限购数量、购买条件等）"
            maxlength="200"
          />
          <text class="char-count">{{ productForm.buyRule.length }}/200</text>
        </view>
      </view>
    </view>

    <!-- 商品主图 -->
    <view class="form-section">
      <view class="section-header">
        <text class="section-title">商品主图</text>
        <text class="section-subtitle">最多10张，第一张用于商城展示</text>
      </view>
      
      <view class="image-upload">
        <view class="image-list">
          <view 
            v-for="(image, index) in productForm.images" 
            :key="`main-${index}-${image}`"
            class="image-item"
          >
            <image :src="image" :key="`main-img-${index}-${image}`" class="uploaded-image" mode="aspectFill" @error="handleImageError(index, 'main')" @tap="previewMainImage(index)" />
            <view v-if="index === 0" class="main-badge">主图</view>
            <view class="image-actions">
              <text class="action-btn" @tap="previewMainImage(index)">预览</text>
              <text class="action-btn delete" @tap="removeImage(index)">删除</text>
            </view>
          </view>
          
          <view 
            v-if="productForm.images.length < 10" 
            class="upload-btn"
            @tap="uploadImage"
          >
            <text class="upload-icon">📷</text>
            <text class="upload-text">添加主图</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 商品详情图 -->
    <view class="form-section">
      <view class="section-header">
        <text class="section-title">商品详情图</text>
        <text class="section-subtitle">最多上传10张，显示在商品详情页</text>
      </view>
      
      <view class="image-upload">
        <view class="image-list">
          <view 
            v-for="(image, index) in productForm.detailImages" 
            :key="`detail-${index}-${image}`"
            class="image-item"
          >
            <image :src="image" :key="`detail-img-${index}-${image}`" class="uploaded-image" mode="aspectFill" @error="handleImageError(index, 'detail')" @tap="previewDetailImage(index)" />
            <view class="image-actions">
              <text class="action-btn" @tap="previewDetailImage(index)">预览</text>
              <text class="action-btn delete" @tap="removeDetailImage(index)">删除</text>
            </view>
          </view>
          
          <view 
            v-if="productForm.detailImages.length < 10"
            class="upload-btn"
            @tap="uploadDetailImage"
          >
            <text class="upload-icon">📷</text>
            <text class="upload-text">添加详情图</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 价格库存 -->
    <view class="form-section">
      <view class="section-header">
        <text class="section-title">价格库存</text>
      </view>
      
      <view class="form-content">
        <view class="form-item">
          <text class="form-label">商品类型 *</text>
          <picker 
            :value="productTypeIndex" 
            :range="productTypeOptions"
            @change="onProductTypeChange"
          >
            <view class="picker-input">
              <text class="picker-text">
                {{ productForm.productType === 'vip' ? '会员商品' : '普通商品' }}
              </text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>

        <view class="form-item" v-if="productForm.productType !== 'vip' && !hasSpecs">
          <text class="form-label">销售价格 *</text>
          <input 
            v-model="productForm.price"
            class="form-input"
            type="digit"
            placeholder="0.0000"
            @input="onPriceInput"
            @blur="onPriceBlur"
          />
          <text class="form-hint">最多支持小数点后4位</text>
        </view>
        
        <view class="form-item" v-if="productForm.productType !== 'vip' && hasSpecs">
          <text class="form-label">销售价格</text>
          <text class="form-hint">已设置规格，请在规格组合中设置价格</text>
        </view>
        
        <view class="form-item" v-if="productForm.productType !== 'vip' && !hasSpecs">
          <text class="form-label">原价（选填）</text>
          <input 
            v-model="productForm.originPrice"
            class="form-input"
            type="digit"
            placeholder="0.0000"
            @input="onOriginPriceInput"
            @blur="onOriginPriceBlur"
          />
          <text class="form-hint">最多支持小数点后4位</text>
        </view>
        
        <view class="form-item" v-if="productForm.productType === 'vip'">
          <text class="form-label">销售价格 *</text>
          <view class="vip-price-display">
            <text class="vip-price-text">¥1980.0000</text>
            <text class="vip-price-hint">会员商品固定价格</text>
          </view>
        </view>
        
        <view class="form-item">
          <text class="form-label">库存数量 *</text>
          <input 
            v-model.number="productForm.stock"
            class="form-input"
            type="number"
            placeholder="0"
          />
        </view>

        <view class="form-item" v-if="productForm.productType !== 'vip'">
          <text class="form-label">
            积分抵扣上限
            <text class="form-label-sub">(仅普通商品可用，会员商品不可使用积分)</text>
          </text>
          <input 
            v-model.number="productForm.maxPointsDeduction"
            class="form-input"
            type="digit"
            :placeholder="'最多可抵扣的金额，0表示不限制'"
            @input="onMaxPointsInput"
          />
        </view>
      </view>
    </view>

    <!-- 商品规格分类 -->
    <view class="form-section">
      <view class="section-header">
        <text class="section-title">商品规格分类</text>
        <text class="section-subtitle">先定义规格类型，再为每个样式设置具体规格值和价格库存</text>
      </view>
      
      <view class="specs-content">
        <!-- 第一步：定义规格类型 -->
        <view class="spec-types-section">
          <view class="step-header">
            <view class="step-number">1</view>
            <text class="step-title">定义规格类型</text>
          </view>
          <view class="step-hint">
            <text class="hint-icon">💡</text>
            <text class="hint-text">定义商品的规格分类，如：颜色、尺寸、款式等。每个分类只需输入名称即可。</text>
          </view>
          
          <view 
            v-for="(spec, specIndex) in productForm.specs" 
            :key="specIndex"
            class="spec-type-item"
          >
            <view class="spec-type-icon">📋</view>
            <input 
              v-model="spec.name"
              class="spec-name-input"
              placeholder="请输入规格类型名称（如：颜色、尺寸、款式）"
            />
            <text class="spec-remove" @tap="removeSpec(specIndex)">删除</text>
          </view>
          
          <view class="add-spec-btn" @tap="addSpec">
            <text class="add-icon">+</text>
            <text class="add-text">添加规格类型</text>
          </view>
        </view>
        
        <!-- 第二步：添加样式 -->
        <view class="styles-section" v-if="productForm.specs.length > 0">
          <view class="step-header">
            <view class="step-number">2</view>
            <text class="step-title">添加样式（每个样式为一个SKU）</text>
          </view>
          <view class="step-hint">
            <text class="hint-icon">💡</text>
            <text class="hint-text">为每个样式选择具体的规格值，并设置独立的价格和库存。例如：红色+大号，价格99元，库存100件。</text>
          </view>
          
          <view 
            v-for="(style, styleIndex) in styles" 
            :key="styleIndex"
            class="style-item"
          >
            <view class="style-header">
              <view class="style-title-wrapper">
                <text class="style-icon">🎨</text>
                <text class="style-title">样式 {{ styleIndex + 1 }}</text>
              </view>
              <text class="style-remove" @tap="removeStyle(styleIndex)">删除样式</text>
            </view>
            
            <!-- 为每个样式选择规格值 -->
            <view class="style-specs">
              <view 
                v-for="(spec, specIndex) in productForm.specs" 
                :key="specIndex"
                class="style-spec-item"
              >
                <text class="style-spec-label">{{ spec.name }}：</text>
                <input 
                  v-model="style.specifications[spec.name]"
                  class="style-spec-input"
                  :placeholder="`请输入${spec.name}的具体值（如：红色、大号）`"
                />
              </view>
            </view>
            
            <!-- 每个样式的价格和库存 -->
            <view class="style-fields">
              <view class="field-item">
                <text class="field-label">价格 <text class="required-mark">*</text></text>
                <input 
                  v-if="productForm.productType === 'vip'"
                  :value="1980"
                  class="field-input vip-price-disabled"
                  type="digit"
                  disabled
                  placeholder="会员商品固定价格1980"
                />
                <input 
                  v-else
                  v-model="style.price"
                  class="field-input"
                  type="digit"
                  placeholder="请输入价格"
                  @input="(e) => onStylePriceInput(e, styleIndex)"
                  @blur="(e) => onStylePriceBlur(e, styleIndex)"
                />
                <text v-if="productForm.productType === 'vip'" class="vip-price-hint-small">会员商品固定价格</text>
              </view>
              <view class="field-item">
                <text class="field-label">原价（选填）</text>
                <input 
                  v-if="productForm.productType === 'vip'"
                  :value="0"
                  class="field-input vip-price-disabled"
                  type="digit"
                  disabled
                  placeholder="会员商品无原价"
                />
                <input 
                  v-else
                  v-model="style.originalPrice"
                  class="field-input"
                  type="digit"
                  placeholder="请输入原价"
                  @input="(e) => onStyleOriginalPriceInput(e, styleIndex)"
                  @blur="(e) => onStyleOriginalPriceBlur(e, styleIndex)"
                />
              </view>
              <view class="field-item">
                <text class="field-label">库存 <text class="required-mark">*</text></text>
                <input 
                  v-model.number="style.stock"
                  class="field-input"
                  type="number"
                  placeholder="请输入库存数量"
                />
              </view>
            </view>
          </view>
          
          <view class="add-style-btn" @tap="addStyle">
            <text class="add-icon">+</text>
            <text class="add-text">添加样式</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="bottom-actions">
      <button class="action-btn publish" @tap="publishProduct">
        发布商品
      </button>
    </view>
    
    <!-- 隐藏的Canvas用于长图裁剪 -->
    <canvas 
      canvas-id="cropLongImageCanvas" 
      style="position: fixed; top: -9999px; left: -9999px; width: 4000px; height: 3000px;"
      :style="{ width: '4000px', height: '3000px' }"
    ></canvas>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createProduct, updateProduct, uploadProductImages, updateProductImages, deleteProductImages, getProductDetail } from '@/api/product.js'
import config from '@/utils/config.js'
import { chooseImageWithPermission } from '../../utils/permission.js'

const productId = ref('')
const isMerchantOfflineOnly = ref(false) // 商家端：仅线下售卖，商品固定为下架状态不可改
const newTag = ref('')
const categoryIndex = ref(0)
const rawProductData = ref(null) // 保存原始商品数据，用于更新时匹配SKU的id
const productTypeIndex = ref(0) // 0-普通商品 1-会员商品

// 商品表单数据（必须在其他使用它的函数之前声明）
const productForm = ref({
  name: '',
  category: '',
  description: '',
  buyRule: '', // 购买规则
  tags: [],
  images: [],
  detailImages: [],
  price: 0,
  originPrice: 0,
  stock: 0,
  specs: [],
  // 商品类型：normal-普通商品，vip-会员商品
  productType: 'normal',
  // 普通商品可设置的积分抵扣上限（单件），会员商品固定为0
  maxPointsDeduction: 0,
  // 兼容旧字段
  isVip: false
})

// 样式列表（每个样式为一个SKU）
const styles = ref([])

// 判断是否有规格类型
const hasSpecs = computed(() => {
  return productForm.value.specs && productForm.value.specs.length > 0 && 
    productForm.value.specs.some(spec => spec.name && spec.name.trim())
})

// 判断是否有规格（不再需要检查价格，因为所有SKU使用统一价格）

// 监听规格类型变化，更新样式的specifications结构
watch(() => productForm.value.specs, (newSpecs, oldSpecs) => {
  if (!newSpecs || newSpecs.length === 0) {
    styles.value = []
    return
  }
  
  // 获取所有规格名称
  const specNames = newSpecs
    .filter(spec => spec.name && spec.name.trim())
    .map(spec => spec.name.trim())
  
  // 更新每个样式的specifications，确保包含所有规格类型
  styles.value.forEach(style => {
    specNames.forEach(specName => {
      if (!(specName in style.specifications)) {
        style.specifications[specName] = ''
      }
    })
    
    // 移除已删除的规格
    Object.keys(style.specifications).forEach(key => {
      if (!specNames.includes(key)) {
        delete style.specifications[key]
      }
    })
  })
}, { deep: true })

// 分类选项
const categoryOptions = [
  '服装鞋帽', '数码电器', '美妆护肤', '母婴用品', 
  '家居生活', '运动户外', '图书文具', '食品饮料', '其他'
]

// 商品类型选项
const productTypeOptions = ['普通商品', '会员商品']

const onProductTypeChange = (e) => {
  // picker 返回的可能是字符串，这里统一转成数字索引
  const index = Number(e.detail.value || 0)
  productTypeIndex.value = index
  const type = index === 1 ? 'vip' : 'normal'
  productForm.value.productType = type
  productForm.value.isVip = type === 'vip'

  // 会员商品不允许积分抵扣，上限强制为0
  if (type === 'vip') {
    productForm.value.maxPointsDeduction = 0
    // 会员商品默认价格为1980元
    productForm.value.price = '1980.0000'
    productForm.value.originPrice = ''
    
    // 更新所有已有样式的价格为1980，原价为0
    if (styles.value && styles.value.length > 0) {
      styles.value.forEach(style => {
        style.price = '1980'
        style.originalPrice = '0'
      })
    }
  } else {
    // 普通商品如果价格是1980，清空（避免误操作）
    if (productForm.value.price === '1980.0000' || productForm.value.price === '1980') {
      productForm.value.price = ''
    }
  }
}

// 价格输入处理：限制只能输入数字，最多4位小数
const onPriceInput = (e) => {
  let value = e.detail.value
  // 如果输入为空，直接返回空字符串，不自动添加0
  if (value === '') {
    productForm.value.price = ''
    return
  }
  // 移除前导0（除非是0.xxx格式）
  value = value.replace(/^0+(?=\d)/, '') // 移除前导0，但保留0.xxx
  // 只允许数字和小数点
  value = value.replace(/[^\d.]/g, '')
  // 确保只有一个小数点
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }
  // 限制小数点后最多4位
  if (parts.length === 2 && parts[1].length > 4) {
    value = parts[0] + '.' + parts[1].substring(0, 4)
  }
  productForm.value.price = value
}

// 价格失焦处理：确保是有效的数字格式
const onPriceBlur = () => {
  const raw = productForm.value.price
  let value = (raw === '' || raw === null || raw === undefined) ? '' : String(raw)
  if (value === '' || value === '.') {
    productForm.value.price = ''
  } else {
    // 确保是有效的数字格式
    value = value.replace(/^\./, '0.') // 如果以小数点开头，前面加0
    value = value.replace(/\.$/, '') // 如果以小数点结尾，去掉小数点
    if (value === '' || (value === '0' && !value.includes('.'))) {
      productForm.value.price = ''
    } else {
      productForm.value.price = value
    }
  }
}

// 原价输入处理：限制只能输入数字，最多4位小数
const onOriginPriceInput = (e) => {
  let value = e.detail.value
  // 如果输入为空，直接返回空字符串，不自动添加0
  if (value === '') {
    productForm.value.originPrice = ''
    return
  }
  // 移除前导0（除非是0.xxx格式）
  value = value.replace(/^0+(?=\d)/, '') // 移除前导0，但保留0.xxx
  // 只允许数字和小数点
  value = value.replace(/[^\d.]/g, '')
  // 确保只有一个小数点
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }
  // 限制小数点后最多4位
  if (parts.length === 2 && parts[1].length > 4) {
    value = parts[0] + '.' + parts[1].substring(0, 4)
  }
  productForm.value.originPrice = value
}

// 原价失焦处理：确保是有效的数字格式
const onOriginPriceBlur = () => {
  const raw = productForm.value.originPrice
  let value = (raw === '' || raw === null || raw === undefined) ? '' : String(raw)
  if (value === '' || value === '.') {
    productForm.value.originPrice = ''
  } else {
    // 确保是有效的数字格式
    value = value.replace(/^\./, '0.') // 如果以小数点开头，前面加0
    value = value.replace(/\.$/, '') // 如果以小数点结尾，去掉小数点
    if (value === '' || (value === '0' && !value.includes('.'))) {
      productForm.value.originPrice = ''
    } else {
      productForm.value.originPrice = value
    }
  }
}

// 获取规格组合的文本显示（支持多个规格）
const getCombinationText = (combination) => {
  if (!combination.specifications) return ''
  // 多个规格，格式化为 "规格名:值 / 规格名:值" 的格式
  const entries = Object.entries(combination.specifications)
  if (entries.length === 0) return ''
  if (entries.length === 1) {
    // 只有一个规格，直接显示值
    return entries[0][1]
  }
  // 多个规格，显示 "规格名:值" 格式
  return entries.map(([key, value]) => `${key}:${value}`).join(' / ')
}

// 已移除：规格组合价格处理函数（所有SKU使用统一价格）

// 规格组合价格输入处理：限制只能输入数字，最多4位小数（旧版本，保留兼容）
const onSpecCombinationPriceInput = (e, specIndex) => {
  let value = e.detail.value
  // 如果输入为空，直接返回空字符串，不自动添加0
  if (value === '') {
    if (productForm.value.specs[specIndex]) {
      productForm.value.specs[specIndex].combinationPrice = ''
    }
    return
  }
  // 移除前导0（除非是0.xxx格式）
  value = value.replace(/^0+(?=\d)/, '') // 移除前导0，但保留0.xxx
  // 只允许数字和小数点
  value = value.replace(/[^\d.]/g, '')
  // 确保只有一个小数点
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }
  // 限制小数点后最多4位
  if (parts.length === 2 && parts[1].length > 4) {
    value = parts[0] + '.' + parts[1].substring(0, 4)
  }
  if (productForm.value.specs[specIndex]) {
    productForm.value.specs[specIndex].combinationPrice = value
  }
}

// 规格组合价格失焦处理：确保是有效的数字格式
const onSpecCombinationPriceBlur = (e, specIndex) => {
  const raw = e && e.detail ? e.detail.value : ''
  let value = (raw === '' || raw === null || raw === undefined) ? '' : String(raw)
  if (value === '' || value === '.') {
    value = ''
  } else {
    // 确保是有效的数字格式
    value = value.replace(/^\./, '0.') // 如果以小数点开头，前面加0
    value = value.replace(/\.$/, '') // 如果以小数点结尾，去掉小数点
    if (value === '' || (value === '0' && !value.includes('.'))) {
      value = ''
    }
  }
  if (productForm.value.specs[specIndex]) {
    productForm.value.specs[specIndex].combinationPrice = value
  }
}

// 积分抵扣输入时，自动限制在 0 ~ 价格 之间（仅普通商品生效）
const onMaxPointsInput = () => {
  if (productForm.value.productType === 'vip') {
    productForm.value.maxPointsDeduction = 0
    return
  }
  let v = Number(productForm.value.maxPointsDeduction || 0)
  if (Number.isNaN(v) || v < 0) v = 0
  if (productForm.value.price > 0 && v > productForm.value.price) {
    v = productForm.value.price
  }
  productForm.value.maxPointsDeduction = v
}

/**
 * 分类选择
 */
const onCategoryChange = (e) => {
  categoryIndex.value = e.detail.value
  productForm.value.category = categoryOptions[e.detail.value]
}



/**
 * 添加标签
 */
const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !productForm.value.tags.includes(tag)) {
    productForm.value.tags.push(tag)
    newTag.value = ''
  }
}

/**
 * 删除标签
 */
const removeTag = (index) => {
  productForm.value.tags.splice(index, 1)
}

/**
 * 上传商品主图（最多10张）
 */
const uploadImage = async () => {
  const remainingCount = 10 - productForm.value.images.length
  if (remainingCount <= 0) {
    uni.showToast({ title: '最多上传10张主图', icon: 'none' })
    return
  }
  
  // 某些平台（如微信小程序）count 最大值为9，需要限制
  const maxCount = Math.min(remainingCount, 9)
  
  try {
    // 使用统一的权限检查和图片选择工具
    const res = await chooseImageWithPermission({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    })
    
    if (res && res.tempFilePaths && res.tempFilePaths.length > 0) {
      console.log('[商品主图] ===== 开始添加图片 =====')
      console.log('[商品主图] 选择的图片数量:', res.tempFilePaths.length)
      console.log('[商品主图] 选择的图片路径:', res.tempFilePaths)
      console.log('[商品主图] 选择前的图片数量:', productForm.value.images.length)
      console.log('[商品主图] 选择前的图片路径:', productForm.value.images)
      
      // 检查是否超过最大数量限制
      const actualRemaining = 10 - productForm.value.images.length
      const selectedCount = res.tempFilePaths.length
      const canAddCount = Math.min(selectedCount, actualRemaining)
      
      // 直接使用 push 方法逐个添加，不要修改路径（临时文件路径不支持查询参数）
      let addedCount = 0
      for (let i = 0; i < canAddCount; i++) {
        const path = res.tempFilePaths[i]
        // 检查路径是否已存在，避免重复添加
        if (!productForm.value.images.includes(path)) {
          console.log(`[商品主图] 添加第${i + 1}张图片:`, path)
          productForm.value.images.push(path)
          addedCount++
        } else {
          console.log(`[商品主图] 跳过重复图片:`, path)
        }
      }
      
      // 如果选择的图片数量超过了剩余可添加数量，提示用户
      if (selectedCount > actualRemaining) {
        uni.showToast({ 
          title: `最多只能添加${actualRemaining}张，已添加${addedCount}张`, 
          icon: 'none',
          duration: 2000
        })
      }
      
      // 强制触发响应式更新
      productForm.value = { ...productForm.value }
      
      console.log('[商品主图] 追加后的图片数量:', productForm.value.images.length)
      console.log('[商品主图] 所有图片路径:', JSON.stringify(productForm.value.images))
      console.log('[商品主图] ===== 图片添加完成 =====')
      
      // 延迟一下再显示提示，确保UI已更新
      if (addedCount > 0) {
        setTimeout(() => {
          uni.showToast({ title: `已添加${addedCount}张主图`, icon: 'success' })
        }, 100)
      }
    } else {
      console.warn('[商品主图] 未选择图片或选择失败')
    }
  } catch (error) {
    console.error('[商品主图] 选择图片失败:', error)
    const errorMsg = error.message || error.errMsg || '选择图片失败'
    if (errorMsg.includes('permission') || errorMsg.includes('权限')) {
      uni.showToast({ title: '需要相册和相机权限，请在设置中开启', icon: 'none', duration: 3000 })
    } else {
      uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 })
    }
  }
}

/**
 * 删除图片
 */
const removeImage = async (index) => {
  const imageToRemove = productForm.value.images[index]
  if (!imageToRemove) return
  
  // 如果是服务器上的图片（包含 /pic/ 路径），需要调用API删除
  if (imageToRemove && typeof imageToRemove === 'string' && imageToRemove.includes('/pic/')) {
    // 提取图片路径：从完整URL或相对路径中提取 /pic/ 之后的部分
    let imageUrl = imageToRemove
    if (imageToRemove.includes('http://') || imageToRemove.includes('https://')) {
      // 完整URL，提取路径部分
      try {
        const urlObj = new URL(imageToRemove)
        imageUrl = urlObj.pathname
      } catch (e) {
        // URL解析失败，手动提取
        const match = imageToRemove.match(/\/pic\/[^?]*/)
        if (match) {
          imageUrl = match[0]
        } else {
          // 如果匹配失败，尝试直接使用 /pic/ 之后的部分
          const picIndex = imageToRemove.indexOf('/pic/')
          if (picIndex !== -1) {
            imageUrl = imageToRemove.substring(picIndex)
          }
        }
      }
    } else if (!imageToRemove.startsWith('/pic/')) {
      // 相对路径但不以 /pic/ 开头，添加 /pic/
      imageUrl = imageToRemove.startsWith('/') ? imageToRemove : `/${imageToRemove}`
    }
    
    // 确保路径以 /pic/ 开头
    if (!imageUrl.startsWith('/pic/')) {
      console.warn('[删除图片] 图片路径格式不正确，尝试修复:', imageUrl)
      // 尝试从路径中提取 /pic/ 部分
      const picMatch = imageUrl.match(/\/pic\/.*/)
      if (picMatch) {
        imageUrl = picMatch[0]
      } else {
        console.error('[删除图片] 无法提取有效的图片路径:', imageToRemove)
        // 如果无法提取，直接从前端移除
        productForm.value.images.splice(index, 1)
        return
      }
    }
    
    if (productId.value && imageUrl) {
      try {
        uni.showLoading({ title: '删除中...' })
        console.log('[删除图片] 准备删除轮播图:', {
          productId: productId.value,
          imageUrl: imageUrl,
          imageType: 'banner'
        })
        await deleteProductImages(productId.value, {
          image_urls: [imageUrl],
          image_type: 'banner' // 明确指定图片类型为轮播图
        })
        uni.hideLoading()
        uni.showToast({ title: '图片已删除', icon: 'success' })
        // API删除成功，从列表中移除
        productForm.value.images.splice(index, 1)
      } catch (error) {
        uni.hideLoading()
        console.error('删除图片失败:', error)
        const errorMsg = error.message || error.msg || error.detail || '删除失败'
        uni.showToast({ 
          title: errorMsg, 
          icon: 'none',
          duration: 2000
        })
        // API删除失败，不从前端移除，让用户重试
        return
      }
    } else {
      // 没有商品ID或图片URL，直接从前端移除
      productForm.value.images.splice(index, 1)
    }
  } else {
    // 本地图片（临时文件），直接从前端移除
    productForm.value.images.splice(index, 1)
  }
}

/**
 * 上传详情图片（最多10张）
 */
const uploadDetailImage = async () => {
  const remainingCount = 10 - productForm.value.detailImages.length
  if (remainingCount <= 0) {
    uni.showToast({ title: '最多上传10张详情图', icon: 'none' })
    return
  }
  
  // 某些平台（如微信小程序）count 最大值为9，需要限制
  const maxCount = Math.min(remainingCount, 9)
  
  try {
    // 使用统一的权限检查和图片选择工具
    const res = await chooseImageWithPermission({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    })
    
    if (res && res.tempFilePaths && res.tempFilePaths.length > 0) {
      console.log('[商品详情图] ===== 开始添加图片 =====')
      console.log('[商品详情图] 选择的图片数量:', res.tempFilePaths.length)
      console.log('[商品详情图] 选择的图片路径:', res.tempFilePaths)
      console.log('[商品详情图] 选择前的图片数量:', productForm.value.detailImages.length)
      console.log('[商品详情图] 选择前的图片路径:', productForm.value.detailImages)
      
      // 检查是否超过最大数量限制
      const actualRemaining = 10 - productForm.value.detailImages.length
      const selectedCount = res.tempFilePaths.length
      const canAddCount = Math.min(selectedCount, actualRemaining)
      
      // 直接使用 push 方法逐个添加，不要修改路径（临时文件路径不支持查询参数）
      let addedCount = 0
      for (let i = 0; i < canAddCount; i++) {
        const path = res.tempFilePaths[i]
        // 检查路径是否已存在，避免重复添加
        if (!productForm.value.detailImages.includes(path)) {
          console.log(`[商品详情图] 添加第${i + 1}张图片:`, path)
          productForm.value.detailImages.push(path)
          addedCount++
        } else {
          console.log(`[商品详情图] 跳过重复图片:`, path)
        }
      }
      
      // 如果选择的图片数量超过了剩余可添加数量，提示用户
      if (selectedCount > actualRemaining) {
        uni.showToast({ 
          title: `最多只能添加${actualRemaining}张，已添加${addedCount}张`, 
          icon: 'none',
          duration: 2000
        })
      }
      
      // 强制触发响应式更新
      productForm.value = { ...productForm.value }
      
      console.log('[商品详情图] 追加后的图片数量:', productForm.value.detailImages.length)
      console.log('[商品详情图] 所有图片路径:', JSON.stringify(productForm.value.detailImages))
      console.log('[商品详情图] ===== 图片添加完成 =====')
      
      // 延迟一下再显示提示，确保UI已更新
      if (addedCount > 0) {
        setTimeout(() => {
          uni.showToast({ title: `已添加${addedCount}张详情图`, icon: 'success' })
        }, 100)
      }
    } else {
      console.warn('[商品详情图] 未选择图片或选择失败')
    }
  } catch (error) {
    console.error('[商品详情图] 选择图片失败:', error)
    const errorMsg = error.message || error.errMsg || '选择图片失败'
    if (errorMsg.includes('permission') || errorMsg.includes('权限')) {
      uni.showToast({ title: '需要相册和相机权限，请在设置中开启', icon: 'none', duration: 3000 })
    } else {
      uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 })
    }
  }
}

/**
 * 删除详情图片
 */
const removeDetailImage = async (index) => {
  const imageToRemove = productForm.value.detailImages[index]
  if (!imageToRemove) return
  
  // 如果是服务器上的图片（包含 /pic/ 路径），需要调用API删除
  if (imageToRemove && typeof imageToRemove === 'string' && imageToRemove.includes('/pic/')) {
    // 提取图片路径：从完整URL或相对路径中提取 /pic/ 之后的部分
    let imageUrl = imageToRemove
    if (imageToRemove.includes('http://') || imageToRemove.includes('https://')) {
      // 完整URL，提取路径部分
      try {
        const urlObj = new URL(imageToRemove)
        imageUrl = urlObj.pathname
      } catch (e) {
        // URL解析失败，手动提取
        const match = imageToRemove.match(/\/pic\/[^?]*/)
        if (match) {
          imageUrl = match[0]
        } else {
          // 如果匹配失败，尝试直接使用 /pic/ 之后的部分
          const picIndex = imageToRemove.indexOf('/pic/')
          if (picIndex !== -1) {
            imageUrl = imageToRemove.substring(picIndex)
          }
        }
      }
    } else if (!imageToRemove.startsWith('/pic/')) {
      // 相对路径但不以 /pic/ 开头，添加 /pic/
      imageUrl = imageToRemove.startsWith('/') ? imageToRemove : `/${imageToRemove}`
    }
    
    // 确保路径以 /pic/ 开头
    if (!imageUrl.startsWith('/pic/')) {
      console.warn('[删除详情图] 图片路径格式不正确，尝试修复:', imageUrl)
      // 尝试从路径中提取 /pic/ 部分
      const picMatch = imageUrl.match(/\/pic\/.*/)
      if (picMatch) {
        imageUrl = picMatch[0]
      } else {
        console.error('[删除详情图] 无法提取有效的图片路径:', imageToRemove)
        // 如果无法提取，直接从前端移除
        productForm.value.detailImages.splice(index, 1)
        return
      }
    }
    
    if (productId.value && imageUrl) {
      try {
        uni.showLoading({ title: '删除中...' })
        console.log('[删除详情图] 准备删除详情图:', {
          productId: productId.value,
          imageUrl: imageUrl,
          imageType: 'detail'
        })
        await deleteProductImages(productId.value, {
          image_urls: [imageUrl],
          image_type: 'detail' // 明确指定图片类型为详情图
        })
        uni.hideLoading()
        uni.showToast({ title: '图片已删除', icon: 'success' })
        // API删除成功，从列表中移除
        productForm.value.detailImages.splice(index, 1)
      } catch (error) {
        uni.hideLoading()
        console.error('删除详情图失败:', error)
        const errorMsg = error.message || error.msg || error.detail || '删除失败'
        uni.showToast({ 
          title: errorMsg, 
          icon: 'none',
          duration: 2000
        })
        // API删除失败，不从前端移除，让用户重试
        return
      }
    } else {
      // 没有商品ID或图片URL，直接从前端移除
      productForm.value.detailImages.splice(index, 1)
    }
  } else {
    // 本地图片（临时文件），直接从前端移除
    productForm.value.detailImages.splice(index, 1)
  }
}

/**
 * 预览主图
 */
const previewMainImage = (index) => {
  const images = productForm.value.images
  if (!images || images.length === 0) {
    uni.showToast({ title: '暂无图片', icon: 'none' })
    return
  }
  
  // 确保 urls 是数组，current 是当前图片路径
  const current = images[index] || images[0]
  console.log('[预览主图] 当前索引:', index, '图片路径:', current, '总数量:', images.length)
  
  // 确保所有图片路径都是有效的
  const validImages = images.filter(img => img && (img.startsWith('http') || img.startsWith('/') || img.startsWith('file://')))
  
  if (validImages.length === 0) {
    uni.showToast({ title: '图片路径无效', icon: 'none' })
    return
  }
  
  // 找到当前图片在有效图片中的索引
  const currentIndex = validImages.findIndex(img => img === current)
  const finalCurrent = currentIndex >= 0 ? validImages[currentIndex] : validImages[0]
  
  uni.previewImage({
    urls: validImages, // 必须是数组
    current: finalCurrent, // 当前显示的图片路径
    fail: (err) => {
      console.error('[预览主图] 预览失败:', err)
      uni.showToast({ title: '预览失败', icon: 'none' })
    }
  })
}

/**
 * 预览详情图
 */
const previewDetailImage = (index) => {
  const images = productForm.value.detailImages
  if (!images || images.length === 0) {
    uni.showToast({ title: '暂无图片', icon: 'none' })
    return
  }
  
  // 确保 urls 是数组，current 是当前图片路径
  const current = images[index] || images[0]
  console.log('[预览详情图] 当前索引:', index, '图片路径:', current, '总数量:', images.length)
  
  // 确保所有图片路径都是有效的
  const validImages = images.filter(img => img && (img.startsWith('http') || img.startsWith('/') || img.startsWith('file://')))
  
  if (validImages.length === 0) {
    uni.showToast({ title: '图片路径无效', icon: 'none' })
    return
  }
  
  // 找到当前图片在有效图片中的索引
  const currentIndex = validImages.findIndex(img => img === current)
  const finalCurrent = currentIndex >= 0 ? validImages[currentIndex] : validImages[0]
  
  uni.previewImage({
    urls: validImages, // 必须是数组
    current: finalCurrent, // 当前显示的图片路径
    fail: (err) => {
      console.error('[预览详情图] 预览失败:', err)
      uni.showToast({ title: '预览失败', icon: 'none' })
    }
  })
}

/**
 * 处理图片加载错误
 */
const handleImageError = (index, type) => {
  console.error(`[图片加载错误] 类型: ${type}, 索引: ${index}`)
  // 可以在这里添加默认图片或错误处理逻辑
}



/**
 * 添加规格类型（只添加规格名称，不添加选项值）
 */
const addSpec = () => {
  productForm.value.specs.push({
    name: ''
  })
}

/**
 * 删除规格类型
 */
const removeSpec = (specIndex) => {
  productForm.value.specs.splice(specIndex, 1)
  // 删除规格时，需要从所有样式中移除该规格的值
  styles.value.forEach(style => {
    const specName = productForm.value.specs[specIndex]?.name
    if (specName && style.specifications[specName]) {
      delete style.specifications[specName]
    }
  })
}

/**
 * 添加样式（每个样式为一个SKU）
 */
const addStyle = () => {
  const newStyle = {
    specifications: {},
    price: productForm.value.productType === 'vip' ? '1980' : '', // 会员商品默认价格为1980
    originalPrice: productForm.value.productType === 'vip' ? '0' : '', // 会员商品原价为0
    stock: 0
  }
  
  // 为每个规格类型初始化空值
  productForm.value.specs.forEach(spec => {
    if (spec.name && spec.name.trim()) {
      newStyle.specifications[spec.name] = ''
    }
  })
  
  styles.value.push(newStyle)
}

/**
 * 删除样式
 */
const removeStyle = (styleIndex) => {
  styles.value.splice(styleIndex, 1)
}

/**
 * 样式价格输入处理
 */
const onStylePriceInput = (e, styleIndex) => {
  // 如果是会员商品，不允许修改价格
  if (productForm.value.productType === 'vip') {
    styles.value[styleIndex].price = '1980'
    return
  }
  
  let value = e.detail.value
  if (value === '') {
    styles.value[styleIndex].price = ''
    return
  }
  value = value.replace(/^0+(?=\d)/, '')
  value = value.replace(/[^\d.]/g, '')
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }
  if (parts.length === 2 && parts[1].length > 4) {
    value = parts[0] + '.' + parts[1].substring(0, 4)
  }
  styles.value[styleIndex].price = value
}

/**
 * 样式价格失焦处理
 */
const onStylePriceBlur = (e, styleIndex) => {
  let value = styles.value[styleIndex].price
  if (value === '' || value === '.') {
    styles.value[styleIndex].price = ''
  } else {
    value = value.replace(/^\./, '0.')
    value = value.replace(/\.$/, '')
    styles.value[styleIndex].price = value || ''
  }
}

/**
 * 样式原价输入处理
 */
const onStyleOriginalPriceInput = (e, styleIndex) => {
  // 如果是会员商品，不允许修改原价（固定为0）
  if (productForm.value.productType === 'vip') {
    styles.value[styleIndex].originalPrice = '0'
    return
  }
  
  let value = e.detail.value
  if (value === '') {
    styles.value[styleIndex].originalPrice = ''
    return
  }
  value = value.replace(/^0+(?=\d)/, '')
  value = value.replace(/[^\d.]/g, '')
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }
  if (parts.length === 2 && parts[1].length > 4) {
    value = parts[0] + '.' + parts[1].substring(0, 4)
  }
  styles.value[styleIndex].originalPrice = value
}

/**
 * 样式原价失焦处理
 */
const onStyleOriginalPriceBlur = (e, styleIndex) => {
  let value = styles.value[styleIndex].originalPrice
  if (value === '' || value === '.') {
    styles.value[styleIndex].originalPrice = ''
  } else {
    value = value.replace(/^\./, '0.')
    value = value.replace(/\.$/, '')
    styles.value[styleIndex].originalPrice = value || ''
  }
}

/**
 * 发布商品
 */
const publishProduct = async () => {
  // 验证必填字段
  if (!productForm.value.name.trim()) {
    uni.showToast({ title: '请输入商品名称', icon: 'none' })
    return
  }
  
  if (!productForm.value.category) {
    uni.showToast({ title: '请选择商品分类', icon: 'none' })
    return
  }
  
  // 验证样式数据
  if (hasSpecs.value) {
    // 有规格类型时，必须至少有一个样式
    if (!styles.value || styles.value.length === 0) {
      uni.showToast({ title: '请至少添加一个样式', icon: 'none' })
      return
    }
    
    // 验证每个样式的必填字段
    for (let i = 0; i < styles.value.length; i++) {
      const style = styles.value[i]
      
      // 检查价格
      if (!style.price || parseFloat(style.price) <= 0) {
        uni.showToast({ title: `样式 ${i + 1} 的价格无效`, icon: 'none' })
        return
      }
      
      // 检查库存
      if (!style.stock || parseInt(style.stock) < 0) {
        uni.showToast({ title: `样式 ${i + 1} 的库存无效`, icon: 'none' })
        return
      }
    }
  } else {
    // 没有规格时，商品价格和库存必填
    if (!productForm.value.price || productForm.value.price <= 0) {
      uni.showToast({ title: '请输入正确的价格', icon: 'none' })
      return
    }
    
    if (productForm.value.stock <= 0) {
      uni.showToast({ title: '请输入正确的库存', icon: 'none' })
      return
    }
  }

  // 校验商品类型
  if (!productForm.value.productType) {
    productForm.value.productType = 'normal'
  }

  // 根据类型处理积分抵扣规则
  if (productForm.value.productType === 'vip') {
    // 会员商品不能使用积分抵扣
    productForm.value.maxPointsDeduction = 0
    productForm.value.isVip = true
  } else {
    productForm.value.isVip = false
    if (productForm.value.maxPointsDeduction == null || productForm.value.maxPointsDeduction < 0) {
      productForm.value.maxPointsDeduction = 0
    }
    if (productForm.value.maxPointsDeduction > productForm.value.price) {
      uni.showToast({ title: '积分抵扣上限不能大于商品价格', icon: 'none' })
      return
    }
  }
  
  if (productForm.value.images.length === 0) {
    uni.showToast({ title: '请上传商品图片', icon: 'none' })
    return
  }
  
  uni.showLoading({ title: '发布中...' })
  
  try {
  const isEdit = !!productId.value
    
    // 转换前端表单数据为后端API格式
    // 严格按照后端要求的格式，只包含允许的字段
    const productData = {
      name: productForm.value.name.trim(),
      description: productForm.value.description || '',
      category: productForm.value.category,
      status: isMerchantOfflineOnly.value ? 0 : 1, // 商家仅线下：固定下架(0)；否则上架(1)
      is_member_product: productForm.value.productType === 'vip',
      buy_rule: productForm.value.buyRule || '',
      freight: productForm.value.freight || 0,
      max_points_discount: productForm.value.productType === 'vip' ? 0 : (productForm.value.maxPointsDeduction || 0), // 积分抵扣上限，会员商品为0
      // 转换SKU格式：使用样式列表
      skus: (() => {
        if (styles.value && styles.value.length > 0) {
          // 有样式时，每个样式生成一个SKU
          return styles.value.map((style, idx) => {
            // 验证样式数据
            if (!style.price || parseFloat(style.price) <= 0) {
              throw new Error(`样式 ${idx + 1} 的价格无效`)
            }
            if (!style.stock || parseInt(style.stock) < 0) {
              throw new Error(`样式 ${idx + 1} 的库存无效`)
            }
            
            // 清理specifications，只保留有值的规格
            const cleanSpecs = {}
            Object.keys(style.specifications).forEach(key => {
              const value = style.specifications[key]
              if (value && value.trim()) {
                cleanSpecs[key] = value.trim()
              }
            })
            
            // 价格：会员商品固定为1980，普通商品使用样式设置的价格
            const skuPrice = productForm.value.productType === 'vip' 
              ? 1980 
              : (parseFloat(style.price) || 0)
            
            // 原价：会员商品固定为0，普通商品使用样式设置的原价
            const skuOriginalPrice = productForm.value.productType === 'vip' 
              ? 0 
              : (style.originalPrice && style.originalPrice !== '' 
                ? parseFloat(style.originalPrice) || 0 
                : 0)
            
            // 库存：使用样式设置的库存
            const skuStock = parseInt(style.stock) || 0
            
            // 获取SKU的id（从style中获取，用于更新时标识现有SKU）
            const skuId = style.id !== undefined && style.id !== null ? Number(style.id) : null
            
            // 生成SKU编码：基于规格值生成，格式类似 "TS-WHT-M-002"
            // 规则：商品名称缩写 + 规格值缩写（按规格名称排序）+ 序号
            let skuCode = ''
            
            // 商品名称缩写：取前2个字符的大写
            const productName = productForm.value.name.trim()
            let productAbbrev = ''
            if (productName.length >= 2) {
              productAbbrev = productName.substring(0, 2).toUpperCase()
            } else {
              productAbbrev = productName.toUpperCase().padEnd(2, 'X')
            }
            
            if (Object.keys(cleanSpecs).length > 0) {
              // 有规格时，使用规格值生成编码
              // 按规格名称排序，确保一致性（如：颜色、大小）
              const sortedSpecs = Object.entries(cleanSpecs)
                .sort(([key1], [key2]) => key1.localeCompare(key2))
              
              // 生成规格值缩写数组
              const specAbbrevs = sortedSpecs.map(([key, value]) => {
                const trimmedValue = String(value).trim()
                let abbrev = ''
                
                // 单个字符直接使用（如：M、L、S）
                if (trimmedValue.length === 1) {
                  abbrev = trimmedValue.toUpperCase()
                } else if (/^[\u4e00-\u9fa5]+$/.test(trimmedValue)) {
                  // 中文：常见颜色和尺寸的映射
                  const colorMap = {
                    '白色': 'WHT', '黑色': 'BLK', '红色': 'RED', '蓝色': 'BLU',
                    '绿色': 'GRN', '黄色': 'YLW', '粉色': 'PNK', '灰色': 'GRY'
                  }
                  const sizeMap = {
                    '大号': 'L', '中号': 'M', '小号': 'S', '特大': 'XL', '特小': 'XS',
                    '大': 'L', '中': 'M', '小': 'S'
                  }
                  if (colorMap[trimmedValue]) {
                    abbrev = colorMap[trimmedValue]
                  } else if (sizeMap[trimmedValue]) {
                    abbrev = sizeMap[trimmedValue]
                  } else {
                    // 其他中文，取前3个字符的大写
                    abbrev = trimmedValue.substring(0, 3).toUpperCase()
                  }
                } else {
                  // 英文或其他：取前3个字母大写
                  abbrev = trimmedValue.substring(0, 3).toUpperCase()
                }
                return abbrev
              })
              
              // 序号：3位数字，从001开始
              const sequence = String(idx + 1).padStart(3, '0')
              
              // 组合：商品缩写-规格值1-规格值2-序号
              skuCode = `${productAbbrev}-${specAbbrevs.join('-')}-${sequence}`
            } else {
              // 没有规格时，使用默认格式
              const sequence = String(idx + 1).padStart(3, '0')
              skuCode = `${productAbbrev}-DEFAULT-${sequence}`
            }
            
            return {
              id: skuId, // 如果有id，用于更新；如果没有id，为null（新增）
              sku_code: skuCode,
              price: skuPrice,
              original_price: skuOriginalPrice, // 保持数字类型，即使为0
              stock: skuStock,
              specifications: cleanSpecs
            }
          })
        } else if (productForm.value.specs && productForm.value.specs.length > 0) {
          // 有规格类型但没有样式，提示错误
          throw new Error('请至少添加一个样式')
        } else {
          // 没有规格，生成默认SKU（包含空的 specifications 对象）
          return [{
            sku_code: `DEFAULT-${Date.now()}`,
            price: productForm.value.productType === 'vip' ? 1980 : parseFloat(productForm.value.price || 0),
            original_price: productForm.value.productType === 'vip' ? 0 : (productForm.value.originPrice && productForm.value.originPrice > 0 
              ? parseFloat(productForm.value.originPrice) 
              : 0), // API要求是数字类型，不是null
            stock: parseInt(productForm.value.stock || 0),
            specifications: {} // 没有规格时，也包含 specifications 字段，值为空对象
          }]
        }
      })(),
      // 转换属性格式（API要求是对象数组，每个对象包含 additionalProp1, additionalProp2, additionalProp3 等字段）
      // 但根据实际使用，我们使用 name 和 value 字段更合理
      attributes: (() => {
        const attrs = []
        
        // 如果有规格类型，将规格类型名称作为属性
        if (productForm.value.specs && productForm.value.specs.length > 0) {
          productForm.value.specs.forEach((spec) => {
            if (spec.name && spec.name.trim()) {
              // 收集所有样式中该规格类型的不同值
              const specValues = new Set()
              if (styles.value && styles.value.length > 0) {
                styles.value.forEach(style => {
                  if (style.specifications && style.specifications[spec.name]) {
                    const value = style.specifications[spec.name]
                    if (value && value.trim()) {
                      specValues.add(value.trim())
                    }
                  }
                })
              }
              
              attrs.push({
                name: spec.name.trim(),
                value: specValues.size > 0 ? Array.from(specValues).join(', ') : '未设置'
              })
            }
          })
        }
        
        // 添加标签作为属性
        if (productForm.value.tags && productForm.value.tags.length > 0) {
          productForm.value.tags.forEach((tag) => {
            if (tag && tag.trim()) {
              attrs.push({
                name: '标签',
                value: String(tag).trim()
              })
            }
          })
        }
        
        // 如果没有属性，返回空数组
        return attrs
      })()
    }

    // 获取当前登录用户的 user_id
    const userInfo = uni.getStorageSync('userInfo') || {}
    const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid || 0
    
    // 严格清理：确保商品主表（顶层）绝对没有 original_price 字段
    // original_price 应该只在 SKU 中，不在商品主表
    
    // 确保 skus 数组存在且有效
    if (!Array.isArray(productData.skus) || productData.skus.length === 0) {
      throw new Error('商品至少需要一个SKU')
    }
    
    console.log('[商品发布] SKU数据:', JSON.stringify(productData.skus, null, 2))
    
    const cleanProductData = {
      name: String(productData.name || '').trim(),
      description: String(productData.description || ''),
      category: String(productData.category || ''),
      status: isMerchantOfflineOnly.value ? 0 : Number(productData.status || 1),
      user_id: Number(userId), // 必需字段：当前登录用户的ID
      is_member_product: Boolean(productData.is_member_product || false),
      buy_rule: String(productData.buy_rule || ''),
      freight: Number(productData.freight || 0),
      max_points_discount: Number(productData.max_points_discount || 0),
      skus: productData.skus.map((sku, index) => {
        // SKU 中包含 original_price 字段
        // 确保 sku_code 不为空，如果为空则生成一个
        let skuCode = String(sku.sku_code || '').trim()
        if (!skuCode) {
          skuCode = `SKU-${productId.value || 'NEW'}-${index + 1}-${Date.now()}`
        }
        
        // 处理 original_price：确保是数字类型
        const originalPrice = sku.original_price !== undefined && sku.original_price !== null 
          ? Number(sku.original_price) 
          : 0
        
        const cleanSku = {
          sku_code: skuCode,
          price: Number(sku.price || 0),
          original_price: originalPrice, // API要求包含 original_price 字段，必须是数字类型
          stock: Number(sku.stock || 0),
          specifications: sku.specifications && typeof sku.specifications === 'object' ? sku.specifications : {}
        }
        
        // 处理SKU的id字段
        // 后端逻辑：有id且id>0的为更新，没有id的为新增
        // 新增SKU不包含id字段，而不是设置为0
        if (isEdit) {
          // 更新商品时：如果sku有id且id>0，使用该id（更新现有SKU）
          if (sku.id !== undefined && sku.id !== null && Number(sku.id) > 0) {
            cleanSku.id = Number(sku.id)
            console.log(`[商品更新] SKU ${index + 1} 使用现有 id:`, cleanSku.id, '（更新现有SKU）')
          } else {
            // 没有id或id为0，视为新增SKU，不设置id字段
            console.log(`[商品更新] SKU ${index + 1} 没有id或id为0，视为新增SKU（不包含id字段）`)
          }
        } else {
          // 新建商品时，所有SKU都是新增，不设置id字段
          console.log(`[商品新建] SKU ${index + 1} 为新增SKU（不包含id字段）`)
        }
        
        return cleanSku
      }),
      attributes: Array.isArray(productData.attributes) && productData.attributes.length > 0 
        ? productData.attributes.map(attr => {
            // 确保 attributes 格式正确：每个属性是一个对象，包含 name 和 value
            if (typeof attr === 'object' && attr !== null && !Array.isArray(attr)) {
              // 如果已经是正确的格式 {name: '', value: ''}
              if (attr.name !== undefined || attr.value !== undefined) {
                return {
                  name: String(attr.name || ''),
                  value: String(attr.value || '')
                }
              }
              // 如果是其他对象格式，尝试转换
              const keys = Object.keys(attr)
              if (keys.length > 0) {
                return {
                  name: String(keys[0] || ''),
                  value: String(attr[keys[0]] || '')
                }
              }
            }
            // 如果是字符串或其他格式，尝试转换
            return {
              name: String(attr || ''),
              value: String(attr || '')
            }
          }).filter(attr => attr.name && attr.value) // 过滤掉空的属性
        : []
    }
    
    // 最终检查：确保商品主表（顶层）没有 original_price 字段
    delete cleanProductData.original_price
    delete cleanProductData.originPrice
    delete cleanProductData.price
    delete cleanProductData.stock
    
    // 最终验证：确保 skus 数组格式正确
    if (!Array.isArray(cleanProductData.skus) || cleanProductData.skus.length === 0) {
      throw new Error('商品至少需要一个SKU')
    }
    
    // 验证每个 SKU 的必填字段
    cleanProductData.skus.forEach((sku, idx) => {
      if (!sku.sku_code || !sku.sku_code.trim()) {
        throw new Error(`SKU ${idx + 1} 的 sku_code 不能为空`)
      }
      if (typeof sku.price !== 'number' || sku.price < 0) {
        throw new Error(`SKU ${idx + 1} 的 price 必须是大于等于0的数字`)
      }
      if (typeof sku.stock !== 'number' || sku.stock < 0) {
        throw new Error(`SKU ${idx + 1} 的 stock 必须是大于等于0的数字`)
      }
      if (!sku.specifications || typeof sku.specifications !== 'object') {
        throw new Error(`SKU ${idx + 1} 的 specifications 必须是对象`)
      }
      if (typeof sku.original_price !== 'number') {
        throw new Error(`SKU ${idx + 1} 的 original_price 必须是数字`)
      }
    })
    
    // 调试：打印发送的数据结构
    console.log('[商品发布] ========== 准备发送的商品数据 ==========')
    console.log('[商品发布] 完整数据:', JSON.stringify(cleanProductData, null, 2))
    console.log('[商品发布] 顶层字段:', Object.keys(cleanProductData))
    console.log('[商品发布] SKU数量:', cleanProductData.skus?.length || 0)
    if (cleanProductData.skus && cleanProductData.skus.length > 0) {
      console.log('[商品发布] 所有SKU详细信息:')
      cleanProductData.skus.forEach((sku, index) => {
        console.log(`[商品发布] SKU ${index + 1}:`, {
          sku_code: sku.sku_code,
          price: sku.price,
          original_price: sku.original_price,
          stock: sku.stock,
          specifications: sku.specifications
        })
      })
      console.log('[商品发布] 所有SKU的sku_code:', cleanProductData.skus.map(s => s.sku_code))
      console.log('[商品发布] 所有SKU的规格组合:', cleanProductData.skus.map(s => JSON.stringify(s.specifications)))
    } else {
      console.error('[商品发布] 错误：SKU数组为空或不存在！')
    }
    console.log('[商品发布] ==========================================')

    let productIdResult = productId.value
    
    // 最终验证：确保所有必填字段都存在
    if (!cleanProductData.name || !cleanProductData.name.trim()) {
      uni.hideLoading()
      uni.showToast({ title: '商品名称不能为空', icon: 'none' })
      return
    }
    
    if (!cleanProductData.category || !cleanProductData.category.trim()) {
      uni.hideLoading()
      uni.showToast({ title: '商品分类不能为空', icon: 'none' })
      return
    }
    
    if (!cleanProductData.skus || cleanProductData.skus.length === 0) {
      uni.hideLoading()
      uni.showToast({ title: '商品至少需要一个SKU', icon: 'none' })
      return
    }
    
    // 验证每个SKU的必填字段
    for (let i = 0; i < cleanProductData.skus.length; i++) {
      const sku = cleanProductData.skus[i]
      if (!sku.sku_code || !sku.sku_code.trim()) {
        uni.hideLoading()
        uni.showToast({ title: `第${i + 1}个SKU的编码不能为空`, icon: 'none' })
        return
      }
      if (sku.price === undefined || sku.price === null || sku.price < 0) {
        uni.hideLoading()
        uni.showToast({ title: `第${i + 1}个SKU的价格无效`, icon: 'none' })
        return
      }
      if (sku.stock === undefined || sku.stock === null || sku.stock < 0) {
        uni.hideLoading()
        uni.showToast({ title: `第${i + 1}个SKU的库存无效`, icon: 'none' })
        return
      }
      // 确保specifications字段存在
      if (!sku.specifications || typeof sku.specifications !== 'object') {
        cleanProductData.skus[i].specifications = {}
      }
    }
    
    // 调用API创建或更新商品（使用清理后的数据）
    if (isEdit) {
      console.log('[商品更新] ========== 更新商品 ==========')
      console.log('[商品更新] 商品ID:', productId.value)
      console.log('[商品更新] SKU数量:', cleanProductData.skus?.length || 0)
      if (cleanProductData.skus && cleanProductData.skus.length > 0) {
        console.log('[商品更新] 所有SKU详情:')
        cleanProductData.skus.forEach((sku, idx) => {
          console.log(`[商品更新] SKU ${idx + 1}:`, {
            sku_code: sku.sku_code,
            specifications: sku.specifications,
            price: sku.price,
            original_price: sku.original_price,
            stock: sku.stock
          })
        })
      }
      console.log('[商品更新] 完整更新数据:', JSON.stringify(cleanProductData, null, 2))
      
      // 确保更新时包含所有必需字段
      const updateData = {
        ...cleanProductData,
        // 确保 user_id 存在
        user_id: cleanProductData.user_id || Number(userId)
      }
      
      // 如果 user_id 为 0 或无效，尝试从本地存储重新获取
      if (!updateData.user_id || updateData.user_id === 0) {
        const currentUserInfo = uni.getStorageSync('userInfo') || {}
        const currentUserId = currentUserInfo.user_id || currentUserInfo.id || currentUserInfo.userId || currentUserInfo.uid
        if (currentUserId) {
          updateData.user_id = Number(currentUserId)
          console.log('[商品更新] 从本地存储重新获取 user_id:', updateData.user_id)
        } else {
          console.error('[商品更新] 警告：无法获取 user_id，可能导致更新失败')
        }
      }
      
      console.log('[商品更新] 最终更新数据SKU数量:', updateData.skus?.length || 0)
      if (updateData.skus && updateData.skus.length > 0) {
        console.log('[商品更新] 最终更新数据中的所有SKU:')
        updateData.skus.forEach((sku, idx) => {
          console.log(`[商品更新] 最终SKU ${idx + 1}:`, {
            sku_code: sku.sku_code,
            specifications: sku.specifications,
            price: sku.price,
            stock: sku.stock
          })
        })
      }
      console.log('[商品更新] 最终更新数据JSON:', JSON.stringify(updateData, null, 2))
      
      // 再次验证所有必需字段
      if (!updateData.name || !updateData.name.trim()) {
        throw new Error('商品名称不能为空')
      }
      if (!updateData.category || !updateData.category.trim()) {
        throw new Error('商品分类不能为空')
      }
      if (!updateData.user_id || updateData.user_id === 0) {
        throw new Error('用户ID不能为空，请重新登录')
      }
      if (!updateData.skus || updateData.skus.length === 0) {
        throw new Error('商品至少需要一个SKU')
      }
      
      console.log('[商品更新] 发送更新请求，SKU数量:', updateData.skus.length)
      await updateProduct(productId.value, updateData)
      console.log('[商品更新] 更新成功')
    } else {
      console.log('[商品创建] ========== 创建商品 ==========')
      console.log('[商品创建] SKU数量:', cleanProductData.skus?.length || 0)
      if (cleanProductData.skus && cleanProductData.skus.length > 0) {
        console.log('[商品创建] 所有SKU详情:')
        cleanProductData.skus.forEach((sku, idx) => {
          console.log(`[商品创建] SKU ${idx + 1}:`, {
            sku_code: sku.sku_code,
            specifications: sku.specifications,
            price: sku.price,
            original_price: sku.original_price,
            stock: sku.stock
          })
        })
      }
      console.log('[商品创建] 完整创建数据:', JSON.stringify(cleanProductData, null, 2))
      console.log('[商品创建] 发送创建请求，SKU数量:', cleanProductData.skus?.length || 0)
      
      const res = await createProduct(cleanProductData)
      productIdResult = res.data?.id || res.id
      console.log('[商品创建] 创建成功，商品ID:', productIdResult)
    }
    
    // 如果有图片，上传图片（使用multipart/form-data格式）
    if (productForm.value.images.length > 0 || productForm.value.detailImages.length > 0) {
      let uploadLoadingShown = false
      try {
        uploadLoadingShown = true
        uni.showLoading({ title: '上传图片中...' })
  
        // 直接使用文件路径上传，uni.uploadFile会自动处理为multipart/form-data格式
        const uploadResult = await uploadProductImages(productIdResult, {
          banner_images: productForm.value.images || [],
          detail_images: productForm.value.detailImages || []
        })
        
        console.log('[商品编辑] 图片上传接口返回数据:', uploadResult)
        
        // 检查上传接口是否直接返回了图片数据
        let uploadReturnedImages = null
        if (uploadResult && (uploadResult.banner_images || uploadResult.detail_images || uploadResult.images)) {
          uploadReturnedImages = {
            banner_images: uploadResult.banner_images || uploadResult.images || null,
            detail_images: uploadResult.detail_images || null
          }
          console.log('[商品编辑] 上传接口直接返回了图片数据:', uploadReturnedImages)
        }
        
        // 上传成功后，等待一小段时间确保后端处理完成，然后重新加载商品数据
        // 无论是新建还是编辑，都重新加载以获取最新的图片列表
        if (productIdResult) {
          console.log('[商品编辑] 图片上传完成，等待后端处理...')
          
          // 保存前端原有的图片，以防后端还没处理完
          const originalBannerImages = [...productForm.value.images]
          const originalDetailImages = [...productForm.value.detailImages]
          
          // 如果上传接口直接返回了图片数据，优先使用
          if (uploadReturnedImages) {
            console.log('[商品编辑] 使用上传接口返回的图片数据')
            if (uploadReturnedImages.banner_images) {
              const bannerArray = Array.isArray(uploadReturnedImages.banner_images) 
                ? uploadReturnedImages.banner_images 
                : [uploadReturnedImages.banner_images]
              const processedBanners = bannerArray.map(img => {
                if (img && !img.startsWith('http') && !img.startsWith('/static')) {
                  const imagePath = img.startsWith('/') ? img : `/${img}`
                  return `${config.baseURL}${imagePath}`
                }
                return img
              }).filter(Boolean)
              
              // 合并新旧图片，去重（保留前端已选择的图片）
              const mergedBanners = [...originalBannerImages]
              processedBanners.forEach(newImg => {
                if (!mergedBanners.includes(newImg)) {
                  mergedBanners.push(newImg)
                }
              })
              
              productForm.value.images = mergedBanners
              console.log('[商品编辑] 合并后的主图数量:', productForm.value.images.length, '原图:', originalBannerImages.length, '新图:', processedBanners.length)
            }
            if (uploadReturnedImages.detail_images) {
              const detailArray = Array.isArray(uploadReturnedImages.detail_images) 
                ? uploadReturnedImages.detail_images 
                : [uploadReturnedImages.detail_images]
              const processedDetails = detailArray.map(img => {
                if (img && !img.startsWith('http') && !img.startsWith('/static')) {
                  const imagePath = img.startsWith('/') ? img : `/${img}`
                  return `${config.baseURL}${imagePath}`
                }
                return img
              }).filter(Boolean)
              
              // 合并新旧图片，去重（保留前端已选择的图片）
              const mergedDetails = [...originalDetailImages]
              processedDetails.forEach(newImg => {
                if (!mergedDetails.includes(newImg)) {
                  mergedDetails.push(newImg)
                }
              })
              
              productForm.value.detailImages = mergedDetails
              console.log('[商品编辑] 合并后的详情图数量:', productForm.value.detailImages.length, '原图:', originalDetailImages.length, '新图:', processedDetails.length)
            }
            console.log('[商品编辑] 使用上传接口返回的图片，轮播图:', productForm.value.images.length, '张，详情图:', productForm.value.detailImages.length, '张')
          }
          
          // 如果上传接口没有返回图片数据，才重新加载商品数据
          if (!uploadReturnedImages || (!uploadReturnedImages.banner_images && !uploadReturnedImages.detail_images)) {
            // 等待8秒，确保后端数据库操作完成（增加等待时间，避免死锁后数据还未完全写入）
            await new Promise(resolve => setTimeout(resolve, 8000))
            
            console.log('[商品编辑] 上传接口未返回图片数据，重新加载商品数据以获取最新图片列表...')
            
            // 重试机制：最多重试5次，每次等待3秒
            let retryCount = 0
            const maxRetries = 5
            let productData = null
            
            while (retryCount < maxRetries) {
            try {
              // 获取商品详情（轮播图接口不存在，从商品详情接口获取）
              const [detailRes] = await Promise.allSettled([
                getProductDetail(productIdResult)
              ])
              
              const res = detailRes.status === 'fulfilled' ? detailRes.value : null
              productData = res?.data || res
              
              // 打印完整的返回数据，便于排查问题
              console.log(`[商品编辑] 第${retryCount + 1}次加载商品数据，完整响应:`, {
                响应结构: res,
                商品数据: productData,
                所有字段: Object.keys(productData || {}),
                banner_images: productData?.banner_images,
                detail_images: productData?.detail_images,
                images: productData?.images,
                main_image: productData?.main_image
              })
              
              // 检查是否返回了图片数据（检查多个可能的字段）
              const hasBannerImages = productData.banner_images && 
                (Array.isArray(productData.banner_images) ? productData.banner_images.length > 0 : 
                 typeof productData.banner_images === 'string' ? productData.banner_images.trim().length > 0 : true)
              const hasDetailImages = productData.detail_images && 
                (Array.isArray(productData.detail_images) ? productData.detail_images.length > 0 : 
                 typeof productData.detail_images === 'string' ? productData.detail_images.trim().length > 0 : true)
              const hasImages = productData.images && Array.isArray(productData.images) && productData.images.length > 0
              const hasMainImage = productData.main_image && productData.main_image.trim().length > 0
              
              if (hasBannerImages || hasDetailImages || hasImages || hasMainImage) {
                console.log('[商品编辑] 后端已返回图片数据，停止重试', {
                  hasBannerImages,
                  hasDetailImages,
                  hasImages,
                  hasMainImage
                })
                break
              } else {
                retryCount++
                if (retryCount < maxRetries) {
                  console.log(`[商品编辑] 后端尚未返回图片数据，3秒后重试 (${retryCount}/${maxRetries})...`)
                  await new Promise(resolve => setTimeout(resolve, 3000))
                } else {
                  console.warn('[商品编辑] 已达到最大重试次数，后端仍未返回图片数据')
                }
              }
            } catch (error) {
              console.error(`[商品编辑] 第${retryCount + 1}次加载失败:`, error)
              retryCount++
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 3000))
              }
            }
          }
          
          if (!productData) {
            throw new Error('无法获取商品数据')
          }
          
          try {
            
            console.log('[商品编辑] 后端返回的商品数据（完整）:', {
              banner_images: productData.banner_images,
              banner_images_type: typeof productData.banner_images,
              banner_images_isArray: Array.isArray(productData.banner_images),
              detail_images: productData.detail_images,
              detail_images_type: typeof productData.detail_images,
              detail_images_isArray: Array.isArray(productData.detail_images),
              images: productData.images,
              images_type: typeof productData.images,
              images_isArray: Array.isArray(productData.images),
              main_image: productData.main_image,
              所有字段: Object.keys(productData),
              完整数据: JSON.stringify(productData, null, 2).substring(0, 1000) // 只打印前1000字符
            })
            
            // 处理轮播图：优先使用 main_image（后端返回的主要图片）
            let bannerImages = []
            
            // 1. 优先使用 main_image（后端可能只保存第一张图片到 main_image）
            if (productData.main_image) {
              bannerImages = [productData.main_image]
              console.log('[商品编辑] 使用 main_image 作为轮播图:', productData.main_image)
            }
            
            // 2. 如果没有 main_image，尝试使用 banner_images 数组
            if (bannerImages.length === 0 && productData.banner_images) {
              if (Array.isArray(productData.banner_images)) {
                bannerImages = productData.banner_images
              } else if (typeof productData.banner_images === 'string') {
                // 如果是字符串，尝试解析为JSON数组
                try {
                  const parsed = JSON.parse(productData.banner_images)
                  if (Array.isArray(parsed)) {
                    bannerImages = parsed
                  } else {
                    bannerImages = [productData.banner_images]
                  }
                } catch (e) {
                  // 解析失败，当作单个图片路径
                  bannerImages = [productData.banner_images]
                }
              }
            }
            
            // 3. 处理图片URL
            if (bannerImages.length > 0) {
              const processedBanners = bannerImages.map(img => {
                if (!img) return null
                if (img.startsWith('http://') || img.startsWith('https://')) {
                  return img
                }
                if (img.startsWith('/static')) {
                  return img
                }
                // 相对路径，拼接服务器地址
                const imagePath = img.startsWith('/') ? img : `/${img}`
                return `${config.baseURL}${imagePath}`
              }).filter(Boolean)
              
              // 合并新旧图片，去重（保留前端已选择的图片）
              const currentBanners = [...productForm.value.images]
              processedBanners.forEach(newImg => {
                if (!currentBanners.includes(newImg)) {
                  currentBanners.push(newImg)
                }
              })
              
              productForm.value.images = currentBanners
              console.log('[商品编辑] 从后端加载后合并的主图数量:', productForm.value.images.length) // 过滤掉 null
              
              console.log('[商品编辑] 更新轮播图列表，共', productForm.value.images.length, '张:', productForm.value.images)
            } else {
              console.warn('[商品编辑] 后端未返回轮播图数据')
              // 如果后端没有返回，但前端有图片，保留前端的图片
              if (productForm.value.images.length === 0 && originalBannerImages.length > 0) {
                console.log('[商品编辑] 后端未返回，保留前端原有轮播图:', originalBannerImages.length, '张')
                productForm.value.images = originalBannerImages
              } else if (productForm.value.images.length === 0) {
                console.warn('[商品编辑] 前端也没有轮播图，可能上传失败或后端处理中')
              }
            }
            
            // 处理详情图：支持多种数据格式
            let detailImages = []
            
            // 1. 优先使用 detail_images 数组
            if (productData.detail_images) {
              if (Array.isArray(productData.detail_images)) {
                detailImages = productData.detail_images
              } else if (typeof productData.detail_images === 'string') {
                // 如果是字符串，尝试解析为JSON数组
                try {
                  const parsed = JSON.parse(productData.detail_images)
                  if (Array.isArray(parsed)) {
                    detailImages = parsed
                  } else {
                    detailImages = [productData.detail_images]
                  }
                } catch (e) {
                  // 解析失败，当作单个图片路径
                  detailImages = [productData.detail_images]
                }
              }
            }
            
            // 2. 处理图片URL
            if (detailImages.length > 0) {
              const processedDetails = detailImages.map(img => {
                if (!img) return null
                if (img.startsWith('http://') || img.startsWith('https://')) {
                  return img
                }
                if (img.startsWith('/static')) {
                  return img
                }
                // 相对路径，拼接服务器地址
                const imagePath = img.startsWith('/') ? img : `/${img}`
                return `${config.baseURL}${imagePath}`
              }).filter(Boolean)
              
              // 合并新旧图片，去重（保留前端已选择的图片）
              const currentDetails = [...productForm.value.detailImages]
              processedDetails.forEach(newImg => {
                if (!currentDetails.includes(newImg)) {
                  currentDetails.push(newImg)
                }
              })
              
              productForm.value.detailImages = currentDetails
              console.log('[商品编辑] 从后端加载后合并的详情图数量:', productForm.value.detailImages.length) // 过滤掉 null
              
              console.log('[商品编辑] 更新详情图列表，共', productForm.value.detailImages.length, '张:', productForm.value.detailImages)
            } else {
              console.warn('[商品编辑] 后端未返回详情图数据')
              // 如果后端没有返回，但前端有图片，保留前端的图片
              if (productForm.value.detailImages.length === 0 && originalDetailImages.length > 0) {
                console.log('[商品编辑] 后端未返回，保留前端原有详情图:', originalDetailImages.length, '张')
                productForm.value.detailImages = originalDetailImages
              } else if (productForm.value.detailImages.length === 0) {
                console.warn('[商品编辑] 前端也没有详情图，可能上传失败或后端处理中')
              }
            }
            
              console.log('[商品编辑] 图片列表更新完成:', {
                bannerImages: productForm.value.images.length,
                detailImages: productForm.value.detailImages.length
              })
            } catch (reloadError) {
              console.error('[商品编辑] 重新加载商品数据失败:', reloadError)
              uni.showToast({ 
                title: '图片已上传，但刷新数据失败，请手动刷新页面', 
                icon: 'none',
                duration: 3000
              })
            }
          } else {
            console.log('[商品编辑] 已使用上传接口返回的图片数据，跳过重新加载')
          }
        }
        
        // 确保清除 loading
        if (uploadLoadingShown) {
          uni.hideLoading()
          uploadLoadingShown = false
        }
        console.log('图片上传成功', {
          bannerCount: productForm.value.images.length,
          detailCount: productForm.value.detailImages.length
        })
      } catch (imageError) {
        // 确保在错误时也清除 loading
        if (uploadLoadingShown) {
          uni.hideLoading()
          uploadLoadingShown = false
        }
        console.error('上传图片失败', imageError)
        
        // 显示详细的错误信息
        let errorMessage = '商品已保存，但图片上传失败'
        if (imageError.failedCount) {
          errorMessage = `商品已保存，但有 ${imageError.failedCount} 张图片上传失败`
          if (imageError.succeeded > 0) {
            errorMessage += `，${imageError.succeeded} 张上传成功`
          }
        } else if (imageError.message) {
          errorMessage = `商品已保存，但图片上传失败: ${imageError.message}`
        }
        
        // 如果有详细的失败信息，在控制台输出
        if (imageError.failed && imageError.failed.length > 0) {
          console.error('失败的图片详情:', imageError.failed)
        }
        
        uni.showToast({ 
          title: errorMessage, 
          icon: 'none',
          duration: 3000
        })
      }
    }
    
    uni.hideLoading()
    uni.showModal({
      title: '发布成功',
      content: isEdit ? '商品信息已更新' : '商品已成功发布，可在商品管理中查看',
      showCancel: false,
      success: () => {
        uni.navigateBack()
      }
    })
  } catch (error) {
    uni.hideLoading()
    console.error('发布商品失败', error)
    
    // 详细错误信息 - 确保是字符串
    let errorMessage = '发布失败，请重试'
    
    try {
      if (error.detail) {
        if (Array.isArray(error.detail) && error.detail.length > 0) {
          const firstDetail = error.detail[0]
          if (typeof firstDetail === 'string') {
            errorMessage = firstDetail
          } else if (typeof firstDetail === 'object' && firstDetail !== null) {
            errorMessage = firstDetail.msg || firstDetail.message || firstDetail.detail || String(firstDetail) || '发布失败，请重试'
          } else {
            errorMessage = String(firstDetail) || '发布失败，请重试'
          }
        } else if (typeof error.detail === 'string') {
          errorMessage = error.detail
        } else if (typeof error.detail === 'object' && error.detail !== null) {
          errorMessage = error.detail.msg || error.detail.message || String(error.detail) || '发布失败，请重试'
        }
      } else if (error.message) {
        if (typeof error.message === 'string') {
          errorMessage = error.message
        } else if (typeof error.message === 'object' && error.message !== null) {
          errorMessage = error.message.msg || error.message.message || String(error.message) || '发布失败，请重试'
        } else {
          errorMessage = String(error.message) || '发布失败，请重试'
        }
      }
      
      // 确保 errorMessage 是字符串
      if (typeof errorMessage !== 'string') {
        errorMessage = String(errorMessage) || '发布失败，请重试'
      }
    } catch (parseError) {
      console.error('[商品发布] 解析错误信息失败:', parseError)
      errorMessage = '发布失败，请重试'
    }
    
    // 详细解析错误信息
    let detailInfo = '未知错误'
    if (error.detail && Array.isArray(error.detail) && error.detail.length > 0) {
      const firstDetail = error.detail[0]
      if (typeof firstDetail === 'string') {
        detailInfo = firstDetail
      } else if (typeof firstDetail === 'object' && firstDetail !== null) {
        // 尝试获取具体的字段名
        detailInfo = firstDetail.loc || firstDetail.field || firstDetail.msg || firstDetail.message || JSON.stringify(firstDetail)
      } else {
        detailInfo = String(firstDetail)
      }
    } else if (error.detail && typeof error.detail === 'string') {
      detailInfo = error.detail
    }
    
    // 尝试从 detail 数组中提取具体的字段名
    let missingField = ''
    if (error.detail && Array.isArray(error.detail) && error.detail.length > 0) {
      const firstDetail = error.detail[0]
      if (typeof firstDetail === 'object' && firstDetail !== null) {
        // 尝试多种可能的字段名格式
        missingField = firstDetail.loc?.[firstDetail.loc.length - 1] || 
                      firstDetail.field || 
                      firstDetail.ctx?.key ||
                      firstDetail.msg?.match(/field\s+['"]([^'"]+)['"]/i)?.[1] ||
                      ''
      }
    }
    
    console.error('[商品发布] 详细错误信息:', {
      error,
      message: errorMessage,
      detail: error.detail,
      detailInfo: detailInfo,
      missingField: missingField,
      code: error.code,
      errorMessage类型: typeof errorMessage,
      完整错误对象: JSON.stringify(error, null, 2),
      detail数组内容: error.detail && Array.isArray(error.detail) ? JSON.stringify(error.detail, null, 2) : '不是数组'
    })
    
    // 如果 detail 中有具体字段信息，更新错误消息
    if (detailInfo && detailInfo !== '未知错误' && detailInfo !== errorMessage) {
      errorMessage = `${errorMessage}: ${detailInfo}`
    }
    
    // 如果找到了缺失的字段名，添加到错误消息中
    if (missingField) {
      errorMessage = `缺少必需字段: ${missingField}。${errorMessage}`
    }
    
    // 确保传递给 showToast 的是字符串
    uni.showToast({ 
      title: String(errorMessage), 
      icon: 'none',
      duration: 3000
    })
  }
}

const initFormForEdit = async (id) => {
  try {
    uni.showLoading({ title: '加载商品数据...' })
    
    // 先从API加载商品数据
    const res = await getProductDetail(id)
    const productData = res.data || res
    
    if (!productData || !productData.id) {
      throw new Error('商品数据不存在')
    }
    
    console.log('[编辑商品] 加载到的商品数据:', productData)
    
    // 保存原始商品数据，用于更新时匹配SKU的id
    rawProductData.value = JSON.parse(JSON.stringify(productData))
    console.log('[编辑商品] 已保存原始商品数据到 rawProductData，SKU数量:', rawProductData.value.skus?.length || 0)
    
    // 处理价格：优先使用 skus 中的价格
    let price = 0
    if (productData.skus && productData.skus.length > 0 && productData.skus[0].price) {
      price = parseFloat(productData.skus[0].price)
    } else if (productData.price) {
      price = parseFloat(productData.price)
    }
    
    // 处理库存：从 skus 中汇总
    let stock = 0
    if (productData.skus && Array.isArray(productData.skus)) {
      stock = productData.skus.reduce((sum, sku) => sum + (parseInt(sku.stock) || 0), 0)
    } else if (productData.stock !== undefined) {
      stock = parseInt(productData.stock)
    }
    
    // 处理图片：main_image 和 banner_images
    let images = []
    if (productData.banner_images && Array.isArray(productData.banner_images) && productData.banner_images.length > 0) {
      // 如果 banner_images 是数组，直接使用
      images = productData.banner_images.map(img => {
        // 如果是相对路径，拼接服务器地址
        if (img && !img.startsWith('http') && !img.startsWith('/static')) {
          const imagePath = img.startsWith('/') ? img : `/${img}`
          return `${config.baseURL}${imagePath}`
        }
        return img
      })
    } else if (productData.main_image) {
      // 如果只有 main_image，转换为数组
      const img = productData.main_image
      if (img && !img.startsWith('http') && !img.startsWith('/static')) {
        const imagePath = img.startsWith('/') ? img : `/${img}`
        images = [`${config.baseURL}${imagePath}`]
      } else {
        images = [img]
      }
    } else if (productData.images && Array.isArray(productData.images)) {
      images = productData.images.map(img => {
        if (img && !img.startsWith('http') && !img.startsWith('/static')) {
          const imagePath = img.startsWith('/') ? img : `/${img}`
          return `${config.baseURL}${imagePath}`
        }
        return img
      })
  }

    // 处理详情图
    let detailImages = []
    if (productData.detail_images && Array.isArray(productData.detail_images) && productData.detail_images.length > 0) {
      detailImages = productData.detail_images.map(img => {
        if (img && !img.startsWith('http') && !img.startsWith('/static')) {
          const imagePath = img.startsWith('/') ? img : `/${img}`
          return `${config.baseURL}${imagePath}`
        }
        return img
      })
    }
    
    // 处理标签：从 attributes 中提取
    let tags = []
    if (productData.attributes && Array.isArray(productData.attributes)) {
      tags = productData.attributes
        .filter(attr => attr.name === '标签' || attr.name === 'tag')
        .map(attr => attr.value)
    }
    
    // 处理规格：从 skus 中提取（支持多个规格）
    let specs = []
    let initialCombinations = []
    
    if (productData.skus && productData.skus.length > 0) {
      // 从第一个SKU中获取所有规格名称
      const firstSku = productData.skus[0]
      if (firstSku.specifications && typeof firstSku.specifications === 'object') {
        const specNames = Object.keys(firstSku.specifications)
        
        // 为每个规格名称创建规格类型对象（只包含名称，不包含选项值）
        specs = specNames.map(specName => ({
          name: specName
        }))
        
        // 初始化样式数据（从SKU中提取）
        // 每个SKU对应一个样式
        const initialStyles = productData.skus.map(sku => {
          return {
            specifications: sku.specifications && typeof sku.specifications === 'object' 
              ? { ...sku.specifications } 
              : {},
            price: sku.price ? parseFloat(sku.price).toFixed(4) : '',
            originalPrice: sku.original_price ? parseFloat(sku.original_price).toFixed(4) : '',
            stock: sku.stock ? parseInt(sku.stock) : 0,
            id: sku.id // 保存SKU的id，用于更新时匹配
          }
        }).filter(style => style !== null) // 过滤掉null值
        
        styles.value = initialStyles
      }
    }
    
    // 转换API数据为前端表单格式
    const formData = {
      name: productData.name || '',
      category: productData.category || '',
      description: productData.description || '',
      tags: tags,
      images: images,
      detailImages: detailImages,
      price: price,
      originPrice: productData.skus && productData.skus.length > 0 && productData.skus[0].original_price 
        ? parseFloat(productData.skus[0].original_price) 
        : 0,
      stock: stock,
      specs: specs,
      productType: productData.is_member_product ? 'vip' : 'normal',
      maxPointsDeduction: productData.max_points_deduction || 0,
      isVip: productData.is_member_product || false,
      freight: parseFloat(productData.freight || 0),
      buyRule: productData.buy_rule || ''
    }
    
    console.log('[编辑商品] 转换后的表单数据:', formData)
    
    // 填充表单
    Object.assign(productForm.value, formData)
    
    // 样式数据已在上面初始化

  // 分类索引
    const cIndex = categoryOptions.indexOf(formData.category)
  categoryIndex.value = cIndex >= 0 ? cIndex : 0

  // 商品类型索引
    productTypeIndex.value = formData.productType === 'vip' ? 1 : 0
    
    uni.hideLoading()
    uni.showToast({ title: '商品数据加载成功', icon: 'success' })
    
  } catch (error) {
    uni.hideLoading()
    console.error('[编辑商品] 加载商品数据失败:', error)
    uni.showToast({ 
      title: '加载商品数据失败: ' + (error.message || '网络错误'), 
      icon: 'none',
      duration: 3000
    })
  }
}

onLoad(async (options) => {
  isMerchantOfflineOnly.value = options.from === 'shop'
  if (options.id) {
    productId.value = options.id
    // 加载商品数据进行编辑
    uni.setNavigationBarTitle({ title: '编辑商品' })
    await initFormForEdit(options.id)
  } else {
    uni.setNavigationBarTitle({ title: '添加商品' })
  }
})

onMounted(() => {
  console.log('商品添加页面加载')
})
</script>

<style scoped>
.product-add-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding: 40rpx;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.merchant-offline-tip {
  background: #fff8e6;
  border: 1rpx solid #ffd666;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}
.merchant-offline-tip .tip-text {
  font-size: 24rpx;
  color: #ad6800;
  line-height: 1.5;
}

/* 表单区块 */
.form-section {
  background: white;
  border-radius: 16rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.section-subtitle {
  font-size: 24rpx;
  color: #999;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.form-hint {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.form-input {
  padding: 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}

.vip-price-display {
  padding: 24rpx;
  border: 2rpx solid #ffd700;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #fff9e6, #fff5d6);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.vip-price-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff9800;
}

.vip-price-hint {
  font-size: 22rpx;
  color: #999;
}

.form-textarea {
  padding: 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  min-height: 150rpx;
}

.picker-input {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
}

.picker-text {
  font-size: 28rpx;
  color: #333;
}

.picker-arrow {
  font-size: 24rpx;
  color: #ccc;
}

.char-count {
  font-size: 22rpx;
  color: #999;
  text-align: right;
}

/* 标签输入 */
.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  min-height: 80rpx;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: #f0f4ff;
  color: #667eea;
  border-radius: 20rpx;
  font-size: 24rpx;
}

.tag-remove {
  font-size: 20rpx;
  color: #999;
}

.tag-input {
  flex: 1;
  min-width: 200rpx;
  font-size: 28rpx;
  border: none;
  outline: none;
}

/* 图片上传 */
.image-upload {
  padding: 20rpx 0;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.uploaded-image {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
  cursor: pointer;
  pointer-events: auto;
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  gap: 20rpx;
  padding: 12rpx;
  border-radius: 0 0 12rpx 12rpx;
  z-index: 10;
  pointer-events: auto;
}

.action-btn {
  font-size: 22rpx;
  color: white;
  cursor: pointer;
  pointer-events: auto;
  z-index: 11;
  padding: 4rpx 12rpx;
}

.action-btn.delete {
  color: #ff4757;
}

.upload-btn {
  aspect-ratio: 1;
  border: 2rpx dashed #ddd;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: #fafafa;
}

.upload-icon {
  font-size: 48rpx;
  color: #999;
}

.upload-text {
  font-size: 24rpx;
  color: #999;
}

/* 规格设置 */
.specs-content {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.spec-group {
  padding: 30rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.spec-hint {
  margin-bottom: 20rpx;
  padding: 16rpx;
  background: #fff3cd;
  border-radius: 8rpx;
  border-left: 4rpx solid #ffc107;
}

.hint-text {
  font-size: 24rpx;
  color: #856404;
  line-height: 1.5;
}

.spec-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.spec-name-input {
  flex: 1;
  padding: 16rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.spec-remove {
  font-size: 24rpx;
  color: #f44336;
  padding: 8rpx 16rpx;
}

.spec-options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.spec-option {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.option-input {
  flex: 1;
  padding: 12rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.option-price {
  width: 120rpx;
  padding: 12rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 24rpx;
  text-align: center;
}

.option-remove {
  width: 40rpx;
  height: 40rpx;
  background: #ffebee;
  color: #f44336;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

.add-option-btn,
.add-spec-btn {
  padding: 20rpx;
  border: 2rpx dashed #ddd;
  border-radius: 12rpx;
  text-align: center;
  background: #fafafa;
}

/* 规格组合列表 */
.spec-combinations-section {
  margin-top: 30rpx;
  padding: 30rpx;
  background: #fff;
  border-radius: 12rpx;
  border: 2rpx solid #e0e0e0;
}

.combinations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #e0e0e0;
}

.combinations-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.combinations-count {
  font-size: 24rpx;
  color: #999;
}

.combinations-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.combination-item {
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx solid #e0e0e0;
}

.combination-info {
  margin-bottom: 20rpx;
}

.combination-specs {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.combinations-hint {
  margin: 20rpx 0;
  padding: 16rpx;
  background: #e3f2fd;
  border-radius: 8rpx;
  border-left: 4rpx solid #2196f3;
}

.combinations-hint .hint-text {
  font-size: 24rpx;
  color: #1976d2;
  line-height: 1.5;
}

.add-text {
  font-size: 26rpx;
  color: #667eea;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
  pointer-events: auto;
}

.main-badge {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  background: linear-gradient(135deg, #ff9800, #ff5722);
  color: white;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  z-index: 1;
}

/* 底部操作 */
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 20rpx 40rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 20rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
  z-index: 999;
}

.bottom-actions .action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
}

.save-draft {
  background: #f5f5f5;
  color: #666;
}

.publish {
  background: #ff9800;
  color: white;
}

/* 规格类型部分 */
.spec-types-section {
  margin-bottom: 40rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 16rpx;
  border: 2rpx solid #e8f4f8;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.step-number {
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
  flex-shrink: 0;
}

.step-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.step-hint {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 24rpx;
  padding: 20rpx;
  background: linear-gradient(135deg, #e3f2fd 0%, #f1f8ff 100%);
  border-radius: 12rpx;
  border-left: 6rpx solid #2196f3;
}

.hint-icon {
  font-size: 32rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.step-hint .hint-text {
  font-size: 24rpx;
  color: #1976d2;
  line-height: 1.8;
  flex: 1;
}

.spec-type-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
  padding: 20rpx;
  background: white;
  border-radius: 12rpx;
  border: 2rpx solid #e0e0e0;
  transition: all 0.3s;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.spec-type-item:active {
  background: #f5f5f5;
  border-color: #667eea;
}

.spec-type-icon {
  font-size: 32rpx;
  flex-shrink: 0;
}

.spec-name-input {
  flex: 1;
  padding: 16rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 26rpx;
  background: #fafafa;
  transition: all 0.3s;
}

.spec-name-input:focus {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4rpx rgba(102, 126, 234, 0.1);
}

/* 样式部分 */
.styles-section {
  margin-top: 40rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 16rpx;
  border: 2rpx solid #e8f4f8;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.style-item {
  margin-bottom: 30rpx;
  padding: 30rpx;
  background: white;
  border-radius: 16rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.style-item:active {
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.style-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.style-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.style-icon {
  font-size: 32rpx;
}

.style-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.style-remove {
  font-size: 24rpx;
  color: #f44336;
  padding: 10rpx 20rpx;
  background: #ffebee;
  border-radius: 8rpx;
  transition: all 0.3s;
}

.style-remove:active {
  background: #ffcdd2;
}

.style-specs {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.style-spec-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.style-spec-label {
  width: 120rpx;
  font-size: 26rpx;
  color: #666;
  flex-shrink: 0;
}

.style-spec-input {
  flex: 1;
  padding: 16rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 10rpx;
  font-size: 26rpx;
  background: #fafafa;
  transition: all 0.3s;
}

.style-spec-input:focus {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4rpx rgba(102, 126, 234, 0.1);
}

.style-fields {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx dashed #e0e0e0;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.field-label {
  width: 140rpx;
  font-size: 26rpx;
  color: #666;
  flex-shrink: 0;
  font-weight: 500;
}

.required-mark {
  color: #f44336;
  font-size: 24rpx;
}

.field-input {
  flex: 1;
  padding: 18rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 10rpx;
  font-size: 26rpx;
  background: #fafafa;
  transition: all 0.3s;
}

.field-input:focus {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4rpx rgba(102, 126, 234, 0.1);
}

.add-spec-btn,
.add-style-btn {
  margin-top: 20rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12rpx;
  text-align: center;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
  transition: all 0.3s;
}

.add-spec-btn:active,
.add-style-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.3);
}

.add-icon {
  font-size: 32rpx;
  color: white;
  font-weight: bold;
}

.add-spec-btn .add-text,
.add-style-btn .add-text {
  font-size: 28rpx;
  color: white;
  font-weight: 500;
}

.vip-price-disabled {
  background: #f5f5f5 !important;
  color: #999 !important;
  border-color: #e0e0e0 !important;
  opacity: 0.7;
}

.vip-price-hint-small {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
  font-style: italic;
}
</style>
