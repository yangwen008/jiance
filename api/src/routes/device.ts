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

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

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

// ========== 设备截图历史 ==========
deviceRoutes.get('/:id/snapshots', async (c) => {
  const id = c.req.param('id');
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');

  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as total FROM camera_snapshots WHERE device_id = ?'
  ).bind(id).first<{ total: number }>();
  const total = countResult?.total || 0;

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM camera_snapshots WHERE device_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?'
  ).bind(id, pageSize, (page - 1) * pageSize).all();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 图片上传到 R2 ==========
deviceRoutes.post('/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const prefix = (formData.get('prefix') as string) || 'uploads';

  if (!file) {
    return c.json(error('请选择文件'), 400);
  }

  // 限制文件大小 10MB
  if (file.size > 10 * 1024 * 1024) {
    return c.json(error('文件大小不能超过10MB'), 400);
  }

  const ext = file.name?.split('.').pop() || 'jpg';
  const key = `${prefix}/${new Date().toISOString().slice(0, 10)}/${uid()}.${ext}`;

  await c.env.R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  // 返回 R2 的公开访问路径（需要配置 R2 公开访问或自定义域名）
  const url = `/api/devices/file/${key}`;
  return c.json(success({ url, key }));
});

// ========== 从 R2 读取文件 ==========
deviceRoutes.get('/file/*', async (c) => {
  const key = c.req.path.replace('/api/devices/file/', '');
  const object = await c.env.R2.get(key);

  if (!object) {
    return c.json(error('文件不存在'), 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=86400');
  return new Response(object.body, { headers });
});

// ========== 预警自动检查 ==========
async function checkAlerts(db: D1Database, deviceId: string, sensorType: string, value: number) {
  // 查找匹配的预警规则（设备特定 + 全局）
  const { results: rules } = await db.prepare(
    `SELECT * FROM alert_rules WHERE enabled = 1 AND sensor_type = ? AND (device_id = ? OR device_id IS NULL)`
  ).bind(sensorType, deviceId).all<{ id: string; min_value: number | null; max_value: number | null; notify_sms: number; notify_push: number }>();

  for (const rule of rules) {
    let triggered = false;
    let threshold = '';

    if (rule.min_value !== null && value < rule.min_value) {
      triggered = true;
      threshold = `< ${rule.min_value}`;
    }
    if (rule.max_value !== null && value > rule.max_value) {
      triggered = true;
      threshold = `> ${rule.max_value}`;
    }

    if (triggered) {
      const alertId = uid();
      const message = `设备 ${deviceId} 的 ${sensor_type_label(sensorType)} 检测值 ${value} ${threshold}，触发预警`;

      await db.prepare(
        `INSERT INTO alert_logs (id, rule_id, device_id, sensor_type, value, threshold, message, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'unread')`
      ).bind(alertId, rule.id, deviceId, sensorType, value, threshold, message).run();
    }
  }
}

function sensor_type_label(type: string): string {
  const map: Record<string, string> = {
    temperature: '空气温度',
    humidity: '空气湿度',
    wind_speed: '风速',
    rainfall: '降雨量',
    soil_moisture: '土壤水分',
    soil_temp: '土壤温度',
    pest_count: '虫量',
    light: '光照强度',
    pressure: '大气压',
  };
  return map[type] || type;
}

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

  const timestamp = (body.timestamp as string) || new Date().toISOString();

  // ========== 气象站 ==========
  if (device.type === 'weather') {
    await c.env.DB.prepare(
      `INSERT INTO weather_data (device_id, timestamp, air_temp, air_humidity, soil_temp, soil_moisture, soil_ec, light, wind_dir, wind_speed, rainfall, pressure, battery, solar_voltage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id, timestamp,
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

    // 自动触发预警检查
    const alertChecks: [string, number | undefined][] = [
      ['temperature', body.air_temp as number],
      ['humidity', body.air_humidity as number],
      ['wind_speed', body.wind_speed as number],
      ['rainfall', body.rainfall as number],
      ['soil_moisture', body.soil_moisture as number],
      ['soil_temp', body.soil_temp as number],
      ['light', body.light as number],
      ['pressure', body.pressure as number],
    ];

    for (const [sensorType, value] of alertChecks) {
      if (value !== undefined && value !== null) {
        await checkAlerts(c.env.DB, id, sensorType, value);
      }
    }
  }

  // ========== 虫情监测仪 ==========
  else if (device.type === 'pest_monitor') {
    const count = Number(body.count) || 0;
    await c.env.DB.prepare(
      `INSERT INTO pest_data (device_id, timestamp, pest_type, latin_name, count, confidence, category, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id, timestamp,
        body.pest_type ?? null,
        body.latin_name ?? null,
        count,
        body.confidence ?? null,
        body.category ?? null,
        body.image_url ?? null
      )
      .run();

    // 虫量预警检查
    if (count > 0) {
      await checkAlerts(c.env.DB, id, 'pest_count', count);
    }
  }

  // ========== 视频监控 ==========
  else if (device.type === 'camera') {
    if (!body.image_url) {
      return c.json(error('摄像头上报需要 image_url'), 400);
    }
    await c.env.DB.prepare(
      `INSERT INTO camera_snapshots (device_id, timestamp, image_url, type, note)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        id, timestamp,
        body.image_url,
        body.type || 'auto',
        body.note ?? null
      )
      .run();
  }

  // ========== 多光谱 ==========
  else if (device.type === 'multispectral') {
    await c.env.DB.prepare(
      `INSERT INTO vegetation_data (device_id, timestamp, ndvi, gndvi, ndre, osavi, lci, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id, timestamp,
        body.ndvi ?? null,
        body.gndvi ?? null,
        body.ndre ?? null,
        body.osavi ?? null,
        body.lci ?? null,
        body.image_url ?? null
      )
      .run();
  }

  return c.json(success(null, '数据接收成功'));
});
