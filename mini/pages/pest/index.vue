<template>
  <view class="page">
    <view class="section">
      <text class="section-title">🐛 实时虫情</text>
      <view v-for="item in pestList" :key="item.id" class="pest-card">
        <view class="pest-header">
          <text class="pest-type">{{ item.pest_type || '未知害虫' }}</text>
          <text class="pest-count">{{ item.count }}头</text>
        </view>
        <view class="pest-info">
          <text class="pest-conf">置信度：{{ item.confidence ? item.confidence + '%' : '-' }}</text>
          <text class="pest-cat">{{ item.category || '-' }}</text>
        </view>
        <view class="pest-footer">
          <text class="pest-time">{{ item.timestamp }}</text>
          <view v-if="item.verified" class="verified">已复核</view>
          <view v-else class="unverified">待复核</view>
        </view>
      </view>
      <text v-if="!pestList.length" class="empty">暂无虫情数据</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getLatestPest } from '../../api/pest'

const pestList = ref<Record<string, unknown>[]>([])

async function loadData() {
  const res = await getLatestPest()
  pestList.value = (res.data as unknown[]) || []
}

onMounted(loadData)
</script>

<style scoped>
.page { padding: 24rpx; }
.section { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.section-title { font-size: 30rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.pest-card { padding: 20rpx 0; border-bottom: 1px solid #f0f0f0; }
.pest-header { display: flex; justify-content: space-between; align-items: center; }
.pest-type { font-size: 30rpx; font-weight: bold; }
.pest-count { font-size: 32rpx; color: #e6a23c; font-weight: bold; }
.pest-info { display: flex; gap: 24rpx; margin-top: 8rpx; }
.pest-conf, .pest-cat { font-size: 24rpx; color: #999; }
.pest-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.pest-time { font-size: 22rpx; color: #999; }
.verified { font-size: 22rpx; color: #67c23a; background: #f0f9eb; padding: 4rpx 12rpx; border-radius: 4rpx; }
.unverified { font-size: 22rpx; color: #e6a23c; background: #fdf6ec; padding: 4rpx 12rpx; border-radius: 4rpx; }
.empty { font-size: 26rpx; color: #999; text-align: center; padding: 64rpx; }
</style>
