<template>
  <view class="profile-page" :style="pageStyle">
    <view class="page-header">
      <text class="page-title">我的</text>
      <text class="eyebrow">LOVE TIME</text>
    </view>

    <view v-if="isLoggedIn" class="identity-card">
      <image v-if="accountAvatar" class="account-avatar" :src="accountAvatar" mode="aspectFill" />
      <view v-else class="account-avatar avatar-fallback">
        <uni-icons type="person-filled" size="30" color="#d77873" />
      </view>
      <view class="identity-copy">
        <text class="identity-name">{{ accountName }}</text>
        <text class="identity-status">已安全连接 · 数据保存至服务器</text>
      </view>
      <view class="identity-badge">
        <uni-icons type="heart-filled" size="16" color="#d87974" />
      </view>
    </view>

    <view v-if="isLoggedIn && profile" class="archive-card" @tap="openProfileDialog">
      <image class="archive-art" src="/static/profile/love-archive-clean.jpg" mode="aspectFill" />
      <text class="archive-heading">我们的恋爱档案</text>
      <text class="self-name">{{ accountName }}</text>
      <text v-if="profile.partnerName" class="partner-name">{{ profile.partnerName }}</text>
      <view class="days-copy">
        <text class="together-label">在一起</text>
        <view class="days-line">
          <text class="days-number">{{ togetherDays }}</text>
          <text class="days-unit">天</text>
        </view>
        <text class="start-date">始于 {{ displayStartDate }}</text>
      </view>
    </view>

    <view v-else-if="isLoggedIn" class="profile-incomplete-card">
      <text class="profile-incomplete-title">恋爱资料可以以后再填</text>
      <text class="profile-incomplete-copy">补充头像、昵称、性别和在一起日期；对方称呼选填，不完善也不影响记录。</text>
      <button class="profile-incomplete-button" @tap="openProfileDialog">完善恋爱资料</button>
    </view>

    <view v-else class="guest-home">
      <image
        class="guest-hero-art"
        src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/home/empty-hero-memory-book.png"
        mode="aspectFit"
      />
      <text class="guest-heading">暂时无法连接服务</text>
      <text class="guest-copy">请检查网络后重试，你的记录都会保存在服务器</text>
      <button class="guest-login-button" @tap="loadProfilePage">
        <text>重新连接</text>
      </button>
    </view>

    <template v-if="isLoggedIn">
      <view v-for="(group, groupIndex) in menuGroups" :key="groupIndex" class="menu-group">
        <view
          v-for="(item, index) in group"
          :key="item.label"
          class="menu-row"
          :class="{ divided: index > 0 }"
          @tap="openMenu(item.label)"
        >
          <view class="menu-icon" :class="{ muted: groupIndex === 1 }">
            <uni-icons :type="item.icon" size="21" :color="groupIndex === 0 ? '#d77873' : '#9c897c'" />
          </view>
          <text class="menu-label">{{ item.label }}</text>
          <text v-if="item.caption" class="menu-caption">{{ item.caption }}</text>
          <uni-icons class="row-arrow" type="right" size="17" color="#b7aaa1" />
        </view>
      </view>
    </template>

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
const accountAvatar = computed(() => account.value?.avatarFileId || '')
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
  padding: 0 36rpx calc(env(safe-area-inset-bottom) + 38rpx);
  background-color: #fbf4ed;
  background-image: linear-gradient(180deg, #f5ddd5 0%, #f9ebe3 18%, #fbf4ed 46%, #fcf8f3 100%);
  color: #55433a;
}

.page-header {
  display: flex;
  box-sizing: border-box;
  height: calc(var(--menu-top) + var(--menu-height));
  align-items: center;
  gap: 14rpx;
  padding-top: var(--menu-top);
  padding-right: 210rpx;
}

