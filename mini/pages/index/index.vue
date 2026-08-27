<template>
  <view class="page">
    <!-- 未登录 -->
    <view v-if="!userStore.isLoggedIn" class="login-card">
      <text class="title">🌾 农业虫情监测平台</text>
      <text class="subtitle">请先登录</text>
      <input v-model="phone" placeholder="手机号" type="number" class="input" />
      <input v-model="password" placeholder="密码" type="password" class="input" />
      <button class="btn-primary" @tap="handleLogin">登 录</button>
    </view>

    <!-- 已登录 - 概览 -->
    <view v-else>
      <!-- 统计卡片 -->
      <view class="stat-row">
        <view class="stat-card">
          <text class="stat-value">{{ stats.onlineDevices }}</text>
          <text class="stat-label">在线设备</text>
        </view>
        <view class="stat-card warn">
          <text class="stat-value">{{ stats.unreadAlerts }}</text>
          <text class="stat-label">未读预警</text>
        </view>
      </view>

      <!-- 最新气象 -->
      <view class="section" v-if="latestWeather">
        <text class="section-title">🌤 最新气象数据</text>
        <view class="info-grid">
          <view class="info-item"><text class="info-label">气温</text><text class="info-value">{{ latestWeather.air_temp ?? '-' }}℃</text></view>
          <view class="info-item"><text class="info-label">湿度</text><text class="info-value">{{ latestWeather.air_humidity ?? '-' }}%</text></view>
          <view class="info-item"><text class="info-label">风速</text><text class="info-value">{{ latestWeather.wind_speed ?? '-' }}m/s</text></view>
          <view class="info-item"><text class="info-label">降雨</text><text class="info-value">{{ latestWeather.rainfall ?? '-' }}mm</text></view>
        </view>
      </view>

      <!-- 最新虫情 -->
      <view class="section">
        <text class="section-title">🐛 最新虫情</text>
        <view v-for="item in latestPest" :key="item.id" class="pest-item">
          <text class="pest-name">{{ item.pest_type || '未知' }}</text>
          <text class="pest-count">{{ item.count }}头</text>
          <text class="pest-time">{{ item.timestamp }}</text>
        </view>
        <text v-if="!latestPest.length" class="empty">暂无虫情数据</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { getLatestWeatherAll } from '../../api/weather'
import { getLatestPest } from '../../api/pest'
import { getUnreadCount } from '../../api/alert'

const userStore = useUserStore()
const phone = ref('')
const password = ref('')
const latestWeather = ref<Record<string, unknown> | null>(null)
const latestPest = ref<Record<string, unknown>[]>([])
const stats = reactive({ onlineDevices: 0, unreadAlerts: 0 })

async function handleLogin() {
  if (!phone.value || !password.value) return uni.showToast({ title: '请输入手机号和密码', icon: 'none' })
  try {
    await userStore.login(phone.value, password.value)
    uni.showToast({ title: '登录成功', icon: 'success' })
    loadData()
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message || '登录失败', icon: 'none' })
  }
}

async function loadData() {
  try {
    const [weatherRes, pestRes, alertRes] = await Promise.all([
      getLatestWeatherAll(),
      getLatestPest(),
      getUnreadCount(),
    ])
    const weatherList = (weatherRes.data as unknown[]) || []
    if (weatherList.length) latestWeather.value = weatherList[0] as Record<string, unknown>
    stats.onlineDevices = weatherList.length
    latestPest.value = ((pestRes.data as unknown[]) || []).slice(0, 5) as Record<string, unknown>[]
    stats.unreadAlerts = ((alertRes.data as Record<string, unknown>)?.count as number) || 0
  } catch {}
}

onMounted(() => {
  if (userStore.isLoggedIn) loadData()
})
</script>

<style scoped>
.page { padding: 24rpx; }
.login-card { background: #fff; border-radius: 16rpx; padding: 48rpx; margin-top: 200rpx; text-align: center; }
.title { font-size: 40rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.subtitle { font-size: 28rpx; color: #999; display: block; margin-bottom: 48rpx; }
.input { border: 1px solid #ddd; border-radius: 8rpx; padding: 20rpx; margin-bottom: 24rpx; font-size: 28rpx; }
.btn-primary { background: #2979ff; color: #fff; border-radius: 8rpx; font-size: 30rpx; }
.stat-row { display: flex; gap: 24rpx; margin-bottom: 24rpx; }
.stat-card { flex: 1; background: #fff; border-radius: 12rpx; padding: 32rpx; text-align: center; }
.stat-card.warn .stat-value { color: #e6a23c; }
.stat-value { font-size: 48rpx; font-weight: bold; color: #333; display: block; }
.stat-label { font-size: 24rpx; color: #999; display: block; margin-top: 8rpx; }
.section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 24rpx; }
.section-title { font-size: 30rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.info-grid { display: flex; flex-wrap: wrap; }
.info-item { width: 50%; padding: 12rpx 0; }
.info-label { font-size: 24rpx; color: #999; display: block; }
.info-value { font-size: 32rpx; font-weight: bold; color: #333; }
.pest-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1px solid #f0f0f0; }
.pest-name { flex: 1; font-size: 28rpx; }
.pest-count { font-size: 28rpx; color: #e6a23c; margin-right: 16rpx; }
.pest-time { font-size: 22rpx; color: #999; }
.empty { font-size: 26rpx; color: #999; text-align: center; padding: 32rpx; }
</style>
