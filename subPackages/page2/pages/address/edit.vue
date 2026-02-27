<template>
  <view class="address-edit-page">
    <form @submit="handleSubmit">
      <!-- 收货人信息 -->
      <view class="form-section">
        <view class="section-title">收货人信息</view>
        <view class="form-group">
          <text class="form-label">收货人</text>
          <view class="input-wrapper">
          <input 
            v-model="formData.name"
            class="form-input"
              :class="{ 'input-error': errors.name }"
            placeholder="请输入收货人姓名"
            maxlength="20"
              @blur="validateName"
          />
            <text class="error-text" v-if="errors.name">{{ errors.name }}</text>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">手机号</text>
          <view class="input-wrapper">
          <input 
            v-model="formData.phone"
            class="form-input"
              :class="{ 'input-error': errors.phone }"
            placeholder="请输入手机号"
            type="number"
            maxlength="11"
              @blur="validatePhone"
          />
            <text class="error-text" v-if="errors.phone">{{ errors.phone }}</text>
          </view>
        </view>
      </view>

      <!-- 收货地址 -->
      <view class="form-section">
        <view class="section-title">收货地址</view>
        <view class="form-group region-group">
          <text class="form-label">所在地区</text>
          <view class="region-wrapper">
          <view class="region-input-wrapper">
            <!-- unified custom region picker for all platforms -->
            <view class="region-picker" :class="{ 'input-error': errors.region }" @click="showRegionPicker">
              <text class="region-text" :class="{ placeholder: !regionText }">
                {{ regionText || '请选择省市区' }}
              </text>
              <text class="picker-arrow">›</text>
            </view>
              <button class="location-btn" @tap="autoLocation" :disabled="locationLoading">
                <text class="location-icon iconfont icon-dingwei" :class="{ 'loading': locationLoading }"></text>
                <text class="location-text">{{ locationLoading ? '定位中...' : '定位' }}</text>
            </button>
            </view>
            <text class="error-text" v-if="errors.region">{{ errors.region }}</text>
            <text class="error-text" v-if="locationError">{{ locationError }}</text>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">详细地址</text>
          <view class="input-wrapper">
          <textarea 
            v-model="formData.detail"
            class="form-textarea"
              :class="{ 'input-error': errors.detail }"
            placeholder="街道、楼牌号等详细信息"
            maxlength="100"
              @blur="validateDetail"
          />
            <text class="error-text" v-if="errors.detail">{{ errors.detail }}</text>
          </view>
        </view>
      </view>

      <!-- 设置选项 -->
      <view class="form-section">
        <view class="form-group checkbox-group">
          <text class="form-label">设为默认地址</text>
          <switch 
            :checked="formData.is_default" 
            @change="toggleDefault"
            color="#ff4757" 
          />
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-section">
        <button 
          class="submit-btn" 
          form-type="submit"
          :disabled="!canSubmit"
        >
          {{ isEditMode ? '保存修改' : '添加地址' }}
        </button>
      </view>
    </form>

    <!-- 地区选择弹窗（跨平台统一样式，点击依次选择省/市/区） -->
    <view v-if="showRegionPopup" class="region-popup-mask" @click="closeRegionPopup">
      <view class="region-popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">选择地区</text>
          <text class="popup-close" @click="closeRegionPopup">×</text>
        </view>
        <view class="popup-content">
          <!-- stage 1: 省份列表 -->
          <view v-if="popupStage === 1" class="select-list">
            <view
              v-for="prov in provincesList"
              :key="prov.code"
              class="select-item"
              @click="selectProvince(prov)"
            >
              {{ prov.name }}
            </view>
          </view>
          <!-- stage 2: 城市列表 -->
          <view v-if="popupStage === 2" class="select-list">
            <view class="back-button" @click="popupStage = 1">‹ 省份</view>
            <view
              v-for="city in citiesList"
              :key="city.code"
              class="select-item"
              @click="selectCity(city)"
            >
              {{ city.name }}
            </view>
          </view>
          <!-- stage 3: 区县列表 -->
          <view v-if="popupStage === 3" class="select-list">
            <view class="back-button" @click="popupStage = 2">‹ 城市</view>
            <view
              v-for="dist in districtsList"
              :key="dist.code"
              class="select-item"
              @click="selectDistrict(dist)"
            >
              {{ dist.name }}
            </view>
        </view>
      </view>
    </view>
  </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
