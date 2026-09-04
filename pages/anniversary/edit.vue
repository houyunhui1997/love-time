<template>
  <view
    class="edit-page"
    :class="{
      'compact-screen': isCompactScreen,
      'short-screen': isShortScreen
    }"
    :style="pageStyle"
  >
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-back" hover-class="nav-back--pressed" @tap="goBack">
        <view class="back-arrow" />
      </view>
      <text class="nav-title">{{ isEdit ? '编辑纪念日' : '添加纪念日' }}</text>
    </view>

    <!-- 顶部情侣花艺 -->
    <view class="hero-decoration">
      <image
        class="hero-decoration-image"
        src="/static/anniversary/top-couple-floral-vignette.png"
        mode="aspectFit"
      />
    </view>

    <!-- 表单卡片 -->
    <view class="form-card">
      <!-- 纪念日名称 -->
      <view class="form-row">
        <text class="form-label">纪念日名称</text>
        <input
          v-model="form.title"
          class="form-input"
          placeholder="请输入纪念日名称"
          placeholder-class="input-placeholder"
          maxlength="20"
        />
      </view>
      <view class="form-divider" />

      <!-- 纪念日期 -->
      <view class="form-row" @tap="openDatePicker">
        <text class="form-label">纪念日期</text>
        <view class="form-value-row">
          <text class="form-value">{{ displayDate }}</text>
          <view class="arrow-right" />
        </view>
      </view>
      <view class="form-divider" />

      <!-- 纪念类型 -->
      <view class="form-row">
        <text class="form-label">纪念类型</text>
        <view class="type-options">
          <view
            v-for="type in eventTypes"
            :key="type.value"
            class="type-tag"
            :class="{ active: form.eventType === type.value }"
            @tap="form.eventType = type.value"
          >
            {{ type.label }}
          </view>
        </view>
      </view>
      <view class="form-divider" />

      <!-- 重复方式 -->
      <view class="form-row" @tap="showRepeatPicker = true">
        <text class="form-label">重复方式</text>
        <view class="form-value-row">
          <text class="form-value">{{ repeatLabel }}</text>
          <view class="arrow-right" />
        </view>
      </view>
      <view class="form-divider" />

      <!-- 提醒时间 -->
      <view class="form-row" @tap="showReminderPicker = true">
        <text class="form-label">提醒时间</text>
        <view class="form-value-row">
          <text class="form-value">{{ reminderLabel }}</text>
          <view class="arrow-right" />
        </view>
      </view>
      <view class="form-divider" />

      <!-- 备注 -->
      <view class="form-row form-row-top">
        <text class="form-label">备注</text>
        <textarea
          v-model="form.note"
          class="form-textarea"
          placeholder="写下一句想说的话"
          placeholder-class="input-placeholder"
          maxlength="200"
          :auto-height="true"
        />
      </view>
      <view class="form-divider" />

      <!-- 置顶显示 -->
      <view class="form-row">
        <text class="form-label">置顶显示</text>
        <switch
          :checked="form.pinned"
          color="#db7470"
          class="form-switch"
          @change="onSwitchChange"
        />
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="action-area">
      <button class="save-button" :loading="saving" @tap="onSave">
        {{ saving ? '保存中...' : '保存纪念日' }}
      </button>
      <text class="save-tip">保存后将在首页和时光轴中显示</text>
    </view>

    <image
      class="bottom-decoration"
      src="/static/anniversary/bottom-left-floral-sprig.png"
      mode="aspectFit"
    />

    <!-- 日期选择器 -->
    <view v-if="showDatePicker" class="picker-mask" @tap="cancelDatePicker">
      <view class="picker-sheet date-picker-sheet" @tap.stop>
        <view class="picker-handle" />
        <view class="picker-title">选择纪念日期</view>
        <picker-view
          class="date-picker-view"
          indicator-style="height: 88rpx;"
          :value="datePickerSelection"
          @change="onDateChange"
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
        </picker-view>
        <view class="date-picker-actions">
          <button class="date-action date-action-cancel" @tap="cancelDatePicker">取消</button>
          <button class="date-action date-action-confirm" @tap="confirmDatePicker">确定</button>
        </view>
      </view>
    </view>

    <!-- 重复方式选择器 -->
    <view v-if="showRepeatPicker" class="picker-mask" @tap="showRepeatPicker = false">
      <view class="picker-sheet" @tap.stop>
        <view class="picker-handle" />
        <view class="picker-title">选择重复方式</view>
        <view
          v-for="item in repeatOptions"
          :key="item.value"
          class="picker-option"
          :class="{ active: form.repeatType === item.value }"
          @tap="selectRepeat(item.value)"
        >
          <text>{{ item.label }}</text>
          <view v-if="form.repeatType === item.value" class="check-mark" />
        </view>
      </view>
    </view>

    <!-- 提醒时间选择器 -->
    <view v-if="showReminderPicker" class="picker-mask" @tap="showReminderPicker = false">
      <view class="picker-sheet" @tap.stop>
        <view class="picker-handle" />
        <view class="picker-title">选择提醒时间</view>
        <view
          v-for="item in reminderOptions"
          :key="item.value"
          class="picker-option"
          :class="{ active: form.reminderOffsetDays[0] === item.value }"
          @tap="selectReminder(item.value)"
        >
          <text>{{ item.label }}</text>
          <view v-if="form.reminderOffsetDays[0] === item.value" class="check-mark" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { formatBusinessDate } from '@/utils/date'
