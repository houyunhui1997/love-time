'use strict'

const uniIdCommon = require('uni-id-common')
const { success, normalizeError, AppError, API_CODE } = require('love-common')
const collection = uniCloud.database().collection('period-journals')
const fail = message => { throw new AppError(API_CODE.INVALID_PARAMS, message) }
const conflict = () => { throw new AppError(API_CODE.REVISION_CONFLICT, '记录已更新，请刷新后重新操作') }

function validateDate(value, today) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('日期格式不正确')
  const time = Date.parse(value + 'T00:00:00Z')
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) fail('日期不存在')
  if (value < '1900-01-01' || value > today) fail('只能记录 1900 年至今天的实际日期')
}

async function load(context) {
  const auth = await context.uniIdCommon.checkToken(context.getUniIdToken())
  if (auth.errCode || !auth.uid) throw new AppError(API_CODE.UNAUTHORIZED, '登录状态已失效，请重新连接')
  const result = await collection.doc(auth.uid).get()
  return { uid: auth.uid, journal: result.data[0] || null }
}

function toClient(journal) {
  return { revision: journal ? journal.revision : 0, records: journal ? journal.records : [] }
}

module.exports = {
  async _before() {
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
  },
  async get() {
    try { return success(toClient((await load(this)).journal)) } catch (error) { return normalizeError(error) }
  },
  async save(params = {}) {
    try {
      const { uid, journal } = await load(this)
      if (!Number.isInteger(params.revision) || params.revision !== (journal ? journal.revision : 0)) conflict()
      if (typeof params.id !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(params.id)) fail('记录标识不正确')
      const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
      let records = journal ? journal.records.slice() : []
      if (params.remove === true) {
        if (!records.some(item => item.id === params.id)) fail('记录不存在，请刷新')
        records = records.filter(item => item.id !== params.id)
      } else {
        validateDate(params.startDate, today)
        const index = records.findIndex(item => item.id === params.id)
        // 第一版只记录开始日；保留历史结束字段，但不再参与记录与预测。
        const record = { id: params.id, startDate: params.startDate, endDate: index >= 0 ? records[index].endDate || null : null }
        if (index === -1) records.push(record)
        else records[index] = record
      }
      records.sort((a, b) => a.startDate.localeCompare(b.startDate))
      if (records.length > 1000) fail('已达到 1000 条记录上限')
      for (let i = 1; i < records.length; i++) {
        const previous = records[i - 1]
        if (previous.startDate === records[i].startDate) fail('这一天已记录开始日期，请修改已有记录')
      }
      const next = { records, revision: params.revision + 1, updatedAt: Date.now() }
      if (journal) {
        const result = await collection.where({ _id: uid, revision: params.revision }).update(next)
        if (!result.updated) conflict()
      } else {
        // 固定本人文档 ID 保证首次并发创建也不会写入两份记录。
        try { await collection.add({ _id: uid, ...next }) } catch (error) {
          const existing = await collection.doc(uid).get()
          if (existing.data.length) conflict()
          throw error
        }
      }
      return success(toClient(next))
    } catch (error) { return normalizeError(error) }
  }
}
