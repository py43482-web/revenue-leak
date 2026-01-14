import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateCronSecret } from '@/lib/cron-auth';

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET using timing-safe comparison
    const authHeader = request.headers.get('authorization');
    if (!validateCronSecret(authHeader)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete expired sessions
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedSessions: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Session cleanup error occurred');
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during session cleanup',
      },
      { status: 200 } // Return 200 to prevent Vercel retries
    );
  }
}
