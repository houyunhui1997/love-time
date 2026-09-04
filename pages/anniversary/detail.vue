<template>
  <view
    class="detail-page"
    :class="{
      'compact-screen': isCompactScreen,
      'short-screen': isShortScreen
    }"
    :style="pageStyle"
  >
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <uni-icons type="left" size="28" color="#514238" />
      </view>
      <text class="nav-title">纪念日详情</text>
    </view>

    <!-- 主视觉区 -->
    <view class="hero-section">
      <view class="hero-content">
        <view class="title-row">
          <image class="title-type-icon" :src="typeIconSrc" mode="aspectFit" />
          <text class="hero-title">{{ anniversary?.title || '' }}</text>
        </view>
        <text class="hero-subtitle">距离下一次纪念日</text>
        <view class="days-row">
          <text class="days-number">{{ daysLeft }}</text>
          <text class="days-unit">天</text>
        </view>
        <text class="target-date">目标日 {{ displayTargetDate }} {{ weekday }}</text>
      </view>
      <view class="hero-illustration">
        <image
          class="heart-art"
          src="/static/anniversary/heart-detail.png"
          mode="aspectFit"
        />
      </view>
    </view>

    <!-- 信息卡片 -->
    <view class="info-card">
      <view class="info-row">
        <text class="info-label">开始日期</text>
        <text class="info-value">{{ displayStartDate }}</text>
      </view>
      <view class="info-divider" />
      <view class="info-row">
        <text class="info-label">已经相伴</text>
        <view class="info-value-highlight">
          <text class="highlight-number">{{ togetherDays }}</text>
          <text class="highlight-unit">天</text>
        </view>
      </view>
      <view class="info-divider" />
      <view class="info-row">
        <text class="info-label">重复方式</text>
        <text class="info-value">{{ repeatLabel }}</text>
      </view>
      <view class="info-divider" />
      <view class="info-row">
        <text class="info-label">提醒时间</text>
        <text class="info-value">{{ reminderLabel }}</text>
      </view>
      <view class="info-divider" />
      <view class="info-row">
        <text class="info-label">备注</text>
        <text class="info-value">{{ anniversary?.note || '暂无备注' }}</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="action-buttons">
      <button class="edit-button" @tap="goToEdit">编辑纪念日</button>
      <button class="delete-button" @tap="onDelete">删除纪念日</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { differenceInCalendarDays, formatBusinessDate, getNextYearlyOccurrence } from '@/utils/date'
import { getAnniversary, removeAnniversary, type AnniversaryListItem } from '@/services/anniversary'

const anniversary = ref<AnniversaryListItem | null>(null)
const loading = ref(false)

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
const viewportHeight = Number(systemInfo.windowHeight || systemInfo.screenHeight || 667)
const isCompactScreen = viewportHeight < 760
const isShortScreen = viewportHeight < 690
const pageStyle = {
  '--menu-top': `${navigationMetrics.top}px`,
  '--menu-height': `${navigationMetrics.height}px`
}

const today = formatBusinessDate(new Date())

const typeIconSrc = computed(() => {
  const iconMap = {
    birthday: '/static/anniversary/birthday-cake.png',
    countdown: '/static/anniversary/countdown-day.png',
    anniversary: '/static/anniversary/anniversary-heart.png'
  } as const

  return iconMap[anniversary.value?.eventType || 'anniversary'] || iconMap.anniversary
})

const daysLeft = computed(() => {
  if (!anniversary.value) return 0
  const target = anniversary.value.targetDate
  if (anniversary.value.repeatType === 'yearly') {
    const next = getNextYearlyOccurrence(target, today)
    return Math.max(0, differenceInCalendarDays(next, today))
  }
  return Math.max(0, differenceInCalendarDays(target, today))
})

const displayTargetDate = computed(() => {
  if (!anniversary.value) return ''
  const target = anniversary.value.targetDate
  if (anniversary.value.repeatType === 'yearly') {
    return getNextYearlyOccurrence(target, today).replace(/-/g, '.')
  }
  return target.replace(/-/g, '.')
})

const weekday = computed(() => {
  if (!anniversary.value) return ''
  const target = anniversary.value.targetDate
  let dateStr = target
  if (anniversary.value.repeatType === 'yearly') {
    dateStr = getNextYearlyOccurrence(target, today)
  }
  const date = new Date(dateStr.replace(/-/g, '/'))
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[date.getDay()]
})

const displayStartDate = computed(() => {
  if (!anniversary.value) return ''
  return anniversary.value.targetDate.replace(/-/g, '.')
})

const togetherDays = computed(() => {
  if (!anniversary.value) return 0
  return Math.max(0, differenceInCalendarDays(today, anniversary.value.targetDate))
})

const repeatLabel = computed(() => {
  return anniversary.value?.repeatType === 'yearly' ? '每年' : '不重复'
})

const reminderLabel = computed(() => {
  if (!anniversary.value) return ''
  const offsets = anniversary.value.reminderOffsetDays || []
  if (offsets.length === 0) return '不提醒'
  const map: Record<number, string> = { 0: '当天', 1: '提前 1 天', 3: '提前 3 天', 7: '提前 7 天' }
  return offsets.map(d => map[d] || `提前 ${d} 天`).join('、')
})

