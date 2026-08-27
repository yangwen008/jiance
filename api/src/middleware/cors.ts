import { Context, Next } from 'hono';
import type { Env } from '../types';

export function corsMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // 处理预检请求
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': c.env.CORS_ORIGIN || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    await next();

    // 添加 CORS 响应头
    c.header('Access-Control-Allow-Origin', c.env.CORS_ORIGIN || '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  };
}
