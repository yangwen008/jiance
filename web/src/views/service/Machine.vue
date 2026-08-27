<template>
  <div>
    <el-card shadow="hover">
      <template #header><span>农机管理</span></template>
      <el-table :data="list" border stripe>
        <el-table-column prop="provider_name" label="服务商" width="120" />
        <el-table-column prop="category" label="类别" width="80">
          <template #default="{ row }">{{ categoryMap[row.category] || row.category }}</template>
        </el-table-column>
        <el-table-column prop="brand" label="品牌" width="100" />
        <el-table-column prop="model" label="型号" width="120" />
        <el-table-column prop="power" label="功率" width="80" />
        <el-table-column prop="efficiency" label="效率" width="100" />
        <el-table-column prop="crop_type" label="适配作物" width="120" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="({ idle: 'success', working: 'warning', maintenance: 'danger' } as Record<string, string>)[row.status] as any" size="small">
              {{ ({ idle: '闲置', working: '作业中', maintenance: '维修中' } as Record<string, string>)[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" style="margin-top: 16px" @current-change="loadData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const categoryMap: Record<string, string> = { tillage: '耕作', sowing: '播种', irrigation: '灌溉', harvest: '收获', drone: '无人机', other: '其他' }
const list = ref<any[]>([])
const page = ref(1)
const total = ref(0)

async function loadData() {
  const res: any = await request.get('/machines', { params: { page: page.value } })
  list.value = res.data?.list || []
  total.value = res.data?.total || 0
}

onMounted(loadData)
</script>
