<template>
  <div class="ai-page">
    <el-card shadow="hover" class="chat-card">
      <template #header><span>🤖 AI 农事助手</span></template>

      <div class="chat-messages" ref="messagesRef">
        <div v-for="(msg, i) in messages" :key="i" :class="['message', msg.role]">
          <div class="message-content">{{ msg.content }}</div>
        </div>
        <div v-if="loading" class="message assistant">
          <div class="message-content">思考中...</div>
        </div>
      </div>

      <div class="chat-input">
        <el-input
          v-model="input"
          placeholder="输入农业相关问题，如：当前墒情如何？需要灌溉吗？"
          :rows="2"
          type="textarea"
          @keydown.enter.ctrl="sendMessage"
        />
        <el-button type="primary" :loading="loading" @click="sendMessage" style="margin-top: 8px">
          发送 (Ctrl+Enter)
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { chat } from '@/api/ai'

const input = ref('')
const loading = ref(false)
const messages = ref<Array<{ role: string; content: string }>>([
  { role: 'assistant', content: '您好！我是农事智能助手，可以回答气象、虫情、土壤墒情、作物管理等方面的问题。请问有什么可以帮您？' },
])
const messagesRef = ref<HTMLElement>()

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

async function sendMessage() {
  if (!input.value.trim() || loading.value) return

  const userMsg = input.value.trim()
  messages.value.push({ role: 'user', content: userMsg })
  input.value = ''
  scrollToBottom()

  loading.value = true
  try {
    const res: any = await chat(userMsg)
    messages.value.push({ role: 'assistant', content: res.data?.reply || '暂无法回答' })
  } catch {
    messages.value.push({ role: 'assistant', content: '服务异常，请稍后重试' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.ai-page { height: calc(100vh - 120px); }
.chat-card { height: 100%; display: flex; flex-direction: column; }
.chat-card :deep(.el-card__body) { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.chat-messages { flex: 1; overflow-y: auto; padding: 16px; }
.message { margin-bottom: 16px; }
.message.user { text-align: right; }
.message.user .message-content { background: #409eff; color: #fff; display: inline-block; padding: 8px 16px; border-radius: 12px 12px 0 12px; max-width: 70%; text-align: left; }
.message.assistant .message-content { background: #f4f4f5; color: #333; display: inline-block; padding: 8px 16px; border-radius: 12px 12px 12px 0; max-width: 70%; }
.chat-input { border-top: 1px solid #eee; padding-top: 12px; }
</style>
