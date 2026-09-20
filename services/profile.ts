import { createCloudObject } from './cloud'

export type Gender = 'male' | 'female'

export interface AccountProfile {
  nickname: string
  avatarFileId: string | null
  gender: Gender | null
}

export interface LoveProfile {
  _id: string
  partnerName: string
  loveStartDate: string
  revision: number
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface SaveCompleteProfileParams {
  nickname: string
  avatarFileId?: string | null
  partnerName: string
  loveStartDate: string
}

export interface SaveAccountProfileParams {
  nickname: string
  avatarFileId?: string | null
}

export interface SaveLoveProfileParams {
  partnerName?: string
  loveStartDate: string
}

export interface CompleteProfileResult {
  account: AccountProfile
  profile: LoveProfile
}

interface ProfileCloudObject {
  getAccount(): Promise<ApiResponse<AccountProfile | null>>
  getMine(): Promise<ApiResponse<LoveProfile | null>>
  saveAccount(params: SaveAccountProfileParams): Promise<ApiResponse<AccountProfile | null>>
  saveLoveProfile(params: SaveLoveProfileParams): Promise<ApiResponse<LoveProfile | null>>
  saveCompleteProfile(params: SaveCompleteProfileParams): Promise<ApiResponse<CompleteProfileResult | null>>
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

export async function saveMyAccountProfile(params: SaveAccountProfileParams): Promise<AccountProfile> {
  const result = await getProfileCloudObject().saveAccount(params)
  if (result.code !== 0 || !result.data) throw new Error(result.message || '个人资料保存失败')
  return result.data
}

export async function saveMyLoveProfile(params: SaveLoveProfileParams): Promise<LoveProfile> {
  const result = await getProfileCloudObject().saveLoveProfile(params)
  if (result.code !== 0 || !result.data) throw new Error(result.message || '恋爱资料保存失败')
  return result.data
}

export async function saveMyCompleteProfile(params: SaveCompleteProfileParams): Promise<CompleteProfileResult> {
  const result = await getProfileCloudObject().saveCompleteProfile(params)
  if (result.code !== 0 || !result.data) throw new Error(result.message || '资料保存失败')
  return result.data
}
