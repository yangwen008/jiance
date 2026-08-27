<template>
  <div>
    <el-card shadow="hover">
      <template #header><span>人工复核</span></template>
      <el-table :data="list" border stripe>
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column prop="pest_type" label="AI识别" width="120" />
        <el-table-column prop="count" label="数量" width="80" />
        <el-table-column prop="confidence" label="置信度" width="100">
          <template #default="{ row }">{{ row.confidence ? row.confidence + '%' : '-' }}</template>
        </el-table-column>
        <el-table-column label="图片" width="80">
          <template #default="{ row }">
            <el-image v-if="row.image_url" :src="row.image_url" :preview-src-list="[row.image_url]" style="width: 50px; height: 50px" fit="cover" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-input v-model="row._verifyType" placeholder="校正种类" size="small" style="width: 100px; margin-right: 4px" />
            <el-button type="primary" size="small" @click="handleVerify(row)">确认</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getHistory, verify } from '@/api/pest'

const list = ref<any[]>([])

async function loadData() {
  const res: any = await getHistory({ verified: 0, pageSize: 50 })
  list.value = (res.data?.list || []).map((item: any) => ({ ...item, _verifyType: '' }))
}

async function handleVerify(row: any) {
  if (!row._verifyType) return ElMessage.warning('请输入校正种类')
  await verify(row.id, { verified_type: row._verifyType })
  ElMessage.success('复核成功')
  loadData()
}

onMounted(loadData)
</script>
