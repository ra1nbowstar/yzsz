/**
 * 商品相关接口
 */

import request from '@/utils/request.js'
import config from '@/utils/config.js'

/**
 * 获取轮播图列表
 */
export const getBannerList = () => {
  return request.get('/api/banners').catch(() => {
    return request.get('/api/banner/list')
  })
}

/**
 * 获取商品列表
 * @param {Object} params 查询参数
 * @param {Number} params.type 商品类型：1-会员商品，2-普通商品
 * @param {String} params.category 商品分类 (可选)
 * @param {Number} params.page 页码
 * @param {Number} params.pageSize 每页数量
 * @param {Number} params.user_id 用户ID（可选）
 *   - 如果明确传入 user_id，则只查询该用户的商品
 *   - 如果传入 null 或 undefined，则不传 user_id 参数，查询所有商品
 *   - 如果不传此参数，则自动获取当前登录用户ID（用于商家管理页面）
 * @param {Boolean} params.only_my_products 是否只查询当前用户的商品（默认false，查询所有商品）
 */
export const getProductList = (params = {}) => {
  // 构建查询参数
  const queryParams = { ...params }
  
  // 处理 user_id 参数
  if (params.hasOwnProperty('user_id')) {
    // 如果明确传入了 user_id（包括 null/undefined），使用传入的值
    if (params.user_id !== null && params.user_id !== undefined && params.user_id !== 0) {
      queryParams.user_id = params.user_id
    } else if (params.user_id === null || params.user_id === undefined) {
      // 如果明确传入 null/undefined，不传 user_id 参数，查询所有商品
      delete queryParams.user_id
    } else {
      // user_id 为 0，不传 user_id 参数
      delete queryParams.user_id
    }
  } else if (params.only_my_products) {
    // 如果设置了 only_my_products=true，自动获取当前用户ID
    try {
      const userInfo = uni.getStorageSync('userInfo') || {}
      const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
      if (userId) {
        queryParams.user_id = userId
      }
    } catch (e) {
      console.warn('[商品列表] 获取用户ID失败:', e)
    }
  }
  // 如果既没有传 user_id，也没有设置 only_my_products，则不传 user_id，查询所有商品
  
  // 删除 only_my_products 参数（这是前端控制参数，不需要传给后端）
  delete queryParams.only_my_products
  
  return request.get('/api/products', queryParams).catch(() => {
    return request.get('/api/product/list', queryParams)
  })
}

/**
 * 商家模式：查询用户（商家）的所有商品（图2）
 * GET /api/users/{user_id}/products
 * @param {Object} params 查询参数
 * @param {Number} params.status 商品状态筛选（可选）
 * @param {Number} params.page 页码（可选，默认 1）
 * @param {Number} params.size 每页条数（可选，默认 10，最大 100）
 * @returns {Promise}
 */
export const getShopProductList = (params = {}) => {
  const userInfo = uni.getStorageSync('userInfo') || {}
  const userId = userInfo.id ?? userInfo.user_id ?? userInfo.userId ?? userInfo.uid
  if (userId == null || userId === '') {
    return Promise.reject(new Error('用户未登录或 user_id 为空'))
  }
  const queryParams = {}
  if (params.status != null && params.status !== '' && params.status !== undefined) {
    queryParams.status = params.status
  }
  if (params.page != null) {
    queryParams.page = Number(params.page)
  }
  if (params.size != null) {
    queryParams.size = Number(params.size)
  } else if (params.pageSize != null) {
    queryParams.size = Number(params.pageSize)
  }
  return request.get(`/api/users/${userId}/products`, queryParams)
}

/**
 * 获取商品详情
 * @param {Number} id 商品ID
 */
export const getProductDetail = (id) => {
  return request.get(`/api/products/${id}`).catch(() => {
    return request.get(`/api/product/detail/${id}`)
  })
}

/**
 * 获取商品销售数据
 * @param {Number} id 商品ID
 * @returns {Promise} 返回 { total_sales(销售总金额), sales_count(销售数量), ... }
 * 注意：如果接口不存在（404），会静默返回null，不抛出错误
 */
export const getProductSales = (id) => {
  return request.get(`/api/products/${id}/sales`).catch((error) => {
    // 如果是404错误（接口不存在），静默返回null，不显示错误
    // 检查多种可能的404错误格式
    const is404 = error?.code === 404 || 
                  error?.statusCode === 404 || 
                  error?.status === 404 ||
                  (error?.response && error.response.status === 404) ||
                  (typeof error === 'string' && error.includes('404')) ||
                  (error?.message && error.message.includes('404'))
    
    if (is404) {
      console.log(`[商品销量] 商品 ${id} 的销量接口不存在（404），使用默认值0`)
      return { data: { sales_count: 0, sold_count: 0, total_quantity: 0, quantity: 0 } }
    }
    
    // 其他错误也静默处理，返回默认值，避免影响页面显示
    console.warn(`[商品销量] 获取商品 ${id} 销量失败:`, error)
    return { data: { sales_count: 0, sold_count: 0, total_quantity: 0, quantity: 0 } }
  })
}

/**
 * 获取商品轮播图列表（此接口可能不存在，已禁用）
 * @param {Number} id 商品ID
 * @deprecated 此接口不存在，轮播图应从商品详情接口获取
 */
export const getProductBannerImages = (id) => {
  // 接口不存在，直接返回失败，避免404错误
  return Promise.reject(new Error('轮播图接口不存在，请从商品详情接口获取'))
}

/**
 * 商品模糊搜索
 * @param {Object} params 查询参数
 * @param {String} params.keyword 搜索关键词
 * @param {Number} params.page 页码
 * @param {Number} params.pageSize 每页数量
 * @param {Number} params.user_id 用户ID（可选）
 *   - 如果明确传入 user_id，则只搜索该用户的商品
 *   - 如果传入 null 或 undefined，则不传 user_id 参数，搜索所有商品
 *   - 如果不传此参数，默认搜索所有商品
 * @param {Boolean} params.only_my_products 是否只搜索当前用户的商品（默认false，搜索所有商品）
 */
export const searchProducts = (params = {}) => {
  // 构建查询参数
  const queryParams = { ...params }
  
  // 处理 user_id 参数
  if (params.hasOwnProperty('user_id')) {
    // 如果明确传入了 user_id（包括 null/undefined），使用传入的值
    if (params.user_id !== null && params.user_id !== undefined && params.user_id !== 0) {
      queryParams.user_id = params.user_id
    } else {
      // 如果传入 null/undefined/0，不传 user_id 参数，搜索所有商品
      delete queryParams.user_id
    }
  } else if (params.only_my_products) {
    // 如果设置了 only_my_products=true，自动获取当前用户ID
    try {
      const userInfo = uni.getStorageSync('userInfo') || {}
      const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
      if (userId) {
        queryParams.user_id = userId
      }
    } catch (e) {
      console.warn('[商品搜索] 获取用户ID失败:', e)
    }
  }
  // 如果既没有传 user_id，也没有设置 only_my_products，则不传 user_id，搜索所有商品
  
  // 删除 only_my_products 参数（这是前端控制参数，不需要传给后端）
  delete queryParams.only_my_products
  
  return request.get('/api/products/search', queryParams)
}



