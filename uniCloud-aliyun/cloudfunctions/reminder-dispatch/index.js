'use strict'
const { accessToken } = require('love-reminder')
const db = uniCloud.database()
const records = db.collection('anniversaries')
exports.main = async (event, context) => {
  // 发送器只允许定时触发，拒绝客户端直接调用。
  if (!event || event.Type !== 'Timer' || !context || context.APPID || context.CLIENTIP || context.SOURCE === 'client' || context.SOURCE === 'http') return { skipped: true }
  const start = Date.now()
  await records.where({ 'subscription.status': 'sending', 'subscription.startedAt': db.command.lt(start - 5 * 60000) }).update({ 'subscription.status': 'unknown', 'subscription.message': '发送结果待确认，不自动重发以免重复通知' })
  const page = await records.where({ status: 'active', 'subscription.status': 'pending', 'subscription.nextAttemptAt': db.command.lte(start) }).orderBy('subscription.nextAttemptAt', 'asc').limit(10).get()
  if (!page.data.length) return { processed: 0 }
  // 凭据失败时保留 pending，下一轮可重新获取，不记录密钥或 token。
  const token = await accessToken()
  let processed = 0
  for (const item of page.data) {
    if (Date.now() - start > 85000) break
    const sub = item.subscription
    const filter = { _id: item._id, revision: item.revision, status: 'active', 'subscription.nonce': sub.nonce, 'subscription.status': 'pending' }
    if (Date.now() - sub.dueAt > 86400000) {
      await records.where(filter).update({ 'subscription.status': 'expired', 'subscription.message': '提醒已超过一天，未再补发' })
      continue
    }
    const claimed = await records.where(filter).update({ 'subscription.status': 'sending', 'subscription.startedAt': Date.now(), 'subscription.attempts': db.command.inc(1) })
    if (!claimed.updated) continue
    const finishFilter = { _id: item._id, 'subscription.nonce': sub.nonce, 'subscription.status': 'sending' }
    let result
    try {
      const current = (await records.doc(item._id).get()).data[0]
      if (!current || current.status !== 'active' || current.revision !== item.revision || current.subscription.nonce !== sub.nonce) continue
      const clip = value => Array.from(value).slice(0, 20).join('')
      const response = await uniCloud.httpclient.request('https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=' + encodeURIComponent(token), {
        method: 'POST', contentType: 'json', dataType: 'json', timeout: 10000,
        data: { touser: sub.openid, template_id: sub.templateId, page: 'pages/anniversary/detail?id=' + encodeURIComponent(item._id), miniprogram_state: process.env.LOVE_WX_MESSAGE_STATE || 'formal', lang: 'zh_CN', data: {
          thing1: { value: clip(sub.offset === 0 ? '今天是你设置的纪念日' : '距离纪念日还有' + sub.offset + '天') },
          thing3: { value: clip(item.title) }, time2: { value: sub.label }
        } }
      })
      result = response.data
    } catch (_) {
      await records.where(finishFilter).update({ 'subscription.status': 'unknown', 'subscription.message': '网络异常，发送结果待确认，不自动重发' })
      continue
    }
    const code = result && result.errcode
    const attempts = (sub.attempts || 0) + 1
    const retry = code === -1 && attempts < 3
    const status = code === 0 ? 'sent' : retry ? 'pending' : code === 43101 ? 'rejected' : typeof code === 'number' ? 'failed' : 'unknown'
    await records.where(finishFilter).update({ 'subscription.status': status, 'subscription.errorCode': typeof code === 'number' ? code : -9999, 'subscription.finishedAt': Date.now(), 'subscription.nextAttemptAt': Date.now() + attempts * 5 * 60000 })
    processed++
  }
  return { processed }
}
