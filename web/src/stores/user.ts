import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi, getMe } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<any>(null)

  async function login(phone: string, password: string) {
    const res: any = await loginApi({ phone, password })
    token.value = res.data.token
    userInfo.value = res.data.user
    localStorage.setItem('token', res.data.token)
    return res.data
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const res: any = await getMe()
      userInfo.value = res.data
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  return { token, userInfo, login, fetchUser, logout }
})
