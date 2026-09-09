'use strict'

const uniIdCommon = require('uni-id-common')
const {
  success,
  normalizeError,
  AppError,
  API_CODE,
  requireString,
  getActiveSpace,
  canAccessSpace,
  getCreatorAccount
} = require('love-common')
const db = uniCloud.database()
const dbCmd = db.command
const moments = db.collection('moments')

const MOODS = [
  'happy', 'sweet', 'surprised', 'expectant', 'excited', 'proud',
  'warm', 'secure', 'moved', 'missing', 'shy', 'heartbeat',
  'calm', 'relaxed', 'healed', 'content', 'daily', 'relieved',
  'sad', 'wronged', 'tired', 'angry', 'lonely', 'lost', 'other'
]
const PAGE_SIZE = 20

async function requireAuth(context) {
  const auth = await context.uniIdCommon.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新登录')
  return auth
}

async function toClient(item, viewerUid) {
  const creator = await getCreatorAccount(item.creatorUid)
  return {
    _id: item._id,
    spaceId: item.spaceId,
    creatorUid: item.creatorUid,
    creatorName: creator.nickname,
    creatorAvatarFileId: creator.avatarFileId,
    isMine: item.creatorUid === viewerUid,
    title: item.title,
    titleCustomized: !!item.titleCustomized,
    content: item.content,
    mood: item.mood,
    occurredAt: item.occurredAt,
    occurredMonth: item.occurredMonth,
    mediaIds: item.mediaIds || [],
    visibility: item.visibility,
    createdAt: item.createdAt,
    revision: item.revision || 1
  }
}

async function canRead(uid, item) {
  if (item.creatorUid === uid) return true
  return item.visibility === 'couple' && await canAccessSpace(uid, item.spaceId)
}

async function canWrite(uid, item) {
  return item.creatorUid === uid || (item.visibility === 'couple' && await canAccessSpace(uid, item.spaceId))
}

