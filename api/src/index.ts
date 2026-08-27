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
import { cronRoutes } from './routes/cron';
import { userRoutes } from './routes/user';
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
  const path = c.req.path;
  // 跳过 health 检查和 auth 中的公开端点
  if (path === '/api/health') {
    return next();
  }
  const publicAuthPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/test-token'];
  if (publicAuthPaths.includes(path)) {
    return next();
  }
  return authMiddleware()(c, next);
});

// ==================== 公开路由（无需认证）====================
app.route('/api/auth', authRoutes);

// 受保护的测试端点（需要 token）
app.get('/api/test-auth', (c) => {
  const user = c.get('user');
  return c.json({ ok: true, user, msg: 'token验证通过！' });
});

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

// 定时任务
app.route('/api/cron', cronRoutes);

// 用户管理
app.route('/api/users', userRoutes);

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

// Cloudflare Workers Scheduled Event Handler
export const scheduled = async (event: ScheduledController, env: Env, ctx: ExecutionContext) => {
  const cron = event.cron;
  console.log(`[CRON] Triggered: ${cron}`);

  if (cron === '0 2 * * *') {
    // 每日凌晨2点：日统计汇总
    ctx.waitUntil(aggregateDaily(env));
  } else if (cron === '*/30 * * * *') {
    // 每30分钟：设备离线检测
    ctx.waitUntil(checkOffline(env));
  }
};

async function aggregateDaily(env: Env) {
  const date = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const baseTempConfig = await env.DB.prepare(
    "SELECT value FROM system_config WHERE key = 'accumulation_base_temp'"
  ).first<{ value: string }>();
  const baseTemp = Number(baseTempConfig?.value) || 10;

  const { results: devices } = await env.DB.prepare(
    "SELECT id FROM devices WHERE type = 'weather'"
  ).all<{ id: string }>();

  let aggregated = 0;
  for (const device of devices || []) {
    const row = await env.DB.prepare(
      `SELECT MAX(CAST(air_temp AS REAL)) as temp_max, MIN(CAST(air_temp AS REAL)) as temp_min,
       AVG(CAST(air_temp AS REAL)) as temp_avg, MAX(CAST(air_humidity AS REAL)) as humidity_max,
       MIN(CAST(air_humidity AS REAL)) as humidity_min, AVG(CAST(air_humidity AS REAL)) as humidity_avg,
       SUM(CAST(rainfall AS REAL)) as rainfall_total, MAX(CAST(wind_speed AS REAL)) as wind_speed_max,
       MAX(CAST(light AS REAL)) as light_max FROM weather_data
       WHERE device_id = ? AND timestamp >= ? AND timestamp < ?`
    ).bind(device.id, date, date + 'T24:00:00').first<Record<string, number | null>>();

    if (!row || row.temp_avg === null) continue;

    const effectiveTemp = Math.max(0, (row.temp_avg || 0) - baseTemp);
    const lightCount = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM weather_data WHERE device_id = ? AND timestamp >= ? AND timestamp < ? AND CAST(light AS REAL) > 1000`
    ).bind(device.id, date, date + 'T24:00:00').first<{ cnt: number }>();
    const lightHours = ((lightCount?.cnt || 0) * 5) / 60;

    await env.DB.prepare(
      `INSERT INTO weather_daily (device_id, date, temp_max, temp_min, temp_avg, humidity_max, humidity_min, humidity_avg, rainfall_total, wind_speed_max, light_max, light_hours, effective_temp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(device_id, date) DO UPDATE SET temp_max=excluded.temp_max, temp_min=excluded.temp_min, temp_avg=excluded.temp_avg, humidity_max=excluded.humidity_max, humidity_min=excluded.humidity_min, humidity_avg=excluded.humidity_avg, rainfall_total=excluded.rainfall_total, wind_speed_max=excluded.wind_speed_max, light_max=excluded.light_max, light_hours=excluded.light_hours, effective_temp=excluded.effective_temp`
    ).bind(device.id, date, row.temp_max, row.temp_min, Math.round((row.temp_avg || 0) * 100) / 100, row.humidity_max, row.humidity_min, Math.round((row.humidity_avg || 0) * 100) / 100, row.rainfall_total || 0, row.wind_speed_max || 0, row.light_max || 0, Math.round(lightHours * 100) / 100, Math.round(effectiveTemp * 100) / 100).run();
    aggregated++;
  }
  console.log(`[CRON] daily-aggregate: ${date}, ${aggregated} devices`);
}

async function checkOffline(env: Env) {
  const result = await env.DB.prepare(
    `UPDATE devices SET status = 'offline', updated_at = datetime('now') WHERE status = 'online' AND last_seen < datetime('now', '-30 minutes')`
  ).run();
  console.log(`[CRON] check-offline: ${result.meta.changes} devices set to offline`);
}
