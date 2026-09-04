<template>
  <view class="profile-page">

    <view class="archive-card">
      <image class="archive-art" src="/static/profile/love-archive-paper-art.png" mode="aspectFill" />
      <text class="archive-heading">我们的恋爱档案</text>
      <image v-if="leftAvatar" class="portrait portrait-left" :src="leftAvatar" mode="aspectFill" />
      <image v-if="rightAvatar" class="portrait portrait-right" :src="rightAvatar" mode="aspectFill" />
      <text class="self-name">{{ leftName }}</text>
      <text class="partner-name">{{ rightName }}</text>
      <view class="days-copy">
        <text class="together-label">在一起</text>
        <view class="days-line"><text class="days-number">{{ togetherDays }}</text><text class="days-unit">天</text></view>
        <text class="start-date">始于 {{ displayStartDate }}</text>
      </view>
    </view>

    <view v-if="!isLoggedIn" class="guest-panel">
      <button class="wechat-button" @tap="openLoginPanel">
        <uni-icons type="weixin" size="26" color="#ffffff" />
        <text>微信一键登录</text>
      </button>
      <text class="guest-tip">登录后可查看恋爱资料与个人设置</text>
    </view>

    <template v-else>
      <view v-for="(group, groupIndex) in menuGroups" :key="groupIndex" class="menu-group" :class="{ secondary: groupIndex === 1 }">
        <view v-for="(item, index) in group" :key="item.label" class="menu-row" :class="{ divided: index > 0 }" @tap="placeholder(item.label)">
          <uni-icons :type="item.icon" size="27" :color="groupIndex === 0 ? '#dd7772' : '#aa8f7a'" />
          <text class="menu-label">{{ item.label }}</text>
          <uni-icons class="row-arrow" type="right" size="20" color="#b3a69c" />
        </view>
      </view>
    </template>

    <view v-if="showLoginPanel" class="dialog-mask" @tap="closeLoginPanel">
      <view class="login-dialog" @tap.stop>
        <view class="dialog-handle" />
        <text class="dialog-title">完善你的恋爱档案</text>
        <text class="dialog-subtitle">选择性别后，你的头像会出现在对应一侧</text>

        <button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <image v-if="avatarTempPath" :src="avatarTempPath" mode="aspectFill" />
          <view v-else class="avatar-placeholder">
            <uni-icons type="camera" size="28" color="#d87571" />
            <text>选择微信头像</text>
          </view>
        </button>

        <input v-model="nickname" class="nickname-input" type="nickname" maxlength="20" placeholder="使用微信昵称" placeholder-class="input-placeholder" />

        <view class="gender-title">选择你的性别</view>
        <view class="gender-options">
          <view class="gender-option" :class="{ selected: selectedGender === 'male' }" @tap="selectedGender = 'male'">
            <uni-icons type="person" size="25" :color="selectedGender === 'male' ? '#d96f6b' : '#9f9187'" />
            <text>男生</text>
          </view>
          <view class="gender-option" :class="{ selected: selectedGender === 'female' }" @tap="selectedGender = 'female'">
            <uni-icons type="person-filled" size="25" :color="selectedGender === 'female' ? '#d96f6b' : '#9f9187'" />
            <text>女生</text>
          </view>
        </view>

        <button class="confirm-login" :loading="submitting" :disabled="submitting" @tap="confirmLogin">
          {{ submitting ? '正在登录…' : '确认并微信登录' }}
        </button>
        <text class="agreement">登录即表示你同意《用户协议》和《隐私政策》</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { differenceInCalendarDays, formatBusinessDate } from '@/utils/date'
import { clearSession, loginByWeixin, restoreWeixinSession } from '@/services/auth'
import { getMyLoveProfile, saveMyLoginProfile, type LoveProfile } from '@/services/profile'

type Gender = 'male' | 'female'