/**
 * 新增商品
 * @param {Object} data 商品数据
 * @param {String} data.name 商品名称
 * @param {String} data.description 商品描述
 * @param {String} data.category 商品分类
 * @param {Number} data.status 商品状态：1-上架，0-下架
 * @param {Boolean} data.is_member_product 是否会员商品
 * @param {String} data.buy_rule 购买规则
 * @param {Number} data.freight 运费
 * @param {Array} data.skus SKU列表
 * @param {Array} data.attributes 商品属性列表
 * @returns {Promise}
 */
export const createProduct = (data) => {
  return request.post('/api/products', data)
}

/**
 * 更新商品
 * @param {Number} id 商品ID
 * @param {Object} data 商品数据
 * @returns {Promise}
 */
export const updateProduct = (id, data) => {
  return request.put(`/api/products/${id}`, data)
}

/**
 * 删除商品
 * @param {Number} id 商品ID
 * @returns {Promise}
 */
export const deleteProduct = (id) => {
  return request.delete(`/api/products/${id}`)
}

/**
 * 上传商品图片
 * @param {Number} id 商品ID
 * @param {Object} data 图片数据
 * @param {Array<String>} data.detail_images 详情图文件路径数组，最多10张，单张<10MB，仅JPG/PNG/WEBP
 * @param {Array<String>} data.banner_images 轮播图文件路径数组，最多10张，单张<10MB，仅JPG/PNG/WEBP
 * @returns {Promise}
 */
const UPLOAD_API_LIMIT_MB = 2
const UPLOAD_TARGET_MB = 1.8  // 目标压缩到1.8MB（略小于2MB要求）
const UPLOAD_SKIP_COMPRESS_MB = 10  // 超过10MB才跳过压缩（这种情况很少见）
const UPLOAD_MAX_COMPRESS_ATTEMPTS = 8  // 增加尝试次数，确保压缩到位
const UPLOAD_MAX_WIDTH = 3000  // 最大宽度（像素）- 大幅提高以保持清晰度
const UPLOAD_MAX_HEIGHT = 3000  // 最大高度（像素）- 大幅提高以保持清晰度
const UPLOAD_RETRY_MAX = 2
const UPLOAD_RETRY_DELAY = 500

const isDeadlockError = (msg) => {
  if (!msg) return false
  const lower = String(msg).toLowerCase()
  return lower.includes('deadlock') || lower.includes('lock wait')
}

const isLocalUploadFile = (filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    console.warn('[图片上传] 文件路径无效:', filePath)
    return false
  }
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    if (filePath.includes('/pic/')) return false
    return true
  }
  const local = (
    filePath.startsWith('http://tmp/') ||
    filePath.startsWith('wxfile://') ||
    filePath.startsWith('file://') ||
    filePath.startsWith('blob:') ||
    filePath.startsWith('/static/temp/') ||
    (filePath.startsWith('/') && !filePath.startsWith('/pic/') && !filePath.startsWith('/static/'))
  )
  if (!local) console.log('[图片上传] 跳过服务器图片路径:', filePath)
  return local
}

const buildUploadFiles = (data) => {
  const files = []
  if (data.detail_images && Array.isArray(data.detail_images)) {
    data.detail_images.forEach((filePath, index) => {
      if (isLocalUploadFile(filePath)) {
        files.push({ name: 'detail_images', uri: filePath, index })
      }
    })
  }
  if (data.banner_images && Array.isArray(data.banner_images)) {
    data.banner_images.forEach((filePath, index) => {
      if (isLocalUploadFile(filePath)) {
        files.push({ name: 'banner_images', uri: filePath, index })
      }
    })
  }
  return files
}

const logUploadOverview = (data, files) => {
  console.log(`[图片上传] 构建文件列表:`, {
    轮播图数量: data.banner_images?.length || 0,
    详情图数量: data.detail_images?.length || 0,
    总文件数: files.length,
    文件列表: files.map(f => ({ name: f.name, index: f.index, uri: f.uri.substring(0, 50) + '...' }))
  })
}

const getFileInfoSafeUpload = (filePath) => {
  if (!(uni.getFileSystemManager && typeof uni.getFileSystemManager === 'function')) return Promise.resolve(null)
  const fs = uni.getFileSystemManager()
  return new Promise((resolve) => {
    fs.getFileInfo({ filePath, success: resolve, fail: () => resolve(null) })
  })
}

/**
 * 获取图片信息（宽度、高度）
 */
const getImageInfo = (filePath) => {
  return new Promise((resolve) => {
    uni.getImageInfo({
      src: filePath,
      success: (res) => resolve(res),
      fail: () => resolve(null)
    })
  })
}

/**
 * 压缩图片（使用 uni.compressImage，保持宽高比）
 * 添加超时处理，避免卡住
 */
const compressOnce = (filePath, quality, maxWidth = UPLOAD_MAX_WIDTH, maxHeight = UPLOAD_MAX_HEIGHT) => {
  return new Promise((resolve, reject) => {
    // 添加超时处理（10秒）
    const timeout = setTimeout(() => {
      console.warn('[图片压缩] 压缩超时，使用原图')
      resolve(filePath)
    }, 10000)
    
    const clearTimeoutAndResolve = (result) => {
      clearTimeout(timeout)
      resolve(result)
    }
    
    const clearTimeoutAndReject = (error) => {
      clearTimeout(timeout)
      reject(error)
    }
    
    // 先获取原图信息，计算保持宽高比的压缩尺寸
    getImageInfo(filePath).then((imageInfo) => {
      let compressedWidth = maxWidth
      let compressedHeight = maxHeight
      
      if (imageInfo && imageInfo.width && imageInfo.height) {
        const originalWidth = imageInfo.width
        const originalHeight = imageInfo.height
        const originalAspect = originalWidth / originalHeight
        
        // 计算在最大尺寸限制下，保持宽高比的尺寸
        if (originalWidth > originalHeight) {
          // 横图：以宽度为准
          compressedWidth = Math.min(originalWidth, maxWidth)
          compressedHeight = Math.round(compressedWidth / originalAspect)
        } else {
          // 竖图/长图：以高度为准，保持宽高比
          compressedHeight = Math.min(originalHeight, maxHeight)
          compressedWidth = Math.round(compressedHeight * originalAspect)
        }
        
        // 确保不超过最大尺寸限制
        if (compressedWidth > maxWidth) {
          compressedWidth = maxWidth
          compressedHeight = Math.round(compressedWidth / originalAspect)
        }
        if (compressedHeight > maxHeight) {
          compressedHeight = maxHeight
          compressedWidth = Math.round(compressedHeight * originalAspect)
        }
        
        console.log(`[图片压缩] 原图尺寸: ${originalWidth}x${originalHeight}, 压缩尺寸: ${compressedWidth}x${compressedHeight}, 质量: ${quality}%`)
      }
      
      // 使用计算后的尺寸进行压缩（保持宽高比）
      uni.compressImage({
        src: filePath,
        quality,
        compressedWidth: compressedWidth,
        compressedHeight: compressedHeight,
        success: (res) => {
          clearTimeoutAndResolve(res.tempFilePath || filePath)
        },
        fail: (err) => {
          console.warn('[图片压缩] uni.compressImage 失败:', err)
          // 压缩失败，使用原图
          clearTimeoutAndResolve(filePath)
        }
      })
    }).catch(() => {
      // 获取图片信息失败，使用默认尺寸压缩
      console.warn('[图片压缩] 获取图片信息失败，使用默认尺寸')
      uni.compressImage({
        src: filePath,
        quality,
        compressedWidth: maxWidth,
        compressedHeight: maxHeight,
        success: (res) => {
          clearTimeoutAndResolve(res.tempFilePath || filePath)
        },
        fail: (err) => {
          console.warn('[图片压缩] uni.compressImage 失败:', err)
          // 压缩失败，使用原图
          clearTimeoutAndResolve(filePath)
        }
      })
    })
  })
}

