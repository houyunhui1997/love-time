<template>
  <view class="timeline-page" :style="pageStyle">
    <view class="nav-bar">
      <text class="nav-title">恋爱时光轴</text>
    </view>

    <view class="month-row">
      <view class="month-selector" @tap="openMonthPicker">
        <text class="month-text">{{ selectedMonthLabel }}</text>
        <uni-icons type="down" size="15" color="#9b887b" />
      </view>
    </view>

    <scroll-view
      class="timeline-scroll"
      scroll-y
      :show-scrollbar="false"
      enhanced
      @scrolltolower="loadMore"
    >
      <view v-if="timelineItems.length" class="timeline-list">
        <view
          v-for="(item, index) in timelineItems"
          :key="item._id"
          class="timeline-item"
          :class="{ 'last-item': index === timelineItems.length - 1 }"
        >
          <view class="date-column">
            <text v-if="item.isToday" class="today-label">今天</text>
            <text class="day-number">{{ item.day }}</text>
            <text class="month-name">{{ item.monthName }}</text>
          </view>

          <view class="timeline-rail">
            <view class="rail-dot" />
            <view class="rail-line" />
          </view>

          <view
            class="moment-card"
            :class="{
              'has-media': item.images.length > 0,
              'single-media': item.images.length === 1,
              'multiple-media': item.images.length > 1
            }"
            @tap="goToDetail(item._id)"
          >
            <view class="card-main">
              <view class="card-copy">
                <text class="card-content">{{ item.content }}</text>
              </view>

              <view v-if="item.images.length" class="media-layout">
                <image
                  v-for="(imageUrl, imageIndex) in item.images.slice(0, 2)"
                  :key="`${item._id}-${imageIndex}`"
                  class="moment-image"
                  :src="imageUrl"
                  mode="aspectFill"
                />
                <view v-if="item.images.length > 2" class="media-count">
                  <text>+{{ item.images.length - 2 }}</text>
                </view>
              </view>
            </view>

            <view class="card-meta">
              <view class="meta-left">
                <text v-if="item.visibility === 'couple'" class="creator-tag">{{ item.isMine ? '由我创建' : `由${item.creatorName}创建` }}</text>
                <view class="mood-info">
                  <uni-icons type="heart-filled" size="14" :color="moodColor(item.mood)" />
                  <text>{{ moodLabel(item.mood) }}</text>
                </view>
              </view>
              <text class="meta-time">{{ item.time }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="empty && !loading" class="empty-state">
        <view class="empty-heart">
          <uni-icons type="heart-filled" size="31" color="#df8580" />
        </view>
        <text class="empty-title">这个月还没有故事</text>
        <text class="empty-copy">记录一段只属于你们的温柔时光</text>
        <button class="empty-action" @tap="goToEdit">记录此刻</button>
      </view>

      <view class="scroll-spacer" />
    </scroll-view>

    <image
      class="bottom-bouquet"
      src="/static/timeline/timeline-bottom-bouquet.png"
      mode="aspectFit"
    />

    <view class="record-action" @tap="goToEdit">
      <view class="record-button">
        <uni-icons type="compose" size="31" color="#ffffff" />
      </view>
      <text class="record-label">记录此刻</text>
    </view>

    <view v-if="showMonthPicker" class="picker-mask" @tap="cancelMonthPicker">
      <view class="picker-sheet month-picker-sheet" @tap.stop>
        <view class="picker-handle" />
        <text class="picker-title">选择月份</text>
        <picker-view
          class="month-picker-view"
          indicator-style="height: 88rpx;"
          :value="monthPickerSelection"
          @change="onMonthPickerChange"
        >
          <picker-view-column>
            <view v-for="year in pickerYears" :key="year" class="picker-item">
              {{ year === '全部' ? year : `${year}年` }}
            </view>
          </picker-view-column>
          <picker-view-column>
            <view
              v-for="month in 12"
              :key="month"
              class="picker-item"
              :class="{ disabled: pickerAllYears }"
            >
              {{ month }}月
            </view>
          </picker-view-column>
        </picker-view>
        <view class="month-picker-actions">
          <button class="month-action month-action-cancel" @tap="cancelMonthPicker">取消</button>
          <button class="month-action month-action-confirm" @tap="confirmMonthPicker">确定</button>
        </view>
      </view>
    </view>

    <LoveLoading :visible="loading" fullscreen text="正在加载时光" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { getMomentMoodColor, getMomentMoodOption } from '@/constants/moment-moods'
import { listMoments, type MomentListItem } from '@/services/moment'
import { getTempFileUrls } from '@/services/media'
import type { MomentMood } from '@/types/domain'

interface TimelineItem {
  _id: string
  day: string
  monthName: string
  content: string
  mood: MomentMood
  time: string
  images: string[]
  isToday: boolean
  creatorName: string
  isMine: boolean
  visibility: 'private' | 'couple'
}

const systemInfo = uni.getSystemInfoSync()

function getNavigationMetrics() {
  const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.top && menuButton?.height) {
      return { top: menuButton.top, height: menuButton.height }
    }
  } catch {
    // 非微信环境使用接近微信胶囊尺寸的回退值。
  }
  return { top: fallbackTop, height: 32 }
}