// 通用地区数据帮助函数
import { addAddress, updateAddress } from '@/api/user.js'
import { getProvinces, getCities, getDistricts } from '@/utils/bank-region-data.js'

const isEditMode = ref(false)
const addressId = ref(null)

const formData = ref({
  name: '',
  phone: '',
  mobile: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  is_default: false,
  addr_type: 'shipping',
  lng: null,
  lat: null
})

// 错误提示
const errors = ref({
  name: '',
  phone: '',
  region: '',
  detail: ''
})

// 定位相关
const locationLoading = ref(false)
const locationError = ref('')

// 地区选择相关
const regionArray = ref(['广东省', '广州市', '天河区'])
// regionArray kept for compatibility but not used in custom picker

// 弹窗级别及三级数据
const showRegionPopup = ref(false)
const popupStage = ref(1)            // 1=省,2=市,3=区
const provincesList = ref([])
const citiesList = ref([])
const districtsList = ref([])

// 计算属性
const regionText = computed(() => {
  if (formData.value.province && formData.value.city && formData.value.district) {
    return `${formData.value.province} ${formData.value.city} ${formData.value.district}`
  }
  return ''
})

const canSubmit = computed(() => {
  return formData.value.name && 
         formData.value.phone && 
         formData.value.province && 
         formData.value.city && 
         formData.value.district && 
         formData.value.detail
})

// （旧 App 端 picker 相关已删除，使用新级联选择）

/**
 * popup 显示前重置并加载省份列表
 */
const resetRegionPopup = () => {
  popupStage.value = 1
  provincesList.value = getProvinces()
  citiesList.value = []
  districtsList.value = []
}

/**
 * 选择省份之后加载城市并进入下一步
 */
const selectProvince = (prov) => {
  formData.value.province = prov.name
  citiesList.value = getCities(prov.code)
  popupStage.value = 2
}

/**
 * 选择城市之后加载区县并进入下一步
 */
const selectCity = (city) => {
  formData.value.city = city.name
  districtsList.value = getDistricts(city.code)
  popupStage.value = 3
}

/**
 * 选择区县完成，直接关闭弹窗并保存
 */
const selectDistrict = (dist) => {
  formData.value.district = dist.name
  // 清除地区错误
  errors.value.region = ''
  closeRegionPopup()
}

/**
 * 显示地区选择器（所有平台统一）
 */
const showRegionPicker = () => {
  resetRegionPopup()
  showRegionPopup.value = true
}

/**
 * 关闭弹窗
 */
const closeRegionPopup = () => {
  showRegionPopup.value = false
}


/**
 * 检查定位权限
 */
const checkLocationPermission = () => {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation'] === false) {
          // 用户之前拒绝过，需要引导去设置
          reject(new Error('需要位置权限'))
        } else if (res.authSetting['scope.userLocation'] === true) {
          // 已授权
          resolve()
        } else {
          // 未询问过，尝试获取位置来触发授权
          uni.getLocation({
            type: 'gcj02',
            success: () => {
              resolve()
            },
            fail: (err) => {
              const errMsg = (err.errMsg || '').toLowerCase()
              // 精确判断错误类型
              if (errMsg.includes('auth deny') || errMsg.includes('auth') || errMsg.includes('permission') || errMsg.includes('权限') || errMsg.includes('deny')) {
                reject(new Error('需要位置权限'))
              } else if (errMsg.includes('locationswitchoff') || errMsg.includes('location switch off') || 
                         (errMsg.includes('switch') && errMsg.includes('location')) ||
                         errMsg.includes('nocell&wifi_locationswitchoff')) {
                reject(new Error('定位服务未开启'))
              } else {
                reject(new Error('定位失败'))
              }
            }
          })
        }
      },
      fail: () => {
        reject(new Error('无法检查权限'))
      }
    })
    // #endif
    
    // #ifndef MP-WEIXIN
    resolve()
    // #endif
  })
}

