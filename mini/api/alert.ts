import { get, post, put } from '../utils/request'

export const getAlertLogs = (params?: Record<string, unknown>) => get('/alerts/logs', params)
export const getUnreadCount = () => get('/alerts/unread-count')
export const markRead = (id: string) => put(`/alerts/logs/${id}/read`)
export const handleAlert = (id: string) => put(`/alerts/logs/${id}/handle`)
