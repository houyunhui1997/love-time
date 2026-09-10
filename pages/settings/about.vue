<template>
  <view class="about-page" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <uni-icons type="left" size="28" color="#514137" />
      </view>
      <text class="nav-title">关于恋时光</text>
    </view>

    <scroll-view class="about-scroll" scroll-y :show-scrollbar="false" enhanced>
      <view class="about-content">
        <!-- 品牌区 -->
        <view class="brand-card">
          <view class="brand-emblem">
            <uni-icons type="heart-filled" size="52" color="#ffffff" />
          </view>
          <text class="brand-name">恋时光</text>
          <text class="brand-eyebrow">LOVE TIME</text>
          <view class="brand-divider">
            <view class="divider-dot" />
            <view class="divider-line" />
            <view class="divider-dot" />
          </view>
          <text class="brand-slogan">记录爱，纪念每一个值得的日子</text>
          <view class="version-chip">
            <text class="version-text">当前版本 {{ appVersion }}</text>
          </view>
        </view>

        <!-- 功能特性 -->
        <view class="feature-list">
          <view class="feature-card">
            <view class="feature-icon">
              <uni-icons type="calendar" size="24" color="#d87974" />
            </view>
            <view class="feature-copy">
              <text class="feature-title">纪念日</text>
              <text class="feature-desc">在一起的天数、生日与每个重要日子，自动倒数，从不缺席。</text>
            </view>
          </view>
          <view class="feature-card">
            <view class="feature-icon">
              <uni-icons type="loop" size="24" color="#d87974" />
            </view>
            <view class="feature-copy">
              <text class="feature-title">时光轴</text>
              <text class="feature-desc">把心动瞬间写进时光轴，配上此刻心情，回忆有了模样。</text>
            </view>
          </view>
          <view class="feature-card">
            <view class="feature-icon">
              <uni-icons type="contact" size="24" color="#d87974" />
            </view>
            <view class="feature-copy">
              <text class="feature-title">恋爱档案</text>
              <text class="feature-desc">你们的称呼与故事，值得一份专属档案，安静珍藏。</text>
            </view>
          </view>
        </view>

        <!-- 承诺卡 -->
        <view class="promise-card">
          <view class="promise-head">
            <uni-icons type="heart-filled" size="16" color="#d87974" />
            <text>我们的承诺</text>
          </view>
          <text class="promise-copy">恋时光由个人开发者用心打造。你的每一条记录都属于你自己，我们只做回忆的守护者，不做任何多余的事。</text>
        </view>

        <!-- 底部版权 -->
        <view class="about-footer">
          <view class="footer-flower">
            <uni-icons type="heart" size="20" color="#dcb2a7" />
          </view>
          <text class="footer-copy">© 2026 恋时光 LOVE TIME</text>
          <text class="footer-copy sub">愿所有认真相爱的人，都被时光温柔以待</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
const systemInfo = uni.getSystemInfoSync()

function getNavigationMetrics() {
  const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.top && menuButton?.height) {
      return { top: menuButton.top, height: menuButton.height }
    }
  } catch {
    // 非微信环境使用接近微信胶囊尺寸的回退值。
  }
  return { top: fallbackTop, height: 32 }
}

function getAppVersion() {
  try {
    const accountInfo = uni.getAccountInfoSync()
    return accountInfo?.miniProgram?.version || '1.0.0'
  } catch {
    return '1.0.0'
  }
}

const navigationMetrics = getNavigationMetrics()
const appVersion = getAppVersion()
const pageStyle = {
  '--menu-top': `${navigationMetrics.top}px`,
  '--menu-height': `${navigationMetrics.height}px`
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.about-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 8% 2%, rgba(247, 205, 197, 0.6), transparent 44%),
    linear-gradient(180deg, #f5ddd5 0%, #f9ebe3 18%, #fbf4ed 46%, #fcf8f3 100%);
  color: #55433a;
}