/**
 * 验证收货人姓名
 */
const validateName = () => {
  if (!formData.value.name || !formData.value.name.trim()) {
    errors.value.name = '请输入收货人姓名'
    return false
  }
  if (formData.value.name.trim().length < 2) {
    errors.value.name = '收货人姓名至少2个字符'
    return false
  }
  errors.value.name = ''
  return true
}

/**
 * 验证手机号
 */
const validatePhone = () => {
  const phone = formData.value.phone || ''
  if (!phone || !phone.trim()) {
    errors.value.phone = '请输入手机号'
    return false
  }
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(phone.trim())) {
    errors.value.phone = '请输入正确的手机号'
    return false
  }
  errors.value.phone = ''
  return true
}

/**
 * 验证地区
 */
const validateRegion = () => {
  if (!formData.value.province || !formData.value.province.trim()) {
    errors.value.region = '请选择省份'
    return false
  }
  if (!formData.value.city || !formData.value.city.trim()) {
    errors.value.region = '请选择城市'
    return false
  }
  if (!formData.value.district || !formData.value.district.trim()) {
    errors.value.region = '请选择区县'
    return false
  }
  errors.value.region = ''
  return true
}

/**
 * 验证详细地址
 */
const validateDetail = () => {
  if (!formData.value.detail || !formData.value.detail.trim()) {
    errors.value.detail = '请输入详细地址'
    return false
  }
  if (formData.value.detail.trim().length < 5) {
    errors.value.detail = '详细地址至少5个字符'
    return false
  }
  errors.value.detail = ''
  return true
}

/**
 * 自动定位（手机上使用）
 */
