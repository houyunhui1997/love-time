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
        <text class="dialog-title">完善恋爱资料</text>
        <text class="dialog-subtitle">一次填写，开始珍藏每一个重要日子</text>
      </view>

      <button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
        <image v-if="avatarPreview" class="avatar-image" :src="avatarPreview" mode="aspectFill" />
        <image v-else class="avatar-placeholder-art" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/login/login-avatar-couple.png" mode="aspectFit" />
        <view class="camera-badge">
          <uni-icons type="camera-filled" size="17" color="#ffffff" />
        </view>
      </button>

      <view class="nickname-field">
        <uni-icons type="person-filled" size="21" color="#b29b8d" />
        <input
          v-model="nickname"
          class="nickname-input"
          type="nickname"
          maxlength="20"
          placeholder="使用微信昵称"
          placeholder-class="input-placeholder"
        />
      </view>

      <text class="gender-title">选择你的性别</text>
      <view class="gender-options">
        <view
          class="gender-option"
          :class="{ selected: selectedGender === 'male' }"
          @tap="selectedGender = 'male'"
        >
          <uni-icons type="person" size="24" :color="selectedGender === 'male' ? '#d96f6b' : '#9f9187'" />
          <text>男生</text>
        </view>
        <view
          class="gender-option"
          :class="{ selected: selectedGender === 'female' }"
          @tap="selectedGender = 'female'"
        >
          <uni-icons type="person-filled" size="24" :color="selectedGender === 'female' ? '#d96f6b' : '#9f9187'" />
          <text>女生</text>
        </view>
      </view>

      <view class="profile-fields">
        <picker mode="date" :value="loveStartDate" :end="today" @change="onDateChange">
          <view class="profile-field">
            <view class="field-label">
              <uni-icons type="calendar-filled" size="20" color="#b29b8d" />
              <text>在一起日期</text>
            </view>
            <view class="field-value">
              <text :class="{ placeholder: !loveStartDate }">{{ displayStartDate }}</text>
              <uni-icons type="right" size="18" color="#b2a198" />
            </view>
          </view>
        </picker>
        <view class="profile-field">
          <view class="field-label">
            <uni-icons type="heart-filled" size="20" color="#b29b8d" />
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
          {{ submitting ? '保存中…' : '完成' }}
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

type Gender = 'male' | 'female'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'success', result: CompleteProfileResult): void
}>()

const submitting = ref(false)
const loadingData = ref(false)
const selectedGender = ref<Gender | ''>('')
const nickname = ref('')
const avatarTempPath = ref('')
const existingAvatarFileId = ref('')
const loveStartDate = ref('')
const partnerName = ref('')
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
  selectedGender.value = ''
  nickname.value = ''
  avatarTempPath.value = ''
  existingAvatarFileId.value = ''
  loveStartDate.value = ''
  partnerName.value = ''
}

