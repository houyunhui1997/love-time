<template>
  <view class="page" :style="pageStyle">
    <view class="nav">
      <view class="back" @tap="goBack"><uni-icons type="left" size="28" color="#59483e" /></view>
      <text class="title">情侣空间</text>
    </view>

    <view v-if="context" class="content">
      <view class="space-card">
        <text class="space-name">{{ context.activeSpace.name }}</text>
        <text class="space-state">{{ context.activeSpace.isCouple ? '两个人的恋时光' : '等待另一半加入' }}</text>
        <view class="members">
          <view v-for="member in context.members" :key="member.uid" class="member">
            <image v-if="member.avatarFileId" class="avatar" :src="member.avatarFileId" mode="aspectFill" />
            <view v-else class="avatar fallback"><uni-icons type="person-filled" size="30" color="#d87a74" /></view>
            <text class="member-name">{{ member.nickname }}</text>
            <text class="role">{{ member.uid === context.activeSpace.ownerUid ? '创建者' : '另一半' }}</text>
          </view>
          <view v-if="!context.activeSpace.isCouple" class="member invite" @tap="openInvite">
            <view class="avatar invite-avatar"><uni-icons type="plusempty" size="30" color="#d87a74" /></view>
            <text class="member-name invite-text">去邀请</text>
            <text class="role">等待加入</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="row" @tap="copyCode">
          <view><text class="label">空间码</text><text class="hint">分享给另一半即可加入</text></view>
          <view class="row-right"><text class="code">{{ context.activeSpace.code }}</text><uni-icons type="paperclip" size="18" color="#aa998e" /></view>
        </view>
        <view v-if="context.activeSpace.isOwned && !context.activeSpace.isCouple" class="row divided" @tap="refreshCode">
          <view><text class="label">刷新空间码</text><text class="hint">旧空间码会立即失效</text></view>
          <uni-icons type="loop" size="20" color="#aa998e" />
        </view>
        <view class="row divided" @tap="editSpace">
          <view><text class="label">空间资料</text><text class="hint">名称与在一起日期</text></view>
          <uni-icons type="right" size="19" color="#aa998e" />
        </view>
      </view>

      <view v-if="context.spaces.length > 1" class="section">
        <text class="section-title">切换空间</text>
        <view v-for="space in context.spaces" :key="space._id" class="space-row" @tap="switchTo(space._id)">
          <view><text class="label">{{ space.name }}</text><text class="hint">{{ space.isOwned ? '我创建的空间' : '我加入的空间' }}</text></view>
          <uni-icons :type="space.isActive ? 'checkmarkempty' : 'right'" size="19" :color="space.isActive ? '#df7772' : '#aa998e'" />
        </view>
      </view>

      <button v-if="context.activeSpace.isCouple" class="danger" @tap="confirmUnbind">解除情侣关系</button>
      <text v-if="context.activeSpace.isCouple" class="danger-tip">解绑后，各自创建的内容会回到自己的空间并转为仅自己可见</text>
    </view>
    <LoveLoading :visible="loading" fullscreen text="正在读取情侣空间" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { getSpaceContext, regenerateSpaceCode, switchActiveSpace, unbindSpace, type SpaceContext } from '@/services/space'

const loading = ref(true)
const context = ref<SpaceContext | null>(null)
const info = uni.getSystemInfoSync()
let top = Number(info.statusBarHeight || 20) + 6
let height = 32
try { const rect = uni.getMenuButtonBoundingClientRect(); if (rect?.top && rect?.height) { top = rect.top; height = rect.height } } catch {}
const pageStyle = { '--menu-top': `${top}px`, '--menu-height': `${height}px` }