const autoLocation = async () => {
  // 清除之前的错误
  locationError.value = ''
  errors.value.region = ''
  
  locationLoading.value = true
  
  try {
    // 先检查权限（微信小程序）
    // #ifdef MP-WEIXIN
    try {
    await checkLocationPermission()
  } catch (error) {
      locationLoading.value = false
    if (error.message && !error.message.includes('取消')) {
      if (error.message.includes('权限')) {
          locationError.value = '需要位置权限，请在设置中开启'
        uni.showModal({
          title: '需要位置权限',
          content: '定位功能需要您的位置权限，请在设置中开启',
          confirmText: '去设置',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              uni.openSetting()
            }
          }
        })
      } else if (error.message.includes('定位服务')) {
          locationError.value = '定位服务未开启，请检查手机系统设置'
      } else {
          locationError.value = error.message || '需要位置权限'
      }
    }
    return
  }
    // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序：打开地图选择器
  uni.chooseLocation({
    success: (locationRes) => {
        locationLoading.value = false

      handleLocationSuccess(locationRes)
    },
    fail: (err) => {
        locationLoading.value = false
        console.error('[定位] 选择位置失败:', err)
        
        const errMsg = (err.errMsg || '').toLowerCase()
        
      // 如果是取消选择，不提示错误
        if (errMsg.includes('cancel') || errMsg.includes('取消')) {
        return
      }
      
        // 精确判断错误类型
        // 权限被拒绝
        if (errMsg.includes('auth deny') || errMsg.includes('auth') || errMsg.includes('permission') || errMsg.includes('权限') || errMsg.includes('deny')) {
          locationError.value = '需要位置权限，请在设置中开启'
        uni.showModal({
          title: '需要位置权限',
          content: '定位功能需要您的位置权限，请在设置中开启',
          confirmText: '去设置',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              uni.openSetting()
            }
          }
        })
        } 
        // 定位服务未开启（精确匹配）
        else if (errMsg.includes('locationswitchoff') || errMsg.includes('location switch off') || errMsg.includes('定位服务未开启') || 
                 (errMsg.includes('switch') && errMsg.includes('location'))) {
          locationError.value = '定位服务未开启，请检查手机系统设置'
        uni.showModal({
          title: '定位服务未开启',
            content: '请检查手机系统定位服务是否开启，并在微信设置中允许使用位置信息',
          confirmText: '知道了',
          showCancel: false
        })
        } 
        // 其他错误，显示具体错误信息
        else {
          // 提取更友好的错误提示
          let friendlyMsg = '无法打开地图选择器'
          if (errMsg.includes('timeout') || errMsg.includes('超时')) {
            friendlyMsg = '定位超时，请重试'
          } else if (errMsg.includes('network') || errMsg.includes('网络')) {
            friendlyMsg = '网络错误，请检查网络连接'
          } else if (errMsg.includes('system') || errMsg.includes('系统')) {
            friendlyMsg = '系统错误，请稍后重试'
          }
          
          locationError.value = friendlyMsg

      }
    }
  })
  // #endif
  
  // #ifndef MP-WEIXIN
  // 其他平台：获取位置并解析地址
  uni.getLocation({
    type: 'gcj02',
    geocode: true,
    isHighAccuracy: true,
      altitude: false,
    success: (res) => {
        locationLoading.value = false

        
      if (res.address) {
        const locationRes = {
          address: `${res.address.province || ''}${res.address.city || ''}${res.address.district || ''}${res.address.street || ''}${res.address.streetNum || ''}`,
          name: res.address.poiName || res.address.name || '',
          latitude: res.latitude,
          longitude: res.longitude
        }
          
        if (locationRes.address && locationRes.address.trim()) {
          handleLocationSuccess(locationRes)
        } else {
            locationError.value = '获取详细地址失败，请手动填写'
        }
      } else {
          // 如果没有address，尝试使用逆地理编码
          if (res.latitude && res.longitude) {
            // 保存经纬度，稍后可以用于逆地理编码
            formData.value.lat = res.latitude
            formData.value.lng = res.longitude
            locationError.value = '已获取位置，但无法解析地址，请手动选择地区'
          } else {
            locationError.value = '获取位置失败，请手动填写'
          }
      }
    },
    fail: (err) => {
        locationLoading.value = false
        console.error('[定位] 获取位置失败:', err)
        
      const errMsg = (err.errMsg || '').toLowerCase()
        
        // 精确判断错误类型
        // 权限被拒绝
        if (errMsg.includes('auth deny') || errMsg.includes('auth') || errMsg.includes('permission') || errMsg.includes('权限') || errMsg.includes('deny')) {
          locationError.value = '需要位置权限，请在手机设置中开启'
        uni.showModal({
          title: '需要位置权限',
          content: '定位功能需要您的位置权限，请在手机设置中开启',
          confirmText: '知道了',
          showCancel: false
        })
        } 
        // 定位服务未开启（精确匹配）
        else if (errMsg.includes('locationswitchoff') || errMsg.includes('location switch off') || errMsg.includes('定位服务未开启') || 
                 (errMsg.includes('switch') && errMsg.includes('location')) ||
                 errMsg.includes('nocell&wifi_locationswitchoff')) {
          locationError.value = '定位服务未开启，请检查手机系统设置'
        uni.showModal({
          title: '定位服务未开启',
            content: '请检查手机系统定位服务是否开启，并在应用设置中允许使用位置信息',
          confirmText: '知道了',
          showCancel: false
        })
        } 
        // 超时
        else if (errMsg.includes('timeout') || errMsg.includes('超时')) {
          locationError.value = '定位超时，请重试或手动填写'
        }
        // 网络错误
        else if (errMsg.includes('network') || errMsg.includes('网络')) {
          locationError.value = '网络错误，请检查网络连接后重试'
        }
        // 其他错误，显示具体错误信息
        else {
          locationError.value = '定位失败，请手动填写地址'

      }
    }
  })
  // #endif
  } catch (error) {
    locationLoading.value = false
    console.error('[定位] 定位过程出错:', error)
    locationError.value = '定位失败：' + (error.message || '未知错误')
  }
}

