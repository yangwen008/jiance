import { Context, Next } from 'hono';
import { verifyToken } from '../utils/jwt';
import { error } from '../utils/response';
import type { Env, JwtPayload } from '../types';

// 扩展 Hono Context 的变量类型
type Variables = {
  user: JwtPayload;
};

export function authMiddleware() {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(error('未登录，请先登录', 401), 401);
    }

    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      c.set('user', payload);
      await next();
    } catch {
      return c.json(error('登录已过期，请重新登录', 401), 401);
    }
  };
}

export function roleMiddleware(...roles: string[]) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json(error('无权访问', 403), 403);
    }
    await next();
  };
}