function toOccurredMonth(occurredAt) {
  const date = new Date(occurredAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },

  // 列表：按月份筛选 + 游标分页
  async list(params = {}) {
    try {
      const auth = await requireAuth(this)
      const active = await getActiveSpace(auth.uid)
      const month = typeof params.month === 'string' && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null
      const cursor = typeof params.cursor === 'string' && params.cursor ? params.cursor : null

      const conditions = [
        { spaceId: active.space._id },
        { status: 'active' },
        dbCmd.or([{ creatorUid: auth.uid }, { visibility: 'couple' }])
      ]
      if (month) conditions.push({ occurredMonth: month })
      if (cursor) conditions.push({ _id: dbCmd.lt(cursor) })
      const where = dbCmd.and(conditions)

      const result = await moments
        .where(where)
        .orderBy('occurredAt', 'desc')
        .orderBy('_id', 'desc')
        .limit(PAGE_SIZE + 1)
        .get()

      const items = result.data || []
      const hasMore = items.length > PAGE_SIZE
      const list = hasMore ? items.slice(0, PAGE_SIZE) : items

      return success({
        list: await Promise.all(list.map(item => toClient(item, auth.uid))),
        nextCursor: hasMore ? list[list.length - 1]._id : null,
        hasMore
      })
    } catch (error) {
      return normalizeError(error)
    }
  },

  // 详情
  async detail(params = {}) {
    try {
      const auth = await requireAuth(this)
      const id = requireString(params.id, '时刻ID')

      const result = await moments.doc(id).get()
      const item = result.data && result.data[0]
      if (!item || item.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '时刻不存在')
      if (!await canRead(auth.uid, item)) throw new AppError(API_CODE.FORBIDDEN, '无权访问该时刻')

      return success(await toClient(item, auth.uid))
    } catch (error) {
      return normalizeError(error)
    }
  },

  // 新增
  async create(params = {}) {
    try {
      const auth = await requireAuth(this)
      const active = await getActiveSpace(auth.uid)
      const content = requireString(params.content, '内容', { maxLength: 2000 })

      if (!MOODS.includes(params.mood)) throw new AppError(API_CODE.INVALID_PARAMS, '心情不正确')

      const occurredAt = Number(params.occurredAt)
      if (!Number.isInteger(occurredAt) || occurredAt <= 0) {
        throw new AppError(API_CODE.INVALID_PARAMS, '发生时间不正确')
      }

      const mediaIds = Array.isArray(params.mediaIds) ? params.mediaIds.slice(0, 9) : []
      const title = typeof params.title === 'string' && params.title.trim() ? params.title.trim().slice(0, 30) : ''
      const titleCustomized = title.length > 0

      const now = Date.now()
      const record = {
        creatorUid: auth.uid,
        coupleId: null,
        visibility: params.visibility === 'couple' ? 'couple' : 'private',
        title: title || content.slice(0, 30),
        titleCustomized,
        content,
        mood: params.mood,
        occurredAt,
        occurredMonth: toOccurredMonth(occurredAt),
        mediaIds,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1
      }

      const inserted = await moments.add(record)
      return success({ _id: inserted.id, ...toClient({ _id: inserted.id, ...record }) })
    } catch (error) {
      return normalizeError(error)
    }
  },

  // 更新（乐观锁）
  async update(params = {}) {
    try {
      const auth = await requireAuth(this)
      const id = requireString(params.id, '时刻ID')
      const revision = Number(params.revision)
      if (!Number.isInteger(revision) || revision < 1) {
        throw new AppError(API_CODE.INVALID_PARAMS, '版本号不正确')
      }

      const existingResult = await moments.doc(id).get()
      const existing = existingResult.data && existingResult.data[0]
      if (!existing || existing.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '时刻不存在')
      if (existing.creatorUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '无权修改该时刻')

      const updateData = { updatedAt: Date.now(), revision: dbCmd.inc(1) }

      if (params.content !== undefined) {
        updateData.content = requireString(params.content, '内容', { maxLength: 2000 })
      }
      if (params.mood !== undefined) {
        if (!MOODS.includes(params.mood)) throw new AppError(API_CODE.INVALID_PARAMS, '心情不正确')
        updateData.mood = params.mood
      }
      if (params.occurredAt !== undefined) {
        const occurredAt = Number(params.occurredAt)
        if (!Number.isInteger(occurredAt) || occurredAt <= 0) {
          throw new AppError(API_CODE.INVALID_PARAMS, '发生时间不正确')
        }
        updateData.occurredAt = occurredAt
        updateData.occurredMonth = toOccurredMonth(occurredAt)
      }
      if (params.mediaIds !== undefined) {
        updateData.mediaIds = Array.isArray(params.mediaIds) ? params.mediaIds.slice(0, 9) : []
      }
      if (params.visibility !== undefined) {
        updateData.visibility = params.visibility === 'couple' ? 'couple' : 'private'
      }
      if (params.title !== undefined) {
        const title = typeof params.title === 'string' ? params.title.trim().slice(0, 30) : ''
        updateData.title = title || (params.content || existing.content).slice(0, 30)
        updateData.titleCustomized = title.length > 0
      }

      const updated = await moments
        .where({ _id: id, revision })
        .update(updateData)

      if (!updated.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '数据已被修改，请刷新后重试')

      return success({ _id: id })
    } catch (error) {
      return normalizeError(error)
    }
  },

  // 软删除
  async remove(params = {}) {
    try {
      const auth = await requireAuth(this)
      const id = requireString(params.id, '时刻ID')

      const existingResult = await moments.doc(id).get()
      const existing = existingResult.data && existingResult.data[0]
      if (!existing || existing.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '时刻不存在')
      if (existing.creatorUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '无权删除该时刻')

      await moments.doc(id).update({
        status: 'deleted',
        deletedAt: Date.now(),
        updatedAt: Date.now(),
        revision: dbCmd.inc(1)
      })

      return success({ _id: id })
    } catch (error) {
      return normalizeError(error)
    }
  }
}
