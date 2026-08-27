<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>服务商管理</span>
          <el-button type="primary" @click="showDialog()">新增服务商</el-button>
        </div>
      </template>

      <el-form :inline="true" style="margin-bottom: 16px">
        <el-form-item label="类型">
          <el-select v-model="query.type" clearable style="width: 120px">
            <el-option label="农机" value="machinery" />
            <el-option label="烘干" value="dryer" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.auditStatus" clearable style="width: 120px">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" border stripe>
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">{{ row.type === 'machinery' ? '农机' : '烘干' }}</template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="address" label="地址" show-overflow-tooltip />
        <el-table-column prop="audit_status" label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="{ pending: 'warning', approved: 'success', rejected: 'danger' }[row.audit_status] as any" size="small">
              {{ { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[row.audit_status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button v-if="row.audit_status === 'pending'" type="success" size="small" @click="handleAudit(row.id, 'approved')">通过</el-button>
            <el-button v-if="row.audit_status === 'pending'" type="danger" size="small" @click="handleAudit(row.id, 'rejected')">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" style="margin-top: 16px" @current-change="loadData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getProviders, auditProvider } from '@/api/provider'

const list = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const query = reactive({ type: '', auditStatus: '' })

async function loadData() {
  const res: any = await getProviders({ ...query, page: page.value })
  list.value = res.data?.list || []
  total.value = res.data?.total || 0
}

async function handleAudit(id: string, status: string) {
  await auditProvider(id, { audit_status: status })
  ElMessage.success('审核完成')
  loadData()
}

function showDialog() {
  ElMessage.info('新增功能开发中')
}

onMounted(loadData)
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
</style>
