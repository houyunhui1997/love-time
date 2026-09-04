import type { ApiResult } from '@/types/api'
import { createCloudObject } from './cloud'

interface SystemHealth {
  service: string
  version: string
  serverTime: number
  platform: string
}

interface SystemCloudObject {
  ping(): Promise<ApiResult<SystemHealth>>
}

const systemCloudObject = createCloudObject<SystemCloudObject>('system-co')

export function pingCloudService() {
  return systemCloudObject.ping()
}

