import { get, post, put, del } from '../utils/request'

export const getDevices = (params?: Record<string, unknown>) => get('/devices', params)
export const getDevice = (id: string) => get(`/devices/${id}`)
export const createDevice = (data: Record<string, unknown>) => post('/devices', data)
export const updateDevice = (id: string, data: Record<string, unknown>) => put(`/devices/${id}`, data)
export const deleteDevice = (id: string) => del(`/devices/${id}`)
