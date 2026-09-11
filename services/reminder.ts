import { createCloudObject } from './cloud'
import type { ApiResult } from '@/types/api'

export interface ReminderPlan {
  templateId: string
  status: string
  available: boolean
  label: string
  nonce?: string
  message?: string
}
const reminder = createCloudObject<{
  template(): Promise<ApiResult<{ templateId: string }>>
  prepare(params: { id: string }): Promise<ApiResult<ReminderPlan>>
  confirm(params: { id: string; nonce: string }): Promise<ApiResult<{ label: string }>>
  cancel(params: { id: string }): Promise<ApiResult<null>>
}>('reminder-co')
export async function getReminderTemplate(): Promise<string> {
  const result = await reminder.template()
  if (result.code !== 0 || !result.data?.templateId) throw new Error(result.message || '订阅模板加载失败')
  return result.data.templateId
}
export async function prepareReminder(id: string): Promise<ReminderPlan> {
  const result = await reminder.prepare({ id })
  if (result.code !== 0 || !result.data) throw new Error(result.message || '提醒信息加载失败')
  return result.data
}
export async function confirmReminder(id: string, nonce: string): Promise<string> {
  const result = await reminder.confirm({ id, nonce })
  if (result.code !== 0 || !result.data) throw new Error(result.message || '提醒安排失败')
  return result.data.label
}
export async function cancelReminder(id: string): Promise<void> {
  const result = await reminder.cancel({ id })
  if (result.code !== 0) throw new Error(result.message || '取消失败')
}
// 必须从用户点击事件直接调用，中间不等待网络请求。
export function requestReminderSubscription(templateId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.requestSubscribeMessage({
      tmplIds: [templateId],
      success: result => {
        const status = (result as unknown as Record<string, string>)[templateId]
        if (status === 'accept' || status === 'acceptWithAudio') resolve()
        else reject(new Error('未同意订阅，本次不会新增提醒'))
      },
      fail: () => reject(new Error('无法订阅，请检查微信通知设置后重试'))
    })
    // #endif
    // #ifndef MP-WEIXIN
    reject(new Error('请在微信小程序中订阅提醒'))
    // #endif
  })
}
