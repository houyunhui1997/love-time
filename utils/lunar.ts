export type CalendarType = 'solar' | 'lunar'

export interface LunarDate {
  year: number
  month: number
  day: number
  isLeap: boolean
}

export interface LunarMonthOption {
  month: number
  isLeap: boolean
  label: string
  days: number
}

// 1900-2100 年农历数据表，低 4 位为闰月月份（0 表示无闰月），0x10000 位为闰月大小，
// 其余 12 位自高位起依次为正月到腊月的大小月。
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

const MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
export const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
]

const DAY = 86_400_000
// 农历 1900 年正月初一对应的公历日期。
const EPOCH = Date.UTC(1900, 0, 31)

export const LUNAR_YEAR_MIN = 1901
export const LUNAR_YEAR_MAX = 2099

function info(year: number): number {
  const value = LUNAR_INFO[year - 1900]
  if (value === undefined) throw new Error('日期超出农历支持范围（1901-2099 年）')
  return value
}

export function getLeapMonth(lunarYear: number): number {
  return info(lunarYear) & 0xf
}

export function getLeapMonthDays(lunarYear: number): number {
  return getLeapMonth(lunarYear) ? ((info(lunarYear) & 0x10000) ? 30 : 29) : 0
}

export function getLunarMonthDays(lunarYear: number, month: number, isLeap = false): number {
  return isLeap ? getLeapMonthDays(lunarYear) : ((info(lunarYear) & (0x10000 >> month)) ? 30 : 29)
}

function getLunarYearDays(lunarYear: number): number {
  let sum = 348
  for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
    if (info(lunarYear) & bit) sum++
  }
  return sum + getLeapMonthDays(lunarYear)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function solarToLunar(dateStr: string): LunarDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error('公历日期格式不正确')
  const [y, m, d] = dateStr.split('-').map(Number)
  let offset = Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY)
  let lunarYear = 1900
  while (offset >= getLunarYearDays(lunarYear)) {
    offset -= getLunarYearDays(lunarYear)
    lunarYear++
    if (lunarYear > LUNAR_YEAR_MAX + 1) throw new Error('日期超出农历支持范围（1901-2099 年）')
  }
  const leap = getLeapMonth(lunarYear)
  let lunarMonth = 1
  let isLeap = false
  for (;;) {
    const length = getLunarMonthDays(lunarYear, lunarMonth, isLeap)
    if (offset < length) break
    offset -= length
    if (!isLeap && leap === lunarMonth) {
      isLeap = true
    } else {
      isLeap = false
      lunarMonth++
    }
  }
  return { year: lunarYear, month: lunarMonth, day: offset + 1, isLeap }
}

export function lunarToSolar(lunar: LunarDate): string {
  const { year, month, day, isLeap } = lunar
  if (year < LUNAR_YEAR_MIN || year > LUNAR_YEAR_MAX) throw new Error('农历年份需在 1901-2099 年')
  if (month < 1 || month > 12) throw new Error('农历月份不正确')
  const leap = getLeapMonth(year)
  if (isLeap && leap !== month) throw new Error(`农历 ${year} 年没有闰${MONTH_NAMES[month - 1]}月`)
  const maxDay = getLunarMonthDays(year, month, isLeap)
  if (day < 1 || day > maxDay) throw new Error('农历日期不正确')
  let days = 0
  for (let y = 1900; y < year; y++) days += getLunarYearDays(y)
  for (let m = 1; m < month; m++) {
    days += getLunarMonthDays(year, m)
    if (leap === m) days += getLeapMonthDays(year)
  }
  if (isLeap) days += getLunarMonthDays(year, month)
  days += day - 1
  const dt = new Date(EPOCH + days * DAY)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

export function formatLunarDate(lunar: LunarDate, withYear = false): string {
  const monthLabel = (lunar.isLeap ? '闰' : '') + MONTH_NAMES[lunar.month - 1] + '月'
  const dayLabel = LUNAR_DAY_NAMES[lunar.day - 1] || String(lunar.day)
  return (withYear ? `${lunar.year}年` : '') + monthLabel + dayLabel
}

export function formatSolarToLunar(dateStr: string, withYear = false): string {
  return formatLunarDate(solarToLunar(dateStr), withYear)
}

export function lunarMonthsOfYear(lunarYear: number): LunarMonthOption[] {
  const leap = getLeapMonth(lunarYear)
  const months: LunarMonthOption[] = []
  for (let m = 1; m <= 12; m++) {
    months.push({ month: m, isLeap: false, label: MONTH_NAMES[m - 1] + '月', days: getLunarMonthDays(lunarYear, m) })
    if (leap === m) {
      months.push({ month: m, isLeap: true, label: '闰' + MONTH_NAMES[m - 1] + '月', days: getLeapMonthDays(lunarYear) })
    }
  }
  return months
}

// 闰月纪念日所在年份没有对应闰月时，按正常月处理；三十在小月按廿九处理。
function lunarOccurrenceInYear(lunarYear: number, target: LunarDate): string {
  const leap = getLeapMonth(lunarYear)
  let isLeap = target.isLeap && leap === target.month
  const maxDay = getLunarMonthDays(lunarYear, target.month, isLeap)
  return lunarToSolar({ year: lunarYear, month: target.month, day: Math.min(target.day, maxDay), isLeap })
}

export function getNextLunarOccurrence(targetDate: string, today: string): string {
  const target = solarToLunar(targetDate)
  const todayLunar = solarToLunar(today)
  let lunarYear = Math.max(todayLunar.year, target.year)
  for (;;) {
    const occurrence = lunarOccurrenceInYear(lunarYear, target)
    if (occurrence >= today || lunarYear >= LUNAR_YEAR_MAX) return occurrence
    lunarYear++
  }
}
