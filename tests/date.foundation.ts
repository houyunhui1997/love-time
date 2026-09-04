import {
  differenceInCalendarDays,
  formatBusinessDate,
  getNextYearlyOccurrence,
  parseBusinessDate
} from '../utils/date'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`)
  }
}

assertEqual(differenceInCalendarDays('2026-09-02', '2025-03-31'), 520, 'relationship days')
assertEqual(differenceInCalendarDays('2026-09-02', '2026-09-02'), 0, 'same day')
assertEqual(getNextYearlyOccurrence('2025-09-27', '2026-09-02'), '2026-09-27', 'upcoming yearly')
assertEqual(getNextYearlyOccurrence('2025-08-01', '2026-09-02'), '2027-08-01', 'past yearly')
assertEqual(getNextYearlyOccurrence('2024-02-29', '2025-01-01'), '2025-02-28', 'leap day policy')
assertEqual(formatBusinessDate(parseBusinessDate('2026-12-31')), '2026-12-31', 'date round trip')

let rejectedInvalidDate = false
try {
  parseBusinessDate('2026-02-30')
} catch {
  rejectedInvalidDate = true
}
assertEqual(rejectedInvalidDate, true, 'invalid date rejection')

console.log('date foundation checks passed')

