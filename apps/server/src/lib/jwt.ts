// JWT utilities for authentication
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import type { Role } from '../db/schema';

// JWT configuration from environment
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Token payload interface
export interface TokenPayload extends JWTPayload {
  sub: string; // Account ID
  email: string;
  role: Role;
  type: 'access' | 'refresh';
}

// Parse duration string to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

// Generate access token
export async function generateAccessToken(payload: {
  accountId: string;
  email: string;
  role: Role;
}): Promise<string> {
  const expiresIn = parseDuration(JWT_EXPIRES_IN);

  return await new SignJWT({
    sub: payload.accountId,
    email: payload.email,
    role: payload.role,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(JWT_SECRET);
}

// Generate refresh token
export async function generateRefreshToken(payload: {
  accountId: string;
  email: string;
  role: Role;
}): Promise<{ token: string; expiresAt: Date }> {
  const expiresIn = parseDuration(REFRESH_TOKEN_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const token = await new SignJWT({
    sub: payload.accountId,
    email: payload.email,
    role: payload.role,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(JWT_SECRET);

  return { token, expiresAt };
}

// Generate both tokens
export async function generateTokens(payload: {
  accountId: string;
  email: string;
  role: Role;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}> {
  const accessToken = await generateAccessToken(payload);
  const { token: refreshToken, expiresAt: refreshTokenExpiresAt } =
    await generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
}

// Verify token
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch (error) {
    console.error('🔴 JWT Verify Error:', error);
    // Token is invalid or expired
    return null;
  }
}

// Verify access token specifically
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  const payload = await verifyToken(token);

  if (!payload || payload.type !== 'access') {
    return null;
  }

  return payload;
}

// Verify refresh token specifically
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  const payload = await verifyToken(token);

  if (!payload || payload.type !== 'refresh') {
    return null;
  }

  return payload;
}

// Extract token from Authorization header
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

// Token expiration times for client use
export function getTokenExpirationTimes(): {
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
} {
  return {
    accessTokenExpiresIn: parseDuration(JWT_EXPIRES_IN),
    refreshTokenExpiresIn: parseDuration(REFRESH_TOKEN_EXPIRES_IN),
  };
}
