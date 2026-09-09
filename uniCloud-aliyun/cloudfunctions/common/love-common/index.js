'use strict'

const API_CODE = Object.freeze({
  SUCCESS: 0,
  INVALID_PARAMS: 40001,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  REVISION_CONFLICT: 40901,
  COUPLE_EXISTS: 40902,
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
  return {
    code: API_CODE.SUCCESS,
    message,
    data,
    requestId
  }
}

function normalizeError(error, requestId = createRequestId()) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      data: error.data,
      requestId
    }
  }

  console.error('[love-time]', requestId, error)

  return {
    code: API_CODE.INTERNAL_ERROR,
    message: '服务暂时不可用，请稍后重试',
    data: null,
    requestId
  }
}

function requireString(value, fieldName, options = {}) {
  const { minLength = 1, maxLength = Number.MAX_SAFE_INTEGER } = options

  if (typeof value !== 'string') {
    throw new AppError(API_CODE.INVALID_PARAMS, `${fieldName}格式不正确`)
  }

  const normalized = value.trim()
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new AppError(API_CODE.INVALID_PARAMS, `${fieldName}长度不正确`)
  }

  return normalized
}

const SPACE_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function createSpaceCode(length = 4) {
  let value = ''
  for (let index = 0; index < length; index += 1) {
    value += SPACE_CODE_CHARS[Math.floor(Math.random() * SPACE_CODE_CHARS.length)]
  }
  return value
}

function normalizeGender(value) {
  if (value === 'male' || value === 1) return 'male'
  if (value === 'female' || value === 2) return 'female'
  return null
}

async function createUniqueSpaceCode(db) {
  const spaces = db.collection('love-spaces')
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = createSpaceCode()
    const existing = await spaces.where({ code, status: 'active' }).limit(1).get()
    if (!existing.data.length) return code
  }
  throw new AppError(API_CODE.INTERNAL_ERROR, '空间码生成失败，请稍后重试')
}

async function ensurePersonalSpace(uid) {
  const db = uniCloud.database()
  const spaces = db.collection('love-spaces')
  const members = db.collection('love-space-members')
  const users = db.collection('uni-id-users')
  const existingResult = await spaces.where({ ownerUid: uid, status: 'active' }).limit(1).get()
  let space = existingResult.data[0]

  if (!space) {
    const userResult = await users.doc(uid).get()
    const user = userResult.data && userResult.data[0]
    if (!user) throw new AppError(API_CODE.NOT_FOUND, '账号不存在')
    const now = Date.now()
    const code = await createUniqueSpaceCode(db)
    const nickname = typeof user.nickname === 'string' && user.nickname.trim() ? user.nickname.trim() : '恋时光用户'
    const record = {
      ownerUid: uid,
      name: `${nickname.slice(0, 12)}的恋时光`,
      code,
      relationStartDate: null,
      theme: 'warm-paper',
      memberCount: 1,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      revision: 1
    }
    const inserted = await spaces.add(record)
    space = { _id: inserted.id, ...record }
  }

  const ownerMembership = await members.where({ spaceId: space._id, uid, status: 'active' }).limit(1).get()
  if (!ownerMembership.data.length) {
    const now = Date.now()
    await members.add({
      spaceId: space._id,
      uid,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      leftAt: null,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now
    })
  }
  return space
}

async function listActiveMemberships(uid) {
  const db = uniCloud.database()
  const members = db.collection('love-space-members')
  const spaces = db.collection('love-spaces')
  const membershipResult = await members.where({ uid, status: 'active' }).get()
  const result = []
  for (const membership of membershipResult.data || []) {
    const spaceResult = await spaces.doc(membership.spaceId).get()
    const space = spaceResult.data && spaceResult.data[0]
    if (space && space.status === 'active') result.push({ membership, space })
  }
  return result.sort((a, b) => (b.membership.lastActiveAt || 0) - (a.membership.lastActiveAt || 0))
}

async function getActiveSpace(uid) {
  await ensurePersonalSpace(uid)
  const memberships = await listActiveMemberships(uid)
  if (!memberships.length) throw new AppError(API_CODE.NOT_FOUND, '空间不存在')
  return memberships[0]
}

async function getSpaceMembers(spaceId) {
  const db = uniCloud.database()
  const members = db.collection('love-space-members')
  const users = db.collection('uni-id-users')
  const membershipResult = await members.where({ spaceId, status: 'active' }).get()
  const result = []
  for (const membership of membershipResult.data || []) {
    const userResult = await users.doc(membership.uid).get()
    const user = userResult.data && userResult.data[0]
    if (!user) continue
    result.push({
      uid: membership.uid,
      role: membership.role,
      nickname: user.nickname || '恋时光用户',
      avatarFileId: user.avatar || null,
      gender: normalizeGender(user.gender),
      joinedAt: membership.joinedAt
    })
  }
  return result
}

async function hasActiveCouple(uid) {
  const db = uniCloud.database()
  const result = await db.collection('love-couple-bindings').where({ uid, status: 'active' }).limit(1).get()
  return !!result.data.length
}

async function canAccessSpace(uid, spaceId) {
  const db = uniCloud.database()
  const members = db.collection('love-space-members')
  const result = await members.where({ uid, spaceId, status: 'active' }).limit(1).get()
  return !!result.data.length
}

async function getCreatorAccount(uid) {
  const db = uniCloud.database()
  const result = await db.collection('uni-id-users').doc(uid).get()
  const user = result.data && result.data[0]
  return user ? { nickname: user.nickname || '恋时光用户', avatarFileId: user.avatar || null } : { nickname: '恋时光用户', avatarFileId: null }
}

module.exports = {
  API_CODE,
  AppError,
  createRequestId,
  success,
  normalizeError,
  requireString,
  normalizeGender,
  createUniqueSpaceCode,
  ensurePersonalSpace,
  listActiveMemberships,
  getActiveSpace,
  getSpaceMembers,
  hasActiveCouple,
  canAccessSpace,
  getCreatorAccount
}