/**
 * 处理定位成功后的数据填充
 */
const handleLocationSuccess = (locationRes) => {

  
  // 保存经纬度
  if (locationRes.latitude && locationRes.longitude) {
    formData.value.lat = locationRes.latitude
    formData.value.lng = locationRes.longitude
  }
  
  // 解析地址
  const address = locationRes.address || ''
  const name = locationRes.name || ''
  
  // 清除地区错误
  errors.value.region = ''
  locationError.value = ''
  
  // 尝试从address中提取省市区
  // 格式通常为: "广东省广州市天河区xxx街道" 或 "北京市北京市朝阳区xxx"
  let province = ''
  let city = ''
  let district = ''
  
  // 1. 提取省份
  const provincePatterns = [
    /^(.+?省)/,
    /^(.+?自治区)/,
    /^(.+?特别行政区)/,
    /^(.+?市)/  // 直辖市
  ]
  
  for (const pattern of provincePatterns) {
    const match = address.match(pattern)
    if (match) {
      province = match[1]
      break
    }
  }
  
  if (!province) {
    locationError.value = '无法解析省份，请手动选择地区'
    return
  }
  
  formData.value.province = province
  
  // 2. 提取城市
  const remainingAfterProvince = address.replace(province, '')
  
  // 如果是直辖市（如北京市、上海市），城市名与省名相同
  if (province.endsWith('市') && !province.includes('省')) {
    city = province
    formData.value.city = city
    } else {
    // 普通省份，查找城市
    const cityPatterns = [
      /^(.+?市)/,
      /^(.+?地区)/,
      /^(.+?自治州)/,
      /^(.+?盟)/
    ]
    
    for (const pattern of cityPatterns) {
      const match = remainingAfterProvince.match(pattern)
      if (match) {
        city = match[1]
        break
       }
    }
    
    if (city) {
      formData.value.city = city
    } else {
      locationError.value = '无法解析城市，请手动选择地区'
      return
    }
  }
  
  // 3. 提取区县
  const remainingAfterCity = remainingAfterProvince.replace(city, '')
  const districtPatterns = [
    /^(.+?区)/,
    /^(.+?县)/,
    /^(.+?市)/,  // 县级市
    /^(.+?旗)/
  ]
  
  for (const pattern of districtPatterns) {
    const match = remainingAfterCity.match(pattern)
    if (match) {
      district = match[1]
      break
    }
  }
  
  if (district) {
    formData.value.district = district
  } else {
    // 如果正则没匹配到，尝试从剩余字符串中查找"区"或"县"
    const districtIndex = remainingAfterCity.indexOf('区')
    const countyIndex = remainingAfterCity.indexOf('县')
    const index = districtIndex > -1 ? districtIndex : (countyIndex > -1 ? countyIndex : -1)
    
    if (index > -1) {
      // 向前查找区县名的开始位置（通常是第一个字符）
      const districtName = remainingAfterCity.substring(0, index + 1)
      if (districtName.length >= 2) {
        formData.value.district = districtName
      } else {
        locationError.value = '无法解析区县，请手动选择地区'
        return
             }
    } else {
      locationError.value = '无法解析区县，请手动选择地区'
      return
    }
  }
  
  // 更新regionArray以显示
  if (formData.value.province && formData.value.city && formData.value.district) {
    regionArray.value = [
      formData.value.province,
      formData.value.city,
      formData.value.district
    ]
    // 清除地区错误
    errors.value.region = ''
  }
  
  // 设置详细地址：优先使用地点名称（如某某小区），如果没有则使用地址的剩余部分
  if (name && name.trim()) {
    formData.value.detail = name.trim()
  } else if (address) {
     // 如果只有地址，去掉省市区前缀作为详情
     let detail = address
    if (formData.value.province) {
      detail = detail.replace(formData.value.province, '')
    }
    if (formData.value.city) {
      detail = detail.replace(formData.value.city, '')
    }
    if (formData.value.district) {
      detail = detail.replace(formData.value.district, '')
    }
    // 清理多余的空格和标点
    detail = detail.replace(/^[\s，,、]+|[\s，,、]+$/g, '').trim()
    if (detail) {
     formData.value.detail = detail
  }
  }
  
  // 清除详细地址错误
  if (formData.value.detail) {
    errors.value.detail = ''
  }
  
  console.log('[定位] 解析结果:', {
    省份: formData.value.province,
    城市: formData.value.city,
    区县: formData.value.district,
    详细地址: formData.value.detail
  })
  
  uni.showToast({ title: '定位成功，已自动填写', icon: 'success', duration: 1500 })
}

