import type { MomentMood } from '@/types/domain'

export interface MomentMoodOption {
  label: string
  value: MomentMood
  icon: string
  tone: 'joy' | 'tender' | 'quiet' | 'low'
}

export interface MomentMoodGroup {
  label: string
  tone: MomentMoodOption['tone']
  options: MomentMoodOption[]
}

export const MOMENT_MOOD_GROUPS: MomentMoodGroup[] = [
  {
    label: '愉悦',
    tone: 'joy',
    options: [
      { label: '开心', value: 'happy', icon: 'hand-up-filled', tone: 'joy' },
      { label: '甜蜜', value: 'sweet', icon: 'heart-filled', tone: 'joy' },
      { label: '惊喜', value: 'surprised', icon: 'star-filled', tone: 'joy' },
      { label: '期待', value: 'expectant', icon: 'paperplane', tone: 'joy' },
      { label: '兴奋', value: 'excited', icon: 'fire-filled', tone: 'joy' },
      { label: '骄傲', value: 'proud', icon: 'VIP-filled', tone: 'joy' }
    ]
  },
  {
    label: '温柔',
    tone: 'tender',
    options: [
      { label: '温暖', value: 'warm', icon: 'heart-filled', tone: 'tender' },
      { label: '安心', value: 'secure', icon: 'locked-filled', tone: 'tender' },
      { label: '感动', value: 'moved', icon: 'gift-filled', tone: 'tender' },
      { label: '想念', value: 'missing', icon: 'chatbubble-filled', tone: 'tender' },
      { label: '害羞', value: 'shy', icon: 'person-filled', tone: 'tender' },
      { label: '心动', value: 'heartbeat', icon: 'heart', tone: 'tender' }
    ]
  },
  {
    label: '平静',
    tone: 'quiet',
    options: [
      { label: '平静', value: 'calm', icon: 'circle-filled', tone: 'quiet' },
      { label: '放松', value: 'relaxed', icon: 'headphones', tone: 'quiet' },
      { label: '治愈', value: 'healed', icon: 'refresh-filled', tone: 'quiet' },
      { label: '满足', value: 'content', icon: 'hand-up', tone: 'quiet' },
      { label: '日常', value: 'daily', icon: 'calendar-filled', tone: 'quiet' },
      { label: '释然', value: 'relieved', icon: 'cloud-download-filled', tone: 'quiet' }
    ]
  },
  {
    label: '低落',
    tone: 'low',
    options: [
      { label: '难过', value: 'sad', icon: 'hand-down-filled', tone: 'low' },
      { label: '委屈', value: 'wronged', icon: 'help-filled', tone: 'low' },
      { label: '疲惫', value: 'tired', icon: 'micoff', tone: 'low' },
      { label: '生气', value: 'angry', icon: 'fire', tone: 'low' },
      { label: '孤单', value: 'lonely', icon: 'person', tone: 'low' },
      { label: '失落', value: 'lost', icon: 'navigate', tone: 'low' }
    ]
  }
]

const LEGACY_OTHER: MomentMoodOption = {
  label: '其他',
  value: 'other',
  icon: 'more-filled',
  tone: 'quiet'
}

export const MOMENT_MOOD_OPTIONS = [...MOMENT_MOOD_GROUPS.flatMap(group => group.options), LEGACY_OTHER]

export function getMomentMoodOption(value: MomentMood) {
  return MOMENT_MOOD_OPTIONS.find(option => option.value === value) || LEGACY_OTHER
}

export function getMomentMoodColor(value: MomentMood) {
  const colors: Record<MomentMoodOption['tone'], string> = {
    joy: '#e9a05a',
    tender: '#dc7470',
    quiet: '#87aeb4',
    low: '#9c89b4'
  }
  return colors[getMomentMoodOption(value).tone]
}
