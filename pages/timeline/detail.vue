<template>
  <view class="detail-page" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <uni-icons type="left" size="28" color="#514137" />
      </view>
      <text class="nav-title">时刻详情</text>
    </view>

    <scroll-view class="detail-scroll" scroll-y :show-scrollbar="false" enhanced>
      <view v-if="moment" class="detail-content">
        <view class="moment-header">
          <view class="header-copy">
            <text class="occurred-date">{{ occurredDateLabel }}</text>
            <view class="mood-summary">
              <uni-icons :type="moodOption.icon" size="23" :color="moodColor" />
              <text>{{ moodOption.label }}</text>
            </view>
          </view>
          <image class="header-quote" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/timeline/moment-quote.png" mode="aspectFit" />
          <image class="header-floral" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/timeline/blossom-sprig.png" mode="aspectFit" />
        </view>

        <view class="memory-card">
          <view class="memory-card-inner">
            <text class="moment-content">{{ moment.content }}</text>

            <view v-if="moment.images.length" class="photos-section">
              <view class="photo-grid">
                <view
                  v-for="(imageUrl, index) in moment.images"
                  :key="imageUrl + '-' + index"
                  class="photo-cell"
                  @tap="previewImage(index)"
                >
                  <image class="detail-image" :src="imageUrl" mode="aspectFill" />
                </view>
              </view>
            </view>

            <view class="meta-row">
              <view class="meta-item">
                <uni-icons type="calendar" size="23" color="#9c8477" />
                <text class="meta-label">记录于</text>
                <text class="meta-value">{{ occurredAtCompact }}</text>
              </view>
              <view class="meta-divider">·</view>
              <view class="meta-item">
                <uni-icons :type="moodOption.icon" size="23" :color="moodColor" />
                <text class="meta-label">心情</text>
                <text class="meta-value mood-value">{{ moodOption.label }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="safe-space" />
      </view>
    </scroll-view>

    <view v-if="moment" class="floating-actions">
      <view class="floating-action edit" @tap="goToEdit">
        <uni-icons type="compose" size="24" color="#ffffff" />
        <text class="floating-action-label">编辑</text>
      </view>
      <view class="floating-action delete" @tap="onDelete">
        <uni-icons type="trash" size="21" color="#d56d6b" />
        <text class="floating-action-label">删除</text>
      </view>
    </view>
    <LoveLoading :visible="loading" fullscreen text="正在加载时光" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { getMomentMoodColor, getMomentMoodOption } from '@/constants/moment-moods'
import type { MomentMood } from '@/types/domain'
import { getMoment, removeMoment } from '@/services/moment'
import { getTempFileUrls } from '@/services/media'

interface MomentDetail {
  _id: string
  content: string
  mood: MomentMood
  occurredAt: number
  images: string[]
}

const systemInfo = uni.getSystemInfoSync()

function getNavigationMetrics() {
  const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.top && menuButton?.height) return { top: menuButton.top, height: menuButton.height }
  } catch {
    // 非微信环境使用接近微信胶囊尺寸的回退值。
  }
  return { top: fallbackTop, height: 32 }
}

const navigationMetrics = getNavigationMetrics()
const pageStyle = {
  '--menu-top': navigationMetrics.top + 'px',
  '--menu-height': navigationMetrics.height + 'px'
}

const moment = ref<MomentDetail | null>(null)
const recordId = ref('')
const loading = ref(false)
const loadedOnce = ref(false)

const moodOption = computed(() => getMomentMoodOption(moment.value?.mood || 'warm'))
const moodColor = computed(() => getMomentMoodColor(moment.value?.mood || 'warm'))

function pad(value: number) {
  return String(value).padStart(2, '0')
}

const occurredDateLabel = computed(() => {
  if (!moment.value) return ''
  const date = new Date(moment.value.occurredAt)
  return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日'
})

const occurredAtCompact = computed(() => {
  if (!moment.value) return ''
  const date = new Date(moment.value.occurredAt)
  return date.getFullYear() + '.' + pad(date.getMonth() + 1) + '.' + pad(date.getDate())
})

async function loadMoment() {
  if (!recordId.value || loading.value) return
  loading.value = true
  try {
    const data = await getMoment(recordId.value)
    const urlMap = data.mediaIds.length ? await getTempFileUrls(data.mediaIds) : {}
    moment.value = {
      _id: data._id,
      content: data.content,
      mood: data.mood,
      occurredAt: data.occurredAt,
      images: data.mediaIds.map(fileId => urlMap[fileId] || fileId).filter(Boolean)
    }
    loadedOnce.value = true
  } catch (error) {
    const message = error instanceof Error ? error.message : '时刻加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  if (!options?.id) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    return
  }
  recordId.value = options.id
  loadMoment()
})

onShow(() => {
  if (loadedOnce.value) loadMoment()
})

function previewImage(current: number) {
  if (!moment.value) return
  uni.previewImage({ current, urls: moment.value.images })
}

function goBack() {
  uni.navigateBack()
}

function goToEdit() {
  if (!moment.value) return
  uni.navigateTo({ url: '/pages/timeline/edit?id=' + moment.value._id })
}

function onDelete() {
  if (!moment.value) return
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，是否继续？',
    confirmColor: '#df716e',
    success: async (result) => {
      if (!result.confirm || !moment.value) return
      try {
        await removeMoment(moment.value._id)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 900)
      } catch (error) {
        const message = error instanceof Error ? error.message : '删除失败'
        uni.showToast({ title: message, icon: 'none' })
      }
    }
  })
}
</script>

