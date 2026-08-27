import { get, put } from '../utils/request'

export const getLatestPest = (deviceId?: string) => get('/pest/latest', { deviceId })
export const getPestHistory = (params: Record<string, unknown>) => get('/pest/history', params)
export const getPestTrend = (params: Record<string, unknown>) => get('/pest/trend', params)
export const getPestAnnual = (params: Record<string, unknown>) => get('/pest/annual', params)
export const verifyPest = (id: number, data: Record<string, unknown>) => put(`/pest/${id}/verify`, data)
export const getSpecies = (params?: Record<string, unknown>) => get('/pest/species', params)
