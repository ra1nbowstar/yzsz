<template>
  <scroll-view class="bindcard-page" scroll-y>
    <view class="page-inner">
    <view class="card card-form">
      <text class="card-title">银行卡绑定</text>
      <WxSubMerchant @refreshed="loadExtras" />
    </view>

    <!-- 银行卡列表（多卡时显示，可设默认） -->
    <view class="card" v-if="cardList.length > 0">
      <text class="card-title">我的银行卡</text>
      <view v-for="(c, i) in cardList" :key="i" class="card-item">
        <text class="card-mask">{{ c.bank_name || c.account_bank || '银行卡' }} {{ c.account_number_masked || ('**** ' + (c.account_number_tail || '****')) }}</text>
        <button v-if="!c.is_default" class="btn-small" @tap="setDefault(c)">设为默认</button>
        <text v-else class="default-tag">默认</text>
      </view>
    </view>

    <!-- 操作日志 -->
    <view class="card" v-if="logs.length > 0">
      <text class="card-title">操作日志</text>
      <view v-for="(log, i) in logs" :key="i" class="log-item">
        <text class="log-desc">{{ log.action || log.desc || log.message || '-' }}</text>
        <text class="log-time">{{ log.created_at || log.time || '' }}</text>
      </view>
    </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import WxSubMerchant from '@/components/WxSubMerchant.vue'
import { getBankCardList, getBankCardLogs, setDefaultBankCard } from '@/api/bankcard.js'

const cardList = ref([])
const logs = ref([])

async function loadExtras() {
  try {
    const [cardsRes, logsRes] = await Promise.all([
      getBankCardList().catch(() => null),
      getBankCardLogs().catch(() => null)
    ])
    const cards = cardsRes?.data ?? cardsRes?.list ?? (Array.isArray(cardsRes) ? cardsRes : (cardsRes ? [cardsRes] : []))
    const logList = logsRes?.data ?? logsRes?.list ?? (Array.isArray(logsRes) ? logsRes : (logsRes ? [logsRes] : []))
    cardList.value = Array.isArray(cards) ? cards : []
    logs.value = Array.isArray(logList) ? logList : []
  } catch (e) {
    cardList.value = []
    logs.value = []
  }
}

async function setDefault(card) {
  try {
    const id = card.id
    if (!id) { uni.showToast({ title: '无法设置', icon: 'none' }); return }
    await setDefaultBankCard({ account_id: id })
    uni.showToast({ title: '已设为默认', icon: 'success' })
    loadExtras()
  } catch (e) {
    uni.showToast({ title: e?.message || '设置失败', icon: 'none' })
  }
}

onLoad(() => { uni.setNavigationBarTitle({ title: '银行卡绑定' }) })
onMounted(() => loadExtras())
onShow(() => loadExtras())
</script>

<style lang="scss" scoped>
@import "@/static/999/iconfont.css";
.bindcard-page {
  display: block;
  width: 100%;
  box-sizing: border-box;
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f7ff 0%, #fafafa 100%);
}
.page-inner {
  width: 100%;
  max-width: 750rpx;
  margin: 0 auto;
  padding: 32rpx;
  box-sizing: border-box;
}
.card {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-top: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  &:first-child { margin-top: 0 }
}
.card-form .card-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 1rpx;
}
.card-title {
  font-weight: 600;
  font-size: 32rpx;
  margin-bottom: 24rpx;
  display: block;
  color: #1a1a1a;
}
.card-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.card-item:last-child { border-bottom: none }
.card-mask { font-size: 28rpx; color: #333 }
.btn-small {
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  border: none;
  border-radius: 32rpx;
}
.default-tag { font-size: 24rpx; color: #52c41a; font-weight: 500 }
.log-item { padding: 20rpx 0; border-bottom: 1rpx solid #f5f5f5 }
.log-desc { display: block; font-size: 26rpx; color: #333 }
.log-time { display: block; font-size: 24rpx; color: #999; margin-top: 8rpx }
</style>