const isLoggedIn = ref(false)
const showLoginPanel = ref(false)
const submitting = ref(false)
const selectedGender = ref<Gender | ''>('')
const nickname = ref('')
const avatarTempPath = ref('')
const profile = reactive<LoveProfile>({ selfName: '我', partnerName: 'TA', loveStartDate: '2025-03-31', selfGender: null, selfAvatarFileId: null })
const menuGroups = [
  [{ label: '恋爱资料', icon: 'contact' }, { label: '提醒设置', icon: 'notification' }, { label: '主题外观', icon: 'color' }],
  [{ label: '数据备份与恢复', icon: 'cloud-upload' }, { label: '隐私与协议', icon: 'locked' }, { label: '账号与数据', icon: 'person' }, { label: '关于恋时光', icon: 'info' }]
]
const today = formatBusinessDate(new Date())
const togetherDays = computed(() => Math.max(0, differenceInCalendarDays(today, profile.loveStartDate)))
const displayStartDate = computed(() => profile.loveStartDate.replace(/-/g, '.'))
const leftName = computed(() => profile.selfGender === 'female' ? profile.partnerName : profile.selfName)
const rightName = computed(() => profile.selfGender === 'female' ? profile.selfName : profile.partnerName)
const leftAvatar = computed(() => profile.selfGender === 'male' ? profile.selfAvatarFileId : '')
const rightAvatar = computed(() => profile.selfGender === 'female' ? profile.selfAvatarFileId : '')

onShow(async () => {
  const shouldOpenLoginPanel = Boolean(uni.getStorageSync('love_open_login_panel'))
  if (shouldOpenLoginPanel) uni.removeStorageSync('love_open_login_panel')

  isLoggedIn.value = await restoreWeixinSession()
  if (!isLoggedIn.value) {
    if (shouldOpenLoginPanel) showLoginPanel.value = true
    return
  }

  try {
    Object.assign(profile, await getMyLoveProfile())
  } catch (error) {
    const message = error instanceof Error ? error.message : '档案读取失败'
    if (message.includes('登录状态')) {
      clearSession()
      isLoggedIn.value = false
      return
    }
    uni.showToast({ title: message, icon: 'none' })
  }
})

function openLoginPanel() { showLoginPanel.value = true }
function closeLoginPanel() { if (!submitting.value) showLoginPanel.value = false }

function onChooseAvatar(event: any) {
  avatarTempPath.value = event?.detail?.avatarUrl || ''
}

async function uploadAvatar(uid: string): Promise<string | null> {
  if (!avatarTempPath.value) return null
  const extension = avatarTempPath.value.split('.').pop()?.toLowerCase() || 'jpg'
  const result = await uniCloud.uploadFile({
    filePath: avatarTempPath.value,
    cloudPath: `user/avatar/${uid}-${Date.now()}.${extension}`
  })
  return result.fileID
}

async function confirmLogin() {
  if (!selectedGender.value) return uni.showToast({ title: '请先选择性别', icon: 'none' })
  if (!avatarTempPath.value) return uni.showToast({ title: '请选择微信头像', icon: 'none' })
  if (!nickname.value.trim()) return uni.showToast({ title: '请输入微信昵称', icon: 'none' })
  if (submitting.value) return

  submitting.value = true
  try {
    const uid = await loginByWeixin()
    const avatarFileId = await uploadAvatar(uid)
    Object.assign(profile, await saveMyLoginProfile({ gender: selectedGender.value, nickname: nickname.value.trim(), avatarFileId }))
    isLoggedIn.value = true
    showLoginPanel.value = false
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败，请稍后重试'
    uni.showToast({ title: message, icon: 'none', duration: 2800 })
  } finally {
    submitting.value = false
  }
}

function placeholder(label: string) { uni.showToast({ title: `${label}将在后续版本开放`, icon: 'none' }) }
</script>

