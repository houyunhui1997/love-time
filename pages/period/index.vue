<template>
  <view class="period-page" :style="pageStyle">
    <view class="nav"><view class="back" @tap="goBack"><uni-icons type="left" size="25" color="#514137" /></view><text class="nav-title">经期记录</text></view>
    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false"><view class="content">
      <view v-if="loading" class="glass feedback">正在读取经期记录…</view>
      <view v-else-if="loadError" class="glass feedback"><text>{{ loadError }}</text><button class="outline" @tap="load">重新加载</button></view>
      <template v-else>
        <view class="summary">
          <view class="summary-main">
            <template v-if="prediction && forecastDistance >= 0"><text class="summary-label">{{ forecastDistance === 0 ? '今天预计开始' : '距预计经期' }} <text v-if="forecastDistance > 0" class="accent">{{ forecastDistance }}天</text></text><text class="summary-title">预计 {{ shortDate(prediction.start) }}</text></template>
            <template v-else-if="prediction"><text class="summary-label">尚未记录本次开始</text><text class="summary-title">此前预计 {{ shortDate(prediction.start) }}</text></template>
            <template v-else><text class="summary-label">{{ history.length ? '最近开始' : '记录自己的节奏' }}</text><text class="summary-title">{{ history.length ? shortDate(history[0].startDate) : '从记录开始' }}</text></template>
          </view>
          <image class="sprig" src="/static/reminder/ivory-flower-sprig.png" mode="aspectFit" />
        </view>

        <view class="glass calendar">
          <view class="month-head"><button class="icon-button" :disabled="month === '1900-01'" @tap="changeMonth(-1)"><uni-icons type="left" size="21" color="#715b4c" /></button><text>{{ monthTitle }}</text><button class="icon-button" :disabled="month === '2100-12'" @tap="changeMonth(1)"><uni-icons type="right" size="21" color="#715b4c" /></button></view>
          <view class="week"><text v-for="day in weekdays" :key="day">{{ day }}</text></view>
          <view class="days">
            <view v-for="cell in cells" :key="cell.key" class="day-slot">
              <button v-if="cell.date" class="day" :class="{ actual: cell.actual, predicted: cell.predicted, selected: cell.date === selected, today: cell.date === today }" @tap="selected = cell.date">{{ cell.day }}</button>
            </view>
          </view>
          <view class="legend"><view><view class="dot actual" /><text>开始日期</text></view><view><view class="dot predicted" /><text>预计开始</text></view><button v-if="month !== today.slice(0, 7) || selected !== today" class="text-button" @tap="backToday">回今天</button></view>
        </view>

        <view class="glass daily">
          <text class="section-title">{{ shortDate(selected) }} <text class="weekday">{{ selectedWeekday }}</text></text>
          <template v-if="selectedRecord">
            <view class="record-summary"><uni-icons type="calendar" size="28" color="#db7470" /><text class="record-title">已记录开始日期</text></view>
            <button class="primary" @tap="openEdit(selectedRecord)">修改开始日期</button>
            <button class="text-button" @tap="openNew(true)">补记历史 <uni-icons type="right" size="15" color="#db7470" /></button>
          </template>
          <template v-else>
            <image class="empty-art" src="/static/period/record-notebook.png" mode="aspectFit" />
            <text class="empty-title">{{ selected > today ? '这一天尚未到来' : selected === today ? '今日暂无记录' : '这一天暂无记录' }}</text>
            <text class="muted empty-copy">{{ selected > today ? '预计日期仅供参考，请按实际情况记录' : '记下经期变化，关注自己的节奏' }}</text>
            <button class="primary" :disabled="selected > today" @tap="openNew(false)">{{ selected === today ? '记录经期' : '记录这一天' }}</button>
            <button class="text-button" @tap="openNew(true)">补记历史 <uni-icons type="right" size="15" color="#db7470" /></button>
          </template>
        </view>
        <view class="glass history-link" @tap="showHistory = true"><view class="history-icon"><uni-icons type="calendar" size="24" color="#db7470" /></view><view class="grow"><text class="section-title">历史记录</text><text class="muted">{{ journal.records.length ? `已记录 ${journal.records.length} 次开始日期` : '查看过往记录' }}</text></view><uni-icons type="right" size="20" color="#b09c90" /></view>
        <text class="footnote">{{ prediction ? '预测仅供参考，请以实际情况为准' : '记录两次开始日期后，可估算下次日期' }}</text>
      </template>
    </view></scroll-view>

    <view v-if="showHistory" class="mask" @tap="showHistory = false"><view class="sheet" @tap.stop>
      <view class="sheet-head"><text class="section-title">历史记录</text><button class="icon-button" @tap="showHistory = false"><uni-icons type="closeempty" size="25" color="#897669" /></button></view>
      <scroll-view scroll-y class="history-scroll">
        <view v-if="!history.length" class="history-empty">还没有经期记录，可以从补记开始</view>
        <view v-for="record in history" :key="record.id" class="history-row" @tap="openEdit(record)"><uni-icons type="calendar" size="24" color="#db7470" /><view class="grow"><text class="history-date">{{ record.startDate.replace(/-/g, '.') }}</text><text class="muted">开始日期{{ intervalLabel(record) }}</text></view><uni-icons type="right" size="17" color="#ae9788" /></view>
      </scroll-view>
      <button class="primary" @tap="openNew(true)">补记经期</button>
    </view></view>

    <view v-if="editor" class="mask" @tap="closeEditor"><view class="sheet editor" @tap.stop>
      <view class="sheet-head"><text class="section-title">{{ editorTitle }}</text><button class="icon-button" :disabled="saving" @tap="closeEditor"><uni-icons type="closeempty" size="25" color="#897669" /></button></view>
      <text class="form-help">选择这次经期开始的日期即可。</text>
      <picker mode="date" :value="form.startDate" start="1900-01-01" :end="today" :disabled="saving" @change="form.startDate = $event.detail.value"><view class="form-row"><text>开始日期</text><text>{{ form.startDate }} <uni-icons type="right" size="16" color="#ae9788" /></text></view></picker>
      <text v-if="formError" class="form-error">{{ formError }}</text>
      <button class="primary save" :disabled="saving || !!loadError" @tap="submit(false)">{{ saving ? '保存中…' : '保存记录' }}</button>
      <button v-if="editingExisting" class="text-button delete" :disabled="saving" @tap="confirmDelete">删除这次记录</button>
    </view></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPeriodJournal, savePeriod, type PeriodJournal, type PeriodRecord } from '@/services/period'
