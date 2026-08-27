<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input v-model="keyword" placeholder="搜索服务商" class="search-input" @confirm="loadData" />
    </view>

    <!-- 筛选标签 -->
    <view class="tabs">
      <view :class="['tab', type === '' && 'active']" @tap="type = ''; loadData()">全部</view>
      <view :class="['tab', type === 'machinery' && 'active']" @tap="type = 'machinery'; loadData()">农机</view>
      <view :class="['tab', type === 'dryer' && 'active']" @tap="type = 'dryer'; loadData()">烘干</view>
    </view>

    <!-- 服务商列表 -->
    <view v-for="p in providers" :key="p.id" class="provider-card" @tap="goDetail(p.id)">
      <view class="provider-header">
        <text class="provider-name">{{ p.name }}</text>
        <view :class="['status-tag', p.audit_status]">{{ statusMap[p.audit_status as string] }}</view>
      </view>
      <text class="provider-type">{{ p.type === 'machinery' ? '农机服务' : '烘干服务' }}</text>
      <text class="provider-phone">📞 {{ p.phone }}</text>
    </view>
    <text v-if="!providers.length" class="empty">暂无服务商</text>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getProviders } from '../../api/service'

const keyword = ref('')
const type = ref('')
const providers = ref<Record<string, unknown>[]>([])
const statusMap: Record<string, string> = { pending: '待审核', approved: '已认证', rejected: '已拒绝' }

async function loadData() {
  const params: Record<string, unknown> = { pageSize: 50 }
  if (type.value) params.type = type.value
  if (keyword.value) params.keyword = keyword.value
  const res = await getProviders(params)
  providers.value = (res.data as Record<string, unknown>)?.list as Record<string, unknown>[] || []
}

function goDetail(id: unknown) {
  uni.navigateTo({ url: `/pages/service/detail?id=${id}` })
}

onMounted(loadData)
</script>

<style scoped>
.page { padding: 24rpx; }
.search-bar { margin-bottom: 16rpx; }
.search-input { background: #fff; border-radius: 8rpx; padding: 16rpx 24rpx; font-size: 28rpx; }
.tabs { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.tab { padding: 12rpx 32rpx; background: #fff; border-radius: 32rpx; font-size: 26rpx; color: #666; }
.tab.active { background: #2979ff; color: #fff; }
.provider-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.provider-header { display: flex; justify-content: space-between; align-items: center; }
.provider-name { font-size: 30rpx; font-weight: bold; }
.status-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 4rpx; }
.status-tag.approved { color: #67c23a; background: #f0f9eb; }
.status-tag.pending { color: #e6a23c; background: #fdf6ec; }
.status-tag.rejected { color: #f56c6c; background: #fef0f0; }
.provider-type { font-size: 24rpx; color: #999; display: block; margin-top: 8rpx; }
.provider-phone { font-size: 26rpx; color: #666; display: block; margin-top: 8rpx; }
.empty { text-align: center; padding: 64rpx; color: #999; }
</style>
