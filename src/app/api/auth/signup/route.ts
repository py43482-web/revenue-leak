import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, organizationName } = body;

    // Validate input
    if (!email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'Email, password, and organization name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email' },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
        { status: 400 }
      );
    }

    // Validate organization name
    if (organizationName.length < 2 || organizationName.length > 100) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create organization and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          organizationId: organization.id,
        },
      });

      return { user, organization };
    });

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create session
    await prisma.session.create({
      data: {
        userId: result.user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    // Set HttpOnly cookie
    const response = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        organizationId: result.user.organizationId,
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
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
