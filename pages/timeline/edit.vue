<template>
  <view class="edit-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <view class="back-arrow" />
      </view>
      <text class="nav-title">记录此刻</text>
      <text class="nav-save" :class="{ disabled: !canSave }" @tap="onSave">保存</text>
    </view>

    <!-- 内容输入区 -->
    <view class="content-area">
      <textarea
        v-model="form.content"
        class="content-textarea"
        placeholder="写下这一刻的故事..."
        placeholder-class="textarea-placeholder"
        maxlength="500"
        :auto-height="true"
      />
      <view class="flower-deco">
        <image
          class="flower-small"
          src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/anniversary/flower-decoration.png"
          mode="aspectFit"
        />
      </view>
    </view>

    <!-- 添加照片 -->
    <view class="photo-section">
      <view class="section-header">
        <text class="section-title">添加照片</text>
        <text class="section-limit">最多9张</text>
      </view>
      <view class="photo-grid">
        <view
          v-for="(img, index) in form.images"
          :key="index"
          class="photo-item"
        >
          <image class="photo-image" :src="img" mode="aspectFill" />
          <view class="photo-remove" @tap="removeImage(index)">
            <view class="remove-icon" />
          </view>
        </view>
        <view v-if="form.images.length < 9" class="photo-add" @tap="chooseImage">
          <text class="add-plus">+</text>
          <text class="add-label">添加</text>
        </view>
      </view>
    </view>

    <!-- 发生时间 -->
    <view class="form-row" @tap="showDateTimePicker = true">
      <text class="form-label">发生时间</text>
      <view class="form-value-row">
        <text class="form-value">{{ displayDateTime }}</text>
        <view class="arrow-right" />
      </view>
    </view>

    <!-- 心情选择 -->
    <view class="mood-section">
      <text class="section-title">这一刻的心情</text>
      <view class="mood-options">
        <view
          v-for="mood in moodOptions"
          :key="mood.value"
          class="mood-tag"
          :class="[{ active: form.mood === mood.value }, mood.value]"
          @tap="form.mood = mood.value"
        >
          {{ mood.label }}
        </view>
      </view>
    </view>

    <!-- 仅自己可见 -->
    <view class="visibility-row">
      <view class="visibility-info">
        <text class="form-label">仅自己可见</text>
        <text class="visibility-tip">关闭后，另一半也能看到</text>
      </view>
      <switch
        :checked="form.visibility === 'private'"
        color="#db7470"
        class="form-switch"
        @change="onVisibilityChange"
      />
    </view>

    <!-- 保存按钮 -->
    <view class="action-area">
      <button class="save-button" :loading="saving" @tap="onSave">
        {{ saving ? '保存中...' : '保存这段时光' }}
      </button>
    </view>

    <!-- 日期时间选择器 -->
    <view v-if="showDateTimePicker" class="picker-mask" @tap="showDateTimePicker = false">
      <view class="picker-sheet" @tap.stop>
        <view class="picker-handle" />
        <view class="picker-title">选择时间</view>
        <picker-view
          class="datetime-picker"
          indicator-style="height: 88rpx;"
          :value="dateTimeValue"
          @change="onDateTimeChange"
        >
          <picker-view-column>
            <view v-for="y in dateYears" :key="y" class="picker-item">{{ y }}年</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="m in 12" :key="m" class="picker-item">{{ m }}月</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="d in dateDays" :key="d" class="picker-item">{{ d }}日</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="h in 24" :key="h" class="picker-item">{{ h - 1 }}时</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="min in 60" :key="min" class="picker-item">{{ min - 1 }}分</view>
          </picker-view-column>
        </picker-view>
        <view class="picker-confirm" @tap="confirmDateTime">确定</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { MomentMood, Visibility } from '@/types/domain'
import { getMoment, createMoment, updateMoment } from '@/services/moment'
import { getTempFileUrls } from '@/services/media'

interface FormData {
  title: string
  content: string
  images: string[]
  occurredAt: string
  occurredTime: string
  mood: MomentMood
  visibility: Visibility
}

const isEdit = ref(false)
const editId = ref('')
const editRevision = ref(1)
const saving = ref(false)
const showDateTimePicker = ref(false)

const form = reactive<FormData>({
  title: '',
  content: '',
  images: [],
  occurredAt: '',
  occurredTime: '',
  mood: 'warm',
  visibility: 'private'
})

// 记录每张图的状态：fileId 表示已在云端（编辑加载），local 表示本地新选待上传
const imageSource = ref<Array<{ type: 'file' | 'local'; value: string }>>([])

const moodOptions = [
  { label: '开心', value: 'happy' as MomentMood },
  { label: '温暖', value: 'warm' as MomentMood },
  { label: '平静', value: 'calm' as MomentMood },
  { label: '感动', value: 'moved' as MomentMood },
  { label: '其他', value: 'other' as MomentMood }
]

const canSave = computed(() => form.content.trim().length > 0)

