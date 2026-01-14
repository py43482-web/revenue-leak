import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { checkAccountLockout, recordFailedLogin, clearAccountLockout } from '@/lib/account-lockout';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 login attempts per 15 minutes per IP
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = checkRateLimit(`login:${identifier}`, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    let { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normalize email to lowercase
    email = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check account lockout before attempting login
    const lockout = checkAccountLockout(email);
    if (lockout.isLocked && lockout.lockedUntil) {
      const minutesRemaining = Math.ceil((lockout.lockedUntil - Date.now()) / 1000 / 60);
      return NextResponse.json(
        { error: `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minutes.` },
        { status: 423 } // 423 Locked
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Record failed login attempt (even if user doesn't exist to prevent user enumeration timing)
      recordFailedLogin(email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Record failed login attempt
      const failedLockout = recordFailedLogin(email);
      if (failedLockout.isLocked && failedLockout.lockedUntil) {
        const minutesRemaining = Math.ceil((failedLockout.lockedUntil - Date.now()) / 1000 / 60);
        return NextResponse.json(
          { error: `Too many failed login attempts. Account locked for ${minutesRemaining} minutes.` },
          { status: 423 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Clear any lockout on successful login
    clearAccountLockout(email);

    // Delete all existing sessions for this user
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Generate new session token
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    // Set HttpOnly cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
      },
    });

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error occurred');
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
