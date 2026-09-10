'use strict'

const uniIdCommon = require('uni-id-common')
const { success, normalizeError, AppError, API_CODE, requireString } = require('love-common')
const db = uniCloud.database()
const dbCmd = db.command
const profiles = db.collection('love-profiles')
const users = db.collection('uni-id-users')

async function requireAuth(context) {
  const auth = await context.uniIdCommon.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新连接')
  return auth
}

function normalizeGender(value) {
  if (value === 'male' || value === 1) return 'male'
  if (value === 'female' || value === 2) return 'female'
  return null
}

function toClientAccount(user) {
  return {
    nickname: user.nickname || '',
    avatarFileId: user.avatar || null,
    gender: normalizeGender(user.gender)
  }
}

function toClientProfile(profile) {
  if (!profile) return null
  return {
    _id: profile._id,
    selfName: profile.selfName,
    partnerName: profile.partnerName,
    loveStartDate: profile.loveStartDate,
    selfGender: profile.selfGender || null,
    selfAvatarFileId: profile.selfAvatarFileId || null,
    partnerAvatarFileId: profile.partnerAvatarFileId || null,
    revision: profile.revision || 1
  }
}

function validateDate(value) {
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
      return success(toClientAccount(user))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async getMine() {
    try {
      const auth = await requireAuth(this)
      const existing = await profiles.where({ ownerUid: auth.uid }).limit(1).get()
      return success(toClientProfile(existing.data[0] || null))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async saveLoginProfile(params = {}) {
    try {
      const auth = await requireAuth(this)
      const gender = params.gender
      const nickname = typeof params.nickname === 'string' ? params.nickname.trim() : ''
      const avatarFileId = typeof params.avatarFileId === 'string' && params.avatarFileId ? params.avatarFileId : null
      if (!['male', 'female'].includes(gender)) throw new AppError(API_CODE.INVALID_PARAMS, '请选择性别')
      if (!nickname || nickname.length > 20) throw new AppError(API_CODE.INVALID_PARAMS, '请输入1至20个字符的昵称')
      const userUpdate = { nickname, gender: gender === 'male' ? 1 : 2 }
      if (avatarFileId) userUpdate.avatar = avatarFileId
      await users.doc(auth.uid).update(userUpdate)
      return success({ nickname, gender, avatarFileId })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async saveLoveProfile(params = {}) {
    try {
      const auth = await requireAuth(this)
      const selfName = requireString(params.selfName, '我的称呼', { maxLength: 12 })
      const partnerName = requireString(params.partnerName, '对方称呼', { maxLength: 12 })
      const loveStartDate = validateDate(params.loveStartDate)
      const partnerAvatarFileId = typeof params.partnerAvatarFileId === 'string' && params.partnerAvatarFileId
        ? params.partnerAvatarFileId
        : null

      const userResult = await users.doc(auth.uid).get()
      const user = userResult.data && userResult.data[0]
      if (!user) throw new AppError(API_CODE.NOT_FOUND, '账号不存在')
      const now = Date.now()
      const existingResult = await profiles.where({ ownerUid: auth.uid }).limit(1).get()
      const existing = existingResult.data[0]
      const profileData = {
        selfName,
        partnerName,
        loveStartDate,
        selfGender: normalizeGender(user.gender),
        selfAvatarFileId: user.avatar || null,
        partnerAvatarFileId,
        updatedAt: now
      }

      if (existing) {
        await profiles.doc(existing._id).update({ ...profileData, revision: dbCmd.inc(1) })
        return success(toClientProfile({ ...existing, ...profileData, revision: (existing.revision || 0) + 1 }))
      }

      const profile = {
        ownerUid: auth.uid,
        ...profileData,
        theme: 'warm-paper',
        createdAt: now,
        revision: 1
      }
      const inserted = await profiles.add(profile)
      return success(toClientProfile({ _id: inserted.id, ...profile }))
    } catch (error) {
      return normalizeError(error)
    }
  }
}
