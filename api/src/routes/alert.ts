import { Hono } from 'hono';
import { success, error, paginated } from '../utils/response';
import { uid } from '../utils/uid';
import type { Env, AlertRule, AlertLog } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const alertRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 预警规则列表 ==========
alertRoutes.get('/rules', async (c) => {
  const deviceId = c.req.query('deviceId');
  let sql = 'SELECT * FROM alert_rules';
  const params: unknown[] = [];

  if (deviceId) {
    sql += ' WHERE device_id = ?';
    params.push(deviceId);
  }
  sql += ' ORDER BY created_at DESC';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<AlertRule>();
  return c.json(success(results || []));
});

// ========== 创建预警规则 ==========
alertRoutes.post('/rules', async (c) => {
  const body = await c.req.json<Partial<AlertRule>>();

  if (!body.sensor_type) {
    return c.json(error('传感器类型不能为空'), 400);
  }

  const id = uid();
  await c.env.DB.prepare(
    'INSERT INTO alert_rules (id, device_id, sensor_type, min_value, max_value, enabled, notify_sms, notify_push) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      id,
      body.device_id || null,
      body.sensor_type,
      body.min_value ?? null,
      body.max_value ?? null,
      body.enabled ?? 1,
      body.notify_sms ?? 1,
      body.notify_push ?? 1
    )
    .run();

  const rule = await c.env.DB.prepare('SELECT * FROM alert_rules WHERE id = ?').bind(id).first();
  return c.json(success(rule, '规则创建成功'), 201);
});

// ========== 更新预警规则 ==========
alertRoutes.put('/rules/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<AlertRule>>();

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ['sensor_type', 'min_value', 'max_value', 'enabled', 'notify_sms', 'notify_push'] as const;
  for (const field of updatableFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) {
    return c.json(error('没有要更新的字段'), 400);
  }

  values.push(id);
  await c.env.DB.prepare(`UPDATE alert_rules SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const rule = await c.env.DB.prepare('SELECT * FROM alert_rules WHERE id = ?').bind(id).first();
  return c.json(success(rule, '规则更新成功'));
});

// ========== 删除预警规则 ==========
alertRoutes.delete('/rules/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM alert_rules WHERE id = ?').bind(id).run();
  return c.json(success(null, '规则删除成功'));
});

// ========== 预警记录列表 ==========
alertRoutes.get('/logs', async (c) => {
  const status = c.req.query('status');
  const deviceId = c.req.query('deviceId');
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');

  let sql = 'SELECT * FROM alert_logs WHERE 1=1';
  const params: unknown[] = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (deviceId) {
    sql += ' AND device_id = ?';
    params.push(deviceId);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<AlertLog>();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 标记预警已读 ==========
alertRoutes.put('/logs/:id/read', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare("UPDATE alert_logs SET status = 'read' WHERE id = ?").bind(id).run();
  return c.json(success(null, '已标记已读'));
});

// ========== 处理预警 ==========
alertRoutes.put('/logs/:id/handle', async (c) => {
  const id = c.req.param('id');
  const payload = c.get('user');
  const body = await c.req.json<{ remark?: string }>();

  await c.env.DB.prepare(
    "UPDATE alert_logs SET status = 'handled', handled_by = ?, handled_at = datetime('now') WHERE id = ?"
  )
    .bind(payload.sub, id)
    .run();

  return c.json(success(null, '预警已处理'));
});

// ========== 批量标记已读 ==========
alertRoutes.put('/logs/read-batch', async (c) => {
  const body = await c.req.json<{ ids: string[] }>();
  if (!body.ids?.length) {
    return c.json(error('请选择要标记的记录'), 400);
  }

  const placeholders = body.ids.map(() => '?').join(',');
  await c.env.DB.prepare(`UPDATE alert_logs SET status = 'read' WHERE id IN (${placeholders})`)
    .bind(...body.ids)
    .run();

  return c.json(success(null, `已标记 ${body.ids.length} 条记录`));
});

// ========== 未读数量 ==========
alertRoutes.get('/unread-count', async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM alert_logs WHERE status = 'unread'"
  ).first<{ count: number }>();

  return c.json(success({ count: result?.count || 0 }));
});