import type { AnniversaryType, AnniversaryRepeat } from '@/types/domain'
import { createAnniversary, updateAnniversary, getAnniversary } from '@/services/anniversary'

interface FormData {
  title: string
  targetDate: string
  eventType: AnniversaryType
  repeatType: AnniversaryRepeat
  reminderOffsetDays: number[]
  note: string
  pinned: boolean
}

const isEdit = ref(false)
const editId = ref('')
const editRevision = ref(1)
const saving = ref(false)
const showDatePicker = ref(false)
const showRepeatPicker = ref(false)
const showReminderPicker = ref(false)
const datePickerSelection = ref<number[]>([0, 0, 0])

const systemInfo = uni.getSystemInfoSync()

function getNavigationMetrics() {
  const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6

  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.top && menuButton?.height) {
      return { top: menuButton.top, height: menuButton.height }
    }
  } catch {
    // 非微信环境使用接近微信胶囊尺寸的回退值。
  }

  return { top: fallbackTop, height: 32 }
}

const navigationMetrics = getNavigationMetrics()
const viewportHeight = Number(systemInfo.windowHeight || systemInfo.screenHeight || 667)
const isCompactScreen = viewportHeight < 760
const isShortScreen = viewportHeight < 690
const pageStyle = {
  '--menu-top': `${navigationMetrics.top}px`,
  '--menu-height': `${navigationMetrics.height}px`
}

const form = reactive<FormData>({
  title: '相恋纪念日',
  targetDate: formatBusinessDate(new Date()),
  eventType: 'countdown',
  repeatType: 'yearly',
  reminderOffsetDays: [1],
  note: '',
  pinned: false
})

const eventTypes = [
  { label: '倒数日', value: 'countdown' as AnniversaryType },
  { label: '纪念日', value: 'anniversary' as AnniversaryType },
  { label: '生日', value: 'birthday' as AnniversaryType }
]

const repeatOptions = [
  { label: '每年', value: 'yearly' as AnniversaryRepeat },
  { label: '不重复', value: 'none' as AnniversaryRepeat }
]

const reminderOptions = [
  { label: '不提醒', value: 0 },
  { label: '提前 1 天', value: 1 },
  { label: '提前 3 天', value: 3 },
  { label: '提前 7 天', value: 7 }
]

const displayDate = computed(() => form.targetDate.replace(/-/g, '.'))

const repeatLabel = computed(() => {
  return repeatOptions.find(r => r.value === form.repeatType)?.label || '每年'
})

const reminderLabel = computed(() => {
  return reminderOptions.find(r => r.value === form.reminderOffsetDays[0])?.label || '提前 1 天'
})

// 日期选择器数据
const currentYear = new Date().getFullYear()
const dateYears = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i)
const dateDays = computed(() => {
  const year = dateYears[datePickerSelection.value[0]] || currentYear
  const month = (datePickerSelection.value[1] || 0) + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
})

function openDatePicker() {
  const [year, month, day] = form.targetDate.split('-').map(Number)
  datePickerSelection.value = [
    Math.max(0, dateYears.indexOf(year)),
    Math.max(0, month - 1),
    Math.max(0, day - 1)
  ]
  showDatePicker.value = true
}

function onSwitchChange(e: any) {
  form.pinned = e.detail.value
}

function onDateChange(e: any) {
  const [yIndex, mIndex, dIndex] = e.detail.value as number[]
  const year = dateYears[yIndex] || currentYear
  const month = mIndex + 1
  const maxDay = new Date(year, month, 0).getDate()
  datePickerSelection.value = [yIndex, mIndex, Math.min(dIndex, maxDay - 1)]
}

function cancelDatePicker() {
  showDatePicker.value = false
}

function confirmDatePicker() {
  const [yIndex, mIndex, dIndex] = datePickerSelection.value
  const year = dateYears[yIndex]
  const month = String(mIndex + 1).padStart(2, '0')
  const day = String(dIndex + 1).padStart(2, '0')
  form.targetDate = `${year}-${month}-${day}`
  showDatePicker.value = false
}

