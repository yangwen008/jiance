<template>
  <view class="page">
    <view class="device-select">
      <picker :range="deviceNames" @change="onDeviceChange">
        <view class="picker-btn">{{ currentDeviceName || '选择设备' }} ▼</view>
      </picker>
    </view>

    <view v-if="latest" class="card">
      <text class="card-title">实时气象数据</text>
      <view class="data-grid">
        <view class="data-item"><text class="data-label">空气温度</text><text class="data-value">{{ latest.air_temp ?? '-' }}℃</text></view>
        <view class="data-item"><text class="data-label">空气湿度</text><text class="data-value">{{ latest.air_humidity ?? '-' }}%</text></view>
        <view class="data-item"><text class="data-label">土壤温度</text><text class="data-value">{{ latest.soil_temp ?? '-' }}℃</text></view>
        <view class="data-item"><text class="data-label">土壤水分</text><text class="data-value">{{ latest.soil_moisture ?? '-' }}%</text></view>
        <view class="data-item"><text class="data-label">光照强度</text><text class="data-value">{{ latest.light ?? '-' }}Lux</text></view>
        <view class="data-item"><text class="data-label">风速</text><text class="data-value">{{ latest.wind_speed ?? '-' }}m/s</text></view>
        <view class="data-item"><text class="data-label">降雨量</text><text class="data-value">{{ latest.rainfall ?? '-' }}mm</text></view>
        <view class="data-item"><text class="data-label">大气压</text><text class="data-value">{{ latest.pressure ?? '-' }}hPa</text></view>
      </view>
      <text class="update-time">更新时间：{{ latest.timestamp }}</text>
    </view>
    <view v-else class="empty"><text>暂无数据</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getDevices } from '../../api/device'
import { getLatestWeather } from '../../api/weather'

const devices = ref<Record<string, unknown>[]>([])
const currentDevice = ref('')
const latest = ref<Record<string, unknown> | null>(null)

const deviceNames = computed(() => devices.value.map((d: Record<string, unknown>) => d.name as string))
const currentDeviceName = computed(() => {
  const d = devices.value.find((d: Record<string, unknown>) => d.id === currentDevice.value)
  return d?.name as string || ''
})

function onDeviceChange(e: { detail: { value: number } }) {
  currentDevice.value = devices.value[e.detail.value].id as string
  loadLatest()
}

async function loadDevices() {
  const res = await getDevices({ type: 'weather', pageSize: 100 })
  devices.value = (res.data as Record<string, unknown>)?.list as Record<string, unknown>[] || []
  if (devices.value.length) {
    currentDevice.value = devices.value[0].id as string
    loadLatest()
  }
}

async function loadLatest() {
  if (!currentDevice.value) return
  const res = await getLatestWeather(currentDevice.value)
  latest.value = res.data as Record<string, unknown>
}

onMounted(loadDevices)
</script>

<style scoped>
.page { padding: 24rpx; }
.device-select { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 24rpx; }
.picker-btn { font-size: 28rpx; color: #333; }
.card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.card-title { font-size: 30rpx; font-weight: bold; display: block; margin-bottom: 24rpx; }
.data-grid { display: flex; flex-wrap: wrap; }
.data-item { width: 50%; padding: 16rpx 0; }
.data-label { font-size: 24rpx; color: #999; display: block; }
.data-value { font-size: 36rpx; font-weight: bold; color: #333; }
.update-time { font-size: 22rpx; color: #999; display: block; margin-top: 16rpx; text-align: right; }
.empty { text-align: center; padding: 100rpx; color: #999; }
</style>
