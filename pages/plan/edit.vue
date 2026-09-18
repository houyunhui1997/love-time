<template>
  <view class="edit-page" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack"><uni-icons type="left" size="28" color="#514137" /></view>
      <view class="nav-copy">
        <text class="nav-title">{{ editingId ? '编辑约会计划' : '新增约会计划' }}</text>
        <text class="nav-subtitle">把一场期待的见面，轻轻安排好</text>
      </view>
      <!-- <view class="nav-save" @tap="submit">保存</view> -->
    </view>

    <scroll-view class="edit-scroll" scroll-y :show-scrollbar="false" enhanced>
      <view class="edit-content">
        <view class="section-card cover-section">
          <view class="section-title-row"><view class="section-mark" /><text>封面</text></view>
          <swiper
            class="cover-swiper"
            :current="coverIndex"
            :previous-margin="'0rpx'"
            :next-margin="'54rpx'"
            circular
            @change="changeCover"
          >
            <swiper-item v-for="cover in coverOptions" :key="cover.src" class="cover-slide">
              <view class="cover-slide-card" @tap="selectCover(cover.src)">
                <image class="cover-image" :src="cover.src" mode="aspectFill" />
                <view v-if="selectedCover === cover.src" class="cover-selected"><uni-icons type="checkmarkempty" size="18" color="#fff" /></view>
              </view>
            </swiper-item>
          </swiper>
          <scroll-view class="cover-thumbnails" scroll-x :show-scrollbar="false" enhanced>
            <view class="cover-thumbnail-row">
              <view
                v-for="(cover, index) in coverOptions"
                :key="cover.src"
                class="cover-thumbnail"
                :class="{ active: selectedCover === cover.src }"
                @tap="selectCover(cover.src, index)"
              >
                <image :src="cover.src" mode="aspectFill" />
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="section-card info-section">
          <view class="section-title-row"><view class="section-mark" /><text>基本信息</text></view>
          <image class="info-art" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/info-flower.png" mode="aspectFit" />
          <view class="field-row">
            <view class="field-icon"><uni-icons type="heart-filled" size="21" color="#ef7c85" /></view>
            <text class="field-label">约会名称</text>
            <input v-model="form.title" class="field-input" maxlength="30" placeholder="给这次见面取个名字（选填）" placeholder-class="input-placeholder" />
          </view>
          <picker mode="date" :value="form.date" @change="changeDate">
            <view class="field-row">
              <view class="field-icon"><uni-icons type="calendar" size="22" color="#ef7c85" /></view>
              <text class="field-label">开始日期</text>
              <text class="field-value" :class="{ placeholder: !form.date }">{{ form.date || '请选择开始日期' }}</text>
              <uni-icons type="right" size="18" color="#9f9188" />
            </view>
          </picker>
        </view>

        <view class="lists-grid">
          <view class="section-card list-section">
            <view class="list-heading">
              <view><view class="list-title"><uni-icons type="clock-filled" size="23" color="#ef7c85" /><text>今天的安排</text></view><text class="list-subtitle">记录想做的事就好</text></view>
              <image src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/today-arrangement-wood.png" mode="aspectFit" />
            </view>
            <view v-for="(item, index) in form.arrangements" :key="item.id" class="list-item">
              <view class="item-number">{{ index + 1 }}</view><text>{{ item.title }}</text>
              <view class="item-remove" @tap="removeArrangement(index)"><uni-icons type="closeempty" size="18" color="#a99b92" /></view>
            </view>
            <view class="add-row" @tap="addArrangement"><uni-icons type="plus" size="22" color="#df6c72" /><text>添加安排</text></view>
          </view>

          <view class="section-card list-section">
            <view class="list-heading">
              <view><view class="list-title"><uni-icons type="gift-filled" size="23" color="#ef7c85" /><text>小准备</text></view><text class="list-subtitle">让这次见面更顺利</text></view>
              <image src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/preparation-tulip.png" mode="aspectFit" />
            </view>
            <view v-for="(item, index) in form.preparations" :key="item.id" class="list-item">
              <view class="check-dot" :class="{ checked: item.completed }" @tap="item.completed = !item.completed">
                <uni-icons v-if="item.completed" type="checkmarkempty" size="17" color="#fff" />
              </view>
              <text>{{ item.title }}</text>
              <view class="item-remove" @tap="removePreparation(index)"><uni-icons type="closeempty" size="18" color="#a99b92" /></view>
            </view>
            <view class="add-row" @tap="addPreparation"><uni-icons type="plus" size="22" color="#df6c72" /><text>添加小准备</text></view>
          </view>
        </view>

        <button class="save-button" :disabled="saving || !form.date" @tap="submit">{{ saving ? '保存中…' : '保存计划' }}</button>
        <view class="footer-note"><view class="footer-line" /><text>认真准备的见面，也会被温柔记住</text><view class="footer-line" /></view>
      </view>
    </scroll-view>
    <view v-if="loading" class="loading-state"><LoveLoading size="mini" text="正在准备计划" :mask="false" /></view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import LoveLoading from '@/components/base/LoveLoading.vue'
