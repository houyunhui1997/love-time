// 图片临时链接工具
// 数据库存的是 cloud fileID，展示前需换取临时 URL

export async function getTempFileUrls(fileIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(fileIds.filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  try {
    const result = await uniCloud.getTempFileURL({ fileList: uniqueIds })
    const files = result.fileList || []
    const map: Record<string, string> = {}
    files.forEach((file: any) => {
      if (file && file.fileID && file.tempFileURL) {
        map[file.fileID] = file.tempFileURL
      }
    })
    return map
  } catch {
    // 换取失败时降级：直接用 fileID 占位
    const map: Record<string, string> = {}
    uniqueIds.forEach(id => {
      map[id] = id
    })
    return map
  }
}
