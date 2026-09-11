'use strict'

const uniIdCommon = require('uni-id-common')
const { offsets, parseDate } = require('love-reminder')
const { success, normalizeError, AppError, API_CODE, requireString } = require('love-common')
const db = uniCloud.database()
const dbCmd = db.command
const anniversaries = db.collection('anniversaries')

const EVENT_TYPES = ['countdown', 'anniversary', 'birthday']
const REPEAT_TYPES = ['none', 'yearly']
const REMINDER_OFFSETS = [0, 1, 3, 7]
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
    eventType: item.eventType,
    targetDate: item.targetDate,
    repeatType: item.repeatType,
    reminderOffsetDays: offsets(item),
    reminderTime: item.reminderTime || '09:00',
    note: item.note || '',
    pinned: !!item.pinned,
    source: item.source,
    revision: item.revision || 1
  }
}

function validatePayload(params, { partial = false } = {}) {
  if (!partial || params.title !== undefined) params.title = requireString(params.title, '纪念日名称', { maxLength: 20 })
  if (!partial || params.eventType !== undefined) {
    if (!EVENT_TYPES.includes(params.eventType)) throw new AppError(API_CODE.INVALID_PARAMS, '纪念类型不正确')
  }
  if (!partial || params.targetDate !== undefined) {
    if (typeof params.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(params.targetDate)) {
      throw new AppError(API_CODE.INVALID_PARAMS, '纪念日期格式不正确')
    }
    try { parseDate(params.targetDate) } catch (_) { throw new AppError(API_CODE.INVALID_PARAMS, '纪念日期不存在') }
  }
  if (!partial || params.repeatType !== undefined) {
    if (params.repeatType !== undefined && !REPEAT_TYPES.includes(params.repeatType)) {
      throw new AppError(API_CODE.INVALID_PARAMS, '重复方式不正确')
    }
  }
  if (!partial || params.reminderOffsetDays !== undefined) {
    if (params.reminderOffsetDays !== undefined) {
      if (!Array.isArray(params.reminderOffsetDays) || params.reminderOffsetDays.some(d => !REMINDER_OFFSETS.includes(d))) {
        throw new AppError(API_CODE.INVALID_PARAMS, '提醒时间不正确')
      }
      params.reminderOffsetDays = [...new Set(params.reminderOffsetDays)]
    }
  }
  if (params.note !== undefined && typeof params.note === 'string') params.note = params.note.trim().slice(0, 100)
  if (params.pinned !== undefined && typeof params.pinned !== 'boolean') {
    throw new AppError(API_CODE.INVALID_PARAMS, '置顶参数不正确')
  }
  return params
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },

  async list(params = {}) {
    try {
      const auth = await requireAuth(this)
      const cursor = typeof params.cursor === 'string' && params.cursor ? params.cursor : null
      const where = { creatorUid: auth.uid, status: 'active' }
      if (cursor) where._id = dbCmd.gt(cursor)
      const query = anniversaries.where(where)
      const ordered = params.cursorOrder === true ? query.orderBy('_id', 'asc') : query.orderBy('pinned', 'desc').orderBy('_id', 'asc')
      const result = await ordered.limit(PAGE_SIZE + 1).get()
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
      const id = requireString(params.id, '纪念日ID')
      const result = await anniversaries.doc(id).get()
      const item = result.data && result.data[0]
      if (!item || item.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '纪念日不存在')
      if (item.creatorUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '无权访问该纪念日')
      return success(toClient(item))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async create(params = {}) {
    try {
      const auth = await requireAuth(this)
      validatePayload(params)
      const now = Date.now()
      const record = {
        creatorUid: auth.uid,
        title: params.title,
        eventType: params.eventType,
        targetDate: params.targetDate,
        calendarType: 'solar',
        repeatType: params.repeatType,
        reminderOffsetDays: params.reminderOffsetDays || [],
        reminderTime: '09:00',
        reminderVersion: 2,
        subscription: { status: 'none' },
        note: params.note || '',
        pinned: !!params.pinned,
        source: 'user',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1
      }
      const inserted = await anniversaries.add(record)
      return success(toClient({ _id: inserted.id, ...record }))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async update(params = {}) {
    try {
      const auth = await requireAuth(this)
      const id = requireString(params.id, '纪念日ID')
      const revision = Number(params.revision)
      if (!Number.isInteger(revision) || revision < 1) throw new AppError(API_CODE.INVALID_PARAMS, '版本号不正确')
      const existingResult = await anniversaries.doc(id).get()
      const existing = existingResult.data && existingResult.data[0]
      if (!existing || existing.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '纪念日不存在')
      if (existing.creatorUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '无权修改该纪念日')
      if (existing.subscription && existing.subscription.status === 'sending') throw new AppError(API_CODE.INVALID_PARAMS, '提醒正在发送，请稍后修改')
      const patch = {}
      for (const key of ['title', 'eventType', 'targetDate', 'repeatType', 'reminderOffsetDays', 'note', 'pinned']) {
        if (params[key] !== undefined) patch[key] = params[key]
      }
      validatePayload(patch, { partial: true })
      const nextOffsets = patch.reminderOffsetDays || offsets(existing)
      const scheduleChanged = (patch.targetDate !== undefined && patch.targetDate !== existing.targetDate)
        || JSON.stringify(nextOffsets) !== JSON.stringify(offsets(existing))
      // 名称、备注、置顶及重复展示方式不改变已安排的订阅。
      const subscriptionPatch = scheduleChanged ? { subscription: { status: 'cancelled' } } : {}
      const updated = await anniversaries.where({ _id: id, revision, status: 'active', 'subscription.status': dbCmd.neq('sending') }).update({ ...patch, reminderVersion: 2, reminderOffsetDays: nextOffsets, ...subscriptionPatch, updatedAt: Date.now(), revision: dbCmd.inc(1) })
      if (!updated.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '数据已被修改，请刷新后重试')
      return success({ _id: id })
    } catch (error) {
      return normalizeError(error)
    }
  },

  async remove(params = {}) {
    try {
      const auth = await requireAuth(this)
      const id = requireString(params.id, '纪念日ID')
      const existingResult = await anniversaries.doc(id).get()
      const existing = existingResult.data && existingResult.data[0]
      if (!existing || existing.status !== 'active') throw new AppError(API_CODE.NOT_FOUND, '纪念日不存在')
      if (existing.creatorUid !== auth.uid) throw new AppError(API_CODE.FORBIDDEN, '无权删除该纪念日')
      const removed = await anniversaries.where({ _id: id, revision: existing.revision, 'subscription.status': dbCmd.neq('sending') }).update({ subscription: { status: 'cancelled' }, status: 'deleted', deletedAt: Date.now(), updatedAt: Date.now(), revision: dbCmd.inc(1) })
      if (!removed.updated) throw new AppError(API_CODE.REVISION_CONFLICT, '纪念日已变化或提醒正在发送，请稍后重试')
      return success({ _id: id })
    } catch (error) {
      return normalizeError(error)
    }
  }
}


