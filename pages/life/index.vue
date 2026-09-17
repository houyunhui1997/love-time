<template>
  <view class="life-page" :style="pageStyle">
    <view class="nav-bar">
      <text class="nav-title">恋时光生活</text>
    </view>

    <view class="life-content">
        <view class="intro">
          <text class="intro-copy">{{ currentCategory.description }}</text>
          <image class="intro-flower" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/botanical-sprig.png" mode="aspectFit" />
        </view>

        <view class="category-tabs">
          <view
            v-for="category in categories"
            :key="category.key"
            class="category-tab"
            :class="{ 'is-active': activeCategory === category.key }"
            @tap="activeCategory = category.key"
          >
            <text>{{ category.name }}</text>
          </view>
        </view>

        <view class="tool-grid">
          <view
            v-for="tool in currentCategory.tools"
            :key="tool.name"
            class="tool-card"
            @tap="openTool(tool)"
          >
            <image class="tool-art" :src="tool.image" mode="aspectFit" />
            <text class="tool-name">{{ tool.name }}</text>
            <text class="tool-description">{{ tool.description }}</text>
          </view>
        </view>

        <view class="closing-note">
          <uni-icons type="heart-filled" size="13" color="#e79b97" />
          <view class="closing-copy">
            <view class="closing-line" />
            <text>更多属于我们的生活，慢慢收集</text>
            <view class="closing-line" />
          </view>
          <image class="closing-flower" src="https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/botanical-sprig.png" mode="aspectFit" />
        </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'

interface LifeTool {
  name: string
  description: string
  image: string
  route?: string
}

interface LifeCategory {
  key: string
  name: string
  description: string
  tools: LifeTool[]
}

