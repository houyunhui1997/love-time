<template>
  <view class="profile-page" :style="pageStyle">
    <view class="profile-header">
      <image class="header-sprig header-sprig-left" src="/static/profile/companion/botanical-sprig.png" mode="aspectFit" />
      <image class="header-sprig header-sprig-right" src="/static/profile/companion/botanical-sprig.png" mode="aspectFit" />
      <view class="page-header">
        <!-- <text class="page-title">我的</text>
        <text class="eyebrow">LOVE TIME</text> -->
      </view>
      <view v-if="isLoggedIn" class="identity">
        <button class="avatar-button" aria-label="编辑头像和恋爱资料" @tap="openProfileDialog">
          <image class="account-avatar" :src="accountAvatar" mode="aspectFill" @error="avatarFailed = true" />
        </button>
        <text class="identity-name">{{ accountName }}</text>
        <text class="identity-status">{{ profile ? '' : '已临时登录' }}</text>
      </view>
      <view v-else class="identity identity-offline">
        <image class="offline-emblem" src="/static/profile/companion/heart-emblem.png" mode="aspectFit" />
        <text class="identity-name">恋时光</text>
      </view>
    </view>

    <view class="page-content">
      <template v-if="isLoggedIn">
        <view class="archive-card" :class="{ 'has-profile': profile }">
          <image class="archive-emblem" src="/static/profile/companion/heart-emblem.png" mode="aspectFit" />
          <view class="archive-content">
            <text class="archive-title">我们的恋爱档案</text>
            <template v-if="profile">
              <view class="days-line"><text class="days-label">已经相伴</text><text class="days-number">{{ togetherDays }}</text><text class="days-unit">天</text></view>
              <text class="archive-subtitle">始于 {{ displayStartDate }}</text>
              <text v-if="profile.partnerName" class="partner-name">与 {{ profile.partnerName }} 慢慢相伴</text>
            </template>
            <!-- <text v-else class="archive-subtitle">补充资料，开启专属记录</text> -->
            <button class="profile-button" @tap="openProfileDialog">
              <text>{{ profile ? '编辑资料' : '完善资料' }}</text>
              <uni-icons type="right" size="18" color="#fffaf5" />
            </button>
            <!-- <text v-if="!profile" class="archive-note">稍后填写也可以</text> -->
          </view>
        </view>

        <view class="settings-list">
          <view v-for="(group, groupIndex) in menuGroups" :key="groupIndex" class="menu-group">
            <view v-for="item in group" :key="item.label" class="menu-row" hover-class="menu-row-pressed" @tap="openMenu(item.label)">
              <view class="menu-icon"><uni-icons :type="item.icon" size="27" color="#df8176" /></view>
              <text class="menu-label">{{ item.label }}</text>
              <text v-if="item.caption" class="menu-caption">{{ item.caption }}</text>
              <uni-icons class="row-arrow" type="right" size="19" color="#ae9788" />
            </view>
          </view>
        </view>

        <view class="page-signature">
          <view class="signature-line"><view class="signature-rule" /><text class="signature-copy">慢慢记录，长长相伴</text><view class="signature-rule" /></view>
          <image class="signature-sprig" src="/static/profile/companion/botanical-sprig.png" mode="aspectFit" />
        </view>
      </template>

      <view v-else class="guest-home">
        <text class="guest-heading">暂时无法连接服务</text>
        <text class="guest-copy">请检查网络后重试，你的记录都会保存在服务器</text>
        <button class="guest-login-button" @tap="loadProfilePage">重新连接</button>
      </view>
    </view>
    <LoveLoginDialog v-model="showProfileDialog" @success="onProfileSaved" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import LoveLoginDialog from '@/components/auth/LoveLoginDialog.vue'
import { differenceInCalendarDays, formatBusinessDate } from '@/utils/date'
import { restoreWeixinSession } from '@/services/auth'
import {
  getMyAccountProfile,
  getMyLoveProfile,
  type AccountProfile,
  type CompleteProfileResult,
  type LoveProfile
} from '@/services/profile'

