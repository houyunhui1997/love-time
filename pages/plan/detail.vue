<template>
  <view class="detail-page" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack"><uni-icons type="left" size="28" color="#514137" /></view>
      <text class="nav-title">约会计划</text>
      <view class="nav-more" @tap="openActions"><uni-icons type="more-filled" size="24" color="#514137" /></view>
    </view>

    <scroll-view v-if="plan" class="detail-scroll" scroll-y :show-scrollbar="false" enhanced>
      <view class="detail-content">
        <view class="hero-card">
          <image class="hero-cover" :src="plan.cover || defaultCover" mode="aspectFill" />
          <view class="hero-shade" />
          <view class="hero-copy">
            <view class="hero-label"><uni-icons type="heart-filled" size="16" color="#df7471" /><text>{{ statusText }}</text></view>
            <text class="hero-title">{{ plan.title || '我们的约会' }}</text>
            <view class="meta-row"><uni-icons type="calendar" size="19" color="#df7471" /><text>{{ formatDate(plan) }}</text></view>
            <view v-if="plan.location" class="meta-row"><uni-icons type="location-filled" size="19" color="#df7471" /><text>{{ plan.location }}</text></view>
            <view v-if="plan.note" class="meta-row note-row"><uni-icons type="compose" size="19" color="#a99b92" /><text>{{ plan.note }}</text></view>
          </view>
          <view v-if="!isPast" class="countdown">{{ countdownText }}</view>
        </view>

        <view class="detail-grid">
          <view class="detail-card">
            <view class="card-heading">
              <view><view class="card-title"><uni-icons type="clock-filled" size="23" color="#e7797f" /><text>今天的安排</text></view><text class="card-count">{{ plan.arrangements.length }} 项安排</text></view>
              <image src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/today-arrangement-wood.png" mode="aspectFit" />
            </view>
            <view v-if="plan.arrangements.length" class="timeline-list">
              <view v-for="(item, index) in plan.arrangements" :key="item.id" class="timeline-item">
                <view class="timeline-axis"><view class="timeline-dot" /><view v-if="index < plan.arrangements.length - 1" class="timeline-line" /></view>
                <text>{{ item.title }}</text>
              </view>
            </view>
            <view v-else class="card-empty">还没有安排，留一点随性也很好</view>
          </view>

          <view class="detail-card">
            <view class="card-heading">
              <view><view class="card-title"><uni-icons type="gift-filled" size="23" color="#e7797f" /><text>小准备</text></view><text class="card-count">{{ completedCount }}/{{ plan.preparations.length }} 已完成</text></view>
              <image src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/preparation-tulip.png" mode="aspectFit" />
            </view>
            <view v-if="plan.preparations.length" class="preparation-list">
              <view v-for="item in plan.preparations" :key="item.id" class="preparation-item" @tap="togglePreparation(item.id)">
                <view class="check-dot" :class="{ checked: item.completed }"><uni-icons v-if="item.completed" type="checkmarkempty" size="17" color="#fff" /></view>
                <text :class="{ done: item.completed }">{{ item.title }}</text>
              </view>
            </view>
            <view v-else class="card-empty">还没有准备事项</view>
          </view>
        </view>

        <button class="edit-button" @tap="editPlan"><uni-icons type="compose" size="21" color="#fff" /><text>编辑计划</text></button>
        <view class="footer-note"><view class="footer-line" /><text>和你见面的每一刻，都值得期待</text><view class="footer-line" /></view>
      </view>
    </scroll-view>

    <view v-if="loading" class="loading-state"><LoveLoading size="mini" text="正在加载计划" :mask="false" /></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { getPlanJournal, savePlan, type DatePlan } from '@/services/plan'

const defaultCover = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/sakura-lake-sunset.png'
const planId = ref('')
const plan = ref<DatePlan | null>(null)
const revision = ref(0)
const loading = ref(true)
const saving = ref(false)

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

const planTime = computed(() => plan.value ? new Date(`${plan.value.date}T${plan.value.time || '23:59'}:00`).getTime() : 0)
const isPast = computed(() => planTime.value < Date.now())
const completedCount = computed(() => plan.value?.preparations.filter(item => item.completed).length || 0)
const statusText = computed(() => isPast.value ? '珍藏的见面' : '下一次见面')
const countdownText = computed(() => {
  if (!plan.value) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(`${plan.value.date}T00:00:00`)
  const days = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000))
  return days === 0 ? '就是今天 ♡' : `还有 ${days} 天 ♡`
})

