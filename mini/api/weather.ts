import { get } from '../utils/request'

export const getDevices = (params?: Record<string, unknown>) => get('/devices', params)
export const getDevice = (id: string) => get(`/devices/${id}`)
export const getLatestWeather = (deviceId: string) => get('/weather/latest', { deviceId })
export const getLatestWeatherAll = () => get('/weather/latest/all')
export const getWeatherStats = (params: Record<string, unknown>) => get('/weather/stats', params)
export const getAccumulation = (params: Record<string, unknown>) => get('/weather/accumulation', params)
export const getSoil = (params: Record<string, unknown>) => get('/weather/soil', params)
