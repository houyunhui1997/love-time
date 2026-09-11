<template>
  <view class="subscription-row">
    <view class="row-main" @tap="openDetail">
      <text class="row-title">{{ title }}</text>
      <text class="row-date">{{ targetDate.replace(/-/g, '.') }} · {{ reminderLabel }}</text>
      <text class="row-status" :class="{ enabled: plan?.status === 'pending' }">{{ statusText }}</text>
      <text v-if="plan?.label" class="schedule">{{ plan.label }} 提醒</text>
      <text v-if="error" class="error">{{ error }}</text>
    </view>
    <view class="row-actions">
      <button v-if="acceptedNonce" :disabled="busy" @tap="saveAccepted">重试保存</button>
      <button v-else-if="busy" disabled>处理中</button>
      <button v-else-if="error" class="secondary" @tap="load">重试</button>
      <button v-else-if="plan?.available" @tap="subscribe">开启订阅</button>
      <button v-else-if="plan?.status === 'pending'" class="secondary" @tap="cancel">取消订阅</button>
      <button v-else-if="plan?.status === 'unknown'" class="secondary" @tap="cancel">取消提醒</button>
      <button v-else-if="plan?.status === 'sending'" disabled>发送中</button>
      <button v-else class="secondary" @tap="editReminder">设置提醒</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { prepareReminder, confirmReminder, cancelReminder, requestReminderSubscription, type ReminderPlan } from '@/services/reminder'
const props = defineProps<{ id: string; revision: number; title: string; targetDate: string; reminderLabel: string }>()
const emit = defineEmits<{ (event: 'busy-change', value: boolean): void }>()
function openDetail() { uni.navigateTo({ url: '/pages/anniversary/detail?id=' + encodeURIComponent(props.id) }) }
function editReminder() { uni.navigateTo({ url: '/pages/anniversary/edit?id=' + encodeURIComponent(props.id) }) }
const plan = ref<ReminderPlan | null>(null)
const error = ref('')
const busy = ref(false)
const acceptedNonce = ref('')
watch(busy, value => emit('busy-change', value), { flush: 'sync' })
const statusText = computed(() => {
  const labels: Record<string, string> = {
    pending: '已开启本次订阅', sending: '消息正在发送。',
    unknown: '上次发送结果待确认，暂不自动重发。', sent: '上次提醒已提交微信发送。',
    rejected: '微信订阅授权不足，请重新订阅。', failed: '上次发送失败，可重新订阅。',
    expired: '上次提醒已过期。', cancelled: '已取消本次提醒。'
  }
  return plan.value ? (labels[plan.value.status] || plan.value.message || '尚未开启本次订阅') : '正在加载提醒信息…'
})
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
.subscription-row { display: flex; align-items: center; gap: 20rpx; padding: 30rpx 24rpx; border-bottom: 1rpx solid #eee3d9; }
.subscription-row:last-child { border-bottom: 0; }
.row-main { flex: 1; min-width: 0; }
.row-title, .row-date, .row-status, .schedule, .error { display: block; }
.row-title { color: #57483e; font-size: 29rpx; font-weight: 600; overflow-wrap: anywhere; }
.row-date { color: #9a8576; font-size: 23rpx; margin-top: 10rpx; line-height: 1.5; }
.row-status { margin-top: 10rpx; color: #9a8576; font-size: 23rpx; line-height: 1.5; }
.row-status.enabled, .schedule { color: #b85f60; }
.schedule { margin-top: 8rpx; font-size: 23rpx; }
.row-actions { flex: 0 0 152rpx; }
button { margin: 0; padding: 0 12rpx; border-radius: 32rpx; font-size: 24rpx; line-height: 64rpx; background: #de7672; color: white; }
button::after { border: 0; }
button.secondary { background: #f4e9df; color: #956b61; }
button[disabled] { background: #eee8e1; color: #aa9b8d; }
.error { margin-top: 10rpx; font-size: 23rpx; line-height: 1.5; color: #b04f4b; }
</style>