const compressToTarget = async (filePath, targetSizeMB, label, attempt = 1, quality = 80) => {
  const maxAttempts = UPLOAD_MAX_COMPRESS_ATTEMPTS
  const info = await getFileInfoSafeUpload(filePath)

  if (info && info.size >= UPLOAD_SKIP_COMPRESS_MB * 1024 * 1024) {
    console.log(`[图片上传] ${label} 大小 ${(info.size / 1024 / 1024).toFixed(2)}MB >= ${UPLOAD_SKIP_COMPRESS_MB}MB，跳过压缩`)
    return filePath
  }
  if (info && info.size <= targetSizeMB * 1024 * 1024) {
    console.log(`[图片上传] ${label} 大小 ${(info.size / 1024 / 1024).toFixed(2)}MB，<=${targetSizeMB}MB，无需压缩`)
    return filePath
  }

  // 获取原图信息，智能判断压缩策略
  const imageInfo = await getImageInfo(filePath)
  const originalSizeMB = info ? info.size / 1024 / 1024 : 0
  const sizeRatio = originalSizeMB / targetSizeMB // 超出比例
  
  // 优化压缩策略：优先保证清晰度，只缩小到必要尺寸
  let nextQuality = 90  // 保持高质量，优先90%，最低85%
  let maxCompressWidth = 3000  // 保持大尺寸，优先3000，最小不低于2000
  let maxCompressHeight = 3000
  
    // 优化策略：优先保持高质量和合适尺寸
    if (imageInfo && imageInfo.width && imageInfo.height) {
      const originalWidth = imageInfo.width
      const originalHeight = imageInfo.height
      
      // 如果原图尺寸已经合理（≤3000），尽量保持原尺寸，只调整质量
      if (originalWidth <= 3000 && originalHeight <= 3000) {
        // 保持原尺寸，只调整质量（保持高质量）
        if (sizeRatio <= 2) {
          // 只超过1倍以内，用高质量
          nextQuality = 90
        } else if (sizeRatio <= 2.5) {
          // 超过1.5倍以内，用稍低质量
          nextQuality = 88
        } else {
          // 超过很多，才适当降低质量，但不低于85%
          nextQuality = 85
        }
        // 保持原尺寸，不缩小
        maxCompressWidth = originalWidth
        maxCompressHeight = originalHeight
      } else {
        // 原图尺寸很大，需要缩小尺寸，但保持高质量
        // 根据尝试次数，逐步缩小，但质量保持在85-90%
        if (attempt === 1) {
          nextQuality = 90
          maxCompressWidth = 3000
          maxCompressHeight = 3000
        } else if (attempt === 2) {
          nextQuality = 90
          maxCompressWidth = 2800
          maxCompressHeight = 2800
        } else if (attempt === 3) {
          nextQuality = 88
          maxCompressWidth = 2600
          maxCompressHeight = 2600
        } else if (attempt === 4) {
          nextQuality = 88
          maxCompressWidth = 2400
          maxCompressHeight = 2400
        } else if (attempt === 5) {
          nextQuality = 85
          maxCompressWidth = 2200
          maxCompressHeight = 2200
        } else {
          // 第6次及以上，继续缩小，质量保持在85%
          nextQuality = 85
          const sizeReduce = (attempt - 5) * 100
          maxCompressWidth = Math.max(2000, 2200 - sizeReduce)
          maxCompressHeight = Math.max(2000, 2200 - sizeReduce)
        }
      }
    } else {
      // 无法获取图片信息，使用保守高质量策略
      nextQuality = 90
      maxCompressWidth = 2800
      maxCompressHeight = 2800
    }
  
  console.log(`[图片上传] ${label} 开始压缩，第${attempt}次，原图${originalSizeMB.toFixed(2)}MB，质量${nextQuality}%，尺寸限制${maxCompressWidth}x${maxCompressHeight}`)

  try {
    const compressedPath = await compressOnce(filePath, nextQuality, maxCompressWidth, maxCompressHeight)
    const compressedInfo = await getFileInfoSafeUpload(compressedPath)
    if (!compressedInfo) {
      if (attempt < maxAttempts && nextQuality > 75) {
        return compressToTarget(compressedPath, targetSizeMB, label, attempt + 1, nextQuality)
      }
      return compressedPath
    }

    const sizeMB = compressedInfo.size / 1024 / 1024
    console.log(`[图片上传] ${label} 压缩后大小 ${sizeMB.toFixed(2)}MB`)

    if (sizeMB > targetSizeMB && attempt < maxAttempts) {
      return compressToTarget(compressedPath, targetSizeMB, label, attempt + 1, nextQuality)
    }
    return compressedPath
  } catch (err) {
    console.warn(`[图片上传] ${label} 压缩失败，使用原图`, err)
    return filePath
  }
}

const uploadSingleWithRetry = ({ file, index, url, token, productId }) => {
  const fieldName = file.name
  const doUpload = (finalPath, retryCount) => new Promise((resolve, reject) => {
    uni.uploadFile({
      url,
      filePath: finalPath,
      name: fieldName,
      formData: {
        image_type: file.name,
        image_index: String(file.index !== undefined ? file.index : index),
        product_id: String(productId || '')
      },
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        'accept': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            resolve({ success: true, data, file, index })
          } catch (e) {
            resolve({ success: true, data: res.data, file, index })
          }
        } else {
          let errorMsg = res.data
          try {
            const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            errorMsg = parsed.message || parsed.detail || parsed.error || res.data
          } catch (e) {}

          const isDeadlock = isDeadlockError(errorMsg)
          if (isDeadlock && retryCount < UPLOAD_RETRY_MAX) {
            const delay = UPLOAD_RETRY_DELAY * (retryCount + 1)
            console.log(`[图片上传] 死锁，${delay}ms后重试 (${retryCount + 1}/${UPLOAD_RETRY_MAX})`)
            setTimeout(() => {
              doUpload(finalPath, retryCount + 1).then(resolve).catch(reject)
            }, delay)
            return
          }
          reject(new Error(`上传失败[${res.statusCode}]: ${errorMsg}`))
        }
      },
      fail: (err) => {
        if (retryCount < UPLOAD_RETRY_MAX && !err.errMsg?.includes('abort')) {
          const delay = UPLOAD_RETRY_DELAY * (retryCount + 1)
          console.log(`[图片上传] 网络错误，${delay}ms后重试 (${retryCount + 1}/${UPLOAD_RETRY_MAX})`)
          setTimeout(() => {
            doUpload(finalPath, retryCount + 1).then(resolve).catch(reject)
          }, delay)
          return
        }
        reject(new Error(err.errMsg || err.message || '上传失败'))
      }
    })
  })

  return doUpload(file.compressedPath || file.uri, 0)
}

