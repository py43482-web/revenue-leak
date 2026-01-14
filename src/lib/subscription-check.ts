import { prisma } from '@/lib/db';
import { isDemoUser, DEMO_MODE_ENABLED } from '@/lib/demo-mode';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  status?: string;
  tier?: string;
  pricePerMonth?: number;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Check if organization has an active subscription
 * Demo mode users always have access
 */
export async function checkSubscriptionStatus(
  organizationId: string
): Promise<SubscriptionStatus> {
  // Demo mode check - demo users always have access
  if (DEMO_MODE_ENABLED && isDemoUser(organizationId)) {
    return {
      hasActiveSubscription: true,
      status: 'active',
      tier: 'demo',
      pricePerMonth: 0,
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (!subscription) {
    return { hasActiveSubscription: false };
  }

  // Check if subscription is active
  const isActive = subscription.status === 'active';

  return {
    hasActiveSubscription: isActive,
    status: subscription.status,
    tier: subscription.tier,
    pricePerMonth: subscription.pricePerMonth,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}

/**
 * Check if organization has access to dashboard
 * Returns true if subscription is active or in demo mode
 */
export async function hasSubscriptionAccess(organizationId: string): Promise<boolean> {
  const status = await checkSubscriptionStatus(organizationId);
  return status.hasActiveSubscription;
}
