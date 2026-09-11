'use strict'

const TEMPLATE_ID = 'L6cL832wcHvmpEuBx7HchKV6SLmBGGjGYkY0jX5yIFA'
const DAY = 86400000
function offsets(item) {
  // 旧版编辑页的 0 表示关闭；只有新版记录的 0 才表示当天。
  return (item.reminderOffsetDays || []).filter(d => [0, 1, 3, 7].includes(d) && (d !== 0 || item.reminderVersion === 2))
}
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('纪念日期格式不正确')
  const time = Date.parse(value + 'T00:00:00Z')
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error('纪念日期不存在')
  return time
}
function nextPlan(item, now = Date.now()) {
  const offset = offsets(item)[0]
  if (offset === undefined) return null
  parseDate(item.targetDate)
  const today = new Date(now + 8 * 3600000).toISOString().slice(0, 10)
  let year = Math.max(Number(today.slice(0, 4)), Number(item.targetDate.slice(0, 4)))
    const month = Number(item.targetDate.slice(5, 7))
    const day = Number(item.targetDate.slice(8, 10))
    const inYear = y => new Date(Date.UTC(y, month - 1, Math.min(day, new Date(Date.UTC(y, month, 0)).getUTCDate()))).toISOString().slice(0, 10)
  const time = item.reminderTime || '09:00'
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('提醒时刻不正确')
  // 订阅独立于首页的重复展示规则，选择下一次尚未到达的提醒时刻。
  let occurrence = inYear(year)
  let dueAt = Date.parse(occurrence + 'T' + time + ':00+08:00') - offset * DAY
  while (dueAt <= now) {
    occurrence = inYear(++year)
    dueAt = Date.parse(occurrence + 'T' + time + ':00+08:00') - offset * DAY
  }
  return { occurrence, dueAt, offset, label: new Date(dueAt + 8 * 3600000).toISOString().slice(0, 16).replace('T', ' ') }
}
function config() {
  const stored = require('uni-config-center')({ pluginId: 'uni-id' }).config()
  const selected = Array.isArray(stored) ? stored.find(c => c.dcloudAppid === process.env.LOVE_DCLOUD_APPID) : stored
  const wx = selected && selected['mp-weixin'] && selected['mp-weixin'].oauth && selected['mp-weixin'].oauth.weixin || {}
  const appid = process.env.LOVE_WX_APPID || wx.appid
  const secret = process.env.LOVE_WX_APPSECRET || wx.appsecret
  if (!appid || !secret) throw new Error('请配置小程序云端 AppID 和 AppSecret')
  return { appid, secret }
}
let cachedToken = null
async function accessToken() {
  const { appid, secret } = config()
  if (cachedToken && cachedToken.appid === appid && cachedToken.expiresAt > Date.now()) return cachedToken.value
  const result = await uniCloud.httpclient.request('https://api.weixin.qq.com/cgi-bin/stable_token', {
    method: 'POST', contentType: 'json', dataType: 'json', timeout: 10000,
    data: { grant_type: 'client_credential', appid, secret, force_refresh: false }
  })
  const data = result.data || {}
  if (!data.access_token) throw new Error('获取微信发送凭证失败，错误码：' + (data.errcode || result.status))
  cachedToken = { appid, value: data.access_token, expiresAt: Date.now() + Math.max(0, data.expires_in - 120) * 1000 }
  return cachedToken.value
}
module.exports = { TEMPLATE_ID, offsets, parseDate, nextPlan, config, accessToken }
