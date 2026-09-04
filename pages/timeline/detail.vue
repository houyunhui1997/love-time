<template>
  <view class="detail-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <view class="back-arrow" />
      </view>
      <text class="nav-title">时刻详情</text>
      <view class="nav-more" @tap="onMoreTap">
        <view class="dot" />
        <view class="dot" />
        <view class="dot" />
      </view>
    </view>

    <!-- 日期标题区 -->
    <view v-if="moment" class="header-section">
      <view class="date-block">
        <text class="day-number">{{ dayNumber }}</text>
        <view class="date-info">
          <text class="month-year">{{ monthYear }}</text>
          <view class="meta-row">
            <text class="mood-tag" :class="moment.mood">{{ moodLabel }}</text>
            <text class="meta-time">{{ moment.time }}</text>
          </view>
        </view>
      </view>
      <view class="title-flower">
        <text class="moment-title">{{ moment.title }}</text>
        <image
          class="flower-icon"
          src="/static/anniversary/flower-small.png"
          mode="aspectFit"
        />
      </view>
    </view>

    <!-- 内容文字 -->
    <view v-if="moment && moment.content" class="content-section">
      <text class="content-text">{{ moment.content }}</text>
    </view>

    <!-- 图片网格 -->
    <view v-if="moment && moment.images.length > 0" class="image-section">
      <view class="image-grid">
        <image
          v-for="(img, index) in moment.images"
          :key="index"
          class="detail-image"
          :src="img"
          mode="aspectFill"
          @tap="previewImage(index)"
        />
      </view>
    </view>

    <!-- 记录时间 -->
    <view v-if="moment" class="record-time">
      <text>记录于 {{ recordDate }}</text>
    </view>

    <!-- 底部装饰 -->
    <view class="bottom-decoration">
      <image
        class="flower-decoration"
        src="/static/anniversary/flower-decoration.png"
        mode="aspectFit"
      />
    </view>

    <!-- 底部按钮 -->
    <view class="action-buttons">
      <view class="edit-btn" @tap="goToEdit">
        <view class="pencil-small" />
        <text>编辑</text>
      </view>
      <text class="delete-text" @tap="onDelete">删除</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMoment, removeMoment, type MomentListItem } from '@/services/moment'
import { getTempFileUrls } from '@/services/media'

interface MomentDetail {
  _id: string
  title: string
  content: string
  mood: string
  time: string
  occurredAt: string
  images: string[]
  createdAt: string
}

const moment = ref<MomentDetail | null>(null)
const loading = ref(false)

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

const dayNumber = computed(() => {
  if (!moment.value) return ''
  return moment.value.occurredAt.split('-')[2] || ''
})

const monthYear = computed(() => {
  if (!moment.value) return ''
  const [year, month] = moment.value.occurredAt.split('-')
  return `${monthNames[parseInt(month) - 1]} ${year}`
})

const moodLabel = computed(() => {
  if (!moment.value) return ''
  const map: Record<string, string> = {
    happy: '开心',
    warm: '温暖',
    calm: '平静',
    moved: '感动',
    other: '其他'
  }
  return map[moment.value.mood] || moment.value.mood
})

const recordDate = computed(() => {
  if (!moment.value) return ''
  return moment.value.createdAt.replace(/-/g, '.')
})

onLoad(async (options) => {
  if (!options?.id) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const data = await getMoment(options.id)
    const date = new Date(data.occurredAt)
    const occurredAtStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const createdAtStr = new Date(data.createdAt)
    const createdAtFormatted = `${createdAtStr.getFullYear()}-${String(createdAtStr.getMonth() + 1).padStart(2, '0')}-${String(createdAtStr.getDate()).padStart(2, '0')}`

    // 换取图片临时链接
    const urlMap = data.mediaIds.length > 0 ? await getTempFileUrls(data.mediaIds) : {}
    const images = data.mediaIds.map(id => urlMap[id] || id).filter(Boolean)

    moment.value = {
      _id: data._id,
      title: data.title,
      content: data.content,
      mood: data.mood,
      time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
      occurredAt: occurredAtStr,
      images,
      createdAt: createdAtFormatted
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '时刻加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
})

function previewImage(current: number) {
  if (!moment.value) return
  uni.previewImage({
    current,
    urls: moment.value.images
  })
}

function goBack() {
  uni.navigateBack()
}

function onMoreTap() {
  uni.showActionSheet({
    itemList: ['分享'],
    success: () => {}
  })
}

function goToEdit() {
  if (!moment.value) return
  uni.navigateTo({ url: `/pages/timeline/edit?id=${moment.value._id}` })
}

function onDelete() {
  if (!moment.value) return
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，是否继续？',
    confirmColor: '#db7470',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await removeMoment(moment.value!._id)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1200)
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
  position: relative;
  min-height: 100vh;
  padding: calc(var(--love-safe-top) + 24rpx) var(--love-page-gutter)
    calc(var(--love-safe-bottom) + 48rpx);
  background: var(--love-color-bg);
  overflow: hidden;
}

