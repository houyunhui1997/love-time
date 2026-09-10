<template>
  <view class="edit-page" :style="pageStyle">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <uni-icons type="left" size="28" color="#514137" />
      </view>
      <text class="nav-title">记录此刻</text>
    </view>

    <scroll-view class="edit-scroll" scroll-y :show-scrollbar="false" enhanced>
      <view class="edit-content">
        <view class="story-card">
          <textarea
            v-model="form.content"
            class="story-textarea"
            placeholder="写下这一刻的故事…"
            placeholder-class="story-placeholder"
            maxlength="500"
          />
          <text class="character-count">{{ form.content.length }}/500</text>
        </view>

        <view class="photo-card">
          <view class="section-heading">
            <text class="section-title">添加照片</text>
            <text class="section-tip">最多9张</text>
          </view>
          <view class="photo-grid">
            <view v-for="(imageUrl, index) in form.images" :key="`${imageUrl}-${index}`" class="photo-item">
              <image class="photo-image" :src="imageUrl" mode="aspectFill" />
              <view class="photo-remove" @tap.stop="removeImage(index)">
                <uni-icons type="closeempty" size="15" color="#ffffff" />
              </view>
            </view>
            <view v-if="form.images.length < 9" class="photo-add" @tap="chooseImage">
              <uni-icons type="camera-filled" size="32" color="#dd7772" />
              <text>添加照片</text>
            </view>
          </view>
        </view>

        <view class="settings-card">
          <view class="setting-row time-row" @tap="openDateTimePicker">
            <view class="setting-label">
              <uni-icons class="setting-icon" type="calendar" size="20" color="#df7772" />
              <text>发生时间</text>
            </view>
            <view class="setting-value">
              <text>{{ displayDateTime }}</text>
              <uni-icons type="right" size="19" color="#a9998e" />
            </view>
          </view>

          <view class="mood-row">
            <view class="setting-label mood-heading">
              <uni-icons class="setting-icon" type="heart" size="20" color="#df7772" />
              <text>这一刻的心情</text>
            </view>
            <view class="quick-moods">
              <view
                v-for="mood in quickMoods"
                :key="mood.value"
                class="quick-mood"
                :class="{ active: form.mood === mood.value }"
                @tap="form.mood = mood.value"
              >
                <uni-icons
                  v-if="form.mood === mood.value"
                  :type="mood.icon"
                  size="15"
                  color="#ffffff"
                />
                <text>{{ mood.label }}</text>
              </view>
              <view class="quick-mood" :class="{ active: isExtendedMood }" @tap="showMoodPicker = true">
                <uni-icons v-if="isExtendedMood" type="heart-filled" size="15" color="#ffffff" />
                <text>更多</text>
              </view>
            </view>
          </view>

        </view>

        <button
          class="save-button"
          :class="{ 'is-disabled': saving || !canSave }"
          :disabled="saving"
          @tap="onSave"
        >
          <LoveLoading v-if="saving" size="mini" text="" :mask="false" />
          <text>{{ saving ? '保存中…' : '保存这段时光' }}</text>
        </button>

        <view class="bottom-space" />
      </view>
    </scroll-view>

    <image
      class="bottom-bouquet"
      src="/static/timeline/timeline-bottom-bouquet.png"
      mode="aspectFit"
    />

    <view v-if="showDateTimePicker" class="picker-mask" @tap="cancelDateTimePicker">
      <view class="picker-sheet date-picker-sheet" @tap.stop>
        <view class="picker-handle" />
        <text class="picker-title">选择发生时间</text>
        <picker-view
          class="datetime-picker"
          indicator-style="height: 88rpx;"
          :value="dateTimeSelection"
          @change="onDateTimeChange"
        >
          <picker-view-column>
            <view v-for="year in dateYears" :key="year" class="picker-item">{{ year }}年</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="month in 12" :key="month" class="picker-item">{{ month }}月</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="day in dateDays" :key="day" class="picker-item">{{ day }}日</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="hour in 24" :key="hour" class="picker-item">{{ hour - 1 }}时</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="minute in 60" :key="minute" class="picker-item">{{ minute - 1 }}分</view>
          </picker-view-column>
        </picker-view>
        <view class="picker-actions">
          <button class="picker-action picker-cancel" @tap="cancelDateTimePicker">取消</button>
          <button class="picker-action picker-confirm" @tap="confirmDateTime">确定</button>
        </view>
      </view>
    </view>

    <MomentMoodPicker
      v-model:visible="showMoodPicker"
      :model-value="form.mood"
      @confirm="selectExtendedMood"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import LoveLoading from '@/components/base/LoveLoading.vue'
