import request from '@/utils/request'

export function identifyPest(imageUrl: string) {
  return request.post('/ai/identify-pest', { imageUrl })
}

export function chat(message: string, context?: string) {
  return request.post('/ai/chat', { message, context })
}

export function generateReport(type: string, data: Record<string, unknown>, period?: string) {
  return request.post('/ai/report', { type, data, period })
}