const navigationMetrics = getNavigationMetrics()
const pageStyle = {
  '--menu-top': `${navigationMetrics.top}px`,
  '--menu-height': `${navigationMetrics.height}px`
}

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)
const selectedMonthValue = ref('')
const showMonthPicker = ref(false)
const monthPickerSelection = ref<number[]>([0, now.getMonth()])
const loading = ref(false)
const loadingMore = ref(false)
const empty = ref(false)
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const timelineItems = ref<TimelineItem[]>([])

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

const currentMonthValue = computed(() => {
  return selectedMonthValue.value || undefined
})

const selectedMonthLabel = computed(() => {
  if (!selectedMonthValue.value) return '全部'
  return `${currentYear.value}年${currentMonth.value}月`
})

const pickerYears: Array<number | '全部'> = [
  '全部',
  ...Array.from({ length: now.getFullYear() - 2024 + 2 }, (_, index) => 2024 + index)
]
const pickerAllYears = computed(() => monthPickerSelection.value[0] === 0)

function isToday(occurredAt: number) {
  const date = new Date(occurredAt)
  const today = new Date()
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
}

function formatTime(occurredAt: number) {
  const date = new Date(occurredAt)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function mapItem(item: MomentListItem): TimelineItem {
  const date = new Date(item.occurredAt)
  return {
    _id: item._id,
    day: String(date.getDate()).padStart(2, '0'),
    monthName: monthNames[date.getMonth()],
    content: item.content,
    mood: item.mood,
    time: formatTime(item.occurredAt),
    images: [],
    isToday: isToday(item.occurredAt),
    creatorName: item.creatorName,
    isMine: item.isMine,
    visibility: item.visibility
  }
}

async function hydrateItems(rawItems: MomentListItem[]) {
  const items = rawItems.map(mapItem)
  const mediaIds = rawItems.flatMap(item => item.mediaIds || [])
  if (!mediaIds.length) return items

  const urlMap = await getTempFileUrls(mediaIds)
  rawItems.forEach((raw, index) => {
    items[index].images = (raw.mediaIds || []).map(id => urlMap[id] || id).filter(Boolean)
  })
  return items
}

async function loadData() {
  loading.value = true
  try {
    const page = await listMoments(currentMonthValue.value)
    timelineItems.value = await hydrateItems(page.list)
    nextCursor.value = page.nextCursor
    hasMore.value = page.hasMore
    empty.value = timelineItems.value.length === 0
  } catch (error) {
    const message = error instanceof Error ? error.message : '时光轴加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || !nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await listMoments(currentMonthValue.value, nextCursor.value)
    const items = await hydrateItems(page.list)
    timelineItems.value.push(...items)
    nextCursor.value = page.nextCursor
    hasMore.value = page.hasMore
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载更多失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

function moodLabel(mood: MomentMood) {
  return getMomentMoodOption(mood).label
}

function moodColor(mood: MomentMood) {
  return getMomentMoodColor(mood)
}

function openMonthPicker() {
  const currentYearIndex = pickerYears.indexOf(now.getFullYear())
  monthPickerSelection.value = [Math.max(1, currentYearIndex), now.getMonth()]
  showMonthPicker.value = true
}

function onMonthPickerChange(event: { detail: { value: number[] } }) {
  monthPickerSelection.value = event.detail.value
}

function cancelMonthPicker() {
  showMonthPicker.value = false
}

function confirmMonthPicker() {
  const [yearIndex, monthIndex] = monthPickerSelection.value
  if (yearIndex === 0) {
    selectedMonthValue.value = ''
  } else {
    const selectedYear = pickerYears[yearIndex]
    if (typeof selectedYear !== 'number') return
    currentYear.value = selectedYear
    currentMonth.value = monthIndex + 1
    selectedMonthValue.value = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`
  }
  showMonthPicker.value = false
  void loadData()
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/timeline/detail?id=${id}` })
}

function goToEdit() {
  uni.navigateTo({ url: '/pages/timeline/edit' })
}

onShow(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.timeline-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 9% 4%, rgba(247, 210, 201, 0.78) 0, rgba(247, 210, 201, 0.2) 28%, transparent 52%),
    linear-gradient(180deg, #f7e2da 0%, #fbf0e9 24%, #fcf7f1 56%, #fbf6ef 100%);
  color: #56453b;
}

.timeline-page::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    repeating-linear-gradient(18deg, rgba(133, 98, 75, 0.012) 0 1rpx, transparent 1rpx 7rpx),
    repeating-linear-gradient(102deg, rgba(255, 255, 255, 0.07) 0 1rpx, transparent 1rpx 9rpx);
  content: '';
  pointer-events: none;
}

.nav-bar,
.month-row,
.timeline-scroll {
  position: relative;
  z-index: 2;
}

.nav-bar {
  display: flex;
  height: calc(var(--menu-top) + var(--menu-height));
  align-items: center;
  padding: var(--menu-top) 210rpx 0 42rpx;
  box-sizing: border-box;
}

.nav-title {
  color: #514137;
  font-size: 35rpx;
  font-weight: 600;
  line-height: var(--menu-height);
  letter-spacing: 1rpx;
  white-space: nowrap;
}

.month-row {
  display: flex;
  justify-content: center;
  padding: 20rpx 0 25rpx;
}

.month-selector {
  display: flex;
  min-width: 242rpx;
  height: 62rpx;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 0 30rpx;
  border: 1rpx solid rgba(207, 183, 167, 0.46);
  border-radius: 34rpx;
  background: rgba(255, 252, 248, 0.65);
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.8),
    0 8rpx 22rpx rgba(108, 75, 56, 0.06);
}

