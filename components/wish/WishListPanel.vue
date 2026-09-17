<template>
  <view class="wish-panel">
    <view class="wish-hero">
      <view>
        <text class="wish-title">心愿清单</text>
        <text class="wish-subtitle">{{ activeView === 'mine' ? '把突然想到的浪漫，轻轻记下来' : '先收藏一点小灵感，再慢慢变成现实' }}</text>
      </view>
      <image class="hero-flower" :src="flowerSprig" mode="aspectFit" />
    </view>

    <view class="view-tabs">
      <view class="view-tab" :class="{ active: activeView === 'mine' }" @tap="activeView = 'mine'">
        <text>我的心愿</text>
      </view>
      <view class="view-tab" :class="{ active: activeView === 'library' }" @tap="activeView = 'library'">
        <text>心愿灵感库</text>
      </view>
    </view>

    <scroll-view class="wish-scroll" scroll-y :show-scrollbar="false" enhanced>
      <view v-if="activeView === 'mine'" class="mine-content">
        <view v-if="!loading && !records.length" class="empty-card">
          <image class="empty-art" :src="emptyArt" mode="aspectFit" />
          <text class="empty-copy">从灵感库收藏一个，或创建只属于你们的心愿</text>
          <button class="empty-action" @tap="openCreate">写下第一个心愿</button>
        </view>

        <view v-for="item in records" :key="item.id" class="wish-card" :class="{ completed: item.completed }" @tap="openActions(item)">
          <image class="wish-cover" :src="item.cover || defaultCover" mode="aspectFill" />
          <view class="wish-copy">
            <text class="card-title">{{ item.title }}</text>
            <text class="card-description">{{ item.description || '把期待留给未来的某一天' }}</text>
            <view class="status-pill">
              <uni-icons :type="item.completed ? 'checkbox-filled' : item.source === 'template' ? 'heart-filled' : 'compose'" size="14" color="#e47472" />
              <text>{{ item.completed ? '已完成' : item.source === 'template' ? '已收藏' : '自建心愿' }}</text>
            </view>
          </view>
          <view class="more-action" @tap.stop="openActions(item)">
            <uni-icons type="more-filled" size="22" color="#9b8d86" />
          </view>
        </view>
        <view class="list-space" />
      </view>

      <view v-else class="library-content">
        <view v-for="template in WISH_TEMPLATES" :key="template.id" class="template-card">
          <image class="template-cover" :src="template.cover" mode="aspectFill" />
          <view class="template-copy">
            <text class="template-title">{{ template.title }}</text>
            <text class="template-description">{{ template.description }}</text>
          </view>
          <button
            class="collect-button"
            :class="{ collected: collectedIds.has(template.id) }"
            :disabled="saving || collectedIds.has(template.id)"
            @tap="collectTemplate(template)"
          >
            <uni-icons :type="collectedIds.has(template.id) ? 'checkmarkempty' : 'plus'" size="18" color="#eb6f70" />
            <text>{{ collectedIds.has(template.id) ? '已收藏' : '收藏' }}</text>
          </button>
        </view>
        <view class="list-space" />
      </view>
    </scroll-view>

    <view v-if="activeView === 'mine'" class="add-fab" @tap="openCreate">
      <uni-icons type="plus" size="30" color="#ffffff" />
      <text class="add-fab-label">新增</text>
    </view>

    <image
      class="bottom-bouquet"
      src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/timeline/timeline-bottom-bouquet.png"
      mode="aspectFit"
    />

    <view v-if="loading" class="loading-state">
      <LoveLoading size="mini" text="正在加载心愿" :mask="false" />
    </view>

    <view v-if="showEditor" class="sheet-mask" @tap="closeEditor">
      <view class="editor-sheet" @tap.stop>
        <view class="sheet-handle" />
        <view class="sheet-heading">
          <text class="sheet-title">{{ editingId ? '编辑心愿' : '写下新心愿' }}</text>
          <view class="sheet-close" @tap="closeEditor"><uni-icons type="closeempty" size="24" color="#796a61" /></view>
        </view>
        <input v-model="form.title" class="wish-input" maxlength="30" placeholder="想一起完成什么？" placeholder-class="input-placeholder" />
        <textarea v-model="form.description" class="wish-textarea" maxlength="100" placeholder="写下一句期待…" placeholder-class="input-placeholder" />
        <text class="cover-label">选择封面</text>
        <scroll-view class="cover-scroll" scroll-x :show-scrollbar="false" enhanced>
          <view class="cover-row">
            <view
              v-for="coverOption in customCovers"
              :key="coverOption"
              class="cover-cell"
              :class="{ active: form.cover === coverOption }"
              @tap="form.cover = coverOption"
            >
              <image class="cover-option" :src="coverOption" mode="aspectFill" />
            </view>
          </view>
        </scroll-view>
        <button class="save-button" :disabled="saving || !form.title.trim()" @tap="submitEditor">
          {{ saving ? '保存中…' : '保存心愿' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { WISH_COVER_URLS, WISH_TEMPLATES, type WishTemplate } from '@/constants/wish-templates'
import { getWishJournal, saveWish, type WishItem } from '@/services/wish'

const flowerSprig = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/botanical-sprig.png'
const defaultCover = WISH_COVER_URLS[0]
const emptyArt = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/wish/empty.png'
const customCovers = WISH_COVER_URLS

const activeView = ref<'mine' | 'library'>('mine')
const records = ref<WishItem[]>([])
const revision = ref(0)
const loading = ref(true)
const saving = ref(false)
const showEditor = ref(false)
const editingId = ref('')
const form = reactive({ title: '', description: '', cover: defaultCover })

const collectedIds = computed(() => new Set(records.value.map(item => item.templateId).filter(Boolean)))

function makeId() {
  return `wish_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

async function loadData(showError = true) {
  loading.value = true
  try {
    const journal = await getWishJournal()
    revision.value = journal.revision
    records.value = journal.records
  } catch (error) {
    if (showError) uni.showToast({ title: error instanceof Error ? error.message : '心愿加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function persist(params: Parameters<typeof saveWish>[0], successText: string) {
  if (saving.value) return false
  saving.value = true
  try {
    const journal = await saveWish(params)
    revision.value = journal.revision
    records.value = journal.records
    uni.showToast({ title: successText, icon: 'success' })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败'
    uni.showToast({ title: message, icon: 'none' })
    if (message.includes('刷新')) await loadData(false)
    return false
  } finally {
    saving.value = false
  }
}

async function collectTemplate(template: WishTemplate) {
  if (collectedIds.value.has(template.id)) return
  await persist({
    revision: revision.value,
    id: makeId(),
    title: template.title,
    description: template.description,
    cover: template.cover,
    source: 'template',
    templateId: template.id,
    completed: false
  }, '已加入心愿')
}

function openCreate() {
  editingId.value = ''
  form.title = ''
  form.description = ''
  form.cover = defaultCover
  showEditor.value = true
}

function openEdit(item: WishItem) {
  editingId.value = item.id
  form.title = item.title
  form.description = item.description
  form.cover = item.cover || defaultCover
  showEditor.value = true
}

function closeEditor() {
  if (!saving.value) showEditor.value = false
}

async function submitEditor() {
  const title = form.title.trim()
  if (!title) return
  const existing = records.value.find(item => item.id === editingId.value)
  const ok = await persist({
    revision: revision.value,
    id: editingId.value || makeId(),
    title,
    description: form.description.trim(),
    cover: form.cover,
    source: existing?.source || 'custom',
    templateId: existing?.templateId || null,
    completed: existing?.completed || false
  }, editingId.value ? '心愿已更新' : '心愿已保存')
  if (ok) showEditor.value = false
}

function openActions(item: WishItem) {
  uni.showActionSheet({
    itemList: [item.completed ? '标记为未完成' : '标记为已完成', '编辑心愿', '删除心愿'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) void toggleComplete(item)
      if (tapIndex === 1) openEdit(item)
      if (tapIndex === 2) confirmRemove(item)
    }
  })
}

async function toggleComplete(item: WishItem) {
  await persist({ revision: revision.value, id: item.id, completed: !item.completed }, item.completed ? '已恢复心愿' : '心愿完成啦')
}

function confirmRemove(item: WishItem) {
  uni.showModal({
    title: '删除这个心愿？',
    content: '删除后将无法恢复。',
    confirmText: '删除',
    confirmColor: '#db7470',
    success: result => {
      if (result.confirm) void persist({ revision: revision.value, id: item.id, remove: true }, '已删除')
    }
  })
}

onMounted(() => void loadData())
</script>

<style scoped lang="scss">
.wish-panel {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.wish-hero {
  position: relative;
  z-index: 2;
  display: flex;
  height: 146rpx;
  flex: none;
  align-items: flex-start;
  padding: 16rpx 42rpx 0;
}
.wish-title { display: block; color: #38291f; font-size: 48rpx; font-weight: 700; line-height: 1.3; }
.wish-subtitle { display: block; margin-top: 10rpx; color: #94877d; font-size: 25rpx; }
.hero-flower { position: absolute; top: -6rpx; right: 12rpx; width: 184rpx; height: 184rpx; opacity: 0.82; transform: rotate(-15deg); }

.view-tabs {
  position: relative;
  z-index: 2;
  display: flex;
  height: 78rpx;
  flex: none;
  gap: 14rpx;
  padding: 0 40rpx;
}
.view-tab {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 40rpx;
  background: rgba(255, 253, 249, 0.84);
  box-shadow: 0 10rpx 25rpx rgba(97, 66, 45, 0.06);
  color: #665850;
  font-size: 28rpx;
  font-weight: 600;
}
.view-tab.active { background: #fdf0ed; color: #e45f64; }

.wish-scroll { position: relative; z-index: 2; min-height: 0; flex: 1; }
.mine-content { padding: 22rpx 36rpx 0; }
.library-content { padding: 22rpx 36rpx 0; }

.wish-card, .template-card, .empty-card {
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 28rpx;
  background: rgba(252, 247, 241, 0.9);
  box-shadow: 0 12rpx 30rpx rgba(103, 73, 54, 0.08);
}
.wish-card, .template-card {
  position: relative;
  display: flex;
  min-height: 174rpx;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 16rpx;
}
.wish-card.completed { opacity: 0.7; }
.wish-card.completed .card-title { text-decoration: line-through; }
.wish-cover, .template-cover { width: 146rpx; height: 142rpx; flex: none; border-radius: 20rpx; }
.wish-copy, .template-copy { min-width: 0; flex: 1; padding: 0 20rpx; }
.card-title, .template-title { display: block; color: #4c3a31; font-size: 28rpx; font-weight: 600; line-height: 1.35; }
.card-description, .template-description {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 10rpx;
  color: #918177;
  font-size: 23rpx;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.status-pill {
  display: inline-flex;
  height: 45rpx;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  padding: 0 17rpx;
  border-radius: 24rpx;
  background: #fdeceb;
  color: #e16f6d;
  font-size: 21rpx;
}
.more-action { position: absolute; top: 16rpx; right: 20rpx; display: flex; width: 48rpx; height: 42rpx; align-items: center; justify-content: center; }
.template-copy { padding-right: 8rpx; }
.collect-button {
  display: flex;
  width: 116rpx;
  height: 58rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 5rpx;
  margin: 0 4rpx 0 6rpx;
  padding: 0;
  border-radius: 30rpx;
  background: #fdebea;
  color: #e7686c;
  font-size: 23rpx;
  line-height: 58rpx;
}
.collect-button::after { border: 0; }
.collect-button.collected { opacity: 0.68; }

.empty-card { display: flex; flex-direction: column; align-items: center; padding: 36rpx 32rpx 40rpx; text-align: center; }
.empty-art { width: 300rpx; height: 245rpx; }
.empty-copy { max-width: 480rpx; margin-top: 4rpx; color: #8d7a6f; font-size: 26rpx; line-height: 1.6; }
.empty-action {
  display: flex;
  height: 70rpx;
  align-items: center;
  justify-content: center;
  margin-top: 24rpx;
  padding: 0 36rpx;
  border-radius: 36rpx;
  background: #df7471;
  color: #fff;
  font-size: 25rpx;
  line-height: 70rpx;
}
.empty-action::after { border: 0; }
.list-space { height: 150rpx; }

.add-fab {
  position: absolute;
  right: 46rpx;
  bottom: 46rpx;
  z-index: 8;
  display: flex;
  height: 92rpx;
  align-items: center;
  gap: 10rpx;
  padding: 0 30rpx 0 26rpx;
  border-radius: 46rpx;
  background: linear-gradient(135deg, #f3918a 0%, #e6686b 100%);
  box-shadow: 0 16rpx 34rpx rgba(205, 90, 88, 0.28), inset 0 2rpx 6rpx rgba(255, 255, 255, 0.32);
  color: #fff;
  transition: transform 0.15s ease;
}
.add-fab:active { transform: scale(0.95); }
.add-fab-label { font-size: 26rpx; font-weight: 600; letter-spacing: 2rpx; }
.bottom-bouquet {
  position: absolute;
  bottom: -54rpx;
  left: -58rpx;
  z-index: 1;
  width: 260rpx;
  height: 220rpx;
  opacity: 0.32;
  pointer-events: none;
}
.loading-state { position: absolute; inset: 245rpx 0 0; z-index: 12; display: flex; align-items: center; justify-content: center; background: rgba(251, 247, 242, 0.6); }

.sheet-mask { position: fixed; inset: 0; z-index: 80; display: flex; align-items: flex-end; background: rgba(61, 47, 40, 0.38); }
.editor-sheet {
  width: 100%;
  padding: 16rpx 34rpx calc(env(safe-area-inset-bottom) + 28rpx);
  border-radius: 38rpx 38rpx 0 0;
  background: #fcf7f1;
  box-shadow: 0 -18rpx 54rpx rgba(65, 44, 31, 0.16);
}
.sheet-handle { width: 68rpx; height: 7rpx; margin: 0 auto 20rpx; border-radius: 4rpx; background: #ddd2ca; }
.sheet-heading { display: flex; align-items: center; justify-content: space-between; }
.sheet-title { color: #514137; font-size: 31rpx; font-weight: 600; }
.sheet-close { display: flex; width: 54rpx; height: 54rpx; align-items: center; justify-content: center; }
.wish-input, .wish-textarea {
  width: 100%;
  margin-top: 20rpx;
  border: 1rpx solid rgba(222, 205, 192, 0.56);
  border-radius: 22rpx;
  background: rgba(255, 253, 249, 0.9);
  color: #57463c;
  font-size: 27rpx;
}
.wish-input { height: 82rpx; padding: 0 24rpx; }
.wish-textarea { height: 150rpx; padding: 20rpx 24rpx; line-height: 1.55; }
.input-placeholder { color: #ac9d92; }
.cover-label { display: block; margin-top: 22rpx; color: #66554b; font-size: 24rpx; font-weight: 600; }
.cover-scroll { width: 100%; margin-top: 14rpx; white-space: nowrap; }
.cover-row { display: inline-flex; gap: 14rpx; padding: 3rpx; }
/* 选中态包一层外框，避免 border 增减导致图片抖动 */
.cover-cell { flex: none; padding: 5rpx; border: 3rpx solid transparent; border-radius: 20rpx; }
.cover-cell.active { border-color: #df7471; background: rgba(223, 116, 113, 0.08); }
.cover-option { display: block; width: 108rpx; height: 94rpx; border-radius: 15rpx; }
.save-button {
  display: flex;
  width: 450rpx;
  height: 82rpx;
  align-items: center;
  justify-content: center;
  margin: 28rpx auto 0;
  border-radius: 42rpx;
  background: #df7471;
  color: #fff;
  font-size: 28rpx;
  line-height: 82rpx;
}
.save-button::after { border: 0; }
.save-button[disabled] { background: #e9aaa5; color: #fff; opacity: 1; }
</style>
