<template>
  <view
    class="anniversary-page"
    :class="{
      'compact-screen': isCompactScreen,
      'short-screen': isShortScreen
    }"
    :style="pageStyle"
  >
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-title">恋时光纪念日</text>
    </view>

    <!-- 静默连接失败时允许用户主动重试 -->
    <view v-if="sessionError" class="guest-home">
      <image
        class="guest-hero-art"
        src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/home/empty-hero-memory-book.png"
        mode="aspectFit"
      />
      <text class="guest-heading">暂时无法连接服务</text>
      <text class="guest-subtitle">请检查网络后重试，你的记录都会保存在服务器</text>
      <button class="guest-login-button" @tap="retrySession">
        <text>重新连接</text>
      </button>
    </view>

    <template v-else>
      <!-- 主视觉区 -->
      <view class="hero-section">
        <view v-if="profile?.loveStartDate" class="together-block">
          <text class="together-label">我们在一起</text>
          <view class="days-row">
            <text class="days-number">{{ togetherDays }}</text>
            <text class="days-unit">天</text>
          </view>
          <text class="start-date">始于 {{ displayStartDate }}</text>
        </view>
        <view v-else class="together-block profile-guide">
          <text class="together-label">我们在一起</text>
          <view class="days-row">
            <text class="days-number unknown-days">？</text>
            <text class="days-unit">天</text>
          </view>
          <button class="profile-guide-button" @tap="goToProfileSetup">完善资料</button>
        </view>
        <view class="hero-illustration">
          <image
            class="couple-art"
            src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/couple-silhouette.png"
            mode="aspectFit"
          />
        </view>
      </view>

      <!-- 最近纪念日 -->
      <view class="section-title">
        <view class="section-heading">
          <text class="section-title-text">最近纪念日</text>
          <view class="title-line" />
        </view>
        <view v-if="!empty" class="view-all" @tap="goToAll">
          <text class="view-all-text">查看全部</text>
          <view class="view-all-arrow" />
        </view>
      </view>

      <view v-if="!empty" class="anniversary-list">
        <view
          v-for="item in recentAnniversaries"
          :key="item._id"
          class="anniversary-item"
          @tap="goToDetail(item._id)"
        >
          <image class="type-icon" :src="item.iconSrc" mode="aspectFit" />
          <view class="item-info">
            <text class="item-title">{{ item.title }}</text>
            <view v-if="item.daysLeft === 0" class="item-countdown">
              <text class="countdown-today">今天到啦</text>
            </view>
            <view v-else class="item-countdown">
              <text class="countdown-label">{{ item.daysLeft < 0 ? '已过' : '还有' }}</text>
              <text class="countdown-days">{{ Math.abs(item.daysLeft) }}</text>
              <text class="countdown-unit">天</text>
            </view>
          </view>
          <view class="item-date">
            <text class="date-text">{{ item.targetDate }}</text>
            <view class="arrow-right" />
          </view>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-anniversary-card">
        <image
          class="empty-calendar-art"
          src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/home/empty-calendar-heart.png"
          mode="aspectFit"
        />
        <view class="empty-card-copy">
          <text class="empty-card-title">还没有纪念日</text>
          <text class="empty-card-subtitle">添加第一个属于你们的日子</text>
          <button class="empty-add-button" @tap="goToAdd">添加第一个纪念日</button>
        </view>
      </view>

      <!-- 底部装饰 -->
      <view v-if="!empty" class="bottom-decoration">
        <image
          class="flower-decoration"
          src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/flower-decoration.png"
          mode="aspectFit"
        />
      </view>

      <!-- 添加按钮 -->
      <view v-if="!empty" class="fab-add" @tap="goToAdd">
        <view class="fab-icon">+</view>
        <text class="fab-label">添加纪念日</text>
      </view>
    </template>

    <LoveLoginDialog v-model="showProfileDialog" @success="onProfileSaved" />
    <LoveLoading :visible="loading" fullscreen text="正在加载纪念日" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import LoveLoginDialog from '@/components/auth/LoveLoginDialog.vue'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { differenceInCalendarDays, formatBusinessDate, getNextYearlyOccurrence } from '@/utils/date'
