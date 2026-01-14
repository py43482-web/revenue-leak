import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';

// This webhook is for OUR billing Stripe account (not customer's Stripe)
const BILLING_STRIPE_KEY = process.env.BILLING_STRIPE_SECRET_KEY || '';
const BILLING_WEBHOOK_SECRET = process.env.BILLING_STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!BILLING_WEBHOOK_SECRET) {
    console.error('BILLING_STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const stripe = new Stripe(BILLING_STRIPE_KEY, {
      apiVersion: '2025-12-15.clover',
    });

    event = stripe.webhooks.constructEvent(rawBody, signature, BILLING_WEBHOOK_SECRET);
  } catch (error: any) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook event');
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId;
  const tier = session.metadata?.tier as 'starter' | 'pro';

  if (!organizationId || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Subscription will be created via customer.subscription.created event
  console.log(`Checkout completed for organization ${organizationId}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;
  const tier = subscription.metadata?.tier as 'starter' | 'pro';

  if (!organizationId || !tier) {
    console.error('Missing metadata in subscription');
    return;
  }

  // Determine price
  const pricePerMonth = tier === 'starter' ? 499 : 999;

  // Extract subscription periods (type cast to access properties)
  const sub = subscription as any;

  // Create subscription record
  await prisma.subscription.upsert({
    where: { organizationId },
    update: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: subscription.status,
      tier,
      pricePerMonth,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
    },
    create: {
      organizationId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: subscription.status,
      tier,
      pricePerMonth,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
    },
  });

  console.log(`Subscription created for organization ${organizationId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) {
    // Try to find by subscription ID
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      console.error('Cannot find organization for subscription update');
      return;
    }
  }

  // Extract subscription periods (type cast to access properties)
  const sub = subscription as any;

  // Update subscription record
  await prisma.subscription.update({
    where: organizationId
      ? { organizationId }
      : { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
    },
  });

  console.log(`Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update subscription status to canceled
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'canceled',
    },
  });

  console.log(`Subscription canceled: ${subscription.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any;

  if (!inv.subscription) {
    return;
  }

  // Update subscription status to past_due
  await prisma.subscription.update({
    where: { stripeSubscriptionId: inv.subscription as string },
    data: {
      status: 'past_due',
    },
  });

  console.log(`Payment failed for subscription: ${inv.subscription}`);
}