onLoad(query => { planId.value = typeof query?.id === 'string' ? query.id : '' })
onShow(() => void loadData())

async function loadData(showError = true) {
  if (!planId.value) return
  loading.value = true
  try {
    const journal = await getPlanJournal()
    revision.value = journal.revision
    plan.value = journal.records.find(item => item.id === planId.value) || null
    if (!plan.value) {
      uni.showToast({ title: '计划不存在', icon: 'none' })
      setTimeout(goBack, 800)
    }
  } catch (error) {
    if (showError) uni.showToast({ title: error instanceof Error ? error.message : '计划加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function formatDate(item: DatePlan) {
  const date = new Date(`${item.date}T00:00:00`)
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return `${item.date.replaceAll('-', '.')} ${week}${item.time ? ` · ${item.time}` : ''}`
}

async function togglePreparation(id: string) {
  if (!plan.value || saving.value) return
  const next = plan.value.preparations.map(item => item.id === id ? { ...item, completed: !item.completed } : item)
  saving.value = true
  try {
    const journal = await savePlan({ revision: revision.value, id: plan.value.id, preparations: next })
    revision.value = journal.revision
    plan.value = journal.records.find(item => item.id === planId.value) || null
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '更新失败', icon: 'none' })
    await loadData(false)
  } finally {
    saving.value = false
  }
}

function editPlan() { uni.navigateTo({ url: `/pages/plan/edit?id=${encodeURIComponent(planId.value)}` }) }

function openActions() {
  if (!plan.value) return
  uni.showActionSheet({
    itemList: ['编辑计划', '删除计划'],
    success: result => {
      if (result.tapIndex === 0) editPlan()
      if (result.tapIndex === 1) confirmRemove()
    }
  })
}

function confirmRemove() {
  if (!plan.value) return
  uni.showModal({
    title: '删除这个约会计划？',
    content: '删除后将无法恢复。',
    confirmText: '删除',
    confirmColor: '#db7470',
    success: async result => {
      if (!result.confirm || !plan.value) return
      try {
        await savePlan({ revision: revision.value, id: plan.value.id, remove: true })
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(goBack, 650)
      } catch (error) {
        uni.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
      }
    }
  })
}

function goBack() { uni.navigateBack({ fail: () => uni.redirectTo({ url: '/pages/plan/index' }) }) }
</script>

<style scoped lang="scss">
.detail-page { position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--love-color-bg); color: var(--love-color-text); }
.detail-page::before { position: absolute; inset: 0 0 auto; height: 560rpx; background: linear-gradient(180deg,#fff0ec 0%,rgba(255,246,241,.72) 54%,rgba(251,247,242,0) 100%); content: ''; pointer-events: none; }
.nav-bar { box-sizing: content-box; position: relative; z-index: 3; flex-shrink: 0; padding-top: var(--menu-top); height: calc(var(--menu-height) + 24rpx); display: flex; align-items: center; padding-bottom: 24rpx; padding-left: 26rpx; padding-right: 26rpx; }
.nav-back { position: absolute; left: 26rpx; bottom: 24rpx; display: flex; width: 64rpx; height: var(--menu-height); align-items: center; }
.nav-more { position: absolute; right: 26rpx; bottom: 24rpx; display: flex; width: 70rpx; height: var(--menu-height); align-items: center; justify-content: flex-end; }
.nav-title { flex: 1; color: #49372e; font-size: 30rpx; font-weight: 700; line-height: var(--menu-height); text-align: center; }
.nav-more { justify-content: flex-end; }
.detail-scroll { position: relative; z-index: 2; min-height: 0; flex: 1; }
.detail-content { padding: 14rpx 30rpx calc(44rpx + env(safe-area-inset-bottom)); }
.hero-card { position: relative; height: 470rpx; overflow: hidden; border: 0; border-radius: 32rpx; background: #f8e6df; box-shadow: 0 14rpx 34rpx rgba(103,73,54,.1); backface-visibility: hidden; transform: translateZ(0); -webkit-backface-visibility: hidden; }
.hero-card::after { position: absolute; inset: 0; z-index: 4; box-sizing: border-box; border: 2rpx solid rgba(255,255,255,.92); border-radius: inherit; content: ''; pointer-events: none; }
.hero-cover { position: absolute; inset: -2rpx; width: calc(100% + 4rpx); height: calc(100% + 4rpx); }
.hero-shade { position: absolute; inset: -2rpx; background: linear-gradient(90deg,rgba(255,250,247,.98) 0%,rgba(255,248,243,.9) 46%,rgba(255,248,243,.08) 82%); }
.hero-copy { position: relative; z-index: 2; display: flex; width: 64%; height: 100%; flex-direction: column; padding: 34rpx 0 30rpx 30rpx; }
.hero-label { display: flex; width: fit-content; height: 54rpx; align-items: center; gap: 10rpx; padding: 0 22rpx; border-radius: 28rpx; background: rgba(255,232,228,.94); color: #ca6765; font-size: 23rpx; font-weight: 600; }
.hero-title { margin-top: 28rpx; color: #49332b; font-size: 42rpx; font-weight: 700; line-height: 1.25; }
.meta-row { display: flex; min-width: 0; align-items: center; gap: 12rpx; margin-top: 20rpx; color: #655149; font-size: 24rpx; line-height: 1.5; }
.meta-row text { min-width: 0; flex: 1; }
/* 多行备注行保持顶部对齐，图标微调贴合首行视觉中线 */
.note-row { align-items: flex-start; }
.note-row uni-icons { margin-top: 4rpx; flex: none; }
.note-row text { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.countdown { position: absolute; top: 28rpx; right: 24rpx; z-index: 3; padding: 10rpx 18rpx; border-radius: 24rpx; background: rgba(255,251,248,.86); color: #df6e70; font-size: 22rpx; font-weight: 600; }
.detail-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16rpx; margin-top: 18rpx; }
.detail-card { min-height: 310rpx; padding: 22rpx 18rpx; border: 1rpx solid rgba(255,255,255,.94); border-radius: 28rpx; background: rgba(252,247,241,.92); box-shadow: 0 12rpx 30rpx rgba(103,73,54,.08); }
.card-heading { position: relative; min-height: 96rpx; }
.card-heading image { position: absolute; top: -28rpx; right: -22rpx; width: 130rpx; height: 130rpx; opacity: .76; }
.card-title { display: flex; align-items: center; gap: 9rpx; color: #49372e; font-size: 25rpx; font-weight: 700; }
.card-count { display: block; margin: 9rpx 0 0 34rpx; color: #95867d; font-size: 19rpx; }
.timeline-item { display: flex; min-height: 58rpx; align-items: flex-start; gap: 10rpx; color: #5d4a40; font-size: 22rpx; line-height: 1.4; }
.timeline-axis { position: relative; display: flex; width: 24rpx; align-self: stretch; flex: none; justify-content: center; }
.timeline-dot { z-index: 1; width: 14rpx; height: 14rpx; margin-top: 8rpx; border-radius: 50%; background: #e77f83; }
.timeline-line { position: absolute; top: 20rpx; bottom: -8rpx; width: 2rpx; background: #edb1b0; }
.preparation-list { display: flex; flex-direction: column; gap: 10rpx; }
.preparation-item { display: flex; min-height: 58rpx; align-items: center; gap: 10rpx; padding: 7rpx 10rpx; border-radius: 17rpx; background: #f8efeb; color: #5d4a40; font-size: 21rpx; }
.preparation-item text { min-width: 0; flex: 1; line-height: 1.35; }
.preparation-item text.done { color: #a99b92; text-decoration: line-through; }
.check-dot { display: flex; width: 36rpx; height: 36rpx; flex: none; align-items: center; justify-content: center; border: 2rpx solid #c8b9b0; border-radius: 50%; }
.check-dot.checked { border-color: #e8797f; background: #e8797f; }
.card-empty { padding: 22rpx 8rpx; color: #a0938b; font-size: 20rpx; line-height: 1.5; text-align: center; }
.edit-button { display: flex; height: 84rpx; align-items: center; justify-content: center; gap: 12rpx; margin-top: 26rpx; border-radius: 43rpx; background: linear-gradient(90deg,#f58f8b,#ec5570); color: #fff; font-size: 27rpx; font-weight: 600; line-height: 84rpx; box-shadow: 0 14rpx 30rpx rgba(219,93,100,.2); }
.edit-button::after { border: 0; }
.footer-note { display: flex; align-items: center; justify-content: center; gap: 14rpx; margin-top: 24rpx; color: #9b8a7f; font-size: 20rpx; }
.footer-line { width: 42rpx; height: 1rpx; background: #e5d8ce; }
.loading-state { position: absolute; inset: 150rpx 0 0; z-index: 12; display: flex; align-items: center; justify-content: center; background: rgba(251,247,242,.66); }
</style>
