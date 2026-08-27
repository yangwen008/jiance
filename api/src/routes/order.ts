import { Hono } from 'hono';
import { success, error, paginated } from '../utils/response';
import { uid } from '../utils/uid';
import { roleMiddleware } from '../middleware/auth';
import type { Env, Order } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const orderRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 订单列表 ==========
orderRoutes.get('/', async (c) => {
  const payload = c.get('user');
  const type = c.req.query('type');
  const status = c.req.query('status');
  const providerId = c.req.query('providerId');
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');

  let sql = `SELECT o.*, 
    u.name as user_name, u.phone as user_phone,
    sp.name as provider_name, sp.phone as provider_phone
    FROM orders o 
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN service_providers sp ON o.provider_id = sp.id
    WHERE 1=1`;
  const params: unknown[] = [];

  // 普通用户只能看自己的订单
  if (payload.role === 'user') {
    sql += ' AND o.user_id = ?';
    params.push(payload.sub);
  }

  if (type) {
    sql += ' AND o.type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (providerId) {
    sql += ' AND o.provider_id = ?';
    params.push(providerId);
  }

  const countSql = sql.replace(/SELECT o\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 订单详情 ==========
orderRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const order = await c.env.DB.prepare(
    `SELECT o.*, 
      u.name as user_name, u.phone as user_phone,
      sp.name as provider_name, sp.phone as provider_phone
    FROM orders o 
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN service_providers sp ON o.provider_id = sp.id
    WHERE o.id = ?`
  )
    .bind(id)
    .first();

  if (!order) {
    return c.json(error('订单不存在'), 404);
  }
  return c.json(success(order));
});

// ========== 创建订单 ==========
orderRoutes.post('/', async (c) => {
  const payload = c.get('user');
  const body = await c.req.json<Partial<Order>>();

  if (!body.type || !body.provider_id || !body.start_date) {
    return c.json(error('订单类型、服务商和日期不能为空'), 400);
  }

  const id = uid();
  await c.env.DB.prepare(
    `INSERT INTO orders (id, type, user_id, provider_id, machine_id, dryer_station_id, crop_variety, weight, start_date, end_date, time_slot, area, area_geo, content, amount, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.type,
      payload.sub,
      body.provider_id,
      body.machine_id || null,
      body.dryer_station_id || null,
      body.crop_variety || null,
      body.weight || null,
      body.start_date,
      body.end_date || null,
      body.time_slot || null,
      body.area || null,
      body.area_geo || null,
      body.content || null,
      body.amount || null,
      body.remark || null
    )
    .run();

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  return c.json(success(order, '预约成功'), 201);
});

// ========== 确认订单（服务商）==========
orderRoutes.put('/:id/confirm', async (c) => {
  const id = c.req.param('id');

  const order = await c.env.DB.prepare('SELECT status FROM orders WHERE id = ?').bind(id).first<Order>();
  if (!order) {
    return c.json(error('订单不存在'), 404);
  }
  if (order.status !== 'pending') {
    return c.json(error('只能确认待处理的订单'), 400);
  }

  await c.env.DB.prepare(
    "UPDATE orders SET status = 'confirmed', confirmed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  )
    .bind(id)
    .run();

  return c.json(success(null, '订单已确认'));
});

// ========== 完成订单 ==========
orderRoutes.put('/:id/complete', async (c) => {
  const id = c.req.param('id');

  await c.env.DB.prepare(
    "UPDATE orders SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  )
    .bind(id)
    .run();

  return c.json(success(null, '订单已完成'));
});

// ========== 取消订单 ==========
orderRoutes.put('/:id/cancel', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ cancel_reason?: string }>();

  await c.env.DB.prepare(
    "UPDATE orders SET status = 'cancelled', cancel_reason = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(body.cancel_reason || null, id)
    .run();

  return c.json(success(null, '订单已取消'));
});

// ========== 订单统计 ==========
orderRoutes.get('/stats/summary', async (c) => {
  const type = c.req.query('type');

  let where = '1=1';
  const params: unknown[] = [];
  if (type) {
    where = 'type = ?';
    params.push(type);
  }

  const total = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM orders WHERE ${where}`)
    .bind(...params)
    .first<{ count: number }>();

  const byStatus = await c.env.DB.prepare(
    `SELECT status, COUNT(*) as count FROM orders WHERE ${where} GROUP BY status`
  )
    .bind(...params)
    .all();

  const byProvider = await c.env.DB.prepare(
    `SELECT sp.name, COUNT(*) as count FROM orders o JOIN service_providers sp ON o.provider_id = sp.id WHERE ${where} GROUP BY o.provider_id ORDER BY count DESC LIMIT 10`
  )
    .bind(...params)
    .all();

  return c.json(success({
    total: total?.count || 0,
    byStatus: byStatus || [],
    byProvider: byProvider || [],
  }));
});