import { estimatePeriod, periodToday } from '@/utils/period'
import { differenceInCalendarDays } from '@/utils/date'

const system = uni.getSystemInfoSync()
let navTop = Number(system.statusBarHeight || 20) + 6
let navHeight = 32
try { const capsule = uni.getMenuButtonBoundingClientRect(); if (capsule?.top) { navTop = capsule.top; navHeight = capsule.height } } catch (_) {}
const pageStyle = { '--nav-top': `${navTop}px`, '--nav-height': `${navHeight}px` }
const today = ref(periodToday())
const selected = ref(today.value)
const month = ref(today.value.slice(0, 7))
const journal = ref<PeriodJournal>({ revision: 0, records: [] })
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const showHistory = ref(false)
const editor = ref(false)
const editorTitle = ref('记录经期')
const editingExisting = ref(false)
const form = ref<PeriodRecord>({ id: '', startDate: today.value, endDate: null })
const formError = ref('')
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const history = computed(() => journal.value.records.slice().sort((a, b) => b.startDate.localeCompare(a.startDate)))
const prediction = computed(() => estimatePeriod(journal.value.records))
const forecastDistance = computed(() => prediction.value ? differenceInCalendarDays(prediction.value.start, today.value) : 0)
const monthTitle = computed(() => `${Number(month.value.slice(0, 4))} 年 ${Number(month.value.slice(5))} 月`)
const selectedWeekday = computed(() => '周' + weekdays[(new Date(selected.value + 'T00:00:00Z').getUTCDay() + 6) % 7])
function recordOn(date: string) { return journal.value.records.find(record => date === record.startDate) }
const selectedRecord = computed(() => recordOn(selected.value))
const cells = computed(() => {
  const first = month.value + '-01'
  const offset = (new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7
  const [year, m] = month.value.split('-').map(Number)
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1
    const date = day > 0 && day <= count ? `${month.value}-${String(day).padStart(2, '0')}` : ''
    const actual = !!date && !!recordOn(date)
    const predicted = !!date && !actual && !!prediction.value && date === prediction.value.start
    return { key: `${month.value}-${i}`, day, date, actual, predicted }
  })
})
function shortDate(date: string) { return `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日` }
function intervalLabel(record: PeriodRecord) {
  const i = history.value.findIndex(item => item.id === record.id)
  const previous = history.value[i + 1]
  return previous ? ` · 与上次间隔 ${differenceInCalendarDays(record.startDate, previous.startDate)} 天` : ''
}
function changeMonth(delta: number) {
  const [year, m] = month.value.split('-').map(Number)
  const next = new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7)
  if (next < '1900-01' || next > '2100-12') return
  month.value = next
  selected.value = month.value === today.value.slice(0, 7) ? today.value : month.value + '-01'
}
function backToday() { selected.value = today.value; month.value = today.value.slice(0, 7) }
function goBack() { uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) }) }
async function load() {
  if (saving.value || editor.value) return
  loading.value = true
  loadError.value = ''
  try { journal.value = await getPeriodJournal() } catch (error) { loadError.value = error instanceof Error ? error.message : '加载失败，请重试' }
  finally { loading.value = false }
}
onShow(() => { today.value = periodToday(); void load() })
function openNew(backfill: boolean) {
  if (saving.value || loadError.value) return
  today.value = periodToday()
  const date = selected.value > today.value ? today.value : selected.value
  form.value = { id: `period_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`, startDate: date, endDate: null }
  editingExisting.value = false
  editorTitle.value = backfill ? '补记经期' : '记录经期'
  formError.value = ''
  showHistory.value = false
  editor.value = true
}
function openEdit(record: PeriodRecord) {
  today.value = periodToday()
  form.value = { ...record }
  editingExisting.value = true
  editorTitle.value = '修改经期记录'
  formError.value = ''
  showHistory.value = false
  editor.value = true
}
function closeEditor() { if (!saving.value) editor.value = false }
function confirmDelete() {
  if (saving.value) return
  uni.showModal({ title: '删除这次记录？', content: '删除后将重新计算预计日期，此操作不可撤销。', confirmText: '删除', confirmColor: '#db7470', success: result => { if (result.confirm) void submit(true) } })
}
async function submit(remove: boolean) {
  if (saving.value) return
  today.value = periodToday()
  formError.value = ''
  if (!remove && (!form.value.startDate || form.value.startDate > today.value)) { formError.value = '请选择不晚于今天的开始日期'; return }
  saving.value = true
  const payload = { ...form.value, revision: journal.value.revision, remove }
  try {
    journal.value = await savePeriod(payload)
    editor.value = false
    selected.value = payload.startDate
    month.value = selected.value.slice(0, 7)
    uni.showToast({ title: remove ? '已删除' : '已保存', icon: 'success' })
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败，请重试'
    // 网络响应丢失时先读回服务端，避免同一条记录被重复创建。
    try {
      const fresh = await getPeriodJournal()
      journal.value = fresh
      const saved = fresh.records.find(record => record.id === payload.id)
      if ((remove && !saved) || (!remove && saved?.startDate === payload.startDate)) {
        editor.value = false
        selected.value = payload.startDate
        month.value = selected.value.slice(0, 7)
        uni.showToast({ title: remove ? '已删除' : '已保存', icon: 'success' })
      }
    } catch (_) { formError.value += '；暂时无法确认保存结果，请恢复网络后重试' }
  } finally { saving.value = false }
}
</script>

