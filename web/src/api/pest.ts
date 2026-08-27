import request from '@/utils/request'

export function getLatest(deviceId?: string) {
  return request.get('/pest/latest', { params: { deviceId } })
}

export function getHistory(params: { deviceId?: string; pestType?: string; from?: string; to?: string; verified?: number; page?: number; pageSize?: number }) {
  return request.get('/pest/history', { params })
}

export function getTrend(params: { deviceId: string; from?: string; to?: string; period?: string }) {
  return request.get('/pest/trend', { params })
}

export function getAnnual(params: { deviceId: string; year?: string }) {
  return request.get('/pest/annual', { params })
}

export function verify(id: number, data: { verified_type: string; verified_count?: number }) {
  return request.put(`/pest/${id}/verify`, data)
}

export function verifyBatch(data: { ids: number[]; verified_type: string; verified_count?: number }) {
  return request.put('/pest/verify/batch', data)
}

export function getSpecies(params: { deviceId?: string; from?: string; to?: string }) {
  return request.get('/pest/species', { params })
}
