import { restoreWeixinSession } from './auth'

export interface CloudObjectOptions {
  showLoading?: boolean
  loadingText?: string
  requireSession?: boolean
  injectSpace?: boolean
}

export function createCloudObject<T extends object>(name: string, options: CloudObjectOptions = {}): T {
  const { requireSession = true, injectSpace = true, ...cloudOptions } = options
  const cloudObject = uniCloud.importObject(name, {
    customUI: true,
    ...cloudOptions
  }) as T

  return new Proxy(cloudObject, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver)
      if (typeof value !== 'function') return value

      return async (...args: unknown[]) => {
        if (requireSession) {
          const ready = await restoreWeixinSession()
          if (!ready) throw new Error('暂时无法连接服务，请检查网络后重试')
        }
        if (injectSpace) {
          const user = uni.getStorageSync('uni-id-pages-userInfo') as { _id?: string } | null
          const spaceKey = user?._id ? `love-time-active-space-owner:${user._id}` : 'love-time-active-space-owner'
          const ownerUid = String(uni.getStorageSync(spaceKey) || user?._id || '')
          if (ownerUid) {
            if (!args.length) args = [{ spaceOwnerUid: ownerUid }]
            else if (args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
              args[0] = { ...(args[0] as Record<string, unknown>), spaceOwnerUid: ownerUid }
            }
          }
        }
        return value.apply(target, args)
      }
    }
  })
}