async function loadForm() {
  loadingData.value = true
  try {
    const [account, profile] = await Promise.all([getMyAccountProfile(), getMyLoveProfile()])
    selectedGender.value = account.gender || ''
    nickname.value = account.nickname || ''
    existingAvatarFileId.value = account.avatarFileId || ''
    avatarTempPath.value = ''
    loveStartDate.value = profile?.loveStartDate || ''
    partnerName.value = profile?.partnerName || ''
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
  if (!selectedGender.value) return uni.showToast({ title: '请先选择性别', icon: 'none' })
  if (!avatarPreview.value) return uni.showToast({ title: '请选择微信头像', icon: 'none' })
  if (!nickname.value.trim()) return uni.showToast({ title: '请输入微信昵称', icon: 'none' })
  if (!loveStartDate.value) return uni.showToast({ title: '请选择在一起日期', icon: 'none' })
  if (submitting.value) return

  submitting.value = true
  try {
    const avatarFileId = await uploadAvatar()
    const result = await saveMyCompleteProfile({
      gender: selectedGender.value,
      nickname: nickname.value.trim(),
      avatarFileId,
      loveStartDate: loveStartDate.value,
      partnerName: partnerName.value.trim()
    })
    emit('success', result)
    emit('update:modelValue', false)
    resetForm()
    uni.showToast({ title: '资料已保存', icon: 'success' })
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
  height: 88vh;
  min-height: 0;
  width: 100%;
  flex-direction: column;
  padding: 14rpx 46rpx calc(env(safe-area-inset-bottom) + 30rpx);
  border: 2rpx solid rgba(232, 213, 199, 0.92);
  border-bottom: 0;
  border-radius: 56rpx 56rpx 0 0;
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
  height: 94vh;
}

.sheet-handle {
  width: 70rpx;
  height: 7rpx;
  margin: 0 auto 14rpx;
  border-radius: 4rpx;
  background: #ddd0c4;
}

.dialog-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.heading-emblem {
  width: 230rpx;
  height: 132rpx;
}

.dialog-title {
  margin-top: -8rpx;
  color: #554238;
  font-size: 42rpx;
  font-weight: 600;
  line-height: 1.35;
}

.dialog-subtitle {
  margin-top: 6rpx;
  color: #9a8376;
  font-size: 25rpx;
  line-height: 1.4;
}

.avatar-picker {
  position: relative;
  display: flex;
  width: 176rpx;
  height: 176rpx;
  align-items: center;
  justify-content: center;
  margin: 22rpx auto 28rpx;
  padding: 0;
  overflow: visible;
  border: 3rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  background: rgba(255, 253, 250, 0.92);
  box-shadow:
    0 0 0 2rpx rgba(226, 184, 174, 0.72),
    0 10rpx 24rpx rgba(115, 82, 61, 0.1);

  &::after {
    border: 0;
  }
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
  width: 48rpx;
  height: 48rpx;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #fcf7f1;
  border-radius: 50%;
  background: #df7671;
}

.nickname-field {
  display: flex;
  box-sizing: border-box;
  height: 96rpx;
  align-items: center;
  gap: 16rpx;
  padding: 0 26rpx;
  border: 1rpx solid rgba(218, 197, 183, 0.76);
  border-radius: 22rpx;
  background: rgba(255, 253, 250, 0.84);
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.9),
    0 6rpx 18rpx rgba(104, 75, 56, 0.04);
}

.nickname-input {
  flex: 1;
  height: 100%;
  color: #5d4c42;
  font-size: 28rpx;
}

.input-placeholder {
  color: #b2a198;
}

.gender-title {
  display: block;
  margin: 28rpx 0 16rpx;
  color: #604d42;
  font-size: 27rpx;
  font-weight: 600;
}

.gender-options {
  display: flex;
  gap: 18rpx;
}

.gender-option {
  display: flex;
  flex: 1;
  height: 92rpx;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border: 1rpx solid rgba(218, 197, 183, 0.76);
  border-radius: 21rpx;
  background: rgba(255, 253, 250, 0.84);
  color: #78685f;
  font-size: 26rpx;
}

.gender-option.selected {
  border-color: #df7772;
  background: rgba(255, 239, 235, 0.9);
  color: #d96f6b;
  box-shadow: inset 0 0 0 1rpx rgba(223, 119, 114, 0.14);
}

.profile-fields {
  margin-top: 22rpx;
  overflow: hidden;
  border: 1rpx solid rgba(218, 197, 183, 0.76);
  border-radius: 22rpx;
  background: rgba(255, 253, 250, 0.84);
}

.profile-field {
  display: flex;
  box-sizing: border-box;
  height: 88rpx;
  align-items: center;
  justify-content: space-between;
  padding: 0 26rpx;
}

.profile-fields > .profile-field {
  border-top: 1rpx solid rgba(224, 207, 196, 0.68);
}

.field-label,
.field-value {
  display: flex;
  align-items: center;
  gap: 14rpx;
  color: #67554a;
  font-size: 26rpx;
}

.field-value { gap: 8rpx; }
.placeholder { color: #b2a198; }
.partner-input { width: 260rpx; height: 100%; color: #5d4c42; font-size: 26rpx; text-align: right; }

.login-button {
  position: relative;
  display: flex;
  width: 100%;
  height: 112rpx;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin: 24rpx 0 0;
  padding: 0;
  border: 0;
  border-radius: 56rpx;
  background: linear-gradient(135deg, #e9817b 0%, #db6b6a 100%);
  box-shadow: 0 14rpx 30rpx rgba(207, 99, 94, 0.22);
  color: #ffffff;
  font-size: 33rpx;
  font-weight: 600;
  line-height: 112rpx;

  &::after {
    border: 0;
  }
}

.login-button-label.spaced {
  letter-spacing: 24rpx;
  text-indent: 24rpx;
}

.login-button[disabled] {
  opacity: 0.72;
}

.agreement {
  display: block;
  margin-top: 30rpx;
  color: #aa998f;
  font-size: 21rpx;
  line-height: 1.45;
  text-align: center;
}

.login-sheet.short-screen {
  .heading-emblem {
    width: 206rpx;
    height: 116rpx;
  }

  .dialog-title {
    font-size: 38rpx;
  }

  .avatar-picker {
    width: 136rpx;
    height: 136rpx;
    margin-top: 10rpx;
    margin-bottom: 16rpx;
  }

  .nickname-field {
    height: 88rpx;
  }

  .gender-title {
    margin-top: 16rpx;
  }

  .gender-option {
    height: 76rpx;
  }

  .profile-fields { margin-top: 16rpx; }
  .profile-field { height: 78rpx; }

  .login-button {
    height: 100rpx;
    margin-top: 18rpx;
    line-height: 100rpx;
  }

  .agreement {
    margin-top: 14rpx;
  }
}
</style>
