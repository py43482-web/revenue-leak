import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
