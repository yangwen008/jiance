import { Hono } from 'hono';
import { signToken } from '../utils/jwt';
import { success, error } from '../utils/response';
import { uid } from '../utils/uid';
import type { Env, User } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// 简易密码哈希（生产环境建议用 bcrypt）
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

// ========== 注册 ==========
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ phone: string; password: string; name?: string }>();

  if (!body.phone || !body.password) {
    return c.json(error('手机号和密码不能为空'), 400);
  }
  if (body.password.length < 6) {
    return c.json(error('密码至少6位'), 400);
  }

  // 检查手机号是否已注册
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?')
    .bind(body.phone)
    .first();
  if (existing) {
    return c.json(error('该手机号已注册'), 409);
  }

  const id = uid();
  const hashed = await hashPassword(body.password);

  await c.env.DB.prepare(
    'INSERT INTO users (id, phone, name, password, role) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, body.phone, body.name || null, hashed, 'user')
    .run();

  const token = await signToken({ sub: id, phone: body.phone, role: 'user' }, c.env.JWT_SECRET);

  return c.json(success({ token, user: { id, phone: body.phone, name: body.name, role: 'user' } }));
});

// ========== 登录 ==========
authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ phone: string; password: string }>();

  if (!body.phone || !body.password) {
    return c.json(error('手机号和密码不能为空'), 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE phone = ?')
    .bind(body.phone)
    .first<User & { password: string }>();

  if (!user) {
    return c.json(error('用户不存在'), 404);
  }
  if (user.status === 'disabled') {
    return c.json(error('账号已被禁用'), 403);
  }
  if (!(await verifyPassword(body.password, user.password))) {
    return c.json(error('密码错误'), 401);
  }

  const token = await signToken({ sub: user.id, phone: user.phone, role: user.role }, c.env.JWT_SECRET);

  const { password: _, ...userInfo } = user;
  return c.json(success({ token, user: userInfo }));
});

// ========== 获取当前用户信息 ==========
authRoutes.get('/me', async (c) => {
  const payload = c.get('user');
  if (!payload) {
    return c.json(error('未登录', 401), 401);
  }

  const user = await c.env.DB.prepare(
    'SELECT id, phone, name, role, avatar, status, created_at FROM users WHERE id = ?'
  )
    .bind(payload.sub)
    .first<User>();

  if (!user) {
    return c.json(error('用户不存在'), 404);
  }

  return c.json(success(user));
});

// ========== 诊断接口（临时，排查用） ==========
authRoutes.get('/debug', async (c) => {
  // 检查 admin 用户是否存在
  const admin = await c.env.DB.prepare(
    'SELECT id, phone, name, role, status, password FROM users WHERE phone = ?'
  ).bind('13800000000').first();

  // 检查 JWT_SECRET 是否是占位符
  const secret = c.env.JWT_SECRET;
  const isPlaceholder = secret.includes('your-jwt-secret') || secret.length < 10;

  // 测试密码验证
  let passwordOk = false;
  if (admin) {
    const data = new TextEncoder().encode('admin123456');
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    passwordOk = hashHex === (admin as Record<string, unknown>).password;
  }

  return c.json({
    adminExists: !!admin,
    adminStatus: (admin as Record<string, unknown>)?.status,
    adminRole: (admin as Record<string, unknown>)?.role,
    passwordHashMatch: passwordOk,
    secretLength: secret.length,
    secretIsPlaceholder: isPlaceholder,
    secretPrefix: secret.substring(0, 5) + '...',
  });
});

// ========== 修改密码 ==========
authRoutes.put('/password', async (c) => {
  const payload = c.get('user');
  const body = await c.req.json<{ oldPassword: string; newPassword: string }>();

  if (!body.oldPassword || !body.newPassword) {
    return c.json(error('请输入原密码和新密码'), 400);
  }
  if (body.newPassword.length < 6) {
    return c.json(error('新密码至少6位'), 400);
  }

  const user = await c.env.DB.prepare('SELECT password FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<{ password: string }>();

  if (!user || !(await verifyPassword(body.oldPassword, user.password))) {
    return c.json(error('原密码错误'), 401);
  }

  const hashed = await hashPassword(body.newPassword);
  await c.env.DB.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(hashed, payload.sub)
    .run();

  return c.json(success(null, '密码修改成功'));
});