.nav-bar {
  position: relative;
  z-index: 3;
  display: flex;
  height: calc(var(--menu-top) + var(--menu-height));
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding-top: var(--menu-top);
}

.nav-back {
  position: absolute;
  bottom: 0;
  left: 35rpx;
  display: flex;
  width: 62rpx;
  height: var(--menu-height);
  align-items: center;
  justify-content: flex-start;
}

.nav-title {
  color: #514137;
  font-size: 35rpx;
  font-weight: 600;
  line-height: var(--menu-height);
  letter-spacing: 1rpx;
}

.about-scroll {
  min-height: 0;
  flex: 1;
}

.about-content {
  padding: 12rpx 36rpx calc(env(safe-area-inset-bottom) + 48rpx);
}

/* 品牌区 */
.brand-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 52rpx 40rpx 44rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 28rpx;
  background: rgba(252, 247, 241, 0.9);
  box-shadow: 0 12rpx 30rpx rgba(103, 73, 54, 0.08);
  text-align: center;
}

.brand-emblem {
  display: flex;
  width: 132rpx;
  height: 132rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #ec8580, #d96768);
  box-shadow:
    0 14rpx 32rpx rgba(205, 91, 91, 0.3),
    inset 0 3rpx 0 rgba(255, 255, 255, 0.35);
}

.brand-name {
  margin-top: 26rpx;
  color: #4f3d34;
  font-size: 44rpx;
  font-weight: 650;
  letter-spacing: 6rpx;
}

.brand-eyebrow {
  margin-top: 8rpx;
  color: #d47a73;
  font-size: 19rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
}

.brand-divider {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 24rpx;
}

.divider-line {
  width: 120rpx;
  height: 1rpx;
  background: rgba(219, 116, 112, 0.35);
}

.divider-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: rgba(219, 116, 112, 0.5);
}

.brand-slogan {
  margin-top: 18rpx;
  color: #99877c;
  font-size: 25rpx;
  line-height: 1.6;
}

.version-chip {
  margin-top: 28rpx;
  padding: 8rpx 26rpx;
  border: 1rpx solid rgba(219, 116, 112, 0.32);
  border-radius: 24rpx;
  background: rgba(255, 239, 235, 0.6);
}

.version-text {
  color: #cf7268;
  font-size: 22rpx;
  letter-spacing: 1rpx;
}

/* 功能特性 */
.feature-list {
  margin-top: 26rpx;
  padding: 10rpx 30rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 28rpx;
  background: rgba(252, 247, 241, 0.9);
  box-shadow: 0 12rpx 30rpx rgba(103, 73, 54, 0.08);
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 22rpx;
  padding: 28rpx 0;
}

.feature-card + .feature-card {
  border-top: 1rpx solid rgba(229, 218, 209, 0.55);
}

.feature-icon {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  background: #fae9e2;
}

.feature-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.feature-title {
  color: #503d33;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.35;
}

.feature-desc {
  margin-top: 8rpx;
  color: #93816f;
  font-size: 23rpx;
  line-height: 1.65;
}

/* 承诺卡 */
.promise-card {
  margin-top: 26rpx;
  padding: 30rpx 32rpx;
  border: 1rpx dashed rgba(219, 116, 112, 0.4);
  border-radius: 28rpx;
  background: rgba(255, 244, 240, 0.72);
}

.promise-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  color: #cf7268;
  font-size: 26rpx;
  font-weight: 600;
}

.promise-copy {
  display: block;
  margin-top: 14rpx;
  color: #93816f;
  font-size: 24rpx;
  line-height: 1.75;
  text-align: justify;
}

/* 底部版权 */
.about-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 44rpx;
}

.footer-flower {
  display: flex;
  width: 60rpx;
  height: 60rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(234, 154, 145, 0.14);
}

.footer-copy {
  margin-top: 16rpx;
  color: #a4917f;
  font-size: 22rpx;
  letter-spacing: 1rpx;
}

.footer-copy.sub {
  margin-top: 8rpx;
  color: #b8a798;
  font-size: 20rpx;
}
</style>
