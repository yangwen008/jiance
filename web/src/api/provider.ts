import request from '@/utils/request'

export function getProviders(params?: { type?: string; auditStatus?: string; keyword?: string; page?: number; pageSize?: number }) {
  return request.get('/providers', { params })
}

export function getProvider(id: string) {
  return request.get(`/providers/${id}`)
}

export function createProvider(data: Record<string, unknown>) {
  return request.post('/providers', data)
}

export function auditProvider(id: string, data: { audit_status: string; audit_note?: string }) {
  return request.put(`/providers/${id}/audit`, data)
}

export function getProviderStats(type?: string) {
  return request.get('/providers/stats/summary', { params: { type } })
}
