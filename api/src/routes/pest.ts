import { Hono } from 'hono';
import { success, error, paginated } from '../utils/response';
import type { Env, PestData } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const pestRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 最新虫情 ==========
pestRoutes.get('/latest', async (c) => {
  const deviceId = c.req.query('deviceId');

  let sql = `SELECT * FROM pest_data`;
  const params: unknown[] = [];

  if (deviceId) {
    sql += ' WHERE device_id = ?';
    params.push(deviceId);
  }
  sql += ' ORDER BY timestamp DESC LIMIT 20';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<PestData>();
  return c.json(success(results || []));
});

// ========== 虫情历史查询 ==========
pestRoutes.get('/history', async (c) => {
  const deviceId = c.req.query('deviceId');
  const pestType = c.req.query('pestType');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const verified = c.req.query('verified');
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '50');

  let sql = 'SELECT * FROM pest_data WHERE 1=1';
  const params: unknown[] = [];

  if (deviceId) {
    sql += ' AND device_id = ?';
    params.push(deviceId);
  }
  if (pestType) {
    sql += ' AND (pest_type = ? OR verified_type = ?)';
    params.push(pestType, pestType);
  }
  if (from) {
    sql += ' AND timestamp >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND timestamp <= ?';
    params.push(to);
  }
  if (verified !== undefined) {
    sql += ' AND verified = ?';
    params.push(Number(verified));
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<PestData>();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 虫量趋势 ==========
pestRoutes.get('/trend', async (c) => {
  const deviceId = c.req.query('deviceId');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const period = c.req.query('period') || 'day'; // day / week / month

  if (!deviceId) {
    return c.json(error('请指定设备ID'), 400);
  }

  let groupBy: string;
  if (period === 'week') {
    groupBy = "strftime('%Y-W%W', timestamp)";
  } else if (period === 'month') {
    groupBy = "strftime('%Y-%m', timestamp)";
  } else {
    groupBy = "strftime('%Y-%m-%d', timestamp)";
  }

  let sql = `SELECT 
    ${groupBy} as period,
    pest_type,
    SUM(count) as total_count,
    AVG(confidence) as avg_confidence,
    COUNT(*) as sample_count
  FROM pest_data WHERE device_id = ?`;
  const params: unknown[] = [deviceId];

  if (from) {
    sql += ' AND timestamp >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND timestamp <= ?';
    params.push(to);
  }

  sql += ` GROUP BY ${groupBy}, pest_type ORDER BY period DESC, total_count DESC`;

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(success(results || []));
});

// ========== 年度汇总 ==========
pestRoutes.get('/annual', async (c) => {
  const deviceId = c.req.query('deviceId');
  const year = c.req.query('year') || new Date().getFullYear().toString();

  if (!deviceId) {
    return c.json(error('请指定设备ID'), 400);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT 
      pest_type,
      SUM(count) as total_count,
      MIN(timestamp) as first_seen,
      MAX(timestamp) as last_seen,
      COUNT(*) as record_count,
      AVG(confidence) as avg_confidence
    FROM pest_data 
    WHERE device_id = ? AND timestamp LIKE ?
    GROUP BY pest_type
    ORDER BY total_count DESC`
  )
    .bind(deviceId, `${year}%`)
    .all();

  // 分析高发时段
  const peakHours = await c.env.DB.prepare(
    `SELECT 
      strftime('%H', timestamp) as hour,
      SUM(count) as total_count
    FROM pest_data
    WHERE device_id = ? AND timestamp LIKE ?
    GROUP BY strftime('%H', timestamp)
    ORDER BY total_count DESC
    LIMIT 3`
  )
    .bind(deviceId, `${year}%`)
    .all();

  return c.json(success({
    summary: results || [],
    peakHours: peakHours || [],
  }));
});

// ========== 人工复核 ==========
pestRoutes.put('/:id/verify', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ verified_type: string; verified_count?: number }>();

  if (!body.verified_type) {
    return c.json(error('请填写校正后的害虫种类'), 400);
  }

  await c.env.DB.prepare(
    'UPDATE pest_data SET verified = 1, verified_type = ?, verified_count = ? WHERE id = ?'
  )
    .bind(body.verified_type, body.verified_count ?? null, Number(id))
    .run();

  return c.json(success(null, '复核完成'));
});

// ========== 批量复核 ==========
pestRoutes.put('/verify/batch', async (c) => {
  const body = await c.req.json<{ ids: number[]; verified_type: string; verified_count?: number }>();

  if (!body.ids?.length || !body.verified_type) {
    return c.json(error('参数不完整'), 400);
  }

  const placeholders = body.ids.map(() => '?').join(',');
  await c.env.DB.prepare(
    `UPDATE pest_data SET verified = 1, verified_type = ?, verified_count = ? WHERE id IN (${placeholders})`
  )
    .bind(body.verified_type, body.verified_count ?? null, ...body.ids)
    .run();

  return c.json(success(null, `已复核 ${body.ids.length} 条记录`));
});

// ========== 虫害种类统计 ==========
pestRoutes.get('/species', async (c) => {
  const deviceId = c.req.query('deviceId');
  const from = c.req.query('from');
  const to = c.req.query('to');

  let sql = `SELECT 
    COALESCE(verified_type, pest_type) as species,
    SUM(count) as total_count,
    COUNT(*) as record_count
  FROM pest_data WHERE 1=1`;
  const params: unknown[] = [];

  if (deviceId) {
    sql += ' AND device_id = ?';
    params.push(deviceId);
  }
  if (from) {
    sql += ' AND timestamp >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND timestamp <= ?';
    params.push(to);
  }

  sql += ' GROUP BY COALESCE(verified_type, pest_type) ORDER BY total_count DESC';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(success(results || []));
});

// ========== 虫情日统计汇总（供 Cron Trigger 调用）==========
pestRoutes.post('/aggregate-daily', async (c) => {
  const rawBody: { date?: string } = await c.req.json().catch(() => ({}));
  const date = rawBody.date || new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const { results: devices } = await c.env.DB.prepare(
    "SELECT id FROM devices WHERE type = 'pest_monitor'"
  ).all<{ id: string }>();

  let aggregated = 0;

  for (const device of devices || []) {
    const { results: rows } = await c.env.DB.prepare(
      `SELECT
        COALESCE(verified_type, pest_type) as pest_type,
        SUM(count) as total_count,
        AVG(confidence) as avg_confidence
       FROM pest_data
       WHERE device_id = ? AND timestamp >= ? AND timestamp < ?
       GROUP BY COALESCE(verified_type, pest_type)`
    ).bind(device.id, date, date + 'T24:00:00').all<Record<string, unknown>>();

    for (const row of rows || []) {
      await c.env.DB.prepare(
        `INSERT INTO pest_daily (device_id, date, pest_type, total_count, avg_confidence)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(device_id, date, pest_type) DO UPDATE SET
           total_count = excluded.total_count, avg_confidence = excluded.avg_confidence`
      ).bind(
        device.id, date,
        row.pest_type as string,
        row.total_count as number,
        Math.round(((row.avg_confidence as number) || 0) * 100) / 100
      ).run();
    }

    aggregated++;
  }

  return c.json(success({ date, devices: aggregated }, `已汇总 ${aggregated} 个设备的 ${date} 虫情日统计`));
});
