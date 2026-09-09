import type { ApiResult, CursorPage } from '@/types/api'
import type { MomentMood, Visibility } from '@/types/domain'
import { createCloudObject } from './cloud'

export interface MomentListItem {
  _id: string
  spaceId: string
  creatorUid: string
  creatorName: string
  creatorAvatarFileId: string | null
  isMine: boolean
  title: string
  titleCustomized: boolean
  content: string
  mood: MomentMood
  occurredAt: number
  occurredMonth: string
  mediaIds: string[]
  visibility: Visibility
  createdAt: number
  revision: number
}

interface MomentCloudObject {
  list(params: { month?: string; cursor?: string }): Promise<ApiResult<CursorPage<MomentListItem>>>
  detail(params: { id: string }): Promise<ApiResult<MomentListItem>>
  create(params: CreateMomentParams): Promise<ApiResult<MomentListItem>>
  update(params: UpdateMomentParams): Promise<ApiResult<{ _id: string }>>
  remove(params: { id: string }): Promise<ApiResult<{ _id: string }>>
}

export interface CreateMomentParams {
  title?: string
  content: string
  mood: MomentMood
  occurredAt: number
  mediaIds: string[]
  visibility: Visibility
}

export interface UpdateMomentParams extends Partial<CreateMomentParams> {
  id: string
  revision: number
}

const momentCo = createCloudObject<MomentCloudObject>('moment-co')

export async function listMoments(month?: string, cursor?: string): Promise<CursorPage<MomentListItem>> {
  const result = await momentCo.list({ month, cursor })
  if (result.code !== 0 || !result.data) throw new Error(result.message || '时光轴加载失败')
  return result.data
}

export async function getMoment(id: string): Promise<MomentListItem> {
  const result = await momentCo.detail({ id })
  if (result.code !== 0 || !result.data) throw new Error(result.message || '时刻加载失败')
  return result.data
}

export async function createMoment(params: CreateMomentParams): Promise<MomentListItem> {
  const result = await momentCo.create(params)
  if (result.code !== 0 || !result.data) throw new Error(result.message || '记录失败')
  return result.data
}

export async function updateMoment(params: UpdateMomentParams): Promise<void> {
  const result = await momentCo.update(params)
  if (result.code !== 0) throw new Error(result.message || '更新失败')
}

export async function removeMoment(id: string): Promise<void> {
  const result = await momentCo.remove({ id })
  if (result.code !== 0) throw new Error(result.message || '删除失败')
}
