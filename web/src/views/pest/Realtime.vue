<template>
  <div>
    <el-card shadow="hover">
      <template #header><span>实时虫情</span></template>
      <el-table :data="list" border stripe>
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column prop="pest_type" label="害虫种类" width="150" />
        <el-table-column prop="count" label="数量" width="80" />
        <el-table-column prop="confidence" label="置信度" width="100">
          <template #default="{ row }">{{ row.confidence ? row.confidence + '%' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="80" />
        <el-table-column prop="verified" label="复核" width="80">
          <template #default="{ row }">
            <el-tag :type="row.verified ? 'success' : 'info'" size="small">{{ row.verified ? '已复核' : '待复核' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="图片" width="80">
          <template #default="{ row }">
            <el-image v-if="row.image_url" :src="row.image_url" :preview-src-list="[row.image_url]" style="width: 50px; height: 50px" fit="cover" />
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getLatest } from '@/api/pest'

const list = ref<any[]>([])

async function loadData() {
  const res: any = await getLatest()
  list.value = res.data || []
}

onMounted(loadData)
</script>
