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
// 1900-2100 年农历数据表，低 4 位为闰月月份（0 表示无闰月），0x10000 位为闰月大小，
// 其余 12 位自高位起依次为正月到腊月的大小月。与前端 utils/lunar.ts 保持一致。
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
]
const LUNAR_DAY = 86400000
// 农历 1900 年正月初一对应的公历日期。
const LUNAR_EPOCH = Date.UTC(1900, 0, 31)
const LUNAR_YEAR_MAX = 2099
function lunarInfo(year) {
  const value = LUNAR_INFO[year - 1900]
  if (value === undefined) throw new Error('日期超出农历支持范围（1901-2099 年）')
  return value
}
function leapMonth(y) { return lunarInfo(y) & 0xf }
function leapMonthDays(y) { return leapMonth(y) ? ((lunarInfo(y) & 0x10000) ? 30 : 29) : 0 }
function lunarMonthDays(y, m) { return (lunarInfo(y) & (0x10000 >> m)) ? 30 : 29 }
function lunarYearDays(y) {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) { if (lunarInfo(y) & i) sum++ }
  return sum + leapMonthDays(y)
}
function solarToLunar(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error('公历日期格式不正确')
  const parts = dateStr.split('-').map(Number)
  let offset = Math.round((Date.UTC(parts[0], parts[1] - 1, parts[2]) - LUNAR_EPOCH) / LUNAR_DAY)
  let ly = 1900
  while (offset >= lunarYearDays(ly)) {
    offset -= lunarYearDays(ly)
    ly++
    if (ly > LUNAR_YEAR_MAX + 1) throw new Error('日期超出农历支持范围（1901-2099 年）')
  }
  const leap = leapMonth(ly)
  let lm = 1
  let isLeap = false
  for (;;) {
    const length = isLeap ? leapMonthDays(ly) : lunarMonthDays(ly, lm)
    if (offset < length) break
    offset -= length
    if (!isLeap && leap === lm) { isLeap = true } else { isLeap = false; lm++ }
  }
  return { year: ly, month: lm, day: offset + 1, isLeap }
}
// 闰月纪念日所在年份没有对应闰月时按正常月，三十在小月按廿九。
function lunarOccurrenceInYear(ly, target) {
  const isLeap = target.isLeap && leapMonth(ly) === target.month
  const maxDay = isLeap ? leapMonthDays(ly) : lunarMonthDays(ly, target.month)
  const day = Math.min(target.day, maxDay)
  let days = 0
  for (let y = 1900; y < ly; y++) days += lunarYearDays(y)
  const leap = leapMonth(ly)
  for (let m = 1; m < target.month; m++) {
    days += lunarMonthDays(ly, m)
    if (leap === m) days += leapMonthDays(ly)
  }
  if (isLeap) days += lunarMonthDays(ly, target.month)
  days += day - 1
  const dt = new Date(LUNAR_EPOCH + days * LUNAR_DAY)
  const pad = n => String(n).padStart(2, '0')
  return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate())
}
function nextPlan(item, now = Date.now()) {
  const offset = offsets(item)[0]
  if (offset === undefined) return null
  parseDate(item.targetDate)
  const time = item.reminderTime || '09:00'
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('提醒时刻不正确')
  const today = new Date(now + 8 * 3600000).toISOString().slice(0, 10)
  let occurrence
  let advance
  if (item.calendarType === 'lunar') {
    const target = solarToLunar(item.targetDate)
    let year = Math.max(solarToLunar(today).year, target.year)
    occurrence = lunarOccurrenceInYear(year, target)
    advance = () => { occurrence = lunarOccurrenceInYear(++year, target) }
  } else {
    let year = Math.max(Number(today.slice(0, 4)), Number(item.targetDate.slice(0, 4)))
    const month = Number(item.targetDate.slice(5, 7))
    const day = Number(item.targetDate.slice(8, 10))
    const inYear = y => new Date(Date.UTC(y, month - 1, Math.min(day, new Date(Date.UTC(y, month, 0)).getUTCDate()))).toISOString().slice(0, 10)
    occurrence = inYear(year)
    advance = () => { occurrence = inYear(++year) }
  }
  // 订阅独立于首页的重复展示规则，选择下一次尚未到达的提醒时刻。
  let dueAt = Date.parse(occurrence + 'T' + time + ':00+08:00') - offset * DAY
  while (dueAt <= now) {
    advance()
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
module.exports = { TEMPLATE_ID, offsets, parseDate, nextPlan, solarToLunar, config, accessToken }
