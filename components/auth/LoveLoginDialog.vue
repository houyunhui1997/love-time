<template>
  <view v-if="modelValue" class="login-mask" @tap="close">
    <view class="login-sheet" :class="{ 'short-screen': isShortScreen }" @tap.stop>
      <view class="sheet-handle" />

      <view class="dialog-heading">
        <image
          class="heading-emblem"
          src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/login/login-heart-emblem.png"
          mode="aspectFit"
        />
        <text class="dialog-title">{{ isEditing ? '编辑恋爱资料' : '完善资料' }}</text>
        <text class="dialog-subtitle">
          {{ isEditing ? '更新你的个人资料和恋爱日期' : '记录重要日子，留住恋爱时光' }}
        </text>
      </view>

      <view class="profile-fields">
        <button class="profile-field avatar-field" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <view class="field-label">
            <text>头像</text>
          </view>
          <view class="avatar-frame">
            <image v-if="avatarPreview" class="avatar-image" :src="avatarPreview" mode="aspectFill" />
            <image v-else class="avatar-placeholder-art" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/login/login-avatar-couple.png" mode="aspectFit" />
            <view class="camera-badge">
              <uni-icons type="camera-filled" size="13" color="#ffffff" />
            </view>
          </view>
        </button>
        <view class="profile-field">
          <view class="field-label">
            <uni-icons type="person-filled" size="18" color="#b29b8d" />
            <text>昵称</text>
          </view>
          <input
            v-model="nickname"
            class="nickname-input"
            type="nickname"
            maxlength="20"
            placeholder="请输入昵称"
            placeholder-class="input-placeholder"
          />
        </view>
        <picker mode="date" :value="loveStartDate" :end="today" @change="onDateChange">
          <view class="profile-field">
            <view class="field-label">
              <uni-icons type="calendar-filled" size="18" color="#b29b8d" />
              <text>在一起日期</text>
            </view>
            <view class="field-value">
              <text :class="{ placeholder: !loveStartDate }">{{ displayStartDate }}</text>
              <uni-icons type="right" size="16" color="#b2a198" />
            </view>
          </view>
        </picker>
        <view class="profile-field">
          <view class="field-label">
            <uni-icons type="heart-filled" size="18" color="#b29b8d" />
            <text>对方称呼</text>
          </view>
          <input
            v-model="partnerName"
            class="partner-input"
            maxlength="12"
            placeholder="选填"
            placeholder-class="input-placeholder"
          />
        </view>
      </view>

      <button class="login-button" :disabled="submitting || loadingData" @tap="confirmProfile">
        <LoveLoading v-if="submitting" size="mini" text="" :mask="false" />
        <text class="login-button-label" :class="{ spaced: !submitting }">
          {{ submitting ? '保存中…' : '保存' }}
        </text>
      </button>
      <text class="agreement">资料仅用于你的个人恋爱记录，可随时修改</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { formatBusinessDate } from '@/utils/date'
import {
  getMyAccountProfile,
  getMyLoveProfile,
  saveMyCompleteProfile,
  type CompleteProfileResult
} from '@/services/profile'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'success', result: CompleteProfileResult): void
}>()

const submitting = ref(false)
const loadingData = ref(false)
const nickname = ref('')
const avatarTempPath = ref('')
const existingAvatarFileId = ref('')
const loveStartDate = ref('')
const partnerName = ref('')
const isEditing = ref(false)
const today = formatBusinessDate(new Date())
const avatarPreview = computed(() => avatarTempPath.value || existingAvatarFileId.value)
const displayStartDate = computed(() => loveStartDate.value ? loveStartDate.value.replace(/-/g, '.') : '请选择')
const isShortScreen = Number(uni.getSystemInfoSync().windowHeight || 0) < 720
let tabBarHidden = false

function setTabBarHidden(hidden: boolean) {
  if (tabBarHidden === hidden) return
  tabBarHidden = hidden
  const options = { animation: false, fail: () => undefined }
  if (hidden) uni.hideTabBar(options)
  else uni.showTabBar(options)
}

watch(
  () => props.modelValue,
  visible => {
    setTabBarHidden(visible)
    if (visible) void loadForm()
  },
  { immediate: true }
)

onBeforeUnmount(() => setTabBarHidden(false))

function close() {
  if (!submitting.value) emit('update:modelValue', false)
}

function onChooseAvatar(event: any) {
  avatarTempPath.value = event?.detail?.avatarUrl || ''
}

async function uploadAvatar(): Promise<string | null> {
  if (!avatarTempPath.value) return existingAvatarFileId.value || null
  const extension = avatarTempPath.value.split('.').pop()?.toLowerCase() || 'jpg'
  const suffix = Math.random().toString(36).slice(2, 10)
  const result = await uniCloud.uploadFile({
    filePath: avatarTempPath.value,
    cloudPath: `user/avatar/${Date.now()}-${suffix}.${extension}`
  })
  return result.fileID
}

function resetForm() {
  nickname.value = ''
  avatarTempPath.value = ''
  existingAvatarFileId.value = ''
  loveStartDate.value = ''
  partnerName.value = ''
  isEditing.value = false
}

async function loadForm() {
  loadingData.value = true
  try {
    const [account, profile] = await Promise.all([getMyAccountProfile(), getMyLoveProfile()])
    nickname.value = account.nickname || ''
    existingAvatarFileId.value = account.avatarFileId || ''
    avatarTempPath.value = ''
    loveStartDate.value = profile?.loveStartDate || ''
    partnerName.value = profile?.partnerName || ''
    isEditing.value = Boolean(profile?.loveStartDate)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '资料读取失败', icon: 'none' })
  } finally {
    loadingData.value = false
  }
}

function onDateChange(event: any) {
  loveStartDate.value = event?.detail?.value || ''
}

