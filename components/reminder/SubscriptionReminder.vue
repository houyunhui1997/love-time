<template>
  <view class="reminder-card" :class="{ enabled: isEnabled }">
    <view class="card-header">
      <view class="event-heading" @tap="openDetail">
        <image class="type-icon" :src="iconSrc" mode="aspectFit" />
        <view class="event-copy"><text class="event-title">{{ title }}</text><text class="event-date">纪念日 · {{ targetDate.replace(/-/g, '.') }}</text></view>
      </view>
      <text class="status-badge" :class="{ active: isEnabled, attention: attentionNeeded }">{{ badgeText }}</text>
    </view>
    <view class="schedule-panel">
      <view class="schedule-heading"><uni-icons type="calendar" size="16" color="#a68d7c" /><text>{{ scheduleTitle }}</text></view>
      <view v-if="plan?.label" class="schedule-value"><text class="schedule-date">{{ scheduleDate }}</text><text class="schedule-time">{{ scheduleTime }}</text></view>
      <text v-else class="schedule-placeholder">{{ busy ? '正在读取提醒时间…' : '暂未安排提醒' }}</text>
      <text class="schedule-description">{{ reminderLabel }} · 北京时间</text>
    </view>
    <text v-if="attentionNeeded && !error" class="attention-copy">{{ statusText }}</text>
    <text v-if="error" class="error">{{ error }}</text>
    <view class="card-footer">
      <button class="edit-link" :disabled="busy" @tap="editReminder"><uni-icons type="compose" size="16" color="#a48a79" /><text>修改提醒</text></button>
      <view class="row-actions">
        <button v-if="acceptedNonce" :disabled="busy" class="primary" @tap="saveAccepted">重试保存</button>
        <button v-else-if="busy" class="primary" disabled>处理中…</button>
        <button v-else-if="error" class="primary" @tap="load">重新加载</button>
        <button v-else-if="plan?.available" class="primary" @tap="subscribe">开启本次提醒</button>
        <button v-else-if="plan?.status === 'pending'" class="secondary" @tap="cancel">取消本次提醒</button>
        <button v-else-if="plan?.status === 'unknown'" class="secondary" @tap="cancel">取消提醒</button>
        <button v-else-if="plan?.status === 'sending'" class="secondary" disabled>正在发送</button>
        <button v-else class="primary" @tap="editReminder">设置提醒时间</button>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { prepareReminder, confirmReminder, cancelReminder, requestReminderSubscription, type ReminderPlan } from '@/services/reminder'
