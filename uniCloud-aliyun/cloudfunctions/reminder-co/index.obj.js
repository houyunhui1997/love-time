'use strict'
const crypto = require('crypto')
const { success, normalizeError, AppError, API_CODE } = require('love-common')
const { TEMPLATE_ID, nextPlan, config } = require('love-reminder')
const db = uniCloud.database()
const records = db.collection('anniversaries')
async function owned(context, id) {
  const auth = await context.auth.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '请重新登录')
  if (typeof id !== 'string' || !id) throw new AppError(API_CODE.INVALID_PARAMS, '纪念日不存在')
  const item = (await records.doc(id).get()).data[0]
  if (!item || item.creatorUid !== auth.uid || item.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '纪念日不存在')
  return item
}
module.exports = {
  _before() { this.auth = require('uni-id-common').createInstance({ clientInfo: this.getClientInfo() }) },
  template() { return success({ templateId: TEMPLATE_ID }) },
  async prepare({ id } = {}) {
    try {
      const item = await owned(this, id)
      const current = item.subscription || {}
      if (['pending', 'sending', 'unknown'].includes(current.status)) return success({ templateId: TEMPLATE_ID, status: current.status, label: current.label || '', available: false })
      const plan = nextPlan(item)
      if (!plan) return success({ templateId: TEMPLATE_ID, status: current.status || 'none', available: false, label: '', message: '当前设置为不提醒，请选择提醒时间。' })
      config()
      const user = (await db.collection('uni-id-users').doc(item.creatorUid).get()).data[0]
      const client = this.getClientInfo()
      const openids = user && user.wx_openid || {}
      const openid = openids['mp_' + (client.appId || client.appid)] || openids.mp
      if (!openid) throw new AppError(API_CODE.INVALID_PARAMS, '未找到小程序微信身份，请重新登录')
      const nonce = crypto.randomBytes(24).toString('hex')
      const subscription = { ...plan, status: 'prepared', nonce, openid, expiresAt: Date.now() + 15 * 60000, templateId: TEMPLATE_ID }
      const where = { _id: id, revision: item.revision, status: 'active' }
      where['subscription.status'] = db.command.nin(['pending', 'sending', 'unknown'])
      const changed = await records.where(where).update({ subscription })
      if (!changed.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '状态已变化，请重新打开页面')
      return success({ templateId: TEMPLATE_ID, status: 'prepared', available: true, label: plan.label, nonce })
    } catch (error) { return normalizeError(error) }
  },
  async confirm({ id, nonce } = {}) {
    try {
      const item = await owned(this, id)
      const sub = item.subscription || {}
      if (typeof nonce !== 'string' || sub.nonce !== nonce) throw new AppError(API_CODE.INVALID_PARAMS, '订阅请求已失效，请重新打开页面')
      if (sub.status === 'pending') return success({ label: sub.label })
      if (sub.status !== 'prepared' || sub.expiresAt < Date.now() || sub.dueAt <= Date.now()) throw new AppError(API_CODE.INVALID_PARAMS, '提醒时间或订阅请求已过期，请重新打开页面')
      // accept 由客户端上报，仅安排一次发送尝试；微信发送接口才是授权是否有效的最终依据。
      const result = await records.where({ _id: id, status: 'active', revision: item.revision, 'subscription.nonce': nonce, 'subscription.status': 'prepared' }).update({ 'subscription.status': 'pending', 'subscription.acceptedAt': Date.now(), 'subscription.attempts': 0, 'subscription.nextAttemptAt': sub.dueAt })
      if (!result.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '纪念日已变化，请重新订阅')
      return success({ label: sub.label })
    } catch (error) { return normalizeError(error) }
  },
  async cancel({ id } = {}) {
    try {
      const item = await owned(this, id)
      if (item.subscription && item.subscription.status === 'sending') throw new AppError(API_CODE.INVALID_PARAMS, '消息正在发送，请稍后刷新')
      const changed = await records.where({ _id: id, revision: item.revision, 'subscription.status': db.command.neq('sending') }).update({ subscription: { status: 'cancelled' } })
      if (!changed.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '提醒状态已变化，请刷新后重试')
      return success()
    } catch (error) { return normalizeError(error) }
  }
}