/**
 * 切换默认地址
 */
const toggleDefault = (e) => {
  formData.value.is_default = e.detail.value
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  // 清除所有错误
  errors.value = {
    name: '',
    phone: '',
    region: '',
    detail: ''
  }

  // 验证所有字段
  let hasError = false
  
  if (!validateName()) {
    hasError = true
  }
  
  if (!validatePhone()) {
    hasError = true
  }
  
  if (!validateRegion()) {
    hasError = true
  }
  
  if (!validateDetail()) {
    hasError = true
  }
  
  if (hasError) {
    // 滚动到第一个错误位置
    uni.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
    return
  }

  uni.showLoading({ title: isEditMode.value ? '保存中...' : '添加中...' })

  try {
    // 准备提交数据（包含所有字段）
    // mobile 参数会在 addAddress/updateAddress 函数中自动从后端获取
    const submitData = {
      name: formData.value.name,
      phone: formData.value.phone, // 收货人手机号
      // mobile 不在这里设置，会在API函数中从后端获取实际手机号
      province: formData.value.province,
      city: formData.value.city,
      district: formData.value.district,
      detail: formData.value.detail,
      is_default: formData.value.is_default || false,
      addr_type: formData.value.addr_type || 'shipping'
    }
    
    // 可选字段
    if (formData.value.label && formData.value.label.trim()) {
      submitData.label = formData.value.label.trim()
    }
    // 确保 lng 和 lat 是数字类型
    if (formData.value.lng !== undefined && formData.value.lng !== null && formData.value.lng !== '') {
      submitData.lng = parseFloat(formData.value.lng) || 0
    }
    if (formData.value.lat !== undefined && formData.value.lat !== null && formData.value.lat !== '') {
      submitData.lat = parseFloat(formData.value.lat) || 0
    }
    
    
    // 清理数据，去除首尾空格
    submitData.name = submitData.name.trim()
    submitData.phone = submitData.phone.trim()
    // mobile 不需要 trim，因为它是从 userInfo 中获取的，应该已经是正确的格式
    submitData.province = submitData.province.trim()
    submitData.city = submitData.city.trim()
    submitData.district = submitData.district.trim()
    submitData.detail = submitData.detail.trim()
    
    console.log('[地址编辑] 准备提交的数据:', submitData)
    // mobile 参数会在 addAddress/updateAddress 函数中自动从后端获取

    let result = null
    
    if (isEditMode.value) {
      // 编辑模式
      result = await updateAddress(addressId.value, submitData)
    } else {
      // 添加模式 - 调用后端接口
      result = await addAddress(submitData)
    }

    uni.hideLoading()
    
    console.log('地址保存结果:', result)
    
    uni.showToast({ 
      title: isEditMode.value ? '保存成功' : '添加成功', 
      icon: 'success',
      duration: 2000
    })
    
    // 通知地址列表页面刷新
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage && prevPage.$vm) {
      // 如果上一页是地址列表页面，刷新列表
      if (prevPage.route && prevPage.route.includes('address/list')) {
        if (typeof prevPage.$vm.loadAddressList === 'function') {
          prevPage.$vm.loadAddressList()
        }
      }
      // 如果上一页是订单确认页面，也刷新地址列表
      else if (prevPage.route && (prevPage.route.includes('order/confirm') || prevPage.route.includes('order/confirm-with-points'))) {
        if (typeof prevPage.$vm.loadAddresses === 'function') {
          prevPage.$vm.loadAddresses()
        } else if (typeof prevPage.$vm.loadAddress === 'function') {
          prevPage.$vm.loadAddress()
        }
      }
    }
    
    // 延迟返回，让用户看到成功提示
    setTimeout(() => {
      uni.navigateBack()
    }, 2000)
    
  } catch (error) {
    uni.hideLoading()
    console.error('[地址编辑] 保存地址失败:', error)
    
    // 提取错误消息，确保是字符串
    let errorMsg = '保存失败，请重试'
    
    // 如果是 422 验证错误，显示具体信息
    if (error.code === 422 || error.status === 422) {
      if (error.detail && Array.isArray(error.detail) && error.detail.length > 0) {
        const firstError = error.detail[0]
        if (typeof firstError === 'string') {
          errorMsg = firstError
        } else if (firstError && typeof firstError === 'object' && firstError.msg) {
          errorMsg = firstError.msg
        } else if (firstError && typeof firstError === 'object' && firstError.message) {
          errorMsg = firstError.message
        } else {
          errorMsg = '参数验证失败'
        }
      } else if (error.message && Array.isArray(error.message) && error.message.length > 0) {
        // 如果 message 是数组，取第一个元素
        errorMsg = typeof error.message[0] === 'string' ? error.message[0] : String(error.message[0])
      } else if (error.message && typeof error.message === 'string') {
        errorMsg = error.message
      } else {
        errorMsg = '参数验证失败'
      }
    } else {
      // 其他错误
      if (error.message) {
        if (Array.isArray(error.message)) {
          errorMsg = error.message.length > 0 ? String(error.message[0]) : '保存失败，请重试'
        } else if (typeof error.message === 'string') {
          errorMsg = error.message
        } else {
          errorMsg = String(error.message)
        }
      } else if (error.msg) {
        if (Array.isArray(error.msg)) {
          errorMsg = error.msg.length > 0 ? String(error.msg[0]) : '保存失败，请重试'
        } else if (typeof error.msg === 'string') {
          errorMsg = error.msg
        } else {
          errorMsg = String(error.msg)
        }
      }
    }
    
    // 确保 errorMsg 是字符串
    if (typeof errorMsg !== 'string') {
      errorMsg = String(errorMsg)
    }
    
    uni.showToast({ 
      title: errorMsg, 
      icon: 'none',
      duration: 3000
    })
  }
}

