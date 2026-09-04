<template>
  <view class="timeline-page">
    <!-- 顶部标题区 -->
    <view class="header">
      <text class="eyebrow">LOVE TIME</text>
      <view class="header-row">
        <text class="page-title">恋爱时光轴</text>
        <view class="search-btn" @tap="goToSearch">
          <view class="search-icon" />
        </view>
      </view>
    </view>

    <!-- 月份选择器 -->
    <view class="month-selector" @tap="showMonthPicker = true">
      <view class="leaf-deco left" />
      <text class="month-text">{{ currentYear }}年{{ currentMonth }}月</text>
      <view class="month-arrow" />
      <view class="leaf-deco right" />
    </view>

    <!-- 时间轴列表 -->
    <view class="timeline-list">
      <view
        v-for="(item, index) in timelineItems"
        :key="item._id"
        class="timeline-item"
      >
        <!-- 左侧日期 -->
        <view class="date-column">
          <view v-if="item.isToday" class="today-badge">今天</view>
          <text class="day-number">{{ item.day }}</text>
          <text class="month-name">{{ item.monthName }}</text>
        </view>

        <!-- 连接线 -->
        <view class="timeline-line">
          <view class="line-dot" />
          <view class="line-bar" />
        </view>

        <!-- 右侧卡片 -->
        <view class="moment-card" @tap="goToDetail(item._id)">
          <view class="card-header">
            <text class="card-title">{{ item.title }}</text>
          </view>
          <text v-if="item.content" class="card-content">{{ item.content }}</text>
          <view class="card-meta">
            <text class="mood-tag" :class="item.mood">{{ moodLabel(item.mood) }}</text>
            <text class="meta-time">{{ item.time }}</text>
          </view>
          <view v-if="item.images.length > 0" class="image-grid">
            <image
              v-for="(img, imgIndex) in item.images.slice(0, 2)"
              :key="imgIndex"
              class="grid-image"
              :src="img"
              mode="aspectFill"
            />
          </view>
        </view>
      </view>

      <view v-if="empty && !loading" class="empty-state">
        <text class="empty-text">这个月还没有记录，点击右下角记录此刻吧</text>
      </view>
    </view>

    <!-- 底部装饰 -->
    <view class="bottom-decoration">
      <image
        class="flower-decoration"
        src="/static/anniversary/flower-decoration.png"
        mode="aspectFit"
      />
    </view>

    <!-- 记录按钮 -->
    <view class="fab-record" @tap="goToEdit">
      <view class="fab-icon">
        <view class="pencil-icon" />
      </view>
      <text class="fab-label">记录此刻</text>
    </view>

    <!-- 月份选择弹窗 -->
    <view v-if="showMonthPicker" class="picker-mask" @tap="showMonthPicker = false">
      <view class="picker-sheet" @tap.stop>
        <view class="picker-handle" />
        <view class="picker-title">选择月份</view>
        <scroll-view scroll-y class="month-grid">
          <view
            v-for="m in monthOptions"
            :key="m.value"
            class="month-option"
            :class="{ active: currentMonth === m.month && currentYear === m.year }"
            @tap="selectMonth(m)"
          >
            <text>{{ m.label }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listMoments, type MomentListItem } from '@/services/moment'
import { getTempFileUrls } from '@/services/media'

interface TimelineItem {
  _id: string
  day: string
  monthName: string
  title: string
  content: string
  mood: string
  time: string
  images: string[]
  isToday: boolean
}

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const showMonthPicker = ref(false)
const loading = ref(false)
const empty = ref(false)
const timelineItems = ref<TimelineItem[]>([])

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

const currentMonthValue = computed(() => {
  return `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
})

const monthOptions = computed(() => {
  const options: { year: number; month: number; value: string; label: string }[] = []
  const now = new Date()
  const endYear = now.getFullYear() + 1
  for (let y = 2024; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      options.push({
        year: y,
        month: m,
        value: `${y}-${String(m).padStart(2, '0')}`,
        label: `${y}年${m}月`
      })
    }
  }
  return options.reverse()
})

function isToday(occurredAt: number): boolean {
  const date = new Date(occurredAt)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function formatTime(occurredAt: number): string {
  const date = new Date(occurredAt)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function mapItem(item: MomentListItem): TimelineItem {
  const date = new Date(item.occurredAt)
  return {
    _id: item._id,
    day: String(date.getDate()).padStart(2, '0'),
    monthName: monthNames[date.getMonth()],
    title: item.title,
    content: item.content,
    mood: item.mood,
    time: formatTime(item.occurredAt),
    images: [],
    isToday: isToday(item.occurredAt)
  }
}

async function loadData() {
  loading.value = true
  try {
    const page = await listMoments(currentMonthValue.value)
    const items = page.list.map(mapItem)

    // 批量换取图片临时链接
    const allMediaIds = page.list.flatMap(item => item.mediaIds || [])
    if (allMediaIds.length > 0) {
      const urlMap = await getTempFileUrls(allMediaIds)
      page.list.forEach((raw, index) => {
        items[index].images = (raw.mediaIds || []).map(id => urlMap[id] || id).filter(Boolean)
      })
    }

    timelineItems.value = items
    empty.value = items.length === 0
  } catch (error) {
    const message = error instanceof Error ? error.message : '时光轴加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function moodLabel(mood: string): string {
  const map: Record<string, string> = {
    happy: '开心',
    warm: '温暖',
    calm: '平静',
    moved: '感动',
    other: '其他'
  }
  return map[mood] || mood
}

function selectMonth(m: { year: number; month: number }) {
  currentYear.value = m.year
  currentMonth.value = m.month
  showMonthPicker.value = false
  loadData()
}

function goToSearch() {
  uni.navigateTo({ url: '/pages/timeline/search' })
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/timeline/detail?id=${id}` })
}

