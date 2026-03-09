<template>
  <view class="permanent-collection-page">
    <!-- 隐藏 canvas：用于在二维码中心合成用户头像 -->
    <canvas
      canvas-id="permanentQrcodeCanvas"
      class="hidden-canvas"
      :style="{ width: canvasSize + 'px', height: canvasSize + 'px' }"
    />
    <view class="section-card">
      <view class="section-title">
        <text class="iconfont icon-hongbao section-icon"></text>
        <text>永久收款码</text>
        <text class="badge">长期有效·可打印</text>
      </view>
      <view class="tip">
        <text>扫码进入后可输入金额、使用优惠券完成支付。仅商家本人或管理员可生成。</text>
      </view>

      <view v-if="loading" class="qrcode-wrap loading-wrap">
        <text class="loading-text">生成中...</text>
      </view>
      <view v-else-if="errorMsg" class="qrcode-wrap error-wrap">
        <text class="error-text">{{ errorMsg }}</text>
        <button class="btn-retry" @tap="loadQrcode">重试</button>
      </view>
      <view v-else-if="qrcodeSrc" class="qrcode-wrap">
        <view class="qrcode-inner">
          <image
            class="qrcode-img"
            mode="aspectFit"
            :src="qrcodeSrc"
            @load="onImageLoad"
          />
        </view>
        <view class="qrcode-actions">
          <button class="btn-primary" @tap="saveImage" :disabled="saving">
            {{ saving ? '保存中...' : '保存收款码图片' }}
          </button>
        </view>
      </view>
      <view v-else class="qrcode-wrap empty-wrap">
        <text class="empty-text">请点击下方按钮生成收款码</text>
        <button class="btn-primary" @tap="loadQrcode" :disabled="loading">
          {{ loading ? '生成中...' : '生成永久收款码' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPermanentCollectionQrcode } from '@/api/order.js'
import { getAvatarUrl } from '@/utils/avatar.js'

const merchantId = ref(null)
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const qrcodeSrc = ref('')
const qrcodeB64 = ref('') // 纯 base64，用于保存到相册
const canvasSize = 280 // canvas 像素尺寸，用于合成中心头像

onLoad((options) => {
  if (options.merchant_id != null && options.merchant_id !== '') {
    merchantId.value = parseInt(options.merchant_id, 10)
  }
  if (!merchantId.value) {
    const userInfo = uni.getStorageSync('userInfo') || {}
    merchantId.value = userInfo.id ?? userInfo.user_id ?? userInfo.userId
  }
  if (merchantId.value) {
    loadQrcode()
  } else {
    errorMsg.value = '请先登录或传入商家ID'
  }
})

function normalizeQrcodeResponse(res) {
  if (res == null) return ''
  if (typeof res === 'string') return res.trim()
  if (typeof res === 'object' && res.data != null) {
    const d = res.data
    if (typeof d === 'string') return d.trim()
    // 后端返回 { code: 0, data: { qrcode: "data:image/png;base64,..." } }
    if (d && typeof d === 'object' && (d.qrcode != null || d.qrcode_b64 != null)) {
      const raw = (d.qrcode ?? d.qrcode_b64 ?? '').trim()
      return raw
    }
  }
  return ''
}

/** 将二维码与用户头像合成：中心显示头像，扫码功能不变 */
function compositeQrcodeWithAvatar() {
  const size = canvasSize
  const center = size / 2
  const logoRadius = Math.floor(size * 0.12) // 中心圆半径，约 12%，保证可扫
  const borderWidth = 4
  const innerRadius = logoRadius - borderWidth

  const userInfo = uni.getStorageSync('userInfo') || {}
  const avatarPathOrUrl = userInfo.avatar_path ?? userInfo.avatar ?? ''
  const avatarUrl = getAvatarUrl(avatarPathOrUrl)

  const dir = typeof wx !== 'undefined' && wx.env && wx.env.USER_DATA_PATH ? wx.env.USER_DATA_PATH : ''
  if (!dir) return

  const fsm = uni.getFileSystemManager()
  if (!fsm) return

  const qrcodeSrcVal = qrcodeSrc.value
  const qrcodeB64Val = qrcodeB64.value

  const getQrcodeLocalPath = () => {
    if (/^data:image\/[^;]+;base64,/.test(qrcodeSrcVal) && qrcodeB64Val) {
      return new Promise((resolve, reject) => {
        const path = `${dir}/perm_qr_${Date.now()}.png`
        fsm.writeFile({
          filePath: path,
          data: qrcodeB64Val,
          encoding: 'base64',
          success: () => resolve(path),
          fail: reject
        })
      })
    }
    if (/^https?:\/\//i.test(qrcodeSrcVal)) {
      return new Promise((resolve, reject) => {
        uni.downloadFile({
          url: qrcodeSrcVal,
          success: (r) => (r.statusCode === 200 && r.tempFilePath ? resolve(r.tempFilePath) : reject(new Error('download fail'))),
          fail: reject
        })
      })
    }
    return Promise.reject(new Error('unsupported qrcode source'))
  }

  const getAvatarLocalPath = () => {
    const url = avatarUrl || ''
    if (/^https?:\/\//i.test(url)) {
      return new Promise((resolve, reject) => {
        uni.downloadFile({
          url,
          success: (r) => (r.statusCode === 200 && r.tempFilePath ? resolve(r.tempFilePath) : reject(new Error('avatar download fail'))),
          fail: () => resolve(null)
        })
      })
    }
    return Promise.resolve(null)
  }

  Promise.all([getQrcodeLocalPath(), getAvatarLocalPath()])
    .then(([qrcodePath, avatarPath]) => {
      const ctx = uni.createCanvasContext('permanentQrcodeCanvas')
      ctx.drawImage(qrcodePath, 0, 0, size, size)
      if (avatarPath) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(center, center, logoRadius, 0, 2 * Math.PI)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(center, center, innerRadius, 0, 2 * Math.PI)
        ctx.clip()
        const sx = center - innerRadius
        const sy = center - innerRadius
        const sw = innerRadius * 2
        ctx.drawImage(avatarPath, sx, sy, sw, sw)
        ctx.restore()
      }
      ctx.draw(false, () => {
        setTimeout(() => {
          uni.canvasToTempFilePath({
            canvasId: 'permanentQrcodeCanvas',
            width: size,
            height: size,
            destWidth: size,
            destHeight: size,
            fileType: 'png',
            success: (res) => {
              if (!res.tempFilePath) return
              try {
                const base64 = fsm.readFileSync(res.tempFilePath, 'base64')
                if (base64) {
                  qrcodeB64.value = base64
                  qrcodeSrc.value = 'data:image/png;base64,' + base64
                }
              } catch (e) {
                console.warn('[永久收款码] 合成图转 base64 失败', e)
              }
            },
            fail: (e) => console.warn('[永久收款码] canvas 导出失败', e)
          })
        }, 400)
      })
    })
    .catch((e) => console.warn('[永久收款码] 合成跳过，使用原图', e))
}

