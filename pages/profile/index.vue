<template>
  <view class="profile-page" :style="pageStyle">
    <view class="profile-header">
      <image class="header-sprig header-sprig-left" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/companion/botanical-sprig.png" mode="aspectFit" />
      <image class="header-sprig header-sprig-right" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/companion/botanical-sprig.png" mode="aspectFit" />
      <view class="page-header">
        <!-- <text class="page-title">我的</text>
        <text class="eyebrow">LOVE TIME</text> -->
      </view>
      <view v-if="isLoggedIn" class="identity">
        <view class="identity-row">
          <view class="identity-col">
            <button class="avatar-button" aria-label="编辑头像和昵称" @tap="openProfileDialog">
              <image class="account-avatar" :src="accountAvatar" mode="aspectFill" @error="avatarFailed = true" />
            </button>
            <text class="identity-name">{{ accountName }}</text>
            <text class="identity-status"></text>
          </view>

          <view class="identity-link"><uni-icons type="heart-filled" size="22" color="#e8a49b" /></view>

          <view class="identity-col">
            <!-- 已绑定：无论是邀请方还是加入方，都展示唯一的另一半 -->
            <button v-if="spacePartner" class="avatar-button" aria-label="查看情侣空间" @tap="openCoupleSpace">
              <image class="account-avatar" :src="partnerAvatar" mode="aspectFill" />
            </button>
            <!-- 未绑定：允许邀请一位成员 -->
            <button v-else class="avatar-invite" open-type="share" data-share="invite" aria-label="邀请另一半加入">
              <uni-icons type="personadd-filled" size="34" color="#d87973" />
            </button>
            <text class="identity-name">{{ spacePartner ? spacePartner.nickname : '邀请另一半' }}</text>
            <!-- <text class="identity-status">{{ spacePartner ? partnerRoleLabel : '点击头像邀请' }}</text> -->
          </view>
        </view>
      </view>
      <view v-else class="identity identity-offline">
        <image class="offline-emblem" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/companion/heart-emblem.png" mode="aspectFit" />
        <text class="identity-name">恋时光</text>
      </view>
    </view>

    <view class="page-content">
      <template v-if="isLoggedIn">
        <!-- 「我的空间」切换卡已移除：功能与「情侣空间」页一致，切换入口保留在 pages/couple/index。
        <view v-if="spaceOverview" class="space-switcher">
          <view class="space-heading">
            <view>
              <text class="space-kicker">当前空间</text>
              <text class="space-title">{{ currentSpaceName }}</text>
            </view>
            <view class="space-manage" @tap="openMenu('情侣空间')">管理</view>
          </view>
          <view v-if="spaceOverview.joinedOwner" class="space-options">
            <view class="space-option" :class="{ active: !isForeignSpace }" @tap="switchSpace(spaceOverview.owner.uid)">我的空间</view>
            <view class="space-option" :class="{ active: isForeignSpace }" @tap="switchSpace(spaceOverview.joinedOwner.uid)">{{ spaceOverview.joinedOwner.nickname }}的空间</view>
          </view>
          <text v-if="isForeignSpace" class="space-tip">你正在管理对方的记录，新增和修改都会保存在这个空间</text>
        </view>
        -->
        <view class="archive-card" :class="{ 'has-profile': profile }">
          <image class="archive-emblem" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/companion/heart-emblem.png" mode="aspectFit" />
          <view class="archive-content">
            <text class="archive-title">我们的恋爱档案</text>
            <template v-if="profile">
              <view class="days-line"><text class="days-label">已经相伴</text><text class="days-number">{{ togetherDays }}</text><text class="days-unit">天</text></view>
              <text class="archive-subtitle">始于 {{ displayStartDate }}</text>
            </template>
            <button v-if="!profile" class="profile-button" @tap="openCoupleSpace">
              <text>完善资料</text>
              <uni-icons type="right" size="18" color="#fffaf5" />
            </button>
          </view>
        </view>

        <view class="settings-list">
          <view v-for="(group, groupIndex) in menuGroups" :key="groupIndex" class="menu-group">
            <template v-for="item in group" :key="item.label">
              <button
                v-if="item.share"
                class="menu-row menu-share-button"
                open-type="share"
                hover-class="menu-row-pressed"
              >
                <view class="menu-icon"><uni-icons :type="item.icon" size="27" color="#df8176" /></view>
                <text class="menu-label">{{ item.label }}</text>
                <text v-if="item.caption" class="menu-caption">{{ item.caption }}</text>
                <uni-icons class="row-arrow" type="right" size="19" color="#ae9788" />
              </button>
              <view v-else class="menu-row" hover-class="menu-row-pressed" @tap="openMenu(item.label)">
                <view class="menu-icon"><uni-icons :type="item.icon" size="27" color="#df8176" /></view>
                <text class="menu-label">{{ item.label }}</text>
                <text v-if="item.caption" class="menu-caption">{{ item.caption }}</text>
                <uni-icons class="row-arrow" type="right" size="19" color="#ae9788" />
              </view>
            </template>
          </view>
        </view>

        <view class="page-signature">
          <view class="signature-line"><view class="signature-rule" /><text class="signature-copy">慢慢记录，长长相伴</text><view class="signature-rule" /></view>
          <!-- <image class="signature-sprig" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/companion/botanical-sprig.png" mode="aspectFit" /> -->
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
import { onShareAppMessage, onShow } from '@dcloudio/uni-app'
import LoveLoginDialog from '@/components/auth/LoveLoginDialog.vue'
import { differenceInCalendarDays, formatBusinessDate } from '@/utils/date'
import { restoreWeixinSession } from '@/services/auth'
import { getSpaceOverview, type SpaceOverview } from '@/services/space'
import {
  getMyAccountProfile,
  getMyLoveProfile,
  type AccountProfile,
  type LoveProfile
} from '@/services/profile'

