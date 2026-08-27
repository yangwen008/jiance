import { post } from '../utils/request'

export const chat = (message: string) => post('/ai/chat', { message })
export const identifyPest = (imageUrl: string) => post('/ai/identify-pest', { imageUrl })
export const generateReport = (type: string, data: Record<string, unknown>) => post('/ai/report', { type, data })