/**
 * 使用Canvas将长图裁剪成多段（真正的裁剪）
 * @param {String} filePath 原图路径
 * @param {Number} maxSegmentHeight 每段最大高度（默认2000px，保持清晰）
 * @returns {Promise<Array<String>>} 返回裁剪后的图片路径数组
 */
const cropLongImageWithCanvas = async (filePath, maxSegmentHeight = 2000) => {
  const imageInfo = await getImageInfo(filePath)
  if (!imageInfo || !imageInfo.width || !imageInfo.height) {
    return [filePath]
  }

  const { width, height } = imageInfo
  const aspectRatio = height / width
  
  // 长图判断：高度/宽度 >= 2.5 且高度 > maxSegmentHeight
  if (aspectRatio < 2.5 || height <= maxSegmentHeight) {
    return [filePath]
  }

  // 计算需要分成几段
  const segmentCount = Math.ceil(height / maxSegmentHeight)
  const segmentHeight = Math.ceil(height / segmentCount)
  
  console.log(`[长图裁剪] 检测到长图: ${width}x${height} (宽高比 ${aspectRatio.toFixed(2)}), 将裁剪成 ${segmentCount} 段，每段高度约 ${segmentHeight}px`)

  const segments = []
  const canvasId = 'cropLongImageCanvas' // 使用页面中预先声明的Canvas ID

  for (let i = 0; i < segmentCount; i++) {
    const sourceY = i * segmentHeight
    const actualHeight = Math.min(segmentHeight, height - sourceY)
    
    try {
      // 创建Canvas上下文
      const ctx = uni.createCanvasContext(canvasId)
      
      // 先清除之前的绘制内容
      ctx.clearRect(0, 0, width, actualHeight)
      
      // 绘制原图的指定区域到Canvas（裁剪）
      // drawImage(imageResource, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      // 从原图的 (0, sourceY) 位置裁剪 (width, actualHeight) 大小的区域
      // 绘制到Canvas的 (0, 0) 位置，尺寸为 (width, actualHeight)
      ctx.drawImage(filePath, 0, sourceY, width, actualHeight, 0, 0, width, actualHeight)
      
      // 等待绘制完成
      await new Promise((resolve) => {
        ctx.draw(false, () => {
          // 增加延迟，确保Canvas绘制完成
          setTimeout(() => resolve(), 500)
        })
      })

      // 导出Canvas为临时文件
      const segmentPath = await new Promise((resolve, reject) => {
        setTimeout(() => {
          uni.canvasToTempFilePath({
            canvasId: canvasId,
            x: 0,
            y: 0,
            width: width,
            height: actualHeight,
            destWidth: width,
            destHeight: actualHeight,
            fileType: 'jpg',
            quality: 0.95, // 高质量，保持清晰
            success: (res) => {
              if (res.tempFilePath) {
                resolve(res.tempFilePath)
              } else {
                reject(new Error('Canvas导出路径为空'))
              }
            },
            fail: (err) => {
              console.error(`[长图裁剪] Canvas导出失败:`, err)
              reject(err)
            }
          }, 200)
        }, 200)
      })

      segments.push(segmentPath)
      console.log(`[长图裁剪] 第 ${i + 1}/${segmentCount} 段完成: ${width}x${actualHeight}`)
    } catch (error) {
      console.error(`[长图裁剪] 第 ${i + 1} 段裁剪失败:`, error)
      // 裁剪失败，使用原图（降级处理）
      return [filePath]
    }
  }

  return segments.length > 0 ? segments : [filePath]
}

/**
 * 处理长图：检测并裁剪成多段
 * @param {String} filePath 原图路径
 * @param {Number} maxSegmentHeight 每段最大高度（默认2000px）
 * @returns {Promise<Array<String>>} 返回裁剪后的图片路径数组
 */
const processLongImage = async (filePath, maxSegmentHeight = 2000) => {
  const imageInfo = await getImageInfo(filePath)
  if (!imageInfo || !imageInfo.width || !imageInfo.height) {
    return [filePath]
  }

  const { width, height } = imageInfo
  const aspectRatio = height / width
  
  // 长图判断：高度/宽度 >= 2.5 且高度 > maxSegmentHeight
  if (aspectRatio < 2.5 || height <= maxSegmentHeight) {
    return [filePath]
  }

  // 尝试使用Canvas裁剪
  try {
    return await cropLongImageWithCanvas(filePath, maxSegmentHeight)
  } catch (error) {
    console.warn('[长图处理] Canvas裁剪失败，使用压缩方案:', error)
    // 如果Canvas裁剪失败，降级为压缩方案（至少保证不糊）
    const compressedHeight = maxSegmentHeight
    const compressedWidth = Math.round(width * (compressedHeight / height))
    
    const compressedPath = await new Promise((resolve) => {
      uni.compressImage({
        src: filePath,
        quality: 95, // 提高质量
        compressedWidth: compressedWidth,
        compressedHeight: compressedHeight,
        success: (res) => {
          resolve(res.tempFilePath || filePath)
        },
        fail: () => {
          resolve(filePath)
        }
      })
    })
    
    return [compressedPath]
  }
}

