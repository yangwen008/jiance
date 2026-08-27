<template>
  <div>
    <el-card shadow="hover">
      <template #header><span>资质审核</span></template>
      <el-table :data="list" border stripe>
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">{{ row.type === 'machinery' ? '农机' : '烘干' }}</template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="license_no" label="营业执照号" width="150" />
        <el-table-column label="营业执照" width="80">
          <template #default="{ row }">
            <el-image v-if="row.license_img" :src="row.license_img" :preview-src-list="[row.license_img]" style="width: 40px; height: 40px" fit="cover" />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="身份证" width="80">
          <template #default="{ row }">
            <el-image v-if="row.id_card_img" :src="row.id_card_img" :preview-src-list="[row.id_card_img]" style="width: 40px; height: 40px" fit="cover" />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="160" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <template v-if="row.audit_status === 'pending'">
              <el-button type="success" size="small" @click="handleAudit(row.id, 'approved')">通过</el-button>
              <el-button type="danger" size="small" @click="handleAudit(row.id, 'rejected')">拒绝</el-button>
            </template>
            <el-tag v-else :type="row.audit_status === 'approved' ? 'success' : 'danger'" size="small">
              {{ row.audit_status === 'approved' ? '已通过' : '已拒绝' }}
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
import { ElMessage } from 'element-plus'
import { getProviders, auditProvider } from '@/api/provider'

const list = ref<any[]>([])
const page = ref(1)
const total = ref(0)

async function loadData() {
  const res: any = await getProviders({ auditStatus: 'pending', page: page.value })
  list.value = res.data?.list || []
  total.value = res.data?.total || 0
}

async function handleAudit(id: string, status: string) {
  await auditProvider(id, { audit_status: status })
  ElMessage.success('审核完成')
  loadData()
}

onMounted(loadData)
</script>
