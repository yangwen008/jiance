<template>
  <div>
    <el-card shadow="hover">
      <template #header><span>预警管理</span></template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="预警记录" name="logs">
          <el-table :data="logs" border stripe>
            <el-table-column prop="created_at" label="时间" width="180" />
            <el-table-column prop="sensor_type" label="类型" width="100" />
            <el-table-column prop="message" label="内容" show-overflow-tooltip />
            <el-table-column prop="value" label="触发值" width="100" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="({ unread: 'danger', read: 'warning', handled: 'success' } as Record<string, string>)[row.status] as any" size="small">
                  {{ ({ unread: '未读', read: '已读', handled: '已处理' } as Record<string, string>)[row.status] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button v-if="row.status === 'unread'" size="small" @click="handleMarkRead(row.id)">标记已读</el-button>
                <el-button v-if="row.status !== 'handled'" type="success" size="small" @click="handleHandle(row.id)">处理</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="预警规则" name="rules">
          <el-button type="primary" size="small" style="margin-bottom: 12px" @click="showRuleDialog = true">新增规则</el-button>
          <el-table :data="rules" border stripe>
            <el-table-column prop="sensor_type" label="传感器类型" width="120" />
            <el-table-column prop="min_value" label="最小值" width="100" />
            <el-table-column prop="max_value" label="最大值" width="100" />
            <el-table-column prop="enabled" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="handleDeleteRule(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="showRuleDialog" title="新增预警规则" width="400">
      <el-form :model="ruleForm" label-width="80px">
        <el-form-item label="传感器">
          <el-select v-model="ruleForm.sensor_type">
            <el-option label="空气温度" value="temperature" />
            <el-option label="空气湿度" value="humidity" />
            <el-option label="风速" value="wind_speed" />
            <el-option label="降雨量" value="rainfall" />
            <el-option label="土壤水分" value="soil_moisture" />
            <el-option label="虫量" value="pest_count" />
          </el-select>
        </el-form-item>
        <el-form-item label="最小值">
          <el-input-number v-model="ruleForm.min_value" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最大值">
          <el-input-number v-model="ruleForm.max_value" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRuleDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddRule">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAlertLogs, markRead, handleAlert, getRules, createRule, deleteRule } from '@/api/alert'

const activeTab = ref('logs')
const logs = ref<any[]>([])
const rules = ref<any[]>([])
const showRuleDialog = ref(false)
const ruleForm = reactive<any>({ sensor_type: 'temperature', min_value: null, max_value: null })

async function loadLogs() {
  const res: any = await getAlertLogs({ pageSize: 50 })
  logs.value = res.data?.list || []
}

async function loadRules() {
  const res: any = await getRules()
  rules.value = res.data || []
}

async function handleMarkRead(id: string) {
  await markRead(id)
  loadLogs()
}

async function handleHandle(id: string) {
  await handleAlert(id)
  ElMessage.success('已处理')
  loadLogs()
}

async function handleAddRule() {
  await createRule(ruleForm)
  ElMessage.success('规则创建成功')
  showRuleDialog.value = false
  loadRules()
}

async function handleDeleteRule(id: string) {
  await deleteRule(id)
  ElMessage.success('已删除')
  loadRules()
}

onMounted(() => {
  loadLogs()
  loadRules()
})
</script>
