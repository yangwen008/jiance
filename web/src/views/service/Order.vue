<template>
  <div>
    <el-card shadow="hover">
      <template #header><span>订单管理</span></template>
      <el-form :inline="true" style="margin-bottom: 16px">
        <el-form-item label="类型">
          <el-select v-model="query.type" clearable style="width: 100px">
            <el-option label="农机" value="machinery" />
            <el-option label="烘干" value="dryer" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable style="width: 100px">
            <el-option label="待确认" value="pending" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" border stripe>
        <el-table-column prop="id" label="订单号" width="120" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="70">
          <template #default="{ row }">{{ row.type === 'machinery' ? '农机' : '烘干' }}</template>
        </el-table-column>
        <el-table-column prop="user_name" label="用户" width="100" />
        <el-table-column prop="provider_name" label="服务商" width="120" />
        <el-table-column prop="start_date" label="开始日期" width="110" />
        <el-table-column prop="amount" label="金额" width="80" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType[row.status]" size="small">{{ statusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="success" size="small" @click="handleConfirm(row.id)">确认</el-button>
            <el-button v-if="row.status === 'confirmed'" type="primary" size="small" @click="handleComplete(row.id)">完成</el-button>
            <el-button v-if="['pending', 'confirmed'].includes(row.status)" type="danger" size="small" @click="handleCancel(row.id)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" style="margin-top: 16px" @current-change="loadData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrders, confirmOrder, completeOrder, cancelOrder } from '@/api/order'

const statusMap: Record<string, string> = { pending: '待确认', confirmed: '已确认', in_progress: '进行中', completed: '已完成', cancelled: '已取消' }
const statusType: Record<string, string> = { pending: 'warning', confirmed: 'primary', in_progress: '', completed: 'success', cancelled: 'info' }
const list = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const query = reactive({ type: '', status: '' })

async function loadData() {
  const res: any = await getOrders({ ...query, page: page.value })
  list.value = res.data?.list || []
  total.value = res.data?.total || 0
}

async function handleConfirm(id: string) {
  await confirmOrder(id)
  ElMessage.success('已确认')
  loadData()
}

async function handleComplete(id: string) {
  await completeOrder(id)
  ElMessage.success('已完成')
  loadData()
}

async function handleCancel(id: string) {
  await ElMessageBox.confirm('确定取消该订单？', '提示')
  await cancelOrder(id)
  ElMessage.success('已取消')
  loadData()
}

onMounted(loadData)
</script>