const processSingleUpload = async ({ file, index, total, url, token, productId }) => {
  const imageTypeLabel = file.name === 'detail_images' ? '详情图' : '轮播图'
  uni.showLoading({ title: `上传图片中 ${index + 1}/${total}...`, mask: true })
  console.log(`[图片上传] ===== 开始处理 ${imageTypeLabel} ${index + 1}/${total} =====`)

  const originalPath = file.uri || file.filePath || file.path
  if (!originalPath || typeof originalPath !== 'string') {
    throw new Error('文件路径无效')
  }

  const info = await getFileInfoSafeUpload(originalPath)
  if (info) {
    console.log(`[图片上传] 原始大小 ${(info.size / 1024 / 1024).toFixed(2)}MB`)
  }

  // 检测并处理长图：如果是长图，先分段处理（保持清晰度），然后再压缩
  let imagePaths = [originalPath]
  try {
    imagePaths = await processLongImage(originalPath)
    if (imagePaths.length > 1) {
      console.log(`[图片上传] 长图已处理成 ${imagePaths.length} 段`)
    } else if (imagePaths.length === 1 && imagePaths[0] !== originalPath) {
      console.log(`[图片上传] 长图已预处理`)
    }
  } catch (processError) {
    console.warn('[图片上传] 长图处理失败，使用原图压缩方案:', processError)
    // 处理失败，继续使用原图压缩方案
    imagePaths = [originalPath]
  }

  // 处理每张图片（原图或裁剪后的分段），不压缩，直接上传原图
  const uploadResults = []
  for (let i = 0; i < imagePaths.length; i++) {
    const currentPath = imagePaths[i]
    const segmentLabel = imagePaths.length > 1 ? `（第 ${i + 1}/${imagePaths.length} 段）` : ''
    
    const pathToUpload = currentPath

    // 上传（如果是分段，调整 index）
    const uploadIndex = imagePaths.length > 1 ? index * 100 + i : index
    const uploadResult = await uploadSingleWithRetry({ 
      file: { ...file, compressedPath: pathToUpload, uri: pathToUpload }, 
      index: uploadIndex, 
      url, 
      token, 
      productId: productId || file.productId 
    })
    uploadResults.push(uploadResult)
    
    // 如果不是最后一张，等待一下
    if (i < imagePaths.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  console.log(`[图片上传] ✅ ${imageTypeLabel} ${index + 1}/${total}${imagePaths.length > 1 ? `（共 ${imagePaths.length} 段）` : ''} 上传完成`)
  
  // 返回第一段的上传结果（保持兼容性）
  return uploadResults[0]
}

export const uploadProductImages = async (id, data) => {
  try {
    const token = uni.getStorageSync('token')
    const baseURL = config.baseURL + '/api'
    const url = `${baseURL}/products/${id}/images`

    const files = buildUploadFiles(data)
    logUploadOverview(data, files)

    if (files.length === 0) {
      return { success: true, message: '没有需要上传的本地图片' }
    }

    console.log(`[图片上传] 准备上传 ${files.length} 张图片`)
    console.log(`[图片上传] 当前平台: ${uni.getSystemInfoSync().uniPlatform}`)
    console.log(`[图片上传] 策略: 不压缩，直接上传原图，串行上传`)

    const uploadResults = []
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await processSingleUpload({ file: files[i], index: i, total: files.length, url, token, productId: id })
        uploadResults.push(result)
        if (i < files.length - 1) {
          console.log('[图片上传] 等待300ms后继续...')
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      } catch (err) {
        console.error(`[图片上传] ❌ 第 ${i + 1}/${files.length} 张处理失败:`, err)
      }
    }

    console.log('[图片上传] 所有图片处理完成，loading由外部统一管理')

    if (uploadResults.length > 0) {
      return {
        success: true,
        message: `上传完成，共 ${uploadResults.length} 张图片`,
        total: uploadResults.length,
        data: uploadResults
      }
    }

    const error = new Error('所有图片处理或上传失败')
    try { uni.hideLoading() } catch (e) { console.warn('[图片上传] 清除 loading 时出错（可忽略）:', e) }
    throw error
  } catch (error) {
    console.error('[图片上传] 上传过程出错:', error)
    try { uni.hideLoading() } catch (e) { console.warn('[图片上传] 清除 loading 时出错（可忽略）:', e) }
    throw error
  }
}



const UPDATE_IMG_SKIP_COMPRESS_MB = 10

const resolveImageType = (data) => {
  let imageType = data.image_type
  if (!imageType) {
    if (data.banner_images && Array.isArray(data.banner_images) && data.banner_images.length > 0) {
      imageType = 'banner'
    } else if (data.detail_images && Array.isArray(data.detail_images) && data.detail_images.length > 0) {
      imageType = 'detail'
    }
  }
  return imageType
}

const collectRawFiles = (data) => {
  if (data.files && Array.isArray(data.files)) return data.files
  if (data.banner_images && Array.isArray(data.banner_images)) return data.banner_images
  if (data.detail_images && Array.isArray(data.detail_images)) return data.detail_images
  return []
}

const isLocalImageFile = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return false
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    if (filePath.includes('/pic/')) return false
    return true
  }
  return (
    filePath.startsWith('http://tmp/') ||
    filePath.startsWith('wxfile://') ||
    filePath.startsWith('file://') ||
    filePath.startsWith('blob:') ||
    filePath.startsWith('/static/temp/') ||
    (filePath.startsWith('/') && !filePath.startsWith('/pic/') && !filePath.startsWith('/static/'))
  )
}

const ensureImageType = (imageType) => {
  if (!imageType || (imageType !== 'banner' && imageType !== 'detail')) {
    throw new Error('image_type 参数是必填的，必须是 "banner" 或 "detail"')
  }
  return imageType
}

const ensureRawFiles = (rawFiles) => {
  if (!rawFiles || !Array.isArray(rawFiles) || rawFiles.length === 0) {
    throw new Error('没有找到要上传的图片文件（files / banner_images / detail_images 均为空）')
  }
  if (rawFiles.length > 100) {
    throw new Error('最多只能上传100张图片')
  }
  return rawFiles
}

const logUploadStart = (id, imageType, filesToUpload, url) => {
  console.log(`\n========== [更新商品图片] 开始上传流程 ==========`)
  console.log(`[更新商品图片] 商品ID: ${id}`)
  console.log(`[更新商品图片] 图片类型: ${imageType}`)
  console.log(`[更新商品图片] 需要上传的图片数量: ${filesToUpload.length} 张`)
  console.log(`[更新商品图片] 上传方式: 顺序上传（一张一张处理）`)
  console.log(`[更新商品图片] 策略: 不压缩，直接上传原图`)
  console.log(`[更新商品图片] 上传URL: ${url}`)
  console.log('==========================================\n')
}