.eyebrow { color: #d47a73; font-size: 17rpx; font-weight: 600; letter-spacing: 3rpx; line-height: 1; white-space: nowrap; }
.page-title { color: #4f3d34; font-size: 37rpx; font-weight: 650; line-height: var(--menu-height); white-space: nowrap; }

.identity-card {
  display: flex;
  box-sizing: border-box;
  min-height: 124rpx;
  align-items: center;
  margin-top: 24rpx;
  padding: 18rpx 24rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 26rpx;
  background: rgba(252, 247, 241, 0.9);
  box-shadow: 0 12rpx 30rpx rgba(104, 72, 54, 0.08), inset 0 1rpx 0 rgba(255, 255, 255, 0.86);
}

.account-avatar,
.avatar-fallback {
  width: 86rpx;
  height: 86rpx;
  flex: 0 0 86rpx;
  overflow: hidden;
  border: 4rpx solid #fffdf9;
  border-radius: 50%;
  box-shadow: 0 0 0 2rpx rgba(220, 123, 116, 0.32);
}

.avatar-fallback { display: flex; align-items: center; justify-content: center; background: #f8e8df; }
.identity-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; margin-left: 22rpx; }
.identity-name { overflow: hidden; color: #503d33; font-size: 30rpx; font-weight: 600; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.identity-status { margin-top: 7rpx; color: #a08a7d; font-size: 21rpx; }
.identity-badge { display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; border-radius: 50%; background: #fae9e2; }

.archive-card {
  position: relative;
  height: 386rpx;
  margin-top: 22rpx;
  overflow: hidden;
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 28rpx;
  background: #fcf7f1;
  box-shadow: 0 14rpx 34rpx rgba(103, 73, 54, 0.09), inset 0 1rpx 0 rgba(255, 255, 255, 0.9);
}

.archive-art { position: absolute; inset: 0; width: 100%; height: 100%; }
.archive-heading { position: absolute; top: 28rpx; right: 0; left: 0; z-index: 2; color: #4d3b31; font-size: 27rpx; font-weight: 600; text-align: center; }
.self-name,
.partner-name { position: absolute; top: 254rpx; z-index: 2; width: 150rpx; color: #6f5a4d; font-size: 22rpx; text-align: center; }
.self-name { left: 26rpx; }
.partner-name { right: 26rpx; }
.days-copy { position: absolute; right: 0; bottom: 24rpx; left: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; }
.together-label { font-size: 21rpx; }
.days-line { display: flex; align-items: baseline; margin-top: 2rpx; }
.days-number { color: #d77873; font-family: Georgia, 'Times New Roman', serif; font-size: 62rpx; line-height: 0.92; }
.days-unit { margin-left: 6rpx; font-size: 22rpx; }
.start-date { margin-top: 9rpx; color: #95857a; font-size: 20rpx; }

.profile-incomplete-card { margin-top: 24rpx; padding: 38rpx 30rpx; border: 1rpx solid rgba(255, 255, 255, 0.9); border-radius: 28rpx; background: rgba(252, 247, 241, 0.9); box-shadow: 0 12rpx 30rpx rgba(103, 73, 54, 0.08); text-align: center; }
.profile-incomplete-title { display: block; color: #554238; font-size: 30rpx; font-weight: 600; }
.profile-incomplete-copy { display: block; margin-top: 12rpx; color: #99877c; font-size: 22rpx; line-height: 1.55; }
.profile-incomplete-button { display: flex; width: 330rpx; height: 72rpx; align-items: center; justify-content: center; margin: 26rpx auto 0; padding: 0; border: 0; border-radius: 36rpx; background: #df7772; color: #fff; font-size: 26rpx; line-height: 72rpx; }
.profile-incomplete-button::after { border: 0; }

/* 服务连接失败状态（与首页一致） */
.guest-home {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 30rpx;
}

.guest-hero-art { width: 510rpx; height: 442rpx; }

.guest-heading {
  display: block;
  margin-top: 14rpx;
  color: #5b493e;
  font-size: 34rpx;
  font-weight: 500;
  line-height: 1.45;
  text-align: center;
}

.guest-copy {
  display: block;
  max-width: 520rpx;
  margin-top: 18rpx;
  color: #987f70;
  font-size: 24rpx;
  line-height: 1.55;
  text-align: center;
}

.guest-login-button {
  display: flex;
  width: 440rpx;
  height: 86rpx;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  margin-top: 38rpx;
  padding: 0;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #ea817b 0%, #da6968 100%);
  box-shadow: 0 12rpx 28rpx rgba(207, 100, 96, 0.22);
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
  line-height: 86rpx;

  &::after { border: 0; }
}

.menu-group { margin-top: 26rpx; padding: 0 24rpx; border: 1rpx solid rgba(255, 255, 255, 0.9); border-radius: 26rpx; background: rgba(252, 247, 241, 0.9); box-shadow: 0 10rpx 28rpx rgba(103, 73, 54, 0.07), inset 0 1rpx 0 rgba(255, 255, 255, 0.88); }
.menu-group + .menu-group { margin-top: 18rpx; }
.menu-row { position: relative; display: flex; height: 84rpx; align-items: center; }
.menu-row.divided::before { position: absolute; top: 0; right: 0; left: 66rpx; height: 1rpx; background: rgba(229, 218, 209, 0.72); content: ''; }
.menu-icon { display: flex; width: 48rpx; height: 48rpx; flex: 0 0 48rpx; align-items: center; justify-content: center; border-radius: 15rpx; background: #fae9e2; }
.menu-icon.muted { background: #f2ebe5; }
.menu-label { margin-left: 18rpx; color: #5b493f; font-size: 25rpx; }
.menu-caption { margin-left: auto; color: #ad9d93; font-size: 20rpx; }
.row-arrow { margin-left: 10rpx; }

@media screen and (max-height: 720px) {
  .identity-card { min-height: 108rpx; margin-top: 12rpx; padding-top: 12rpx; padding-bottom: 12rpx; }
  .account-avatar, .avatar-fallback { width: 76rpx; height: 76rpx; flex-basis: 76rpx; }
  .archive-card { height: 346rpx; margin-top: 18rpx; }
  .self-name, .partner-name { top: 224rpx; }
  .guest-home { padding-top: 6rpx; }
  .guest-hero-art { width: 400rpx; height: 347rpx; }
  .guest-heading { margin-top: 8rpx; font-size: 31rpx; }
  .guest-login-button { width: 414rpx; height: 80rpx; margin-top: 26rpx; font-size: 28rpx; line-height: 80rpx; }
  .menu-group { margin-top: 18rpx; }
  .menu-row { height: 78rpx; }
}
</style>