onLoad((options) => {
  if (options.mode === 'edit' && options.id && options.data) {
    // 编辑模式
    isEditMode.value = true
    addressId.value = parseInt(options.id)
    
    try {
      const addressData = JSON.parse(decodeURIComponent(options.data))
      formData.value = { 
        name: addressData.name || '',
        phone: addressData.phone || addressData.mobile || '',
        mobile: addressData.mobile || addressData.phone || '',
        province: addressData.province || '',
        city: addressData.city || '',
        district: addressData.district || '',
        detail: addressData.detail || '',
        is_default: addressData.is_default || addressData.isDefault || false,
        addr_type: addressData.addr_type || 'shipping',
        distanceKm: addressData.distanceKm || 5
      }
      // 设置地区数组
      if (addressData.province && addressData.city && addressData.district) {
        regionArray.value = [addressData.province, addressData.city, addressData.district]
      }
      uni.setNavigationBarTitle({ title: '编辑地址' })
    } catch (error) {
      console.error('解析地址数据失败', error)
    }
  } else {
    // 新增模式：从本地存储获取用户信息并填充
    uni.setNavigationBarTitle({ title: '添加地址' })
    
    try {
      const userInfo = uni.getStorageSync('userInfo') || {}
      
      // 获取用户昵称并填充到收货人姓名
      const userName = userInfo.name || userInfo.nickname || userInfo.nickName || ''
      if (userName && userName.trim()) {
        formData.value.name = userName.trim()
        console.log('[地址编辑] 从用户信息填充收货人姓名:', userName)
      } else {
        console.log('[地址编辑] 用户信息中没有昵称，跳过填充')
      }
      
      // 获取有效的手机号（11位数字）并填充
      const userMobile = userInfo.mobile || userInfo.phone || ''
      if (userMobile && /^\d{11}$/.test(userMobile)) {
        formData.value.phone = userMobile
        console.log('[地址编辑] 从用户信息填充手机号:', userMobile)
      } else {
        console.log('[地址编辑] 用户信息中没有有效的手机号，跳过填充')
      }
    } catch (error) {
      console.error('[地址编辑] 获取用户信息失败:', error)
    }
  }
})
</script>