<style scoped lang="scss">
.detail-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 7% 1%, rgba(247, 205, 197, 0.68), transparent 42%),
    linear-gradient(180deg, #f8e3dd 0%, #faeee8 36%, #fcf7f1 100%);
  color: #58463c;
}

.detail-page::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    repeating-linear-gradient(18deg, rgba(133, 98, 75, 0.012) 0 1rpx, transparent 1rpx 7rpx),
    repeating-linear-gradient(102deg, rgba(255, 255, 255, 0.07) 0 1rpx, transparent 1rpx 9rpx);
  content: '';
  pointer-events: none;
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

.detail-scroll {
  position: relative;
  z-index: 2;
  min-height: 0;
  flex: 1;
}

.detail-content {
  position: relative;
  z-index: 2;
  padding: 25rpx 18rpx 0;
}

.moment-header {
  position: relative;
  display: flex;
  min-height: 250rpx;
  align-items: flex-start;
  padding: 28rpx 21rpx 16rpx;
}

.header-copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
}

.occurred-date {
  color: #5a3d32;
  font-family: Georgia, 'Songti SC', STSong, serif;
  font-size: 48rpx;
  line-height: 1.25;
  letter-spacing: 1rpx;
}

.mood-summary {
  display: flex;
  width: fit-content;
  height: 50rpx;
  align-items: center;
  gap: 9rpx;
  margin-top: 18rpx;
  padding: 0 22rpx;
  border-radius: 25rpx;
  background: rgba(239, 176, 174, 0.24);
  color: #7b554c;
  font-size: 25rpx;
}

.header-quote {
  position: absolute;
  top: 43rpx;
  right: 74rpx;
  z-index: 2;
  width: 320rpx;
  height: 220rpx;
  opacity: 0.88;
}

.header-floral {
  position: absolute;
  top: -4rpx;
  right: -45rpx;
  width: 222rpx;
  height: 242rpx;
  opacity: 0.67;
}

.memory-card {
  position: relative;
  padding: 11rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 34rpx;
  background: rgba(255, 252, 247, 0.78);
  box-shadow: 0 16rpx 40rpx rgba(113, 76, 56, 0.09);
}

.memory-card::before {
  position: absolute;
  inset: 11rpx;
  border: 4rpx dotted rgba(232, 137, 135, 0.55);
  border-radius: 25rpx;
  content: '';
  pointer-events: none;
}

.memory-card-inner {
  position: relative;
  z-index: 1;
  padding: 62rpx 39rpx 34rpx;
  border-radius: 24rpx;
  background:
    radial-gradient(circle, rgba(220, 144, 127, 0.12) 1.5rpx, transparent 1.8rpx) 0 0 / 22rpx 22rpx,
    rgba(255, 252, 247, 0.72);
}

.moment-content {
  display: block;
  color: #5d4035;
  font-family: 'Songti SC', STSong, serif;
  font-size: 29rpx;
  line-height: 1.82;
  white-space: pre-wrap;
  word-break: break-word;
}

.photos-section {
  margin-top: 42rpx;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.photo-cell {
  position: relative;
  height: 184rpx;
  overflow: hidden;
  border: 8rpx solid rgba(255, 255, 255, 0.96);
  border-radius: 18rpx;
  background: #f1e6de;
  box-shadow: 0 8rpx 18rpx rgba(101, 70, 54, 0.13);
}

.detail-image {
  display: block;
  width: 100%;
  height: 100%;
}

.meta-row {
  display: flex;
  min-height: 104rpx;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  margin-top: 42rpx;
  border-top: 1rpx dashed rgba(163, 129, 110, 0.42);
  color: #806a5e;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  white-space: nowrap;
}

.meta-label {
  color: #8b7467;
  font-size: 25rpx;
}

.meta-value {
  color: #5e463a;
  font-family: Georgia, 'Songti SC', STSong, serif;
  font-size: 25rpx;
}

.mood-value {
  color: #cf6b68;
  font-family: inherit;
  font-weight: 600;
}

.meta-divider {
  color: #b6a298;
  font-size: 27rpx;
}

.floating-actions {
  position: fixed;
  right: 30rpx;
  bottom: calc(env(safe-area-inset-bottom) + 32rpx);
  z-index: 20;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.floating-action {
  display: flex;
  box-sizing: border-box;
  width: 150rpx;
  height: 78rpx;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 0;
  border: 2rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 40rpx;
  box-shadow: 0 13rpx 28rpx rgba(105, 71, 55, 0.14), inset 0 2rpx 5rpx rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
}

.floating-action:active {
  transform: scale(0.96);
}

.floating-action.delete {
  border-color: rgba(241, 205, 201, 0.82);
  background: rgba(255, 250, 247, 0.94);
  color: #c96766;
}

.floating-action.edit {
  background: linear-gradient(135deg, #f3918a 0%, #e6686b 100%);
  box-shadow: 0 16rpx 34rpx rgba(205, 90, 88, 0.28), inset 0 2rpx 6rpx rgba(255, 255, 255, 0.32);
  color: #fff;
}

.floating-action-label {
  font-size: 25rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.safe-space {
  height: calc(env(safe-area-inset-bottom) + 130rpx);
}
</style>
