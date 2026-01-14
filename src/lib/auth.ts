import { cookies } from 'next/headers';
import { prisma } from './db';

const SESSION_DURATION_DAYS = 30;
const SESSION_REFRESH_THRESHOLD_DAYS = 7; // Refresh if less than 7 days remaining

export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    return null;
  }

  // Validate session token format (64 hex characters from randomBytes(32))
  if (!/^[a-f0-9]{64}$/i.test(sessionToken)) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          organizationId: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  // Implement sliding session: refresh if less than threshold remaining
  const now = new Date();
  const daysRemaining = (session.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysRemaining < SESSION_REFRESH_THRESHOLD_DAYS) {
    // Extend session expiry
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + SESSION_DURATION_DAYS);

    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });

    // Update cookie expiry as well
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: '/',
    });
  }

  return session.user;
}
