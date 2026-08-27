import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi, getMe } from '../api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref<Record<string, unknown> | null>(null)
  const isLoggedIn = ref(false)

  function checkLogin() {
    const t = uni.getStorageSync('token')
    if (t) {
      token.value = t
      isLoggedIn.value = true
      fetchUser()
    }
  }

  async function login(phone: string, password: string) {
    const res = await loginApi({ phone, password })
    token.value = res.data!.token as string
    userInfo.value = res.data!.user as Record<string, unknown>
    isLoggedIn.value = true
    uni.setStorageSync('token', token.value)
    return res.data
  }

  async function fetchUser() {
    try {
      const res = await getMe()
      userInfo.value = res.data as Record<string, unknown>
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    isLoggedIn.value = false
    uni.removeStorageSync('token')
  }

  return { token, userInfo, isLoggedIn, checkLogin, login, fetchUser, logout }
})