import MomentMoodPicker from '@/components/timeline/MomentMoodPicker.vue'
import { MOMENT_MOOD_GROUPS } from '@/constants/moment-moods'
import type { MomentMood } from '@/types/domain'
import { createMoment, getMoment, updateMoment } from '@/services/moment'
import { getTempFileUrls } from '@/services/media'

interface FormData {
  title: string
  content: string
  images: string[]
  occurredAt: string
  occurredTime: string
  mood: MomentMood
}

const systemInfo = uni.getSystemInfoSync()

function getNavigationMetrics() {
  const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.top && menuButton?.height) return { top: menuButton.top, height: menuButton.height }
  } catch {
    // 非微信环境使用接近微信胶囊尺寸的回退值。
  }
  return { top: fallbackTop, height: 32 }
}

const navigationMetrics = getNavigationMetrics()
const pageStyle = {
  '--menu-top': `${navigationMetrics.top}px`,
  '--menu-height': `${navigationMetrics.height}px`
}

const isEdit = ref(false)
const editId = ref('')
const editRevision = ref(1)
const saving = ref(false)
const showDateTimePicker = ref(false)
const showMoodPicker = ref(false)
const dateTimeSelection = ref<number[]>([10, 0, 0, 0, 0])

const form = reactive<FormData>({
  title: '',
  content: '',
  images: [],
  occurredAt: '',
  occurredTime: '',
  mood: 'warm'
})

const imageSource = ref<Array<{ type: 'file' | 'local'; value: string }>>([])
const quickMoodValues: MomentMood[] = ['happy', 'warm', 'calm', 'moved']
const allMoodOptions = MOMENT_MOOD_GROUPS.flatMap(group => group.options)
const quickMoods = quickMoodValues.map(value => allMoodOptions.find(option => option.value === value)!)

const canSave = computed(() => form.content.trim().length > 0)
const isExtendedMood = computed(() => !quickMoodValues.includes(form.mood))

const displayDateTime = computed(() => {
  if (!form.occurredAt) return ''
  return `${form.occurredAt.replace(/-/g, '.')} ${form.occurredTime || '00:00'}`
})

const currentYear = new Date().getFullYear()
const dateYears = Array.from({ length: 21 }, (_, index) => currentYear - 10 + index)
const dateDays = computed(() => {
  const [yearIndex, monthIndex] = dateTimeSelection.value
  const year = dateYears[yearIndex] || currentYear
  const count = new Date(year, monthIndex + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => index + 1)
})

function getCurrentDateTimeSelection() {
  const current = new Date()
  const year = form.occurredAt ? Number(form.occurredAt.split('-')[0]) : current.getFullYear()
  const month = form.occurredAt ? Number(form.occurredAt.split('-')[1]) : current.getMonth() + 1
  const day = form.occurredAt ? Number(form.occurredAt.split('-')[2]) : current.getDate()
  const hour = form.occurredTime ? Number(form.occurredTime.split(':')[0]) : current.getHours()
  const minute = form.occurredTime ? Number(form.occurredTime.split(':')[1]) : current.getMinutes()
  return [dateYears.indexOf(year), month - 1, day - 1, hour, minute]
}

function openDateTimePicker() {
  dateTimeSelection.value = getCurrentDateTimeSelection()
  showDateTimePicker.value = true
}

function onDateTimeChange(event: { detail: { value: number[] } }) {
  const [yearIndex, monthIndex, dayIndex, hourIndex, minuteIndex] = event.detail.value
  const year = dateYears[yearIndex] || currentYear
  const maxDayIndex = new Date(year, monthIndex + 1, 0).getDate() - 1
  dateTimeSelection.value = [yearIndex, monthIndex, Math.min(dayIndex, maxDayIndex), hourIndex, minuteIndex]
}

function cancelDateTimePicker() {
  showDateTimePicker.value = false
}

