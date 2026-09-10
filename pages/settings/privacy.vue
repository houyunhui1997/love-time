<template>
  <view class="privacy-page" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <uni-icons type="left" size="28" color="#514137" />
      </view>
      <text class="nav-title">隐私与协议</text>
    </view>

    <scroll-view class="privacy-scroll" scroll-y :show-scrollbar="false" enhanced>
      <view class="privacy-content">
        <view class="intro-card">
          <view class="intro-heart">
            <uni-icons type="heart-filled" size="26" color="#d87974" />
          </view>
          <text class="intro-title">你的每一段回忆，都值得被温柔守护</text>
          <text class="intro-copy">我们深知纪念日与时光记录对你的意义，会以最谨慎的态度对待你的每一份数据。请在使用前，花几分钟了解以下内容。</text>
          <text class="intro-update">最近更新：2026 年 9 月</text>
        </view>

        <view class="section-card">
          <view class="section-head">
            <view class="section-badge">
              <uni-icons type="compose" size="18" color="#d87974" />
            </view>
            <text class="section-title">用户服务协议</text>
          </view>

          <view class="clause">
            <text class="clause-title">一、服务说明</text>
            <text class="clause-copy">恋时光是一款情侣纪念日与时光记录工具，为你提供恋爱档案、纪念日倒数、时光轴记录等功能的个人使用服务。你在此记录的每一份内容，都属于你自己。</text>
          </view>
          <view class="clause">
            <text class="clause-title">二、账号与登录</text>
            <text class="clause-copy">为在云端识别并保护你的个人数据，恋时光会在小程序打开时通过微信 OpenID 自动建立或恢复服务身份。该过程不读取你的微信头像、昵称或手机号；恋爱资料由你自愿填写，不填写也可使用基础记录功能。</text>
          </view>
          <view class="clause">
            <text class="clause-title">三、用户内容</text>
            <text class="clause-copy">你在恋时光中创建的档案、纪念日与时光记录等内容，权利归你所有。你应保证所发布的内容合法合规，不侵犯他人合法权益。未经你的授权，我们不会将你的私密内容用于任何其他用途。</text>
          </view>
          <view class="clause">
            <text class="clause-title">四、使用规范</text>
            <text class="clause-copy">请勿利用本服务从事任何违反法律法规或公序良俗的活动，包括但不限于发布违法违规、侵权、骚扰性质的内容。若发现此类行为，我们有权采取限制措施并保留追究责任的权利。</text>
          </view>
          <view class="clause clause-last">
            <text class="clause-title">五、协议的更新</text>
            <text class="clause-copy">为持续改进服务，我们可能会适时修订本协议。重大变更将通过页面公告等方式提醒你，请你及时关注。若你不同意修订后的内容，可停止使用本服务。</text>
          </view>
        </view>

        <view class="section-card">
          <view class="section-head">
            <view class="section-badge">
              <uni-icons type="locked" size="18" color="#d87974" />
            </view>
            <text class="section-title">隐私政策</text>
          </view>

          <view class="clause">
            <text class="clause-title">一、我们收集的信息</text>
            <text class="clause-copy">为提供服务所必需，我们会使用微信 OpenID 识别你的服务身份，并保存你主动创建的恋爱资料、纪念日、时光内容与照片。头像、昵称等非必要资料仅在你主动填写或授权后处理。我们不会收集与服务无关的个人信息。</text>
          </view>
          <view class="clause">
            <text class="clause-title">二、信息的使用</text>
            <text class="clause-copy">你的个人信息仅用于：为你提供账号服务与内容存储；实现纪念日提醒等已明确告知的功能；保障服务稳定与账号安全。未经你的同意，我们不会将你的个人信息用于本政策约定之外的用途。</text>
          </view>
          <view class="clause">
            <text class="clause-title">三、信息的存储与保护</text>
            <text class="clause-copy">你的数据存储于云端服务，我们采用业界通行的安全技术与管理措施防止数据被未经授权地访问、披露或丢失。存储期限以你使用服务的时间为准，超出必要期限后我们会删除或匿名化处理。</text>
          </view>
          <view class="clause">
            <text class="clause-title">四、信息的共享</text>
            <text class="clause-copy">我们不会向任何第三方出售你的个人信息。除法律法规要求或保障服务运行所必需（如云存储服务商在受约束的范围内处理数据）外，我们不会对外提供你的个人信息。</text>
          </view>
          <view class="clause">
            <text class="clause-title">五、你的权利</text>
            <text class="clause-copy">你有权查询、更正和删除自己的个人信息。你可以随时在小程序内删除已记录的内容；若需注销账号并清空全部数据，可通过小程序反馈渠道联系我们，我们将在核实后及时处理。</text>
          </view>
          <view class="clause clause-last">
            <text class="clause-title">六、未成年人保护</text>
            <text class="clause-copy">恋时光面向成年人提供服务。若你不满十八周岁，请在监护人的指导下使用本服务，并确保已获得监护人对你个人信息处理的同意。</text>
          </view>
        </view>

        <view class="footer-note">
          <view class="footer-line" />
          <text class="footer-copy">继续使用恋时光，即表示你已阅读并同意以上协议</text>
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

