import { solarToLunar, lunarToSolar, formatLunarDate, getNextLunarOccurrence, lunarMonthsOfYear, LUNAR_YEAR_MAX } from '../utils/lunar'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    console.log(`PASS ${name}: ${a}`)
  } else {
    failures++
    console.log(`FAIL ${name}: got ${a}, want ${e}`)
  }
}

// 1. 已知锚点：公历 -> 农历
check('1900-01-31 正月初一', formatLunarDate(solarToLunar('1900-01-31'), true), '1900年正月初一')
check('2024-02-10 春节', formatLunarDate(solarToLunar('2024-02-10'), true), '2024年正月初一')
check('2025-01-29 春节', formatLunarDate(solarToLunar('2025-01-29'), true), '2025年正月初一')
check('2026-02-17 春节', formatLunarDate(solarToLunar('2026-02-17'), true), '2026年正月初一')
check('2023-03-22 闰二月初一', formatLunarDate(solarToLunar('2023-03-22'), true), '2023年闰二月初一')
check('2020-05-23 闰四月初一', formatLunarDate(solarToLunar('2020-05-23'), true), '2020年闰四月初一')
check('2020-06-20 闰四月廿九', formatLunarDate(solarToLunar('2020-06-20'), true), '2020年闰四月廿九')
check('2020-06-21 五月初一(端午前)', formatLunarDate(solarToLunar('2020-06-21')), '五月初一')
check('2024-09-17 中秋', formatLunarDate(solarToLunar('2024-09-17')), '八月十五')
check('2025-10-06 中秋', formatLunarDate(solarToLunar('2025-10-06')), '八月十五')
check('2023-06-22 端午', formatLunarDate(solarToLunar('2023-06-22')), '五月初五')
check('2025-05-31 端午', formatLunarDate(solarToLunar('2025-05-31')), '五月初五')
check('2026-06-19 端午', formatLunarDate(solarToLunar('2026-06-19')), '五月初五')
check('2024-02-09 除夕', formatLunarDate(solarToLunar('2024-02-09')), '腊月三十')
check('2026-09-14 今天', formatLunarDate(solarToLunar('2026-09-14')), '八月初四')

// 2. 农历 -> 公历
check('2025 正月初一', lunarToSolar({ year: 2025, month: 1, day: 1, isLeap: false }), '2025-01-29')
check('2023 闰二月初一', lunarToSolar({ year: 2023, month: 2, day: 1, isLeap: true }), '2023-03-22')
check('2020 闰四月廿九', lunarToSolar({ year: 2020, month: 4, day: 29, isLeap: true }), '2020-06-20')

// 3. 农历年度重复（核心：每年农历生日对应的公历日）
check('八月初四 2026', getNextLunarOccurrence('2026-09-14', '2026-09-14'), '2026-09-14')
check('八月初四 已过一天', getNextLunarOccurrence('2026-09-14', '2026-09-15'), '2027-09-04')
check('正月初一 跨年', getNextLunarOccurrence('2024-02-10', '2026-09-14'), '2027-02-06')
check('腊月三十 小年', getNextLunarOccurrence('2024-02-09', '2026-09-14'), '2027-02-05')
check('未来日期', getNextLunarOccurrence('2027-08-25', '2026-09-14'), '2027-08-25')

// 3b. 闰月语义：目标为闰月日期，来年无闰月时按正常月
const leapTarget = '2023-03-26'
check('闰二月初五 当年未到', getNextLunarOccurrence(leapTarget, '2023-03-01'), '2023-03-26')
const nextYearOcc = getNextLunarOccurrence(leapTarget, '2023-03-27')
check('闰二月初五 来年无闰月回退公历', nextYearOcc, lunarToSolar({ year: 2024, month: 2, day: 5, isLeap: false }))
check('闰二月初五 来年标签', formatLunarDate(solarToLunar(nextYearOcc)), '二月初五')
check('闰月标签保持', formatLunarDate(solarToLunar('2023-03-26')), '闰二月初五')

// 4. 全量往返自检：1970-2099 每一天 solar -> lunar -> solar
let roundTrips = 0
let roundTripFail = 0
{
  let cursor = Date.UTC(1970, 0, 1)
  const end = Date.UTC(2099, 11, 31)
  while (cursor < end) {
    const dt = new Date(cursor)
    const solar = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
    try {
      if (lunarToSolar(solarToLunar(solar)) !== solar) roundTripFail++
    } catch {
      roundTripFail++
    }
    roundTrips++
    cursor += 86400000
  }
}
console.log(`往返自检 ${roundTrips} 天，失败 ${roundTripFail} 天`)
if (roundTripFail > 0) failures++

// 5. 每个农历年月天数之和
for (let y = 1900; y <= LUNAR_YEAR_MAX; y++) {
  const total = lunarMonthsOfYear(y).reduce((s, m) => s + m.days, 0)
  if (total < 353 || total > 385) {
    failures++
    console.log(`FAIL 年份 ${y} 天数异常: ${total}`)
  }
}

// 6. 闰月年份抽查
check('2026 无闰月', lunarMonthsOfYear(2026).length, 12)
check('2023 闰二月', lunarMonthsOfYear(2023).map(m => m.label).filter(l => l.startsWith('闰')), ['闰二月'])
check('2025 闰六月', lunarMonthsOfYear(2025).map(m => m.label).filter(l => l.startsWith('闰')), ['闰六月'])
check('2020 闰四月', lunarMonthsOfYear(2020).map(m => m.label).filter(l => l.startsWith('闰')), ['闰四月'])

if (failures > 0) throw new Error(`${failures} FAILURES`)
console.log('ALL PASSED')
