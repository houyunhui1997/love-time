import type { ApiResult } from '@/types/api'
import { createCloudObject } from './cloud'
import { getActiveSpaceOwnerUid, getCurrentUserId, setActiveSpaceOwnerUid } from './space-context'

export interface SpacePerson {
  uid: string
  nickname: string
  avatarFileId: string | null
}

export interface SpaceOverview {
  inviteCode: string
  owner: SpacePerson
  member: SpacePerson | null
  joinedOwner: SpacePerson | null
  activeOwnerUid: string
}

export interface InvitePreview {
  inviteCode: string
  owner: SpacePerson
  available: boolean
  joined: boolean
  self: boolean
  message: string
}

const cloud = createCloudObject<{
  overview(params?: { spaceOwnerUid?: string }): Promise<ApiResult<SpaceOverview>>
  preview(params: { inviteCode: string }): Promise<ApiResult<InvitePreview>>
  join(params: { inviteCode: string }): Promise<ApiResult<{ ownerUid: string }>>
  leave(): Promise<ApiResult<null>>
  removeMember(): Promise<ApiResult<null>>
}>('space-co', { injectSpace: false })

function unwrap<T>(result: ApiResult<T>, fallback: string): T {
  if (result.code !== 0 || result.data === null || result.data === undefined) throw new Error(result.message || fallback)
  return result.data
}

export async function getSpaceOverview(): Promise<SpaceOverview> {
  const result = unwrap(await cloud.overview({ spaceOwnerUid: getActiveSpaceOwnerUid() }), '情侣空间加载失败')
  setActiveSpaceOwnerUid(result.activeOwnerUid || getCurrentUserId())
  return result
}

export async function getInvitePreview(inviteCode: string): Promise<InvitePreview> {
  return unwrap(await cloud.preview({ inviteCode }), '邀请信息加载失败')
}

export async function joinSpace(inviteCode: string): Promise<string> {
  const result = unwrap(await cloud.join({ inviteCode }), '加入空间失败')
  setActiveSpaceOwnerUid(result.ownerUid)
  return result.ownerUid
}

export async function leaveJoinedSpace(): Promise<void> {
  const result = await cloud.leave()
  if (result.code !== 0) throw new Error(result.message || '退出空间失败')
  setActiveSpaceOwnerUid(getCurrentUserId())
}

export async function removeSpaceMember(): Promise<void> {
  const result = await cloud.removeMember()
  if (result.code !== 0) throw new Error(result.message || '移除成员失败')
}

export function switchToSpace(ownerUid: string): void {
  setActiveSpaceOwnerUid(ownerUid)
}