import { getMyLoveProfile, type CompleteProfileResult, type LoveProfile } from '@/services/profile'
import { restoreWeixinSession } from '@/services/auth'
import { listAnniversaries, type AnniversaryListItem } from '@/services/anniversary'

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
const viewportWidth = Number(systemInfo.windowWidth || systemInfo.screenWidth || 375)
const viewportRatio = viewportHeight / Math.max(viewportWidth, 1)
const isCompactScreen = viewportHeight < 760 || viewportRatio < 1.9
const isShortScreen = viewportHeight < 680 || viewportRatio < 1.72

const pageStyle = {
  '--menu-top': `${navigationMetrics.top}px`,
  '--menu-height': `${navigationMetrics.height}px`
}

interface AnniversaryItem {
  _id: string
  title: string
  targetDate: string
  daysLeft: number
  iconSrc: string
  eventType: string
}

const profile = ref<LoveProfile | null>(null)
const today = ref(formatBusinessDate(new Date()))

const togetherDays = computed(() => {
  if (!profile.value?.loveStartDate) return 0
  return Math.max(0, differenceInCalendarDays(today.value, profile.value.loveStartDate))
})

const displayStartDate = computed(() => {
  const date = profile.value?.loveStartDate || ''
  return date.replace(/-/g, '.')
})

const recentAnniversaries = ref<AnniversaryItem[]>([])
const loading = ref(false)
const empty = ref(false)
const sessionError = ref(false)
const showProfileDialog = ref(false)

function mapItem(item: AnniversaryListItem): AnniversaryItem {
  const isYearly = item.repeatType === 'yearly'
  const nextDate = isYearly ? getNextYearlyOccurrence(item.targetDate, today.value) : item.targetDate
  const daysLeft = differenceInCalendarDays(nextDate, today.value)

  const iconMap: Record<string, string> = {
    birthday: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/birthday-cake-paper.png',
    countdown: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/countdown-day-paper.png',
    anniversary: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/anniversary-heart-paper.png'
  }

  return {
    _id: item._id,
    title: item.title,
    targetDate: nextDate.replace(/-/g, '.'),
    daysLeft,
    iconSrc: iconMap[item.eventType] || iconMap.anniversary,
    eventType: item.eventType
  }
}

