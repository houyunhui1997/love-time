'use strict'

const API_CODE = Object.freeze({
  SUCCESS: 0,
  INVALID_PARAMS: 40001,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  REVISION_CONFLICT: 40901,
  TOO_MANY_REQUESTS: 42901,
  INTERNAL_ERROR: 50001,
  NOT_IMPLEMENTED: 50101
})

class AppError extends Error {
  constructor(code, message, data = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.data = data
  }
}

function createRequestId() {
  const random = Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}-${random}`
}

function success(data = null, message = 'ok', requestId = createRequestId()) {
  return { code: API_CODE.SUCCESS, message, data, requestId }
}

function normalizeError(error, requestId = createRequestId()) {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, data: error.data, requestId }
  }
  console.error('[love-time]', requestId, error)
  return { code: API_CODE.INTERNAL_ERROR, message: '服务暂时不可用，请稍后重试', data: null, requestId }
}

function requireString(value, fieldName, options = {}) {
  const { minLength = 1, maxLength = Number.MAX_SAFE_INTEGER } = options
  if (typeof value !== 'string') throw new AppError(API_CODE.INVALID_PARAMS, `${fieldName}格式不正确`)
  const normalized = value.trim()
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new AppError(API_CODE.INVALID_PARAMS, `${fieldName}长度不正确`)
  }
  return normalized
}

module.exports = { API_CODE, AppError, createRequestId, success, normalizeError, requireString }
