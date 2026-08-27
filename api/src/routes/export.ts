import { Hono } from 'hono';
import { success, error } from '../utils/response';
import type { Env } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const exportRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 导出气象数据（CSV）==========
exportRoutes.get('/weather', async (c) => {
  const deviceId = c.req.query('deviceId');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const format = c.req.query('format') || 'csv';

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
  sql += ' ORDER BY timestamp ASC';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  if (format === 'csv') {
    const headers = ['时间', '空气温度(℃)', '空气湿度(%RH)', '土壤温度(℃)', '土壤水分(%)', '土壤电导率(mS/cm)', '光照(Lux)', '风向(°)', '风速(m/s)', '降雨量(mm)', '大气压(hPa)', '电池电量(%)', '太阳能电压(V)'];
    const csvRows = [headers.join(',')];

    for (const row of (results || []) as Record<string, unknown>[]) {
      csvRows.push([
        row.timestamp,
        row.air_temp ?? '',
        row.air_humidity ?? '',
        row.soil_temp ?? '',
        row.soil_moisture ?? '',
        row.soil_ec ?? '',
        row.light ?? '',
        row.wind_dir ?? '',
        row.wind_speed ?? '',
        row.rainfall ?? '',
        row.pressure ?? '',
        row.battery ?? '',
        row.solar_voltage ?? '',
      ].join(','));
    }

    const csv = '\uFEFF' + csvRows.join('\n'); // BOM for Excel中文支持
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=weather_${deviceId}_${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  return c.json(success(results));
});

// ========== 导出虫情数据 ==========
exportRoutes.get('/pest', async (c) => {
  const deviceId = c.req.query('deviceId');
  const from = c.req.query('from');
  const to = c.req.query('to');

  let sql = 'SELECT * FROM pest_data WHERE 1=1';
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
  sql += ' ORDER BY timestamp ASC';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  const headers = ['时间', '害虫种类', '拉丁学名', '数量', '置信度', '分类', '是否复核', '校正种类', '校正数量'];
  const csvRows = [headers.join(',')];

  for (const row of (results || []) as Record<string, unknown>[]) {
    csvRows.push([
      row.timestamp,
      row.pest_type ?? '',
      row.latin_name ?? '',
      row.count ?? '',
      row.confidence ?? '',
      row.category ?? '',
      row.verified ? '是' : '否',
      row.verified_type ?? '',
      row.verified_count ?? '',
    ].join(','));
  }

  const csv = '\uFEFF' + csvRows.join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=pest_${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
});

// ========== 导出订单数据 ==========
exportRoutes.get('/orders', async (c) => {
  const type = c.req.query('type');
  const status = c.req.query('status');

  let sql = `SELECT o.*, u.name as user_name, u.phone as user_phone, sp.name as provider_name
    FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN service_providers sp ON o.provider_id = sp.id WHERE 1=1`;
  const params: unknown[] = [];

  if (type) {
    sql += ' AND o.type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY o.created_at DESC';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  const statusMap: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  const typeMap: Record<string, string> = { machinery: '农机', dryer: '烘干' };

  const headers = ['订单号', '类型', '用户', '联系电话', '服务商', '开始日期', '面积/重量', '金额', '状态', '创建时间'];
  const csvRows = [headers.join(',')];

  for (const row of (results || []) as Record<string, unknown>[]) {
    csvRows.push([
      row.id,
      typeMap[row.type as string] || row.type,
      row.user_name ?? '',
      row.user_phone ?? '',
      row.provider_name ?? '',
      row.start_date ?? '',
      row.area ?? row.weight ?? '',
      row.amount ?? '',
      statusMap[row.status as string] || row.status,
      row.created_at ?? '',
    ].join(','));
  }

  const csv = '\uFEFF' + csvRows.join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=orders_${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
});
