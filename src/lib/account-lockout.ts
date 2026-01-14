// Account lockout tracker for failed login attempts
// In production, consider using Redis for distributed systems

interface LockoutEntry {
  attempts: number;
  lockedUntil: number | null;
}

const lockoutStore = new Map<string, LockoutEntry>();

// Cleanup old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of lockoutStore.entries()) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      lockoutStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function recordFailedLogin(email: string): { isLocked: boolean; lockedUntil: number | null } {
  const now = Date.now();
  const key = `lockout:${email.toLowerCase()}`;

  let entry = lockoutStore.get(key);

  // If no entry, create new one
  if (!entry) {
    entry = {
      attempts: 1,
      lockedUntil: null,
    };
    lockoutStore.set(key, entry);
    return { isLocked: false, lockedUntil: null };
  }

  // If locked and lockout period hasn't expired
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { isLocked: true, lockedUntil: entry.lockedUntil };
  }

  // If locked but lockout period expired, reset
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    entry.attempts = 1;
    entry.lockedUntil = null;
    lockoutStore.set(key, entry);
    return { isLocked: false, lockedUntil: null };
  }

  // Increment attempts
  entry.attempts++;

  // Lock if max attempts reached
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    lockoutStore.set(key, entry);
    return { isLocked: true, lockedUntil: entry.lockedUntil };
  }

  lockoutStore.set(key, entry);
  return { isLocked: false, lockedUntil: null };
}

export function checkAccountLockout(email: string): { isLocked: boolean; lockedUntil: number | null } {
  const now = Date.now();
  const key = `lockout:${email.toLowerCase()}`;

  const entry = lockoutStore.get(key);

  if (!entry) {
    return { isLocked: false, lockedUntil: null };
  }

  // Check if locked and lockout hasn't expired
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { isLocked: true, lockedUntil: entry.lockedUntil };
  }

  // Lockout expired
  return { isLocked: false, lockedUntil: null };
}

export function clearAccountLockout(email: string): void {
  const key = `lockout:${email.toLowerCase()}`;
  lockoutStore.delete(key);
}
