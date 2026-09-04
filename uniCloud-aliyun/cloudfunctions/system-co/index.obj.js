'use strict'

const { success } = require('love-common')

module.exports = {
  ping() {
    const clientInfo = this.getClientInfo()

    return success({
      service: 'system-co',
      version: '0.1.0',
      serverTime: Date.now(),
      platform: clientInfo.platform || 'unknown'
    })
  }
}

