import Stripe from 'stripe';

export interface ARRCalculationResult {
  arr: number;
  mrr: number;
  activeSubscriptions: number;
  calculatedAt: Date;
}

/**
 * Calculate Annual Recurring Revenue (ARR) from Stripe account
 * ARR = MRR × 12
 * MRR = Sum of all active subscription amounts (normalized to monthly)
 */
export async function calculateARR(stripe: Stripe): Promise<ARRCalculationResult> {
  let totalMRR = 0;
  let activeSubscriptionCount = 0;
  let hasMore = true;
  let startingAfter: string | undefined = undefined;
  let iterations = 0;
  const MAX_ITERATIONS = 50; // Limit to prevent infinite loops (5000 subscriptions max)

  try {
    while (hasMore && iterations < MAX_ITERATIONS) {
      iterations++;

      const subscriptions: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
        limit: 100,
        status: 'active',
        starting_after: startingAfter,
      });

      for (const subscription of subscriptions.data) {
        // Skip if subscription is not active
        if (subscription.status !== 'active') {
          continue;
        }

        // Calculate MRR for this subscription
        const subscriptionMRR = calculateSubscriptionMRR(subscription);
        totalMRR += subscriptionMRR;
        activeSubscriptionCount++;
      }

      hasMore = subscriptions.has_more;
      if (hasMore && subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    const arr = totalMRR * 12;

    return {
      arr,
      mrr: totalMRR,
      activeSubscriptions: activeSubscriptionCount,
      calculatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error calculating ARR');
    throw new Error('Failed to calculate ARR from Stripe data');
  }
}

/**
 * Calculate MRR for a single subscription
 * Normalizes all intervals to monthly amounts
 */
function calculateSubscriptionMRR(subscription: Stripe.Subscription): number {
  let subscriptionMRR = 0;

  for (const item of subscription.items.data) {
    const price = item.price;
    const quantity = item.quantity || 1;

    if (!price || !price.unit_amount) {
      continue;
    }

    // Convert to dollars (Stripe amounts are in cents)
    const amountInDollars = price.unit_amount / 100;
    const totalAmount = amountInDollars * quantity;

    // Normalize to monthly recurring revenue
    switch (price.recurring?.interval) {
      case 'month':
        subscriptionMRR += totalAmount;
        break;
      case 'year':
        subscriptionMRR += totalAmount / 12;
        break;
      case 'week':
        subscriptionMRR += totalAmount * 4.33; // Average weeks per month
        break;
      case 'day':
        subscriptionMRR += totalAmount * 30; // Average days per month
        break;
      default:
        // If not recurring or unknown interval, skip
        break;
    }
  }

  return subscriptionMRR;
}

/**
 * Determine pricing tier based on ARR
 * $499/month for up to $10M ARR
 * $999/month above $10M ARR
 */
export function determinePricingTier(arr: number): {
  tier: 'starter' | 'pro';
  pricePerMonth: number;
  description: string;
} {
  const TEN_MILLION = 10_000_000;

  if (arr <= TEN_MILLION) {
    return {
      tier: 'starter',
      pricePerMonth: 499,
      description: 'Up to $10M ARR',
    };
  } else {
    return {
      tier: 'pro',
      pricePerMonth: 999,
      description: 'Above $10M ARR',
    };
  }
}
