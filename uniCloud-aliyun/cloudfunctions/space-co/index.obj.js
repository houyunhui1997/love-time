'use strict'

const crypto = require('crypto')
const uniIdCommon = require('uni-id-common')
const { success, normalizeError, AppError, API_CODE } = require('love-common')
const db = uniCloud.database()
const spaces = db.collection('couple-spaces')
const memberships = db.collection('couple-memberships')
const users = db.collection('uni-id-users')

async function requireAuth(context) {
  const auth = await context.uniIdCommon.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新连接')
  return auth
}

function person(user, uid) {
  return {
    uid,
    nickname: user && user.nickname || '恋时光用户',
    avatarFileId: user && user.avatar || null
  }
}

function isNormalUser(user) {
  return !!user && (user.status === undefined || user.status === 0)
}

async function getUser(uid) {
  return (await users.doc(uid).get()).data[0] || null
}

async function ensureSpace(uid) {
  let space = (await spaces.doc(uid).get()).data[0]
  if (space) return space
  const now = Date.now()
  const record = {
    _id: uid,
    ownerUid: uid,
    inviteCode: crypto.randomBytes(12).toString('hex'),
    memberUid: null,
    joinedOwnerUid: null,
    joiningOwnerUid: null,
    status: 'active',
    createdAt: now,
    updatedAt: now
  }
  try {
    await spaces.add(record)
    return record
  } catch (_) {
    space = (await spaces.doc(uid).get()).data[0]
    if (!space) throw new AppError(API_CODE.INTERNAL_ERROR, '情侣空间创建失败')
    return space
  }
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },

  async overview(params = {}) {
    try {
      const auth = await requireAuth(this)
      const ownSpace = await ensureSpace(auth.uid)
      const joined = (await memberships.doc(auth.uid).get()).data[0]
      let joinedSpace = null
      if (joined && joined.status === 'active') {
        joinedSpace = (await spaces.doc(joined.ownerUid).get()).data[0]
        if (!joinedSpace || joinedSpace.status !== 'active' || joinedSpace.memberUid !== auth.uid) {
          await memberships.doc(auth.uid).remove()
          await spaces.doc(auth.uid).update({ joinedOwnerUid: null, joiningOwnerUid: null, updatedAt: Date.now() })
          joinedSpace = null
        } else if (ownSpace.joinedOwnerUid !== joined.ownerUid || ownSpace.joiningOwnerUid) {
          await spaces.doc(auth.uid).update({ joinedOwnerUid: joined.ownerUid, joiningOwnerUid: null, updatedAt: Date.now() })
        }
      } else if (ownSpace.joinedOwnerUid || ownSpace.joiningOwnerUid) {
        await spaces.doc(auth.uid).update({ joinedOwnerUid: null, joiningOwnerUid: null, updatedAt: Date.now() })
      }

      // 加入者绑定期间固定使用邀请方空间，不允许切回自己的空间。
      const activeOwnerUid = joinedSpace ? joinedSpace.ownerUid : auth.uid
      const ids = [auth.uid]
      if (ownSpace.memberUid) ids.push(ownSpace.memberUid)
      if (joinedSpace) ids.push(joinedSpace.ownerUid)
      const userMap = {}
      for (const uid of [...new Set(ids)]) userMap[uid] = await getUser(uid)

      return success({
        inviteCode: ownSpace.inviteCode,
        owner: person(userMap[auth.uid], auth.uid),
        member: ownSpace.memberUid ? person(userMap[ownSpace.memberUid], ownSpace.memberUid) : null,
        joinedOwner: joinedSpace ? person(userMap[joinedSpace.ownerUid], joinedSpace.ownerUid) : null,
        activeOwnerUid
      })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async preview(params = {}) {
    try {
      const auth = await requireAuth(this)
      const inviteCode = typeof params.inviteCode === 'string' ? params.inviteCode.trim() : ''
      if (!/^[a-f0-9]{24}$/.test(inviteCode)) throw new AppError(API_CODE.NOT_FOUND, '邀请链接无效')
      const space = (await spaces.where({ inviteCode }).limit(1).get()).data[0]
      if (!space || space.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '邀请空间不存在或状态异常')
      const owner = await getUser(space.ownerUid)
      if (!isNormalUser(owner)) throw new AppError(API_CODE.NOT_FOUND, '邀请人的账号状态异常')
      const [membershipResult, ownSpace, ownerMembershipResult] = await Promise.all([
        memberships.doc(auth.uid).get(),
        ensureSpace(auth.uid),
        memberships.doc(space.ownerUid).get()
      ])
      const membership = membershipResult.data[0]
      const ownerMembership = ownerMembershipResult.data[0]
      const self = space.ownerUid === auth.uid
      const joined = !!membership && membership.status === 'active' && membership.ownerUid === space.ownerUid
      const alreadyBoundByInvite = !!ownSpace.memberUid
      const ownerAlreadyJoined = !!ownerMembership
      const available = joined || (!self && !space.memberUid && !membership && !alreadyBoundByInvite && !ownerAlreadyJoined)
      let message = ''
      if (self) message = '这是你自己的情侣空间'
      else if (joined) message = '你已经加入这个空间'
      else if (alreadyBoundByInvite) message = '你的空间已经有成员，不能再加入其他空间'
      else if (membership) message = '你已经加入了其他人的空间'
      else if (space.memberUid) message = '这个空间已经有成员了'
      else if (ownerAlreadyJoined) message = '邀请人已经加入了其他人的空间'
      return success({ inviteCode, owner: person(owner, space.ownerUid), available, joined, self, message })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async join(params = {}) {
    try {
      const auth = await requireAuth(this)
      const inviteCode = typeof params.inviteCode === 'string' ? params.inviteCode.trim() : ''
      if (!/^[a-f0-9]{24}$/.test(inviteCode)) throw new AppError(API_CODE.NOT_FOUND, '邀请链接无效')
      const target = (await spaces.where({ inviteCode }).limit(1).get()).data[0]
      if (!target || target.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '邀请空间不存在或状态异常')
      if (target.ownerUid === auth.uid) throw new AppError(API_CODE.INVALID_PARAMS, '不能加入自己的空间')
      const [owner, currentUser] = await Promise.all([getUser(target.ownerUid), getUser(auth.uid)])
      if (!isNormalUser(owner) || !isNormalUser(currentUser)) throw new AppError(API_CODE.FORBIDDEN, '账号状态异常，暂时无法加入')

      const existing = (await memberships.doc(auth.uid).get()).data[0]
      if (existing) {
        if (existing.ownerUid === target.ownerUid && target.memberUid === auth.uid) {
          if (existing.status !== 'active') await memberships.doc(auth.uid).update({ status: 'active', updatedAt: Date.now() })
          return success({ ownerUid: target.ownerUid })
        }
        if (existing.status === 'joining' && Date.now() - existing.updatedAt > 60000) {
          await memberships.doc(auth.uid).remove()
          await spaces.where({ _id: auth.uid, joiningOwnerUid: existing.ownerUid }).update({ joiningOwnerUid: null, updatedAt: Date.now() })
        }
        else throw new AppError(API_CODE.INVALID_PARAMS, '你已经加入了其他人的空间')
      }

      const [ownSpace, ownerMembershipResult] = await Promise.all([
        ensureSpace(auth.uid),
        memberships.doc(target.ownerUid).get()
      ])
      if (ownSpace.memberUid) throw new AppError(API_CODE.INVALID_PARAMS, '你的空间已经有成员，不能再加入其他空间')
      if (ownerMembershipResult.data[0]) throw new AppError(API_CODE.REVISION_CONFLICT, '邀请人已经绑定了其他人')

      const now = Date.now()
      const ownClaim = await spaces.where({
        _id: auth.uid,
        status: 'active',
        memberUid: null,
        joinedOwnerUid: null,
        joiningOwnerUid: null
      }).update({ joiningOwnerUid: target.ownerUid, updatedAt: now })
      if (!ownClaim.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '你的绑定状态已变化，请刷新后重试')
      try {
        await memberships.add({ _id: auth.uid, memberUid: auth.uid, ownerUid: target.ownerUid, status: 'joining', createdAt: now, updatedAt: now })
      } catch (_) {
        await spaces.where({ _id: auth.uid, joiningOwnerUid: target.ownerUid }).update({ joiningOwnerUid: null, updatedAt: Date.now() })
        throw new AppError(API_CODE.REVISION_CONFLICT, '加入状态已变化，请重新打开邀请')
      }
      const claimed = await spaces.where({
        _id: target._id,
        status: 'active',
        memberUid: null,
        joinedOwnerUid: null,
        joiningOwnerUid: null
      }).update({ memberUid: auth.uid, updatedAt: now })
      if (!claimed.updated) {
        await memberships.where({ _id: auth.uid, ownerUid: target.ownerUid, status: 'joining' }).remove()
        await spaces.where({ _id: auth.uid, joiningOwnerUid: target.ownerUid }).update({ joiningOwnerUid: null, updatedAt: Date.now() })
        throw new AppError(API_CODE.REVISION_CONFLICT, '这个空间已经有成员了')
      }
      await memberships.doc(auth.uid).update({ status: 'active', updatedAt: Date.now() })
      await spaces.doc(auth.uid).update({ joinedOwnerUid: target.ownerUid, joiningOwnerUid: null, updatedAt: Date.now() })
      return success({ ownerUid: target.ownerUid })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async leave() {
    try {
      const auth = await requireAuth(this)
      const membership = (await memberships.doc(auth.uid).get()).data[0]
      if (!membership || membership.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '你当前没有加入其他人的空间')
      await spaces.where({ _id: membership.ownerUid, memberUid: auth.uid, status: 'active' }).update({ memberUid: null, updatedAt: Date.now() })
      await memberships.doc(auth.uid).remove()
      await spaces.doc(auth.uid).update({ joinedOwnerUid: null, joiningOwnerUid: null, updatedAt: Date.now() })
      return success()
    } catch (error) {
      return normalizeError(error)
    }
  },

  async removeMember() {
    try {
      const auth = await requireAuth(this)
      const space = await ensureSpace(auth.uid)
      if (!space.memberUid) throw new AppError(API_CODE.NOT_FOUND, '空间当前没有成员')
      await spaces.where({ _id: auth.uid, memberUid: space.memberUid, status: 'active' }).update({ memberUid: null, updatedAt: Date.now() })
      await memberships.where({ _id: space.memberUid, ownerUid: auth.uid }).remove()
      await spaces.doc(space.memberUid).update({ joinedOwnerUid: null, joiningOwnerUid: null, updatedAt: Date.now() })
      return success()
    } catch (error) {
      return normalizeError(error)
    }
  }
}
