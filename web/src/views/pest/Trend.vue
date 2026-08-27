<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>虫量趋势分析</span>
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
import { getTrend } from '@/api/pest'

const devices = ref<any[]>([])
const deviceId = ref('')
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

async function loadDevices() {
  const res: any = await getDevices({ type: 'pest_monitor', pageSize: 100 })
  devices.value = res.data?.list || []
  if (devices.value.length) {
    deviceId.value = devices.value[0].id
    loadData()
  }
}

async function loadData() {
  if (!deviceId.value || !chartRef.value) return
  const res: any = await getTrend({ deviceId: deviceId.value })
  const data = res.data || []

  const periods = [...new Set(data.map((d: any) => d.period))] as string[]
  const species = [...new Set(data.map((d: any) => d.pest_type))] as string[]

  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: species },
    xAxis: { type: 'category', data: periods },
    yAxis: { type: 'value', name: '虫量' },
    series: species.map((s) => ({
      name: s,
      type: 'bar',
      stack: 'total',
      data: periods.map((p) => {
        const item = data.find((d: any) => d.period === p && d.pest_type === s)
        return item?.total_count || 0
      }),
    })),
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
