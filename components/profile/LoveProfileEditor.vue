<template>
  <view class="profile-editor" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <uni-icons type="left" size="28" color="#514238" />
      </view>
      <text class="nav-title">{{ isEditing ? '恋爱资料' : '建立恋爱档案' }}</text>
    </view>

    <view class="intro">
      <text class="intro-title">记录属于你们的开始</text>
      <text class="intro-copy">这些资料由你填写，保存后才会计算在一起的时长</text>
    </view>

    <view class="form-card">
      <view class="form-row">
        <text class="form-label">我的称呼</text>
        <input
          v-model="form.selfName"
          class="form-input"
          maxlength="12"
          placeholder="请输入你的称呼"
          placeholder-class="input-placeholder"
        />
      </view>
      <view class="divider" />

      <view class="form-row">
        <text class="form-label">对方称呼</text>
        <input
          v-model="form.partnerName"
          class="form-input"
          maxlength="12"
          placeholder="请输入对方称呼"
          placeholder-class="input-placeholder"
        />
      </view>
      <view class="divider" />

      <picker mode="date" :value="form.loveStartDate" :end="today" @change="onDateChange">
        <view class="form-row">
          <text class="form-label">在一起日期</text>
          <view class="form-value-row">
            <text class="form-value" :class="{ placeholder: !form.loveStartDate }">
              {{ displayStartDate }}
            </text>
            <uni-icons type="right" size="20" color="#a99b91" />
          </view>
        </view>
      </picker>
      <view class="divider" />

      <view class="avatar-row">
        <view class="avatar-copy">
          <text class="form-label">对方头像</text>
          <text class="avatar-tip">选填，之后也可以修改</text>
        </view>
        <button class="partner-avatar" open-type="chooseAvatar" @chooseavatar="onChoosePartnerAvatar">
          <image v-if="partnerAvatarPreview" :src="partnerAvatarPreview" class="partner-avatar-image" mode="aspectFill" />
          <uni-icons v-else type="camera-filled" size="26" color="#d87873" />
        </button>
      </view>
    </view>

    <button class="save-button" :disabled="saving || loading" @tap="saveProfile">
      <LoveLoading v-if="saving" size="mini" text="" :mask="false" />
      <text>{{ saving ? '保存中…' : isEditing ? '保存修改' : '建立恋爱档案' }}</text>
    </button>
    <text class="privacy-tip">资料仅用于展示你们的恋爱档案</text>

    <LoveLoading :visible="loading" fullscreen text="正在读取资料" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { formatBusinessDate } from '@/utils/date'
import {
  getMyAccountProfile,
  getMyLoveProfile,
  saveMyLoveProfile
} from '@/services/profile'

const props = withDefaults(defineProps<{ mode?: 'create' | 'edit' }>(), { mode: 'create' })

const today = formatBusinessDate(new Date())
const loading = ref(true)
const saving = ref(false)
const existingProfile = ref(false)
const partnerAvatarTempPath = ref('')
const partnerAvatarFileId = ref<string | null>(null)
const form = reactive({ selfName: '', partnerName: '', loveStartDate: '' })

const systemInfo = uni.getSystemInfoSync()
const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6
let menuTop = fallbackTop
let menuHeight = 32
try {
  const menuButton = uni.getMenuButtonBoundingClientRect()
  if (menuButton?.top && menuButton?.height) {
    menuTop = menuButton.top
    menuHeight = menuButton.height
  }
} catch {
  // 非微信环境使用回退尺寸。
}
const pageStyle = { '--menu-top': `${menuTop}px`, '--menu-height': `${menuHeight}px` }

const isEditing = computed(() => props.mode === 'edit' || existingProfile.value)
const displayStartDate = computed(() => form.loveStartDate ? form.loveStartDate.replace(/-/g, '.') : '请选择日期')
const partnerAvatarPreview = computed(() => partnerAvatarTempPath.value || partnerAvatarFileId.value || '')

