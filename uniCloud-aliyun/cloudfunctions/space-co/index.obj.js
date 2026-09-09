'use strict'

const crypto = require('crypto')
const uniIdCommon = require('uni-id-common')
const {
  success,
  normalizeError,
  AppError,
  API_CODE,
  requireString,
  createUniqueSpaceCode,
  ensurePersonalSpace,
  listActiveMemberships,
  getActiveSpace,
  getSpaceMembers,
  hasActiveCouple,
  canAccessSpace
} = require('love-common')

const db = uniCloud.database()
const dbCmd = db.command
const spaces = db.collection('love-spaces')
const members = db.collection('love-space-members')
const invites = db.collection('love-space-invites')
const attempts = db.collection('love-space-join-attempts')
const bindings = db.collection('love-couple-bindings')
const moments = db.collection('moments')
const anniversaries = db.collection('anniversaries')

async function requireAuth(context) {
  const auth = await context.uniIdCommon.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新登录')
  return auth
}

function validateDate(value) {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(API_CODE.INVALID_PARAMS, '在一起日期格式不正确')
  }
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new AppError(API_CODE.INVALID_PARAMS, '在一起日期不正确')
  }
  const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  if (value > today) throw new AppError(API_CODE.INVALID_PARAMS, '在一起日期不能晚于今天')
  return value
}

async function toContext(uid, active) {
  const owned = await ensurePersonalSpace(uid)
  const allMemberships = await listActiveMemberships(uid)
  const activePair = active || allMemberships[0]
  const memberList = await getSpaceMembers(activePair.space._id)
  return {
    activeSpace: {
      _id: activePair.space._id,
      name: activePair.space.name,
      code: activePair.space.code,
      ownerUid: activePair.space.ownerUid,
      relationStartDate: activePair.space.relationStartDate || null,
      theme: activePair.space.theme || 'warm-paper',
      memberCount: activePair.space.memberCount || memberList.length || 1,
      revision: activePair.space.revision || 1,
      isOwned: activePair.space.ownerUid === uid,
      isCouple: memberList.length === 2
    },
    ownedSpaceId: owned._id,
    members: memberList,
    spaces: allMemberships.map(item => ({
      _id: item.space._id,
      name: item.space.name,
      code: item.space.code,
      memberCount: item.space.memberCount || 1,
      isOwned: item.space.ownerUid === uid,
      isActive: item.space._id === activePair.space._id
    }))
  }
}

async function assertCanJoin(uid, space) {
  if (!space || space.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '空间不存在')
  if (space.ownerUid === uid) throw new AppError(API_CODE.INVALID_PARAMS, '不能加入自己的空间')
  if (Number(space.memberCount || 1) >= 2) throw new AppError(API_CODE.COUPLE_EXISTS, '该空间已经绑定了另一半')
  if (await hasActiveCouple(uid)) throw new AppError(API_CODE.COUPLE_EXISTS, '你已经绑定了情侣空间，请先解绑')
  if (await hasActiveCouple(space.ownerUid)) throw new AppError(API_CODE.COUPLE_EXISTS, '对方已经绑定了情侣空间')
}

async function claimBinding(uid, spaceId, partnerUid, now) {
  const result = await bindings.where({ uid }).limit(1).get()
  const existing = result.data[0]
  if (existing && existing.status === 'active') {
    throw new AppError(API_CODE.COUPLE_EXISTS, '账号已经绑定了情侣空间')
  }
  if (existing) {
    await bindings.doc(existing._id).update({ spaceId, partnerUid, status: 'active', endedAt: null, updatedAt: now })
    return { id: existing._id, created: false }
  }
  const inserted = await bindings.add({
    uid, spaceId, partnerUid, status: 'active', endedAt: null, createdAt: now, updatedAt: now
  })
  return { id: inserted.id, created: true }
}