.month-text {
  color: #6a584d;
  font-size: 27rpx;
  font-weight: 500;
  letter-spacing: 1rpx;
}

.timeline-scroll {
  min-height: 0;
  flex: 1;
}

.timeline-list {
  padding: 6rpx 43rpx 0 34rpx;
}

.timeline-item {
  display: grid;
  grid-template-columns: 84rpx 32rpx minmax(0, 1fr);
  align-items: stretch;
  column-gap: 10rpx;
  min-height: 216rpx;
}

.date-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10rpx;
}

.today-label {
  margin-bottom: 4rpx;
  color: #de7772;
  font-size: 20rpx;
  font-weight: 500;
  line-height: 1.25;
}

.day-number {
  color: #db7772;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 51rpx;
  font-weight: 400;
  line-height: 0.94;
}

.month-name {
  margin-top: 10rpx;
  color: #a08777;
  font-size: 21rpx;
  line-height: 1.2;
}

.timeline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 22rpx;
}

.rail-dot {
  z-index: 1;
  width: 13rpx;
  height: 13rpx;
  box-sizing: border-box;
  border: 3rpx solid #f8e8e0;
  border-radius: 50%;
  background: #de7772;
  box-shadow: 0 0 0 2rpx rgba(222, 119, 114, 0.22);
}

.rail-line {
  width: 2rpx;
  min-height: 194rpx;
  flex: 1;
  margin-top: -1rpx;
  background: linear-gradient(180deg, rgba(221, 120, 115, 0.72), rgba(221, 120, 115, 0.24));
}

.last-item .rail-line {
  background: linear-gradient(180deg, rgba(221, 120, 115, 0.72), transparent 82%);
}

.moment-card {
  align-self: start;
  min-height: 170rpx;
  margin-bottom: 36rpx;
  padding: 24rpx 25rpx 19rpx;
  box-sizing: border-box;
  overflow: hidden;
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 25rpx;
  background: rgba(252, 247, 241, 0.82);
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.9),
    0 13rpx 30rpx rgba(102, 70, 50, 0.09);
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);
}

.moment-card:active {
  opacity: 0.9;
  transform: scale(0.992);
}

.card-main {
  display: flex;
  min-height: 88rpx;
  align-items: stretch;
  gap: 19rpx;
}