const compressImageIfNeeded = async (filePath, maxSizeMB = 1, quality = 80, attempt = 1) => {
  const maxSize = maxSizeMB * 1024 * 1024
  const maxAttempts = 10

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.warn(`[更新商品图片] ⚠️ 压缩超时（${attempt}次），使用原文件路径`)
      resolve(filePath)
    }, 30000)

    const clearTimeoutAndResolve = (result) => {
      clearTimeout(timeout)
      resolve(result)
    }

    const clearTimeoutAndReject = (error) => {
      clearTimeout(timeout)
      reject(error)
    }

    const handleCompressResult = (compressRes, imagePath, isTempPath) => {
      if (compressRes?.tempFilePath) {
        if (uni.getFileSystemManager && typeof uni.getFileSystemManager === 'function') {
          const fs = uni.getFileSystemManager()
          const getFileInfoTimeout = setTimeout(() => {
            console.warn(`[更新商品图片] ⚠️ 获取文件信息超时，使用压缩后的文件`)
            if (attempt < maxAttempts && quality > 30) {
              compressImageIfNeeded(compressRes.tempFilePath, maxSizeMB, quality - 20, attempt + 1)
                .then(clearTimeoutAndResolve).catch(() => clearTimeoutAndResolve(compressRes.tempFilePath))
            } else {
              clearTimeoutAndResolve(compressRes.tempFilePath)
            }
          }, 5000)

          fs.getFileInfo({
            filePath: compressRes.tempFilePath,
            success: (compressedInfo) => {
              clearTimeout(getFileInfoTimeout)
              const compressedSizeMB = (compressedInfo.size / 1024 / 1024).toFixed(2)
              console.log(`[更新商品图片] ✅ 压缩成功: ${compressedSizeMB}MB`)

              if (compressedInfo.size > maxSize && attempt < maxAttempts) {
                console.log(`[更新商品图片] ⚠️ 压缩后仍超过限制，继续压缩...`)
                compressImageIfNeeded(compressRes.tempFilePath, maxSizeMB, quality, attempt + 1)
                  .then(clearTimeoutAndResolve)
                  .catch(clearTimeoutAndReject)
              } else {
                clearTimeoutAndResolve(compressRes.tempFilePath)
              }
            },
            fail: (err) => {
              clearTimeout(getFileInfoTimeout)
              console.warn(`[更新商品图片] 获取文件信息失败:`, err)
              if (attempt < maxAttempts && quality > 30) {
                compressImageIfNeeded(compressRes.tempFilePath, maxSizeMB, quality - 20, attempt + 1)
                  .then(clearTimeoutAndResolve)
                  .catch(() => clearTimeoutAndResolve(compressRes.tempFilePath))
              } else {
                clearTimeoutAndResolve(compressRes.tempFilePath)
              }
            }
          })
        } else {
          console.log(`[更新商品图片] ✅ 压缩成功（无法获取文件大小，平台不支持getFileSystemManager）`)
          if (attempt < maxAttempts && quality > 30) {
            compressImageIfNeeded(compressRes.tempFilePath, maxSizeMB, quality - 20, attempt + 1)
              .then(clearTimeoutAndResolve)
              .catch(() => clearTimeoutAndResolve(compressRes.tempFilePath))
          } else {
            clearTimeoutAndResolve(compressRes.tempFilePath)
          }
        }
      } else {
        console.warn(`[更新商品图片] 压缩成功但未返回临时文件路径，使用原文件`)
        clearTimeoutAndResolve(imagePath)
      }
    }

    const doCompress = (pathToCompress, imageTypeLabel = '文件') => {
      let compressQuality = quality
      if (attempt > 1) {
        compressQuality = Math.max(10, quality - (attempt - 1) * 20)
        console.log(`[更新商品图片] 第${attempt}次压缩，使用质量: ${compressQuality}%`)
      } else {
        console.log(`[更新商品图片] 压缩质量: ${compressQuality}%`)
      }

      uni.compressImage({
        src: pathToCompress,
        quality: compressQuality,
        success: (compressRes) => handleCompressResult(compressRes, pathToCompress, false),
        fail: (err) => {
          console.warn(`[更新商品图片] 压缩失败（第${attempt}次）:`, err)
          if (attempt < maxAttempts) {
            const lowerQuality = Math.max(10, compressQuality - 20)
            compressImageIfNeeded(pathToCompress, maxSizeMB, lowerQuality, attempt + 1)
              .then(clearTimeoutAndResolve)
              .catch(() => clearTimeoutAndResolve(pathToCompress))
          } else {
            clearTimeoutAndResolve(pathToCompress)
          }
        }
      })
    }

    const handleKnownSize = (filePathToCheck, fileInfoSize) => {
      if (fileInfoSize >= UPDATE_IMG_SKIP_COMPRESS_MB * 1024 * 1024) {
        const fileSizeMBskip = (fileInfoSize / 1024 / 1024).toFixed(2)
        console.log(`[更新商品图片] 文件大小 ${fileSizeMBskip}MB >= ${UPDATE_IMG_SKIP_COMPRESS_MB}MB，跳过压缩以保留原图`)
        clearTimeoutAndResolve(filePathToCheck)
        return true
      }
      return false
    }

    const processWithFileInfo = (fileInfo, originalPath) => {
      if (handleKnownSize(originalPath, fileInfo.size)) return

      const fileSizeMB = (fileInfo.size / 1024 / 1024).toFixed(2)
      if (fileInfo.size <= maxSize) {
        console.log(`[更新商品图片] 文件大小: ${fileSizeMB}MB，满足要求（≤${maxSizeMB}MB），无需压缩`)
        clearTimeoutAndResolve(originalPath)
        return
      }

      console.log(`[更新商品图片] 文件大小: ${fileSizeMB}MB，开始压缩（第${attempt}次）...`)
      doCompress(originalPath)
    }

    // 临时路径：尝试获取大小，若超阈值跳过压缩，否则压缩
    if (filePath.startsWith('http://tmp/') || filePath.startsWith('wxfile://') || filePath.startsWith('file://')) {
      console.log(`[更新商品图片] 检测到临时路径，开始压缩（第${attempt}次尝试）`)
      console.log(`[更新商品图片] 文件路径: ${filePath}`)
      if (uni.getFileSystemManager && typeof uni.getFileSystemManager === 'function') {
        const fs = uni.getFileSystemManager()
        fs.getFileInfo({
          filePath,
          success: (tempInfo) => {
            if (tempInfo && handleKnownSize(filePath, tempInfo.size)) return
            doCompress(filePath)
          },
          fail: () => {
            doCompress(filePath)
          }
        })
      } else {
        doCompress(filePath)
      }
      return
    }

    // 其他路径：先取文件大小
    if (uni.getFileSystemManager && typeof uni.getFileSystemManager === 'function') {
      const fs = uni.getFileSystemManager()
      fs.getFileInfo({
        filePath,
        success: (fileInfo) => processWithFileInfo(fileInfo, filePath),
        fail: (err) => {
          console.warn(`[更新商品图片] 获取文件信息失败，尝试直接压缩:`, err)
          doCompress(filePath)
        }
      })
    } else {
      console.log(`[更新商品图片] 平台不支持getFileSystemManager，直接压缩（第${attempt}次）...`)
      doCompress(filePath)
    }
  })
}

const getFileInfoSafe = (filePath) => {
  if (!(uni.getFileSystemManager && typeof uni.getFileSystemManager === 'function')) return Promise.resolve(null)
  const fs = uni.getFileSystemManager()
  return new Promise((resolve) => {
    fs.getFileInfo({
      filePath,
      success: (info) => resolve({ size: info.size, sizeMB: (info.size / 1024 / 1024).toFixed(2) }),
      fail: () => resolve(null)
    })
  })
}

const logServerReturnedImages = (imageType, responseData) => {
  if (responseData && responseData.data) {
    const productData = responseData.data
    const returnedBanners = productData.main_image || productData.banner_images || []
    const returnedDetails = productData.detail_images || []
    console.log(`[更新商品图片] 服务器返回的图片数量 - 轮播图: ${Array.isArray(returnedBanners) ? returnedBanners.length : 0}, 详情图: ${Array.isArray(returnedDetails) ? returnedDetails.length : 0}`)
    if (imageType === 'banner' && Array.isArray(returnedBanners) && returnedBanners.length > 0) {
      console.log(`[更新商品图片] 服务器返回的轮播图路径:`, returnedBanners)
    }
    if (imageType === 'detail' && Array.isArray(returnedDetails) && returnedDetails.length > 0) {
      console.log(`[更新商品图片] 服务器返回的详情图路径:`, returnedDetails)
    }
  }
}

