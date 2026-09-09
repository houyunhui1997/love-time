import { createCloudObject } from './cloud'

export type Gender = 'male' | 'female'

export interface AccountProfile {
  nickname: string
  avatarFileId: string | null
  gender: Gender | null
}

export interface LoveProfile {
  _id: string
  coupleId: string | null
  spaceId: string
  spaceName: string
  spaceCode: string
  ownedSpaceId: string
  isOwnedSpace: boolean
  isCouple: boolean
  selfName: string
  partnerName: string
  loveStartDate: string
  selfGender: Gender | null
  selfAvatarFileId: string | null
  partnerAvatarFileId: string | null
  members: SpaceMember[]
  spaces: SpaceSummary[]
  revision: number
}

export interface SpaceMember {
  uid: string
  role: 'owner' | 'member'
  nickname: string
  avatarFileId: string | null
  gender: Gender | null
  joinedAt: number
}

export interface SpaceSummary {
  _id: string
  name: string
  code: string
  memberCount: number
  isOwned: boolean
  isActive: boolean
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface SaveLoginProfileParams {
  gender?: Gender | null
  nickname?: string
  avatarFileId?: string | null
}

export interface SaveLoveProfileParams {
  spaceName: string
  loveStartDate: string
  revision: number
}

interface ProfileCloudObject {
  getAccount(): Promise<ApiResponse<AccountProfile | null>>
  getMine(): Promise<ApiResponse<LoveProfile | null>>
  saveLoginProfile(params: SaveLoginProfileParams): Promise<ApiResponse<AccountProfile | null>>
  saveLoveProfile(params: SaveLoveProfileParams): Promise<ApiResponse<LoveProfile | null>>
}

function getProfileCloudObject(): ProfileCloudObject {
  return createCloudObject<ProfileCloudObject>('profile-co')
}

export async function getMyAccountProfile(): Promise<AccountProfile> {
  const result = await getProfileCloudObject().getAccount()
  if (result.code !== 0 || !result.data) throw new Error(result.message || '账号资料读取失败')
  return result.data
}

export async function getMyLoveProfile(): Promise<LoveProfile | null> {
  const result = await getProfileCloudObject().getMine()
  if (result.code !== 0) throw new Error(result.message || '恋爱档案读取失败')
  return result.data
}

export async function saveMyLoginProfile(params: SaveLoginProfileParams): Promise<AccountProfile> {
  const result = await getProfileCloudObject().saveLoginProfile(params)
  if (result.code !== 0 || !result.data) throw new Error(result.message || '个人资料保存失败')
  return result.data
}

export async function saveMyLoveProfile(params: SaveLoveProfileParams): Promise<LoveProfile> {
  const result = await getProfileCloudObject().saveLoveProfile(params)
  if (result.code !== 0 || !result.data) throw new Error(result.message || '恋爱档案保存失败')
  return result.data
}
