<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>🌾 农业虫情监测平台</h1>
        <p>智慧农业 · 科学监测</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" size="large">
        <el-form-item prop="phone">
          <el-input v-model="form.phone" placeholder="手机号" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" class="login-btn" @click="handleLogin">登 录</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  phone: '',
  password: '',
})

const rules: FormRules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await userStore.login(form.phone, form.password)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (err: any) {
    ElMessage.error(err?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.login-header {
  text-align: center;
  margin-bottom: 30px;
}
.login-header h1 {
  font-size: 24px;
  color: #333;
  margin-bottom: 8px;
}
.login-header p {
  color: #999;
  font-size: 14px;
}
.login-btn {
  width: 100%;
}
</style>
