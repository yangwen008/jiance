import { get, post, put } from '../utils/request'

export const login = (data: { phone: string; password: string }) => post('/auth/login', data)
export const register = (data: { phone: string; password: string; name?: string }) => post('/auth/register', data)
export const getMe = () => get('/auth/me')
export const changePassword = (data: { oldPassword: string; newPassword: string }) => put('/auth/password', data)
