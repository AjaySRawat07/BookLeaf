import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, COOKIE_NAME } from '@/lib/auth/session';
import { rateLimit } from '@/lib/auth/rateLimit';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 5 login attempts per minute per IP
    const clientIp = request.headers.get('x-forwarded-for') || 'local-ip';
    const limit = rateLimit(`login:${clientIp}`, 5, 60000);
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { authorProfile: true },
    });

    const dummyHash = '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
    const hashToCompare = user ? user.passwordHash : dummyHash;
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const token = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'AUTHOR' | 'ADMIN',
      authorProfileId: user.authorProfile?.id || null,
    });

    const response = NextResponse.json({
      success: true,
      token, // Also available for Bearer authorization in REST clients
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        authorProfile: user.authorProfile,
      },
    });

    // Explicitly attach cookie to response
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error('[API /api/auth/login] Error:', err);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
