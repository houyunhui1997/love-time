<template>
  <view v-if="modelValue" class="login-mask" @tap="close">
    <view class="login-sheet" :class="{ 'short-screen': isShortScreen }" @tap.stop>
      <view class="sheet-handle" />

      <view class="dialog-heading">
        <image
          class="heading-emblem"
          src="/static/login/login-heart-emblem.png"
          mode="aspectFit"
        />
        <text class="dialog-title">登录恋时光</text>
        <text class="dialog-subtitle">登录后，珍藏每一个重要日子</text>
      </view>

      <button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
        <image v-if="avatarTempPath" class="avatar-image" :src="avatarTempPath" mode="aspectFill" />
        <image v-else class="avatar-placeholder-art" src="/static/login/login-avatar-couple.png" mode="aspectFit" />
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

      <button class="login-button" :loading="submitting" :disabled="submitting" @tap="confirmLogin">
        <text class="login-button-label" :class="{ spaced: !submitting }">
          {{ submitting ? '正在登录…' : '登录' }}
        </text>
      </button>
      <text class="agreement">登录即表示你同意《用户协议》和《隐私政策》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { loginByWeixin } from '@/services/auth'
import { saveMyLoginProfile, type LoveProfile } from '@/services/profile'

type Gender = 'male' | 'female'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'success', profile: LoveProfile): void
}>()

const submitting = ref(false)
const selectedGender = ref<Gender | ''>('')
const nickname = ref('')
const avatarTempPath = ref('')
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
  visible => setTabBarHidden(visible),
  { immediate: true }
)

onBeforeUnmount(() => setTabBarHidden(false))

function close() {
  if (!submitting.value) emit('update:modelValue', false)
}

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

function resetForm() {
  selectedGender.value = ''
  nickname.value = ''
  avatarTempPath.value = ''
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
    const profile = await saveMyLoginProfile({
      gender: selectedGender.value,
      nickname: nickname.value.trim(),
      avatarFileId
    })
    emit('success', profile)
    emit('update:modelValue', false)
    resetForm()
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败，请稍后重试'
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
  height: 68vh;
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
    url('/static/profile/slices/archive-paper-texture-tile.png');
  background-position: center top, left top;
  background-repeat: no-repeat, repeat;
  background-size: 100% 100%, 256rpx 256rpx;
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.95),
    0 -22rpx 60rpx rgba(73, 52, 38, 0.18);
}

.login-sheet.short-screen {
  height: 86vh;
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

.login-button {
  position: relative;
  display: flex;
  width: 100%;
  height: 112rpx;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin: 34rpx 0 0;
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
    width: 154rpx;
    height: 154rpx;
    margin-top: 16rpx;
    margin-bottom: 22rpx;
  }

  .nickname-field {
    height: 88rpx;
  }

  .gender-title {
    margin-top: 22rpx;
  }

  .gender-option {
    height: 84rpx;
  }

  .login-button {
    height: 100rpx;
    margin-top: 26rpx;
    line-height: 100rpx;
  }

  .agreement {
    margin-top: 22rpx;
  }
}
</style>