const isLoggedIn = ref(false)
const showProfileDialog = ref(false)
const account = ref<AccountProfile | null>(null)
const profile = ref<LoveProfile | null>(null)

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

interface MenuItem {
  label: string
  icon: string
  caption?: string
}

const menuGroups: MenuItem[][] = [
  [
    { label: '恋爱资料', icon: 'contact', caption: '个人资料与恋爱日期' },
    { label: '提醒设置', icon: 'notification', caption: '重要日子不遗漏' }
  ],
  [
    { label: '隐私与协议', icon: 'locked' },
    { label: '关于恋时光', icon: 'info' }
  ]
]

const routeByMenu: Record<string, string> = {
  提醒设置: '/pages/settings/reminder',
  隐私与协议: '/pages/settings/privacy',
  关于恋时光: '/pages/settings/about'
}

const today = formatBusinessDate(new Date())
const accountName = computed(() => account.value?.nickname || '恋时光用户')
const avatarFailed = ref(false)
const accountAvatar = computed(() => !avatarFailed.value && account.value?.avatarFileId || '/static/profile/companion/default-avatar.png')
const togetherDays = computed(() => profile.value ? Math.max(0, differenceInCalendarDays(today, profile.value.loveStartDate)) : 0)
const displayStartDate = computed(() => profile.value?.loveStartDate.replace(/-/g, '.') || '')

onShow(loadProfilePage)

