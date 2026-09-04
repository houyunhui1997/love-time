export interface ApiResult<T> {
  code: number
  message: string
  data: T | null
  requestId: string
}

export interface CursorPage<T> {
  list: T[]
  nextCursor: string | null
  hasMore: boolean
}

export const API_CODE = {
  SUCCESS: 0,
  INVALID_PARAMS: 40001,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  REVISION_CONFLICT: 40901,
  COUPLE_EXISTS: 40902,
  TOO_MANY_REQUESTS: 42901,
  INTERNAL_ERROR: 50001
} as const

