<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { restoreWeixinSession } from '@/services/auth'

onLaunch(() => {
  restoreWeixinSession()
})
</script>

<style lang="scss">
@import '@/styles/global.scss';
</style>
