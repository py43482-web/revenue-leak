import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptSecret } from '@/lib/stripe-client';
import { validateCsrfToken } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, mode, csrfToken } = body;

    // Validate CSRF token
    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
      return NextResponse.json(
        { error: 'Invalid security token. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Validate input
    if (!apiKey || !mode) {
      return NextResponse.json(
        { error: 'API key and mode are required' },
        { status: 400 }
      );
    }

    // Validate API key format
    if (!apiKey.startsWith('sk_test_') && !apiKey.startsWith('sk_live_')) {
      return NextResponse.json(
        { error: 'Please enter a valid Stripe API key' },
        { status: 400 }
      );
    }

    // Validate mode matches key type
    if (mode === 'live' && !apiKey.startsWith('sk_live_')) {
      return NextResponse.json(
        { error: 'Please use a live mode key (sk_live_...)' },
        { status: 400 }
      );
    }

    if (mode === 'test' && !apiKey.startsWith('sk_test_')) {
      return NextResponse.json(
        { error: 'Please use a test mode key (sk_test_...)' },
        { status: 400 }
      );
    }

    // Test API key by calling Stripe API
    let stripeAccount;
    try {
      const stripe = new Stripe(apiKey, {
        apiVersion: '2025-12-15.clover',
      });
      stripeAccount = await stripe.accounts.retrieve();
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check and try again' },
        { status: 400 }
      );
    }

    // Check if Stripe account ID already exists for different organization
    const existingAccount = await prisma.stripeAccount.findUnique({
      where: { stripeAccountId: stripeAccount.id },
    });

    if (existingAccount && existingAccount.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'This Stripe account is already connected to another organization' },
        { status: 400 }
      );
    }

    // Encrypt API key
    const { encryptedValue, iv } = encryptSecret(apiKey);

    // Upsert StripeAccount record
    await prisma.stripeAccount.upsert({
      where: { organizationId: user.organizationId },
      update: {
        encryptedApiKey: encryptedValue,
        encryptionIV: iv,
        mode,
        stripeAccountId: stripeAccount.id,
        stripeAccountName: stripeAccount.business_profile?.name || stripeAccount.email || null,
      },
      create: {
        organizationId: user.organizationId,
        encryptedApiKey: encryptedValue,
        encryptionIV: iv,
        mode,
        stripeAccountId: stripeAccount.id,
        stripeAccountName: stripeAccount.business_profile?.name || stripeAccount.email || null,
      },
    });

    return NextResponse.json({
      success: true,
      stripeAccountId: stripeAccount.id,
      stripeAccountName: stripeAccount.business_profile?.name || stripeAccount.email || 'N/A',
      mode,
    });
  } catch (error) {
    console.error('Stripe connect error:', error);
    return NextResponse.json(
      { error: 'An error occurred while connecting to Stripe' },
      { status: 500 }
    );
  }
}