const uploadFileOnce = ({ url, processedFilePath, index, fullPath, imageType, token }) => {
  return new Promise((uploadResolve, uploadReject) => {
    uni.uploadFile({
      url,
      filePath: processedFilePath,
      name: 'files',
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        'accept': 'application/json',
        'X-HTTP-Method-Override': 'PUT'
      },
      formData: {
        _method: 'PUT'
      },
      success: (res) => {
        console.log(`[更新商品图片] 上传响应状态码: ${res.statusCode}`)
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const responseData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            console.log(`[更新商品图片] ✅ 第 ${index + 1} 张图片上传成功`)
            logServerReturnedImages(imageType, responseData)
            uploadResolve({ success: true, index: index + 1, path: fullPath, data: responseData })
          } catch (e) {
            console.warn(`[更新商品图片] 解析响应失败:`, e)
            console.log(`[更新商品图片] 原始响应数据:`, res.data)
            uploadResolve({ success: true, index: index + 1, path: fullPath, data: res.data })
          }
        } else {
          const errorInfo = {
            index: index + 1,
            path: fullPath,
            imageType,
            statusCode: res.statusCode,
            response: res.data,
            error: `HTTP ${res.statusCode}`,
            message: `第 ${index + 1} 张图片上传失败[${res.statusCode}]: ${res.data}`
          }
          console.error(`[更新商品图片] ❌ 第 ${index + 1} 张图片上传失败`)
          console.error(`[更新商品图片] 错误详情:`, errorInfo)
          uploadReject(errorInfo)
        }
      },
      fail: (err) => {
        const errorInfo = {
          index: index + 1,
          path: fullPath,
          imageType,
          error: err.errMsg || err.message || '上传失败',
          errCode: err.errCode,
          errMsg: err.errMsg,
          message: `第 ${index + 1} 张图片上传失败: ${err.errMsg || err.message || '未知错误'}`
        }
        console.error(`[更新商品图片] ❌ 第 ${index + 1} 张图片上传失败`)
        console.error(`[更新商品图片] 失败图片路径: ${fullPath}`)
        console.error(`[更新商品图片] 错误详情:`, errorInfo)
        console.error(`[更新商品图片] 原始错误对象:`, err)
        uploadReject(errorInfo)
      }
    })
  })
}

const processSingleFile = async ({ filePath, index, imageType, url, token }) => {
  const fullPath = filePath

  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('图片路径无效')
  }

  let originalFileInfo = null
  try {
    originalFileInfo = await getFileInfoSafe(filePath)
  } catch (e) {}

  if (originalFileInfo) {
    console.log(`[更新商品图片] 原始文件大小: ${originalFileInfo.sizeMB}MB (${originalFileInfo.size} 字节)`)
  }

  // 不压缩，直接使用原图上传
  const processedFilePath = filePath
  console.log(`[更新商品图片] 使用原图，不压缩，路径: ${processedFilePath}`)

  const uploadResult = await uploadFileOnce({ url, processedFilePath, index, fullPath, imageType, token })

  if (uploadResult.data && uploadResult.data.data) {
    const productData = uploadResult.data.data
    const banners = productData.main_image || productData.banner_images || []
    const details = productData.detail_images || []
    console.log(`[更新商品图片] ✅ 第 ${index + 1} 张图片处理完成`)
    if (imageType === 'banner') {
      console.log(`[更新商品图片] 当前服务器轮播图总数: ${Array.isArray(banners) ? banners.length : 0}`)
    } else {
      console.log(`[更新商品图片] 当前服务器详情图总数: ${Array.isArray(details) ? details.length : 0}`)
    }
  } else {
    console.log(`[更新商品图片] ✅ 第 ${index + 1} 张图片处理完成`)
  }
  console.log('')

  return uploadResult
}

const uploadSequentially = async ({ filesToUpload, imageType, url, token }) => {
  const results = []
  const successful = []
  const failed = []

  for (let index = 0; index < filesToUpload.length; index++) {
    const filePath = filesToUpload[index]

    console.log(`\n========== [更新商品图片] 处理第 ${index + 1}/${filesToUpload.length} 张图片 ==========`)
    console.log(`[更新商品图片] 图片类型: ${imageType}`)
    console.log(`[更新商品图片] 原始路径: ${filePath}`)

    try {
      const uploadResult = await processSingleFile({ filePath, index, imageType, url, token })
      successful.push(uploadResult)
      results.push({ status: 'fulfilled', value: uploadResult })
    } catch (error) {
      const errorInfo = error.index ? error : {
        index: index + 1,
        path: filePath,
        imageType,
        error: error.message || error.error || '处理失败',
        message: `第 ${index + 1} 张图片处理失败: ${error.message || error.error || '未知错误'}`
      }
      failed.push(errorInfo)
      results.push({ status: 'rejected', reason: errorInfo })
      console.error(`[更新商品图片] ❌ 第 ${index + 1} 张图片处理失败\n`)
    }
  }

  return { results, successful, failed }
}
/**
 * 更新商品图片（追加式）
 * @param {Number} id 商品ID
 * @param {Object} data 图片数据
 * @param {Array<String>} data.files 图片文件路径数组，最多10张
 * @param {String} data.image_type 图片类型: 'banner' 或 'detail'，必填
 * @returns {Promise}
 */
