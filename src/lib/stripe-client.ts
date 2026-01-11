import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import Stripe from 'stripe';
import { prisma } from './db';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encryptSecret(secret: string): { encryptedValue: string; iv: string } {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  const encryptedValue = encrypted + authTag.toString('hex');

  return {
    encryptedValue,
    iv: iv.toString('hex'),
  };
}

export function decryptSecret(encryptedValue: string, iv: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  const authTag = Buffer.from(encryptedValue.slice(-AUTH_TAG_LENGTH * 2), 'hex');
  const encrypted = encryptedValue.slice(0, -AUTH_TAG_LENGTH * 2);

  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(encryptionKey, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export async function getStripeClient(organizationId: string): Promise<Stripe> {
  const stripeAccount = await prisma.stripeAccount.findUnique({
    where: { organizationId },
  });

  if (!stripeAccount) {
    throw new Error('Stripe not connected');
  }

  const decryptedApiKey = decryptSecret(
    stripeAccount.encryptedApiKey,
    stripeAccount.encryptionIV
  );

  const stripe = new Stripe(decryptedApiKey, {
    apiVersion: '2023-10-16',
  });

  return stripe;
}