import { getPlanJournal, savePlan, type PlanArrangement, type PlanPreparation } from '@/services/plan'

const coverOptions = [
  { name: '樱花湖畔', src: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/sakura-lake-sunset.png' },
  { name: '海边晚霞', src: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/seaside-sunset-dinner.png' },
  { name: '春日花门', src: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/spring-cafe-flower-gate.png' },
  { name: '湖畔下午茶', src: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/greenhouse-rose-tea.png' },
  { name: '金色秋日', src: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/autumn-lake-bench.png' },
  { name: '夕阳摩天轮', src: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/sunset-ferris-wheel.png' },
  { name: '月下晚宴', src: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/plan/moonlit-lake-dinner.png' }
]
const editingId = ref('')
const revision = ref(0)
const loading = ref(false)
const saving = ref(false)
const selectedCover = ref(coverOptions[0].src)
const form = reactive<{
  title: string
  date: string
  arrangements: PlanArrangement[]
  preparations: PlanPreparation[]
}>({ title: '', date: '', arrangements: [], preparations: [] })
const coverIndex = computed(() => Math.max(0, coverOptions.findIndex(item => item.src === selectedCover.value)))

const systemInfo = uni.getSystemInfoSync()
function getNavigationMetrics() {
  const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.top && menuButton?.height) return { top: menuButton.top, height: menuButton.height }
  } catch { /* 使用回退值 */ }
  return { top: fallbackTop, height: 32 }
}
const navigationMetrics = getNavigationMetrics()
const pageStyle = { '--menu-top': `${navigationMetrics.top}px`, '--menu-height': `${navigationMetrics.height}px` }

onLoad(query => {
  editingId.value = typeof query?.id === 'string' ? query.id : ''
  if (!editingId.value && typeof query?.title === 'string') form.title = decodeURIComponent(query.title).slice(0, 30)
  void loadData()
})

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

async function loadData() {
  loading.value = true
  try {
    const journal = await getPlanJournal()
    revision.value = journal.revision
    if (!editingId.value) return
    const current = journal.records.find(item => item.id === editingId.value)
    if (!current) {
      uni.showToast({ title: '计划不存在', icon: 'none' })
      setTimeout(goBack, 800)
      return
    }
    form.title = current.title
    form.date = current.date
    selectedCover.value = coverOptions.some(item => item.src === current.cover) ? current.cover : coverOptions[0].src
    form.arrangements = current.arrangements.map(item => ({ ...item }))
    form.preparations = current.preparations.map(item => ({ ...item }))
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '计划加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function changeDate(event: { detail: { value: string } }) { form.date = event.detail.value }
function changeCover(event: { detail: { current: number } }) {
  selectedCover.value = coverOptions[event.detail.current]?.src || coverOptions[0].src
}
function selectCover(src: string, index?: number) {
  selectedCover.value = src
  if (typeof index === 'number' && index === coverIndex.value) return
}

function promptItem(title: string, placeholder: string, onConfirm: (value: string) => void) {
  uni.showModal({
    title,
    editable: true,
    placeholderText: placeholder,
    confirmColor: '#db7470',
    success: result => {
      const value = result.content?.trim()
      if (result.confirm && value) onConfirm(value.slice(0, 30))
    }
  })
}

function addArrangement() {
  promptItem('添加安排', '例如：一起看日落', title => form.arrangements.push({ id: makeId('arr'), title }))
}
function addPreparation() {
  promptItem('添加小准备', '例如：提前订餐厅', title => form.preparations.push({ id: makeId('prep'), title, completed: false }))
}
function removeArrangement(index: number) { form.arrangements.splice(index, 1) }
function removePreparation(index: number) { form.preparations.splice(index, 1) }

async function submit() {
  if (saving.value) return
  if (!form.date) {
    uni.showToast({ title: '请选择开始日期', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await savePlan({
      revision: revision.value,
      id: editingId.value || makeId('plan'),
      title: form.title.trim(),
      date: form.date,
      cover: selectedCover.value,
      arrangements: form.arrangements,
      preparations: form.preparations
    })
    uni.showToast({ title: editingId.value ? '计划已更新' : '计划已保存', icon: 'success' })
    setTimeout(goBack, 700)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' })
    if (error instanceof Error && error.message.includes('刷新')) await loadData()
  } finally {
    saving.value = false
  }
}

function goBack() { uni.navigateBack({ fail: () => uni.redirectTo({ url: '/pages/plan/index' }) }) }
</script>

<style scoped lang="scss">
.edit-page { position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--love-color-bg); color: var(--love-color-text); }
.edit-page::before { position: absolute; inset: 0 0 auto; height: 560rpx; background: linear-gradient(180deg,#fff0ec 0%,rgba(255,246,241,.72) 54%,rgba(251,247,242,0) 100%); content: ''; pointer-events: none; }
.nav-bar { position: relative; z-index: 3; display: flex; height: calc(var(--menu-top) + var(--menu-height) + 92rpx); flex: none; align-items: flex-start; padding: var(--menu-top) 34rpx 0; }
.nav-back { display: flex; width: 76rpx; height: var(--menu-height); align-items: center; }
.nav-copy { min-width: 0; flex: 1; padding-top: 2rpx; text-align: center; }
.nav-title { display: block; color: #3f3028; font-size: 32rpx; font-weight: 700; line-height: var(--menu-height); }
.nav-subtitle { display: block; margin-top: 9rpx; color: #8d8179; font-size: 22rpx; }
.nav-save { display: flex; width: 76rpx; height: var(--menu-height); align-items: center; justify-content: flex-end; color: #e0646b; font-size: 25rpx; font-weight: 600; }
.edit-scroll { position: relative; z-index: 2; min-height: 0; flex: 1; }
.edit-content { padding: 12rpx 28rpx calc(44rpx + env(safe-area-inset-bottom)); }
.section-card { position: relative; overflow: hidden; border: 1rpx solid rgba(255,255,255,.94); border-radius: 30rpx; background: rgba(252,247,241,.92); box-shadow: 0 12rpx 30rpx rgba(103,73,54,.08); }
.section-title-row { display: flex; align-items: center; gap: 14rpx; color: #49372e; font-size: 29rpx; font-weight: 700; }
.section-mark { width: 8rpx; height: 34rpx; border-radius: 5rpx; background: #ed7480; }
.cover-section { padding: 24rpx 0 22rpx 24rpx; }
.cover-section .section-title-row { padding-right: 24rpx; }
.cover-swiper { width: 100%; height: 270rpx; margin-top: 20rpx; }
.cover-slide { box-sizing: border-box; padding-right: 14rpx; }
.cover-slide-card { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 24rpx; background: #f5e5de; }
.cover-image { width: 100%; height: 100%; }
.cover-selected { position: absolute; top: 16rpx; right: 16rpx; display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; border: 3rpx solid rgba(255,255,255,.9); border-radius: 50%; background: #ec7881; box-shadow: 0 6rpx 16rpx rgba(181,73,80,.24); }
.cover-thumbnails { width: 100%; height: 104rpx; margin-top: 14rpx; white-space: nowrap; }
.cover-thumbnail-row { display: inline-flex; gap: 12rpx; padding-right: 24rpx; }
.cover-thumbnail { width: 86rpx; height: 86rpx; overflow: hidden; border: 4rpx solid transparent; border-radius: 18rpx; opacity: .72; }
.cover-thumbnail.active { border-color: #ed7c84; opacity: 1; box-shadow: 0 6rpx 14rpx rgba(207,100,104,.18); }
.cover-thumbnail image { width: 100%; height: 100%; }
.info-section { margin-top: 18rpx; padding: 24rpx; }
.info-art { position: absolute; top: 6rpx; right: -18rpx; width: 210rpx; height: 210rpx; opacity: .65; pointer-events: none; }
.field-row { position: relative; z-index: 1; display: flex; min-height: 86rpx; align-items: center; margin-top: 14rpx; padding: 0 18rpx; border: 1rpx solid rgba(226,210,199,.5); border-radius: 22rpx; background: rgba(255,253,249,.84); }
.field-icon { display: flex; width: 46rpx; flex: none; align-items: center; }
.field-label { width: 150rpx; flex: none; color: #56443b; font-size: 24rpx; font-weight: 600; }
.field-input { min-width: 0; flex: 1; color: #59483e; font-size: 24rpx; }
.field-value { min-width: 0; flex: 1; color: #59483e; font-size: 24rpx; }
.placeholder, .input-placeholder { color: #a89a91; }
.lists-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16rpx; margin-top: 18rpx; }
.list-section { min-height: 360rpx; padding: 22rpx 18rpx 20rpx; }
.list-heading { position: relative; min-height: 100rpx; }
.list-heading image { position: absolute; top: -26rpx; right: -22rpx; width: 122rpx; height: 122rpx; opacity: .75; }
.list-title { display: flex; align-items: center; gap: 10rpx; color: #49372e; font-size: 25rpx; font-weight: 700; }
.list-subtitle { display: block; width: 72%; margin-top: 9rpx; color: #95867d; font-size: 19rpx; line-height: 1.4; }
.list-item { display: flex; min-height: 66rpx; align-items: center; gap: 10rpx; margin-top: 10rpx; padding: 8rpx 12rpx; border-radius: 18rpx; background: #f8efeb; color: #5d4a40; font-size: 22rpx; }
.list-item > text { min-width: 0; flex: 1; line-height: 1.35; }
.item-number, .check-dot { display: flex; width: 36rpx; height: 36rpx; flex: none; align-items: center; justify-content: center; border-radius: 50%; background: #f5dedb; color: #db7471; font-size: 18rpx; }
.check-dot { border: 2rpx solid #c8b9b0; background: transparent; }
.check-dot.checked { border-color: #eb7a80; background: #eb7a80; }
.item-remove { display: flex; width: 34rpx; height: 38rpx; flex: none; align-items: center; justify-content: flex-end; }
.add-row { display: flex; height: 62rpx; align-items: center; justify-content: center; gap: 8rpx; margin-top: 14rpx; border: 2rpx dashed #ef9ba0; border-radius: 18rpx; color: #df6c72; font-size: 22rpx; }
.save-button { display: flex; height: 86rpx; align-items: center; justify-content: center; margin-top: 26rpx; border-radius: 44rpx; background: linear-gradient(90deg,#f58f8b,#ec5570); color: #fff; font-size: 29rpx; font-weight: 600; line-height: 86rpx; box-shadow: 0 14rpx 30rpx rgba(219,93,100,.2); }
.save-button::after { border: 0; }
.save-button[disabled] { background: #e9aaa5; color: #fff; opacity: 1; }
.footer-note { display: flex; align-items: center; justify-content: center; gap: 14rpx; margin-top: 24rpx; color: #9b8a7f; font-size: 20rpx; }
.footer-line { width: 42rpx; height: 1rpx; background: #e5d8ce; }
.loading-state { position: absolute; inset: 180rpx 0 0; z-index: 12; display: flex; align-items: center; justify-content: center; background: rgba(251,247,242,.66); }
</style>
