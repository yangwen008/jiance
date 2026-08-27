import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 硬编码 API 地址，避免 Cloudflare Pages 构建时 .env.production 不生效
const API_BASE = import.meta.env.VITE_API_BASE || 'https://agri-monitor-api.yangwen008007.workers.dev/api'

console.log('[API] baseURL =', API_BASE)

const request = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code === 0) {
      return data
    }
    if (data.code === 401) {
      localStorage.removeItem('token')
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
      return Promise.reject(data)
    }
    ElMessage.error(data.message || '请求失败')
    return Promise.reject(data)
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      router.push('/login')
    }
    ElMessage.error(error.message || '网络错误')
    return Promise.reject(error)
  }
)

export default request
