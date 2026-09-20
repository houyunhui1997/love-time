<template>
  <view class="page">
    <view class="nav" :style="navStyle"><text class="nav-title">情侣空间邀请</text></view>
    <view class="content">
      <view v-if="preview" class="invite-card">
        <view class="heart"><uni-icons type="heart-filled" size="34" color="#dc7972" /></view>
        <image class="avatar" :src="preview.owner.avatarFileId || fallbackAvatar" mode="aspectFill" />
        <text class="title">{{ preview.owner.nickname }} 邀请你加入</text>
        <text class="subtitle">加入对方的情侣空间</text>
        <view class="rules">
          <view class="rule"><uni-icons type="checkmarkempty" size="18" color="#d37a72" /><text>可以查看、新增和修改空间中的记录</text></view>
          <view class="rule"><uni-icons type="checkmarkempty" size="18" color="#d37a72" /><text>你自己的空间和对方空间互不混合</text></view>
          <view class="rule"><uni-icons type="checkmarkempty" size="18" color="#d37a72" /><text>在对方空间创建的内容归对方所有</text></view>
        </view>
        <button v-if="preview.available && !preview.joined" class="join-button" :loading="joining" :disabled="joining" @tap="join">确认加入</button>
        <button v-else-if="preview.joined" class="join-button" @tap="enter">进入对方空间</button>
        <view v-else class="unavailable">{{ preview.message || '当前无法加入这个空间' }}</view>
        <button class="back-button" @tap="backToMine">{{ preview.joined ? '返回恋时光' : '返回我的空间' }}</button>
      </view>
      <view v-else class="loading">正在读取邀请信息…</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getInvitePreview, joinSpace, switchToSpace, type InvitePreview } from '@/services/space'
import { getCurrentUserId } from '@/services/space-context'

const preview = ref<InvitePreview | null>(null)
const joining = ref(false)
const inviteCode = ref('')
const fallbackAvatar = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/profile/companion/default-avatar.png'
const systemInfo = uni.getSystemInfoSync()
const top = Number(systemInfo.statusBarHeight || 20)
const navStyle = computed(() => ({ paddingTop: `${top}px`, height: `${top + 44}px` }))

onLoad(async options => {
  inviteCode.value = typeof options?.code === 'string' ? decodeURIComponent(options.code) : ''
  try { preview.value = await getInvitePreview(inviteCode.value) }
  catch (error) {
    uni.showModal({ title: '无法打开邀请', content: error instanceof Error ? error.message : '邀请链接无效', showCancel: false, success: backToMine })
  }
})

async function join() {
  if (joining.value) return
  joining.value = true
  try { await joinSpace(inviteCode.value); uni.showToast({ title: '已加入空间', icon: 'success' }); setTimeout(enter, 500) }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '加入失败', icon: 'none' }) }
  finally { joining.value = false }
}
function enter() { if (preview.value) switchToSpace(preview.value.owner.uid); uni.switchTab({ url: '/pages/anniversary/index' }) }
function backToMine() {
  if (preview.value?.joined) switchToSpace(preview.value.owner.uid)
  else switchToSpace(getCurrentUserId())
  uni.switchTab({ url: '/pages/profile/index' })
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; color: #5d4638; background: radial-gradient(circle at 50% 22%, #fae7df 0, #fcf7f1 48%, #f9f2eb 100%); }
.nav { display: flex; box-sizing: border-box; align-items: flex-end; justify-content: center; padding-bottom: 11px; }
.nav-title { font-size: 31rpx; font-weight: 600; }
.content { padding: 70rpx 38rpx; }
.invite-card { position: relative; padding: 68rpx 34rpx 34rpx; border: 1rpx solid rgba(255,255,255,.88); border-radius: 34rpx; background: rgba(255,255,255,.58); box-shadow: 0 20rpx 60rpx rgba(105,75,58,.11); backdrop-filter: blur(20rpx); }
.heart { position: absolute; top: -34rpx; left: 50%; display: flex; width: 68rpx; height: 68rpx; align-items: center; justify-content: center; border-radius: 50%; background: #fff8f4; transform: translateX(-50%); box-shadow: 0 8rpx 24rpx rgba(188,111,102,.14); }
.avatar { display: block; width: 120rpx; height: 120rpx; margin: 0 auto; border: 5rpx solid rgba(255,255,255,.9); border-radius: 50%; background: #f0e3d9; }
.title, .subtitle { display: block; text-align: center; }
.title { margin-top: 22rpx; font-size: 32rpx; font-weight: 650; }
.subtitle { margin-top: 8rpx; color: #a08776; font-size: 22rpx; }
.rules { margin-top: 32rpx; padding: 24rpx; border-radius: 24rpx; background: rgba(246,232,223,.65); }
.rule { display: flex; align-items: flex-start; gap: 12rpx; color: #806758; font-size: 22rpx; line-height: 1.65; }
.rule + .rule { margin-top: 10rpx; }
.join-button { height: 82rpx; margin-top: 30rpx; border-radius: 42rpx; background: #df7a73; color: #fff; font-size: 27rpx; line-height: 82rpx; }
.join-button::after, .back-button::after { border: 0; }
.back-button { margin-top: 12rpx; background: transparent; color: #a68a79; font-size: 22rpx; }
.unavailable { margin-top: 30rpx; padding: 22rpx; border-radius: 22rpx; background: #f4e8df; color: #a26f67; font-size: 23rpx; text-align: center; }
.loading { color: #a08776; font-size: 24rpx; text-align: center; }
</style>