const isLoggedIn = ref(false)
const showProfileDialog = ref(false)
const account = ref<AccountProfile | null>(null)
const profile = ref<LoveProfile | null>(null)
const spaceOverview = ref<SpaceOverview | null>(null)

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
  share?: boolean
}

const menuGroups: MenuItem[][] = [
  [
    { label: '情侣空间', icon: 'staff', caption: '绑定关系与恋爱资料' },
    { label: '通知消息管理', icon: 'notification', caption: '纪念日订阅提醒' },
    { label: '分享恋时光', icon: 'redo', caption: '把这份爱分享给更多人', share: true }
  ],
  [
    { label: '隐私与协议', icon: 'locked' }
  ]
]

const routeByMenu: Record<string, string> = {
  通知消息管理: '/pages/settings/reminder',
  情侣空间: '/pages/couple/index',
  隐私与协议: '/pages/settings/privacy',
  关于恋时光: '/pages/settings/about'
}

const today = formatBusinessDate(new Date())
const accountName = computed(() => account.value?.nickname || '恋时光用户')
const avatarFailed = ref(false)
const fallbackAvatar = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/companion/default-avatar.png'
const accountAvatar = computed(() => !avatarFailed.value && account.value?.avatarFileId || fallbackAvatar)
// 一对一关系的另一半：邀请方看到成员，加入方看到空间所有者。
const spacePartner = computed(() => spaceOverview.value?.member || spaceOverview.value?.joinedOwner || null)
const partnerRoleLabel = computed(() => spaceOverview.value?.joinedOwner ? '空间所有者' : '空间成员')
const partnerAvatar = computed(() => spacePartner.value?.avatarFileId || fallbackAvatar)
const togetherDays = computed(() => profile.value ? Math.max(0, differenceInCalendarDays(today, profile.value.loveStartDate)) : 0)
const displayStartDate = computed(() => profile.value?.loveStartDate.replace(/-/g, '.') || '')

onShow(loadProfilePage)

// 分享：默认分享小程序；若通过邀请按钮触发（shareType=invite），分享空间邀请链接（与情侣空间页一致）
onShareAppMessage((params) => {
  const isInvite = params?.target?.dataset?.share === 'invite'
  if (isInvite && spaceOverview.value && !spacePartner.value) {
    return {
      title: `${spaceOverview.value.owner.nickname || '我'}邀请你加入情侣空间`,
      path: `/pages/couple/join?code=${encodeURIComponent(spaceOverview.value.inviteCode)}`
    }
  }
  return {
    title: '恋时光 · 记录爱，纪念每一个值得的日子',
    path: '/pages/anniversary/index',
    imageUrl: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/official-account-cover.jpg'
  }
})

function openCoupleSpace() {
  uni.navigateTo({ url: '/pages/couple/index' })
}

