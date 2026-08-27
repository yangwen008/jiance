import { Hono } from 'hono';
import { success, error, paginated } from '../utils/response';
import { uid } from '../utils/uid';
import { roleMiddleware } from '../middleware/auth';
import type { Env, Device } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const deviceRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 设备列表 ==========
deviceRoutes.get('/', async (c) => {
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');
  const type = c.req.query('type');
  const status = c.req.query('status');
  const village = c.req.query('village');

  let sql = 'SELECT * FROM devices WHERE 1=1';
  const params: unknown[] = [];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (village) {
    sql += ' AND village LIKE ?';
    params.push(`%${village}%`);
  }

  // 总数
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  // 分页
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<Device>();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 设备详情 ==========
deviceRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const device = await c.env.DB.prepare('SELECT * FROM devices WHERE id = ?').bind(id).first<Device>();

  if (!device) {
    return c.json(error('设备不存在'), 404);
  }

  return c.json(success(device));
});

// ========== 新增设备 ==========
deviceRoutes.post('/', roleMiddleware('admin', 'manager'), async (c) => {
  const body = await c.req.json<Partial<Device>>();

  if (!body.type || !body.name) {
    return c.json(error('设备类型和名称不能为空'), 400);
  }

  const id = uid();
  await c.env.DB.prepare(
    `INSERT INTO devices (id, type, name, village, address, lat, lng, altitude, status, sim_iccid, config, firmware)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.type,
      body.name,
      body.village || null,
      body.address || null,
      body.lat || null,
      body.lng || null,
      body.altitude || null,
      body.status || 'offline',
      body.sim_iccid || null,
      body.config || null,
      body.firmware || null
    )
    .run();

  const device = await c.env.DB.prepare('SELECT * FROM devices WHERE id = ?').bind(id).first<Device>();
  return c.json(success(device, '设备添加成功'), 201);
});

// ========== 更新设备 ==========
deviceRoutes.put('/:id', roleMiddleware('admin', 'manager'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<Device>>();

  const existing = await c.env.DB.prepare('SELECT id FROM devices WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('设备不存在'), 404);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ['name', 'village', 'address', 'lat', 'lng', 'altitude', 'status', 'sim_iccid', 'config', 'firmware'] as const;

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

  await c.env.DB.prepare(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const device = await c.env.DB.prepare('SELECT * FROM devices WHERE id = ?').bind(id).first<Device>();
  return c.json(success(device, '设备更新成功'));
});

// ========== 删除设备 ==========
deviceRoutes.delete('/:id', roleMiddleware('admin'), async (c) => {
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare('SELECT id FROM devices WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('设备不存在'), 404);
  }

  await c.env.DB.prepare('DELETE FROM devices WHERE id = ?').bind(id).run();
  return c.json(success(null, '设备删除成功'));
});

// ========== 设备上报数据（供硬件调用）==========
deviceRoutes.post('/:id/data', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Record<string, unknown>>();

  const device = await c.env.DB.prepare('SELECT id, type FROM devices WHERE id = ?').bind(id).first<Device>();
  if (!device) {
    return c.json(error('设备不存在'), 404);
  }

  // 更新设备最后在线时间
  await c.env.DB.prepare("UPDATE devices SET last_seen = datetime('now'), status = 'online' WHERE id = ?")
    .bind(id)
    .run();

  // 根据设备类型分发数据
  if (device.type === 'weather') {
    await c.env.DB.prepare(
      `INSERT INTO weather_data (device_id, timestamp, air_temp, air_humidity, soil_temp, soil_moisture, soil_ec, light, wind_dir, wind_speed, rainfall, pressure, battery, solar_voltage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.timestamp || new Date().toISOString(),
        body.air_temp ?? null,
        body.air_humidity ?? null,
        body.soil_temp ?? null,
        body.soil_moisture ?? null,
        body.soil_ec ?? null,
        body.light ?? null,
        body.wind_dir ?? null,
        body.wind_speed ?? null,
        body.rainfall ?? null,
        body.pressure ?? null,
        body.battery ?? null,
        body.solar_voltage ?? null
      )
      .run();
  }

  return c.json(success(null, '数据接收成功'));
});
