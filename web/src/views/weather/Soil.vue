<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>墒情分析</span>
          <div>
            <el-select v-model="deviceId" style="width: 160px; margin-right: 8px">
              <el-option v-for="d in devices" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
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
import { getSoil } from '@/api/weather'

const devices = ref<any[]>([])
const deviceId = ref('')
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
  const res: any = await getSoil({ deviceId: deviceId.value })
  const data = res.data || []

  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['土壤温度(℃)', '土壤水分(%)', '土壤电导率(mS/cm)'] },
    xAxis: { type: 'category', data: data.map((d: any) => d.timestamp) },
    yAxis: [
      { type: 'value', name: '温度(℃) / 水分(%)' },
      { type: 'value', name: '电导率(mS/cm)' },
    ],
    series: [
      { name: '土壤温度(℃)', type: 'line', data: data.map((d: any) => d.soil_temp), smooth: true },
      { name: '土壤水分(%)', type: 'line', data: data.map((d: any) => d.soil_moisture), smooth: true },
      { name: '土壤电导率(mS/cm)', type: 'line', yAxisIndex: 1, data: data.map((d: any) => d.soil_ec), smooth: true },
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
