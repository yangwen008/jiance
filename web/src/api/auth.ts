import request from '@/utils/request'

export function login(data: { phone: string; password: string }) {
  return request.post('/auth/login', data)
}

export function register(data: { phone: string; password: string; name?: string }) {
  return request.post('/auth/register', data)
}

export function getMe() {
  return request.get('/auth/me')
}

export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request.put('/auth/password', data)
}
