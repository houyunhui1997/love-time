<template>
  <view class="all-anniversaries" :style="pageStyle">
    <view class="top-nav">
      <view class="back-button" aria-label="返回" @tap="goBack">
        <uni-icons type="left" size="25" color="#514137" />
      </view>
      <text class="page-title">全部纪念日</text>
    </view>

    <view class="filter-bar">
      <view
        v-for="filter in filters"
        :key="filter.value"
        class="filter-item"
        :class="{ active: activeFilter === filter.value }"
        @tap="selectFilter(filter.value)"
      >
        <text class="filter-label">{{ filter.label }}</text>
        <view class="filter-underline" />
      </view>
    </view>

    <scroll-view class="list-scroll" scroll-y :show-scrollbar="false">
      <view v-if="!loading && !groupedItems.length" class="state-panel empty-panel">
        <image class="empty-image" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/home/empty-calendar-heart.png" mode="aspectFit" />
        <text class="empty-title">还没有纪念日</text>
        <text class="state-text">去添加一个值得珍藏的日子吧</text>
        <button class="empty-add" @tap="goToAdd">添加纪念日</button>
      </view>

      <view v-else class="month-list">
        <view v-for="group in groupedItems" :key="group.key" class="month-group">
          <view class="month-heading">
            <text class="month-label">{{ group.label }}</text>
            <view class="month-line" />
            <image class="month-sprig" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/timeline/card-sprig-cream.png" mode="aspectFit" />
          </view>

          <view
            v-for="item in group.items"
            :key="item._id"
            class="anniversary-row"
            @tap="goToDetail(item._id)"
          >
            <image class="type-icon" :src="item.iconSrc" mode="aspectFit" />
            <view class="row-copy">
              <text class="row-title">{{ item.title }}</text>
              <text v-if="item.visibility === 'couple'" class="creator-tag">{{ item.isMine ? '由我创建' : `由${item.creatorName}创建` }}</text>
              <text class="row-countdown" :class="{ elapsed: item.daysDiff < 0 }">
                {{ item.countdownText }}
              </text>
            </view>
            <view class="row-date-wrap">
              <text class="row-date">{{ item.displayDate }}</text>
              <uni-icons type="right" size="19" color="#b3a69d" />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <image
      class="bottom-bouquet"
      src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/all-list-bottom-bouquet.png"
      mode="aspectFit"
    />

    <view class="add-fab" aria-label="添加纪念日" @tap="goToAdd">
      <text class="add-symbol">＋</text>
    </view>

    <LoveLoading :visible="loading && !allItems.length" fullscreen text="正在加载纪念日" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { listAnniversaries, type AnniversaryListItem } from '@/services/anniversary'
import { restoreWeixinSession } from '@/services/auth'
import {
  differenceInCalendarDays,
  formatBusinessDate,
  getNextYearlyOccurrence
} from '@/utils/date'

type FilterValue = 'all' | 'countdown' | 'anniversary' | 'birthday'

interface DisplayItem extends AnniversaryListItem {
  occurrenceDate: string
  displayDate: string
  daysDiff: number
  countdownText: string
  iconSrc: string
}

interface MonthGroup {
  key: string
  label: string
  items: DisplayItem[]
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

const filters: Array<{ label: string; value: FilterValue }> = [
  { label: '全部', value: 'all' },
  { label: '倒数日', value: 'countdown' },
  { label: '纪念日', value: 'anniversary' },
  { label: '生日', value: 'birthday' }
]

const iconMap: Record<Exclude<FilterValue, 'all'>, string> = {
  countdown: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/countdown-day.png',
  anniversary: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/anniversary-heart.png',
  birthday: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/birthday-cake.png'
}

const activeFilter = ref<FilterValue>('all')
const allItems = ref<DisplayItem[]>([])
const loading = ref(false)
const today = formatBusinessDate(new Date())

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return allItems.value
  return allItems.value.filter((item) => item.eventType === activeFilter.value)
})

