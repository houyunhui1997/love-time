<template>
  <view class="life-page">
    <view class="life-placeholder">
      <text class="life-title">生活</text>
      <text class="life-subtitle">敬请期待</text>
    </view>
  </view>
</template>

<script setup lang="ts">
</script>

<style scoped>
.life-page {
  min-height: 100vh;
  background-color: #FBF7F2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.life-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.life-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #A79A90;
}

.life-subtitle {
  font-size: 26rpx;
  color: #C4B7AC;
}
</style>