<style scoped>
.address-edit-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.form-section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.form-group {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.form-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: -10rpx;
  margin-bottom: 20rpx;
  display: block;
}

.form-group:last-child {
  margin-bottom: 0;
}

.checkbox-group {
  justify-content: space-between;
}

.form-label {
  width: 160rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background: #f8f9fa;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.form-input.input-error {
  border: 2rpx solid #ff4757;
  background: #fff5f5;
}

.error-text {
  font-size: 22rpx;
  color: #ff4757;
  padding-left: 20rpx;
  line-height: 1.4;
}

.form-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.form-textarea.input-error {
  border: 2rpx solid #ff4757;
}

/* region popup styles */
.region-popup-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.region-popup {
  width: 90%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border-bottom: 1rpx solid #eee;
}
.popup-title {
  font-size: 32rpx;
  font-weight: bold;
}
.popup-close {
  font-size: 36rpx;
  line-height: 1;
}
.popup-content {
  max-height: 400rpx;
  overflow-y: auto;
}
.select-list {
  padding: 20rpx;
}
.select-item {
  padding: 20rpx 0;
  font-size: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.select-item:last-child {
  border-bottom: none;
}
.back-button {
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #007aff;
}



/* 地区选择组样式 */
.region-group {
  flex-direction: column;
  align-items: stretch;
}

.region-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.region-input-wrapper {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  box-sizing: border-box;
}

.region-picker-native {
  flex: 1;
  min-width: 0;
}

.region-picker {
  height: 80rpx;
  padding: 0 20rpx;
  background: #f8f9fa;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
}

.region-picker.input-error {
  border: 2rpx solid #ff4757;
  background: #fff5f5;
}

/* 定位按钮样式 */
.location-btn {
  height: 80rpx;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  border: none;
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 26rpx;
  box-sizing: border-box;
}

.location-btn::after {
  border: none;
}

.location-btn:disabled {
  opacity: 0.6;
}

.location-icon.loading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.location-icon {
  font-size: 28rpx;
}

.location-text {
  font-size: 26rpx;
  color: white;
}

.region-text {
  font-size: 28rpx;
  color: #333;
}

.region-text.placeholder {
  color: #999;
}

.picker-arrow {
  font-size: 24rpx;
  color: #ccc;
}

.submit-section {
  padding: 40rpx 0;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background: #ff4757;
  color: white;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 44rpx;
  border: none;
}

.submit-btn:disabled {
  opacity: 0.5;
}

/* App端地区选择弹窗样式 */
.region-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}

.region-popup {
  width: 100%;
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.popup-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.popup-content {
  flex: 1;
  overflow: hidden;
}

.picker-view {
  width: 100%;
  height: 400rpx;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #333;
}

.popup-footer {
  display: flex;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #eee;
  gap: 20rpx;
}

.popup-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.confirm-btn {
  background: #ff4757;
  color: white;
}

</style>