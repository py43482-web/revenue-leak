import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const rawBody = await request.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_WEBHOOK_SECRET || '', {
        apiVersion: '2023-10-16',
      });
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Check idempotency
    const existingEvent = await prisma.stripeEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existingEvent) {
      // Already processed
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Extract Stripe account ID from event
    let stripeAccountId: string | null = null;
    if (event.account) {
      stripeAccountId = event.account as string;
    }

    // Find organization by Stripe account ID
    let organizationId: string | null = null;
    if (stripeAccountId) {
      const stripeAccount = await prisma.stripeAccount.findUnique({
        where: { stripeAccountId },
      });
      if (stripeAccount) {
        organizationId = stripeAccount.organizationId;
      }
    }

    // If we can't determine organization, log and return 200 (acknowledge but ignore)
    if (!organizationId) {
      console.warn(`Cannot determine organization for event ${event.id}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Create StripeEvent record
    await prisma.stripeEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        organizationId,
        processed: false,
      },
    });

    // Log event (minimal processing for MVP)
    console.log(`Received Stripe event: ${event.type} for organization ${organizationId}`);

    // Mark as processed
    await prisma.stripeEvent.update({
      where: { stripeEventId: event.id },
      data: { processed: true },
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to prevent Stripe retries
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
