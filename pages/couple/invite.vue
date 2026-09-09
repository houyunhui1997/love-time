<template>
  <view class="page" :style="pageStyle">
    <view class="nav"><view class="back" @tap="goBack"><uni-icons type="left" size="28" color="#59483e" /></view><text class="title">{{ token ? '接受邀请' : '邀请另一半' }}</text></view>
    <view class="hero"><view class="heart"><uni-icons type="heart-filled" size="42" color="#df7772" /></view><text class="hero-title">{{ token ? '一起收藏重要的日子' : '把恋时光分享给另一半' }}</text><text class="hero-copy">{{ token ? '加入后即可查看双方公开的纪念日与时光' : '可以发送邀请，也可以让对方输入空间码' }}</text></view>

    <view v-if="invitePreview" class="card">
      <text class="muted">邀请你加入</text><text class="card-title">{{ invitePreview.name }}</text>
      <view class="owner"><image v-if="invitePreview.owner?.avatarFileId" class="avatar" :src="invitePreview.owner.avatarFileId" mode="aspectFill" /><view v-else class="avatar fallback"><uni-icons type="person-filled" size="26" color="#d77873" /></view><text>{{ invitePreview.owner?.nickname || '恋时光用户' }}</text></view>
      <button class="primary" @tap="acceptInvite">加入这个空间</button>
    </view>

    <template v-else-if="context">
      <view v-if="!context.activeSpace.isCouple && context.activeSpace.isOwned" class="card">
        <text class="card-title">我的空间码</text>
        <view class="code-line" @tap="copyCode"><text v-for="(char,index) in context.activeSpace.code.split('')" :key="index" class="code-char">{{ char }}</text></view>
        <text class="muted">点击复制，空间码仅用于加入你的空间</text>
        <button class="primary" open-type="share">发送微信邀请</button>
      </view>
      <view v-if="!context.activeSpace.isCouple" class="card">
        <text class="card-title">输入对方空间码</text>
        <input v-model="code" class="code-input" maxlength="4" placeholder="请输入4位空间码" placeholder-class="placeholder" @input="normalizeCode" />
        <button class="outline" :disabled="code.length !== 4" @tap="findSpace">查找并加入</button>
      </view>
      <view v-else class="card bound"><uni-icons type="checkmarkempty" size="34" color="#d77873" /><text class="card-title">你们已经在同一个空间</text><text class="muted">如需更换，请先在“情侣空间”中解除当前关系</text></view>
    </template>
    <LoveLoading :visible="loading" fullscreen text="正在准备空间" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { createSpaceInvite, getSpaceContext, getSpaceInvite, joinSpaceByCode, joinSpaceByInvite, previewSpaceCode, type SpaceContext, type SpacePreview } from '@/services/space'

const loading = ref(true), context = ref<SpaceContext | null>(null), invitePreview = ref<SpacePreview | null>(null)
const token = ref(''), code = ref(''), sharePath = ref('/pages/couple/invite')
const info = uni.getSystemInfoSync(); let top = Number(info.statusBarHeight || 20) + 6, height = 32
try { const rect = uni.getMenuButtonBoundingClientRect(); if (rect?.top && rect?.height) { top = rect.top; height = rect.height } } catch {}
const pageStyle = { '--menu-top': `${top}px`, '--menu-height': `${height}px` }

