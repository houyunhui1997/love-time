<template>
  <view class="wish-page" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <uni-icons type="left" size="28" color="#514137" />
      </view>
    </view>

    <WishListPanel class="wish-panel-host" />
  </view>
</template>

<script setup lang="ts">
import { onShareAppMessage } from '@dcloudio/uni-app'
import WishListPanel from '@/components/wish/WishListPanel.vue'

onShareAppMessage(() => ({
  title: '恋时光 · 记录爱，纪念每一个值得的日子',
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
    // 非微信环境沿用与其他首页一致的导航栏回退尺寸。
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
.wish-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--love-color-bg);
  color: var(--love-color-text);
}

.wish-page::before {
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
  box-sizing: content-box;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: var(--menu-top);
  height: var(--menu-height);
}
.nav-back {
  position: absolute;
  left: 26rpx;
  bottom: 0;
  display: flex;
  width: 64rpx;
  height: var(--menu-height);
  align-items: center;
}

/* 小程序自定义组件的宿主节点默认不参与 flex 拉伸，需让它撑满剩余高度并成为 flex 容器，
   组件内部 .wish-panel / .wish-scroll 的 flex:1 才能生效，列表才可滚动。 */
.wish-panel-host {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
</style>
