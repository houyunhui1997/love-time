const ACTIVE_SPACE_KEY = 'love-time-active-space-owner'

function storageKey(): string {
  const uid = getCurrentUserId()
  return uid ? `${ACTIVE_SPACE_KEY}:${uid}` : ACTIVE_SPACE_KEY
}

export function getCurrentUserId(): string {
  const user = uni.getStorageSync('uni-id-pages-userInfo') as { _id?: string } | null
  return user?._id || ''
}

export function getActiveSpaceOwnerUid(): string {
  return String(uni.getStorageSync(storageKey()) || getCurrentUserId() || '')
}

export function setActiveSpaceOwnerUid(ownerUid: string): void {
  if (ownerUid) uni.setStorageSync(storageKey(), ownerUid)
  else uni.removeStorageSync(storageKey())
  uni.$emit('love-time-space-changed', ownerUid)
}

export function resetActiveSpace(): void {
  const uid = getCurrentUserId()
  if (uid) setActiveSpaceOwnerUid(uid)
  else uni.removeStorageSync(storageKey())
}
