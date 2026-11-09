<template>
  <view class="withdraw-card">
    <text>提现暂不可用</text>
    <text>{{ WITHDRAW_UNAVAILABLE }}</text>
    <text>当前未提供可核验余额及提现记录，不会提交申请或扣减余额。</text>
    <button disabled>暂不可提现</button>
  </view>
</template>

<script setup>
import { WITHDRAW_UNAVAILABLE } from '@/api/withdraw.js'
</script>

<style scoped>
.withdraw-card { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
</style>