.card-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.card-content {
  display: -webkit-box;
  overflow: hidden;
  color: #655247;
  font-size: 26rpx;
  font-weight: 500;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.media-layout {
  position: relative;
  display: grid;
  width: 152rpx;
  flex: 0 0 152rpx;
  gap: 8rpx;
}

.single-media .media-layout {
  grid-template-columns: 1fr;
}

.multiple-media .media-layout {
  grid-template-rows: repeat(2, 72rpx);
}

.moment-image {
  width: 100%;
  height: 100%;
  min-height: 72rpx;
  border-radius: 13rpx;
  background: #eee1d7;
}

.single-media .moment-image {
  height: 152rpx;
}

.media-count {
  position: absolute;
  right: 7rpx;
  bottom: 7rpx;
  display: flex;
  min-width: 39rpx;
  height: 31rpx;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  border-radius: 16rpx;
  background: rgba(69, 51, 42, 0.62);
  color: #fff;
  font-size: 19rpx;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 17rpx;
  padding-top: 15rpx;
  border-top: 1rpx solid rgba(218, 200, 188, 0.42);
}

.meta-left { display: flex; align-items: center; gap: 10rpx; }
.creator-tag { padding: 4rpx 10rpx; border-radius: 12rpx; background: #f8e3dd; color: #c56f6a; font-size: 18rpx; line-height: 1.2; }

.mood-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #9a8172;
  font-size: 21rpx;
}

.meta-time {
  color: #a79082;
  font-size: 21rpx;
}

.empty-state {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 92rpx 66rpx 0;
  padding: 48rpx 34rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 30rpx;
  background: rgba(252, 247, 241, 0.78);
  box-shadow: 0 15rpx 36rpx rgba(103, 72, 52, 0.08);
}

.empty-heart {
  display: flex;
  width: 78rpx;
  height: 78rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(234, 154, 145, 0.18);
}

.empty-title {
  margin-top: 23rpx;
  color: #5a493e;
  font-size: 30rpx;
  font-weight: 600;
}

.empty-copy {
  margin-top: 12rpx;
  color: #9a8375;
  font-size: 23rpx;
}

.empty-action {
  width: 240rpx;
  height: 66rpx;
  margin-top: 27rpx;
  padding: 0;
  border: 2rpx solid #df7772;
  border-radius: 34rpx;
  background: rgba(255, 252, 248, 0.5);
  color: #dc7470;
  font-size: 25rpx;
  line-height: 64rpx;
}

.empty-action::after {
  border: 0;
}

.scroll-spacer {
  height: 210rpx;
}

.bottom-bouquet {
  position: absolute;
  bottom: -40rpx;
  left: -34rpx;
  z-index: 1;
  width: 330rpx;
  height: 270rpx;
  opacity: 0.62;
  pointer-events: none;
}

.record-action {
  position: absolute;
  right: 43rpx;
  bottom: 29rpx;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.record-button {
  display: flex;
  width: 92rpx;
  height: 92rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #ec8580, #d96768);
  box-shadow: 0 12rpx 30rpx rgba(205, 91, 91, 0.31);
}

.record-action:active .record-button {
  transform: scale(0.94);
}

.record-label {
  color: #655248;
  font-size: 23rpx;
  font-weight: 500;
}

.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  background: rgba(61, 45, 36, 0.34);
}

.picker-sheet {
  width: 100%;
  padding: 18rpx 0 calc(env(safe-area-inset-bottom) + 24rpx);
  box-sizing: border-box;
  border-radius: 38rpx 38rpx 0 0;
  background: #fcf7f1;
  box-shadow: 0 -18rpx 54rpx rgba(65, 44, 31, 0.16);
}

.picker-handle {
  width: 70rpx;
  height: 7rpx;
  margin: 0 auto 27rpx;
  border-radius: 4rpx;
  background: #dfd5cc;
}

.picker-title {
  display: block;
  margin-bottom: 15rpx;
  color: #56453b;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
}

.month-picker-sheet {
  padding-right: 34rpx;
  padding-left: 34rpx;
}

.month-picker-view {
  width: 100%;
  height: 390rpx;
  margin-top: 2rpx;
}

.picker-item {
  display: flex;
  height: 88rpx;
  align-items: center;
  justify-content: center;
  color: #56453b;
  font-size: 30rpx;
}

.picker-item.disabled {
  color: #cfc4bc;
}

.month-picker-actions {
  display: flex;
  gap: 20rpx;
  padding: 18rpx 6rpx 0;
}

.month-action {
  display: flex;
  height: 78rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border-radius: 40rpx;
  font-size: 28rpx;
  line-height: 78rpx;
}

.month-action::after {
  border: 0;
}

.month-action-cancel {
  color: #77685e;
  background: #f2ebe4;
}

.month-action-confirm {
  color: #fff;
  background: linear-gradient(135deg, #eb7e77 0%, #dd696b 100%);
  box-shadow: 0 8rpx 20rpx rgba(208, 96, 91, 0.2);
}
</style>
