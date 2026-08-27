import request from '@/utils/request'

export function getLatest(deviceId: string) {
  return request.get('/weather/latest', { params: { deviceId } })
}

export function getLatestAll() {
  return request.get('/weather/latest/all')
}

export function getHistory(params: { deviceId: string; from?: string; to?: string; page?: number; pageSize?: number }) {
  return request.get('/weather/history', { params })
}

export function getStats(params: { deviceId: string; period?: string; from?: string; to?: string }) {
  return request.get('/weather/stats', { params })
}

export function getAccumulation(params: { deviceId: string; from?: string; to?: string }) {
  return request.get('/weather/accumulation', { params })
}

export function getSoil(params: { deviceId: string; from?: string; to?: string }) {
  return request.get('/weather/soil', { params })
}
