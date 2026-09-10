import { restoreWeixinSession } from './auth'

export interface CloudObjectOptions {
  showLoading?: boolean
  loadingText?: string
  requireSession?: boolean
}

export function createCloudObject<T extends object>(name: string, options: CloudObjectOptions = {}): T {
  const { requireSession = true, ...cloudOptions } = options
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
        return value.apply(target, args)
      }
    }
  })
}