function selectRepeat(value: AnniversaryRepeat) {
  form.repeatType = value
  showRepeatPicker.value = false
}

function selectReminder(value: number) {
  form.reminderOffsetDays = [value]
  showReminderPicker.value = false
}

onLoad(async (options) => {
  if (options?.id) {
    isEdit.value = true
    editId.value = options.id
    try {
      const data = await getAnniversary(options.id)
      editRevision.value = data.revision || 1
      form.title = data.title
      form.targetDate = data.targetDate
      form.eventType = data.eventType
      form.repeatType = data.repeatType
      form.reminderOffsetDays = data.reminderOffsetDays.length > 0 ? data.reminderOffsetDays : [0]
      form.note = data.note
      form.pinned = data.pinned
    } catch (error) {
      const message = error instanceof Error ? error.message : '纪念日加载失败'
      uni.showToast({ title: message, icon: 'none' })
    }
  }
})

function goBack() {
  if (showDatePicker.value) {
    showDatePicker.value = false
    return
  }
  if (showRepeatPicker.value) {
    showRepeatPicker.value = false
    return
  }
  if (showReminderPicker.value) {
    showReminderPicker.value = false
    return
  }
  uni.navigateBack()
}

async function onSave() {
  if (!form.title.trim()) {
    uni.showToast({ title: '请输入纪念日名称', icon: 'none' })
    return
  }
  if (!form.targetDate) {
    uni.showToast({ title: '请选择纪念日期', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      eventType: form.eventType,
      targetDate: form.targetDate,
      repeatType: form.repeatType,
      reminderOffsetDays: form.reminderOffsetDays,
      note: form.note.trim(),
      pinned: form.pinned,
      visibility: 'private' as const
    }

    if (isEdit.value) {
      await updateAnniversary({ id: editId.value, revision: editRevision.value, ...payload })
    } else {
      await createAnniversary(payload)
    }

    saving.value = false
    uni.showToast({ title: isEdit.value ? '修改成功' : '添加成功', icon: 'success' })
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
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: auto;
  height: auto;
  min-height: 0;
  box-sizing: border-box;
  padding-bottom: calc(var(--love-safe-bottom) + 24rpx);
  background:
    radial-gradient(circle at 92% 38%, rgba(255, 253, 249, 0.7), transparent 40%),
    linear-gradient(180deg, #fbf3e9 0%, #fcf7ef 52%, #faf3ea 100%);
  overflow: hidden;
  color: #57483e;
}

/* 顶部导航 */
.nav-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(var(--menu-top) + var(--menu-height) + 20rpx);
}

.nav-back {
  position: absolute;
  left: 34rpx;
  top: var(--menu-top);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: var(--menu-height);
  transition: opacity 0.18s ease;

  &--pressed {
    opacity: 0.48;
  }

  .back-arrow {
    width: 24rpx;
    height: 24rpx;
    border-left: 4rpx solid #514238;
    border-bottom: 4rpx solid #514238;
    transform: rotate(45deg);
  }
}

.nav-title {
  position: absolute;
  top: var(--menu-top);
  left: 132rpx;
  right: 132rpx;
  height: var(--menu-height);
  line-height: var(--menu-height);
  text-align: center;
  font-size: 36rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  color: #4b3c32;
}

/* 顶部情侣花艺 */
.hero-decoration {
  position: relative;
  z-index: 1;
  width: 480rpx;
  height: 286rpx;
  margin: 14rpx 0 12rpx 18rpx;
  pointer-events: none;
}

.hero-decoration-image {
  width: 100%;
  height: 100%;
}

/* 表单卡片 */
.form-card {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  margin: 0 32rpx;
  padding: 6rpx 38rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 34rpx;
  background: rgba(252, 247, 241, 0.76);
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.9),
    inset 0 -1rpx 0 rgba(218, 199, 183, 0.18),
    0 16rpx 38rpx rgba(98, 67, 45, 0.1);
  backdrop-filter: blur(22rpx) saturate(112%);
  -webkit-backdrop-filter: blur(22rpx) saturate(112%);
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  min-height: 106rpx;
  padding: 18rpx 10rpx;
}

.form-row-top {
  align-items: center;
}

.form-label {
  flex: 0 0 218rpx;
  font-size: 29rpx;
  line-height: 1.25;
  font-weight: 600;
  color: #57473d;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  box-sizing: border-box;
  text-align: right;
  font-size: 28rpx;
  line-height: 44rpx;
  color: #625249;
  height: 52rpx;
}

.input-placeholder {
  color: #b8aea8;
}

.form-value-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 30rpx;
  min-width: 250rpx;
}

