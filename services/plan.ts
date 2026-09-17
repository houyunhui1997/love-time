import type { ApiResult } from '@/types/api'
import { createCloudObject } from './cloud'

export interface PlanArrangement {
  id: string
  title: string
}

export interface PlanPreparation {
  id: string
  title: string
  completed: boolean
}

export interface DatePlan {
  id: string
  title: string
  date: string
  time: string
  location: string
  note: string
  cover: string
  arrangements: PlanArrangement[]
  preparations: PlanPreparation[]
  createdAt: number
  updatedAt: number
}

export interface PlanJournal {
  revision: number
  records: DatePlan[]
}

export interface SavePlanParams {
  revision: number
  id: string
  title?: string
  date?: string
  time?: string
  location?: string
  note?: string
  cover?: string
  arrangements?: PlanArrangement[]
  preparations?: PlanPreparation[]
  remove?: boolean
}

const cloud = createCloudObject<{
  get(): Promise<ApiResult<PlanJournal>>
  save(params: SavePlanParams): Promise<ApiResult<PlanJournal>>
}>('plan-co')

function unwrap(result: ApiResult<PlanJournal>): PlanJournal {
  if (result.code !== 0 || !result.data) throw new Error(result.message || '约会计划暂时无法保存')
  return result.data
}

export async function getPlanJournal() {
  return unwrap(await cloud.get())
}

export async function savePlan(params: SavePlanParams) {
  return unwrap(await cloud.save(params))
}
