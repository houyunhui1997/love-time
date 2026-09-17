<template>
  <view class="preference-page" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <uni-icons type="left" size="28" color="#514137" />
      </view>
    </view>

    <PreferenceMemoPanel class="preference-panel-host" />
  </view>
</template>

<script setup lang="ts">
import { onShareAppMessage } from '@dcloudio/uni-app'
import PreferenceMemoPanel from '@/components/preference/PreferenceMemoPanel.vue'

onShareAppMessage(() => ({
  title: '恋时光 · 记住关于 TA 的每一个小细节',
  path: '/pages/life/index',
  imageUrl: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/official-account-cover.jpg'
}))

const systemInfo = uni.getSystemInfoSync()
function getNavigationMetrics() {
  const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.top && menuButton?.height) return { top: menuButton.top, height: menuButton.height }
  } catch {
    // 非微信环境沿用与其他功能页一致的导航栏回退尺寸。
  }
  return { top: fallbackTop, height: 32 }
}

const navigationMetrics = getNavigationMetrics()
const pageStyle = {
  '--menu-top': `${navigationMetrics.top}px`,
  '--menu-height': `${navigationMetrics.height}px`
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/life/index' }) })
}
</script>

<style scoped lang="scss">
.preference-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--love-color-bg);
  color: var(--love-color-text);
}
.preference-page::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 540rpx;
  background: linear-gradient(180deg, #fff0ec 0%, rgba(255, 246, 241, 0.72) 54%, rgba(251, 247, 242, 0) 100%);
  content: '';
  pointer-events: none;
}
.nav-bar {
  position: relative;
  z-index: 1;
  display: flex;
  height: calc(var(--menu-top) + var(--menu-height));
  flex: none;
  align-items: center;
  padding: var(--menu-top) 42rpx 0;
}
.nav-back {
  display: flex;
  width: 62rpx;
  height: var(--menu-height);
  align-items: center;
  justify-content: flex-start;
}
.preference-panel-host {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}
</style>
