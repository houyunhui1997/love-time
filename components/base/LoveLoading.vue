<template>
  <view
    v-if="visible"
    class="love-loading"
    :class="[
      `love-loading--${size}`,
      { 'love-loading--fullscreen': fullscreen, 'love-loading--clear': !mask }
    ]"
    role="status"
    :aria-label="text || '正在加载'"
  >
    <view class="love-loading__visual">
      <image
        class="love-loading__wreath"
        src="/static/loading/love-loading-wreath.png"
        mode="aspectFit"
      />
      <image
        class="love-loading__heart"
        src="/static/loading/love-loading-heart.png"
        mode="aspectFit"
      />
    </view>
    <text v-if="text && size !== 'mini'" class="love-loading__text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible?: boolean
    text?: string
    size?: 'mini' | 'small' | 'medium'
    fullscreen?: boolean
    mask?: boolean
  }>(),
  {
    visible: true,
    text: '正在加载',
    size: 'medium',
    fullscreen: false,
    mask: true
  }
)
</script>

<style scoped lang="scss">
.love-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #88756a;
}

.love-loading--fullscreen {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9998;
  background: rgba(252, 247, 241, 0.76);
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);
}

.love-loading--fullscreen.love-loading--clear {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.love-loading__visual {
  position: relative;
  width: 204rpx;
  height: 204rpx;
}

.love-loading__wreath,
.love-loading__heart {
  position: absolute;
  top: 50%;
  left: 50%;
  display: block;
  transform-origin: center;
  will-change: transform, opacity;
}

.love-loading__wreath {
  width: 204rpx;
  height: 204rpx;
  margin: -102rpx 0 0 -102rpx;
  animation: love-loading-orbit 7.2s linear infinite;
}

.love-loading__heart {
  width: 108rpx;
  height: 108rpx;
  margin: -54rpx 0 0 -54rpx;
  animation: love-loading-heartbeat 1.55s ease-in-out infinite;
}

.love-loading__text {
  margin-top: 18rpx;
  color: #88756a;
  font-size: 26rpx;
  font-weight: 400;
  letter-spacing: 2rpx;
  line-height: 1.4;
}

.love-loading--small {
  .love-loading__visual {
    width: 148rpx;
    height: 148rpx;
  }

  .love-loading__wreath {
    width: 148rpx;
    height: 148rpx;
    margin: -74rpx 0 0 -74rpx;
  }

  .love-loading__heart {
    width: 78rpx;
    height: 78rpx;
    margin: -39rpx 0 0 -39rpx;
  }

  .love-loading__text {
    margin-top: 12rpx;
    font-size: 23rpx;
  }
}

.love-loading--mini {
  display: inline-flex;
  flex-direction: row;

  .love-loading__visual {
    width: 52rpx;
    height: 52rpx;
  }

  .love-loading__wreath {
    width: 52rpx;
    height: 52rpx;
    margin: -26rpx 0 0 -26rpx;
  }

  .love-loading__heart {
    width: 28rpx;
    height: 28rpx;
    margin: -14rpx 0 0 -14rpx;
  }
}

@keyframes love-loading-orbit {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@keyframes love-loading-heartbeat {
  0%,
  100% {
    opacity: 0.88;
    transform: scale(0.92);
  }

  42% {
    opacity: 1;
    transform: scale(1.06);
  }

  58% {
    opacity: 0.96;
    transform: scale(0.99);
  }

  72% {
    opacity: 1;
    transform: scale(1.035);
  }
}

@media (prefers-reduced-motion: reduce) {
  .love-loading__wreath,
  .love-loading__heart {
    animation: none;
  }
}
</style>