// 增减工具只需调整对应分类的数组，页面布局会自动适配。
const categories: LifeCategory[] = [
  {
    key: 'care',
    name: '日常关怀',
    description: '照顾好自己，也温柔陪伴彼此',
    tools: [
      { name: '经期管理', description: '记录身体变化', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/period-tracker.png', route: '/pages/period/index' },
      { name: '心情日历', description: '收藏今天的心情', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/mood-calendar.png' },
      { name: '习惯打卡', description: '一起养成好习惯', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/habit-checkin.png' }
    ]
  },
  {
    key: 'together',
    name: '一起生活',
    description: '把心愿写进共同的日子',
    tools: [
      { name: '心愿清单', description: '把想做的事，一起实现', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/wishlist.png', route: '/pages/wish/index' },
      { name: '偏好备忘', description: '记住彼此的小喜好', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/preference-notes.png', route: '/pages/preference/index' },
      { name: '约会计划', description: '把期待变成日程', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/date-planner.png' },
      { name: '共同小目标', description: '和你一起，慢慢变好', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/shared-goals.png' }
    ]
  },
  {
    key: 'play',
    name: '轻松互动',
    description: '给平凡日常添一点新鲜感',
    tools: [
      { name: '今天吃什么', description: '一起挑喜欢的晚餐', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/dinner-picker.png' },
      { name: '约会灵感', description: '发现下一次心动', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/date-ideas.png' },
      { name: '每日一问', description: '每天更了解彼此', image: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/life/daily-question.png' }
    ]
  }
]

const activeCategory = ref('together')
const currentCategory = computed(() => categories.find((category) => category.key === activeCategory.value) || categories[1])

onShareAppMessage(() => ({
  title: '恋时光 · 记录爱，纪念每一个值得的日子',
  path: '/pages/life/index',
  imageUrl: 'https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/official-account-cover.jpg'
}))

const systemInfo = uni.getSystemInfoSync()
function getNavigationMetrics() {
  const fallbackTop = Number(systemInfo.statusBarHeight || 20) + 6
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.top && menuButton?.height) return { top: menuButton.top, height: menuButton.height }
  } catch {
    // 非微信环境沿用与其他首页一致的导航栏回退尺寸。
  }
  return { top: fallbackTop, height: 32 }
}

const navigationMetrics = getNavigationMetrics()
const pageStyle = {
  '--menu-top': `${navigationMetrics.top}px`,
  '--menu-height': `${navigationMetrics.height}px`
}

function openTool(tool: LifeTool) {
  if (tool.route) {
    uni.navigateTo({ url: tool.route })
    return
  }
  uni.showToast({ title: `${tool.name}敬请期待`, icon: 'none' })
}
</script>

<style scoped lang="scss">
.life-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--love-color-bg);
  color: var(--love-color-text);
}

.life-page::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 540rpx;
  background: linear-gradient(180deg, #fff0ec 0%, rgba(255, 246, 241, 0.72) 54%, rgba(251, 247, 242, 0) 100%);
  content: '';
  pointer-events: none;
}

.nav-bar, .life-content { position: relative; z-index: 1; }
.nav-bar {
  position: relative;
  display: flex;
  height: calc(var(--menu-top) + var(--menu-height));
  flex: none;
  align-items: center;
  padding: var(--menu-top) 210rpx 0 42rpx;
}
.nav-title {
  color: #514137;
  font-size: 35rpx;
  font-weight: 600;
  line-height: var(--menu-height);
  letter-spacing: 1rpx;
  white-space: nowrap;
}

.life-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  padding: 12rpx 42rpx 22rpx;
}
.intro { position: relative; display: flex; height: 88rpx; flex: none; align-items: flex-start; }
.intro-copy {
  padding-top: 4rpx;
  color: var(--love-color-text-secondary);
  font-size: 26rpx;
  letter-spacing: 1rpx;
}
.intro-flower {
  position: absolute;
  top: -48rpx;
  right: -28rpx;
  width: 150rpx;
  height: 150rpx;
  opacity: 0.72;
  transform: rotate(-20deg);
  pointer-events: none;
}

.category-tabs {
  display: flex;
  height: 82rpx;
  flex: none;
  align-items: center;
  padding: 6rpx;
  border-radius: 44rpx;
  background: rgba(255, 253, 249, 0.94);
  box-shadow: 0 8rpx 24rpx rgba(97, 66, 45, 0.06);
}
.category-tab {
  position: relative;
  display: flex;
  min-width: 0;
  height: 70rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 38rpx;
  color: #796a60;
  font-size: 26rpx;
  white-space: nowrap;
}
.category-tab.is-active { background: #fdf0ed; color: var(--love-color-primary-strong); font-weight: 600; }

.tool-grid { display: grid; flex: none; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; margin-top: 24rpx; }
.tool-card {
  display: flex;
  min-width: 0;
  height: 250rpx;
  flex-direction: column;
  align-items: center;
  padding: 10rpx 10rpx 18rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 28rpx;
  background: rgba(252, 247, 241, 0.9);
  box-shadow: 0 12rpx 30rpx rgba(103, 73, 54, 0.08);
  text-align: center;
}
.tool-art { width: 198rpx; height: 150rpx; flex: none; }
.tool-name { color: #554238; font-size: 27rpx; font-weight: 600; line-height: 1.3; white-space: nowrap; }
.tool-description {
  margin-top: 5rpx;
  color: #99877c;
  font-size: 22rpx;
  line-height: 1.35;
  white-space: nowrap;
}

.closing-note {
  position: relative;
  display: flex;
  min-height: 70rpx;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 30rpx;
  color: var(--love-color-text-secondary);
}
.closing-copy {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 21rpx;
  white-space: nowrap;
}
.closing-line { width: 32rpx; height: 1rpx; background: var(--love-color-divider); }
.closing-flower {
  position: absolute;
  right: -36rpx;
  bottom: -22rpx;
  width: 108rpx;
  height: 108rpx;
  opacity: 0.4;
  pointer-events: none;
}

@media screen and (max-height: 700px) {
  .intro { height: 70rpx; }
  .tool-grid { margin-top: 18rpx; }
  .tool-card { height: 220rpx; }
  .tool-art { height: 126rpx; }
  .closing-note { min-height: 56rpx; margin-top: 22rpx; }
}
</style>
