import { createCloudObject } from './cloud'

export type Gender = 'male' | 'female'

export interface AccountProfile {
  nickname: string
  avatarFileId: string | null
  gender: Gender | null
}

export interface LoveProfile {
  _id: string
  selfName: string
  partnerName: string
  loveStartDate: string
  selfGender: Gender
  selfAvatarFileId: string | null
  partnerAvatarFileId: string | null
  revision: number
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface SaveLoginProfileParams {
  gender: Gender
  nickname: string
  avatarFileId?: string | null
}

export interface SaveLoveProfileParams {
  selfName: string
  partnerName: string
  loveStartDate: string
  partnerAvatarFileId?: string | null
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
  if (result.code !== 0 || !result.data) throw new Error(result.message || '登录资料保存失败')
  return result.data
}

export async function saveMyLoveProfile(params: SaveLoveProfileParams): Promise<LoveProfile> {
  const result = await getProfileCloudObject().saveLoveProfile(params)
  if (result.code !== 0 || !result.data) throw new Error(result.message || '恋爱档案保存失败')
  return result.data
}