async function joinSpace(uid, space, invite = null) {
  await ensurePersonalSpace(uid)
  await assertCanJoin(uid, space)
  const now = Date.now()
  const existing = await members.where({ spaceId: space._id, uid }).limit(1).get()
  const claimed = await spaces.where({ _id: space._id, memberCount: 1, status: 'active' }).update({
    memberCount: 2,
    updatedAt: now,
    revision: dbCmd.inc(1)
  })
  if (!claimed.updated) throw new AppError(API_CODE.COUPLE_EXISTS, '该空间刚刚被加入，请选择其他空间')

  const claimedBindings = []
  try {
    claimedBindings.push(await claimBinding(space.ownerUid, space._id, uid, now))
    claimedBindings.push(await claimBinding(uid, space._id, space.ownerUid, now))
    if (existing.data.length) {
      await members.doc(existing.data[0]._id).update({
        role: 'member', status: 'active', joinedAt: now, leftAt: null, lastActiveAt: now, updatedAt: now
      })
    } else {
      await members.add({
        spaceId: space._id, uid, role: 'member', status: 'active', joinedAt: now,
        leftAt: null, lastActiveAt: now, createdAt: now, updatedAt: now
      })
    }
    if (invite) {
      await invites.doc(invite._id).update({ status: 'used', usedByUid: uid, usedAt: now, updatedAt: now })
    }
  } catch (error) {
    for (const claim of claimedBindings) {
      if (claim.created) await bindings.doc(claim.id).remove()
      else await bindings.doc(claim.id).update({ status: 'ended', endedAt: now, updatedAt: now })
    }
    await spaces.doc(space._id).update({ memberCount: 1, updatedAt: Date.now(), revision: dbCmd.inc(1) })
    if (error instanceof AppError) throw error
    throw new AppError(API_CODE.COUPLE_EXISTS, '绑定状态已变化，请刷新后重试')
  }
  return toContext(uid, { membership: { uid, lastActiveAt: now }, space: { ...space, memberCount: 2 } })
}