<style scoped lang="scss">
.period-page { height: 100vh; display: flex; flex-direction: column; overflow: hidden; color: #514137; background: linear-gradient(155deg, #f7e3db 0%, #fbf4eb 42%, #faf7f2 100%); font-size: 28rpx; }
.nav { box-sizing: content-box; position: relative; flex-shrink: 0; padding-top: var(--nav-top); height: var(--nav-height); display: flex; align-items: center; justify-content: center; }
.back { position: absolute; left: 26rpx; bottom: 0; width: 64rpx; height: var(--nav-height); display: flex; align-items: center; }
.nav-title { font-size: 34rpx; font-weight: 600; }
.content-scroll { flex: 1; height: 0; min-height: 0; }
.content { padding: 18rpx 28rpx calc(12rpx + env(safe-area-inset-bottom)); }
.glass { background: rgba(252,247,241,.76); border: 1rpx solid rgba(255,255,255,.9); border-radius: 28rpx; box-shadow: 0 12rpx 30rpx rgba(103,73,54,.08); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.summary { position: relative; padding: 18rpx 26rpx; border-radius: 26rpx; background: rgba(249,228,217,.52); border: 1rpx solid rgba(255,255,255,.65); overflow: hidden; }
.summary-main { position: relative; z-index: 1; max-width: 78%; }
.summary-label, .summary-title, .muted { display: block; }
.summary-label { font-size: 28rpx; line-height: 1.5; }
.summary-title { margin-top: 4rpx; font-size: 30rpx; line-height: 1.5; }
.accent { font-size: 40rpx; color: #db7470; font-weight: 600; }
.muted { color: #9d8c80; font-size: 24rpx; line-height: 1.6; }
.summary .muted { margin-top: 6rpx; font-size: 22rpx; }
.sprig { position: absolute; right: -4rpx; bottom: -16rpx; width: 92rpx; height: 130rpx; opacity: .78; }
.calendar { margin-top: 16rpx; padding: 10rpx 18rpx 16rpx; }
.month-head { display: flex; align-items: center; justify-content: space-between; font-size: 31rpx; font-weight: 600; margin-bottom: 4rpx; }
button { font-family: inherit; font-weight: inherit; }
button::after { border: none; }
.icon-button { display: flex; align-items: center; justify-content: center; width: 66rpx; height: 64rpx; margin: 0; padding: 0; background: transparent; }
.week, .days { display: flex; flex-wrap: wrap; }
.week text { width: 14.2857%; text-align: center; color: #94857a; line-height: 44rpx; font-size: 25rpx; }
.day-slot { width: 14.2857%; height: 58rpx; display: flex; align-items: center; justify-content: center; }
.day { box-sizing: border-box; width: 52rpx; height: 52rpx; padding: 0; margin: 0; border: 2rpx solid transparent; border-radius: 50%; line-height: 48rpx; font-size: 27rpx; color: #59463a; background: transparent; }
.day.actual { background: #f8d9d1; color: #a84f4b; }
.day.predicted { border: 2rpx dashed #dc8780; background: #fff3ee; color: #c36b62; }
.actual { background: #f8d9d1; color: #a84f4b; }
.predicted { border: 2rpx dashed #dc8780; background: #fff3ee; color: #c36b62; }
.day.today { font-weight: 700; color: #c96560; }
.day.selected { border: 2rpx solid #d9736d; box-shadow: 0 0 0 4rpx rgba(222,127,114,.1); }
.legend { display: flex; align-items: center; justify-content: center; gap: 28rpx; margin-top: 10rpx; color: #94877c; font-size: 22rpx; }
.legend > view { display: flex; align-items: center; gap: 10rpx; }
.dot { box-sizing: border-box; width: 24rpx; height: 24rpx; border-radius: 50%; }
.legend .text-button { margin: 0; padding: 0; font-size: 22rpx; }
.daily { margin-top: 16rpx; padding: 18rpx 28rpx 6rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: 600; line-height: 1.5; }
.weekday { margin-left: 10rpx; font-size: 28rpx; }
.empty-art { display: block; width: 114rpx; height: 78rpx; margin: 6rpx auto 0; }
.empty-title { display: block; text-align: center; font-size: 28rpx; margin-top: 8rpx; }
.empty-copy { text-align: center; margin: 4rpx 0 14rpx; }
.primary, .outline { display: block; height: 72rpx; padding: 0 22rpx; border-radius: 42rpx; line-height: 72rpx; font-size: 28rpx; margin: 0; }
.primary { background: #db7873; color: #fffaf6; }
.primary[disabled] { background: #eadad1; color: #ac9788; }
.outline { border: 1rpx solid #dcbeb0; color: #ad7b68; background: transparent; }
.text-button { display: flex; align-items: center; justify-content: center; gap: 6rpx; background: transparent; color: #cc7770; font-size: 25rpx; line-height: 1.5; padding: 14rpx 0; margin: 0 auto; }
.record-summary { display: flex; flex-direction: column; align-items: center; gap: 10rpx; padding: 20rpx 0 26rpx; }
.record-title { font-size: 29rpx; }
.history-link { display: flex; align-items: center; gap: 18rpx; margin-top: 16rpx; padding: 16rpx 24rpx; }
.history-icon { display: flex; align-items: center; justify-content: center; width: 64rpx; height: 64rpx; border-radius: 50%; background: #fcf0e9; }
.grow { flex: 1; min-width: 0; }
.footnote { display: block; margin: 12rpx 0 0; text-align: center; font-size: 21rpx; color: #a7988c; line-height: 1.5; }
.feedback { padding: 40rpx 28rpx; text-align: center; }
.feedback .outline { margin-top: 22rpx; }
.mask { position: fixed; inset: 0; z-index: 100; background: rgba(57,43,34,.32); display: flex; align-items: flex-end; }
.sheet { box-sizing: border-box; width: 100%; max-height: 88vh; overflow-y: auto; border-radius: 34rpx 34rpx 0 0; background: #fcf8f3; padding: 18rpx 32rpx calc(26rpx + env(safe-area-inset-bottom)); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.history-scroll { max-height: 58vh; height: 58vh; margin-bottom: 22rpx; }
.history-row { display: flex; align-items: center; gap: 20rpx; padding: 26rpx 4rpx; border-bottom: 1rpx solid #eee3da; }
.history-date { display: block; font-size: 27rpx; line-height: 1.6; }
.history-empty { text-align: center; padding: 70rpx 12rpx; color: #a38d7d; }
.form-help { display: block; font-size: 24rpx; line-height: 1.7; color: #a18d7d; margin: 8rpx 0 18rpx; }
.form-row { display: flex; justify-content: space-between; align-items: center; min-height: 100rpx; border-bottom: 1rpx solid #ede3d8; gap: 20rpx; }
.form-row > text:last-child { color: #8b7464; }
.form-error { display: block; color: #c85d57; font-size: 25rpx; line-height: 1.6; margin-top: 20rpx; }
.save { margin-top: 26rpx; }
.delete { color: #b77268; }
@media (max-height: 720px) {
  .content { padding-top: 12rpx; }
  .summary { padding-top: 12rpx; padding-bottom: 12rpx; }
  .calendar, .daily, .history-link { margin-top: 12rpx; }
  .day-slot { height: 54rpx; }
  .empty-art { height: 62rpx; }
  .daily { padding-top: 14rpx; }
  .history-link { padding-top: 12rpx; padding-bottom: 12rpx; }
}
</style>
