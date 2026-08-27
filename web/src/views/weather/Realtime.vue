<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>实时气象数据</span>
          <el-select v-model="deviceId" style="width: 200px" @change="loadData">
            <el-option v-for="d in devices" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </div>
      </template>

      <el-descriptions :column="3" border v-if="latest">
        <el-descriptions-item label="空气温度">{{ latest.air_temp ?? '-' }} ℃</el-descriptions-item>
        <el-descriptions-item label="空气湿度">{{ latest.air_humidity ?? '-' }} %RH</el-descriptions-item>
        <el-descriptions-item label="光照强度">{{ latest.light ?? '-' }} Lux</el-descriptions-item>
        <el-descriptions-item label="土壤温度">{{ latest.soil_temp ?? '-' }} ℃</el-descriptions-item>
        <el-descriptions-item label="土壤水分">{{ latest.soil_moisture ?? '-' }} %</el-descriptions-item>
        <el-descriptions-item label="土壤电导率">{{ latest.soil_ec ?? '-' }} mS/cm</el-descriptions-item>
        <el-descriptions-item label="风向">{{ latest.wind_dir ?? '-' }} °</el-descriptions-item>
        <el-descriptions-item label="风速">{{ latest.wind_speed ?? '-' }} m/s</el-descriptions-item>
        <el-descriptions-item label="降雨量">{{ latest.rainfall ?? '-' }} mm</el-descriptions-item>
        <el-descriptions-item label="大气压">{{ latest.pressure ?? '-' }} hPa</el-descriptions-item>
        <el-descriptions-item label="电池电量">{{ latest.battery ?? '-' }} %</el-descriptions-item>
        <el-descriptions-item label="太阳能电压">{{ latest.solar_voltage ?? '-' }} V</el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="暂无数据" />

      <div style="margin-top: 16px; color: #999; font-size: 12px" v-if="latest">
        最后更新：{{ latest.timestamp }}
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDevices } from '@/api/device'
import { getLatest } from '@/api/weather'

const devices = ref<any[]>([])
const deviceId = ref('')
const latest = ref<any>(null)

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
  const res: any = await getLatest(deviceId.value)
  latest.value = res.data
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
