<template>
  <view class="notification-page" :style="pageStyle">
    <view class="top-nav">
      <button class="back-button" aria-label="返回" @tap="goBack"><uni-icons type="left" size="24" color="#514137" /></button>
      <text class="page-title">通知消息管理</text>
    </view>
    <scroll-view class="page-scroll" scroll-y :show-scrollbar="false">
      <view class="page-content">
        <view class="overview">
          <view class="overview-top"><view class="overview-icon"><uni-icons type="notification" size="25" color="#c47670" /></view><button class="rules-entry" @tap="showRules = true">订阅规则 <uni-icons type="right" size="13" color="#9c8074" /></button></view>
          <text class="overview-title">重要的日子，准时提醒</text>
          <view class="overview-summary"><text class="overview-number">{{ loading || loadError || unresolvedCount ? '—' : enabledCount }}</text><text class="overview-caption">项提醒已开启</text><text v-if="!loading && !loadError" class="overview-total">共 {{ items.length }} 个纪念日</text></view>
          <text class="overview-note">每次订阅提醒一次 · 所有时间均为北京时间</text>
        </view>
        <view class="status-tabs">
          <button v-for="filter in filters" :key="filter.value" :class="['status-tab', { active: activeFilter === filter.value }]" @tap="activeFilter = filter.value">{{ filter.label }}<text class="tab-count">{{ filter.count }}</text></button>
        </view>
        <view v-if="loading" class="state-panel"><text class="state-title">正在整理提醒安排…</text></view>
        <view v-else-if="loadError" class="state-panel"><text class="state-text">{{ loadError }}</text><button class="state-action" @tap="load">重新加载</button></view>
        <view v-else>
          <view v-if="!visibleCount" class="state-panel">
            <uni-icons type="notification" size="38" color="#c5aba0" />
            <text class="state-title">{{ !items.length ? '还没有纪念日' : unresolvedCount ? '正在读取订阅状态…' : activeFilter === 'active' ? '还没有开启提醒' : '所有提醒都已开启' }}</text>
            <text class="state-text">{{ !items.length ? '添加一个重要的日子，为它安排提醒。' : activeFilter === 'active' ? '在全部列表中选择纪念日，开启本次订阅。' : '有新的安排时，可以随时在这里调整。' }}</text>
            <button v-if="!items.length" class="state-action" @tap="addAnniversary">添加纪念日</button>
            <button v-else class="state-action" @tap="activeFilter = 'all'">查看全部</button>
          </view>
          <view v-for="item in displayItems" v-show="item.visible" :key="item._id + ':' + generation" class="reminder-item">
            <SubscriptionReminder :id="item._id" :revision="item.revision" :title="item.title" :target-date="item.targetDate" :event-type="item.eventType" :reminder-label="reminderLabel(item)" @busy-change="onBusyChange" @status-change="onStatusChange" />
          </view>
        </view>
        <button class="help-entry" @tap="openSettings"><uni-icons type="help" size="17" color="#a49388" /><text>收不到提醒？查看微信通知设置</text><uni-icons type="right" size="14" color="#a49388" /></button>
      </view>
    </scroll-view>
    <view v-if="showRules" class="rules-mask" @tap="showRules = false">
      <view class="rules-sheet" role="dialog" aria-label="订阅规则" @tap.stop>
        <view class="sheet-handle" />
        <view class="sheet-header"><text class="sheet-title">订阅规则</text><button class="sheet-close" aria-label="关闭订阅规则" @tap="showRules = false"><uni-icons type="closeempty" size="23" color="#8f7a6c" /></button></view>
        <scroll-view class="rules-scroll" scroll-y>
          <view v-for="(rule, index) in rules" :key="rule.title" class="rule-row"><text class="rule-number">0{{ index + 1 }}</text><view class="rule-copy"><text class="rule-title">{{ rule.title }}</text><text class="rule-body">{{ rule.body }}</text></view></view>
          <button class="settings-link" @tap="openSettings">收不到提醒？查看微信订阅设置 ›</button>
        </scroll-view>
        <button class="rules-confirm" @tap="showRules = false">我知道了</button>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'

import { onShow } from '@dcloudio/uni-app'
import SubscriptionReminder from '@/components/reminder/SubscriptionReminder.vue'
import { listAnniversaries, type AnniversaryListItem } from '@/services/anniversary'

const systemInfo = uni.getSystemInfoSync()
let navTop = Number(systemInfo.statusBarHeight || 20) + 6
let navHeight = 32
try {
  const capsule = uni.getMenuButtonBoundingClientRect()
  if (capsule?.top && capsule?.height) { navTop = capsule.top; navHeight = capsule.height }
} catch { /* 使用状态栏高度作为非微信环境的回退值。 */ }
const pageStyle = { '--menu-top': navTop + 'px', '--menu-height': navHeight + 'px' }
const items = ref<AnniversaryListItem[]>([])
const showRules = ref(false)

