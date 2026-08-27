<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">在线设备</div>
              <div class="stat-value">{{ stats.onlineDevices }}</div>
            </div>
            <el-icon class="stat-icon" style="color: #67c23a"><Monitor /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">今日虫情</div>
              <div class="stat-value">{{ stats.todayPest }}</div>
            </div>
            <el-icon class="stat-icon" style="color: #e6a23c"><Bug /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">未读预警</div>
              <div class="stat-value">{{ stats.unreadAlerts }}</div>
            </div>
            <el-icon class="stat-icon" style="color: #f56c6c"><WarningFilled /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">待处理订单</div>
              <div class="stat-value">{{ stats.pendingOrders }}</div>
            </div>
            <el-icon class="stat-icon" style="color: #409eff"><Document /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 气象趋势图 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>气象数据趋势</span>
              <el-select v-model="weatherDeviceId" size="small" style="width: 200px" @change="loadWeather">
                <el-option v-for="d in devices" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </div>
          </template>
          <div ref="weatherChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>

      <!-- 虫情分布图 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>虫害种类分布</span>
            </div>
          </template>
          <div ref="pestChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <!-- GIS地图 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>监测点位分布</span></template>
          <div ref="mapRef" style="height: 300px"></div>
        </el-card>
      </el-col>

      <!-- 最新预警 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>最新预警</span></template>
          <el-table :data="recentAlerts" size="small" max-height="260">
            <el-table-column prop="created_at" label="时间" width="160" />
            <el-table-column prop="sensor_type" label="类型" width="100" />
            <el-table-column prop="message" label="内容" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'unread' ? 'danger' : 'success'" size="small">
                  {{ row.status === 'unread' ? '未读' : '已读' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getDevices } from '@/api/device'
import { getLatestAll, getStats } from '@/api/weather'
import { getSpecies } from '@/api/pest'
import { getAlertLogs, getUnreadCount } from '@/api/alert'
import { getOrderStats } from '@/api/order'

const devices = ref<any[]>([])
const weatherDeviceId = ref('')
const weatherChartRef = ref<HTMLElement>()
const pestChartRef = ref<HTMLElement>()
const mapRef = ref<HTMLElement>()
const recentAlerts = ref<any[]>([])

const stats = reactive({
  onlineDevices: 0,
  todayPest: 0,
  unreadAlerts: 0,
  pendingOrders: 0,
})

let weatherChart: echarts.ECharts | null = null
let pestChart: echarts.ECharts | null = null

// 高德地图 API Key（请替换为你自己的 Key）
const AMAP_KEY = '***'

function loadMap() {
  if (!mapRef.value) return
  const script = document.createElement('script')
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`
  script.onload = () => {
    // @ts-ignore
    const map = new AMap.Map(mapRef.value, {
      zoom: 12,
      mapStyle: 'amap://styles/normal',
    })

    // 添加设备标注
    // @ts-ignore
    const markers: any[] = []
    const typeColors: Record<string, string> = {
      weather: '#409eff',
      camera: '#67c23a',
      pest_monitor: '#e6a23c',
      multispectral: '#909399',
    }
    const typeNames: Record<string, string> = {
      weather: '气象站',
      camera: '摄像头',
      pest_monitor: '虫情仪',
      multispectral: '多光谱',
    }

    for (const device of devices.value) {
      if (!device.lat || !device.lng) continue
      // @ts-ignore
      const marker = new AMap.Marker({
        position: [device.lng, device.lat],
        title: device.name,
      })
      const color = typeColors[device.type] || '#909399'
      marker.setLabel({
        direction: 'top',
        offset: [0, -5],
        content: `<div style="background:${color};color:#fff;padding:2px 6px;border-radius:3px;font-size:12px;white-space:nowrap">${device.name}</div>`,
      })
      // @ts-ignore
      marker.on('click', () => {
        // @ts-ignore
        const info = new AMap.InfoWindow({
          content: `<div style="padding:8px"><b>${device.name}</b><br/>类型：${typeNames[device.type] || device.type}<br/>状态：${device.status === 'online' ? '在线' : '离线'}<br/>位置：${device.village || '-'}</div>`,
          offset: [0, -30],
        })
        info.open(map, marker.getPosition())
      })
      markers.push(marker)
    }

    if (markers.length) {
      map.add(markers)
      // @ts-ignore
      map.setFitView(markers, false, [50, 50, 50, 50])
    }
  }
  script.onerror = () => {
    if (mapRef.value) {
      mapRef.value.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999">地图加载失败，请检查 API Key</div>'
    }
  }
  document.head.appendChild(script)
}

async function loadDevices() {
  try {
    const res: any = await getDevices({ pageSize: 100 })
    devices.value = res.data?.list || []
    stats.onlineDevices = devices.value.filter((d: any) => d.status === 'online').length
    if (devices.value.length) {
      weatherDeviceId.value = devices.value[0].id
      await loadWeather()  // ✅ 添加 await，确保异步错误被捕获
    }
  } catch (err) {
    console.error('[Dashboard] 加载设备失败:', err)
  }
}

async function loadWeather() {
  if (!weatherDeviceId.value || !weatherChartRef.value) return
  try {
    const res: any = await getStats({ deviceId: weatherDeviceId.value, period: 'day' })
    const data = res.data || []

    if (!weatherChart) {
      weatherChart = echarts.init(weatherChartRef.value)
    }
    weatherChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['温度', '湿度', '降雨量'] },
      xAxis: { type: 'category', data: data.map((d: any) => d.date) },
      yAxis: [
        { type: 'value', name: '温度(℃)/湿度(%)' },
        { type: 'value', name: '降雨(mm)' },
      ],
      series: [
        { name: '温度', type: 'line', data: data.map((d: any) => d.temp_avg), smooth: true },
        { name: '湿度', type: 'line', data: data.map((d: any) => d.humidity_avg), smooth: true },
        { name: '降雨量', type: 'bar', yAxisIndex: 1, data: data.map((d: any) => d.rainfall_total) },
      ],
    })
  } catch (err) {
    console.error('[Dashboard] 加载气象数据失败:', err)
  }
}

async function loadPestChart() {
  if (!pestChartRef.value) return
  try {
    const res: any = await getSpecies({})
    const data = res.data || []
    if (!pestChart) {
      pestChart = echarts.init(pestChartRef.value)
    }
    pestChart.setOption({
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: data.map((d: any) => ({ name: d.species || '未知', value: d.total_count })),
          label: { formatter: '{b}: {c}' },
        },
      ],
    })
  } catch (err) {
    console.error('[Dashboard] 加载虫情图表失败:', err)
  }
}

async function loadAlerts() {
  try {
    const res: any = await getAlertLogs({ pageSize: 5 })
    recentAlerts.value = res.data?.list || []
    const unreadRes: any = await getUnreadCount()
    stats.unreadAlerts = unreadRes.data?.count || 0
  } catch (err) {
    console.error('[Dashboard] 加载预警失败:', err)
  }
}

async function loadOrders() {
  try {
    const res: any = await getOrderStats()
    const pending = res.data?.byStatus?.find((s: any) => s.status === 'pending')
    stats.pendingOrders = pending?.count || 0
  } catch (err) {
    console.error('[Dashboard] 加载订单统计失败:', err)
  }
}

async function loadPestCount() {
  try {
    const res: any = await getSpecies({})
    stats.todayPest = (res.data || []).reduce((sum: number, d: any) => sum + (d.total_count || 0), 0)
  } catch (err) {
    console.error('[Dashboard] 加载虫情统计失败:', err)
  }
}

onMounted(async () => {
  await loadDevices()
  loadPestChart()
  loadAlerts()
  loadOrders()
  loadPestCount()
  loadMap()

  window.addEventListener('resize', () => {
    weatherChart?.resize()
    pestChart?.resize()
  })
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}
.stat-row {
  margin-bottom: 16px;
}
.stat-card .stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stat-label {
  font-size: 14px;
  color: #909399;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-top: 4px;
}
.stat-icon {
  font-size: 48px;
  opacity: 0.8;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
