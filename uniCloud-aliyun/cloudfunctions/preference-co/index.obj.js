'use strict'

const uniIdCommon = require('uni-id-common')
const { success, normalizeError, AppError, API_CODE, requireString } = require('love-common')
const db = uniCloud.database()
const collection = db.collection('preference-memos')
const CATEGORIES = ['like', 'dislike', 'habit', 'remember']

const fail = message => { throw new AppError(API_CODE.INVALID_PARAMS, message) }
const conflict = () => { throw new AppError(API_CODE.REVISION_CONFLICT, '备忘已更新，请刷新后重新操作') }

async function load(context) {
  const auth = await context.uniIdCommon.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新连接')
  const result = await collection.doc(auth.uid).get()
  return { uid: auth.uid, journal: result.data[0] || null }
}

function toClient(journal) {
  return { revision: journal ? journal.revision : 0, records: journal ? journal.records : [] }
}

function optionalString(value, fieldName, maxLength) {
  if (value === undefined) return undefined
  if (typeof value !== 'string') fail(`${fieldName}格式不正确`)
  return value.trim().slice(0, maxLength)
}

function normalizeRecord(params, existing) {
  const now = Date.now()
  const category = params.category === undefined ? existing.category : params.category
  if (!CATEGORIES.includes(category)) fail('分类不正确')
  return {
    id: existing.id,
    title: params.title === undefined ? existing.title : requireString(params.title, '备忘标题', { maxLength: 30 }),
    category,
    tag: optionalString(params.tag, '标签', 16) ?? existing.tag,
    note: optionalString(params.note, '说明', 100) ?? existing.note,
    createdAt: existing.createdAt || now,
    updatedAt: now
  }
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },

  async get() {
    try {
      return success(toClient((await load(this)).journal))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async save(params = {}) {
    try {
      const { uid, journal } = await load(this)
      const currentRevision = journal ? journal.revision : 0
      if (!Number.isInteger(params.revision) || params.revision !== currentRevision) conflict()
      if (typeof params.id !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(params.id)) fail('备忘标识不正确')

      const records = journal ? journal.records.slice() : []
      const index = records.findIndex(item => item.id === params.id)
      if (params.remove === true) {
        if (index < 0) fail('备忘不存在，请刷新')
        records.splice(index, 1)
      } else if (index < 0) {
        const now = Date.now()
        records.unshift(normalizeRecord(params, {
          id: params.id,
          title: '',
          category: 'like',
          tag: '',
          note: '',
          createdAt: now,
          updatedAt: now
        }))
      } else {
        records[index] = normalizeRecord(params, records[index])
      }

      if (records.length > 500) fail('已达到 500 条备忘上限')
      const next = { records, revision: currentRevision + 1, updatedAt: Date.now() }
      if (journal) {
        const result = await collection.where({ _id: uid, revision: currentRevision }).update(next)
        if (!result.updated) conflict()
      } else {
        try {
          await collection.add({ _id: uid, ...next })
        } catch (error) {
          const existing = await collection.doc(uid).get()
          if (existing.data.length) conflict()
          throw error
        }
      }
      return success(toClient(next))
    } catch (error) {
      return normalizeError(error)
    }
  }
}
