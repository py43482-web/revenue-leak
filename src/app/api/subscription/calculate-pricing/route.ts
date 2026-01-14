import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStripeClient } from '@/lib/stripe-client';
import { calculateARR, determinePricingTier } from '@/lib/arr-calculator';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has connected Stripe
    const stripeAccount = await prisma.stripeAccount.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (!stripeAccount) {
      return NextResponse.json(
        { error: 'Please connect your Stripe account first' },
        { status: 400 }
      );
    }

    // Get Stripe client
    const stripe = await getStripeClient(user.organizationId);
    if (!stripe) {
      return NextResponse.json(
        { error: 'Failed to connect to Stripe' },
        { status: 500 }
      );
    }

    // Calculate ARR from customer's Stripe account
    const arrResult = await calculateARR(stripe);

    // Determine pricing tier
    const pricing = determinePricingTier(arrResult.arr);

    // Return pricing information
    return NextResponse.json({
      arr: arrResult.arr,
      mrr: arrResult.mrr,
      activeSubscriptions: arrResult.activeSubscriptions,
      tier: pricing.tier,
      pricePerMonth: pricing.pricePerMonth,
      description: pricing.description,
      calculatedAt: arrResult.calculatedAt,
    });
  } catch (error) {
    console.error('Error calculating pricing');
    return NextResponse.json(
      { error: 'Failed to calculate pricing. Please try again.' },
      { status: 500 }
    );
  }
}
