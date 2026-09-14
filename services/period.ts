import type { ApiResult } from '@/types/api'
import { createCloudObject } from './cloud'

export interface PeriodRecord { id: string; startDate: string; endDate: string | null }
export interface PeriodJournal { revision: number; records: PeriodRecord[] }
export interface SavePeriodParams extends PeriodRecord { revision: number; remove?: boolean }
const cloud = createCloudObject<{
  get(): Promise<ApiResult<PeriodJournal>>
  save(params: SavePeriodParams): Promise<ApiResult<PeriodJournal>>
}>('period-co')

function unwrap(result: ApiResult<PeriodJournal>): PeriodJournal {
  if (result.code !== 0 || !result.data) throw new Error(result.message || '经期记录暂时无法保存')
  return result.data
}
export async function getPeriodJournal() { return unwrap(await cloud.get()) }
export async function savePeriod(params: SavePeriodParams) { return unwrap(await cloud.save(params)) }
