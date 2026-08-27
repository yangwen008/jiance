import { Hono } from 'hono';
import { success, error, paginated } from '../utils/response';
import { uid } from '../utils/uid';
import type { Env, DryerStation } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const dryerRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 烘干站列表 ==========
dryerRoutes.get('/', async (c) => {
  const providerId = c.req.query('providerId');
  const keyword = c.req.query('keyword');
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');

  let sql = 'SELECT d.*, sp.name as provider_name, sp.phone as provider_phone FROM dryer_stations d LEFT JOIN service_providers sp ON d.provider_id = sp.id WHERE 1=1';
  const params: unknown[] = [];

  if (providerId) {
    sql += ' AND d.provider_id = ?';
    params.push(providerId);
  }
  if (keyword) {
    sql += ' AND (d.name LIKE ? OR d.address LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const countSql = sql.replace(/SELECT d\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.count || 0;

  sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 烘干站详情 ==========
dryerRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const station = await c.env.DB.prepare(
    'SELECT d.*, sp.name as provider_name, sp.phone as provider_phone FROM dryer_stations d LEFT JOIN service_providers sp ON d.provider_id = sp.id WHERE d.id = ?'
  )
    .bind(id)
    .first();

  if (!station) {
    return c.json(error('烘干站不存在'), 404);
  }
  return c.json(success(station));
});

// ========== 新增烘干站 ==========
dryerRoutes.post('/', async (c) => {
  const body = await c.req.json<Partial<DryerStation>>();

  if (!body.provider_id || !body.name) {
    return c.json(error('服务商和名称不能为空'), 400);
  }

  const id = uid();
  await c.env.DB.prepare(
    `INSERT INTO dryer_stations (id, provider_id, name, address, lat, lng, area_size, capacity, model, batch_size, images)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.provider_id,
      body.name,
      body.address || null,
      body.lat || null,
      body.lng || null,
      body.area_size || null,
      body.capacity || null,
      body.model || null,
      body.batch_size || null,
      body.images || null
    )
    .run();

  const station = await c.env.DB.prepare('SELECT * FROM dryer_stations WHERE id = ?').bind(id).first();
  return c.json(success(station, '添加成功'), 201);
});

// ========== 更新烘干站 ==========
dryerRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<DryerStation>>();

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ['name', 'address', 'lat', 'lng', 'area_size', 'capacity', 'model', 'batch_size', 'images'] as const;
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

  await c.env.DB.prepare(`UPDATE dryer_stations SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const station = await c.env.DB.prepare('SELECT * FROM dryer_stations WHERE id = ?').bind(id).first();
  return c.json(success(station, '更新成功'));
});

// ========== 删除烘干站 ==========
dryerRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM dryer_stations WHERE id = ?').bind(id).run();
  return c.json(success(null, '删除成功'));
});
