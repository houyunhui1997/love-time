'use strict'

const uniIdCommon = require('uni-id-common')
const { success, normalizeError, AppError, API_CODE } = require('love-common')
const db = uniCloud.database()
const dbCmd = db.command
const profiles = db.collection('love-profiles')
const users = db.collection('uni-id-users')

async function requireAuth(context) {
  const auth = await context.uniIdCommon.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新登录')
  return auth
}

function toClientProfile(profile) {
  return {
    selfName: profile.selfName,
    partnerName: profile.partnerName,
    loveStartDate: profile.loveStartDate,
    selfGender: profile.selfGender || null,
    selfAvatarFileId: profile.selfAvatarFileId || null
  }
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },

  async getMine() {
    try {
      const auth = await requireAuth(this)

      const existing = await profiles.where({ ownerUid: auth.uid }).limit(1).get()
      let profile = existing.data[0]
      if (!profile) {
        const now = Date.now()
        const defaults = {
          ownerUid: auth.uid,
          coupleId: null,
          selfName: '小鹿',
          partnerName: '阿川',
          selfAvatarFileId: null,
          selfGender: null,
          partnerAvatarFileId: null,
          loveStartDate: '2025-03-31',
          theme: 'warm-paper',
          createdAt: now,
          updatedAt: now,
          revision: 1
        }
        const inserted = await profiles.add(defaults)
        profile = { _id: inserted.id, ...defaults }
      }

      return success(toClientProfile(profile))
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

      const existing = await profiles.where({ ownerUid: auth.uid }).limit(1).get()
      const now = Date.now()
      let profile
      if (existing.data[0]) {
        const updateData = {
          selfName: nickname,
          selfGender: gender,
          selfAvatarFileId: avatarFileId,
          updatedAt: now,
          revision: dbCmd.inc(1)
        }
        await profiles.doc(existing.data[0]._id).update(updateData)
        profile = { ...existing.data[0], ...updateData, revision: (existing.data[0].revision || 0) + 1 }
      } else {
        profile = {
          ownerUid: auth.uid,
          coupleId: null,
          selfName: nickname,
          partnerName: 'TA',
          selfAvatarFileId: avatarFileId,
          partnerAvatarFileId: null,
          selfGender: gender,
          loveStartDate: '2025-03-31',
          theme: 'warm-paper',
          createdAt: now,
          updatedAt: now,
          revision: 1
        }
        const inserted = await profiles.add(profile)
        profile._id = inserted.id
      }

      const userUpdate = { nickname, gender: gender === 'male' ? 1 : 2 }
      if (avatarFileId) userUpdate.avatar = avatarFileId
      await users.doc(auth.uid).update(userUpdate)

      return success(toClientProfile(profile))
    } catch (error) {
      return normalizeError(error)
    }
  }
}
