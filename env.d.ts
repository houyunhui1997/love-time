/// <reference types="@dcloudio/types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare const uni: {
  navigateBack(options?: Record<string, unknown>): void
  navigateTo(options: { url: string }): void
  switchTab(options: { url: string }): void
  showToast(options: { title: string; icon?: 'none' | 'success' | 'loading' | 'error'; duration?: number }): void
  showActionSheet(options: { itemList: string[]; success?: (res: { tapIndex: number; cancel?: boolean }) => void; fail?: () => void }): void
  setStorageSync(key: string, value: unknown): void
  getStorageSync(key: string): unknown
  removeStorageSync(key: string): void
  login(options: { provider: string; success?: (res: { code?: string }) => void; fail?: () => void }): void
  chooseImage(options: { count?: number; success?: (res: { tempFilePaths: string[] }) => void }): void
  uploadFile(options: { url: string; filePath: string; name: string; formData?: Record<string, string> }): Promise<{ data: string; statusCode: number }>
  downloadFile(options: { url: string }): Promise<{ tempFilePath: string }>
  saveImageToPhotosAlbum(options: { filePath: string; success?: () => void; fail?: () => void }): void
  getImageInfo(options: { src: string; success?: (res: { width: number; height: number }) => void }): void
  $emit(event: string, ...args: unknown[]): void
}

declare const uniCloud: {
  importObject(name: string, options?: Record<string, unknown>): any
  uploadFile(options: { filePath: string; cloudPath: string }): Promise<{ fileID: string }>
  getTempFileURL(options: { fileList: string[] }): Promise<{ fileList: Array<{ fileID: string; tempFileURL: string }> }>
}

