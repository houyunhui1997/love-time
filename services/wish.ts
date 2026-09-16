import type { ApiResult } from '@/types/api'
import { createCloudObject } from './cloud'

export interface WishItem {
  id: string
  title: string
  description: string
  cover: string
  source: 'template' | 'custom'
  templateId: string | null
  completed: boolean
  createdAt: number
  updatedAt: number
}

export interface WishJournal {
  revision: number
  records: WishItem[]
}

export interface SaveWishParams {
  revision: number
  id: string
  title?: string
  description?: string
  cover?: string
  source?: 'template' | 'custom'
  templateId?: string | null
  completed?: boolean
  remove?: boolean
}

const cloud = createCloudObject<{
  get(): Promise<ApiResult<WishJournal>>
  save(params: SaveWishParams): Promise<ApiResult<WishJournal>>
}>('wish-co')

function unwrap(result: ApiResult<WishJournal>): WishJournal {
  if (result.code !== 0 || !result.data) throw new Error(result.message || '心愿清单暂时无法保存')
  return result.data
}

export async function getWishJournal() {
  return unwrap(await cloud.get())
}

export async function saveWish(params: SaveWishParams) {
  return unwrap(await cloud.save(params))
}
