<template>
  <view class="page">
    <view class="nav" :style="navStyle">
      <view class="back" @tap="goBack"><uni-icons type="left" size="23" color="#6b5142" /></view>
      <text class="nav-title">情侣空间</text>
    </view>

    <view v-if="overview" class="content">
      <image class="top-sprig" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/timeline/blossom-sprig.png" mode="aspectFit" />
      <image class="bottom-flower" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/flower-decoration.png" mode="aspectFit" />

      <view class="relationship">
        <view class="person">
          <image class="relationship-avatar" :src="avatarOf(overview.owner)" mode="aspectFill" />
          <text class="person-name">{{ overview.owner.nickname }}</text>
        </view>
        <view class="heart-link"><uni-icons type="heart-filled" size="28" color="#e88780" /></view>
        <view class="person">
          <template v-if="relationshipPartner">
            <image class="relationship-avatar" :src="avatarOf(relationshipPartner)" mode="aspectFill" />
            <text class="person-name">{{ relationshipPartner.nickname }}</text>
          </template>
          <template v-else>
            <view class="invite-avatar"><uni-icons type="personadd" size="40" color="#c6887f" /></view>
            <text class="person-name pending-name">等待另一半</text>
          </template>
        </view>
      </view>

      <picker mode="date" :value="loveProfile?.loveStartDate || today" :end="today" @change="onLoveDateChange">
        <view class="date-area">
          <view class="date-rule" />
          <text class="date-label">在一起日期</text>
          <view class="date-line">
            <text class="date-value" :class="{ muted: !loveProfile }">{{ displayLoveDate }}</text>
            <uni-icons type="compose" size="22" color="#806457" />
          </view>
        </view>
      </picker>

      <view v-if="relationshipPartner && loveProfile" class="days-together">
        <text>已经相伴</text><text class="days-number">{{ togetherDays }}</text><text>天</text>
      </view>

      <button v-if="!relationshipPartner" class="invite-button" open-type="share">邀请另一半</button>
      <button v-else class="unbind-button" @tap="unlinkPartner">与{{ relationshipPartner.nickname }}解绑</button>
    </view>

  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { getSpaceOverview, leaveJoinedSpace, removeSpaceMember, type SpaceOverview, type SpacePerson } from '@/services/space'
import { getMyLoveProfile, saveMyLoveProfile, type LoveProfile } from '@/services/profile'
import { differenceInCalendarDays, formatBusinessDate } from '@/utils/date'

const overview = ref<SpaceOverview | null>(null)
const loveProfile = ref<LoveProfile | null>(null)
const savingProfile = ref(false)
const today = formatBusinessDate(new Date())
const fallbackAvatar = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/companion/default-avatar.png'
const systemInfo = uni.getSystemInfoSync()
const navTop = Number(systemInfo.statusBarHeight || 20)
const navStyle = computed(() => ({ paddingTop: `${navTop}px`, height: `${navTop + 44}px` }))
const relationshipPartner = computed(() => overview.value?.member || overview.value?.joinedOwner || null)
const displayLoveDate = computed(() => loveProfile.value?.loveStartDate.replace(/-/g, '.') || '点击设置')
const togetherDays = computed(() => loveProfile.value
  ? Math.max(0, differenceInCalendarDays(today, loveProfile.value.loveStartDate))
  : 0)

onShow(load)
onShareAppMessage(() => ({
  title: overview.value?.member || overview.value?.joinedOwner
    ? '恋时光 · 记录爱，纪念每一个值得的日子'
    : `${overview.value?.owner.nickname || '我'}邀请你加入情侣空间`,
  path: overview.value?.member || overview.value?.joinedOwner
    ? '/pages/anniversary/index'
    : `/pages/couple/join?code=${encodeURIComponent(overview.value?.inviteCode || '')}`
}))

async function load() {
  try {
    overview.value = await getSpaceOverview()
    loveProfile.value = await getMyLoveProfile()
  }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' }) }
}

async function onLoveDateChange(event: any) {
  const selectedDate = event?.detail?.value || ''
  if (!selectedDate) return
  if (savingProfile.value) return
  savingProfile.value = true
  try {
    loveProfile.value = await saveMyLoveProfile({ loveStartDate: selectedDate })
    uni.showToast({ title: '日期已保存', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' })
  } finally {
    savingProfile.value = false
  }
}

function avatarOf(person: SpacePerson) { return person.avatarFileId || fallbackAvatar }
function goBack() { uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) }) }
function confirm(title: string, content: string): Promise<boolean> {
  return new Promise(resolve => uni.showModal({ title, content, confirmColor: '#d87973', success: result => resolve(result.confirm), fail: () => resolve(false) }))
}

function unlinkPartner() {
  if (overview.value?.joinedOwner) void leaveSpace()
  else if (overview.value?.member) void removeMember()
}

