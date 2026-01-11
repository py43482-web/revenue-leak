import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (sessionToken) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: { token: sessionToken },
      });
    }

    // Clear session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
