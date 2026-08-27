import { Hono } from 'hono';
import { success, error, paginated } from '../utils/response';
import type { Env, WeatherData, WeatherDaily } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const weatherRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 最新数据 ==========
weatherRoutes.get('/latest', async (c) => {
  const deviceId = c.req.query('deviceId');
  if (!deviceId) {
    return c.json(error('请指定设备ID'), 400);
  }

  const data = await c.env.DB.prepare(
    'SELECT * FROM weather_data WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1'
  )
    .bind(deviceId)
    .first<WeatherData>();

  return c.json(success(data));
});

// ========== 所有设备最新数据 ==========
weatherRoutes.get('/latest/all', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT w.* FROM weather_data w
     INNER JOIN (SELECT device_id, MAX(timestamp) as max_ts FROM weather_data GROUP BY device_id) latest
     ON w.device_id = latest.device_id AND w.timestamp = latest.max_ts`
  ).all<WeatherData>();

  return c.json(success(results || []));
});

// ========== 历史数据查询 ==========
weatherRoutes.get('/history', async (c) => {
  const deviceId = c.req.query('deviceId');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '100');

  if (!deviceId) {
    return c.json(error('请指定设备ID'), 400);
  }

  let sql = 'SELECT * FROM weather_data WHERE device_id = ?';
  const params: unknown[] = [deviceId];

  if (from) {
    sql += ' AND timestamp >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND timestamp <= ?';
    params.push(to);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<WeatherData>();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 统计数据（自动聚合）==========
weatherRoutes.get('/stats', async (c) => {
  const deviceId = c.req.query('deviceId');
  const period = c.req.query('period') || 'day'; // day / week / month
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!deviceId) {
    return c.json(error('请指定设备ID'), 400);
  }

  // 优先查日统计表
  let sql: string;
  const params: unknown[] = [deviceId];

  if (from) {
    params.push(from);
  }
  if (to) {
    params.push(to);
  }

  if (period === 'day') {
    sql = `SELECT * FROM weather_daily WHERE device_id = ?`;
    if (from) sql += ' AND date >= ?';
    if (to) sql += ' AND date <= ?';
    sql += ' ORDER BY date DESC LIMIT 30';
  } else if (period === 'week') {
    // 按周聚合
    sql = `SELECT 
      device_id,
      strftime('%Y-W%W', date) as period,
      MIN(temp_min) as temp_min, MAX(temp_max) as temp_max, AVG(temp_avg) as temp_avg,
      MIN(humidity_min) as humidity_min, MAX(humidity_max) as humidity_max, AVG(humidity_avg) as humidity_avg,
      SUM(rainfall_total) as rainfall_total,
      MAX(wind_speed_max) as wind_speed_max,
      AVG(light_hours) as light_hours,
      SUM(effective_temp) as effective_temp
    FROM weather_daily WHERE device_id = ?`;
    if (from) sql += ' AND date >= ?';
    if (to) sql += ' AND date <= ?';
    sql += ' GROUP BY strftime(\'%Y-W%W\', date) ORDER BY period DESC LIMIT 12';
  } else {
    // 按月聚合
    sql = `SELECT 
      device_id,
      strftime('%Y-%m', date) as period,
      MIN(temp_min) as temp_min, MAX(temp_max) as temp_max, AVG(temp_avg) as temp_avg,
      MIN(humidity_min) as humidity_min, MAX(humidity_max) as humidity_max, AVG(humidity_avg) as humidity_avg,
      SUM(rainfall_total) as rainfall_total,
      MAX(wind_speed_max) as wind_speed_max,
      AVG(light_hours) as light_hours,
      SUM(effective_temp) as effective_temp
    FROM weather_daily WHERE device_id = ?`;
    if (from) sql += ' AND date >= ?';
    if (to) sql += ' AND date <= ?';
    sql += ' GROUP BY strftime(\'%Y-%m\', date) ORDER BY period DESC LIMIT 12';
  }

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  return c.json(success(results || []));
});

// ========== 积温积光查询 ==========
weatherRoutes.get('/accumulation', async (c) => {
  const deviceId = c.req.query('deviceId');
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!deviceId) {
    return c.json(error('请指定设备ID'), 400);
  }

  let sql = 'SELECT date, effective_temp, light_hours FROM weather_daily WHERE device_id = ?';
  const params: unknown[] = [deviceId];

  if (from) {
    sql += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND date <= ?';
    params.push(to);
  }
  sql += ' ORDER BY date ASC';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  // 计算累计值
  let cumulativeTemp = 0;
  let cumulativeLight = 0;
  const data = (results || []).map((row: Record<string, unknown>) => {
    cumulativeTemp += (row.effective_temp as number) || 0;
    cumulativeLight += (row.light_hours as number) || 0;
    return {
      ...row,
      cumulative_temp: Math.round(cumulativeTemp * 100) / 100,
      cumulative_light: Math.round(cumulativeLight * 100) / 100,
    };
  });

  return c.json(success(data));
});

// ========== 墒情分析 ==========
weatherRoutes.get('/soil', async (c) => {
  const deviceId = c.req.query('deviceId');
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!deviceId) {
    return c.json(error('请指定设备ID'), 400);
  }

  let sql = `SELECT timestamp, soil_temp, soil_moisture, soil_ec 
             FROM weather_data WHERE device_id = ? AND (soil_temp IS NOT NULL OR soil_moisture IS NOT NULL)`;
  const params: unknown[] = [deviceId];

  if (from) {
    sql += ' AND timestamp >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND timestamp <= ?';
    params.push(to);
  }
  sql += ' ORDER BY timestamp ASC';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  return c.json(success(results || []));
});

// ========== 日统计汇总（供 Cron Trigger 调用）==========
weatherRoutes.post('/aggregate-daily', async (c) => {
  const rawBody: { date?: string } = await c.req.json().catch(() => ({}));
  // 默认汇总昨天的数据
  const date = rawBody.date || new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // 获取积温基准温度
  const baseTempConfig = await c.env.DB.prepare(
    "SELECT value FROM system_config WHERE key = 'accumulation_base_temp'"
  ).first<{ value: string }>();
  const baseTemp = Number(baseTempConfig?.value) || 10;

  // 汇总所有气象设备的当天数据
  const { results: devices } = await c.env.DB.prepare(
    "SELECT id FROM devices WHERE type = 'weather'"
  ).all<{ id: string }>();

  let aggregated = 0;

  for (const device of devices || []) {
    const row = await c.env.DB.prepare(
      `SELECT
        MAX(CAST(air_temp AS REAL)) as temp_max,
        MIN(CAST(air_temp AS REAL)) as temp_min,
        AVG(CAST(air_temp AS REAL)) as temp_avg,
        MAX(CAST(air_humidity AS REAL)) as humidity_max,
        MIN(CAST(air_humidity AS REAL)) as humidity_min,
        AVG(CAST(air_humidity AS REAL)) as humidity_avg,
        SUM(CAST(rainfall AS REAL)) as rainfall_total,
        MAX(CAST(wind_speed AS REAL)) as wind_speed_max,
        MAX(CAST(light AS REAL)) as light_max
       FROM weather_data
       WHERE device_id = ? AND timestamp >= ? AND timestamp < ?`
    ).bind(device.id, date, date + 'T24:00:00').first<Record<string, number | null>>();

    if (!row || row.temp_avg === null) continue;

    // 计算有效积温（日均温 - 基准温度，仅取正值）
    const effectiveTemp = Math.max(0, (row.temp_avg || 0) - baseTemp);

    // 估算有效光照时长（光照 > 1000 Lux 的记录数 * 采集间隔，假设5分钟一次）
    const lightCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM weather_data
       WHERE device_id = ? AND timestamp >= ? AND timestamp < ? AND CAST(light AS REAL) > 1000`
    ).bind(device.id, date, date + 'T24:00:00').first<{ cnt: number }>();
    const lightHours = ((lightCount?.cnt || 0) * 5) / 60;

    // Upsert 日统计
    await c.env.DB.prepare(
      `INSERT INTO weather_daily (device_id, date, temp_max, temp_min, temp_avg, humidity_max, humidity_min, humidity_avg, rainfall_total, wind_speed_max, light_max, light_hours, effective_temp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(device_id, date) DO UPDATE SET
         temp_max = excluded.temp_max, temp_min = excluded.temp_min, temp_avg = excluded.temp_avg,
         humidity_max = excluded.humidity_max, humidity_min = excluded.humidity_min, humidity_avg = excluded.humidity_avg,
         rainfall_total = excluded.rainfall_total, wind_speed_max = excluded.wind_speed_max,
         light_max = excluded.light_max, light_hours = excluded.light_hours, effective_temp = excluded.effective_temp`
    ).bind(
      device.id, date,
      row.temp_max, row.temp_min, Math.round((row.temp_avg || 0) * 100) / 100,
      row.humidity_max, row.humidity_min, Math.round((row.humidity_avg || 0) * 100) / 100,
      row.rainfall_total || 0, row.wind_speed_max || 0, row.light_max || 0,
      Math.round(lightHours * 100) / 100, Math.round(effectiveTemp * 100) / 100
    ).run();

    aggregated++;
  }

  return c.json(success({ date, devices: aggregated }, `已汇总 ${aggregated} 个设备的 ${date} 日统计`));
});
