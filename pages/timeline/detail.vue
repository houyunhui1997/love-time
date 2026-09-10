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
          <view class="date-marker">
            <uni-icons type="smallcircle-filled" size="14" color="#e47a75" />
            <view class="marker-line" />
          </view>
          <view class="header-copy">
            <text class="occurred-at">{{ occurredAtLabel }}</text>
            <view class="mood-summary">
              <uni-icons :type="moodOption.icon" size="23" :color="moodColor" />
              <text>{{ moodOption.label }}</text>
            </view>
          </view>
          <image class="header-floral" src="/static/timeline/timeline-bottom-bouquet.png" mode="aspectFit" />
        </view>

        <view class="content-card glass-card">
          <image class="paper-tape" src="/static/timeline/moment-paper-tape.png" mode="aspectFit" />
          <text class="moment-content">{{ moment.content }}</text>
        </view>

        <view v-if="moment.images.length" class="photos-card glass-card">
          <view class="photo-grid">
            <view
              v-for="(imageUrl, index) in visibleImages"
              :key="imageUrl + '-' + index"
              class="photo-cell"
              @tap="previewImage(index)"
            >
              <image class="detail-image" :src="imageUrl" mode="aspectFill" />
              <view v-if="index === 2 && hiddenImageCount > 0" class="photo-count">
                <text>+{{ hiddenImageCount }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="meta-card glass-card">
          <view class="meta-item">
            <view class="meta-label">
              <uni-icons type="calendar" size="21" color="#9c8477" />
              <text>发生时间</text>
            </view>
            <text class="meta-value">{{ occurredAtCompact }}</text>
          </view>
          <view class="meta-item">
            <view class="meta-label">
              <uni-icons :type="moodOption.icon" size="21" :color="moodColor" />
              <text>这一刻的心情</text>
            </view>
            <text class="meta-value mood-value">{{ moodOption.label }}</text>
          </view>
        </view>

        <button class="edit-button" @tap="goToEdit">编辑这段时光</button>
        <text class="delete-action" @tap="onDelete">删除</text>
        <view class="safe-space" />
      </view>
    </scroll-view>

    <image class="bottom-floral" src="/static/timeline/timeline-bottom-bouquet.png" mode="aspectFit" />
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
const visibleImages = computed(() => moment.value?.images.slice(0, 3) || [])
const hiddenImageCount = computed(() => Math.max(0, (moment.value?.images.length || 0) - 3))

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatTime(date: Date) {
  return pad(date.getHours()) + ':' + pad(date.getMinutes())
}

const occurredAtLabel = computed(() => {
  if (!moment.value) return ''
  const date = new Date(moment.value.occurredAt)
  return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + formatTime(date)
})

const occurredAtCompact = computed(() => {
  if (!moment.value) return ''
  const date = new Date(moment.value.occurredAt)
  return date.getFullYear() + '.' + pad(date.getMonth() + 1) + '.' + pad(date.getDate()) + ' ' + formatTime(date)
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
  padding: 30rpx 34rpx 0;
}

.moment-header {
  position: relative;
  display: flex;
  min-height: 178rpx;
  align-items: flex-start;
  padding: 36rpx 0 16rpx 10rpx;
  overflow: hidden;
}

.date-marker {
  display: flex;
  width: 30rpx;
  align-items: center;
  flex-direction: column;
  padding-top: 8rpx;
}

.marker-line {
  width: 1rpx;
  height: 73rpx;
  margin-top: 4rpx;
  background: rgba(224, 113, 109, 0.72);
}

.header-copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
}

.occurred-at {
  color: #5a3d32;
  font-family: Georgia, 'Songti SC', STSong, serif;
  font-size: 38rpx;
  line-height: 1.35;
}

.mood-summary {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 21rpx;
  color: #7f6659;
  font-size: 28rpx;
}

.header-floral {
  position: absolute;
  top: -34rpx;
  right: -36rpx;
  width: 235rpx;
  height: 210rpx;
  opacity: 0.5;
  transform: rotate(-13deg) scaleX(-1);
  transform-origin: center;
}

.glass-card {
  border: 1rpx solid rgba(255, 255, 255, 0.95);
  background: rgba(252, 247, 241, 0.86);
  box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, 0.9), 0 13rpx 31rpx rgba(105, 72, 54, 0.075);
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);
}

.content-card {
  position: relative;
  min-height: 280rpx;
  padding: 77rpx 46rpx 48rpx;
  border-radius: 29rpx;
}

.paper-tape {
  position: absolute;
  top: -28rpx;
  left: 20rpx;
  width: 135rpx;
  height: 62rpx;
  opacity: 0.72;
  transform: rotate(-5deg);
}

.moment-content {
  display: block;
  color: #5d4035;
  font-family: 'Songti SC', STSong, serif;
  font-size: 31rpx;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
}

.photos-card {
  margin-top: 27rpx;
  padding: 20rpx;
  border-radius: 29rpx;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 11rpx;
}

.photo-cell {
  position: relative;
  height: 235rpx;
  overflow: hidden;
  border-radius: 22rpx;
}

.detail-image {
  width: 100%;
  height: 100%;
}

.photo-count {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(60, 44, 36, 0.38);
  color: #fff;
  font-size: 35rpx;
}

.meta-card {
  margin-top: 27rpx;
  padding: 0 29rpx;
  border-radius: 29rpx;
}

.meta-item {
  display: flex;
  min-height: 93rpx;
  align-items: center;
  justify-content: space-between;
}

.meta-item + .meta-item {
  border-top: 1rpx solid rgba(218, 197, 184, 0.48);
}

.meta-label {
  display: flex;
  align-items: center;
  gap: 19rpx;
  color: #8b7467;
  font-size: 26rpx;
}

.meta-value {
  color: #5e463a;
  font-size: 25rpx;
}

.mood-value {
  color: #cf6b68;
}

.edit-button {
  display: flex;
  width: 616rpx;
  height: 91rpx;
  align-items: center;
  justify-content: center;
  margin: 37rpx auto 0;
  padding: 0;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #eb817a 0%, #db676a 100%);
  box-shadow: 0 13rpx 29rpx rgba(205, 94, 90, 0.22);
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
  line-height: 91rpx;
}

.edit-button::after {
  border: 0;
}

.delete-action {
  display: block;
  margin-top: 27rpx;
  color: #d96866;
  font-size: 27rpx;
  text-align: center;
}

.bottom-floral {
  position: absolute;
  bottom: -72rpx;
  left: -56rpx;
  z-index: 1;
  width: 285rpx;
  height: 245rpx;
  opacity: 0.42;
  pointer-events: none;
}

.safe-space {
  height: calc(env(safe-area-inset-bottom) + 72rpx);
}
</style>