onLoad(async options => {
  token.value = typeof options?.token === 'string' ? options.token : ''
  try {
    if (token.value) invitePreview.value = await getSpaceInvite(token.value)
    else {
      context.value = await getSpaceContext()
      if (context.value.activeSpace.isOwned && !context.value.activeSpace.isCouple) {
        sharePath.value = (await createSpaceInvite()).path
      }
    }
  }
  catch (error) { toast(error, '空间读取失败') } finally { loading.value = false }
})
onShareAppMessage(() => ({ title: `邀请你加入${context.value?.activeSpace.name || '恋时光'}`, path: sharePath.value }))
function toast(error: unknown, fallback: string) { uni.showToast({ title: error instanceof Error ? error.message : fallback, icon: 'none' }) }
function goBack() { uni.navigateBack() }
function normalizeCode(event: any) { code.value = String(event?.detail?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) }
function copyCode() { if (context.value) uni.setClipboardData({ data: context.value.activeSpace.code, success: () => uni.showToast({ title: '空间码已复制', icon: 'none' }) }) }
async function findSpace() {
  if (code.value.length !== 4) return
  loading.value = true
  try {
    const preview = await previewSpaceCode(code.value)
    uni.showModal({ title: `加入“${preview.name}”`, content: `空间创建者：${preview.owner?.nickname || '恋时光用户'}。加入后无需对方再次确认。`, confirmText: '确认加入', confirmColor: '#df7772', success: async result => {
      if (!result.confirm) return
      loading.value = true
      try { await joinSpaceByCode(code.value); uni.showToast({ title: '加入成功', icon: 'success' }); setTimeout(() => uni.redirectTo({ url: '/pages/couple/space' }), 500) }
      catch (error) { toast(error, '加入失败') } finally { loading.value = false }
    } })
  } catch (error) { toast(error, '没有找到空间') } finally { loading.value = false }
}
async function acceptInvite() {
  loading.value = true
  try { await joinSpaceByInvite(token.value); uni.showToast({ title: '加入成功', icon: 'success' }); setTimeout(() => uni.redirectTo({ url: '/pages/couple/space' }), 500) }
  catch (error) { toast(error, '加入失败') } finally { loading.value = false }
}
</script>

<style scoped lang="scss">
.page { box-sizing: border-box; min-height: 100vh; padding: 0 34rpx calc(env(safe-area-inset-bottom) + 42rpx); background: linear-gradient(180deg,#f5ddd5 0%,#faeee7 25%,#fcf7f1 100%); color: #5b493f; }
.nav { position: relative; height: calc(var(--menu-top) + var(--menu-height) + 26rpx); }.back { position: absolute; top: var(--menu-top); left: 0; display: flex; height: var(--menu-height); align-items: center; }.title { position: absolute; top: var(--menu-top); right: 180rpx; left: 80rpx; font-size: 32rpx; font-weight: 600; line-height: var(--menu-height); text-align: center; }
.hero { display: flex; flex-direction: column; align-items: center; padding: 38rpx 10rpx 34rpx; }.heart { display: flex; width: 94rpx; height: 94rpx; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255,250,246,.86); box-shadow: 0 12rpx 28rpx rgba(111,75,57,.08); }.hero-title { margin-top: 22rpx; font-size: 30rpx; font-weight: 600; }.hero-copy { margin-top: 10rpx; color: #9f8c80; font-size: 21rpx; }
.card { margin-top: 18rpx; padding: 34rpx 30rpx; border: 1rpx solid rgba(255,255,255,.94); border-radius: 28rpx; background: rgba(252,247,241,.92); box-shadow: 0 14rpx 34rpx rgba(103,73,54,.08); text-align: center; }.card-title { display: block; font-size: 28rpx; font-weight: 600; }.muted { display: block; margin-top: 12rpx; color: #a18e82; font-size: 20rpx; }
.code-line { display: flex; justify-content: center; gap: 16rpx; margin: 28rpx 0 4rpx; }.code-char { display: flex; width: 74rpx; height: 82rpx; align-items: center; justify-content: center; border-radius: 18rpx; background: #fffaf6; color: #d86f6d; font-size: 42rpx; font-weight: 600; box-shadow: inset 0 0 0 1rpx #eedbd1; }
.primary,.outline { display: flex; height: 72rpx; align-items: center; justify-content: center; margin-top: 28rpx; border-radius: 38rpx; font-size: 25rpx; line-height: 72rpx; }.primary { background: linear-gradient(135deg,#ea817b,#da6968); color: #fff; }.outline { border: 1rpx solid #df7772; background: transparent; color: #d86f6d; }.primary::after,.outline::after { border: 0; }.outline[disabled] { opacity: .45; }
.code-input { height: 82rpx; margin-top: 24rpx; border: 1rpx solid #ecd9cf; border-radius: 18rpx; background: #fffaf6; color: #5b493f; font-size: 34rpx; letter-spacing: 16rpx; text-align: center; }.placeholder { color: #b4a49a; font-size: 24rpx; letter-spacing: 0; }.owner { display: flex; align-items: center; justify-content: center; gap: 14rpx; margin-top: 24rpx; font-size: 23rpx; }.avatar { width: 68rpx; height: 68rpx; border: 3rpx solid #fff; border-radius: 50%; }.fallback { display: flex; align-items: center; justify-content: center; background: #f8e8df; }.bound { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
</style>
