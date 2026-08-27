import { Hono } from 'hono';
import { success, error, paginated } from '../utils/response';
import { uid } from '../utils/uid';
import type { Env, Machine } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const machineRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 农机列表 ==========
machineRoutes.get('/', async (c) => {
  const providerId = c.req.query('providerId');
  const category = c.req.query('category');
  const status = c.req.query('status');
  const keyword = c.req.query('keyword');
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');

  let sql = 'SELECT m.*, sp.name as provider_name, sp.phone as provider_phone FROM machines m LEFT JOIN service_providers sp ON m.provider_id = sp.id WHERE 1=1';
  const params: unknown[] = [];

  if (providerId) {
    sql += ' AND m.provider_id = ?';
    params.push(providerId);
  }
  if (category) {
    sql += ' AND m.category = ?';
    params.push(category);
  }
  if (status) {
    sql += ' AND m.status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (m.brand LIKE ? OR m.model LIKE ? OR m.crop_type LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const countSql = sql.replace(/SELECT m\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 农机详情 ==========
machineRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const machine = await c.env.DB.prepare(
    'SELECT m.*, sp.name as provider_name, sp.phone as provider_phone FROM machines m LEFT JOIN service_providers sp ON m.provider_id = sp.id WHERE m.id = ?'
  )
    .bind(id)
    .first();

  if (!machine) {
    return c.json(error('农机不存在'), 404);
  }
  return c.json(success(machine));
});

// ========== 新增农机 ==========
machineRoutes.post('/', async (c) => {
  const body = await c.req.json<Partial<Machine>>();

  if (!body.provider_id || !body.category) {
    return c.json(error('服务商和类别不能为空'), 400);
  }

  const id = uid();
  await c.env.DB.prepare(
    `INSERT INTO machines (id, provider_id, category, brand, model, purchase_date, purchase_cost, power, fuel_type, work_width, efficiency, crop_type, terrain, status, images)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.provider_id,
      body.category,
      body.brand || null,
      body.model || null,
      body.purchase_date || null,
      body.purchase_cost || null,
      body.power || null,
      body.fuel_type || null,
      body.work_width || null,
      body.efficiency || null,
      body.crop_type || null,
      body.terrain || null,
      body.status || 'idle',
      body.images || null
    )
    .run();

  const machine = await c.env.DB.prepare('SELECT * FROM machines WHERE id = ?').bind(id).first();
  return c.json(success(machine, '农机添加成功'), 201);
});

// ========== 更新农机 ==========
machineRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<Machine>>();

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ['category', 'brand', 'model', 'purchase_date', 'purchase_cost', 'power', 'fuel_type', 'work_width', 'efficiency', 'crop_type', 'terrain', 'status', 'images'] as const;
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

  await c.env.DB.prepare(`UPDATE machines SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const machine = await c.env.DB.prepare('SELECT * FROM machines WHERE id = ?').bind(id).first();
  return c.json(success(machine, '更新成功'));
});

// ========== 删除农机 ==========
machineRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM machines WHERE id = ?').bind(id).run();
  return c.json(success(null, '删除成功'));
});

// ========== 农机分类统计 ==========
machineRoutes.get('/stats/category', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT category, COUNT(*) as count, SUM(CASE WHEN status = \'idle\' THEN 1 ELSE 0 END) as idle_count FROM machines GROUP BY category ORDER BY count DESC'
  ).all();

  return c.json(success(results || []));
});