const groupedItems = computed<MonthGroup[]>(() => {
  const currentYear = today.slice(0, 4)
  const groups = new Map<string, DisplayItem[]>()

  filteredItems.value.forEach((item) => {
    const key = item.occurrenceDate.slice(0, 7)
    const existing = groups.get(key) || []
    existing.push(item)
    groups.set(key, existing)
  })

  return Array.from(groups.entries()).map(([key, items]) => {
    const [year, month] = key.split('-')
    const monthNumber = Number(month)
    return {
      key,
      label: year === currentYear ? `${monthNumber}月` : `${year}年${monthNumber}月`,
      items
    }
  })
})

function toDisplayItem(item: AnniversaryListItem): DisplayItem {
  const occurrenceDate = item.repeatType === 'yearly'
    ? getNextYearlyOccurrence(item.targetDate, today)
    : item.targetDate
  const daysDiff = differenceInCalendarDays(occurrenceDate, today)

  return {
    ...item,
    occurrenceDate,
    displayDate: occurrenceDate.replace(/-/g, '.'),
    daysDiff,
    countdownText: daysDiff >= 0 ? `还有${daysDiff}天` : `已过${Math.abs(daysDiff)}天`,
    iconSrc: iconMap[item.eventType] || iconMap.anniversary
  }
}

