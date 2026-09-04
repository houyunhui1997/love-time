<template>
  <view class="love-page scaffold">
    <view class="scaffold__brand">LOVE TIME</view>
    <view class="scaffold__header">
      <button v-if="showBack" class="scaffold__back" aria-label="返回" @tap="goBack">‹</button>
      <view>
        <view class="scaffold__title">{{ title }}</view>
        <view v-if="description" class="scaffold__description">{{ description }}</view>
      </view>
    </view>

    <view class="scaffold__placeholder love-card">
      <view class="scaffold__placeholder-title">页面结构已就绪</view>
      <view class="scaffold__placeholder-copy">下一阶段将根据蓝湖标注还原正式界面。</view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    showBack?: boolean
  }>(),
  {
    description: '',
    showBack: false
  }
)

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.scaffold {
  &__brand {
    margin-bottom: 20rpx;
    color: var(--love-color-primary);
    font-size: 24rpx;
    font-weight: 700;
    letter-spacing: 8rpx;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
  }

  &__back {
    width: 72rpx;
    height: 72rpx;
    padding: 0;
    background: transparent;
    color: var(--love-color-text);
    font-size: 64rpx;
    line-height: 60rpx;
  }

  &__title {
    font-size: 52rpx;
    font-weight: 700;
    line-height: 1.25;
  }

  &__description {
    margin-top: 12rpx;
    color: var(--love-color-text-secondary);
    line-height: 1.6;
  }

  &__placeholder {
    margin-top: 72rpx;
    padding: 48rpx;
  }

  &__placeholder-title {
    font-size: 32rpx;
    font-weight: 600;
  }

  &__placeholder-copy {
    margin-top: 16rpx;
    color: var(--love-color-text-secondary);
    line-height: 1.7;
  }
}
</style>