const navigationMetrics = getNavigationMetrics()
const pageStyle = {
  '--menu-top': `${navigationMetrics.top}px`,
  '--menu-height': `${navigationMetrics.height}px`
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.privacy-page {
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

.privacy-scroll {
  min-height: 0;
  flex: 1;
}

.privacy-content {
  padding: 12rpx 36rpx calc(env(safe-area-inset-bottom) + 48rpx);
}

/* 引言卡片 */
.intro-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 44rpx 40rpx 38rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 28rpx;
  background: rgba(252, 247, 241, 0.9);
  box-shadow: 0 12rpx 30rpx rgba(103, 73, 54, 0.08);
  text-align: center;
}

.intro-heart {
  display: flex;
  width: 84rpx;
  height: 84rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(234, 154, 145, 0.18);
}

.intro-title {
  margin-top: 22rpx;
  color: #554238;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.4;
}

.intro-copy {
  max-width: 540rpx;
  margin-top: 14rpx;
  color: #99877c;
  font-size: 24rpx;
  line-height: 1.7;
}

.intro-update {
  margin-top: 20rpx;
  padding: 6rpx 22rpx;
  border-radius: 20rpx;
  background: rgba(219, 116, 112, 0.1);
  color: #cf7268;
  font-size: 21rpx;
}

/* 协议区块卡片 */
.section-card {
  margin-top: 26rpx;
  padding: 34rpx 34rpx 10rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 28rpx;
  background: rgba(252, 247, 241, 0.9);
  box-shadow: 0 12rpx 30rpx rgba(103, 73, 54, 0.08);
}

.section-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-bottom: 26rpx;
  border-bottom: 1rpx solid rgba(222, 205, 192, 0.5);
}

.section-badge {
  display: flex;
  width: 56rpx;
  height: 56rpx;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: #fae9e2;
}

.section-title {
  color: #503d33;
  font-size: 30rpx;
  font-weight: 600;
}

.clause {
  padding: 26rpx 2rpx 20rpx;
  border-bottom: 1rpx solid rgba(229, 218, 209, 0.55);
}

.clause.clause-last {
  padding-bottom: 26rpx;
  border-bottom: none;
}

.clause-title {
  display: block;
  color: #5b493f;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.4;
}

.clause-copy {
  display: block;
  margin-top: 12rpx;
  color: #93816f;
  font-size: 24rpx;
  line-height: 1.75;
  text-align: justify;
}

/* 底部结语 */
.footer-note {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40rpx;
}

.footer-line {
  width: 64rpx;
  height: 3rpx;
  border-radius: 3rpx;
  background: rgba(219, 116, 112, 0.6);
}

.footer-copy {
  margin-top: 18rpx;
  color: #a4917f;
  font-size: 22rpx;
  letter-spacing: 1rpx;
}
</style>