async function loadAllItems() {
  if (loading.value) return
  loading.value = true

  try {
    const records: AnniversaryListItem[] = []
    let cursor: string | undefined
    let hasMore = true

    while (hasMore) {
      const page = await listAnniversaries(cursor)
      records.push(...page.list)
      hasMore = page.hasMore && Boolean(page.nextCursor)
      cursor = page.nextCursor || undefined
    }

    allItems.value = records
      .map(toDisplayItem)
      .sort((a, b) => {
        const dateOrder = a.occurrenceDate.localeCompare(b.occurrenceDate)
        if (dateOrder !== 0) return dateOrder
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return a.title.localeCompare(b.title, 'zh-CN')
      })
  } catch (error) {
    const message = error instanceof Error ? error.message : '纪念日加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

onShow(async () => {
  const loggedIn = await restoreWeixinSession()
  if (!loggedIn) {
    uni.showToast({ title: '暂时无法连接服务', icon: 'none' })
    setTimeout(goBack, 500)
    return
  }

  await loadAllItems()
})

function selectFilter(value: FilterValue) {
  activeFilter.value = value
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/anniversary/index' }) })
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/anniversary/detail?id=${id}` })
}

function goToAdd() {
  uni.navigateTo({ url: '/pages/anniversary/edit' })
}
</script>

<style scoped lang="scss">
.all-anniversaries {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 0%, rgba(242, 193, 180, 0.3), transparent 32%),
    linear-gradient(180deg, #f8e6de 0%, #fbf1ea 18%, #fcf7f1 44%, #fcf8f2 100%);
  color: #514137;
}

.top-nav {
  position: relative;
  z-index: 3;
  flex: 0 0 auto;
  height: calc(var(--menu-top) + var(--menu-height) + 30rpx);
  padding-top: var(--menu-top);
}

.back-button {
  position: absolute;
  top: var(--menu-top);
  left: 34rpx;
  display: flex;
  width: 64rpx;
  height: var(--menu-height);
  align-items: center;
  justify-content: flex-start;
}

.page-title {
  display: block;
  height: var(--menu-height);
  color: #514137;
  font-size: 37rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  line-height: var(--menu-height);
  text-align: center;
}

.filter-bar {
  position: relative;
  z-index: 3;
  display: flex;
  flex: 0 0 102rpx;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 58rpx 12rpx;
}

.filter-item {
  display: flex;
  min-width: 92rpx;
  height: 82rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.filter-label {
  color: #514137;
  font-size: 29rpx;
  font-weight: 500;
  line-height: 1.3;
}

.filter-underline {
  width: 48rpx;
  height: 5rpx;
  margin-top: 16rpx;
  border-radius: 4rpx;
  background: transparent;
}

.filter-item.active {
  .filter-label {
    color: #d96f6b;
    font-weight: 600;
  }

  .filter-underline {
    background: #df7772;
    box-shadow: 0 3rpx 8rpx rgba(219, 116, 112, 0.2);
  }
}

.list-scroll {
  position: relative;
  z-index: 2;
  min-height: 0;
  flex: 1;
}

.month-list {
  padding: 8rpx 58rpx calc(230rpx + env(safe-area-inset-bottom));
}

.month-group + .month-group {
  margin-top: 34rpx;
}

.month-heading {
  display: flex;
  height: 66rpx;
  align-items: center;
}

.month-label {
  flex: 0 0 auto;
  color: #514137;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 38rpx;
  font-weight: 500;
  line-height: 1;
}

.month-line {
  height: 1rpx;
  flex: 1;
  margin-left: 18rpx;
  background: rgba(216, 191, 173, 0.6);
}

.month-sprig {
  width: 38rpx;
  height: 32rpx;
  margin-left: -4rpx;
  opacity: 0.55;
  transform: rotate(9deg);
}

.anniversary-row {
  display: flex;
  min-height: 142rpx;
  align-items: center;
  gap: 24rpx;
  padding: 18rpx 0 10rpx;
}

.anniversary-row + .anniversary-row {
  margin-top: 8rpx;
  border-top: 1rpx solid rgba(229, 214, 202, 0.52);
}

.type-icon {
  width: 96rpx;
  height: 96rpx;
  flex: 0 0 auto;
}

.row-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 10rpx;
}

.row-title {
  overflow: hidden;
  color: #49372c;
  font-size: 31rpx;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-tag { align-self: flex-start; margin-top: 6rpx; padding: 3rpx 9rpx; border-radius: 10rpx; background: #f8e3dd; color: #c56f6a; font-size: 17rpx; line-height: 1.2; }

.row-countdown {
  color: #db7470;
  font-size: 27rpx;
  font-weight: 400;
  line-height: 1.25;
}

.row-countdown.elapsed {
  color: #a99a90;
}

.row-date-wrap {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12rpx;
}

.row-date {
  color: #94877d;
  font-size: 25rpx;
  line-height: 1.3;
}

.bottom-bouquet {
  position: fixed;
  bottom: -38rpx;
  left: -60rpx;
  z-index: 1;
  width: 500rpx;
  height: 340rpx;
  opacity: 0.92;
  pointer-events: none;
}

.add-fab {
  position: fixed;
  right: 48rpx;
  bottom: calc(42rpx + env(safe-area-inset-bottom));
  z-index: 5;
  display: flex;
  width: 104rpx;
  height: 104rpx;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  border-radius: 50%;
  background: linear-gradient(145deg, #e7847f 0%, #d96766 100%);
  box-shadow: 0 14rpx 32rpx rgba(190, 88, 85, 0.3);
}

.add-symbol {
  margin-top: -5rpx;
  color: #fff;
  font-size: 59rpx;
  font-weight: 200;
  line-height: 1;
}

.state-panel {
  display: flex;
  min-height: 520rpx;
  align-items: center;
  justify-content: center;
  padding: 80rpx 48rpx 220rpx;
}

.state-text {
  color: #94877d;
  font-size: 26rpx;
  line-height: 1.5;
  text-align: center;
}

.empty-panel {
  flex-direction: column;
}

.empty-image {
  width: 164rpx;
  height: 174rpx;
  margin-bottom: 20rpx;
}

.empty-title {
  margin-bottom: 8rpx;
  color: #514137;
  font-size: 31rpx;
  font-weight: 600;
}

.empty-add {
  display: flex;
  height: 66rpx;
  align-items: center;
  justify-content: center;
  margin-top: 28rpx;
  padding: 0 38rpx;
  border: 2rpx solid #df7772;
  border-radius: 36rpx;
  background: rgba(252, 247, 241, 0.56);
  color: #d96f6b;
  font-size: 25rpx;
  line-height: 66rpx;

  &::after {
    border: 0;
  }
}

@media screen and (max-height: 700px) {
  .filter-bar {
    flex-basis: 88rpx;
  }

  .filter-item {
    height: 72rpx;
  }

  .month-group + .month-group {
    margin-top: 24rpx;
  }

  .anniversary-row {
    min-height: 126rpx;
  }

  .type-icon {
    width: 84rpx;
    height: 84rpx;
  }
}
</style>
