'use strict'

const uniIdCommon = require('uni-id-common')
const {
  success,
  normalizeError,
  AppError,
  API_CODE,
  requireString,
  normalizeGender,
  ensurePersonalSpace,
  getActiveSpace,
  getSpaceMembers,
  listActiveMemberships
} = require('love-common')
const db = uniCloud.database()
const dbCmd = db.command
const spaces = db.collection('love-spaces')
const users = db.collection('uni-id-users')

async function requireAuth(context) {
  const auth = await context.uniIdCommon.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新登录')
  return auth
}

function toClientAccount(user) {
  return {
    nickname: user.nickname || '',
    avatarFileId: user.avatar || null,
    gender: normalizeGender(user.gender)
  }
}

function validateDate(value) {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(API_CODE.INVALID_PARAMS, '在一起日期格式不正确')
  }
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  const isRealDate = parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
  if (!isRealDate) throw new AppError(API_CODE.INVALID_PARAMS, '在一起日期不正确')
  const chinaToday = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  if (value > chinaToday) throw new AppError(API_CODE.INVALID_PARAMS, '在一起日期不能晚于今天')
  return value
}

async function toClientProfile(uid) {
  const active = await getActiveSpace(uid)
  const memberList = await getSpaceMembers(active.space._id)
  const allMemberships = await listActiveMemberships(uid)
  const self = memberList.find(item => item.uid === uid)
  const partner = memberList.find(item => item.uid !== uid) || null
  const owned = await ensurePersonalSpace(uid)
  return {
    _id: active.space._id,
    coupleId: memberList.length === 2 ? active.space._id : null,
    spaceId: active.space._id,
    spaceName: active.space.name,
    spaceCode: active.space.code,
    ownedSpaceId: owned._id,
    isOwnedSpace: active.space.ownerUid === uid,
    isCouple: memberList.length === 2,
    selfName: self?.nickname || '恋时光用户',
    partnerName: partner?.nickname || '',
    loveStartDate: active.space.relationStartDate || '',
    selfGender: self?.gender || null,
    selfAvatarFileId: self?.avatarFileId || null,
    partnerAvatarFileId: partner?.avatarFileId || null,
    members: memberList,
    spaces: allMemberships.map(item => ({
      _id: item.space._id,
      name: item.space.name,
      code: item.space.code,
      memberCount: item.space.memberCount || 1,
      isOwned: item.space.ownerUid === uid,
      isActive: item.space._id === active.space._id
    })),
    revision: active.space.revision || 1
  }
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },

  async getAccount() {
    try {
      const auth = await requireAuth(this)
      const result = await users.doc(auth.uid).get()
      const user = result.data && result.data[0]
      if (!user) throw new AppError(API_CODE.NOT_FOUND, '账号不存在')
      await ensurePersonalSpace(auth.uid)
      return success(toClientAccount(user))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async getMine() {
    try {
      const auth = await requireAuth(this)
      await ensurePersonalSpace(auth.uid)
      return success(await toClientProfile(auth.uid))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async saveLoginProfile(params = {}) {
    try {
      const auth = await requireAuth(this)
      const result = await users.doc(auth.uid).get()
      const user = result.data && result.data[0]
      if (!user) throw new AppError(API_CODE.NOT_FOUND, '账号不存在')

      const userUpdate = {}
      if (params.nickname !== undefined) {
        const nickname = typeof params.nickname === 'string' ? params.nickname.trim() : ''
        if (nickname.length > 20) throw new AppError(API_CODE.INVALID_PARAMS, '昵称不能超过20个字符')
        userUpdate.nickname = nickname
      }
      if (params.gender !== undefined) {
        if (params.gender !== null && !['male', 'female'].includes(params.gender)) {
          throw new AppError(API_CODE.INVALID_PARAMS, '性别格式不正确')
        }
        userUpdate.gender = params.gender === 'male' ? 1 : params.gender === 'female' ? 2 : 0
      }
      if (params.avatarFileId !== undefined) {
        userUpdate.avatar = typeof params.avatarFileId === 'string' ? params.avatarFileId : ''
      }
      if (Object.keys(userUpdate).length) await users.doc(auth.uid).update(userUpdate)
      await ensurePersonalSpace(auth.uid)
      const updatedResult = await users.doc(auth.uid).get()
      const updatedUser = updatedResult.data && updatedResult.data[0]
      return success(toClientAccount(updatedUser || user))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async saveLoveProfile(params = {}) {
    try {
      const auth = await requireAuth(this)
      const active = await getActiveSpace(auth.uid)
      const spaceName = requireString(params.spaceName || active.space.name, '空间名称', { maxLength: 20 })
      const loveStartDate = validateDate(params.loveStartDate ?? null)
      const revision = Number(params.revision || active.space.revision)
      const updated = await spaces.where({ _id: active.space._id, revision }).update({
        name: spaceName,
        relationStartDate: loveStartDate,
        updatedAt: Date.now(),
        revision: dbCmd.inc(1)
      })
      if (!updated.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '空间资料已变化，请刷新后重试')
      return success(await toClientProfile(auth.uid))
    } catch (error) {
      return normalizeError(error)
    }
  }
}
