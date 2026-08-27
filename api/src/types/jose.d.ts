declare module 'jose' {
  export class SignJWT {
    constructor(payload: Record<string, unknown>);
    setProtectedHeader(header: Record<string, unknown>): this;
    setIssuedAt(): this;
    setExpirationTime(exp: string): this;
    sign(key: Uint8Array): Promise<string>;
  }
  export function jwtVerify(token: string, key: Uint8Array): Promise<{ payload: Record<string, unknown> }>;
}
