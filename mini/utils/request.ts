const BASE_URL = 'https://agri-monitor-api.yangwen008007.workers.dev/api'

function getToken(): string {
  return uni.getStorageSync('token') || ''
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  header?: Record<string, string>
}

interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

export function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...options.header,
      },
      success: (res) => {
        const data = res.data as ApiResponse<T>
        if (data.code === 0) {
          resolve(data)
        } else if (data.code === 401) {
          uni.removeStorageSync('token')
          uni.reLaunch({ url: '/pages/my/index' })
          reject(data)
        } else {
          uni.showToast({ title: data.message || '请求失败', icon: 'none' })
          reject(data)
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}

export function get<T = unknown>(url: string, params?: Record<string, unknown>) {
  const query = params
    ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  return request<T>({ url: `${url}${query}` })
}

export function post<T = unknown>(url: string, data?: Record<string, unknown>) {
  return request<T>({ url, method: 'POST', data })
}

export function put<T = unknown>(url: string, data?: Record<string, unknown>) {
  return request<T>({ url, method: 'PUT', data })
}

export function del<T = unknown>(url: string) {
  return request<T>({ url, method: 'DELETE' })
}
