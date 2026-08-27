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

// 401 跳转防抖标志，防止多个请求同时 401 导致反复跳转
let isRedirecting = false

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
      if (!isRedirecting) {
        isRedirecting = true
        localStorage.removeItem('token')
        ElMessage.error('登录已过期，请重新登录')
        router.push('/login').finally(() => {
          setTimeout(() => { isRedirecting = false }, 1000)
        })
      }
      return Promise.reject(data)
    }
    ElMessage.error(data.message || '请求失败')
    return Promise.reject(data)
  },
  (error) => {
    const apiMsg = error.response?.data?.message
    if (error.response?.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true
        localStorage.removeItem('token')
        ElMessage.error(apiMsg || '登录已过期，请重新登录')
        router.push('/login').finally(() => {
          setTimeout(() => { isRedirecting = false }, 1000)
        })
      }
    } else {
      ElMessage.error(apiMsg || error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export default request
