import { Hono } from 'hono';
import { success, error, paginated } from '../utils/response';
import { uid } from '../utils/uid';
import { roleMiddleware } from '../middleware/auth';
import type { Env, ServiceProvider } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const providerRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 服务商列表 ==========
providerRoutes.get('/', async (c) => {
  const type = c.req.query('type');
  const auditStatus = c.req.query('auditStatus');
  const keyword = c.req.query('keyword');
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');

  let sql = 'SELECT * FROM service_providers WHERE 1=1';
  const params: unknown[] = [];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (auditStatus) {
    sql += ' AND audit_status = ?';
    params.push(auditStatus);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR phone LIKE ? OR contact LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<ServiceProvider>();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 服务商详情 ==========
providerRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const provider = await c.env.DB.prepare('SELECT * FROM service_providers WHERE id = ?')
    .bind(id)
    .first<ServiceProvider>();

  if (!provider) {
    return c.json(error('服务商不存在'), 404);
  }
  return c.json(success(provider));
});

// ========== 注册服务商 ==========
providerRoutes.post('/', async (c) => {
  const body = await c.req.json<Partial<ServiceProvider>>();

  if (!body.type || !body.name || !body.phone) {
    return c.json(error('类型、名称和电话不能为空'), 400);
  }

  const id = uid();
  await c.env.DB.prepare(
    `INSERT INTO service_providers (id, type, name, contact, phone, address, license_no, license_img, id_card_img)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.type,
      body.name,
      body.contact || null,
      body.phone,
      body.address || null,
      body.license_no || null,
      body.license_img || null,
      body.id_card_img || null
    )
    .run();

  const provider = await c.env.DB.prepare('SELECT * FROM service_providers WHERE id = ?').bind(id).first();
  return c.json(success(provider, '注册成功，等待审核'), 201);
});

// ========== 审核服务商 ==========
providerRoutes.put('/:id/audit', roleMiddleware('admin', 'manager'), async (c) => {
  const id = c.req.param('id');
  const payload = c.get('user');
  const body = await c.req.json<{ audit_status: 'approved' | 'rejected'; audit_note?: string }>();

  if (!body.audit_status || !['approved', 'rejected'].includes(body.audit_status)) {
    return c.json(error('审核状态无效'), 400);
  }

  await c.env.DB.prepare(
    "UPDATE service_providers SET audit_status = ?, audit_note = ?, audited_by = ?, audited_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  )
    .bind(body.audit_status, body.audit_note || null, payload.sub, id)
    .run();

  const provider = await c.env.DB.prepare('SELECT * FROM service_providers WHERE id = ?').bind(id).first();
  return c.json(success(provider, '审核完成'));
});

// ========== 更新服务商信息 ==========
providerRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<ServiceProvider>>();

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ['name', 'contact', 'phone', 'address', 'license_no', 'license_img', 'id_card_img'] as const;
  for (const field of updatableFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) {
    return c.json(error('没有要更新的字段'), 400);
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(`UPDATE service_providers SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const provider = await c.env.DB.prepare('SELECT * FROM service_providers WHERE id = ?').bind(id).first();
  return c.json(success(provider, '更新成功'));
});

// ========== 服务商统计 ==========
providerRoutes.get('/stats/summary', async (c) => {
  const type = c.req.query('type');

  let where = '1=1';
  const params: unknown[] = [];
  if (type) {
    where = 'type = ?';
    params.push(type);
  }

  const total = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM service_providers WHERE ${where}`)
    .bind(...params)
    .first<{ count: number }>();

  const approved = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM service_providers WHERE ${where} AND audit_status = 'approved'`
  )
    .bind(...params)
    .first<{ count: number }>();

  const pending = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM service_providers WHERE ${where} AND audit_status = 'pending'`
  )
    .bind(...params)
    .first<{ count: number }>();

  return c.json(success({
    total: total?.count || 0,
    approved: approved?.count || 0,
    pending: pending?.count || 0,
  }));
});