async function loadProfilePage() {
  isLoggedIn.value = await restoreWeixinSession()
  if (!isLoggedIn.value) {
    account.value = null
    profile.value = null
    return
  }

  try {
    const [accountResult, profileResult] = await Promise.all([
      getMyAccountProfile(),
      getMyLoveProfile()
    ])
    avatarFailed.value = false
    account.value = accountResult
    profile.value = profileResult
  } catch (error) {
    const message = error instanceof Error ? error.message : '资料读取失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

function openProfileDialog() {
  showProfileDialog.value = true
}

function onProfileSaved(result: CompleteProfileResult) {
  avatarFailed.value = false
  account.value = result.account
  profile.value = result.profile
}

function openMenu(label: string) {
  if (label === '恋爱资料') {
    openProfileDialog()
    return
  }

  const url = routeByMenu[label]
  if (url) uni.navigateTo({ url })
}
</script>

<style scoped lang="scss">
.profile-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding-bottom: calc(env(safe-area-inset-bottom) + 16rpx);
  color: #554238;
  background: #fcf7f1 url('/static/profile/companion/paper-texture.jpg') repeat;
  background-size: 256rpx 256rpx;
}
.profile-header { position: relative; overflow: hidden; padding-bottom: 38rpx; border-radius: 0 0 50% 50% / 0 0 12% 12%; background: #f9e8df; }
.header-background { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.page-header { position: relative; display: flex; box-sizing: border-box; height: calc(var(--menu-top) + var(--menu-height)); align-items: center; gap: 18rpx; padding: var(--menu-top) 210rpx 0 40rpx; }
.page-title { color: #503d32; font-size: 38rpx; font-weight: 650; line-height: var(--menu-height); white-space: nowrap; }
.eyebrow { color: #d77d73; font-size: 18rpx; font-weight: 500; letter-spacing: 4rpx; white-space: nowrap; }
.identity { position: relative; display: flex; flex-direction: column; align-items: center; padding: 24rpx 36rpx 0; }
.avatar-button { width: 208rpx; height: 208rpx; flex-shrink: 0; margin: 0; padding: 0; overflow: hidden; border: 6rpx solid #fffcf7; border-radius: 50%; background: #e2dfc6; box-shadow: 0 7rpx 16rpx rgba(124, 93, 66, .14); line-height: 1; }
.avatar-button::after { border: 0; }
.account-avatar { display: block; width: 100%; height: 100%; }
.identity-name { display: block; max-width: 80%; margin-top: 18rpx; overflow: hidden; color: #503d32; font-size: 34rpx; font-weight: 600; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.identity-status { margin-top: 8rpx; color: #a28c7c; font-size: 25rpx; line-height: 1.5; }
.page-content { padding: 0 34rpx; }
.archive-card { position: relative; box-sizing: border-box; min-height: 286rpx; margin-top: 28rpx; overflow: hidden; padding: 32rpx 36rpx 28rpx; border-radius: 30rpx; background: rgba(242, 231, 216, .35); }
.archive-emblem { position: absolute; top: 44rpx; right: 18rpx; width: 292rpx; height: 208rpx; pointer-events: none; }
.archive-content { position: relative; z-index: 1; }
.archive-title { display: block; color: #554031; font-size: 33rpx; font-weight: 600; line-height: 1.45; }
.archive-subtitle { display: block; max-width: 64%; margin-top: 12rpx; color: #a18b79; font-size: 24rpx; line-height: 1.55; }
.profile-button { display: flex; box-sizing: border-box; width: 260rpx; height: 72rpx; align-items: center; justify-content: center; gap: 16rpx; margin: 20rpx 0 0; padding: 0 12rpx; border: 0; border-radius: 40rpx; background: #e47d74; color: #fffaf5; font-size: 28rpx; font-weight: 500; line-height: 1.3; }
.profile-button::after { border: 0; }
.profile-button:active { opacity: .85; }
.archive-note { display: block; margin-top: 14rpx; color: #a38b79; font-size: 22rpx; line-height: 1.5; }
.has-profile { min-height: 328rpx; }
.has-profile .archive-emblem { top: 60rpx; }
.days-line { display: flex; align-items: baseline; gap: 8rpx; margin-top: 12rpx; }
.days-label, .days-unit { color: #9c8472; font-size: 22rpx; }
.days-number { max-width: 210rpx; overflow: hidden; color: #d87973; font-family: Georgia, 'Times New Roman', serif; font-size: 48rpx; line-height: 1.1; }
.has-profile .archive-subtitle { margin-top: 8rpx; font-size: 21rpx; }
.partner-name { display: block; max-width: 62%; margin-top: 6rpx; overflow: hidden; color: #9e8777; font-size: 21rpx; line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }
.settings-list { margin-top: 26rpx; }
.menu-row { display: flex; min-height: 132rpx; align-items: center; gap: 18rpx; border-bottom: 1rpx solid #f0e6dc; }
.menu-group:last-child .menu-row:last-child { border-bottom: 0; }
.menu-row-pressed { opacity: .65; }
.menu-icon { display: flex; width: 58rpx; flex: 0 0 58rpx; align-items: center; justify-content: center; }
.menu-label { color: #634d3d; font-size: 28rpx; white-space: nowrap; }
.menu-caption { margin-left: auto; color: #aa9483; font-size: 21rpx; text-align: right; }
.row-arrow { flex-shrink: 0; }
.menu-label + .row-arrow { margin-left: auto; }
.page-signature { position: relative; display: flex; min-height: 176rpx; align-items: center; justify-content: center; margin: 0 -34rpx; overflow: hidden; }
.signature-line { position: relative; z-index: 1; display: flex; align-items: center; gap: 14rpx; }
.signature-rule { width: 36rpx; height: 1rpx; background: #dbb5a1; }
.signature-copy { color: #a58c77; font-size: 22rpx; letter-spacing: 2rpx; }
.signature-sprig { position: absolute; right: 0; bottom: 0; width: 126rpx; height: 182rpx; pointer-events: none; }
.offline-emblem { width: 270rpx; height: 166rpx; }
.guest-home { display: flex; flex-direction: column; align-items: center; padding: 56rpx 20rpx; }
.guest-heading { font-size: 32rpx; color: #5b493e; }
.guest-copy { max-width: 520rpx; margin-top: 18rpx; color: #987f70; font-size: 24rpx; line-height: 1.7; text-align: center; }
.guest-login-button { width: 420rpx; margin-top: 38rpx; border-radius: 44rpx; background: #e47c75; color: #fffaf5; font-size: 28rpx; }
.guest-login-button::after { border: 0; }
@media screen and (max-width: 350px) {
  .page-content { padding-right: 28rpx; padding-left: 28rpx; }
  .menu-row { gap: 12rpx; }
  .menu-label { font-size: 27rpx; }
  .menu-caption { font-size: 20rpx; }
  .archive-title { font-size: 32rpx; }
  .archive-subtitle { font-size: 22rpx; }
}
/* Fit the available mini-program viewport; the native tab bar owns its safe area. */
.profile-page { display: flex; height: 100vh; min-height: 0; flex-direction: column; padding-bottom: 8rpx; }
.profile-header { flex-shrink: 0; padding-bottom: 24rpx; }
.header-sprig { position: absolute; bottom: 8rpx; width: 126rpx; height: 178rpx; pointer-events: none; }
.header-sprig-left { left: -24rpx; transform: rotate(12deg); }
.header-sprig-right { right: -24rpx; transform: scaleX(-1) rotate(12deg); }
.identity { padding-top: 16rpx; }
.avatar-button { width: 148rpx; height: 148rpx; border-width: 4rpx; }
.identity-name { margin-top: 12rpx; font-size: 30rpx; }
.identity-status { margin-top: 4rpx; font-size: 21rpx; }
.page-content { display: flex; flex: 1; min-height: 0; flex-direction: column; }
.archive-card { flex-shrink: 0; min-height: 238rpx; margin-top: 22rpx; padding: 22rpx 32rpx; border-radius: 26rpx; }
.archive-title { font-size: 30rpx; }
.archive-subtitle { margin-top: 8rpx; font-size: 22rpx; }
.archive-emblem { top: 28rpx; right: 18rpx; width: 246rpx; height: 180rpx; }
.profile-button { width: 234rpx; height: 62rpx; margin-top: 50rpx; font-size: 25rpx; }
.archive-note { margin-top: 10rpx; font-size: 20rpx; }
.has-profile { min-height: 254rpx; }
.has-profile .archive-emblem { top: 34rpx; }
.days-line { margin-top: 8rpx; }
.days-number { font-size: 42rpx; }
.days-label, .days-unit { font-size: 21rpx; }
.has-profile .archive-subtitle { margin-top: 6rpx; font-size: 20rpx; }
.partner-name { margin-top: 4rpx; font-size: 20rpx; }
.settings-list { flex-shrink: 0; margin-top: 16rpx; }
.menu-row { min-height: 104rpx; }
.menu-label { font-size: 26rpx; }
.menu-caption { font-size: 20rpx; }
.page-signature { flex: 1; min-height: 70rpx; max-height: 160rpx; }
.signature-copy { font-size: 20rpx; }
.signature-sprig { right: -8rpx; width: 108rpx; height: 138rpx; max-height: 100%; }
@media screen and (max-height: 640px) {
  .profile-header { padding-bottom: 18rpx; }
  .identity { padding-top: 10rpx; }
  .avatar-button { width: 126rpx; height: 126rpx; }
  .identity-name { margin-top: 8rpx; font-size: 28rpx; }
  .identity-status { font-size: 20rpx; }
  .archive-card { margin-top: 16rpx; min-height: 216rpx; padding-top: 18rpx; padding-bottom: 18rpx; }
  .has-profile { min-height: 230rpx; }
  .archive-emblem { width: 220rpx; height: 164rpx; }
  .has-profile .archive-emblem { top: 26rpx; }
  .archive-title { font-size: 28rpx; }
  .profile-button { height: 58rpx; margin-top: 12rpx; }
  .settings-list { margin-top: 10rpx; }
  .menu-row { min-height: 92rpx; }
  .page-signature { min-height: 60rpx; }
}
</style>