async function loadQrcode() {
  if (!merchantId.value) {
    uni.showToast({ title: '商家ID为空', icon: 'none' })
    return
  }
  loading.value = true
  errorMsg.value = ''
  qrcodeSrc.value = ''
  qrcodeB64.value = ''
  try {
    const res = await getPermanentCollectionQrcode(merchantId.value)
    const raw = normalizeQrcodeResponse(res)
    if (!raw) {
      errorMsg.value = '接口未返回收款码数据'
      return
    }
    let b64 = raw
    if (raw.indexOf('base64,') !== -1) {
      b64 = raw.split('base64,')[1] || ''
    }
    if (/^data:image\//i.test(raw)) {
      qrcodeSrc.value = raw
      qrcodeB64.value = b64.replace(/\s/g, '')
    } else if (b64.length > 100) {
      qrcodeB64.value = b64.replace(/\s/g, '')
      qrcodeSrc.value = 'data:image/png;base64,' + qrcodeB64.value
    } else if (/^https?:\/\//i.test(raw)) {
      qrcodeSrc.value = raw
    } else {
      qrcodeSrc.value = 'data:image/png;base64,' + raw
      qrcodeB64.value = raw.replace(/\s/g, '')
    }
    // 在二维码中心合成用户头像（样子变、功能不变，仍可微信扫）
    compositeQrcodeWithAvatar()
  } catch (e) {
    console.error('[永久收款码] 获取失败', e)
    errorMsg.value = (e && (e.message || e.detail || e.msg)) || '生成失败，请重试'
  } finally {
    loading.value = false
  }
}