async function loadProfilePage() {
  isLoggedIn.value = await restoreWeixinSession()
  if (!isLoggedIn.value) {
    account.value = null
    profile.value = null
    spaceOverview.value = null
    return
  }

  try {
    spaceOverview.value = await getSpaceOverview()
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

function onProfileSaved(result: AccountProfile) {
  avatarFailed.value = false
  account.value = result
}

function openMenu(label: string) {
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
  background: #fcf7f1 url('https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/companion/paper-texture.jpg') repeat;
  background-size: 256rpx 256rpx;
}
.profile-header { position: relative; overflow: hidden; padding-bottom: 38rpx; border-radius: 0 0 50% 50% / 0 0 12% 12%; background: #f9e8df; }
.header-background { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.page-header { position: relative; display: flex; box-sizing: border-box; height: calc(var(--menu-top) + var(--menu-height)); align-items: center; gap: 18rpx; padding: var(--menu-top) 210rpx 0 40rpx; }
.page-title { color: #503d32; font-size: 38rpx; font-weight: 650; line-height: var(--menu-height); white-space: nowrap; }
.eyebrow { color: #d77d73; font-size: 18rpx; font-weight: 500; letter-spacing: 4rpx; white-space: nowrap; }
.identity { position: relative; display: flex; flex-direction: column; align-items: center; padding: 24rpx 36rpx 0; }
/* 顶部双头像左右分布布局 */
.identity-row { display: flex; width: 100%; max-width: 560rpx; align-items: flex-start; justify-content: space-between; }
.identity-col { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: center; }
.identity-col:first-child { margin-right: 20rpx; }
.identity-col:last-child { margin-left: 20rpx; }
.identity-link { display: flex; height: 148rpx; flex: none; align-items: center; justify-content: center; }
/* 虚线占位邀请框 */
.avatar-invite { display: flex; width: 148rpx; height: 148rpx; flex-shrink: 0; align-items: center; justify-content: center; margin: 0; padding: 0; border: 3rpx dashed #e5b9ac; border-radius: 50%; background: rgba(255, 252, 247, .6); box-shadow: 0 7rpx 16rpx rgba(124, 93, 66, .08); line-height: 1; }
.avatar-invite::after { border: 0; }
.avatar-invite:active { background: rgba(253, 236, 230, .8); }
.avatar-button { width: 208rpx; height: 208rpx; flex-shrink: 0; margin: 0; padding: 0; overflow: hidden; border: 6rpx solid #fffcf7; border-radius: 50%; background: #e2dfc6; box-shadow: 0 7rpx 16rpx rgba(124, 93, 66, .14); line-height: 1; }
.avatar-button::after { border: 0; }
.account-avatar { display: block; width: 100%; height: 100%; }
.identity-name { display: block; max-width: 80%; margin-top: 18rpx; overflow: hidden; color: #503d32; font-size: 34rpx; font-weight: 600; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.identity-status { margin-top: 8rpx; color: #a28c7c; font-size: 25rpx; line-height: 1.5; }
.page-content { padding: 0 34rpx; }
.space-switcher { margin-top: 20rpx; padding: 22rpx 26rpx; border: 1rpx solid rgba(255,255,255,.7); border-radius: 26rpx; background: rgba(255,255,255,.48); box-shadow: 0 12rpx 30rpx rgba(112,82,63,.07); backdrop-filter: blur(14rpx); }
.space-heading { display: flex; align-items: center; justify-content: space-between; }
.space-kicker, .space-title { display: block; }
.space-kicker { color: #aa8f7e; font-size: 20rpx; }
.space-title { margin-top: 4rpx; color: #5d4638; font-size: 28rpx; font-weight: 600; }
.space-manage { padding: 10rpx 20rpx; border-radius: 24rpx; background: #f8e7df; color: #cf746d; font-size: 22rpx; }
.space-options { display: flex; gap: 10rpx; margin-top: 18rpx; padding: 6rpx; border-radius: 24rpx; background: rgba(225,210,198,.42); }
.space-option { flex: 1; padding: 13rpx 10rpx; overflow: hidden; border-radius: 20rpx; color: #9b8373; font-size: 22rpx; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.space-option.active { background: rgba(255,252,248,.9); color: #cf746d; box-shadow: 0 4rpx 12rpx rgba(95,70,54,.08); }
.space-tip { display: block; margin-top: 14rpx; color: #a08170; font-size: 20rpx; line-height: 1.5; }
.archive-card { position: relative; box-sizing: border-box; min-height: 286rpx; margin-top: 28rpx; overflow: hidden; padding: 36rpx 36rpx 32rpx; border-radius: 30rpx; background: rgba(242, 231, 216, .35); }
.archive-emblem { position: absolute; top: 44rpx; right: 18rpx; width: 292rpx; height: 208rpx; pointer-events: none; }
.archive-content { position: relative; z-index: 1; }
.archive-title { display: block; color: #554031; font-size: 36rpx; font-weight: 600; line-height: 1.45; letter-spacing: 2rpx; }
.archive-subtitle { display: block; max-width: 64%; margin-top: 16rpx; color: #95806e; font-size: 26rpx; line-height: 1.6; }
.profile-button { display: flex; box-sizing: border-box; width: 260rpx; height: 72rpx; align-items: center; justify-content: center; gap: 16rpx; margin: 20rpx 0 0; padding: 0 12rpx; border: 0; border-radius: 40rpx; background: #e47d74; color: #fffaf5; font-size: 28rpx; font-weight: 500; line-height: 1.3; }
.profile-button::after { border: 0; }
.profile-button:active { opacity: .85; }
.archive-note { display: block; margin-top: 14rpx; color: #a38b79; font-size: 22rpx; line-height: 1.5; }
.has-profile { min-height: 328rpx; }
.has-profile .archive-emblem { top: 60rpx; }
.days-line { display: flex; align-items: baseline; gap: 10rpx; margin-top: 18rpx; }
.days-label, .days-unit { color: #9c8472; font-size: 25rpx; }
.days-number { max-width: 210rpx; overflow: hidden; color: #d87973; font-family: Georgia, 'Times New Roman', serif; font-size: 56rpx; line-height: 1.1; letter-spacing: 1rpx; }
.has-profile .archive-subtitle { margin-top: 16rpx; font-size: 24rpx; }
.partner-name { display: block; max-width: 62%; margin-top: 12rpx; overflow: hidden; color: #95806e; font-size: 24rpx; line-height: 1.6; text-overflow: ellipsis; white-space: nowrap; }
.settings-list { margin-top: 26rpx; }
.menu-row { display: flex; min-height: 132rpx; align-items: center; gap: 18rpx; border-bottom: 1rpx solid #f0e6dc; }
.menu-group:last-child .menu-row:last-child { border-bottom: 0; }
.menu-share-button { width: 100%; margin: 0; padding: 0; border: 0; border-bottom: 1rpx solid #f0e6dc; border-radius: 0; background: transparent; text-align: left; font-family: inherit; font-size: inherit; line-height: inherit; color: inherit; }
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
  .archive-title { font-size: 33rpx; }
  .archive-subtitle { font-size: 23rpx; }
}
/* Fit the available mini-program viewport; the native tab bar owns its safe area. */
.profile-page { display: flex; min-height: 100vh; flex-direction: column; padding-bottom: 8rpx; }
.profile-header { flex-shrink: 0; padding-bottom: 24rpx; }
.header-sprig { position: absolute; bottom: 8rpx; width: 126rpx; height: 178rpx; pointer-events: none; }
.header-sprig-left { left: -24rpx; transform: rotate(12deg); }
.header-sprig-right { right: -24rpx; transform: scaleX(-1) rotate(12deg); }
.identity { padding-top: 16rpx; }
.avatar-button { width: 148rpx; height: 148rpx; border-width: 4rpx; }
.identity-link { height: 148rpx; }
.avatar-invite { width: 148rpx; height: 148rpx; }
.identity-name { margin-top: 12rpx; font-size: 30rpx; }
.identity-status { margin-top: 4rpx; font-size: 21rpx; }
.page-content { display: flex; flex: 1; min-height: 0; flex-direction: column; }
.archive-card { flex-shrink: 0; min-height: 238rpx; margin-top: 22rpx; padding: 26rpx 32rpx 24rpx; border-radius: 26rpx; }
.archive-title { font-size: 33rpx; }
.archive-subtitle { margin-top: 12rpx; font-size: 24rpx; }
.archive-emblem { top: 28rpx; right: 18rpx; width: 246rpx; height: 180rpx; }
.profile-button { width: 234rpx; height: 62rpx; margin-top: 50rpx; font-size: 25rpx; }
.archive-note { margin-top: 10rpx; font-size: 20rpx; }
.has-profile { min-height: 254rpx; }
.has-profile .archive-emblem { top: 34rpx; }
.days-line { margin-top: 14rpx; }
.days-number { font-size: 50rpx; }
.days-label, .days-unit { font-size: 23rpx; }
.has-profile .archive-subtitle { margin-top: 12rpx; font-size: 22rpx; }
.partner-name { margin-top: 8rpx; font-size: 22rpx; }
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
  .identity-link { height: 126rpx; }
  .identity-link uni-icons { transform: scale(.86); }
  .avatar-invite { width: 126rpx; height: 126rpx; }
  .identity-name { margin-top: 8rpx; font-size: 28rpx; }
  .identity-status { font-size: 20rpx; }
  .archive-card { margin-top: 16rpx; min-height: 216rpx; padding-top: 22rpx; padding-bottom: 20rpx; }
  .has-profile { min-height: 230rpx; }
  .archive-emblem { width: 220rpx; height: 164rpx; }
  .has-profile .archive-emblem { top: 26rpx; }
  .archive-title { font-size: 30rpx; }
  .profile-button { height: 58rpx; margin-top: 12rpx; }
  .settings-list { margin-top: 10rpx; }
  .menu-row { min-height: 92rpx; }
  .page-signature { min-height: 60rpx; }
}
</style>