async function confirmProfile() {
  if (!avatarPreview.value) return uni.showToast({ title: '请选择头像', icon: 'none' })
  if (!nickname.value.trim()) return uni.showToast({ title: '请输入昵称', icon: 'none' })
  if (!loveStartDate.value) return uni.showToast({ title: '请选择在一起日期', icon: 'none' })
  if (submitting.value) return

  submitting.value = true
  try {
    const avatarFileId = await uploadAvatar()
    const result = await saveMyCompleteProfile({
      nickname: nickname.value.trim(),
      avatarFileId,
      loveStartDate: loveStartDate.value,
      partnerName: partnerName.value.trim()
    })
    const successMessage = isEditing.value ? '资料已保存' : '登录成功'
    emit('success', result)
    emit('update:modelValue', false)
    resetForm()
    uni.showToast({ title: successMessage, icon: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败，请稍后重试'
    uni.showToast({ title: message, icon: 'none', duration: 2800 })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.login-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  background: rgba(61, 46, 37, 0.42);
  backdrop-filter: blur(3rpx);
  -webkit-backdrop-filter: blur(3rpx);
}

.login-sheet {
  box-sizing: border-box;
  display: flex;
  height: auto;
  max-height: calc(100vh - 120rpx);
  min-height: 0;
  width: 100%;
  flex-direction: column;
  padding: 10rpx 40rpx calc(env(safe-area-inset-bottom) + 22rpx);
  border: 2rpx solid rgba(232, 213, 199, 0.92);
  border-bottom: 0;
  border-radius: 40rpx 40rpx 0 0;
  background-color: #fcf7f1;
  background-image:
    radial-gradient(circle at 50% 3%, rgba(255, 255, 255, 0.82), transparent 40%),
    url('https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/slices/archive-paper-texture-tile.png');
  background-position: center top, left top;
  background-repeat: no-repeat, repeat;
  background-size: 100% 100%, 256rpx 256rpx;
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.95),
    0 -22rpx 60rpx rgba(73, 52, 38, 0.18);
}

.login-sheet.short-screen {
  max-height: calc(100vh - 48rpx);
}

.sheet-handle {
  width: 58rpx;
  height: 6rpx;
  margin: 0 auto 16rpx;
  border-radius: 4rpx;
  background: #ddd0c4;
}

.dialog-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.heading-emblem {
  width: 176rpx;
  height: 96rpx;
}

.dialog-title {
  margin-top: -4rpx;
  color: #554238;
  font-size: 34rpx;
  font-weight: 600;
  line-height: 1.35;
}

.dialog-subtitle {
  margin-top: 8rpx;
  color: #9a8376;
  font-size: 22rpx;
  line-height: 1.4;
}

.avatar-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 50%;
}

.avatar-placeholder-art {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.camera-badge {
  position: absolute;
  right: -4rpx;
  bottom: 2rpx;
  display: flex;
  width: 34rpx;
  height: 34rpx;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #fcf7f1;
  border-radius: 50%;
  background: #df7671;
}

.nickname-input {
  width: 300rpx;
  height: 100%;
  color: #5d4c42;
  font-size: 24rpx;
  text-align: right;
}

.input-placeholder {
  color: #b2a198;
}

.profile-fields {
  margin-top: 30rpx;
}

.profile-field {
  display: flex;
  box-sizing: border-box;
  height: 92rpx;
  align-items: center;
  justify-content: space-between;
  padding: 0 22rpx;
}

.avatar-field {
  width: 100%;
  height: 134rpx;
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #67554a;
  line-height: normal;
}

.avatar-field::after {
  border: 0;
}

.avatar-frame {
  position: relative;
  width: 92rpx;
  height: 92rpx;
  overflow: visible;
  border: 3rpx solid rgba(255, 255, 255, 0.94);
  border-radius: 50%;
  background: #fffaf5;
  box-shadow: 0 0 0 2rpx rgba(226, 184, 174, 0.58);
}

.profile-fields > .profile-field:not(:last-child),
.profile-fields > picker {
  border-bottom: 1rpx solid rgba(224, 207, 196, 0.48);
}

.field-label,
.field-value {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: #67554a;
  font-size: 24rpx;
}

.field-value { gap: 8rpx; }
.placeholder { color: #b2a198; }
.partner-input { width: 260rpx; height: 100%; color: #5d4c42; font-size: 24rpx; text-align: right; }

.login-button {
  position: relative;
  display: flex;
  width: 100%;
  height: 84rpx;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin: 30rpx 0 0;
  padding: 0;
  border: 0;
  border-radius: 42rpx;
  background: linear-gradient(135deg, #e9817b 0%, #db6b6a 100%);
  box-shadow: 0 14rpx 30rpx rgba(207, 99, 94, 0.22);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 84rpx;

  &::after {
    border: 0;
  }
}

.login-button-label.spaced {
  letter-spacing: 8rpx;
  text-indent: 8rpx;
}

.login-button[disabled] {
  opacity: 0.72;
}

.agreement {
  display: block;
  margin-top: 20rpx;
  color: #aa998f;
  font-size: 20rpx;
  line-height: 1.45;
  text-align: center;
}

.login-sheet.short-screen {
  .heading-emblem {
    width: 156rpx;
    height: 82rpx;
  }

  .dialog-title {
    font-size: 32rpx;
  }

  .profile-fields { margin-top: 22rpx; }
  .avatar-field { height: 118rpx; }
  .avatar-frame { width: 80rpx; height: 80rpx; }
  .profile-field { height: 82rpx; }

  .login-button {
    height: 78rpx;
    margin-top: 24rpx;
    line-height: 78rpx;
  }

  .agreement {
    margin-top: 16rpx;
  }
}
</style>
