<template>
  <view class="profile-editor" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <uni-icons type="left" size="28" color="#514238" />
      </view>
      <text class="nav-title">空间资料</text>
    </view>

    <view class="intro">
      <text class="intro-title">装点属于你们的空间</text>
      <text class="intro-copy">另一半的姓名和头像将在加入空间后自动获取</text>
    </view>

    <view class="form-card">
      <view class="form-row">
        <text class="form-label">空间名称</text>
        <input
          v-model="form.spaceName"
          class="form-input"
          maxlength="20"
          placeholder="请输入空间名称"
          placeholder-class="input-placeholder"
        />
      </view>
      <view class="divider" />
      <picker mode="date" :value="form.loveStartDate" :end="today" @change="onDateChange">
        <view class="form-row">
          <text class="form-label">在一起日期</text>
          <view class="form-value-row">
            <text class="form-value" :class="{ placeholder: !form.loveStartDate }">{{ displayStartDate }}</text>
            <uni-icons type="right" size="20" color="#a99b91" />
          </view>
        </view>
      </picker>
    </view>

    <button class="save-button" :disabled="saving || loading" @tap="saveProfile">
      <LoveLoading v-if="saving" size="mini" text="" :mask="false" />
      <text>{{ saving ? '保存中…' : '保存空间资料' }}</text>
    </button>
    <text class="privacy-tip">空间成员资料均来自各自的真实登录账号</text>
    <LoveLoading :visible="loading" fullscreen text="正在读取空间资料" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { formatBusinessDate } from '@/utils/date'
import { getMyLoveProfile, saveMyLoveProfile } from '@/services/profile'

const props = withDefaults(defineProps<{ mode?: 'create' | 'edit' }>(), { mode: 'create' })
const today = formatBusinessDate(new Date())
const loading = ref(true)
const saving = ref(false)
const revision = ref(1)
const form = reactive({ spaceName: '', loveStartDate: '' })

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
const displayStartDate = computed(() => form.loveStartDate ? form.loveStartDate.replace(/-/g, '.') : '请选择日期')

onMounted(async () => {
  try {
    const profile = await getMyLoveProfile()
    if (profile) {
      form.spaceName = profile.spaceName
      form.loveStartDate = profile.loveStartDate
      revision.value = profile.revision
    }
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '空间资料读取失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

function onDateChange(event: any) {
  form.loveStartDate = event?.detail?.value || ''
}

async function saveProfile() {
  const spaceName = form.spaceName.trim()
  if (!spaceName) return uni.showToast({ title: '请输入空间名称', icon: 'none' })
  if (!form.loveStartDate) return uni.showToast({ title: '请选择在一起日期', icon: 'none' })
  if (saving.value) return
  saving.value = true
  try {
    const result = await saveMyLoveProfile({
      spaceName,
      loveStartDate: form.loveStartDate,
      revision: revision.value
    })
    revision.value = result.revision
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      if (props.mode === 'create') uni.switchTab({ url: '/pages/anniversary/index' })
      else uni.navigateBack()
    }, 500)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '保存失败，请稍后重试', icon: 'none' })
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
  box-sizing: border-box;
  min-height: 100vh;
  padding: 0 42rpx calc(env(safe-area-inset-bottom) + 42rpx);
  background: radial-gradient(circle at 84% 8%, rgba(250, 222, 211, .7), transparent 34%), linear-gradient(180deg, #fbefe7 0%, #fcf7f1 46%, #faf3eb 100%);
  color: #59493f;
}
.nav-bar { position: relative; height: calc(var(--menu-top) + var(--menu-height) + 28rpx); }
.nav-back { position: absolute; top: var(--menu-top); left: -18rpx; display: flex; width: 64rpx; height: var(--menu-height); align-items: center; justify-content: center; }
.nav-title { position: absolute; top: var(--menu-top); right: 110rpx; left: 110rpx; height: var(--menu-height); color: #504037; font-size: 36rpx; font-weight: 600; line-height: var(--menu-height); text-align: center; }
.intro { display: flex; flex-direction: column; align-items: center; padding: 72rpx 0 54rpx; }
.intro-title { color: #58463b; font-size: 34rpx; font-weight: 600; }
.intro-copy { margin-top: 15rpx; color: #9b8578; font-size: 23rpx; }
.form-card { padding: 0 30rpx; border: 1rpx solid rgba(255, 255, 255, .94); border-radius: 28rpx; background: rgba(252, 247, 241, .88); box-shadow: 0 14rpx 34rpx rgba(103, 73, 54, .09); }
.form-row { display: flex; min-height: 104rpx; align-items: center; justify-content: space-between; }
.form-label { color: #59483e; font-size: 27rpx; font-weight: 600; }
.form-input { width: 390rpx; color: #69574c; font-size: 27rpx; text-align: right; }
.input-placeholder, .placeholder { color: #b3a39a; }
.form-value-row { display: flex; align-items: center; gap: 10rpx; }
.form-value { color: #69574c; font-size: 27rpx; }
.divider { height: 1rpx; background: rgba(226, 211, 200, .7); }
.save-button { display: flex; width: 470rpx; height: 82rpx; align-items: center; justify-content: center; margin: 54rpx auto 0; border: 0; border-radius: 42rpx; background: linear-gradient(135deg, #ea817b, #da6968); color: #fff; font-size: 29rpx; line-height: 82rpx; }
.save-button::after { border: 0; }
.save-button[disabled] { opacity: .72; }
.privacy-tip { display: block; margin-top: 22rpx; color: #a18e82; font-size: 22rpx; text-align: center; }
</style>
