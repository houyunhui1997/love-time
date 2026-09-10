'use strict'

const uniIdCommon = require('uni-id-common')
const { success, normalizeError, AppError, API_CODE, requireString } = require('love-common')
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
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新连接')
  return auth
}

function toClient(item) {
  return {
    _id: item._id,
    title: item.title,
    titleCustomized: !!item.titleCustomized,
    content: item.content,
    mood: item.mood,
    occurredAt: item.occurredAt,
    occurredMonth: item.occurredMonth,
    mediaIds: item.mediaIds || [],
    createdAt: item.createdAt,
    revision: item.revision || 1
  }
}

function toOccurredMonth(occurredAt) {
  const date = new Date(occurredAt)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },

  async list(params = {}) {
    try {
      const auth = await requireAuth(this)
      const month = typeof params.month === 'string' && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null
      const cursor = typeof params.cursor === 'string' && params.cursor ? params.cursor : null
      const where = { creatorUid: auth.uid, status: 'active' }
      if (month) where.occurredMonth = month
      if (cursor) where._id = dbCmd.lt(cursor)
      const result = await moments.where(where).orderBy('occurredAt', 'desc').orderBy('_id', 'desc').limit(PAGE_SIZE + 1).get()
      const items = result.data || []
      const hasMore = items.length > PAGE_SIZE
      const list = hasMore ? items.slice(0, PAGE_SIZE) : items
      return success({ list: list.map(toClient), nextCursor: hasMore ? list[list.length - 1]._id : null, hasMore })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async detail(params = {}) {
    try {
      const auth = await requireAuth(this)
      const id = requireString(params.id, '时刻ID')
      const result = await moments.doc(id).get()
      const item = result.data && result.data[0]
      if (!item || item.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '时刻不存在')
      if (item.creatorUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '无权访问该时刻')
      return success(toClient(item))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async create(params = {}) {
    try {
      const auth = await requireAuth(this)
      const content = requireString(params.content, '内容', { maxLength: 2000 })
      if (!MOODS.includes(params.mood)) throw new AppError(API_CODE.INVALID_PARAMS, '心情不正确')
      const occurredAt = Number(params.occurredAt)
      if (!Number.isInteger(occurredAt) || occurredAt <= 0) throw new AppError(API_CODE.INVALID_PARAMS, '发生时间不正确')
      const mediaIds = Array.isArray(params.mediaIds) ? params.mediaIds.slice(0, 9) : []
      const title = typeof params.title === 'string' && params.title.trim() ? params.title.trim().slice(0, 30) : ''
      const now = Date.now()
      const record = {
        creatorUid: auth.uid,
        title: title || content.slice(0, 30),
        titleCustomized: title.length > 0,
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
      return success(toClient({ _id: inserted.id, ...record }))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async update(params = {}) {
    try {
      const auth = await requireAuth(this)
      const id = requireString(params.id, '时刻ID')
      const revision = Number(params.revision)
      if (!Number.isInteger(revision) || revision < 1) throw new AppError(API_CODE.INVALID_PARAMS, '版本号不正确')
      const existingResult = await moments.doc(id).get()
      const existing = existingResult.data && existingResult.data[0]
      if (!existing || existing.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '时刻不存在')
      if (existing.creatorUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '无权修改该时刻')
      const updateData = { updatedAt: Date.now(), revision: dbCmd.inc(1) }
      if (params.content !== undefined) updateData.content = requireString(params.content, '内容', { maxLength: 2000 })
      if (params.mood !== undefined) {
        if (!MOODS.includes(params.mood)) throw new AppError(API_CODE.INVALID_PARAMS, '心情不正确')
        updateData.mood = params.mood
      }
      if (params.occurredAt !== undefined) {
        const occurredAt = Number(params.occurredAt)
        if (!Number.isInteger(occurredAt) || occurredAt <= 0) throw new AppError(API_CODE.INVALID_PARAMS, '发生时间不正确')
        updateData.occurredAt = occurredAt
        updateData.occurredMonth = toOccurredMonth(occurredAt)
      }
      if (params.mediaIds !== undefined) updateData.mediaIds = Array.isArray(params.mediaIds) ? params.mediaIds.slice(0, 9) : []
      if (params.title !== undefined) {
        const title = typeof params.title === 'string' ? params.title.trim().slice(0, 30) : ''
        updateData.title = title || (params.content || existing.content).slice(0, 30)
        updateData.titleCustomized = title.length > 0
      }
      const updated = await moments.where({ _id: id, revision }).update(updateData)
      if (!updated.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '数据已被修改，请刷新后重试')
      return success({ _id: id })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async remove(params = {}) {
    try {
      const auth = await requireAuth(this)
      const id = requireString(params.id, '时刻ID')
      const existingResult = await moments.doc(id).get()
      const existing = existingResult.data && existingResult.data[0]
      if (!existing || existing.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '时刻不存在')
      if (existing.creatorUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '无权删除该时刻')
      await moments.doc(id).update({ status: 'deleted', deletedAt: Date.now(), updatedAt: Date.now(), revision: dbCmd.inc(1) })
      return success({ _id: id })
    } catch (error) {
      return normalizeError(error)
    }
  }
}