.form-value {
  font-size: 28rpx;
  color: #625249;
}

.arrow-right {
  width: 18rpx;
  height: 18rpx;
  margin-right: 2rpx;
  border-top: 4rpx solid #9e948d;
  border-right: 4rpx solid #9e948d;
  transform: rotate(45deg);
}

.form-textarea {
  flex: 1;
  box-sizing: border-box;
  text-align: right;
  font-size: 28rpx;
  color: #625249;
  min-height: 48rpx;
  max-height: 72rpx;
  line-height: 48rpx;
}

.form-switch {
  margin-right: -8rpx;
  transform: scale(0.86);
}

.form-divider {
  height: 1rpx;
  margin: 0 2rpx;
  background: rgba(218, 206, 196, 0.32);
}

/* 纪念类型选项 */
.type-options {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
}

.type-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 102rpx;
  height: 50rpx;
  padding: 0 21rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #625247;
  background: rgba(237, 229, 219, 0.72);
  border: 1rpx solid transparent;
  transition: all 0.2s ease;

  &.active {
    color: #fff;
    background: linear-gradient(135deg, #ee8580 0%, #dd6565 100%);
    border-color: rgba(218, 98, 98, 0.45);
    box-shadow: 0 6rpx 14rpx rgba(218, 105, 102, 0.16);
  }
}

/* 底部按钮 */
.action-area {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  margin-top: 42rpx;
}

.save-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 458rpx;
  height: 86rpx;
  padding: 0;
  border-radius: 46rpx;
  background: linear-gradient(135deg, #eb7e77 0%, #dd696b 100%);
  color: #fff;
  font-size: 32rpx;
  line-height: 86rpx;
  font-weight: 500;
  border: none;
  box-shadow: 0 12rpx 28rpx rgba(208, 96, 91, 0.24);

  &::after {
    border: 0;
  }

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

.save-tip {
  font-size: 24rpx;
  color: #99877b;
  letter-spacing: 1rpx;
}

.bottom-decoration {
  position: absolute;
  z-index: 0;
  left: -48rpx;
  bottom: -2rpx;
  width: 304rpx;
  height: 260rpx;
  opacity: 0.66;
  pointer-events: none;
}

/* 短屏按可用高度继续收紧，而不是裁切或隐藏页面内容。 */
.compact-screen {
  .nav-bar {
    height: calc(var(--menu-top) + var(--menu-height) + 12rpx);
  }

  .hero-decoration {
    width: 430rpx;
    height: 246rpx;
    margin-top: 4rpx;
    margin-bottom: 6rpx;
  }

  .form-row {
    min-height: 94rpx;
    padding-top: 14rpx;
    padding-bottom: 14rpx;
  }

  .action-area {
    margin-top: 28rpx;
  }
}

.short-screen {
  .hero-decoration {
    width: 350rpx;
    height: 178rpx;
    margin-top: 0;
  }

  .form-card {
    padding-top: 2rpx;
    padding-bottom: 2rpx;
  }

  .form-row {
    min-height: 80rpx;
  }

  .form-label {
    font-size: 26rpx;
  }

  .form-input,
  .form-value,
  .form-textarea {
    font-size: 25rpx;
  }

  .action-area {
    margin-top: 20rpx;
  }

  .save-button {
    height: 76rpx;
    line-height: 76rpx;
  }
}

/* 选择器遮罩 */
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

.picker-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 48rpx;
  font-size: 28rpx;
  color: var(--love-color-text);

  &.active {
    color: var(--love-color-primary);
    font-weight: 600;
  }
}

.check-mark {
  width: 16rpx;
  height: 28rpx;
  border-bottom: 4rpx solid var(--love-color-primary);
  border-right: 4rpx solid var(--love-color-primary);
  transform: rotate(45deg);
}

/* 日期选择器 */
.date-picker-sheet {
  padding-left: 34rpx;
  padding-right: 34rpx;
}

.date-picker-view {
  width: 100%;
  height: 390rpx;
  margin-top: 2rpx;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  font-size: 30rpx;
  color: var(--love-color-text);
}

.date-picker-actions {
  display: flex;
  gap: 20rpx;
  padding: 18rpx 6rpx 0;
}

.date-action {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 78rpx;
  margin: 0;
  padding: 0;
  border-radius: 40rpx;
  font-size: 28rpx;
  line-height: 78rpx;

  &::after {
    border: 0;
  }
}

.date-action-cancel {
  color: #77685e;
  background: #f2ebe4;
}

.date-action-confirm {
  color: #fff;
  background: linear-gradient(135deg, #eb7e77 0%, #dd696b 100%);
  box-shadow: 0 8rpx 20rpx rgba(208, 96, 91, 0.2);
}
</style>