onShow(load)
async function load() {
  loading.value = true
  try { context.value = await getSpaceContext() }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '空间读取失败', icon: 'none' }) }
  finally { loading.value = false }
}
function goBack() { uni.navigateBack() }
function openInvite() { uni.navigateTo({ url: '/pages/couple/invite' }) }
function editSpace() { uni.navigateTo({ url: '/pages/profile/love-profile' }) }
function copyCode() {
  if (!context.value) return
  uni.setClipboardData({ data: context.value.activeSpace.code, success: () => uni.showToast({ title: '空间码已复制', icon: 'none' }) })
}
function refreshCode() {
  uni.showModal({ title: '刷新空间码', content: '刷新后旧空间码将无法使用，是否继续？', confirmColor: '#df7772', success: async result => {
    if (!result.confirm) return
    try { const data = await regenerateSpaceCode(); if (context.value) context.value.activeSpace.code = data.code; uni.showToast({ title: '已刷新', icon: 'success' }) }
    catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '刷新失败', icon: 'none' }) }
  } })
}
async function switchTo(spaceId: string) {
  if (!context.value || context.value.activeSpace._id === spaceId) return
  loading.value = true
  try { context.value = await switchActiveSpace(spaceId); uni.showToast({ title: '已切换空间', icon: 'success' }) }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '切换失败', icon: 'none' }) }
  finally { loading.value = false }
}
function confirmUnbind() {
  uni.showModal({ title: '解除情侣关系', content: '解绑后双方将回到各自空间。公共内容会按创建者拆分，且转为仅自己可见。', confirmText: '继续解绑', confirmColor: '#c85f5d', success: first => {
    if (!first.confirm) return
    uni.showModal({ title: '再次确认', content: '此操作会立即生效，确定解除当前情侣关系吗？', confirmText: '确认解除', confirmColor: '#c85f5d', success: async second => {
      if (!second.confirm) return
      loading.value = true
      try { context.value = await unbindSpace(); uni.showToast({ title: '已解除关系', icon: 'success' }) }
      catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '解绑失败', icon: 'none' }) }
      finally { loading.value = false }
    } })
  } })
}
</script>

<style scoped lang="scss">
.page { box-sizing: border-box; min-height: 100vh; padding: 0 34rpx calc(env(safe-area-inset-bottom) + 40rpx); background: linear-gradient(180deg, #f5ddd5 0%, #faeee7 24%, #fcf7f1 100%); color: #5b493f; }
.nav { position: relative; height: calc(var(--menu-top) + var(--menu-height) + 30rpx); }
.back { position: absolute; top: var(--menu-top); left: 0; display: flex; width: 58rpx; height: var(--menu-height); align-items: center; }
.title { position: absolute; top: var(--menu-top); right: 180rpx; left: 80rpx; font-size: 32rpx; font-weight: 600; line-height: var(--menu-height); text-align: center; }
.content { padding-top: 16rpx; }
.space-card, .section { border: 1rpx solid rgba(255,255,255,.92); border-radius: 28rpx; background: rgba(252,247,241,.91); box-shadow: 0 14rpx 34rpx rgba(103,73,54,.08); }
.space-card { padding: 34rpx 28rpx 30rpx; text-align: center; }
.space-name { display: block; font-size: 32rpx; font-weight: 600; }
.space-state { display: block; margin-top: 8rpx; color: #9d897d; font-size: 21rpx; }
.members { display: flex; align-items: flex-start; justify-content: space-around; margin-top: 30rpx; }
.member { display: flex; width: 180rpx; flex-direction: column; align-items: center; }
.avatar { display: flex; width: 102rpx; height: 102rpx; align-items: center; justify-content: center; overflow: hidden; border: 4rpx solid #fff; border-radius: 50%; background: #f8e8df; box-shadow: 0 0 0 2rpx rgba(216,122,116,.25); }
.invite-avatar { border-style: dashed; background: #fff9f5; }
.member-name { max-width: 180rpx; margin-top: 14rpx; overflow: hidden; font-size: 24rpx; text-overflow: ellipsis; white-space: nowrap; }
.invite-text, .code { color: #d77873; }
.role { margin-top: 5rpx; color: #aa998e; font-size: 19rpx; }
.section { margin-top: 20rpx; padding: 0 26rpx; }
.row, .space-row { position: relative; display: flex; min-height: 104rpx; align-items: center; justify-content: space-between; }
.divided::before, .space-row + .space-row::before { position: absolute; top: 0; right: 0; left: 0; height: 1rpx; background: rgba(226,216,208,.65); content: ''; }
.label, .hint { display: block; }
.label { font-size: 25rpx; }
.hint { margin-top: 6rpx; color: #a79589; font-size: 19rpx; }
.row-right { display: flex; align-items: center; gap: 10rpx; }
.code { font-family: Georgia, serif; font-size: 32rpx; font-weight: 600; letter-spacing: 8rpx; }
.section-title { display: block; padding-top: 24rpx; color: #a28d81; font-size: 20rpx; }
.danger { width: 100%; height: 76rpx; margin-top: 28rpx; border: 1rpx solid rgba(200,95,93,.45); border-radius: 38rpx; background: transparent; color: #c85f5d; font-size: 25rpx; line-height: 74rpx; }
.danger::after { border: 0; }
.danger-tip { display: block; margin: 15rpx 24rpx 0; color: #aa998e; font-size: 19rpx; line-height: 1.55; text-align: center; }
</style>