const activeFilter = ref('all')
const statuses = ref<Record<string, string>>({})
function onStatusChange(value: { id: string; status: string }) { statuses.value[value.id] = value.status }
const isEnabled = (id: string) => ['pending', 'sending'].includes(statuses.value[id])
const enabledCount = computed(() => items.value.filter(item => isEnabled(item._id)).length)
const unresolvedCount = computed(() => items.value.filter(item => !statuses.value[item._id]).length)
const inactiveCount = computed(() => items.value.length - enabledCount.value - unresolvedCount.value)
const filters = computed(() => [
  { label: '全部', value: 'all', count: items.value.length },
  { label: '已开启', value: 'active', count: enabledCount.value },
  { label: '未开启', value: 'inactive', count: inactiveCount.value }
])
const rules = [
  { title: '一次订阅，一次提醒', body: '开启时需同意微信授权，每次只发送一条提醒，不会自动续订。无需关注公众号，消息会发送到微信服务通知。' },
  { title: '按你选择的时间提醒', body: '按照纪念日月日、提前天数和自定义时刻安排，默认 09:00，均为北京时间。提醒时刻已过会顺延到下一年，请以列表中的提醒日期为准。' },
  { title: '修改时间后重新授权', body: '创建纪念日或修改日期、提前天数、提醒时刻后，保存时会请求订阅授权。仅修改名称、备注或重复方式，会保留原订阅。' },
  { title: '随时管理本次订阅', body: '重复方式只控制纪念日展示，不影响订阅。选择“不提醒”、删除纪念日或取消订阅后，停止本次提醒；已发出的消息无法撤回。' }
]
const displayItems = computed(() => items.value.map(item => ({ ...item,
  visible: activeFilter.value === 'all' || (activeFilter.value === 'active' ? isEnabled(item._id) : Boolean(statuses.value[item._id]) && !isEnabled(item._id))
})))
const visibleCount = computed(() => displayItems.value.filter(item => item.visible).length)
const loading = ref(false)
const loadError = ref('')
const generation = ref(0)
let busyRows = 0
function onBusyChange(value: boolean) { busyRows = Math.max(0, busyRows + (value ? 1 : -1)) }
async function load() {
  // 微信授权弹窗返回时保留正在确认的行，避免销毁它或替换订阅凭证。
  if (loading.value || busyRows > 0) return
  loading.value = true
  loadError.value = ''
  try {
    const records = new Map<string, AnniversaryListItem>()
    let cursor: string | undefined
    const cursors = new Set<string>()
    do {
      const page = await listAnniversaries(cursor, true)
      page.list.forEach(item => records.set(item._id, item))
      cursor = page.hasMore && page.nextCursor ? page.nextCursor : undefined
      if (cursor && cursors.has(cursor)) throw new Error('列表加载中断，请重试')
      if (cursor) cursors.add(cursor)
    } while (cursor)
    items.value = Array.from(records.values()).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.targetDate.localeCompare(b.targetDate))
    generation.value++
  } catch (e) { loadError.value = e instanceof Error ? e.message : '纪念日加载失败，请重试' }
  finally { loading.value = false }
}
function reminderLabel(item: AnniversaryListItem) {
  const offset = item.reminderOffsetDays[0]
  if (offset === undefined) return '未设置提醒时间'
  return (offset === 0 ? '当天' : '提前 ' + offset + ' 天') + ' ' + item.reminderTime
}
function goBack() { if (showRules.value) { showRules.value = false; return }; uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) }) }
function addAnniversary() { uni.navigateTo({ url: '/pages/anniversary/edit' }) }
function openSettings() {
  // #ifdef MP-WEIXIN
  uni.openSetting({ withSubscriptions: true, fail: () => uni.showToast({ title: '请在微信中检查订阅消息设置', icon: 'none' }) })
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中设置', icon: 'none' })
  // #endif
}
onShow(() => { void load() })
</script>
<style scoped>
.notification-page { position: fixed; inset: 0; display: flex; flex-direction: column; background: #f8f4ef; color: #514137; }
button { font-family: inherit; }
button::after { border: 0; }
.top-nav { position: relative; flex-shrink: 0; box-sizing: border-box; height: calc(var(--menu-top) + var(--menu-height) + 26rpx); padding-top: var(--menu-top); }
.back-button { position: absolute; top: var(--menu-top); left: 28rpx; display: flex; align-items: center; justify-content: center; width: 64rpx; height: var(--menu-height); margin: 0; padding: 0; background: transparent; }
.page-title { display: block; margin: 0 175rpx; height: var(--menu-height); font-size: 33rpx; font-weight: 600; line-height: var(--menu-height); text-align: center; white-space: nowrap; }
.page-scroll { flex: 1; min-height: 0; height: 0; }
.page-content { padding: 22rpx 32rpx calc(40rpx + env(safe-area-inset-bottom)); }
.overview { padding: 28rpx 30rpx; border: 1rpx solid #f0ddd4; border-radius: 30rpx; background: linear-gradient(120deg, #f4e2da, #fbf0e7); }
.overview-top { display: flex; align-items: center; justify-content: space-between; }
.overview-icon { display: flex; width: 66rpx; height: 66rpx; align-items: center; justify-content: center; border-radius: 22rpx; background: rgba(255,255,255,.55); }
.rules-entry { display: flex; align-items: center; gap: 8rpx; margin: 0; padding: 12rpx 0 12rpx 20rpx; background: transparent; color: #9c8074; font-size: 24rpx; line-height: 1.4; }
.overview-title { display: block; margin-top: 18rpx; color: #6d5045; font-size: 33rpx; font-weight: 600; letter-spacing: 1rpx; }
.overview-summary { display: flex; align-items: baseline; margin-top: 22rpx; gap: 10rpx; }
.overview-number { color: #b86c65; font-size: 56rpx; font-weight: 600; line-height: 1; }
.overview-caption { color: #806658; font-size: 26rpx; }
.overview-total { margin-left: auto; color: #a3897a; font-size: 23rpx; }
.overview-note { display: block; margin-top: 20rpx; color: #a08474; font-size: 22rpx; line-height: 1.6; }
.status-tabs { display: flex; gap: 6rpx; padding: 7rpx; margin: 30rpx 0 24rpx; border-radius: 22rpx; background: #eee7df; }
.status-tab { flex: 1; min-width: 0; margin: 0; padding: 0 8rpx; border-radius: 17rpx; background: transparent; color: #9c8a7d; font-size: 25rpx; line-height: 66rpx; }
.status-tab.active { background: #fffcf8; color: #79564b; box-shadow: 0 3rpx 10rpx rgba(92,62,43,.06); font-weight: 600; }
.tab-count { margin-left: 10rpx; font-size: 22rpx; opacity: .75; }
.reminder-item { margin-top: 20rpx; }
.help-entry { display: flex; align-items: center; justify-content: center; gap: 10rpx; margin: 30rpx auto 0; padding: 14rpx 0; background: transparent; color: #a49388; font-size: 23rpx; line-height: 1.6; }
.state-panel { display: flex; min-height: 260rpx; padding: 50rpx 20rpx; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.state-title { display: block; margin-top: 20rpx; color: #7d6759; font-size: 29rpx; font-weight: 500; }
.state-text { margin-top: 14rpx; color: #a08d7d; font-size: 24rpx; line-height: 1.8; }
.state-action { margin-top: 26rpx; padding: 0 36rpx; border-radius: 32rpx; background: #efe0d5; color: #a07160; font-size: 25rpx; line-height: 66rpx; }.rules-mask { position: fixed; inset: 0; z-index: 30; display: flex; align-items: flex-end; background: rgba(66, 48, 37, .28); }
.rules-sheet { display: flex; flex-direction: column; box-sizing: border-box; width: 100%; max-height: 80vh; padding: 18rpx 38rpx calc(24rpx + env(safe-area-inset-bottom)); border-radius: 36rpx 36rpx 0 0; background: #fcf7f1; box-shadow: 0 -12rpx 50rpx rgba(75, 53, 38, .08); }
.sheet-handle { width: 66rpx; height: 7rpx; margin: 0 auto 16rpx; border-radius: 8rpx; background: #e5d8ca; flex-shrink: 0; }
.sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 4rpx 0 20rpx; flex-shrink: 0; }
.sheet-title { color: #514137; font-size: 34rpx; font-weight: 600; }
.sheet-close { display: flex; align-items: center; justify-content: center; width: 64rpx; height: 64rpx; padding: 0; margin: 0 -12rpx 0 0; background: transparent; }
.rules-scroll { min-height: 0; height: 48vh; flex-shrink: 1; }
.rule-row { display: flex; gap: 20rpx; padding: 22rpx 0; border-top: 1rpx solid #eaded2; }
.rule-number { color: #c88979; font-size: 27rpx; font-family: Georgia, serif; line-height: 1.5; }
.rule-copy { flex: 1; min-width: 0; }
.rule-title { display: block; font-size: 28rpx; font-weight: 500; color: #635043; }
.rule-body { display: block; margin-top: 12rpx; font-size: 25rpx; line-height: 1.85; color: #9a8271; }
.settings-link { margin: 12rpx 0 24rpx; padding: 8rpx 0; text-align: left; background: transparent; color: #bf7869; font-size: 25rpx; line-height: 1.7; }
.rules-confirm { width: 100%; flex-shrink: 0; height: 84rpx; margin-top: 20rpx; border-radius: 44rpx; background: linear-gradient(135deg, #e7847f, #d96766); color: white; font-size: 29rpx; line-height: 84rpx; }

</style>