/* 顶部导航 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  margin-bottom: 32rpx;
}

.nav-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;

  .back-arrow {
    width: 20rpx;
    height: 20rpx;
    border-left: 4rpx solid var(--love-color-text);
    border-bottom: 4rpx solid var(--love-color-text);
    transform: rotate(45deg);
  }
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--love-color-text);
}

.nav-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5rpx;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);

  .dot {
    width: 5rpx;
    height: 5rpx;
    border-radius: 50%;
    background: var(--love-color-text-secondary);
  }
}

/* 日期标题区 */
.header-section {
  margin-bottom: 32rpx;
}

.date-block {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.day-number {
  font-size: 96rpx;
  font-weight: 300;
  line-height: 1;
  color: var(--love-color-primary);
  font-family: Georgia, 'Times New Roman', serif;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-top: 12rpx;
}

.month-year {
  font-size: 26rpx;
  color: var(--love-color-text-secondary);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.mood-tag {
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  font-size: 24rpx;

  &.happy {
    color: #e8a87c;
    background: rgba(232, 168, 124, 0.12);
  }

  &.warm {
    color: var(--love-color-primary);
    background: rgba(219, 116, 112, 0.12);
  }

  &.calm {
    color: #8fb9a8;
    background: rgba(143, 185, 168, 0.12);
  }

  &.moved {
    color: #c38d9e;
    background: rgba(195, 141, 158, 0.12);
  }

  &.other {
    color: var(--love-color-text-secondary);
    background: rgba(148, 135, 125, 0.12);
  }
}

.meta-time {
  font-size: 26rpx;
  color: var(--love-color-text-secondary);
}

.title-flower {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.moment-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--love-color-text);
  line-height: 1.4;
}

.flower-icon {
  width: 48rpx;
  height: 48rpx;
  opacity: 0.7;
}

/* 内容文字 */
.content-section {
  margin-bottom: 32rpx;
}

.content-text {
  font-size: 28rpx;
  color: var(--love-color-text);
  line-height: 1.8;
}

/* 图片区域 */
.image-section {
  margin-bottom: 32rpx;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.detail-image {
  width: 100%;
  height: 320rpx;
  border-radius: var(--love-radius-medium);
  object-fit: cover;
}

/* 记录时间 */
.record-time {
  text-align: center;
  margin-bottom: 48rpx;

  text {
    font-size: 24rpx;
    color: var(--love-color-text-secondary);
  }
}

/* 底部装饰 */
.bottom-decoration {
  position: absolute;
  bottom: 140rpx;
  right: -40rpx;
  width: 280rpx;
  height: 200rpx;
  pointer-events: none;
  opacity: 0.2;
}

.flower-decoration {
  width: 100%;
  height: 100%;
}

/* 底部按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  padding-top: 24rpx;
}

.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 240rpx;
  height: 80rpx;
  border-radius: 40rpx;
  border: 2rpx solid var(--love-color-primary);
  color: var(--love-color-primary);
  font-size: 28rpx;

  &:active {
    background: rgba(219, 116, 112, 0.08);
  }
}

.pencil-small {
  width: 24rpx;
  height: 24rpx;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    width: 3rpx;
    height: 18rpx;
    background: var(--love-color-primary);
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    border-radius: 2rpx;
  }

  &::after {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border-left: 6rpx solid transparent;
    border-right: 6rpx solid transparent;
    border-top: 8rpx solid var(--love-color-primary);
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
  }
}

.delete-text {
  font-size: 28rpx;
  color: var(--love-color-text-secondary);
  padding: 16rpx 32rpx;

  &:active {
    color: var(--love-color-danger);
  }
}
</style>
