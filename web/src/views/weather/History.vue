<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>历史数据查询</span>
          <div>
            <el-select v-model="deviceId" style="width: 160px; margin-right: 8px">
              <el-option v-for="d in devices" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="margin-right: 8px" />
            <el-button type="primary" @click="loadData">查询</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column prop="air_temp" label="气温(℃)" width="100" />
        <el-table-column prop="air_humidity" label="湿度(%)" width="100" />
        <el-table-column prop="soil_temp" label="土温(℃)" width="100" />
        <el-table-column prop="soil_moisture" label="水分(%)" width="100" />
        <el-table-column prop="light" label="光照(Lux)" width="110" />
        <el-table-column prop="wind_speed" label="风速(m/s)" width="100" />
        <el-table-column prop="rainfall" label="降雨(mm)" width="100" />
        <el-table-column prop="pressure" label="气压(hPa)" width="110" />
      </el-table>

      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDevices } from '@/api/device'
import { getHistory } from '@/api/weather'

const devices = ref<any[]>([])
const deviceId = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const tableData = ref<any[]>([])
const page = ref(1)
const pageSize = 50
const total = ref(0)

async function loadDevices() {
  const res: any = await getDevices({ type: 'weather', pageSize: 100 })
  devices.value = res.data?.list || []
  if (devices.value.length) {
    deviceId.value = devices.value[0].id
    loadData()
  }
}

async function loadData() {
  if (!deviceId.value) return
  const params: any = { deviceId: deviceId.value, page: page.value, pageSize }
  if (dateRange.value) {
    params.from = dateRange.value[0].toISOString()
    params.to = dateRange.value[1].toISOString()
  }
  const res: any = await getHistory(params)
  tableData.value = res.data?.list || []
  total.value = res.data?.total || 0
}

onMounted(loadDevices)
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
