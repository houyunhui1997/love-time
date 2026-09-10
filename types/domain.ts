export type RecordStatus = 'active' | 'deleted'

export interface LoveProfile {
  _id: string
  ownerUid: string
  selfName: string
  partnerName: string
  selfGender: 'male' | 'female' | null
  selfAvatarFileId: string | null
  partnerAvatarFileId: string | null
  loveStartDate: string
  theme: 'warm-paper' | 'clean'
  createdAt: number
  updatedAt: number
  revision: number
}

export type AnniversaryType = 'countdown' | 'anniversary' | 'birthday'
export type AnniversaryRepeat = 'none' | 'yearly'

export interface Anniversary {
  _id: string
  creatorUid: string
  title: string
  eventType: AnniversaryType
  targetDate: string
  calendarType: 'solar'
  repeatType: AnniversaryRepeat
  reminderOffsetDays: Array<0 | 1 | 3 | 7>
  reminderTime: string
  note: string
  pinned: boolean
  source: 'user' | 'love-profile'
  status: RecordStatus
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  revision: number
}

export type MomentMood =
  | 'happy'
  | 'sweet'
  | 'surprised'
  | 'expectant'
  | 'excited'
  | 'proud'
  | 'warm'
  | 'secure'
  | 'moved'
  | 'missing'
  | 'shy'
  | 'heartbeat'
  | 'calm'
  | 'relaxed'
  | 'healed'
  | 'content'
  | 'daily'
  | 'relieved'
  | 'sad'
  | 'wronged'
  | 'tired'
  | 'angry'
  | 'lonely'
  | 'lost'
  | 'other'

export interface Moment {
  _id: string
  creatorUid: string
  title: string
  titleCustomized: boolean
  content: string
  mood: MomentMood
  occurredAt: number
  occurredMonth: string
  mediaIds: string[]
  status: RecordStatus
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  revision: number
}
