import request from '@/utils/request'

export function getOrders(params?: { type?: string; status?: string; providerId?: string; page?: number; pageSize?: number }) {
  return request.get('/orders', { params })
}

export function getOrder(id: string) {
  return request.get(`/orders/${id}`)
}

export function createOrder(data: Record<string, unknown>) {
  return request.post('/orders', data)
}

export function confirmOrder(id: string) {
  return request.put(`/orders/${id}/confirm`)
}

export function completeOrder(id: string) {
  return request.put(`/orders/${id}/complete`)
}

export function cancelOrder(id: string, reason?: string) {
  return request.put(`/orders/${id}/cancel`, { cancel_reason: reason })
}

export function getOrderStats(type?: string) {
  return request.get('/orders/stats/summary', { params: { type } })
}
