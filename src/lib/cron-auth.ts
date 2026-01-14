import { timingSafeEqual } from 'crypto';

/**
 * Validates cron secret using timing-safe comparison to prevent timing attacks
 */
export function validateCronSecret(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return false;
  }

  const expectedAuth = `Bearer ${cronSecret}`;

  // Ensure both strings are same length before comparison
  if (authHeader.length !== expectedAuth.length) {
    return false;
  }

  try {
    // Use timing-safe comparison
    return timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(expectedAuth)
    );
  } catch {
    // If comparison fails (e.g., encoding issues), return false
    return false;
  }
}
