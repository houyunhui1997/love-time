<template>
  <view class="reminder-page" :style="pageStyle">
    <view class="nav-bar">
      <button class="back" aria-label="返回" @tap="goBack">‹</button>
      <text class="title">通知消息管理</text>
    </view>
    <view class="content">
      <view class="rules-card">
        <view class="rules-heading"><uni-icons type="notification" size="21" color="#c8736a" /><text>订阅规则</text></view>
        <text class="rule">创建纪念日或修改日期、提醒时间后，保存时会请求微信订阅授权；同意后开启一次提醒，也可在此手动开启。</text>
        <text class="rule">按纪念日月日和提前天数，于北京时间 09:00 提醒。提醒时间已过则顺延到下一年，具体时间显示在列表中。无需关注公众号。</text>
        <text class="rule">“重复方式”只控制展示，不影响订阅。每次授权只提醒一次，不自动续订；日期或提醒时间变化会替换原安排，设为“不提醒”会取消。</text>
        <button class="settings-link" @tap="openSettings">收不到提醒？查看微信订阅设置 ›</button>
      </view>

      <view class="list-heading">
        <text>我的纪念日</text>
        <text class="count">{{ items.length }} 个</text>
      </view>
      <view v-if="loading" class="empty-card">正在加载纪念日…</view>
      <view v-else-if="loadError" class="empty-card">
        <text>{{ loadError }}</text>
        <button class="primary" @tap="load">重新加载</button>
      </view>
      <view v-else-if="!items.length" class="empty-card">
        <text class="empty-title">还没有纪念日</text>
        <text class="empty-copy">先记下一个重要的日子，再为它开启提醒。</text>
        <button class="primary" @tap="addAnniversary">添加纪念日</button>
      </view>
      <view v-else class="list-card">
        <SubscriptionReminder
          v-for="item in items"
          :key="item._id + ':' + generation"
          :id="item._id"
          :revision="item.revision"
          :title="item.title"
          :target-date="item.targetDate"
          :reminder-label="reminderLabel(item)"
          @busy-change="onBusyChange"
        />
      </view>
      <text v-if="items.length && !loading" class="footer-tip">点击右侧开启订阅，点击纪念日名称查看详情。</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
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
const pageStyle = { '--nav-top': navTop + 'px', '--nav-height': navHeight + 'px' }
const items = ref<AnniversaryListItem[]>([])
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
function goBack() { uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) }) }
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
.reminder-page { min-height: 100vh; box-sizing: border-box; background: #fcf5ec; color: #57483e; padding-bottom: calc(env(safe-area-inset-bottom) + 40rpx); }
.nav-bar { position: relative; height: calc(var(--nav-top) + var(--nav-height) + 24rpx); }
.back { position: absolute; top: var(--nav-top); left: 24rpx; width: 64rpx; height: var(--nav-height); margin: 0; padding: 0; line-height: var(--nav-height); font-size: 56rpx; color: #57483e; background: transparent; }
.back::after, button::after { border: 0; }
.title { position: absolute; top: var(--nav-top); left: 104rpx; right: 205rpx; line-height: var(--nav-height); font-size: 32rpx; font-weight: 600; white-space: nowrap; }
.content { padding: 24rpx 30rpx; }
.rules-card { padding: 26rpx; border-radius: 24rpx; background: #f6e9dd; }
.rules-heading { display: flex; align-items: center; gap: 12rpx; font-size: 28rpx; font-weight: 600; }
.rule { display: block; margin-top: 16rpx; font-size: 24rpx; line-height: 1.8; color: #8c7463; }
.settings-link { margin: 22rpx 0 0; padding: 0; background: transparent; color: #b96560; font-size: 24rpx; text-align: left; line-height: 1.6; }
.list-heading { display: flex; align-items: center; justify-content: space-between; margin: 36rpx 6rpx 20rpx; font-size: 30rpx; font-weight: 600; }
.count { color: #ad9684; font-size: 24rpx; font-weight: 400; }
.list-card, .empty-card { background: #fffaf5; border-radius: 26rpx; overflow: hidden; }
.empty-card { padding: 50rpx 26rpx; text-align: center; color: #9a8576; font-size: 27rpx; }
.empty-title, .empty-copy { display: block; }
.empty-title { font-size: 30rpx; color: #57483e; }
.empty-copy { margin-top: 18rpx; font-size: 25rpx; line-height: 1.7; }
.primary { margin: 28rpx auto 0; padding: 0 32rpx; width: fit-content; border-radius: 40rpx; font-size: 27rpx; color: white; background: #de7672; }
.footer-tip { display: block; padding: 24rpx 10rpx; color: #ad9684; font-size: 23rpx; text-align: center; line-height: 1.6; }
</style>

