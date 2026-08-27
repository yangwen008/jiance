import { Hono } from 'hono';
import { success, error, paginated } from '../utils/response';
import { roleMiddleware } from '../middleware/auth';
import type { Env, User } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const userRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 用户列表（管理员）==========
userRoutes.get('/', roleMiddleware('admin'), async (c) => {
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');
  const role = c.req.query('role');
  const status = c.req.query('status');
  const keyword = c.req.query('keyword');

  let sql = 'SELECT id, phone, name, role, avatar, status, created_at FROM users WHERE 1=1';
  const params: unknown[] = [];

  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (phone LIKE ? OR name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const countSql = sql.replace('SELECT id, phone, name, role, avatar, status, created_at', 'SELECT COUNT(*) as total');
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<User>();

  return c.json(paginated(results || [], total, page, pageSize));
});

// ========== 更新用户角色（管理员）==========
userRoutes.put('/:id/role', roleMiddleware('admin'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ role: string }>();

  if (!['admin', 'manager', 'user'].includes(body.role)) {
    return c.json(error('角色无效'), 400);
  }

  await c.env.DB.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(body.role, id)
    .run();

  return c.json(success(null, '角色更新成功'));
});

// ========== 启用/禁用用户（管理员）==========
userRoutes.put('/:id/status', roleMiddleware('admin'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ status: string }>();

  if (!['active', 'disabled'].includes(body.status)) {
    return c.json(error('状态无效'), 400);
  }

  await c.env.DB.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(body.status, id)
    .run();

  return c.json(success(null, body.status === 'active' ? '用户已启用' : '用户已禁用'));
});

// ========== 删除用户（管理员）==========
userRoutes.delete('/:id', roleMiddleware('admin'), async (c) => {
  const id = c.req.param('id');
  const payload = c.get('user');

  if (id === payload.sub) {
    return c.json(error('不能删除自己'), 400);
  }

  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json(success(null, '用户删除成功'));
});

// ========== 用户统计（管理员）==========
userRoutes.get('/stats', roleMiddleware('admin'), async (c) => {
  const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  const byRole = await c.env.DB.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all();
  const byStatus = await c.env.DB.prepare('SELECT status, COUNT(*) as count FROM users GROUP BY status').all();

  return c.json(success({
    total: total?.count || 0,
    byRole: byRole || [],
    byStatus: byStatus || [],
  }));
});
