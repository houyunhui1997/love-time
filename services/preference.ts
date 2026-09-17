import type { ApiResult } from '@/types/api'
import { createCloudObject } from './cloud'

export type PreferenceCategory = 'like' | 'dislike' | 'habit' | 'remember'

export interface PreferenceMemo {
  id: string
  title: string
  category: PreferenceCategory
  tag: string
  note: string
  createdAt: number
  updatedAt: number
}

export interface PreferenceJournal {
  revision: number
  records: PreferenceMemo[]
}

export interface SavePreferenceParams {
  revision: number
  id: string
  title?: string
  category?: PreferenceCategory
  tag?: string
  note?: string
  remove?: boolean
}

const cloud = createCloudObject<{
  get(): Promise<ApiResult<PreferenceJournal>>
  save(params: SavePreferenceParams): Promise<ApiResult<PreferenceJournal>>
}>('preference-co')

function unwrap(result: ApiResult<PreferenceJournal>): PreferenceJournal {
  if (result.code !== 0 || !result.data) throw new Error(result.message || '偏好备忘暂时无法保存')
  return result.data
}

export async function getPreferenceJournal() {
  return unwrap(await cloud.get())
}

export async function savePreference(params: SavePreferenceParams) {
  return unwrap(await cloud.save(params))
}
