<template>
  <view class="preference-panel">
    <view class="preference-hero">
      <view>
        <text class="preference-title">偏好备忘</text>
        <text class="preference-subtitle">那些 TA 随口提过的小事，也值得记住</text>
      </view>
      <image class="hero-flower" :src="flowerSprig" mode="aspectFit" />
    </view>

    <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false" enhanced>
      <view class="filter-row">
        <view
          v-for="option in filterOptions"
          :key="option.value"
          class="filter-chip"
          :class="{ active: activeFilter === option.value }"
          @tap="activeFilter = option.value"
        >
          {{ option.label }}
        </view>
      </view>
    </scroll-view>

    <scroll-view class="memo-scroll" scroll-y :show-scrollbar="false" enhanced>
      <view class="memo-content">
        <view v-if="!loading && !records.length" class="empty-card">
          <image class="empty-art" src="/static/preference/empty.png" mode="aspectFit" />
          <text class="empty-title">还没有偏好备忘</text>
          <text class="empty-copy">把 TA 喜欢的、在意的，慢慢记在这里</text>
          <button class="empty-action" @tap="openCreate">记下第一件小事</button>
        </view>

        <view v-else-if="!loading && !visibleRecords.length" class="empty-filter">
          <image class="empty-filter-art" src="/static/preference/empty.png" mode="aspectFit" />
          <text>这个分类还没有记录</text>
        </view>

        <view v-for="item in visibleRecords" :key="item.id" class="memo-card" @tap="openEdit(item)">
          <view class="category-icon" :class="item.category">
            <uni-icons :type="categoryMap[item.category].icon" size="21" :color="categoryMap[item.category].color" />
          </view>
          <view class="memo-copy">
            <text class="memo-title">{{ item.title }}</text>
            <view class="memo-tags">
              <text class="category-pill" :class="item.category">{{ categoryMap[item.category].label }}</text>
              <text v-if="item.tag" class="tag-pill">{{ item.tag }}</text>
            </view>
            <text v-if="item.note" class="memo-note">{{ item.note }}</text>
          </view>
          <uni-icons type="right" size="21" color="#a99b92" />
        </view>

        <view v-if="records.length" class="footer-note">
          <uni-icons type="heart-filled" size="13" color="#e79b97" />
          <view class="footer-copy">
            <view class="footer-line" />
            <text>用心记录，收藏关于 TA 的每一个小细节</text>
            <view class="footer-line" />
          </view>
        </view>
        <view class="list-space" />
      </view>
    </scroll-view>

    <view class="add-fab" @tap="openCreate">
      <uni-icons type="plus" size="30" color="#ffffff" />
      <text class="add-fab-label">新增</text>
    </view>

    <image
      class="bottom-bouquet"
      src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/timeline/timeline-bottom-bouquet.png"
      mode="aspectFit"
    />

    <view v-if="loading" class="loading-state">
      <LoveLoading size="mini" text="正在加载备忘" :mask="false" />
    </view>

    <view v-if="showEditor" class="sheet-mask" @tap="closeEditor">
      <view class="editor-sheet" @tap.stop>
        <view class="sheet-handle" />
        <view class="sheet-heading">
          <text class="sheet-title">{{ editingId ? '编辑偏好' : '新增偏好' }}</text>
          <view class="sheet-close" @tap="closeEditor"><uni-icons type="closeempty" size="24" color="#796a61" /></view>
        </view>

        <text class="field-label">分类</text>
        <view class="category-options">
          <view
            v-for="option in categoryOptions"
            :key="option.value"
            class="category-option"
            :class="{ active: form.category === option.value }"
            @tap="selectCategory(option.value)"
          >
            {{ option.label }}
          </view>
        </view>

        <input v-model="form.title" class="memo-input" maxlength="30" placeholder="例如：喜欢郁金香" placeholder-class="input-placeholder" />
        <input v-model="form.tag" class="memo-input" maxlength="16" placeholder="标签，例如：礼物喜好（选填）" placeholder-class="input-placeholder" />
        <textarea v-model="form.note" class="memo-textarea" maxlength="100" placeholder="补充一点容易忘记的细节…" placeholder-class="input-placeholder" />

        <view class="sheet-actions">
          <button v-if="editingId" class="delete-button" :disabled="saving" @tap="confirmRemove">删除</button>
          <button class="save-button" :disabled="saving || !form.title.trim()" @tap="submitEditor">
            {{ saving ? '保存中…' : '保存备忘' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import LoveLoading from '@/components/base/LoveLoading.vue'
import {
  getPreferenceJournal,
  savePreference,
  type PreferenceCategory,
  type PreferenceMemo
} from '@/services/preference'

type PreferenceFilter = 'all' | PreferenceCategory

const flowerSprig = 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/botanical-sprig.png'
const filterOptions: Array<{ value: PreferenceFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'like', label: '喜欢' },
  { value: 'dislike', label: '不喜欢' },
  { value: 'habit', label: '小习惯' },
  { value: 'remember', label: '要记住' }
]
const categoryOptions = filterOptions.slice(1) as Array<{ value: PreferenceCategory; label: string }>
const categoryMap: Record<PreferenceCategory, { label: string; icon: string; color: string }> = {
  like: { label: '喜欢', icon: 'heart-filled', color: '#e78484' },
  dislike: { label: '不喜欢', icon: 'minus-filled', color: '#8ba47f' },
  habit: { label: '小习惯', icon: 'flag-filled', color: '#d4a35d' },
  remember: { label: '要记住', icon: 'notification-filled', color: '#df7f82' }
}

const records = ref<PreferenceMemo[]>([])
const revision = ref(0)
const activeFilter = ref<PreferenceFilter>('all')
const loading = ref(true)
const saving = ref(false)
const showEditor = ref(false)
const editingId = ref('')
const form = reactive<{ title: string; category: PreferenceCategory; tag: string; note: string }>({
  title: '',
  category: 'like',
  tag: '',
  note: ''
})

const visibleRecords = computed(() => activeFilter.value === 'all'
  ? records.value
  : records.value.filter(item => item.category === activeFilter.value))

function makeId() {
  return `pref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

async function loadData(showError = true) {
  loading.value = true
  try {
    const journal = await getPreferenceJournal()
    revision.value = journal.revision
    records.value = journal.records
  } catch (error) {
    if (showError) uni.showToast({ title: error instanceof Error ? error.message : '偏好加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function persist(params: Parameters<typeof savePreference>[0], successText: string) {
  if (saving.value) return false
  saving.value = true
  try {
    const journal = await savePreference(params)
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

function selectCategory(category: PreferenceCategory) {
  form.category = category
}

function openCreate() {
  editingId.value = ''
  form.title = ''
  form.category = activeFilter.value === 'all' ? 'like' : activeFilter.value
  form.tag = ''
  form.note = ''
  showEditor.value = true
}

function openEdit(item: PreferenceMemo) {
  editingId.value = item.id
  form.title = item.title
  form.category = item.category
  form.tag = item.tag
  form.note = item.note
  showEditor.value = true
}

function closeEditor() {
  if (!saving.value) showEditor.value = false
}

async function submitEditor() {
  if (!form.title.trim()) return
  const ok = await persist({
    revision: revision.value,
    id: editingId.value || makeId(),
    title: form.title.trim(),
    category: form.category,
    tag: form.tag.trim(),
    note: form.note.trim()
  }, editingId.value ? '备忘已更新' : '备忘已保存')
  if (ok) showEditor.value = false
}

function confirmRemove() {
  if (!editingId.value) return
  uni.showModal({
    title: '删除这条备忘？',
    content: '删除后将无法恢复。',
    confirmText: '删除',
    confirmColor: '#db7470',
    success: async result => {
      if (!result.confirm) return
      const ok = await persist({ revision: revision.value, id: editingId.value, remove: true }, '已删除')
      if (ok) showEditor.value = false
    }
  })
}

onMounted(() => void loadData())
</script>

<style scoped lang="scss">
.preference-panel {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}
.preference-hero {
  position: relative;
  z-index: 2;
  display: flex;
  height: 150rpx;
  flex: none;
  align-items: flex-start;
  padding: 16rpx 42rpx 0;
}
.preference-title { display: block; color: #38291f; font-size: 48rpx; font-weight: 700; line-height: 1.3; }
.preference-subtitle { display: block; margin-top: 10rpx; color: #94877d; font-size: 25rpx; }
.hero-flower { position: absolute; top: -6rpx; right: 12rpx; width: 184rpx; height: 184rpx; opacity: 0.82; transform: rotate(-15deg); }

.filter-scroll { position: relative; z-index: 2; width: 100%; height: 68rpx; flex: none; white-space: nowrap; }
.filter-row { display: inline-flex; gap: 12rpx; padding: 2rpx 36rpx 8rpx; }
.filter-chip {
  display: flex;
  min-width: 112rpx;
  height: 58rpx;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  border-radius: 30rpx;
  background: rgba(255, 253, 249, 0.88);
  box-shadow: 0 7rpx 18rpx rgba(97, 66, 45, 0.05);
  color: #675951;
  font-size: 24rpx;
}
.filter-chip.active { background: #fdeceb; color: #db6264; font-weight: 600; }

.memo-scroll { position: relative; z-index: 2; min-height: 0; flex: 1; }
.memo-content { padding: 20rpx 36rpx 0; }
.memo-card, .empty-card {
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 28rpx;
  background: rgba(252, 247, 241, 0.9);
  box-shadow: 0 12rpx 30rpx rgba(103, 73, 54, 0.08);
}
.memo-card {
  display: flex;
  min-height: 154rpx;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 16rpx;
  padding: 20rpx 24rpx;
}
.category-icon {
  display: flex;
  width: 60rpx;
  height: 60rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fcedeb;
}
.category-icon.dislike { background: #edf1e9; }
.category-icon.habit { background: #fff4df; }
.category-icon.remember { background: #fcedeb; }
.memo-copy { min-width: 0; flex: 1; }
.memo-title { display: block; color: #4c3a31; font-size: 29rpx; font-weight: 600; line-height: 1.35; }
.memo-tags { display: flex; gap: 10rpx; margin-top: 9rpx; }
.category-pill, .tag-pill {
  display: inline-flex;
  height: 40rpx;
  align-items: center;
  padding: 0 18rpx;
  border-radius: 22rpx;
  background: #fdebea;
  color: #d96e6e;
  font-size: 20rpx;
}
.category-pill.dislike { background: #edf1e9; color: #718568; }
.category-pill.habit { background: #fff3df; color: #b78643; }
.tag-pill { background: #f5eee9; color: #8f7b70; }
.memo-note {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 9rpx;
  color: #918177;
  font-size: 22rpx;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.empty-card { display: flex; flex-direction: column; align-items: center; padding: 34rpx 28rpx 40rpx; text-align: center; }
.empty-art { width: 390rpx; height: 265rpx; }
.empty-title { color: #554238; font-size: 30rpx; font-weight: 600; }
.empty-copy { margin-top: 10rpx; color: #8d7a6f; font-size: 24rpx; }
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
.empty-filter { display: flex; flex-direction: column; align-items: center; padding-top: 70rpx; color: #94877d; font-size: 24rpx; }
.empty-filter-art { width: 310rpx; height: 210rpx; margin-bottom: 12rpx; }

.footer-note { display: flex; flex-direction: column; align-items: center; gap: 8rpx; margin-top: 28rpx; color: #9b8a7f; }
.footer-copy { display: flex; align-items: center; gap: 14rpx; font-size: 21rpx; white-space: nowrap; }
.footer-line { width: 42rpx; height: 1rpx; background: #e5d8ce; }
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
}
.add-fab:active { transform: scale(0.95); }
.add-fab-label { font-size: 26rpx; font-weight: 600; letter-spacing: 2rpx; }
.bottom-bouquet { position: absolute; bottom: -54rpx; left: -58rpx; z-index: 1; width: 260rpx; height: 220rpx; opacity: 0.32; pointer-events: none; }
.loading-state { position: absolute; inset: 220rpx 0 0; z-index: 12; display: flex; align-items: center; justify-content: center; background: rgba(251, 247, 242, 0.6); }

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
.field-label { display: block; margin-top: 16rpx; color: #66554b; font-size: 24rpx; font-weight: 600; }
.category-options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10rpx; margin-top: 12rpx; }
.category-option {
  display: flex;
  height: 58rpx;
  align-items: center;
  justify-content: center;
  border-radius: 30rpx;
  background: #f4ece6;
  color: #78675d;
  font-size: 22rpx;
}
.category-option.active { background: #fdebea; color: #da6568; font-weight: 600; }
.memo-input, .memo-textarea {
  width: 100%;
  margin-top: 18rpx;
  border: 1rpx solid rgba(222, 205, 192, 0.56);
  border-radius: 22rpx;
  background: rgba(255, 253, 249, 0.9);
  color: #57463c;
  font-size: 26rpx;
}
.memo-input { height: 78rpx; padding: 0 24rpx; }
.memo-textarea { height: 130rpx; padding: 18rpx 24rpx; line-height: 1.5; }
.input-placeholder { color: #ac9d92; }
.sheet-actions { display: flex; gap: 18rpx; margin-top: 26rpx; }
.save-button, .delete-button {
  display: flex;
  height: 80rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  margin: 0;
  border-radius: 42rpx;
  font-size: 27rpx;
  line-height: 80rpx;
}
.save-button { background: #df7471; color: #fff; }
.delete-button { max-width: 180rpx; background: #f2e9e3; color: #9a756d; }
.save-button::after, .delete-button::after { border: 0; }
.save-button[disabled] { background: #e9aaa5; color: #fff; opacity: 1; }
</style>
