// CSRF Protection using Double Submit Cookie Pattern
import { randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');

  // Set CSRF token in httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return token;
}

export async function validateCsrfToken(submittedToken: string | null | undefined): Promise<boolean> {
  if (!submittedToken) {
    return false;
  }

  // Get token from cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return false;
  }

  // Timing-safe comparison
  try {
    const cookieBuffer = Buffer.from(cookieToken);
    const submittedBuffer = Buffer.from(submittedToken);

    if (cookieBuffer.length !== submittedBuffer.length) {
      return false;
    }

    return timingSafeEqual(cookieBuffer, submittedBuffer);
  } catch {
    return false;
  }
}

export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}
