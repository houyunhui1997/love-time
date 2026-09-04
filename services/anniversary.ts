import type { ApiResult, CursorPage } from '@/types/api'
import type { Anniversary, AnniversaryType, AnniversaryRepeat, Visibility } from '@/types/domain'
import { createCloudObject } from './cloud'

export interface AnniversaryListItem {
  _id: string
  title: string
  eventType: AnniversaryType
  targetDate: string
  repeatType: AnniversaryRepeat
  reminderOffsetDays: number[]
  reminderTime: string
  note: string
  pinned: boolean
  visibility: Visibility
  source: 'user' | 'love-profile'
  revision: number
}

interface AnniversaryCloudObject {
  list(params: { cursor?: string }): Promise<ApiResult<CursorPage<AnniversaryListItem>>>
  detail(params: { id: string }): Promise<ApiResult<AnniversaryListItem>>
  create(params: CreateAnniversaryParams): Promise<ApiResult<AnniversaryListItem>>
  update(params: UpdateAnniversaryParams): Promise<ApiResult<{ _id: string }>>
  remove(params: { id: string }): Promise<ApiResult<{ _id: string }>>
}

export interface CreateAnniversaryParams {
  title: string
  eventType: AnniversaryType
  targetDate: string
  repeatType: AnniversaryRepeat
  reminderOffsetDays: number[]
  note: string
  pinned: boolean
  visibility: Visibility
}

export interface UpdateAnniversaryParams extends Partial<CreateAnniversaryParams> {
  id: string
  revision: number
}

const anniversaryCo = createCloudObject<AnniversaryCloudObject>('anniversary-co')

export async function listAnniversaries(cursor?: string): Promise<CursorPage<AnniversaryListItem>> {
  const result = await anniversaryCo.list({ cursor })
  if (result.code !== 0 || !result.data) throw new Error(result.message || '纪念日列表加载失败')
  return result.data
}

export async function getAnniversary(id: string): Promise<AnniversaryListItem> {
  const result = await anniversaryCo.detail({ id })
  if (result.code !== 0 || !result.data) throw new Error(result.message || '纪念日加载失败')
  return result.data
}

export async function createAnniversary(params: CreateAnniversaryParams): Promise<AnniversaryListItem> {
  const result = await anniversaryCo.create(params)
  if (result.code !== 0 || !result.data) throw new Error(result.message || '纪念日创建失败')
  return result.data
}

export async function updateAnniversary(params: UpdateAnniversaryParams): Promise<void> {
  const result = await anniversaryCo.update(params)
  if (result.code !== 0) throw new Error(result.message || '纪念日更新失败')
}

export async function removeAnniversary(id: string): Promise<void> {
  const result = await anniversaryCo.remove({ id })
  if (result.code !== 0) throw new Error(result.message || '纪念日删除失败')
}