const displayDateTime = computed(() => {
  if (!form.occurredAt) {
    const now = new Date()
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return `${date} ${time}`
  }
  const date = form.occurredAt.replace(/-/g, '.')
  const time = form.occurredTime || '00:00'
  return `${date} ${time}`
})

// 日期时间选择器
const currentYear = new Date().getFullYear()
const dateYears = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)

const dateDays = computed(() => {
  const [year, month] = (form.occurredAt || `${currentYear}-01-01`).split('-').map(Number)
  const daysInMonth = new Date(year || currentYear, month || 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
})

const dateTimeValue = computed(() => {
  const now = new Date()
  const year = form.occurredAt ? parseInt(form.occurredAt.split('-')[0]) : now.getFullYear()
  const month = form.occurredAt ? parseInt(form.occurredAt.split('-')[1]) : now.getMonth() + 1
  const day = form.occurredAt ? parseInt(form.occurredAt.split('-')[2]) : now.getDate()
  const hour = form.occurredTime ? parseInt(form.occurredTime.split(':')[0]) : now.getHours()
  const minute = form.occurredTime ? parseInt(form.occurredTime.split(':')[1]) : now.getMinutes()
  return [dateYears.indexOf(year), month - 1, day - 1, hour, minute]
})

let pendingDateTime: { date: string; time: string } | null = null

function onDateTimeChange(e: any) {
  const [yIndex, mIndex, dIndex, hIndex, minIndex] = e.detail.value
  const year = dateYears[yIndex]
  const month = String(mIndex + 1).padStart(2, '0')
  const day = String(dIndex + 1).padStart(2, '0')
  const hour = String(hIndex).padStart(2, '0')
  const minute = String(minIndex).padStart(2, '0')
  pendingDateTime = { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` }
}

function confirmDateTime() {
  if (pendingDateTime) {
    form.occurredAt = pendingDateTime.date
    form.occurredTime = pendingDateTime.time
  }
  showDateTimePicker.value = false
}

function onVisibilityChange(e: any) {
  form.visibility = e.detail.value ? 'private' : 'couple'
}

function chooseImage() {
  const remain = 9 - form.images.length
  if (remain <= 0) {
    uni.showToast({ title: '最多9张照片', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      const paths: string[] = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : [res.tempFilePaths]
      paths.forEach((path: string) => {
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

async function uploadImage(localPath: string): Promise<string> {
  const ext = localPath.split('.').pop()?.toLowerCase() || 'jpg'
  const result = await uniCloud.uploadFile({
    filePath: localPath,
    cloudPath: `moment/${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`
  })
  return result.fileID
}

onLoad(async (options) => {
  const now = new Date()
  form.occurredAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  form.occurredTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (options?.id) {
    isEdit.value = true
    editId.value = options.id
    try {
      const data = await getMoment(options.id)
      editRevision.value = data.revision || 1
      form.content = data.content
      form.mood = data.mood
      form.visibility = data.visibility
      form.title = data.titleCustomized ? data.title : ''

      const occurred = new Date(data.occurredAt)
      form.occurredAt = `${occurred.getFullYear()}-${String(occurred.getMonth() + 1).padStart(2, '0')}-${String(occurred.getDate()).padStart(2, '0')}`
      form.occurredTime = `${String(occurred.getHours()).padStart(2, '0')}:${String(occurred.getMinutes()).padStart(2, '0')}`

      // 加载已有图片
      if (data.mediaIds.length > 0) {
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
  }
})

function goBack() {
  if (showDateTimePicker.value) {
    showDateTimePicker.value = false
    return
  }
  uni.navigateBack()
}

async function onSave() {
  if (!form.content.trim()) {
    uni.showToast({ title: '请写下这一刻的故事', icon: 'none' })
    return
  }

  saving.value = true
  try {
    // 组装 occurredAt 时间戳
    const [year, month, day] = form.occurredAt.split('-').map(Number)
    const [hour, minute] = (form.occurredTime || '00:00').split(':').map(Number)
    const occurredAt = new Date(year, month - 1, day, hour, minute).getTime()

    // 上传本地新图片，得到最终 mediaIds
    const mediaIds: string[] = []
    for (const src of imageSource.value) {
      if (src.type === 'file') {
        mediaIds.push(src.value)
      } else {
        const fileId = await uploadImage(src.value)
        mediaIds.push(fileId)
      }
    }

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      mood: form.mood,
      occurredAt,
      mediaIds,
      visibility: form.visibility
    }

    if (isEdit.value) {
      await updateMoment({ id: editId.value, revision: editRevision.value, ...payload })
    } else {
      await createMoment(payload)
    }

    saving.value = false
    uni.showToast({ title: isEdit.value ? '修改成功' : '记录成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1200)
  } catch (error) {
    saving.value = false
    const message = error instanceof Error ? error.message : '保存失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}
</script>

<style scoped lang="scss">
.edit-page {
  position: relative;
  min-height: 100vh;
  padding: calc(var(--love-safe-top) + 24rpx) var(--love-page-gutter)
    calc(var(--love-safe-bottom) + 48rpx);
  background: var(--love-color-bg);
  overflow: hidden;
}

/* 顶部导航 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  margin-bottom: 24rpx;
}

.nav-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;

  .back-arrow {
    width: 20rpx;
    height: 20rpx;
    border-left: 4rpx solid var(--love-color-text);
    border-bottom: 4rpx solid var(--love-color-text);
    transform: rotate(45deg);
  }
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--love-color-text);
}

.nav-save {
  font-size: 28rpx;
  color: var(--love-color-primary);
  font-weight: 600;
  padding: 12rpx 24rpx;

  &.disabled {
    color: var(--love-color-text-secondary);
    opacity: 0.5;
  }
}

/* 内容输入区 */
.content-area {
  position: relative;
  margin-bottom: 32rpx;
}

.content-textarea {
  width: 100%;
  min-height: 300rpx;
  padding: 24rpx;
  font-size: 30rpx;
  color: var(--love-color-text);
  line-height: 1.8;
  background: var(--love-color-surface);
  border-radius: var(--love-radius-medium);
  border: 1rpx solid rgba(222, 205, 192, 0.4);
}

.textarea-placeholder {
  color: var(--love-color-text-secondary);
  opacity: 0.5;
}

.flower-deco {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  width: 64rpx;
  height: 64rpx;
  pointer-events: none;
}

.flower-small {
  width: 100%;
  height: 100%;
  opacity: 0.5;
}

/* 照片区域 */
.photo-section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--love-color-text);
}

.section-limit {
  font-size: 24rpx;
  color: var(--love-color-text-secondary);
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--love-radius-small);
  overflow: hidden;
}

.photo-image {
  width: 100%;
  height: 100%;
}

.photo-remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-icon {
  width: 16rpx;
  height: 2rpx;
  background: #fff;
  transform: rotate(45deg);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    width: 16rpx;
    height: 2rpx;
    background: #fff;
    transform: rotate(90deg);
  }
}

.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: var(--love-radius-small);
  border: 2rpx dashed var(--love-color-primary-soft);
  background: rgba(246, 211, 204, 0.1);
  gap: 8rpx;
}

.add-plus {
  font-size: 48rpx;
  color: var(--love-color-primary);
  font-weight: 300;
  line-height: 1;
}

.add-label {
  font-size: 24rpx;
  color: var(--love-color-primary);
}

/* 表单行 */
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid var(--love-color-divider);
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 28rpx;
  color: var(--love-color-text);
}

.form-value-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.form-value {
  font-size: 28rpx;
  color: var(--love-color-text-secondary);
}

.arrow-right {
  width: 14rpx;
  height: 14rpx;
  border-top: 3rpx solid var(--love-color-text-secondary);
  border-right: 3rpx solid var(--love-color-text-secondary);
  transform: rotate(45deg);
  opacity: 0.4;
}

/* 心情选择 */
.mood-section {
  margin-bottom: 24rpx;
}

.mood-options {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
  flex-wrap: wrap;
}

.mood-tag {
  padding: 12rpx 32rpx;
  border-radius: 28rpx;
  font-size: 26rpx;
  color: var(--love-color-text-secondary);
  background: rgba(222, 205, 192, 0.2);
  border: 1rpx solid transparent;
  transition: all 0.2s ease;

  &.active {
    color: #fff;
    border-color: transparent;
  }

  &.active.happy {
    background: #e8a87c;
  }

  &.active.warm {
    background: var(--love-color-primary);
  }

  &.active.calm {
    background: #8fb9a8;
  }

  &.active.moved {
    background: #c38d9e;
  }

  &.active.other {
    background: var(--love-color-text-secondary);
  }
}

/* 可见性 */
.visibility-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  margin-bottom: 48rpx;
}

.visibility-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.visibility-tip {
  font-size: 24rpx;
  color: var(--love-color-text-secondary);
}

.form-switch {
  transform: scale(0.85);
}

/* 保存按钮 */
.action-area {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.save-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: var(--love-color-primary);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(219, 116, 112, 0.25);

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

/* 选择器 */
.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  background: rgba(58, 42, 33, 0.34);
}

.picker-sheet {
  width: 100%;
  padding: 18rpx 0 calc(var(--love-safe-bottom) + 24rpx);
  border-radius: 38rpx 38rpx 0 0;
  background: var(--love-color-surface);
  box-shadow: 0 -18rpx 54rpx rgba(65, 44, 31, 0.16);
}

.picker-handle {
  width: 70rpx;
  height: 7rpx;
  margin: 0 auto 28rpx;
  border-radius: 4rpx;
  background: #dfd5cc;
}

.picker-title {
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--love-color-text);
  margin-bottom: 16rpx;
}

.datetime-picker {
  height: 440rpx;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  font-size: 30rpx;
  color: var(--love-color-text);
}

.picker-confirm {
  margin: 16rpx 48rpx 0;
  padding: 24rpx 0;
  text-align: center;
  border-radius: 48rpx;
  background: var(--love-color-primary);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;

  &:active {
    opacity: 0.9;
  }
}
</style>