function goToEdit() {
  uni.navigateTo({ url: '/pages/timeline/edit' })
}

onShow(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.timeline-page {
  position: relative;
  min-height: 100vh;
  padding: calc(var(--love-safe-top) + 24rpx) var(--love-page-gutter)
    calc(var(--love-safe-bottom) + 160rpx);
  background: var(--love-color-bg);
  overflow: hidden;
}

/* 顶部标题 */
.header {
  margin-bottom: 24rpx;
}

.eyebrow {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--love-color-primary);
  letter-spacing: 6rpx;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.page-title {
  font-size: 44rpx;
  font-weight: 700;
  color: var(--love-color-text);
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
}

.search-icon {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid var(--love-color-text-secondary);
  border-radius: 50%;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    width: 12rpx;
    height: 3rpx;
    background: var(--love-color-text-secondary);
    transform: rotate(45deg);
    right: -8rpx;
    bottom: -2rpx;
  }
}

/* 月份选择器 */
.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
  padding: 16rpx 0;
}

.leaf-deco {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4c4b0, #c9b8a3);
  opacity: 0.5;

  &.left {
    transform: rotate(-30deg);
  }

  &.right {
    transform: rotate(30deg);
  }
}

.month-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--love-color-text);
}

.month-arrow {
  width: 12rpx;
  height: 12rpx;
  border-right: 3rpx solid var(--love-color-text-secondary);
  border-bottom: 3rpx solid var(--love-color-text-secondary);
  transform: rotate(45deg);
  opacity: 0.5;
}

/* 时间轴列表 */
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

/* 左侧日期 */
.date-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80rpx;
  flex-shrink: 0;
  padding-top: 8rpx;
}

.today-badge {
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  background: var(--love-color-primary);
  color: #fff;
  font-size: 20rpx;
  margin-bottom: 8rpx;
}

.day-number {
  font-size: 48rpx;
  font-weight: 300;
  color: var(--love-color-primary);
  line-height: 1;
  font-family: Georgia, 'Times New Roman', serif;
}

.month-name {
  font-size: 22rpx;
  color: var(--love-color-text-secondary);
  margin-top: 4rpx;
}

/* 连接线 */
.timeline-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 32rpx;
  flex-shrink: 0;
  padding-top: 20rpx;
}

.line-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--love-color-primary-soft);
  border: 2rpx solid var(--love-color-primary);
}

.line-bar {
  width: 2rpx;
  flex: 1;
  min-height: 60rpx;
  background: linear-gradient(180deg, var(--love-color-primary-soft), transparent);
  margin-top: 8rpx;
}

/* 右侧卡片 */
.moment-card {
  flex: 1;
  padding: 24rpx;
  border-radius: var(--love-radius-medium);
  background: var(--love-color-surface);
  border: 1rpx solid rgba(222, 205, 192, 0.4);
  box-shadow: 0 4rpx 16rpx rgba(97, 66, 45, 0.04);
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--love-color-text);
  line-height: 1.4;
}

.card-content {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--love-color-text-secondary);
  line-height: 1.5;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
}

.mood-tag {
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  font-size: 22rpx;

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
  font-size: 24rpx;
  color: var(--love-color-text-secondary);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  margin-top: 16rpx;
}

.grid-image {
  width: 100%;
  height: 200rpx;
  border-radius: var(--love-radius-small);
  object-fit: cover;
}

.empty-state {
  padding: 64rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: var(--love-color-text-secondary);
}

/* 底部装饰 */
.bottom-decoration {
  position: absolute;
  bottom: 140rpx;
  right: -40rpx;
  width: 280rpx;
  height: 200rpx;
  pointer-events: none;
  opacity: 0.25;
  transform: scaleX(-1);
}

.flower-decoration {
  width: 100%;
  height: 100%;
}

/* 记录按钮 */
.fab-record {
  position: fixed;
  right: 48rpx;
  bottom: calc(var(--love-safe-bottom) + 140rpx);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.fab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--love-color-primary);
  box-shadow: 0 8rpx 28rpx rgba(219, 116, 112, 0.35);
}

.pencil-icon {
  width: 36rpx;
  height: 36rpx;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    width: 4rpx;
    height: 28rpx;
    background: #fff;
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
    border-left: 8rpx solid transparent;
    border-right: 8rpx solid transparent;
    border-top: 12rpx solid #fff;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
  }
}

.fab-label {
  font-size: 22rpx;
  color: var(--love-color-text-secondary);
}

/* 月份选择弹窗 */
.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  background: rgba(58, 42, 33, 0.34);
}

.picker-sheet {
  width: 100%;
  padding: 18rpx 0 calc(var(--love-safe-bottom) + 24rpx);
  border-radius: 38rpx 38rpx 0 0;
  background: var(--love-color-surface);
  box-shadow: 0 -18rpx 54rpx rgba(65, 44, 31, 0.16);
}

.picker-handle {
  width: 70rpx;
  height: 7rpx;
  margin: 0 auto 28rpx;
  border-radius: 4rpx;
  background: #dfd5cc;
}

.picker-title {
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--love-color-text);
  margin-bottom: 16rpx;
}

.month-grid {
  max-height: 600rpx;
  padding: 0 32rpx;
}

.month-option {
  padding: 24rpx 32rpx;
  text-align: center;
  font-size: 28rpx;
  color: var(--love-color-text);
  border-radius: var(--love-radius-small);

  &.active {
    color: var(--love-color-primary);
    font-weight: 600;
    background: rgba(219, 116, 112, 0.08);
  }
}
</style>
