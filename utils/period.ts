import type { PeriodRecord } from '@/services/period'
import { differenceInCalendarDays } from './date'

export function periodToday(): string { return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10) }
export function addPeriodDays(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10)
}
function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}
export function estimatePeriod(records: PeriodRecord[]) {
  const ordered = records.slice().sort((a, b) => a.startDate.localeCompare(b.startDate))
  if (ordered.length < 2) return null
  const recent = ordered.slice(-7)
  const intervals = recent.slice(1).map((item, i) => differenceInCalendarDays(item.startDate, recent[i].startDate))
  const cycle = median(intervals)
  const start = addPeriodDays(ordered[ordered.length - 1].startDate, cycle)
  return { start, cycle, sampleCount: intervals.length }
}
