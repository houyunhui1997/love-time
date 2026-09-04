export interface CloudObjectOptions {
  showLoading?: boolean
  loadingText?: string
}

export function createCloudObject<T extends object>(name: string, options: CloudObjectOptions = {}): T {
  return uniCloud.importObject(name, {
    customUI: true,
    ...options
  }) as T
}

