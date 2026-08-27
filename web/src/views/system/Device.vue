<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>设备管理</span>
          <el-button type="primary" @click="showAdd = true">添加设备</el-button>
        </div>
      </template>

      <el-table :data="list" border stripe>
        <el-table-column prop="name" label="设备名称" width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">{{ typeMap[row.type as keyof typeof typeMap] || row.type }}</template>
        </el-table-column>
        <el-table-column prop="village" label="所在村" width="120" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="({ online: 'success', offline: 'danger', alarm: 'warning', maintenance: 'info' } as Record<string, string>)[row.status] as any" size="small">
              {{ ({ online: '在线', offline: '离线', alarm: '告警', maintenance: '维护' } as Record<string, string>)[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_seen" label="最后在线" width="180" />
        <el-table-column prop="sim_iccid" label="物联网卡" width="150" />
        <el-table-column label="坐标" width="150">
          <template #default="{ row }">{{ row.lat && row.lng ? `${row.lat}, ${row.lng}` : '-' }}</template>
        </el-table-column>
      </el-table>

      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" style="margin-top: 16px" @current-change="loadData" />
    </el-card>

    <!-- 添加设备对话框 -->
    <el-dialog v-model="showAdd" title="添加设备" width="500">
      <el-form :model="form" label-width="80px">
        <el-form-item label="设备名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="设备类型" required>
          <el-select v-model="form.type">
            <el-option label="气象站" value="weather" />
            <el-option label="摄像头" value="camera" />
            <el-option label="虫情仪" value="pest_monitor" />
            <el-option label="多光谱" value="multispectral" />
          </el-select>
        </el-form-item>
        <el-form-item label="所在村">
          <el-input v-model="form.village" />
        </el-form-item>
        <el-form-item label="经度">
          <el-input-number v-model="form.lng" :precision="6" :step="0.001" style="width: 100%" />
        </el-form-item>
        <el-form-item label="纬度">
          <el-input-number v-model="form.lat" :precision="6" :step="0.001" style="width: 100%" />
        </el-form-item>
        <el-form-item label="物联网卡">
          <el-input v-model="form.sim_iccid" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdd = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDevices, createDevice } from '@/api/device'

const typeMap: Record<string, string> = { weather: '气象站', camera: '摄像头', pest_monitor: '虫情仪', multispectral: '多光谱' }
const list = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const showAdd = ref(false)
const form = reactive<any>({ name: '', type: 'weather', village: '', lng: null, lat: null, sim_iccid: '' })

async function loadData() {
  const res: any = await getDevices({ page: page.value })
  list.value = res.data?.list || []
  total.value = res.data?.total || 0
}

async function handleAdd() {
  if (!form.name || !form.type) return ElMessage.warning('请填写必填项')
  await createDevice(form)
  ElMessage.success('添加成功')
  showAdd.value = false
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
</style>
