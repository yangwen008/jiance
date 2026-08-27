import request from '@/utils/request'

export function getDevices(params?: { type?: string; status?: string; village?: string; page?: number; pageSize?: number }) {
  return request.get('/devices', { params })
}

export function getDevice(id: string) {
  return request.get(`/devices/${id}`)
}

export function createDevice(data: Record<string, unknown>) {
  return request.post('/devices', data)
}

export function updateDevice(id: string, data: Record<string, unknown>) {
  return request.put(`/devices/${id}`, data)
}

export function deleteDevice(id: string) {
  return request.delete(`/devices/${id}`)
}

export function getDeviceSnapshots(id: string, params?: { page?: number; pageSize?: number }) {
  return request.get(`/devices/${id}/snapshots`, { params })
}

export function uploadDeviceImage(file: File, prefix?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (prefix) formData.append('prefix', prefix)
  return request.post('/devices/upload', formData)
}
