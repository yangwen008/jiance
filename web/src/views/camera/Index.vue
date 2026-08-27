<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>视频监控</span>
          <el-select v-model="selectedCamera" placeholder="选择摄像头" style="width: 200px" @change="loadSnapshots">
            <el-option v-for="cam in cameras" :key="cam.id" :label="cam.name" :value="cam.id" />
          </el-select>
        </div>
      </template>

      <el-row :gutter="16">
        <!-- 摄像头列表 -->
        <el-col :span="6">
          <div class="camera-list">
            <div
              v-for="cam in cameras"
              :key="cam.id"
              :class="['camera-item', { active: selectedCamera === cam.id }]"
              @click="selectCamera(cam)"
            >
              <el-icon :size="20"><VideoCamera /></el-icon>
              <div class="camera-meta">
                <div class="camera-name">{{ cam.name }}</div>
                <el-tag :type="cam.status === 'online' ? 'success' : 'danger'" size="small">
                  {{ cam.status === 'online' ? '在线' : '离线' }}
                </el-tag>
              </div>
            </div>
            <el-empty v-if="!cameras.length" description="暂无监控设备" :image-size="60" />
          </div>
        </el-col>

        <!-- 截图展示区 -->
        <el-col :span="18">
          <div v-if="selectedCamera">
            <!-- 最新截图 -->
            <div class="latest-snapshot" v-if="latestSnapshot">
              <h4>最新截图</h4>
              <el-image
                :src="latestSnapshot.image_url"
                :preview-src-list="[latestSnapshot.image_url]"
                fit="contain"
                style="width: 100%; height: 400px; background: #000"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon :size="40"><Picture /></el-icon>
                    <p>图片加载失败</p>
                  </div>
                </template>
              </el-image>
              <div class="snapshot-meta">
                <span>时间：{{ latestSnapshot.timestamp }}</span>
                <span>类型：{{ typeMap[latestSnapshot.type] || latestSnapshot.type }}</span>
                <span v-if="latestSnapshot.note">备注：{{ latestSnapshot.note }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无截图" />

            <!-- 历史截图时间线 -->
            <el-divider />
            <h4>历史截图</h4>
            <el-timeline v-if="snapshots.length">
              <el-timeline-item
                v-for="snap in snapshots"
                :key="snap.id"
                :timestamp="snap.timestamp"
                placement="top"
              >
                <el-card shadow="hover" style="max-width: 600px">
                  <el-image
                    :src="snap.image_url"
                    :preview-src-list="snapshots.map((s: any) => s.image_url)"
                    fit="cover"
                    style="width: 100%; height: 200px; cursor: pointer"
                  >
                    <template #error>
                      <div class="image-error">
                        <el-icon :size="24"><Picture /></el-icon>
                      </div>
                    </template>
                  </el-image>
                  <div class="snapshot-meta" style="margin-top: 8px">
                    <el-tag size="small">{{ typeMap[snap.type] || snap.type }}</el-tag>
                    <span v-if="snap.note" style="margin-left: 8px; color: #999">{{ snap.note }}</span>
                  </div>
                </el-card>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无历史截图" />

            <el-pagination
              v-if="total > pageSize"
              v-model:current-page="page"
              :page-size="pageSize"
              :total="total"
              layout="total, prev, pager, next"
              style="margin-top: 16px"
              @current-change="loadSnapshots"
            />
          </div>
          <el-empty v-else description="请从左侧选择摄像头" />
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDevices, getDeviceSnapshots } from '@/api/device'

const typeMap: Record<string, string> = { auto: '自动抓拍', manual: '手动截图', alarm: '告警截图' }
const cameras = ref<any[]>([])
const selectedCamera = ref('')
const latestSnapshot = ref<any>(null)
const snapshots = ref<any[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)

async function loadCameras() {
  const res: any = await getDevices({ type: 'camera', pageSize: 100 })
  cameras.value = res.data?.list || []
  if (cameras.value.length) {
    selectedCamera.value = cameras.value[0].id
    loadSnapshots()
  }
}

function selectCamera(cam: any) {
  selectedCamera.value = cam.id
  page.value = 1
  loadSnapshots()
}

async function loadSnapshots() {
  if (!selectedCamera.value) return

  // 加载最新截图
  const latestRes: any = await getDeviceSnapshots(selectedCamera.value, { page: 1, pageSize: 1 })
  latestSnapshot.value = latestRes.data?.list?.[0] || null

  // 加载历史截图
  const res: any = await getDeviceSnapshots(selectedCamera.value, { page: page.value, pageSize })
  snapshots.value = res.data?.list || []
  total.value = res.data?.total || 0
}

onMounted(loadCameras)
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.camera-list {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  max-height: 600px;
  overflow-y: auto;
}
.camera-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}
.camera-item:hover {
  background: #f5f7fa;
}
.camera-item.active {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
}
.camera-meta {
  flex: 1;
}
.camera-name {
  font-size: 14px;
  margin-bottom: 4px;
}
.latest-snapshot {
  margin-bottom: 16px;
}
.latest-snapshot h4 {
  margin-bottom: 12px;
}
.snapshot-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #c0c4cc;
}
</style>
