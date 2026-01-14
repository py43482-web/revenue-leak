import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateCsrfToken } from '@/lib/csrf';

// Use our own Stripe account for billing (not customer's Stripe account)
const BILLING_STRIPE_KEY = process.env.BILLING_STRIPE_SECRET_KEY || '';
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Stripe Price IDs (create these in your Stripe Dashboard)
const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_ID_STARTER || '', // $499/month
  pro: process.env.STRIPE_PRICE_ID_PRO || '', // $999/month
};

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier, csrfToken } = body;

    // Validate CSRF token
    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
      return NextResponse.json(
        { error: 'Invalid security token. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Validate tier
    if (!tier || (tier !== 'starter' && tier !== 'pro')) {
      return NextResponse.json(
        { error: 'Invalid pricing tier' },
        { status: 400 }
      );
    }

    // Check if user already has active subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (existingSubscription && existingSubscription.status === 'active') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: { users: { select: { email: true } } },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check billing Stripe key is configured
    if (!BILLING_STRIPE_KEY) {
      return NextResponse.json(
        { error: 'Billing system not configured' },
        { status: 500 }
      );
    }

    const priceId = STRIPE_PRICE_IDS[tier as 'starter' | 'pro'];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Pricing tier not configured' },
        { status: 500 }
      );
    }

    // Initialize our billing Stripe client
    const stripe = new Stripe(BILLING_STRIPE_KEY, {
      apiVersion: '2025-12-15.clover',
    });

    // Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/subscription/pricing`,
      metadata: {
        organizationId: user.organizationId,
        organizationName: organization.name,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          organizationId: user.organizationId,
          organizationName: organization.name,
          tier: tier,
        },
      },
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error: any) {
    console.error('Error creating checkout session');
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    );
  }
}
