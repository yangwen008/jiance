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