export const updateProductImages = (id, data) => {
  return new Promise((resolve, reject) => {
    try {
      const imageType = ensureImageType(resolveImageType(data))
      const rawFiles = ensureRawFiles(collectRawFiles(data))
      const filesToUpload = rawFiles.filter(isLocalImageFile)

      if (filesToUpload.length === 0) {
        resolve({ success: true, message: '没有需要上传的本地图片' })
        return
      }

      const token = uni.getStorageSync('token')
      const baseURL = config.baseURL + '/api'
      const url = `${baseURL}/products/${id}/images?image_type=${encodeURIComponent(imageType)}`

      logUploadStart(id, imageType, filesToUpload, url)

      uploadSequentially({ filesToUpload, imageType, url, token })
        .then(({ results, successful, failed }) => {
          console.log(`\n========== [更新商品图片] 上传完成统计 ==========`)
          console.log(`[更新商品图片] 商品ID: ${id}`)
          console.log(`[更新商品图片] 图片类型: ${imageType}`)
          console.log(`[更新商品图片] 总数量: ${filesToUpload.length} 张`)
          console.log(`[更新商品图片] ✅ 成功: ${successful.length} 张`)
          console.log(`[更新商品图片] ❌ 失败: ${failed.length} 张`)
          console.log(`[更新商品图片] 成功率: ${((successful.length / filesToUpload.length) * 100).toFixed(1)}%`)
          console.log(`==============================================`)

          if (successful.length > 0) {
            console.log(`\n========== [更新商品图片] ✅ 成功的图片详情 ==========`)
            successful.forEach((successInfo, idx) => {
              console.log(`成功图片 #${idx + 1}:`)
              console.log(`  索引: ${successInfo?.index || idx + 1}`)
              console.log(`  原始路径: ${successInfo?.path || '未知路径'}`)
              console.log(`  图片类型: ${imageType}`)

              if (successInfo?.data && successInfo.data.data) {
                const productData = successInfo.data.data
                const banners = productData.main_image || productData.banner_images || []
                const details = productData.detail_images || []

                if (imageType === 'banner' && Array.isArray(banners) && banners.length > 0) {
                  console.log(`  服务器返回的轮播图路径:`, banners)
                } else if (imageType === 'detail' && Array.isArray(details) && details.length > 0) {
                  console.log(`  服务器返回的详情图路径:`, details)
                }
              }
            })
            console.log(`==============================================\n`)
          }

          if (failed.length > 0) {
            console.error(`\n========== [更新商品图片] ❌ 失败的图片详情 ==========`)
            failed.forEach((errorInfo, idx) => {
              console.error(`失败图片 #${idx + 1}:`)
              console.error(`  索引: ${errorInfo?.index || idx + 1}`)
              console.error(`  路径: ${errorInfo?.path || '未知路径'}`)
              console.error(`  类型: ${errorInfo?.imageType || imageType}`)
              console.error(`  错误: ${errorInfo?.error || errorInfo?.message || '未知错误'}`)
              if (errorInfo?.statusCode) {
                console.error(`  HTTP状态码: ${errorInfo.statusCode}`)
              }
              if (errorInfo?.response) {
                console.error(`  响应内容: ${errorInfo.response}`)
              }
              if (errorInfo?.errCode) {
                console.error(`  错误代码: ${errorInfo.errCode}`)
              }
              if (errorInfo?.errMsg) {
                console.error(`  错误消息: ${errorInfo.errMsg}`)
              }
            })
            console.error(`==============================================\n`)
          }

          if (failed.length > 0) {
            const error = new Error(`共 ${failed.length} 张图片上传失败`)
            error.failed = failed
            error.successful = successful
            error.failedCount = failed.length
            error.succeededCount = successful.length
            error.totalCount = filesToUpload.length
            error.imageType = imageType
            reject(error)
            return
          }

          console.log(`\n========== [更新商品图片] ✅ 所有图片上传成功 ==========`)
          console.log(`图片类型: ${imageType}`)
          console.log(`成功数量: ${successful.length}/${filesToUpload.length} 张`)
          console.log(`==============================================\n`)

          const lastResult = successful.length > 0 ? successful[successful.length - 1] : null
          const last = lastResult?.data || lastResult
          if (last && last.data) {
            resolve(last)
          } else {
            resolve({
              status: 'success',
              message: `更新完成，共 ${filesToUpload.length} 张图片`,
              data: last || (lastResult?.data || null)
            })
          }
        })
        .catch((err) => {
          console.error('[更新商品图片] ❌ 上传过程出错:', err)
          reject(err)
        })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * 删除商品图片
 * @param {Number} id 商品ID
 * @param {Object} data 删除参数
 * @param {Array<String>} data.image_urls 要删除的图片URL数组
 * @param {String} data.image_type 图片类型: 'banner' 或 'detail'，必填
 * @returns {Promise}
 */
export const deleteProductImages = (id, data) => {
  if (!data.image_type || (data.image_type !== 'banner' && data.image_type !== 'detail')) {
    return Promise.reject(new Error('image_type 参数是必填的，必须是 "banner" 或 "detail"'))
  }
  
  if (!data.image_urls || !Array.isArray(data.image_urls) || data.image_urls.length === 0) {
    return Promise.reject(new Error('image_urls 参数是必填的，必须是一个非空数组'))
  }
  
  // 清理和验证图片URL
  const validUrls = data.image_urls
    .map(url => {
      if (!url || typeof url !== 'string') return null
      // 移除可能的空格和特殊字符
      let cleanedUrl = url.trim()
      
      // 如果是完整URL，提取路径部分
      if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) {
        try {
          const urlObj = new URL(cleanedUrl)
          cleanedUrl = urlObj.pathname
        } catch (e) {
          // 如果URL解析失败，尝试手动提取路径
          const match = cleanedUrl.match(/https?:\/\/[^\/]+(\/.*)/)
          if (match && match[1]) {
            cleanedUrl = match[1]
          }
        }
      }
      
      // 确保URL以/开头（相对路径）
      if (cleanedUrl && !cleanedUrl.startsWith('/')) {
        cleanedUrl = '/' + cleanedUrl
      }
      
      return cleanedUrl
    })
    .filter(url => url && url.length > 0)
  
  if (validUrls.length === 0) {
    return Promise.reject(new Error('没有有效的图片URL'))
  }
  
  // 根据API文档，参数应该在查询字符串中
  // 构建查询参数，使用标准格式 image_urls=url1&image_urls=url2（多个同名参数）
  const queryParams = []
  queryParams.push(`image_type=${encodeURIComponent(data.image_type)}`)
  
  // image_urls 作为多个同名查询参数，每个URL单独编码
  validUrls.forEach(url => {
    // 对URL进行完整编码
    const encodedUrl = encodeURIComponent(url)
    queryParams.push(`image_urls=${encodedUrl}`)
  })
  
  const url = `/api/products/${id}/images?${queryParams.join('&')}`
  console.log('\n========== [删除商品图片] 开始删除 ==========')
  console.log('[删除商品图片] 请求URL:', url)
  console.log('[删除商品图片] 商品ID:', id)
  console.log('[删除商品图片] 图片类型:', data.image_type)
  console.log('[删除商品图片] 图片URLs (原始):', data.image_urls)
  console.log('[删除商品图片] 图片URLs (处理后):', validUrls)
  console.log('[删除商品图片] 删除数量:', validUrls.length, '张')
  console.log('==========================================\n')
  
  // DELETE 请求，参数都在查询字符串中，不传请求体
  // 根据API文档，所有参数都是query参数
  return request.delete(url)
    .then((response) => {
      console.log('\n========== [删除商品图片] ✅ 删除成功 ==========')
      console.log('[删除商品图片] 响应数据:', response)
      console.log('[删除商品图片] 已删除图片数量:', validUrls.length, '张')
      console.log('==========================================\n')
      return response
    })
    .catch((error) => {
      console.error('\n========== [删除商品图片] ❌ 删除失败 ==========')
      console.error('[删除商品图片] 商品ID:', id)
      console.error('[删除商品图片] 图片类型:', data.image_type)
      console.error('[删除商品图片] 要删除的图片URLs:', validUrls)
      console.error('[删除商品图片] 错误对象:', error)
      console.error('[删除商品图片] 错误消息:', error.message || error.msg || error.detail || '未知错误')
      if (error.response) {
        console.error('[删除商品图片] HTTP状态码:', error.response.status)
        console.error('[删除商品图片] 响应数据:', error.response.data)
      }
      if (error.statusCode) {
        console.error('[删除商品图片] HTTP状态码:', error.statusCode)
      }
      if (error.data) {
        console.error('[删除商品图片] 错误数据:', error.data)
      }
      console.error('==========================================\n')
      throw error
    })
}

/**
 * 获取商品购买规则
 * @param {Number} id 商品ID
 * @returns {Promise}
 */
export const getProductRules = (id) => {
  return request.get(`/api/products/${id}/rules`)
}

/**
 * 立即购买
 * @param {Number} productId 商品ID
 * @param {Number} quantity 数量
 */
export const buyNow = (productId, quantity = 1) => {
  return request.post('/order/buyNow', { productId, quantity })
}

// 获取首页推荐商品列表
export const getHomeProducts = () => {
  return request.get('/api/products/home')
}

/**
 * 批量设置商品首页推荐状态
 * @param {Array} items 商品项数组，格式 [{ product_id, is_recommend }]
 * @returns {Promise}
 */
export const setHomeRecommend = (items) => {
  return request.put('/api/products/home-recommend', { items })
}

/**
 * 单个商品设置首页推荐（封装批量接口）
 * @param {Number} productId 商品ID
 * @param {Boolean} isRecommend 是否推荐
 */
export const updateHomeRecommend = (productId, isRecommend) => {
  return setHomeRecommend([{ product_id: productId, is_recommend: isRecommend }])
}
