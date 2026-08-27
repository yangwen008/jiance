<template>
  <div>
    <el-card shadow="hover">
      <template #header><span>视频监控</span></template>
      <el-row :gutter="16">
        <el-col :span="8" v-for="cam in cameras" :key="cam.id">
          <el-card shadow="hover" style="margin-bottom: 16px">
            <div class="camera-card">
              <div class="camera-preview">
                <el-icon :size="48" color="#c0c4cc"><VideoCamera /></el-icon>
                <p>点击播放</p>
              </div>
              <div class="camera-info">
                <h4>{{ cam.name }}</h4>
                <el-tag :type="cam.status === 'online' ? 'success' : 'danger'" size="small">
                  {{ cam.status === 'online' ? '在线' : '离线' }}
                </el-tag>
                <p>{{ cam.village }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty v-if="!cameras.length" description="暂无监控设备" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDevices } from '@/api/device'

const cameras = ref<any[]>([])

async function loadCameras() {
  const res: any = await getDevices({ type: 'camera', pageSize: 100 })
  cameras.value = res.data?.list || []
}

onMounted(loadCameras)
</script>

<style scoped>
.camera-card { text-align: center; }
.camera-preview {
  background: #f5f7fa;
  height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-bottom: 12px;
  cursor: pointer;
}
.camera-info h4 { margin-bottom: 4px; }
.camera-info p { color: #999; font-size: 12px; margin-top: 4px; }
</style>
