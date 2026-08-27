import request from '@/utils/request'

export function getRules(deviceId?: string) {
  return request.get('/alerts/rules', { params: { deviceId } })
}

export function createRule(data: Record<string, unknown>) {
  return request.post('/alerts/rules', data)
}

export function updateRule(id: string, data: Record<string, unknown>) {
  return request.put(`/alerts/rules/${id}`, data)
}

export function deleteRule(id: string) {
  return request.delete(`/alerts/rules/${id}`)
}

export function getAlertLogs(params?: { status?: string; deviceId?: string; page?: number; pageSize?: number }) {
  return request.get('/alerts/logs', { params })
}

export function markRead(id: string) {
  return request.put(`/alerts/logs/${id}/read`)
}

export function handleAlert(id: string) {
  return request.put(`/alerts/logs/${id}/handle`)
}

export function markReadBatch(ids: string[]) {
  return request.put('/alerts/logs/read-batch', { ids })
}

export function getUnreadCount() {
  return request.get('/alerts/unread-count')
}
