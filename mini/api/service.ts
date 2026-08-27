import { get, post, put } from '../utils/request'

export const getProviders = (params?: Record<string, unknown>) => get('/providers', params)
export const createProvider = (data: Record<string, unknown>) => post('/providers', data)
export const getOrders = (params?: Record<string, unknown>) => get('/orders', params)
export const createOrder = (data: Record<string, unknown>) => post('/orders', data)
export const cancelOrder = (id: string, reason?: string) => put(`/orders/${id}/cancel`, { cancel_reason: reason })
export const getMachines = (params?: Record<string, unknown>) => get('/machines', params)
export const getDryers = (params?: Record<string, unknown>) => get('/dryers', params)
