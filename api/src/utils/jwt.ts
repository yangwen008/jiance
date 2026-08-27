import { SignJWT, jwtVerify } from 'jose';
import type { JwtPayload } from '../types';

export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, expiresIn = '7d'): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyToken(token: string, secret: string): Promise<JwtPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload as unknown as JwtPayload;
}
