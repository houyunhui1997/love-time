import type { ApiResult } from '@/types/api'
import type { Gender, SpaceMember, SpaceSummary } from './profile'
import { createCloudObject } from './cloud'

export interface ActiveSpace {
  _id: string
  name: string
  code: string
  ownerUid: string
  relationStartDate: string | null
  theme: 'warm-paper' | 'clean'
  memberCount: number
  revision: number
  isOwned: boolean
  isCouple: boolean
}

export interface SpaceContext {
  activeSpace: ActiveSpace
  ownedSpaceId: string
  members: SpaceMember[]
  spaces: SpaceSummary[]
}

export interface SpacePreview {
  spaceId?: string
  name: string
  code: string
  owner: { uid: string; nickname: string; avatarFileId: string | null; gender: Gender | null } | null
  expiresAt?: number
}

interface SpaceCloudObject {
  getContext(): Promise<ApiResult<SpaceContext>>
  updateSpace(params: { name: string; relationStartDate: string | null; revision: number }): Promise<ApiResult<SpaceContext>>
  regenerateCode(): Promise<ApiResult<{ code: string }>>
  previewCode(params: { code: string }): Promise<ApiResult<SpacePreview>>
  joinByCode(params: { code: string }): Promise<ApiResult<SpaceContext>>
  createInvite(): Promise<ApiResult<{ token: string; path: string; expiresAt: number }>>
  getInvite(params: { token: string }): Promise<ApiResult<SpacePreview>>
  joinByInvite(params: { token: string }): Promise<ApiResult<SpaceContext>>
  switchSpace(params: { spaceId: string }): Promise<ApiResult<SpaceContext>>
  unbind(): Promise<ApiResult<SpaceContext>>
}

const spaceCo = createCloudObject<SpaceCloudObject>('space-co')

function unwrap<T>(result: ApiResult<T>, fallback: string): T {
  if (result.code !== 0 || !result.data) throw new Error(result.message || fallback)
  return result.data
}

export async function getSpaceContext() {
  return unwrap(await spaceCo.getContext(), '空间读取失败')
}

export async function updateSpace(params: { name: string; relationStartDate: string | null; revision: number }) {
  return unwrap(await spaceCo.updateSpace(params), '空间保存失败')
}

export async function regenerateSpaceCode() {
  return unwrap(await spaceCo.regenerateCode(), '空间码刷新失败')
}

export async function previewSpaceCode(code: string) {
  return unwrap(await spaceCo.previewCode({ code }), '空间查询失败')
}

export async function joinSpaceByCode(code: string) {
  return unwrap(await spaceCo.joinByCode({ code }), '加入空间失败')
}

export async function createSpaceInvite() {
  return unwrap(await spaceCo.createInvite(), '邀请创建失败')
}

export async function getSpaceInvite(token: string) {
  return unwrap(await spaceCo.getInvite({ token }), '邀请读取失败')
}

export async function joinSpaceByInvite(token: string) {
  return unwrap(await spaceCo.joinByInvite({ token }), '加入空间失败')
}

export async function switchActiveSpace(spaceId: string) {
  return unwrap(await spaceCo.switchSpace({ spaceId }), '空间切换失败')
}

export async function unbindSpace() {
  return unwrap(await spaceCo.unbind(), '解绑失败')
}
