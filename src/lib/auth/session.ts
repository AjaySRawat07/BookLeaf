import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';

export const COOKIE_NAME = 'bookleaf_session';
const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'bookleaf-secure-session-key-randomized-entropy-998877'
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'AUTHOR' | 'ADMIN';
  authorProfileId?: string | null;
}

/**
 * Sign a pure JWT session token.
 */
export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    authorProfileId: user.authorProfileId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

/**
 * Sign session token and attach to HttpOnly cookie.
 */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await signSessionToken(user);

  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  } catch {
    // Test context
  }

  return token;
}

/**
 * Verify JWT token from string or header.
 */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'AUTHOR' | 'ADMIN',
      authorProfileId: (payload.authorProfileId as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Retrieve active session from current request cookies or Authorization Bearer header.
 */
export async function getSession(): Promise<SessionUser | null> {
  // 1. Try Next.js cookie store
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(COOKIE_NAME);
    if (tokenCookie?.value) {
      const user = await verifyToken(tokenCookie.value);
      if (user) return user;
    }
  } catch {
    // continue
  }

  // 2. Fallback to raw Cookie / Authorization headers (supports curl, REST clients, PowerShell)
  try {
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const user = await verifyToken(token);
      if (user) return user;
    }

    const cookieHeader = reqHeaders.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/bookleaf_session=([^;]+)/);
      if (match) {
        const token = match[1].trim();
        const user = await verifyToken(token);
        if (user) return user;
      }
    }
  } catch {
    // Outside request context
  }

  return null;
}

/**
 * Destroy active session and clear cookie.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch {
    // Outside request context
  }
}

/**
 * Extract session from NextRequest (Middleware or Route Handlers).
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const token =
    request.cookies.get(COOKIE_NAME)?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '') ||
    request.headers.get('cookie')?.match(/bookleaf_session=([^;]+)/)?.[1];

  if (!token) return null;
  return verifyToken(token);
}
