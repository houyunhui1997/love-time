'use strict'

const uniIdCommon = require('uni-id-common')
const { success, normalizeError, AppError, API_CODE, requireString, resolveSpaceOwnerUid } = require('love-common')
const db = uniCloud.database()
const collection = db.collection('wish-lists')

const fail = message => { throw new AppError(API_CODE.INVALID_PARAMS, message) }
const conflict = () => { throw new AppError(API_CODE.REVISION_CONFLICT, '心愿已更新，请刷新后重新操作') }

async function load(context, params = {}) {
  const auth = await context.uniIdCommon.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新连接')
  const ownerUid = await resolveSpaceOwnerUid(auth.uid, params)
  const result = await collection.doc(ownerUid).get()
  return { uid: ownerUid, actorUid: auth.uid, journal: result.data[0] || null }
}

function toClient(journal) {
  return { revision: journal ? journal.revision : 0, records: journal ? journal.records : [] }
}

function normalizeRecord(params, existing) {
  const now = Date.now()
  const source = params.source === undefined ? existing.source : params.source
  if (source !== 'template' && source !== 'custom') fail('心愿来源不正确')
  const templateId = params.templateId === undefined ? existing.templateId : params.templateId
  if (templateId !== null && typeof templateId !== 'string') fail('模板标识不正确')
  const cover = params.cover === undefined ? existing.cover : params.cover
  if (typeof cover !== 'string' || cover.length > 160) fail('封面不正确')
  return {
    id: existing.id,
    title: params.title === undefined ? existing.title : requireString(params.title, '心愿名称', { maxLength: 30 }),
    description: params.description === undefined
      ? existing.description
      : (typeof params.description === 'string' ? params.description.trim().slice(0, 100) : ''),
    cover,
    source,
    templateId,
    completed: params.completed === undefined ? existing.completed : params.completed === true,
    createdAt: existing.createdAt || now,
    updatedAt: now
  }
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },

  async get(params = {}) {
    try {
      return success(toClient((await load(this, params)).journal))
    } catch (error) {
      return normalizeError(error)
    }
  },

  async save(params = {}) {
    try {
      const { uid, actorUid, journal } = await load(this, params)
      const currentRevision = journal ? journal.revision : 0
      if (!Number.isInteger(params.revision) || params.revision !== currentRevision) conflict()
      if (typeof params.id !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(params.id)) fail('心愿标识不正确')

      let records = journal ? journal.records.slice() : []
      const index = records.findIndex(item => item.id === params.id)
      if (params.remove === true) {
        if (index < 0) fail('心愿不存在，请刷新')
        records.splice(index, 1)
      } else if (index < 0) {
        const now = Date.now()
        const created = normalizeRecord(params, {
          id: params.id,
          title: '',
          description: '',
          cover: '',
          source: 'custom',
          templateId: null,
          completed: false,
          createdAt: now,
          updatedAt: now
        })
        if (created.source === 'template' && created.templateId && records.some(item => item.templateId === created.templateId)) {
          fail('这个灵感已经收藏过了')
        }
        records.unshift(created)
      } else {
        records[index] = normalizeRecord(params, records[index])
      }

      if (records.length > 500) fail('已达到 500 条心愿上限')
      const next = { ownerUid: uid, updatedByUid: actorUid, records, revision: currentRevision + 1, updatedAt: Date.now() }
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