onMounted(async () => {
  try {
    const [account, profile] = await Promise.all([getMyAccountProfile(), getMyLoveProfile()])
    if (profile) {
      existingProfile.value = true
      form.selfName = profile.selfName
      form.partnerName = profile.partnerName
      form.loveStartDate = profile.loveStartDate
      partnerAvatarFileId.value = profile.partnerAvatarFileId
    } else {
      form.selfName = account.nickname.slice(0, 12)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '资料读取失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
})

function onDateChange(event: any) {
  form.loveStartDate = event?.detail?.value || ''
}

function onChoosePartnerAvatar(event: any) {
  partnerAvatarTempPath.value = event?.detail?.avatarUrl || ''
}

async function uploadPartnerAvatar(): Promise<string | null> {
  if (!partnerAvatarTempPath.value) return partnerAvatarFileId.value
  const extension = partnerAvatarTempPath.value.split('.').pop()?.toLowerCase() || 'jpg'
  const result = await uniCloud.uploadFile({
    filePath: partnerAvatarTempPath.value,
    cloudPath: `partner/avatar/${Date.now()}.${extension}`
  })
  return result.fileID
}

async function saveProfile() {
  const selfName = form.selfName.trim()
  const partnerName = form.partnerName.trim()
  if (!selfName) return uni.showToast({ title: '请输入你的称呼', icon: 'none' })
  if (!partnerName) return uni.showToast({ title: '请输入对方称呼', icon: 'none' })
  if (!form.loveStartDate) return uni.showToast({ title: '请选择在一起日期', icon: 'none' })
  if (saving.value) return

  saving.value = true
  try {
    const uploadedAvatar = await uploadPartnerAvatar()
    await saveMyLoveProfile({
      selfName,
      partnerName,
      loveStartDate: form.loveStartDate,
      partnerAvatarFileId: uploadedAvatar
    })
    uni.showToast({ title: existingProfile.value ? '修改成功' : '档案已建立', icon: 'success' })
    setTimeout(() => {
      if (props.mode === 'create') {
        uni.switchTab({ url: '/pages/anniversary/index' })
      } else {
        uni.navigateBack()
      }
    }, 700)
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败，请稍后重试'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    saving.value = false
  }
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) })
}
</script>

<style scoped lang="scss">
.profile-editor {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 0 42rpx calc(env(safe-area-inset-bottom) + 42rpx);
  background:
    radial-gradient(circle at 84% 8%, rgba(250, 222, 211, 0.7), transparent 34%),
    linear-gradient(180deg, #fbefe7 0%, #fcf7f1 46%, #faf3eb 100%);
  color: #59493f;
}

.nav-bar { position: relative; height: calc(var(--menu-top) + var(--menu-height) + 28rpx); }
.nav-back { position: absolute; top: var(--menu-top); left: -18rpx; display: flex; width: 64rpx; height: var(--menu-height); align-items: center; justify-content: center; }
.nav-title { position: absolute; top: var(--menu-top); right: 110rpx; left: 110rpx; height: var(--menu-height); color: #504037; font-size: 36rpx; font-weight: 600; line-height: var(--menu-height); text-align: center; }

.intro { display: flex; flex-direction: column; align-items: center; padding: 54rpx 0 46rpx; }
.intro-title { color: #57453b; font-size: 38rpx; font-weight: 600; }
.intro-copy { margin-top: 16rpx; color: #9b8375; font-size: 24rpx; line-height: 1.5; text-align: center; }

.form-card { padding: 8rpx 34rpx; border: 1rpx solid rgba(255,255,255,.94); border-radius: 34rpx; background: rgba(252,247,241,.8); box-shadow: inset 0 2rpx 0 rgba(255,255,255,.9), 0 16rpx 38rpx rgba(98,67,45,.1); backdrop-filter: blur(22rpx); }
.form-row, .avatar-row { display: flex; min-height: 116rpx; align-items: center; justify-content: space-between; }
.form-label { color: #5a493f; font-size: 29rpx; font-weight: 600; }
.form-input { width: 360rpx; height: 64rpx; color: #66554b; font-size: 28rpx; text-align: right; }
.input-placeholder, .placeholder { color: #b1a49c; }
.form-value-row { display: flex; align-items: center; gap: 16rpx; }
.form-value { color: #66554b; font-size: 28rpx; }
.divider { height: 1rpx; background: rgba(218,206,196,.28); }
.avatar-copy { display: flex; flex-direction: column; gap: 10rpx; }
.avatar-tip { color: #a18e82; font-size: 22rpx; }
.partner-avatar { display: flex; width: 82rpx; height: 82rpx; align-items: center; justify-content: center; margin: 0; padding: 0; overflow: hidden; border: 1rpx solid rgba(223,190,176,.8); border-radius: 50%; background: #fffaf6; }
.partner-avatar::after { border: 0; }
.partner-avatar-image { width: 100%; height: 100%; }

.save-button { display: flex; width: 520rpx; height: 90rpx; align-items: center; justify-content: center; gap: 12rpx; margin: 58rpx auto 0; padding: 0; border: 0; border-radius: 46rpx; background: linear-gradient(135deg,#e9817b,#db6b6a); box-shadow: 0 12rpx 28rpx rgba(207,99,94,.22); color: #fff; font-size: 31rpx; font-weight: 500; line-height: 90rpx; }
.save-button::after { border: 0; }
.save-button[disabled] { opacity: .72; }
.privacy-tip { display: block; margin-top: 22rpx; color: #a18e82; font-size: 22rpx; text-align: center; }
</style>
