import { cookies } from 'next/headers';
import { prisma } from './db';

export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
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

  return session.user;
}