async function rateLimitCode(uid) {
  const since = Date.now() - 10 * 60 * 1000
  const recent = await attempts.where({ uid, success: false, createdAt: dbCmd.gte(since) }).limit(5).get()
  if ((recent.data || []).length >= 5) throw new AppError(API_CODE.TOO_MANY_REQUESTS, '尝试次数过多，请10分钟后再试')
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },

  async getContext() {
    try {
      const auth = await requireAuth(this)
      const active = await getActiveSpace(auth.uid)
      return success(await toContext(auth.uid, active))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async updateSpace(params = {}) {
    try {
      const auth = await requireAuth(this)
      const active = await getActiveSpace(auth.uid)
      const name = requireString(params.name, '空间名称', { maxLength: 20 })
      const relationStartDate = validateDate(params.relationStartDate)
      const revision = Number(params.revision)
      if (!Number.isInteger(revision) || revision < 1) throw new AppError(API_CODE.INVALID_PARAMS, '版本号不正确')
      const updated = await spaces.where({ _id: active.space._id, revision }).update({
        name,
        relationStartDate,
        updatedAt: Date.now(),
        revision: dbCmd.inc(1)
      })
      if (!updated.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '空间资料已变化，请刷新后重试')
      return success(await toContext(auth.uid))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async regenerateCode() {
    try {
      const auth = await requireAuth(this)
      const active = await getActiveSpace(auth.uid)
      if (active.space.ownerUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '只有空间创建者可以刷新空间码')
      const code = await createUniqueSpaceCode(db)
      await spaces.doc(active.space._id).update({ code, updatedAt: Date.now(), revision: dbCmd.inc(1) })
      return success({ code })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async previewCode(params = {}) {
    try {
      const auth = await requireAuth(this)
      await rateLimitCode(auth.uid)
      const code = requireString(params.code, '空间码', { minLength: 4, maxLength: 4 }).toUpperCase()
      const result = await spaces.where({ code, status: 'active' }).limit(1).get()
      const space = result.data[0]
      if (!space) {
        await attempts.add({ uid: auth.uid, success: false, createdAt: Date.now() })
        throw new AppError(API_CODE.NOT_FOUND, '没有找到这个空间')
      }
      await assertCanJoin(auth.uid, space)
      const ownerList = await getSpaceMembers(space._id)
      const owner = ownerList.find(item => item.uid === space.ownerUid)
      await attempts.add({ uid: auth.uid, success: true, createdAt: Date.now() })
      return success({ spaceId: space._id, name: space.name, code: space.code, owner })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async joinByCode(params = {}) {
    try {
      const auth = await requireAuth(this)
      await rateLimitCode(auth.uid)
      const code = requireString(params.code, '空间码', { minLength: 4, maxLength: 4 }).toUpperCase()
      const result = await spaces.where({ code, status: 'active' }).limit(1).get()
      const space = result.data[0]
      if (!space) {
        await attempts.add({ uid: auth.uid, success: false, createdAt: Date.now() })
        throw new AppError(API_CODE.NOT_FOUND, '没有找到这个空间')
      }
      const context = await joinSpace(auth.uid, space)
      await attempts.add({ uid: auth.uid, success: true, createdAt: Date.now() })
      return success(context)
    } catch (error) {
      return normalizeError(error)
    }
  },

  async createInvite() {
    try {
      const auth = await requireAuth(this)
      const active = await getActiveSpace(auth.uid)
      if (active.space.ownerUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '请在自己的空间中发起邀请')
      if (Number(active.space.memberCount || 1) >= 2 || await hasActiveCouple(auth.uid)) {
        throw new AppError(API_CODE.COUPLE_EXISTS, '你已经绑定了另一半')
      }
      const now = Date.now()
      await invites.where({ spaceId: active.space._id, status: 'active' }).update({ status: 'revoked', updatedAt: now })
      const token = crypto.randomBytes(20).toString('hex')
      await invites.add({
        spaceId: active.space._id,
        inviterUid: auth.uid,
        token,
        status: 'active',
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
        usedByUid: null,
        usedAt: null,
        createdAt: now,
        updatedAt: now
      })
      return success({ token, path: `/pages/couple/invite?token=${token}`, expiresAt: now + 7 * 24 * 60 * 60 * 1000 })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async getInvite(params = {}) {
    try {
      const auth = await requireAuth(this)
      const token = requireString(params.token, '邀请凭证', { minLength: 32, maxLength: 64 })
      const result = await invites.where({ token }).limit(1).get()
      const invite = result.data[0]
      if (!invite || invite.status !== 'active' || invite.expiresAt <= Date.now()) throw new AppError(API_CODE.NOT_FOUND, '邀请已失效')
      const spaceResult = await spaces.doc(invite.spaceId).get()
      const space = spaceResult.data[0]
      await assertCanJoin(auth.uid, space)
      const memberList = await getSpaceMembers(space._id)
      return success({ name: space.name, code: space.code, owner: memberList.find(item => item.uid === space.ownerUid), expiresAt: invite.expiresAt })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async joinByInvite(params = {}) {
    try {
      const auth = await requireAuth(this)
      const token = requireString(params.token, '邀请凭证', { minLength: 32, maxLength: 64 })
      const result = await invites.where({ token }).limit(1).get()
      const invite = result.data[0]
      if (!invite || invite.status !== 'active' || invite.expiresAt <= Date.now()) throw new AppError(API_CODE.NOT_FOUND, '邀请已失效')
      const spaceResult = await spaces.doc(invite.spaceId).get()
      return success(await joinSpace(auth.uid, spaceResult.data[0], invite))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async switchSpace(params = {}) {
    try {
      const auth = await requireAuth(this)
      const spaceId = requireString(params.spaceId, '空间ID')
      if (!await canAccessSpace(auth.uid, spaceId)) throw new AppError(API_CODE.FORBIDDEN, '无权进入该空间')
      await members.where({ uid: auth.uid, spaceId, status: 'active' }).update({ lastActiveAt: Date.now(), updatedAt: Date.now() })
      return success(await toContext(auth.uid))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async unbind() {
    try {
      const auth = await requireAuth(this)
      const active = await getActiveSpace(auth.uid)
      if (Number(active.space.memberCount || 1) < 2) throw new AppError(API_CODE.INVALID_PARAMS, '当前空间尚未绑定另一半')
      const activeMembers = await getSpaceMembers(active.space._id)
      const now = Date.now()
      for (const member of activeMembers) {
        const personal = await ensurePersonalSpace(member.uid)
        await moments.where({ spaceId: active.space._id, creatorUid: member.uid }).update({
          spaceId: personal._id, coupleId: null, visibility: 'private', updatedAt: now, revision: dbCmd.inc(1)
        })
        await anniversaries.where({ spaceId: active.space._id, creatorUid: member.uid }).update({
          spaceId: personal._id, coupleId: null, visibility: 'private', updatedAt: now, revision: dbCmd.inc(1)
        })
        await members.where({ spaceId: personal._id, uid: member.uid, status: 'active' }).update({ lastActiveAt: now, updatedAt: now })
        if (active.space.ownerUid !== member.uid) {
          await members.where({ spaceId: active.space._id, uid: member.uid, status: 'active' }).update({ status: 'left', leftAt: now, updatedAt: now })
        }
      }
      await spaces.doc(active.space._id).update({
        memberCount: 1,
        relationStartDate: null,
        updatedAt: now,
        revision: dbCmd.inc(1)
      })
      await invites.where({ spaceId: active.space._id, status: 'active' }).update({ status: 'revoked', updatedAt: now })
      await bindings.where({ spaceId: active.space._id, status: 'active' }).update({ status: 'ended', endedAt: now, updatedAt: now })
      return success(await toContext(auth.uid))
    } catch (error) {
      return normalizeError(error)
    }
  }
}
