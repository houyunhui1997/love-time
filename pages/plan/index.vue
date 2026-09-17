<template>
  <view class="plan-page" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack"><uni-icons type="left" size="28" color="#514137" /></view>
    </view>

    <view class="page-heading">
      <view>
        <text class="page-title">约会计划</text>
        <text class="page-subtitle">把期待变成日程</text>
      </view>
      <image class="heading-flower" :src="flowerSprig" mode="aspectFit" />
    </view>

    <scroll-view class="plan-scroll" scroll-y :show-scrollbar="false" enhanced>
      <view class="plan-content">
        <view v-if="featuredPlan" class="featured-card" @tap="openDetail(featuredPlan.id)">
          <image class="featured-cover" :src="featuredPlan.cover || defaultCover" mode="aspectFill" />
          <view class="featured-shade" />
          <view class="featured-copy">
            <view class="featured-label"><uni-icons type="heart-filled" size="16" color="#df7471" /><text>下一次见面</text></view>
            <text class="featured-title">{{ displayTitle(featuredPlan) }}</text>
            <view class="featured-meta">
              <view class="meta-row"><uni-icons type="calendar" size="18" color="#df7471" /><text>{{ formatDate(featuredPlan) }}</text></view>
              <view v-if="featuredPlan.location" class="meta-row"><uni-icons type="location-filled" size="18" color="#df7471" /><text>{{ featuredPlan.location }}</text></view>
              <view v-if="featuredPlan.note" class="meta-row note-row"><uni-icons type="compose" size="18" color="#a99b92" /><text>{{ featuredPlan.note }}</text></view>
            </view>
          </view>
          <view class="countdown-badge">{{ countdownText(featuredPlan) }}</view>
        </view>

        <view v-else-if="!loading" class="empty-card">
          <image class="empty-art" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/empty.png" mode="aspectFit" />
          <text class="empty-title">还没有安排下一次约会</text>
          <text class="empty-copy">想见面的时候，先把小期待轻轻记下来</text>
          <button class="empty-action" @tap="createPlan">新增一个计划</button>
          <view class="idea-heading"><view class="idea-line" /><text>不知道安排什么？试试这些</text><view class="idea-line" /></view>
          <view class="idea-list">
            <view v-for="idea in dateIdeas" :key="idea" class="idea-chip" @tap="createFromIdea(idea)">{{ idea }}</view>
          </view>
        </view>

        <view v-if="otherPlans.length" class="section-heading">
          <view class="section-mark" />
          <text>已结束或待定计划</text>
        </view>

        <view
          v-for="item in otherPlans"
          :key="item.id"
          class="plan-card"
          @tap="openDetail(item.id)"
        >
          <image class="plan-cover" :src="item.cover || defaultCover" mode="aspectFill" />
          <view class="plan-copy">
            <text class="plan-title">{{ displayTitle(item) }}</text>
            <view class="plan-meta" :class="{ past: isPast(item) }">
              <uni-icons type="calendar" size="17" :color="isPast(item) ? '#a99b92' : '#df7471'" />
              <text>{{ formatDate(item) }}</text>
            </view>
            <view v-if="item.location || item.note" class="plan-note">
              <uni-icons :type="item.location ? 'location' : 'compose'" size="16" color="#a99b92" />
              <text>{{ item.location || item.note }}</text>
            </view>
          </view>
          <view class="plan-more" @tap.stop="openActions(item)"><uni-icons type="more-filled" size="22" color="#aa9a92" /></view>
        </view>

        <view v-if="records.length" class="footer-note">
          <uni-icons type="heart-filled" size="13" color="#e79b97" />
          <view class="footer-copy"><view class="footer-line" /><text>认真期待的见面，也会被温柔记住</text><view class="footer-line" /></view>
        </view>
        <view class="bottom-space" />
      </view>
    </scroll-view>

    <view class="add-fab" @tap="createPlan"><uni-icons type="plus" size="30" color="#ffffff" /><text class="add-fab-label">新增</text></view>
    <image class="bottom-bouquet" :src="bouquet" mode="aspectFit" />
    <view v-if="loading" class="loading-state"><LoveLoading size="mini" text="正在加载计划" :mask="false" /></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShareAppMessage, onShow } from '@dcloudio/uni-app'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { getPlanJournal, savePlan, type DatePlan } from '@/services/plan'

