<template>
  <div>
    <el-card shadow="hover">
      <template #header><span>烘干站管理</span></template>
      <el-table :data="list" border stripe>
        <el-table-column prop="name" label="站点名称" width="150" />
        <el-table-column prop="provider_name" label="服务商" width="120" />
        <el-table-column prop="address" label="地址" show-overflow-tooltip />
        <el-table-column prop="capacity" label="容量(kg)" width="100" />
        <el-table-column prop="model" label="设备型号" width="120" />
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" style="margin-top: 16px" @current-change="loadData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const list = ref<any[]>([])
const page = ref(1)
const total = ref(0)

async function loadData() {
  const res: any = await request.get('/dryers', { params: { page: page.value } })
  list.value = res.data?.list || []
  total.value = res.data?.total || 0
}

onMounted(loadData)
</script>
