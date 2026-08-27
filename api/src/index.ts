import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { authMiddleware, roleMiddleware } from './middleware/auth';
import { success, error } from './utils/response';
import { authRoutes } from './routes/auth';
import { deviceRoutes } from './routes/device';
import { weatherRoutes } from './routes/weather';
import { pestRoutes } from './routes/pest';
import { alertRoutes } from './routes/alert';
import { providerRoutes } from './routes/provider';
import { machineRoutes } from './routes/machine';
import { dryerRoutes } from './routes/dryer';
import { orderRoutes } from './routes/order';
import { aiRoutes } from './routes/ai';
import { exportRoutes } from './routes/export';
import type { Env } from './types';

type Variables = {
  user: import('./types').JwtPayload;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== 全局中间件 ====================
app.use('*', corsMiddleware());

// ==================== 健康检查 ====================
app.get('/', (c) => {
  return c.json(success({ name: '农业虫情监测平台 API', version: '1.0.0' }));
});

app.get('/api/health', (c) => {
  return c.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});

// ==================== 需要认证的路由 ====================
app.use('/api/*', async (c, next) => {
  // 跳过 auth 路由和 health 检查
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/api/auth') || path === '/api/health') {
    return next();
  }
  return authMiddleware()(c, next);
});

// ==================== 公开路由（无需认证）====================
app.route('/api/auth', authRoutes);

// 设备管理
app.route('/api/devices', deviceRoutes);

// 气象监测
app.route('/api/weather', weatherRoutes);

// 虫情监测
app.route('/api/pest', pestRoutes);

// 预警管理
app.route('/api/alerts', alertRoutes);

// 服务商管理
app.route('/api/providers', providerRoutes);

// 农机管理
app.route('/api/machines', machineRoutes);

// 烘干站管理
app.route('/api/dryers', dryerRoutes);

// 订单管理
app.route('/api/orders', orderRoutes);

// AI服务
app.route('/api/ai', aiRoutes);

// 数据导出
app.route('/api/export', exportRoutes);

// ==================== 404 ====================
app.notFound((c) => {
  return c.json(error('接口不存在', 404), 404);
});

// ==================== 全局错误处理 ====================
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(error('服务器内部错误', 500), 500);
});

export default app;