function confirmDateTime() {
  const [yearIndex, monthIndex, dayIndex, hourIndex, minuteIndex] = dateTimeSelection.value
  const year = dateYears[yearIndex] || currentYear
  form.occurredAt = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayIndex + 1).padStart(2, '0')}`
  form.occurredTime = `${String(hourIndex).padStart(2, '0')}:${String(minuteIndex).padStart(2, '0')}`
  showDateTimePicker.value = false
}

function selectExtendedMood(mood: MomentMood) {
  form.mood = mood
}

function chooseImage() {
  const remain = 9 - form.images.length
  if (remain <= 0) return
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (result: any) => {
      const paths: string[] = Array.isArray(result.tempFilePaths) ? result.tempFilePaths : [result.tempFilePaths]
      paths.forEach((path) => {
        form.images.push(path)
        imageSource.value.push({ type: 'local', value: path })
      })
    }
  })
}

function removeImage(index: number) {
  form.images.splice(index, 1)
  imageSource.value.splice(index, 1)
}

async function uploadImage(localPath: string) {
  const extension = localPath.split('.').pop()?.toLowerCase() || 'jpg'
  const result = await uniCloud.uploadFile({
    filePath: localPath,
    cloudPath: `moment/${Date.now()}-${Math.floor(Math.random() * 10000)}.${extension}`
  })
  return result.fileID
}

onLoad(async (options) => {
  const current = new Date()
  form.occurredAt = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
  form.occurredTime = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`

  if (!options?.id) return
  isEdit.value = true
  editId.value = options.id
  try {
    const data = await getMoment(options.id)
    editRevision.value = data.revision || 1
    form.content = data.content
    form.mood = data.mood
    form.title = data.titleCustomized ? data.title : ''

    const occurred = new Date(data.occurredAt)
    form.occurredAt = `${occurred.getFullYear()}-${String(occurred.getMonth() + 1).padStart(2, '0')}-${String(occurred.getDate()).padStart(2, '0')}`
    form.occurredTime = `${String(occurred.getHours()).padStart(2, '0')}:${String(occurred.getMinutes()).padStart(2, '0')}`

    if (data.mediaIds.length) {
      const urlMap = await getTempFileUrls(data.mediaIds)
      data.mediaIds.forEach((fileId) => {
        form.images.push(urlMap[fileId] || fileId)
        imageSource.value.push({ type: 'file', value: fileId })
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '时刻加载失败'
    uni.showToast({ title: message, icon: 'none' })
  }
})

function goBack() {
  if (showMoodPicker.value) {
    showMoodPicker.value = false
    return
  }
  if (showDateTimePicker.value) {
    cancelDateTimePicker()
    return
  }
  uni.navigateBack()
}

async function onSave() {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    const [year, month, day] = form.occurredAt.split('-').map(Number)
    const [hour, minute] = (form.occurredTime || '00:00').split(':').map(Number)
    const occurredAt = new Date(year, month - 1, day, hour, minute).getTime()
    const mediaIds: string[] = []

    for (const source of imageSource.value) {
      mediaIds.push(source.type === 'file' ? source.value : await uploadImage(source.value))
    }

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      mood: form.mood,
      occurredAt,
      mediaIds
    }

    if (isEdit.value) {
      await updateMoment({ id: editId.value, revision: editRevision.value, ...payload })
    } else {
      await createMoment(payload)
    }

    uni.showToast({ title: isEdit.value ? '修改成功' : '记录成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.edit-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 6% 2%, rgba(247, 210, 201, 0.72), transparent 42%),
    linear-gradient(180deg, #f8e5de 0%, #fbf1ea 25%, #fcf7f1 62%, #fbf6ef 100%);
  color: #56453b;
}

.edit-page::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    repeating-linear-gradient(18deg, rgba(133, 98, 75, 0.012) 0 1rpx, transparent 1rpx 7rpx),
    repeating-linear-gradient(102deg, rgba(255, 255, 255, 0.07) 0 1rpx, transparent 1rpx 9rpx);
  content: '';
  pointer-events: none;
}

.nav-bar {
  position: relative;
  z-index: 2;
  display: flex;
  height: calc(var(--menu-top) + var(--menu-height));
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding-top: var(--menu-top);
}

.nav-back {
  position: absolute;
  bottom: 0;
  left: 35rpx;
  display: flex;
  width: 62rpx;
  height: var(--menu-height);
  align-items: center;
  justify-content: flex-start;
}

.nav-title {
  color: #514137;
  font-size: 35rpx;
  font-weight: 600;
  line-height: var(--menu-height);
  letter-spacing: 1rpx;
}

.edit-scroll {
  position: relative;
  z-index: 2;
  min-height: 0;
  flex: 1;
}

.edit-content {
  padding: 30rpx 39rpx 0;
}

.story-card,
.photo-card,
.settings-card {
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  background: rgba(252, 247, 241, 0.83);
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.92),
    0 14rpx 32rpx rgba(100, 69, 50, 0.08);
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);
}

.story-card {
  position: relative;
  height: 350rpx;
  padding: 34rpx 37rpx 52rpx;
  border-radius: 28rpx;
}

.story-textarea {
  width: 100%;
  height: 100%;
  padding: 0;
  color: #5c4b40;
  font-size: 29rpx;
  line-height: 1.75;
}

.story-placeholder {
  color: #9b887c;
}

.character-count {
  position: absolute;
  right: 34rpx;
  bottom: 24rpx;
  color: #9d897c;
  font-size: 22rpx;
}

.photo-card {
  margin-top: 30rpx;
  padding: 27rpx 31rpx 31rpx;
  border-radius: 28rpx;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  color: #514137;
  font-size: 29rpx;
  font-weight: 600;
}

.section-tip {
  color: #9a8679;
  font-size: 22rpx;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 22rpx;
}