const defaultCover = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/sakura-lake-sunset.png'
const flowerSprig = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/botanical-sprig.png'
const bouquet = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/timeline/timeline-bottom-bouquet.png'
const dateIdeas = ['去看日落', '周末看电影', '公园散步', '吃那家日料']
const records = ref<DatePlan[]>([])
const revision = ref(0)
const loading = ref(true)

function dateValue(item: DatePlan) {
  return new Date(`${item.date}T${item.time || '23:59'}:00`).getTime()
}

const sortedPlans = computed(() => [...records.value].sort((a, b) => dateValue(a) - dateValue(b)))
const featuredPlan = computed(() => sortedPlans.value.find(item => !isPast(item)) || null)
const otherPlans = computed(() => {
  const featuredId = featuredPlan.value?.id
  return [...records.value]
    .filter(item => item.id !== featuredId)
    .sort((a, b) => {
      const aPast = isPast(a)
      const bPast = isPast(b)
      if (aPast !== bPast) return aPast ? 1 : -1
      return aPast ? dateValue(b) - dateValue(a) : dateValue(a) - dateValue(b)
    })
})

const systemInfo = uni.getSystemInfoSync()
function getNavigationMetrics() {
  const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.top && menuButton?.height) return { top: menuButton.top, height: menuButton.height }
  } catch { /* 使用回退值 */ }
  return { top: fallbackTop, height: 32 }
}
const navigationMetrics = getNavigationMetrics()
const pageStyle = { '--menu-top': `${navigationMetrics.top}px`, '--menu-height': `${navigationMetrics.height}px` }

onShareAppMessage(() => ({ title: '恋时光 · 把期待变成日程', path: '/pages/plan/index' }))
onShow(() => void loadData())

