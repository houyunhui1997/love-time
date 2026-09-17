'use strict'

const uniIdCommon = require('uni-id-common')
const { success, normalizeError, AppError, API_CODE, requireString } = require('love-common')
const db = uniCloud.database()
const collection = db.collection('date-plans')
const ID_PATTERN = /^[a-zA-Z0-9_-]{8,80}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

const fail = message => { throw new AppError(API_CODE.INVALID_PARAMS, message) }
const conflict = () => { throw new AppError(API_CODE.REVISION_CONFLICT, '计划已更新，请刷新后重新操作') }

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

function normalizeItems(items, fieldName, withCompleted) {
  if (!Array.isArray(items)) fail(`${fieldName}格式不正确`)
  if (items.length > 30) fail(`${fieldName}最多添加 30 项`)
  return items.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !ID_PATTERN.test(item.id)) fail(`${fieldName}标识不正确`)
    const normalized = { id: item.id, title: requireString(item.title, fieldName, { maxLength: 30 }) }
    return withCompleted ? { ...normalized, completed: item.completed === true } : normalized
  })
}

function normalizeRecord(params, existing) {
  const now = Date.now()
  const date = params.date === undefined ? existing.date : params.date
  const time = params.time === undefined ? existing.time : optionalString(params.time, '约会时间', 5)
  if (typeof date !== 'string' || !DATE_PATTERN.test(date)) fail('请选择正确的约会日期')
  if (time && !TIME_PATTERN.test(time)) fail('请选择正确的约会时间')
  return {
    id: existing.id,
    title: optionalString(params.title, '约会名称', 30) ?? existing.title,
    date,
    time,
    location: optionalString(params.location, '约会地点', 50) ?? existing.location,
    note: optionalString(params.note, '约会备注', 200) ?? existing.note,
    cover: optionalString(params.cover, '封面', 160) ?? existing.cover,
    arrangements: params.arrangements === undefined ? existing.arrangements : normalizeItems(params.arrangements, '安排', false),
    preparations: params.preparations === undefined ? existing.preparations : normalizeItems(params.preparations, '准备事项', true),
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
      if (typeof params.id !== 'string' || !ID_PATTERN.test(params.id)) fail('计划标识不正确')

      const records = journal ? journal.records.slice() : []
      const index = records.findIndex(item => item.id === params.id)
      if (params.remove === true) {
        if (index < 0) fail('计划不存在，请刷新')
        records.splice(index, 1)
      } else if (index < 0) {
        const now = Date.now()
        records.unshift(normalizeRecord(params, {
          id: params.id,
          title: '',
          date: '',
          time: '',
          location: '',
          note: '',
          cover: '/static/plan/樱花湖畔的落日漫步.png',
          arrangements: [],
          preparations: [],
          createdAt: now,
          updatedAt: now
        }))
      } else {
        records[index] = normalizeRecord(params, records[index])
      }

      if (records.length > 200) fail('已达到 200 条计划上限')
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
