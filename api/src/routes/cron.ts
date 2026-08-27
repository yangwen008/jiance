import { Hono } from 'hono';
import { success } from '../utils/response';
import type { Env } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const cronRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 每日定时任务：汇总统计 ==========
cronRoutes.post('/daily-aggregate', async (c) => {
  const rawBody: { date?: string } = await c.req.json().catch(() => ({}));
  const date = rawBody.date || new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // 调用气象日统计汇总
  const weatherRes = await fetch(`${new URL(c.req.url).origin}/api/weather/aggregate-daily`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  const weatherResult = await weatherRes.json();

  // 调用虫情日统计汇总
  const pestRes = await fetch(`${new URL(c.req.url).origin}/api/pest/aggregate-daily`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  const pestResult = await pestRes.json();

  return c.json(success({
    date,
    weather: (weatherResult as Record<string, unknown>).data,
    pest: (pestResult as Record<string, unknown>).data,
  }, `${date} 日统计汇总完成`));
});

// ========== 设备离线检测 ==========
cronRoutes.post('/check-offline', async (c) => {
  // 超过30分钟未上报的设备标记为离线
  const result = await c.env.DB.prepare(
    `UPDATE devices SET status = 'offline', updated_at = datetime('now')
     WHERE status = 'online' AND last_seen < datetime('now', '-30 minutes')`
  ).run();

  return c.json(success({ updated: result.meta.changes }, `已将 ${result.meta.changes} 个设备标记为离线`));
});