async function leaveSpace() {
  if (!overview.value?.joinedOwner || !await confirm(`与${overview.value.joinedOwner.nickname}解绑`, '解绑后将无法继续查看和编辑对方空间，已创建的内容仍归对方所有。')) return
  try { await leaveJoinedSpace(); await load(); uni.showToast({ title: '已退出空间', icon: 'success' }) }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '退出失败', icon: 'none' }) }
}

async function removeMember() {
  if (!overview.value?.member || !await confirm(`与${overview.value.member.nickname}解绑`, '解绑后，对方将立即失去你空间的查看和编辑权限。')) return
  try { await removeSpaceMember(); await load(); uni.showToast({ title: '已移除成员', icon: 'success' }) }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '移除失败', icon: 'none' }) }
}
</script>

<style scoped lang="scss">
.page { display: flex; height: 100vh; min-height: 0; flex-direction: column; overflow: hidden; color: #5d4638; background: radial-gradient(circle at 42% 25%, rgba(249,220,213,.34), transparent 32%), #fcf8f3; }
.nav { position: relative; z-index: 5; display: flex; box-sizing: border-box; flex-shrink: 0; align-items: flex-end; justify-content: center; padding-bottom: 11px; }
.back { position: absolute; left: 26rpx; bottom: 7px; display: flex; width: 60rpx; height: 60rpx; align-items: center; justify-content: center; }
.nav-title { color: #554238; font-size: 32rpx; font-weight: 650; letter-spacing: 1rpx; }
.content { position: relative; display: flex; min-height: 0; flex: 1; flex-direction: column; align-items: center; padding: 88rpx 46rpx calc(env(safe-area-inset-bottom) + 34rpx); overflow: hidden; }
.top-sprig { position: absolute; top: 6rpx; right: -34rpx; width: 190rpx; height: 230rpx; opacity: .48; transform: rotate(-10deg); pointer-events: none; }
.bottom-flower { position: absolute; bottom: -36rpx; left: -82rpx; width: 390rpx; height: 360rpx; opacity: .62; pointer-events: none; }
.relationship { position: relative; z-index: 2; display: grid; width: 100%; grid-template-columns: minmax(0,1fr) 72rpx minmax(0,1fr); align-items: start; }
.person { display: flex; min-width: 0; flex-direction: column; align-items: center; }
.relationship-avatar, .invite-avatar { box-sizing: border-box; width: 158rpx; height: 158rpx; border-radius: 50%; }
.relationship-avatar { border: 5rpx solid rgba(255,255,255,.92); background: #eee0d6; box-shadow: 0 12rpx 28rpx rgba(102,70,50,.13); }
.invite-avatar { display: flex; align-items: center; justify-content: center; border: 3rpx dashed rgba(184,139,127,.55); background: rgba(255,255,255,.46); }
.heart-link { display: flex; height: 158rpx; align-items: center; justify-content: center; }
.person-name { display: block; max-width: 100%; margin-top: 20rpx; overflow: hidden; color: #554238; font-size: 27rpx; font-weight: 600; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.pending-name { color: #75594b; }
.date-area { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; margin-top: 76rpx; padding: 0 30rpx; }
.date-rule { width: 54rpx; height: 2rpx; border-radius: 2rpx; background: #d8b6a6; }
.date-label { margin-top: 32rpx; color: #b47b70; font-size: 25rpx; letter-spacing: 2rpx; }
.date-line { display: flex; align-items: center; gap: 20rpx; margin-top: 22rpx; }
.date-value { color: #5e4438; font-family: Georgia, 'Times New Roman', serif; font-size: 52rpx; line-height: 1.15; letter-spacing: 2rpx; }
.muted { color: #af9a8c; }
.days-together { position: relative; z-index: 2; display: flex; align-items: baseline; gap: 12rpx; margin-top: 44rpx; color: #654d40; font-size: 25rpx; }
.days-number { color: #df7772; font-family: Georgia, 'Times New Roman', serif; font-size: 50rpx; line-height: 1; }
.invite-button { position: relative; z-index: 2; width: 520rpx; height: 86rpx; margin-top: 76rpx; border-radius: 44rpx; background: linear-gradient(135deg, #e9837d, #dc706d); box-shadow: 0 15rpx 32rpx rgba(205,102,96,.22); color: #fff; font-size: 29rpx; font-weight: 600; line-height: 86rpx; letter-spacing: 2rpx; }
.invite-button::after, .unbind-button::after { border: 0; }
.unbind-button { position: relative; z-index: 2; margin-top: auto; margin-bottom: 18rpx; padding: 12rpx 8rpx; border: 0; border-bottom: 1rpx solid rgba(185,120,109,.7); border-radius: 0; background: transparent; color: #b7766b; font-size: 23rpx; line-height: 1.4; }
</style>