.photo-item,
.photo-add {
  position: relative;
  width: 100%;
  height: 184rpx;
  overflow: hidden;
  border-radius: 18rpx;
}

.photo-image {
  width: 100%;
  height: 100%;
}

.photo-remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  display: flex;
  width: 34rpx;
  height: 34rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(66, 46, 38, 0.58);
}

.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 13rpx;
  border: 2rpx dashed rgba(223, 119, 114, 0.55);
  background: rgba(255, 252, 248, 0.45);
  color: #755f53;
  font-size: 22rpx;
}

.settings-card {
  margin-top: 31rpx;
  padding: 0 31rpx;
  border-radius: 28rpx;
}

.setting-row {
  display: flex;
  min-height: 100rpx;
  align-items: center;
  justify-content: space-between;
}

.setting-row + .setting-row {
  border-top: 1rpx solid rgba(222, 205, 192, 0.48);
}

.setting-label,
.setting-value {
  display: flex;
  align-items: center;
}

.setting-label {
  gap: 18rpx;
  color: #59473d;
  font-size: 27rpx;
  font-weight: 600;
}

.setting-icon {
  flex: 0 0 auto;
  opacity: 0.88;
}

.setting-value {
  gap: 11rpx;
  color: #867267;
  font-size: 24rpx;
}

.mood-row {
  padding: 24rpx 0 27rpx;
  border-top: 1rpx solid rgba(222, 205, 192, 0.48);
}

.mood-heading {
  margin-bottom: 21rpx;
}

.quick-moods {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 11rpx;
}

.quick-mood {
  display: flex;
  height: 61rpx;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  border: 1rpx solid rgba(222, 205, 192, 0.52);
  border-radius: 17rpx;
  background: rgba(248, 241, 234, 0.72);
  color: #735f53;
  font-size: 21rpx;
  white-space: nowrap;
}

.quick-mood.active {
  border-color: transparent;
  background: linear-gradient(135deg, #ec817a, #dc696b);
  box-shadow: 0 7rpx 17rpx rgba(207, 96, 92, 0.18);
  color: #fff;
}

.save-button {
  display: flex;
  width: 474rpx;
  height: 88rpx;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin: 36rpx auto 0;
  padding: 0;
  border-radius: 46rpx;
  background: linear-gradient(135deg, #ec817a 0%, #dc696b 100%);
  box-shadow: 0 12rpx 28rpx rgba(207, 96, 91, 0.24);
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
  line-height: 88rpx;
}

.save-button.is-disabled,
.save-button[disabled] {
  background: linear-gradient(135deg, #efa49e 0%, #e99596 100%);
  box-shadow: 0 9rpx 22rpx rgba(208, 105, 101, 0.14);
  color: #fff !important;
  opacity: 1;
  -webkit-text-fill-color: #fff;
}

.save-button.is-disabled text,
.save-button[disabled] text {
  color: #fff !important;
  opacity: 1;
}

.save-button::after {
  border: 0;
}

.bottom-space {
  height: 150rpx;
}

.bottom-bouquet {
  position: absolute;
  bottom: -65rpx;
  left: -42rpx;
  z-index: 1;
  width: 300rpx;
  height: 245rpx;
  opacity: 0.42;
  pointer-events: none;
}

.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-end;
  background: rgba(61, 47, 40, 0.4);
}

.picker-sheet {
  width: 100%;
  padding: 17rpx 28rpx calc(env(safe-area-inset-bottom) + 24rpx);
  border-radius: 38rpx 38rpx 0 0;
  background: #fcf7f1;
  box-shadow: 0 -18rpx 54rpx rgba(65, 44, 31, 0.16);
}

.picker-handle {
  width: 70rpx;
  height: 7rpx;
  margin: 0 auto 26rpx;
  border-radius: 4rpx;
  background: #ddd2ca;
}

.picker-title {
  display: block;
  color: #514137;
  font-size: 31rpx;
  font-weight: 600;
  text-align: center;
}

.datetime-picker {
  width: 100%;
  height: 390rpx;
  margin-top: 12rpx;
}

.picker-item {
  display: flex;
  height: 88rpx;
  align-items: center;
  justify-content: center;
  color: #5e4d42;
  font-size: 25rpx;
}

.picker-actions {
  display: flex;
  gap: 20rpx;
  padding: 18rpx 6rpx 0;
}

.picker-action {
  display: flex;
  height: 78rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border-radius: 40rpx;
  font-size: 28rpx;
  line-height: 78rpx;
}

.picker-action::after {
  border: 0;
}

.picker-cancel {
  color: #77685e;
  background: #f2ebe4;
}

.picker-confirm {
  color: #fff;
  background: linear-gradient(135deg, #eb7e77 0%, #dd696b 100%);
  box-shadow: 0 8rpx 20rpx rgba(208, 96, 91, 0.2);
}
</style>