<style scoped lang="scss">
.profile-page { min-height: 100vh; padding: calc(env(safe-area-inset-top) + 44rpx) 46rpx calc(env(safe-area-inset-bottom) + 48rpx); background: #fcf9f5; color: #3b2b22; }
.header-row { display: flex; align-items: flex-start; }
.header-copy { display: flex; flex-direction: column; }
.eyebrow { color: #d7736f; font-size: 24rpx; font-weight: 700; letter-spacing: 7rpx; }
.page-title { margin-top: 8rpx; font-size: 52rpx; font-weight: 800; line-height: 1.12; }
.archive-card { position: relative; overflow: hidden; height: 506rpx; margin-top: 34rpx; border: 1rpx solid rgba(221,205,192,.68); border-radius: 28rpx; background: #fffaf3; box-shadow: 0 10rpx 26rpx rgba(84,59,43,.07); }
.archive-art { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .97; }
.archive-heading { position: absolute; top: 42rpx; right: 0; left: 0; z-index: 2; text-align: center; font-size: 30rpx; font-weight: 700; }
.portrait { position: absolute; top: 118rpx; z-index: 2; width: 168rpx; height: 196rpx; border: 4rpx solid rgba(255,250,242,.94); border-radius: 50%; box-shadow: 0 7rpx 18rpx rgba(87,62,45,.13); }
.portrait-left { left: 58rpx; }
.portrait-right { right: 58rpx; }
.self-name, .partner-name { position: absolute; top: 330rpx; z-index: 3; width: 150rpx; text-align: center; font-size: 25rpx; }
.self-name { left: 40rpx; }
.partner-name { right: 40rpx; }
.days-copy { position: absolute; right: 0; bottom: 48rpx; left: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; }
.together-label { font-size: 27rpx; }
.days-line { display: flex; align-items: baseline; margin-top: 2rpx; }
.days-number { color: #d97772; font-family: Georgia, 'Times New Roman', serif; font-size: 88rpx; line-height: 1; }
.days-unit { margin-left: 8rpx; font-size: 27rpx; }
.start-date { margin-top: 12rpx; color: #95887e; font-size: 24rpx; }
.guest-panel { margin-top: 42rpx; padding: 42rpx 28rpx; border: 1rpx solid rgba(223,213,205,.92); border-radius: 30rpx; background: rgba(255,255,255,.72); text-align: center; }
.wechat-button, .confirm-login { display: flex; height: 94rpx; align-items: center; justify-content: center; gap: 14rpx; border-radius: 47rpx; background: linear-gradient(135deg, #df7d78, #d86e69); box-shadow: 0 16rpx 34rpx rgba(216,110,105,.2); color: #fff; font-size: 30rpx; font-weight: 600; }
.guest-tip { display: block; margin-top: 22rpx; color: #aa9a8f; font-size: 23rpx; }
.menu-group { margin-top: 38rpx; padding: 0 28rpx; border: 1rpx solid rgba(223,213,205,.82); border-radius: 28rpx; background: rgba(255,255,255,.72); }
.menu-group + .menu-group { margin-top: 24rpx; }
.menu-row { position: relative; display: flex; height: 100rpx; align-items: center; }
.menu-group.secondary .menu-row { height: 96rpx; }
.menu-row.divided::before { position: absolute; top: 0; right: 0; left: 0; height: 1rpx; background: #eae2dc; content: ''; }
.menu-label { margin-left: 30rpx; font-size: 29rpx; }
.row-arrow { margin-left: auto; }
.dialog-mask { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; background: rgba(58,42,33,.34); }
.login-dialog { width: 100%; padding: 18rpx 48rpx calc(env(safe-area-inset-bottom) + 40rpx); border-radius: 38rpx 38rpx 0 0; background: #fffaf5; box-shadow: 0 -18rpx 54rpx rgba(65,44,31,.16); }
.dialog-handle { width: 70rpx; height: 7rpx; margin: 0 auto 28rpx; border-radius: 4rpx; background: #dfd5cc; }
.dialog-title, .dialog-subtitle { display: block; text-align: center; }
.dialog-title { font-size: 36rpx; font-weight: 700; }
.dialog-subtitle { margin-top: 12rpx; color: #9d8f84; font-size: 23rpx; }
.avatar-picker { display: flex; width: 150rpx; height: 150rpx; align-items: center; justify-content: center; margin: 34rpx auto 28rpx; padding: 0; overflow: hidden; border: 2rpx dashed #e5b1aa; border-radius: 50%; background: #fff; }
.avatar-picker image { width: 100%; height: 100%; }
.avatar-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8rpx; color: #b39386; font-size: 20rpx; }
.nickname-input { height: 88rpx; padding: 0 28rpx; border: 1rpx solid #e7ddd5; border-radius: 20rpx; background: #fff; font-size: 28rpx; }
.input-placeholder { color: #b6aaa1; }
.gender-title { margin: 30rpx 0 18rpx; font-size: 26rpx; font-weight: 600; }
.gender-options { display: flex; gap: 20rpx; }
.gender-option { display: flex; flex: 1; height: 88rpx; align-items: center; justify-content: center; gap: 10rpx; border: 1rpx solid #e7ddd5; border-radius: 20rpx; background: #fff; color: #75685f; font-size: 24rpx; }
.gender-option.selected { border-color: #dd7772; background: #fff2ef; color: #d96f6b; }
.confirm-login { width: 100%; margin-top: 34rpx; }
.confirm-login[disabled] { opacity: .7; }
.agreement { display: block; margin-top: 22rpx; color: #b0a298; font-size: 21rpx; text-align: center; }
</style>