async function loadData() {
  loading.value = true
  try {
    profile.value = await getMyLoveProfile()
  } catch {
    profile.value = null
  }

  try {
    const page = await listAnniversaries()
    const sorted = [...page.list].sort((a, b) => {
      const aLeft = a.repeatType === 'yearly'
        ? differenceInCalendarDays(getNextYearlyOccurrence(a.targetDate, today.value), today.value)
        : differenceInCalendarDays(a.targetDate, today.value)
      const bLeft = b.repeatType === 'yearly'
        ? differenceInCalendarDays(getNextYearlyOccurrence(b.targetDate, today.value), today.value)
        : differenceInCalendarDays(b.targetDate, today.value)
      if ((aLeft < 0) !== (bLeft < 0)) return aLeft < 0 ? 1 : -1
      return aLeft < 0 ? bLeft - aLeft : aLeft - bLeft
    })
    recentAnniversaries.value = sorted.slice(0, 3).map(mapItem)
    empty.value = recentAnniversaries.value.length === 0
  } catch (error) {
    const message = error instanceof Error ? error.message : '纪念日加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

onShow(async () => {
  today.value = formatBusinessDate(new Date())
  loading.value = true
  sessionError.value = !(await restoreWeixinSession())
  if (sessionError.value) {
    recentAnniversaries.value = []
    empty.value = false
    loading.value = false
    return
  }
  await loadData()
})

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/anniversary/detail?id=${id}` })
}

function goToAll() {
  uni.navigateTo({ url: '/pages/anniversary/list' })
}

function goToAdd() {
  uni.navigateTo({ url: '/pages/anniversary/edit' })
}

async function retrySession() {
  loading.value = true
  sessionError.value = !(await restoreWeixinSession())
  if (sessionError.value) {
    loading.value = false
    return
  }
  await loadData()
}

function goToProfileSetup() {
  showProfileDialog.value = true
}

function onProfileSaved(result: CompleteProfileResult) {
  profile.value = result.profile
}
</script>

<style scoped lang="scss">
.anniversary-page {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: auto;
  height: auto;
  min-height: 0;
  padding: 0;
  background: linear-gradient(
    180deg,
    #f6dfd7 0%,
    #f9e9e2 10%,
    #fbf2eb 23%,
    #fcf7f1 42%,
    #fcf8f2 68%,
    #fbf6ef 100%
  );
  overflow: hidden;
}

/* 顶部导航 */
.nav-bar {
  display: flex;
  align-items: center;
  height: calc(var(--menu-top) + var(--menu-height));
  padding: var(--menu-top) 48rpx 0;
}

.nav-title {
  font-size: 37rpx;
  font-weight: 600;
  line-height: var(--menu-height);
  letter-spacing: 1rpx;
  color: #514137;
}

/* 服务连接失败状态 */
.guest-home {
  position: absolute;
  top: calc(var(--menu-top) + var(--menu-height));
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 38rpx;
}

.guest-hero-art {
  width: 510rpx;
  height: 442rpx;
}

.guest-heading,
.guest-subtitle,
.guest-login-tip {
  display: block;
  text-align: center;
}

.guest-heading {
  margin-top: 14rpx;
  color: #5b493e;
  font-size: 34rpx;
  font-weight: 500;
  line-height: 1.45;
}

.guest-subtitle {
  margin-top: 24rpx;
  color: #987f70;
  font-size: 27rpx;
  line-height: 1.5;
}

.guest-login-button {
  display: flex;
  width: 440rpx;
  height: 86rpx;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  margin-top: 38rpx;
  padding: 0;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #ea817b 0%, #da6968 100%);
  box-shadow: 0 12rpx 28rpx rgba(207, 100, 96, 0.22);
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
  line-height: 86rpx;

  &::after {
    border: 0;
  }
}

.guest-login-tip {
  margin-top: 24rpx;
  color: #9b8476;
  font-size: 23rpx;
  line-height: 1.5;
}

/* 主视觉区 */
.hero-section {
  position: relative;
  height: 518rpx;
  margin-top: 12rpx;
  margin-bottom: 22rpx;
}

.together-block {
  position: absolute;
  top: 96rpx;
  left: 60rpx;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.together-label {
  font-size: 32rpx;
  font-weight: 500;
  line-height: 1.25;
  color: #59483d;
}

.days-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 36rpx;
}

.days-number {
  font-size: 124rpx;
  font-weight: 300;
  line-height: 0.92;
  color: var(--love-color-primary);
  font-family: Georgia, 'Times New Roman', serif;
}

.days-unit {
  font-size: 28rpx;
  color: #59483d;
}

.start-date {
  margin-top: 34rpx;
  font-size: 26rpx;
  line-height: 1.3;
  color: #69584c;
}

.profile-guide {
  max-width: 350rpx;
}

.days-number.unknown-days {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 40rpx;
  font-weight: 500;
  line-height: 1.4;
}

.profile-guide-button {
  height: 60rpx;
  margin: 28rpx 0 0;
  padding: 0 26rpx;
  border: 2rpx solid #df7772;
  border-radius: 30rpx;
  background: rgba(255, 252, 248, 0.5);
  color: #d87570;
  font-size: 23rpx;
  line-height: 56rpx;
}

.profile-guide-button::after { border: 0; }

/* 插画区 */
.hero-illustration {
  position: absolute;
  top: -12rpx;
  right: -60rpx;
  width: 482rpx;
  height: 576rpx;
}

.couple-art {
  width: 100%;
  height: 100%;
}

/* 最近纪念日标题 */
.section-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin: 0 58rpx 12rpx;
}

.section-heading {
  display: flex;
  flex-direction: column;
}

.section-title-text {
  font-size: 33rpx;
  font-weight: 600;
  line-height: 1.25;
  color: #514137;
}

.title-line {
  width: 60rpx;
  height: 3rpx;
  margin-top: 12rpx;
  background: var(--love-color-primary);
  border-radius: 3rpx;
  opacity: 0.8;
}

.view-all {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-height: 48rpx;
  padding-top: 2rpx;
}

.view-all-text {
  font-size: 24rpx;
  line-height: 1.4;
  color: var(--love-color-text-secondary);
}

.view-all-arrow {
  width: 11rpx;
  height: 11rpx;
  border-top: 2rpx solid var(--love-color-text-secondary);
  border-right: 2rpx solid var(--love-color-text-secondary);
  transform: rotate(45deg);
  opacity: 0.65;
}

/* 纪念日列表 */
.anniversary-list {
  display: flex;
  flex-direction: column;
  margin: 0 60rpx;
}

.anniversary-item {
  display: flex;
  align-items: center;
  min-height: 148rpx;
  gap: 26rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid rgba(222, 205, 192, 0.5);
}

.anniversary-item:last-child {
  border-bottom: none;
}

.type-icon {
  width: 96rpx;
  height: 96rpx;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.item-title {
  font-size: 33rpx;
  font-weight: 600;
  line-height: 1.2;
  color: var(--love-color-text);
}

.item-countdown {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.countdown-label {
  font-size: 26rpx;
  color: var(--love-color-primary);
}

.countdown-days {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--love-color-primary);
}

.countdown-today {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--love-color-primary);
}

.countdown-unit {
  font-size: 26rpx;
  color: var(--love-color-primary);
}

.item-date {
  display: flex;
  align-items: center;
  gap: 18rpx;
  flex-shrink: 0;
}

.date-text {
  font-size: 25rpx;
  color: var(--love-color-text-secondary);
}

.arrow-right {
  width: 16rpx;
  height: 16rpx;
  border-top: 2rpx solid var(--love-color-text-secondary);
  border-right: 2rpx solid var(--love-color-text-secondary);
  transform: rotate(45deg);
  opacity: 0.55;
}

.empty-state {
  padding: 48rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: var(--love-color-text-secondary);
}

/* 暂无纪念日 */
.empty-anniversary-card {
  display: flex;
  height: 270rpx;
  align-items: center;
  margin: 26rpx 56rpx 0;
  padding: 26rpx 30rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 30rpx;
  background: rgba(252, 247, 241, 0.82);
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.9),
    0 14rpx 34rpx rgba(98, 67, 45, 0.09);
  backdrop-filter: blur(18rpx);
  -webkit-backdrop-filter: blur(18rpx);
}

.empty-calendar-art {
  width: 150rpx;
  height: 162rpx;
  flex-shrink: 0;
}

.empty-card-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  margin-left: 26rpx;
}

.empty-card-title {
  color: #5c4b40;
  font-size: 31rpx;
  font-weight: 500;
  line-height: 1.4;
}

.empty-card-subtitle {
  margin-top: 16rpx;
  color: #988174;
  font-size: 23rpx;
  line-height: 1.45;
}

.empty-add-button {
  display: flex;
  min-width: 260rpx;
  height: 62rpx;
  align-items: center;
  justify-content: center;
  margin: 26rpx 0 0;
  padding: 0 24rpx;
  border: 2rpx solid #df7772;
  border-radius: 34rpx;
  background: rgba(255, 252, 248, 0.48);
  color: #d87570;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 62rpx;

  &::after {
    border: 0;
  }
}

/* 底部装饰 */
.bottom-decoration {
  position: absolute;
  bottom: -20rpx;
  left: -18rpx;
  width: 430rpx;
  height: 270rpx;
  pointer-events: none;
  opacity: 0.42;
}

.flower-decoration {
  width: 100%;
  height: 100%;
}

/* 添加按钮 */
.fab-add {
  position: fixed;
  right: 50rpx;
  bottom: max(12rpx, calc(var(--love-safe-bottom) - 44rpx));
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}

.fab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: var(--love-color-primary);
  color: #fff;
  font-size: 54rpx;
  font-weight: 100;
  box-shadow: 0 10rpx 32rpx rgba(219, 116, 112, 0.35);
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.92);
  }
}

.fab-label {
  font-size: 26rpx;
  line-height: 1.2;
  color: var(--love-color-text);
}

/*
 * 小屏机型按真实可用高度收紧纵向节奏。
 * 页面仍完整渲染三条数据，不依赖隐藏纵向溢出来消除滚动。
 */
.anniversary-page.compact-screen {
  .guest-home {
    padding-top: 140rpx;
  }

  .guest-hero-art {
    width: 450rpx;
    height: 386rpx;
  }

  .guest-heading {
    margin-top: 8rpx;
    font-size: 31rpx;
  }

  .guest-subtitle {
    margin-top: 18rpx;
    font-size: 25rpx;
  }

  .guest-login-button {
    width: 414rpx;
    height: 80rpx;
    margin-top: 30rpx;
    font-size: 28rpx;
    line-height: 80rpx;
  }

  .guest-login-tip {
    margin-top: 20rpx;
    font-size: 22rpx;
  }

  .hero-section {
    height: 448rpx;
    margin-top: 20rpx;
    margin-bottom: 55rpx;
  }

  .together-block {
    top: 76rpx;
    left: 54rpx;
  }

  .together-label {
    font-size: 29rpx;
  }

  .days-row {
    margin-top: 24rpx;
  }

  .days-number {
    font-size: 108rpx;
  }

  .days-number.unknown-days {
    font-size: 38rpx;
  }

  .days-unit {
    font-size: 28rpx;
  }

  .start-date {
    margin-top: 20rpx;
    font-size: 24rpx;
  }

  .hero-illustration {
    top: -8rpx;
    right: 0rpx;
    width: 430rpx;
    height: 516rpx;
  }

  .section-title {
    margin-bottom: 6rpx;
  }

  .section-title-text {
    font-size: 32rpx;
  }

  .title-line {
    margin-top: 8rpx;
  }

  .view-all-text {
    font-size: 22rpx;
  }

  .empty-anniversary-card {
    height: 256rpx;
    margin-top: 18rpx;
    padding: 22rpx 26rpx;
  }

  .empty-calendar-art {
    width: 136rpx;
    height: 148rpx;
  }

  .empty-card-title {
    font-size: 29rpx;
  }

  .empty-card-subtitle {
    font-size: 22rpx;
  }

  .empty-add-button {
    min-width: 246rpx;
    height: 58rpx;
    margin-top: 22rpx;
    font-size: 23rpx;
    line-height: 58rpx;
  }

  .anniversary-item {
    min-height: 128rpx;
    gap: 22rpx;
    padding: 14rpx 0;
  }

  .type-icon {
    width: 84rpx;
    height: 84rpx;
  }

  .item-title {
    font-size: 30rpx;
  }

  .countdown-label,
  .countdown-unit {
    font-size: 25rpx;
  }

  .countdown-days {
    font-size: 28rpx;
  }

  .date-text {
    font-size: 24rpx;
  }

  .bottom-decoration {
    width: 342rpx;
    height: 214rpx;
  }

  .fab-icon {
    width: 90rpx;
    height: 90rpx;
    font-size: 48rpx;
  }

  .fab-label {
    font-size: 23rpx;
  }
}

.anniversary-page.short-screen {
  .guest-home {
    padding-top: 10rpx;
  }

  .guest-hero-art {
    width: 400rpx;
    height: 330rpx;
  }

  .guest-login-button {
    height: 74rpx;
    margin-top: 24rpx;
    line-height: 74rpx;
  }

  .hero-section {
    height: 396rpx;
    margin-bottom: 4rpx;
  }

  .together-block {
    top: 62rpx;
  }

  .days-number {
    font-size: 98rpx;
  }

  .days-number.unknown-days {
    font-size: 34rpx;
  }

  .hero-illustration {
    width: 390rpx;
    height: 468rpx;
  }

  .section-title-text {
    font-size: 29rpx;
  }

  .empty-anniversary-card {
    height: 228rpx;
    margin-top: 10rpx;
  }

  .anniversary-item {
    min-height: 116rpx;
    padding-top: 10rpx;
    padding-bottom: 10rpx;
  }

  .type-icon {
    width: 76rpx;
    height: 76rpx;
  }

  .fab-icon {
    width: 82rpx;
    height: 82rpx;
  }
}
</style>


