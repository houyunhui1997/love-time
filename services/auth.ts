interface UniIdLoginResult {
  errCode?: number
  errMsg?: string
  uid: string
  newToken: { token: string; tokenExpired: number }
}

interface UniIdAccountInfoResult {
  errCode?: number | string
  errMsg?: string
  newToken?: { token: string; tokenExpired: number }
}

interface WeixinLoginParams {
  code: string
  onlyExisting?: boolean
}

const ACCOUNT_NOT_FOUND_CODES = [
  'uni-id-account-not-exists',
  'uni-id-account-not-exists-in-current-app'
]

let restorePromise: Promise<boolean> | null = null
let restoreChecked = false

function getWeixinCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: result => result.code ? resolve(result.code) : reject(new Error('未获取到微信登录凭证')),
      fail: () => reject(new Error('微信授权失败，请重试'))
    })
  })
}

function saveSession(result: UniIdLoginResult): string {
  const tokenInfo = result.newToken
  if (!result.uid || !tokenInfo?.token) throw new Error(result.errMsg || '登录服务返回异常')

  uni.setStorageSync('uni_id_token', tokenInfo.token)
  uni.setStorageSync('uni_id_token_expired', tokenInfo.tokenExpired)
  uni.setStorageSync('uni-id-pages-userInfo', { _id: result.uid })
  uni.$emit('uni-id-pages-login-success', result)
  return result.uid
}

function saveRefreshedToken(tokenInfo?: UniIdAccountInfoResult['newToken']): void {
  if (!tokenInfo?.token) return
  uni.setStorageSync('uni_id_token', tokenInfo.token)
  uni.setStorageSync('uni_id_token_expired', tokenInfo.tokenExpired)
}

function isAccountNotFound(error: any): boolean {
  const code = String(error?.errCode || error?.code || '')
  const message = String(error?.errMsg || error?.message || '')
  return ACCOUNT_NOT_FOUND_CODES.includes(code) || /account-not-exists|账号未注册/i.test(message)
}

function isSessionInvalid(error: any): boolean {
  if (isAccountNotFound(error)) return true
  const code = String(error?.errCode || error?.code || '')
  const message = String(error?.errMsg || error?.message || '')
  return /uni-id-(token-expired|check-token-failed|account-banned|unauthorized)/i.test(code)
    || /token.*(失效|过期|校验.*失败|invalid|expired)|账号.*(禁用|不存在)/i.test(message)
}

async function validateCurrentSession(): Promise<void> {
  const uniIdCo = uniCloud.importObject('uni-id-co', { customUI: true }) as {
    getAccountInfo(): Promise<UniIdAccountInfoResult>
  }
  const result = await uniIdCo.getAccountInfo()
  if (result?.errCode) throw result
  saveRefreshedToken(result?.newToken)
}

async function requestWeixinLogin(onlyExisting: boolean): Promise<string> {
  try {
    const code = await getWeixinCode()
    const uniIdCo = uniCloud.importObject('uni-id-co', { customUI: true }) as {
      loginByWeixin(params: WeixinLoginParams): Promise<UniIdLoginResult>
    }
    const result = await uniIdCo.loginByWeixin({ code, onlyExisting })
    return saveSession(result)
  } catch (error: any) {
    if (isAccountNotFound(error)) throw error
    const rawMessage = error?.errMsg || error?.message || ''
    if (/mongo_cell_decision_not_found|collection.*not.*found/i.test(rawMessage)) {
      throw new Error('登录数据表尚未部署，请先上传 uni-id 数据库结构')
    }
    if (/config|appid|appsecret|third.party.account/i.test(rawMessage)) {
      throw new Error('微信登录尚未完成云端密钥配置')
    }
    throw new Error(rawMessage || '登录失败，请稍后重试')
  }
}

export async function loginByWeixin(): Promise<string> {
  const uid = await requestWeixinLogin(false)
  restoreChecked = true
  return uid
}

export function getCurrentUserId(): string {
  const userInfo = uni.getStorageSync('uni-id-pages-userInfo') as { _id?: string } | null
  return userInfo?._id || ''
}

/**
 * 恢复微信会话：本地 Token 仅作为候选凭证，必须通过云端账户校验；
 * Token 失效或首次打开时，通过微信静默登录恢复或创建永久账号。
 * 该过程不读取头像、昵称、手机号等用户资料，也不会弹出资料授权框。
 */
export function restoreWeixinSession(): Promise<boolean> {
  if (restorePromise) return restorePromise

  restorePromise = (async () => {
    const hadLocalToken = Boolean(uni.getStorageSync('uni_id_token'))
    let shouldTryExistingOpenId = !restoreChecked || hadLocalToken

    if (hasValidSession()) {
      try {
        await validateCurrentSession()
        restoreChecked = true
        return true
      } catch (error) {
        if (!isSessionInvalid(error)) {
          console.warn('登录状态云端校验失败', error)
          return false
        }

        clearSession(false)
        shouldTryExistingOpenId = true
      }
    } else {
      clearSession(false)
    }

    if (!shouldTryExistingOpenId) return false

    try {
      await requestWeixinLogin(false)
      restoreChecked = true
      return true
    } catch (error) {
      if (isSessionInvalid(error)) {
        restoreChecked = true
      } else {
        console.warn('微信自动登录失败', error)
      }
      return false
    }
  })()
    .finally(() => {
      restorePromise = null
    })

  return restorePromise
}

export function hasValidSession(): boolean {
  const token = uni.getStorageSync('uni_id_token')
  const expiredValue = Number(uni.getStorageSync('uni_id_token_expired'))
  if (!token) return false
  if (!expiredValue) return true
  const expiredAt = expiredValue < 10_000_000_000 ? expiredValue * 1000 : expiredValue
  return expiredAt > Date.now()
}

export function clearSession(resetAutoLogin = true): void {
  uni.removeStorageSync('uni_id_token')
  uni.removeStorageSync('uni_id_token_expired')
  uni.removeStorageSync('uni-id-pages-userInfo')
  if (resetAutoLogin) restoreChecked = false
}
