<template>
  <div>
    <el-card shadow="hover">
      <template #header><span>用户管理</span></template>
      <el-alert title="用户管理功能需管理员权限" type="info" show-icon style="margin-bottom: 16px" :closable="false" />
      <el-table :data="list" border stripe>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="{ admin: 'danger', manager: 'warning', user: '' }[row.role] as any" size="small">
              {{ { admin: '管理员', manager: '运营', user: '普通用户' }[row.role] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="180" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const list = ref<any[]>([])

async function loadData() {
  try {
    const res: any = await request.get('/users', { params: { pageSize: 100 } })
    list.value = res.data?.list || []
  } catch {
    // 接口可能未实现
  }
}

onMounted(loadData)
</script>