const props = defineProps<{ id: string; revision: number; title: string; targetDate: string; reminderLabel: string; eventType: string }>()
const emit = defineEmits<{ (event: 'busy-change', value: boolean): void; (event: 'status-change', value: { id: string; status: string }): void }>()
function openDetail() { uni.navigateTo({ url: '/pages/anniversary/detail?id=' + encodeURIComponent(props.id) }) }
function editReminder() { uni.navigateTo({ url: '/pages/anniversary/edit?id=' + encodeURIComponent(props.id) }) }
const iconSrc = computed(() => {
  const icons: Record<string, string> = {
    countdown: 'countdown-day-paper.png', anniversary: 'anniversary-heart-paper.png', birthday: 'birthday-cake-paper.png'
  }
  return 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/' + (icons[props.eventType] || icons.anniversary)
})
const plan = ref<ReminderPlan | null>(null)
const error = ref('')
const busy = ref(false)
const acceptedNonce = ref('')
let mounted = true
watch(busy, value => { if (mounted) emit('busy-change', value) }, { flush: 'sync' })
onBeforeUnmount(() => { if (busy.value) emit('busy-change', false); mounted = false })
const statusText = computed(() => {
  const labels: Record<string, string> = {
    pending: '本次已订阅', sending: '正在发送',
    unknown: '上次发送结果待确认，暂不自动重发。', sent: '上次提醒已提交微信发送。',
    rejected: '微信订阅授权不足，请重新订阅。', failed: '上次发送失败，可重新订阅。',
    expired: '上次提醒已过期。', cancelled: '已取消本次提醒。'
  }
  return plan.value ? (labels[plan.value.status] || plan.value.message || '本次未订阅') : '正在加载提醒信息…'
})
const isEnabled = computed(() => ['pending', 'sending'].includes(plan.value?.status || ''))
const attentionNeeded = computed(() => ['unknown', 'failed', 'rejected', 'expired'].includes(plan.value?.status || ''))
const badgeText = computed(() => {
  if (isEnabled.value) return plan.value?.status === 'sending' ? '发送中' : '已开启'
  if (attentionNeeded.value || error.value) return '待处理'
  if (!plan.value) return '读取中'
  return '未开启'
})
const scheduleTitle = computed(() => plan.value?.status === 'unknown' ? '待确认的提醒时间' : isEnabled.value ? '下一次提醒' : '开启后将提醒于')
const scheduleDate = computed(() => (plan.value?.label.split(' ')[0] || '').replace(/-/g, '.'))
const scheduleTime = computed(() => plan.value?.label.split(' ')[1] || '')
watch([plan, error], () => {
  if (mounted) emit('status-change', { id: props.id, status: plan.value?.status || (error.value ? 'failed' : '') })
}, { immediate: true, deep: true })
async function load() {
  if (busy.value || !props.id) return
  busy.value = true
  error.value = ''
  try { plan.value = await prepareReminder(props.id) }
  catch (e) { error.value = e instanceof Error ? e.message : '提醒信息加载失败' }
  finally { busy.value = false }
}
async function persistAccepted() {
  const label = await confirmReminder(props.id, acceptedNonce.value)
  plan.value = { ...plan.value!, status: 'pending', available: false, label }
  acceptedNonce.value = ''
}
async function subscribe() {
  if (busy.value || !plan.value?.available || !plan.value.nonce) return
  busy.value = true
  error.value = ''
  try {
    await requestReminderSubscription(plan.value.templateId)
    acceptedNonce.value = plan.value.nonce
    await persistAccepted()
  } catch (e) { error.value = e instanceof Error ? e.message : '订阅失败' }
  finally { busy.value = false }
}
async function saveAccepted() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try { await persistAccepted() }
  catch (e) { error.value = e instanceof Error ? e.message : '保存失败，请重试' }
  finally { busy.value = false }
}
async function cancel() {
  if (busy.value) return
  busy.value = true
  try {
    await cancelReminder(props.id)
    plan.value = { ...plan.value!, available: false, status: 'cancelled', label: '' }
    acceptedNonce.value = ''
  } catch (e) { error.value = e instanceof Error ? e.message : '取消失败' }
  finally { busy.value = false }
  if (!error.value) await load()
}
watch(() => [props.id, props.revision], () => { acceptedNonce.value = ''; void load() }, { immediate: true })
</script>
<style scoped>
.reminder-card { padding: 28rpx; border: 1rpx solid #eee5dc; border-radius: 28rpx; background: #fffdf9; box-shadow: 0 8rpx 24rpx rgba(96,69,49,.035); }
.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.event-heading { display: flex; align-items: center; flex: 1; min-width: 0; gap: 14rpx; }
.type-icon { width: 68rpx; height: 68rpx; flex: 0 0 68rpx; }
.event-copy { flex: 1; min-width: 0; }
.event-title { display: block; color: #5b463a; font-size: 30rpx; line-height: 1.4; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-date { display: block; margin-top: 5rpx; color: #ad9787; font-size: 22rpx; line-height: 1.6; }
.status-badge { flex-shrink: 0; margin-top: 5rpx; padding: 7rpx 16rpx; border-radius: 25rpx; background: #f0ebe5; color: #a29182; font-size: 22rpx; line-height: 1.4; }
.status-badge.active { background: #edf0e7; color: #7c8b68; }
.status-badge.attention { background: #faeee0; color: #b58d56; }
.schedule-panel { margin-top: 24rpx; padding: 22rpx 24rpx; border-radius: 20rpx; background: #f8f3ed; }
.enabled .schedule-panel { background: #f8f2ec; }
.schedule-heading { display: flex; align-items: center; gap: 10rpx; color: #a28b7b; font-size: 23rpx; }
.schedule-value { display: flex; flex-wrap: wrap; align-items: baseline; gap: 22rpx; margin-top: 16rpx; }
.schedule-date { color: #785a49; font-size: 37rpx; font-weight: 550; line-height: 1.3; font-variant-numeric: tabular-nums; }
.schedule-time { color: #bd746b; font-size: 37rpx; font-weight: 600; line-height: 1.3; font-variant-numeric: tabular-nums; }
.schedule-placeholder { display: block; margin-top: 16rpx; color: #a38b7a; font-size: 28rpx; }
.schedule-description { display: block; margin-top: 14rpx; color: #ab9585; font-size: 22rpx; line-height: 1.6; }
.card-footer { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding-top: 22rpx; }
button { font-family: inherit; }
button::after { border: 0; }
.edit-link { display: flex; align-items: center; gap: 8rpx; margin: 0; padding: 10rpx 0; color: #a48a79; background: transparent; font-size: 24rpx; line-height: 1.5; }
.row-actions { flex-shrink: 0; }
.primary, .secondary { margin: 0; min-width: 210rpx; padding: 0 22rpx; border-radius: 34rpx; font-size: 25rpx; line-height: 66rpx; }
.primary { color: white; background: #cf8178; }
.secondary { color: #a28574; background: transparent; border: 1rpx solid #e8d9cc; }
button[disabled] { opacity: .55; }
.attention-copy, .error { display: block; margin-top: 18rpx; font-size: 24rpx; line-height: 1.6; color: #b58a5d; overflow-wrap: anywhere; }
.error { color: #ba7065; }
@media screen and (max-width: 350px) { .reminder-card { padding: 22rpx; } .primary, .secondary { min-width: 180rpx; padding: 0 16rpx; } .schedule-date, .schedule-time { font-size: 33rpx; } }
</style>