async function loadData(showError = true) {
  loading.value = true
  try {
    const journal = await getPlanJournal()
    revision.value = journal.revision
    records.value = journal.records
  } catch (error) {
    if (showError) uni.showToast({ title: error instanceof Error ? error.message : '计划加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function isPast(item: DatePlan) {
  return dateValue(item) < Date.now()
}

function displayTitle(item: DatePlan) {
  return item.title || '我们的约会'
}

function formatDate(item: DatePlan) {
  const date = new Date(`${item.date}T00:00:00`)
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  const compact = item.date.slice(5).replace('-', '.')
  return `${compact} ${week}${item.time ? ` · ${item.time}` : ''}`
}

function countdownText(item: DatePlan) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${item.date}T00:00:00`)
  const days = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000))
  return days === 0 ? '就是今天 ♡' : `还有 ${days} 天 ♡`
}

function createPlan() {
  uni.navigateTo({ url: '/pages/plan/edit' })
}

function createFromIdea(title: string) {
  uni.navigateTo({ url: `/pages/plan/edit?title=${encodeURIComponent(title)}` })
}

function openDetail(id: string) {
  uni.navigateTo({ url: `/pages/plan/detail?id=${encodeURIComponent(id)}` })
}

function openActions(item: DatePlan) {
  uni.showActionSheet({
    itemList: ['编辑计划', '删除计划'],
    success: result => {
      if (result.tapIndex === 0) uni.navigateTo({ url: `/pages/plan/edit?id=${encodeURIComponent(item.id)}` })
      if (result.tapIndex === 1) confirmRemove(item)
    }
  })
}

function confirmRemove(item: DatePlan) {
  uni.showModal({
    title: '删除这个约会计划？',
    content: '删除后将无法恢复。',
    confirmText: '删除',
    confirmColor: '#db7470',
    success: async result => {
      if (!result.confirm) return
      try {
        const journal = await savePlan({ revision: revision.value, id: item.id, remove: true })
        revision.value = journal.revision
        records.value = journal.records
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
        await loadData(false)
      }
    }
  })
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/life/index' }) })
}
</script>

<style scoped lang="scss">
.plan-page { position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--love-color-bg); color: var(--love-color-text); }
.plan-page::before { position: absolute; inset: 0 0 auto; height: 560rpx; background: linear-gradient(180deg, #fff0ec 0%, rgba(255,246,241,.72) 54%, rgba(251,247,242,0) 100%); content: ''; pointer-events: none; }
.nav-bar { position: relative; z-index: 3; display: flex; height: calc(var(--menu-top) + var(--menu-height)); flex: none; align-items: center; padding: var(--menu-top) 42rpx 0; }
.nav-back { display: flex; width: 62rpx; height: var(--menu-height); align-items: center; justify-content: flex-start; }
.page-heading { position: relative; z-index: 2; display: flex; height: 150rpx; flex: none; align-items: flex-start; padding: 12rpx 42rpx 0; }
.page-title { display: block; color: #38291f; font-size: 48rpx; font-weight: 700; line-height: 1.3; }
.page-subtitle { display: block; margin-top: 8rpx; color: #94877d; font-size: 25rpx; }
.heading-flower { position: absolute; top: -28rpx; right: 4rpx; width: 200rpx; height: 200rpx; opacity: .82; transform: rotate(-15deg); }
.plan-scroll { position: relative; z-index: 2; min-height: 0; flex: 1; }
.plan-content { padding: 12rpx 34rpx 0; }
.featured-card { position: relative; height: 360rpx; overflow: hidden; border: 0; border-radius: 32rpx; background: #f8e6df; box-shadow: 0 14rpx 34rpx rgba(103,73,54,.1); backface-visibility: hidden; transform: translateZ(0); -webkit-backface-visibility: hidden; }
.featured-card::after { position: absolute; inset: 0; z-index: 4; box-sizing: border-box; border: 2rpx solid rgba(255,255,255,.88); border-radius: inherit; content: ''; pointer-events: none; }
.featured-cover { position: absolute; inset: -2rpx; width: calc(100% + 4rpx); height: calc(100% + 4rpx); }
.featured-shade { position: absolute; inset: -2rpx; background: linear-gradient(90deg, rgba(255,250,247,.98) 0%, rgba(255,248,243,.91) 42%, rgba(255,248,243,.08) 78%); }
.featured-copy { position: relative; z-index: 2; display: flex; width: 62%; height: 100%; flex-direction: column; padding: 28rpx 0 24rpx 28rpx; }
.featured-label { display: flex; width: fit-content; height: 52rpx; align-items: center; gap: 10rpx; padding: 0 22rpx; border-radius: 28rpx; background: rgba(255,232,228,.94); color: #ca6765; font-size: 23rpx; font-weight: 600; }
.featured-title { margin-top: 22rpx; color: #49332b; font-size: 39rpx; font-weight: 700; line-height: 1.25; }
.featured-meta { display: flex; flex-direction: column; gap: 13rpx; margin-top: 20rpx; }
.meta-row { display: flex; min-width: 0; align-items: center; gap: 12rpx; color: #655149; font-size: 23rpx; line-height: 1.4; }
.meta-row text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.note-row text { display: -webkit-box; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.countdown-badge { position: absolute; top: 24rpx; right: 22rpx; z-index: 3; padding: 10rpx 18rpx; border-radius: 24rpx; background: rgba(255,251,248,.86); color: #df6e70; font-size: 22rpx; font-weight: 600; }
.section-heading { display: flex; align-items: center; gap: 14rpx; margin: 30rpx 4rpx 18rpx; color: #49372e; font-size: 31rpx; font-weight: 700; }
.section-mark { width: 8rpx; height: 38rpx; border-radius: 5rpx; background: #e78484; }
.plan-card, .empty-card { border: 1rpx solid rgba(255,255,255,.94); border-radius: 28rpx; background: rgba(252,247,241,.92); box-shadow: 0 12rpx 30rpx rgba(103,73,54,.08); }
.plan-card { display: flex; min-height: 176rpx; align-items: center; gap: 22rpx; margin-bottom: 16rpx; padding: 18rpx 22rpx; }
.plan-cover { width: 154rpx; height: 138rpx; flex: none; border-radius: 22rpx; }
.plan-copy { min-width: 0; flex: 1; }
.plan-title { display: block; overflow: hidden; color: #49372e; font-size: 28rpx; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.plan-meta, .plan-note { display: flex; min-width: 0; align-items: center; gap: 10rpx; margin-top: 12rpx; color: #df7471; font-size: 22rpx; }
.plan-meta.past { color: #9e9088; }
.plan-note { color: #94857c; }
.plan-note text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plan-more { display: flex; width: 44rpx; height: 80rpx; flex: none; align-items: flex-start; justify-content: center; padding-top: 4rpx; }
.empty-card { display: flex; flex-direction: column; align-items: center; overflow: hidden; padding: 34rpx 28rpx 38rpx; text-align: center; }
.empty-art { width: 500rpx; height: 330rpx; margin-bottom: 8rpx; }
.empty-title { color: #3f2d2a; font-size: 31rpx; font-weight: 700; }
.empty-copy { margin-top: 14rpx; color: #8d8580; font-size: 23rpx; }
.empty-action { width: 78%; height: 76rpx; margin-top: 28rpx; padding: 0 34rpx; border-radius: 40rpx; background: linear-gradient(90deg,#f58f8b,#ec5570); color: #fff; font-size: 26rpx; line-height: 76rpx; box-shadow: 0 12rpx 26rpx rgba(219,93,100,.18); }
.empty-action::after { border: 0; }
.idea-heading { display: flex; align-items: center; gap: 16rpx; margin-top: 30rpx; color: #98908b; font-size: 21rpx; }
.idea-line { width: 34rpx; height: 1rpx; background: #cfc5be; }
.idea-list { display: grid; width: 100%; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10rpx; margin-top: 22rpx; }
.idea-chip { display: flex; height: 58rpx; align-items: center; justify-content: center; border-radius: 30rpx; background: #fbefed; color: #6f6058; font-size: 20rpx; white-space: nowrap; }
.footer-note { display: flex; flex-direction: column; align-items: center; gap: 8rpx; margin-top: 32rpx; color: #9b8a7f; }
.footer-copy { display: flex; align-items: center; gap: 14rpx; font-size: 20rpx; white-space: nowrap; }
.footer-line { width: 40rpx; height: 1rpx; background: #e5d8ce; }
.bottom-space { height: 150rpx; }
.add-fab { position: absolute; right: 46rpx; bottom: 46rpx; z-index: 8; display: flex; height: 92rpx; align-items: center; gap: 10rpx; padding: 0 30rpx 0 26rpx; border-radius: 46rpx; background: linear-gradient(135deg,#f3918a,#e6686b); box-shadow: 0 16rpx 34rpx rgba(205,90,88,.28), inset 0 2rpx 6rpx rgba(255,255,255,.32); color: #fff; transition: transform .15s ease; }
.add-fab:active { transform: scale(.95); }
.add-fab-label { font-size: 26rpx; font-weight: 600; letter-spacing: 2rpx; }
.bottom-bouquet { position: absolute; bottom: -52rpx; left: -58rpx; z-index: 1; width: 260rpx; height: 220rpx; opacity: .28; pointer-events: none; }
.loading-state { position: absolute; inset: 220rpx 0 0; z-index: 12; display: flex; align-items: center; justify-content: center; background: rgba(251,247,242,.65); }
</style>
