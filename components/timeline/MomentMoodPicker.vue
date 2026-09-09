<template>
  <view v-if="visible" class="mood-picker-mask" @tap="close">
    <view class="mood-picker-sheet" @tap.stop>
      <view class="picker-handle" />
      <text class="picker-title">选择此刻心情</text>
      <text class="picker-subtitle">选一个最贴近现在的感受</text>

      <scroll-view scroll-y class="mood-groups" :show-scrollbar="false">
        <view v-for="group in MOMENT_MOOD_GROUPS" :key="group.label" class="mood-group">
          <view class="group-title">
            <uni-icons type="circle-filled" size="11" :color="toneColor(group.tone)" />
            <text>{{ group.label }}</text>
          </view>
          <view class="mood-grid">
            <view
              v-for="option in group.options"
              :key="option.value"
              class="mood-option"
              :class="[{ active: draftMood === option.value }, `tone-${option.tone}`]"
              @tap="draftMood = option.value"
            >
              <uni-icons
                :type="option.icon"
                size="17"
                :color="draftMood === option.value ? '#ffffff' : toneColor(option.tone)"
              />
              <text>{{ option.label }}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="picker-actions">
        <button class="picker-action picker-cancel" @tap="close">取消</button>
        <button class="picker-action picker-confirm" @tap="confirm">确定</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { MOMENT_MOOD_GROUPS } from '@/constants/moment-moods'
import type { MomentMood } from '@/types/domain'

const props = defineProps<{
  visible: boolean
  modelValue: MomentMood
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'confirm', value: MomentMood): void
}>()

const draftMood = ref<MomentMood>(props.modelValue)

watch(
  () => props.visible,
  (visible) => {
    if (visible) draftMood.value = props.modelValue
  }
)

function toneColor(tone: 'joy' | 'tender' | 'quiet' | 'low') {
  const colors = {
    joy: '#eda655',
    tender: '#e88182',
    quiet: '#87b4c9',
    low: '#a993c3'
  }
  return colors[tone]
}

function close() {
  emit('update:visible', false)
}

function confirm() {
  emit('confirm', draftMood.value)
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.mood-picker-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  background: rgba(61, 47, 40, 0.42);
}

.mood-picker-sheet {
  display: flex;
  width: 100%;
  height: 1040rpx;
  max-height: calc(100vh - 110rpx);
  flex-direction: column;
  padding: 17rpx 30rpx calc(env(safe-area-inset-bottom) + 24rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 38rpx 38rpx 0 0;
  background: #fcf7f1;
  box-shadow: 0 -18rpx 54rpx rgba(65, 44, 31, 0.16);
}

.picker-handle {
  width: 70rpx;
  height: 7rpx;
  flex: 0 0 auto;
  margin: 0 auto 25rpx;
  border-radius: 4rpx;
  background: #ddd2ca;
}

.picker-title,
.picker-subtitle {
  display: block;
  flex: 0 0 auto;
  text-align: center;
}

.picker-title {
  color: #514137;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.35;
}

.picker-subtitle {
  margin-top: 7rpx;
  color: #9b877a;
  font-size: 23rpx;
  line-height: 1.4;
}

.mood-groups {
  min-height: 0;
  flex: 1;
  margin-top: 19rpx;
}

.mood-group + .mood-group {
  margin-top: 17rpx;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 4rpx;
  color: #5d4b40;
  font-size: 25rpx;
  font-weight: 600;
  line-height: 1.35;
}

.mood-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 11rpx;
}

.mood-option {
  display: flex;
  height: 66rpx;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border: 1rpx solid rgba(222, 205, 192, 0.58);
  border-radius: 18rpx;
  background: rgba(255, 253, 249, 0.7);
  box-shadow: 0 5rpx 12rpx rgba(94, 65, 48, 0.035);
  color: #705d51;
  font-size: 23rpx;
  line-height: 1;
}

.mood-option.active {
  border-color: transparent;
  background: linear-gradient(135deg, #ec817a 0%, #dc696b 100%);
  box-shadow: 0 7rpx 18rpx rgba(207, 96, 92, 0.2);
  color: #fff;
}

.picker-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 20rpx;
  padding: 22rpx 6rpx 0;
}

.picker-action {
  display: flex;
  height: 76rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border-radius: 40rpx;
  font-size: 27rpx;
  line-height: 76rpx;
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
