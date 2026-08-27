<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>积温积光统计</span>
          <div>
            <el-select v-model="deviceId" style="width: 160px; margin-right: 8px">
              <el-option v-for="d in devices" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="margin-right: 8px" />
            <el-button type="primary" @click="loadData">查询</el-button>
          </div>
        </div>
      </template>
      <div ref="chartRef" style="height: 400px"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { getDevices } from '@/api/device'
import { getAccumulation } from '@/api/weather'

const devices = ref<any[]>([])
const deviceId = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

async function loadDevices() {
  const res: any = await getDevices({ type: 'weather', pageSize: 100 })
  devices.value = res.data?.list || []
  if (devices.value.length) {
    deviceId.value = devices.value[0].id
    loadData()
  }
}

async function loadData() {
  if (!deviceId.value || !chartRef.value) return
  const params: any = { deviceId: deviceId.value }
  if (dateRange.value) {
    params.from = dateRange.value[0].toISOString()
    params.to = dateRange.value[1].toISOString()
  }
  const res: any = await getAccumulation(params)
  const data = res.data || []

  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['累计积温(℃·d)', '累计光照(h)'] },
    xAxis: { type: 'category', data: data.map((d: any) => d.date) },
    yAxis: [
      { type: 'value', name: '积温(℃·d)' },
      { type: 'value', name: '光照(h)' },
    ],
    series: [
      { name: '累计积温(℃·d)', type: 'line', data: data.map((d: any) => d.cumulative_temp), smooth: true, areaStyle: { opacity: 0.3 } },
      { name: '累计光照(h)', type: 'line', yAxisIndex: 1, data: data.map((d: any) => d.cumulative_light), smooth: true, areaStyle: { opacity: 0.3 } },
    ],
  })
}

onMounted(() => {
  loadDevices()
  window.addEventListener('resize', () => chart?.resize())
})
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
</style>
