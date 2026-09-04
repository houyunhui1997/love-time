import { createCloudObject } from './cloud'

export interface LoveProfile {
  selfName: string
  partnerName: string
  loveStartDate: string
  selfGender?: 'male' | 'female' | null
  selfAvatarFileId?: string | null
}

interface ProfileResponse { code: number; message: string; data: LoveProfile | null }
interface ProfileCloudObject { getMine(): Promise<ProfileResponse> }

interface SaveLoginProfileParams {
  gender: 'male' | 'female'
  nickname: string
  avatarFileId?: string | null
}

interface EditableProfileCloudObject extends ProfileCloudObject {
  saveLoginProfile(params: SaveLoginProfileParams): Promise<ProfileResponse>
}

export async function getMyLoveProfile(): Promise<LoveProfile> {
  const profileCo = createCloudObject<ProfileCloudObject>('profile-co')
  const result = await profileCo.getMine()
  if (result.code !== 0 || !result.data) throw new Error(result.message || '恋爱档案读取失败')
  return result.data
}

export async function saveMyLoginProfile(params: SaveLoginProfileParams): Promise<LoveProfile> {
  const profileCo = createCloudObject<EditableProfileCloudObject>('profile-co')
  const result = await profileCo.saveLoginProfile(params)
  if (result.code !== 0 || !result.data) throw new Error(result.message || '登录资料保存失败')
  return result.data
}