function onImageLoad() {
  // 图片加载完成，可用于统计等
}

function saveImage() {
  if (!qrcodeSrc.value) {
    uni.showToast({ title: '暂无收款码可保存', icon: 'none' })
    return
  }
  saving.value = true
  const done = (msg, ok = true) => {
    saving.value = false
    uni.showToast({ title: msg || (ok ? '已保存到相册' : '保存失败'), icon: ok ? 'success' : 'none' })
  }
  // 若为 base64，先写入临时文件再保存
  if (qrcodeB64.value) {
    try {
      const fsm = uni.getFileSystemManager()
      if (!fsm) {
        done('当前环境不支持保存', false)
        return
      }
      const dir = typeof wx !== 'undefined' && wx.env && wx.env.USER_DATA_PATH ? wx.env.USER_DATA_PATH : ''
      if (!dir) {
        done('无法获取存储路径', false)
        return
      }
      const path = `${dir}/permanent_qrcode_${Date.now()}.png`
      fsm.writeFile({
        filePath: path,
        data: qrcodeB64.value,
        encoding: 'base64',
        success: () => {
          uni.saveImageToPhotosAlbum({
            filePath: path,
            success: () => done('已保存到相册'),
            fail: (err) => {
              if (err.errMsg && err.errMsg.indexOf('auth') !== -1) {
                done('请授权保存到相册', false)
              } else {
                done(err.errMsg || '保存失败', false)
              }
            }
          })
        },
        fail: (e) => done((e.errMsg || '写入失败'), false)
      })
    } catch (e) {
      done((e && e.message) || '保存失败', false)
    }
    return
  }
  // 若为 URL，先下载再保存
  uni.downloadFile({
    url: qrcodeSrc.value,
    success: (r) => {
      if (r.statusCode === 200 && r.tempFilePath) {
        uni.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: () => done('已保存到相册'),
          fail: (err) => {
            if (err.errMsg && err.errMsg.indexOf('auth') !== -1) {
              done('请授权保存到相册', false)
            } else {
              done(err.errMsg || '保存失败', false)
            }
          },
          complete: () => { saving.value = false }
        })
      } else {
        done('下载图片失败', false)
      }
    },
    fail: () => done('下载失败', false),
    complete: () => { saving.value = false }
  })
}
</script>

<style scoped>
.permanent-collection-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
}
.section-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}
.section-icon {
  font-size: 40rpx;
  color: #07c160;
}
.badge {
  font-size: 22rpx;
  color: #07c160;
  background: #e8f8f0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-left: auto;
}
.tip {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
  margin-bottom: 32rpx;
}
.qrcode-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}
.loading-wrap,
.error-wrap,
.empty-wrap {
  min-height: 280rpx;
  justify-content: center;
}
.loading-text,
.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 24rpx;
}
.error-text {
  font-size: 28rpx;
  color: #ee0a24;
  margin-bottom: 24rpx;
  text-align: center;
}
.btn-retry {
  padding: 16rpx 48rpx;
  background: #07c160;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
}
.qrcode-inner {
  width: 400rpx;
  height: 400rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2rpx solid #eee;
  border-radius: 16rpx;
  overflow: hidden;
}
.qrcode-img {
  width: 360rpx;
  height: 360rpx;
}
.qrcode-actions {
  margin-top: 32rpx;
  width: 100%;
}
.btn-primary {
  width: 100%;
  padding: 24rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 48rpx;
  border: none;
}
.btn-primary[disabled] {
  opacity: 0.6;
}
.hidden-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
  z-index: -1;
  pointer-events: none;
}
</style>