onLoad(async (options) => {
  if (!options?.id) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    return
  }
  loading.value = true
  try {
    anniversary.value = await getAnniversary(options.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : '纪念日加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
})

function goBack() {
  uni.navigateBack()
}

function goToEdit() {
  if (!anniversary.value) return
  uni.navigateTo({ url: `/pages/anniversary/edit?id=${anniversary.value._id}` })
}

async function onDelete() {
  if (!anniversary.value) return
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，是否继续？',
    confirmColor: '#db7470',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await removeAnniversary(anniversary.value!._id)
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
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  box-sizing: border-box;
  padding-bottom: calc(var(--love-safe-bottom) + 20rpx);
  overflow: hidden;
  background:
    radial-gradient(circle at 88% 10%, rgba(255, 251, 246, 0.72), transparent 34%),
    linear-gradient(180deg, #fbf2e9 0%, #fcf7f1 46%, #faf4ec 100%);
  color: #57483e;
}

/* 顶部导航与微信胶囊对齐 */
.nav-bar {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(var(--menu-top) + var(--menu-height) + 24rpx);
}

.nav-back {
  position: absolute;
  top: var(--menu-top);
  left: 34rpx;
  display: flex;
  width: 66rpx;
  height: var(--menu-height);
  align-items: center;
  justify-content: center;
}

.nav-title {
  position: absolute;
  top: var(--menu-top);
  right: 132rpx;
  left: 132rpx;
  height: var(--menu-height);
  color: #4d3d32;
  font-size: 38rpx;
  font-weight: 600;
  line-height: var(--menu-height);
  text-align: center;
}

/* 主视觉区 */
.hero-section {
  position: relative;
  height: 466rpx;
  margin-top: 18rpx;
}

.hero-content {
  position: absolute;
  top: 42rpx;
  left: 58rpx;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.title-type-icon {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
}

.hero-title {
  color: #524136;
  font-size: 37rpx;
  font-weight: 600;
  line-height: 1.3;
}

.hero-subtitle {
  margin-top: 32rpx;
  color: #66554a;
  font-size: 28rpx;
  line-height: 1.4;
}

.days-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 24rpx;
}

.days-number {
  color: #d9706d;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 138rpx;
  font-weight: 300;
  line-height: 0.9;
}

.days-unit {
  color: #59483d;
  font-size: 32rpx;
}

.target-date {
  margin-top: 28rpx;
  color: #66554a;
  font-size: 27rpx;
  line-height: 1.4;
}

.hero-illustration {
  position: absolute;
  top: 2rpx;
  right: -8rpx;
  width: 430rpx;
  height: 434rpx;
}

.heart-art {
  width: 100%;
  height: 100%;
}

/* 玻璃信息卡片 */
.info-card {
  position: relative;
  z-index: 2;
  margin: 0 48rpx;
  padding: 8rpx 42rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 32rpx;
  background: rgba(252, 247, 241, 0.78);
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.9),
    0 15rpx 36rpx rgba(99, 69, 48, 0.09);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}

.info-row {
  display: flex;
  min-height: 112rpx;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 4rpx;
}

.info-label {
  flex-shrink: 0;
  color: #57473c;
  font-size: 29rpx;
  font-weight: 500;
}

.info-value {
  max-width: 410rpx;
  color: #625249;
  font-size: 28rpx;
  line-height: 1.4;
  text-align: right;
}

.info-value-highlight {
  display: flex;
  align-items: baseline;
  gap: 9rpx;
}

.highlight-number {
  color: #dc7771;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 39rpx;
  font-weight: 500;
}

.highlight-unit {
  color: #625249;
  font-size: 27rpx;
}

.info-divider {
  height: 1rpx;
  background: rgba(218, 206, 196, 0.3);
}

/* 底部操作 */
.action-buttons {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  margin-top: 54rpx;
}

.edit-button {
  display: flex;
  width: 540rpx;
  height: 90rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 46rpx;
  background: linear-gradient(135deg, #e98079 0%, #db6b6a 100%);
  box-shadow: 0 12rpx 28rpx rgba(207, 99, 94, 0.23);
  color: #fff;
  font-size: 33rpx;
  font-weight: 500;
  line-height: 90rpx;

  &::after {
    border: 0;
  }

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

.delete-button {
  display: flex;
  height: 66rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 32rpx;
  border: 0;
  background: transparent;
  color: #9a8376;
  font-size: 27rpx;
  line-height: 66rpx;

  &::after {
    border: 0;
  }

  &:active {
    color: var(--love-color-danger);
  }
}

.detail-page.compact-screen {
  .hero-section {
    height: 424rpx;
    margin-top: 8rpx;
  }

  .hero-content {
    top: 32rpx;
  }

  .hero-title {
    font-size: 34rpx;
  }

  .hero-subtitle {
    margin-top: 25rpx;
    font-size: 26rpx;
  }

  .days-row {
    margin-top: 20rpx;
  }

  .days-number {
    font-size: 124rpx;
  }

  .target-date {
    margin-top: 22rpx;
    font-size: 25rpx;
  }

  .hero-illustration {
    top: -2rpx;
    right: -8rpx;
    width: 418rpx;
    height: 422rpx;
  }

  .info-row {
    min-height: 101rpx;
    padding-top: 14rpx;
    padding-bottom: 14rpx;
  }

  .action-buttons {
    margin-top: 42rpx;
  }
}

.detail-page.short-screen {
  .nav-bar {
    height: calc(var(--menu-top) + var(--menu-height) + 14rpx);
  }

  .hero-section {
    height: 360rpx;
    margin-top: 0;
  }

  .hero-content {
    top: 20rpx;
  }

  .hero-subtitle {
    margin-top: 18rpx;
  }

  .days-number {
    font-size: 108rpx;
  }

  .target-date {
    margin-top: 16rpx;
  }

  .hero-illustration {
    top: -8rpx;
    right: -8rpx;
    width: 360rpx;
    height: 364rpx;
  }

  .info-row {
    min-height: 88rpx;
  }

  .action-buttons {
    margin-top: 28rpx;
  }

  .edit-button {
    height: 82rpx;
    line-height: 82rpx;
  }
}
</style>
