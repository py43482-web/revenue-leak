// Demo Data Generator - Realistic B2B SaaS Revenue Data

import { DEMO_CURRENT_MRR, DEMO_REVENUE_AT_RISK, DEMO_MRR_AFFECTED_PERCENTAGE } from './demo-mode';

export interface DemoRevenueIssue {
  type: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  priority: string;
  metadata: any;
}

export function generateDemoSnapshot() {
  return {
    id: 'demo-snapshot-1',
    date: new Date(),
    totalRevenueAtRisk: DEMO_REVENUE_AT_RISK,
    mrrAffectedPercentage: DEMO_MRR_AFFECTED_PERCENTAGE,
    currentMRR: DEMO_CURRENT_MRR,
    issueCountByType: {
      failed_payment: 4,
      failed_subscription: 2,
      expiring_card: 5,
      chargeback: 2,
      mrr_anomaly: 1,
    },
    isPartial: false,
    createdAt: new Date(),
  };
}

export function generateDemoIssues(): DemoRevenueIssue[] {
  return [
    // MRR Anomaly - Most critical
    {
      type: 'mrr_anomaly',
      customerEmail: 'N/A',
      customerName: 'Organization-wide',
      amount: 8500,
      priority: 'critical',
      metadata: {
        currentMRR: DEMO_CURRENT_MRR,
        previousMRR: 256000,
        dayOverDayChange: -3.3,
        avg7dayMRR: 253200,
        avg7dayChange: -2.3,
        triggerMethod: 'day_over_day, 7day_average',
      },
    },

    // Failed Payments
    {
      type: 'failed_payment',
      customerEmail: 'john.smith@techinnovate.com',
      customerName: 'John Smith',
      amount: 4999,
      priority: 'critical',
      metadata: {
        invoiceId: 'in_demo_1A2B3C4D5E',
        daysOverdue: 47,
        invoiceUrl: '#',
      },
    },
    {
      type: 'failed_payment',
      customerEmail: 'sarah.johnson@cloudtech.io',
      customerName: 'Sarah Johnson',
      amount: 2499,
      priority: 'critical',
      metadata: {
        invoiceId: 'in_demo_2F3G4H5I6J',
        daysOverdue: 38,
        invoiceUrl: '#',
      },
    },
    {
      type: 'failed_payment',
      customerEmail: 'michael.brown@datastream.co',
      customerName: 'Michael Brown',
      amount: 1999,
      priority: 'high',
      metadata: {
        invoiceId: 'in_demo_7K8L9M0N1O',
        daysOverdue: 21,
        invoiceUrl: '#',
      },
    },
    {
      type: 'failed_payment',
      customerEmail: 'emily.davis@growthsaas.com',
      customerName: 'Emily Davis',
      amount: 999,
      priority: 'high',
      metadata: {
        invoiceId: 'in_demo_2P3Q4R5S6T',
        daysOverdue: 15,
        invoiceUrl: '#',
      },
    },

    // Failed Subscriptions
    {
      type: 'failed_subscription',
      customerEmail: 'david.wilson@enterpriseai.com',
      customerName: 'David Wilson',
      amount: 7500,
      priority: 'critical',
      metadata: {
        subscriptionId: 'sub_demo_8U9V0W1X2Y',
        invoiceId: 'in_demo_3Z4A5B6C7D',
        planName: 'Enterprise Plan',
        mrrImpact: 7500,
      },
    },
    {
      type: 'failed_subscription',
      customerEmail: 'jennifer.martinez@scalefast.io',
      customerName: 'Jennifer Martinez',
      amount: 1499,
      priority: 'critical',
      metadata: {
        subscriptionId: 'sub_demo_8E9F0G1H2I',
        invoiceId: 'in_demo_3J4K5L6M7N',
        planName: 'Professional Plan',
        mrrImpact: 1499,
      },
    },

    // Expiring Cards
    {
      type: 'expiring_card',
      customerEmail: 'robert.garcia@fintech360.com',
      customerName: 'Robert Garcia',
      amount: 3999,
      priority: 'critical',
      metadata: {
        cardLast4: '4242',
        expirationDate: '03/2026',
        daysUntilExpiry: 6,
        subscriptionIds: ['sub_demo_9O0P1Q2R3S'],
      },
    },
    {
      type: 'expiring_card',
      customerEmail: 'lisa.anderson@marketpro.co',
      customerName: 'Lisa Anderson',
      amount: 999,
      priority: 'critical',
      metadata: {
        cardLast4: '5555',
        expirationDate: '02/2026',
        daysUntilExpiry: 4,
        subscriptionIds: ['sub_demo_4T5U6V7W8X'],
      },
    },
    {
      type: 'expiring_card',
      customerEmail: 'william.taylor@analyticsplus.io',
      customerName: 'William Taylor',
      amount: 499,
      priority: 'high',
      metadata: {
        cardLast4: '1234',
        expirationDate: '02/2026',
        daysUntilExpiry: 19,
        subscriptionIds: ['sub_demo_9Y0Z1A2B3C'],
      },
    },
    {
      type: 'expiring_card',
      customerEmail: 'patricia.thomas@cloudservices.com',
      customerName: 'Patricia Thomas',
      amount: 299,
      priority: 'high',
      metadata: {
        cardLast4: '9876',
        expirationDate: '03/2026',
        daysUntilExpiry: 25,
        subscriptionIds: ['sub_demo_4D5E6F7G8H'],
      },
    },
    {
      type: 'expiring_card',
      customerEmail: 'james.jackson@techstartup.io',
      customerName: 'James Jackson',
      amount: 199,
      priority: 'high',
      metadata: {
        cardLast4: '3456',
        expirationDate: '03/2026',
        daysUntilExpiry: 28,
        subscriptionIds: ['sub_demo_9I0J1K2L3M'],
      },
    },

    // Chargebacks
    {
      type: 'chargeback',
      customerEmail: 'karen.white@mediasolutions.com',
      customerName: 'Karen White',
      amount: 2499,
      priority: 'critical',
      metadata: {
        disputeId: 'dp_demo_4N5O6P7Q8R',
        reason: 'fraudulent',
        status: 'needs_response',
        dueBy: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      },
    },
    {
      type: 'chargeback',
      customerEmail: 'charles.harris@paymentsys.co',
      customerName: 'Charles Harris',
      amount: 999,
      priority: 'high',
      metadata: {
        disputeId: 'dp_demo_9S0T1U2V3W',
        reason: 'product_unacceptable',
        status: 'under_review',
        dueBy: null,
      },
    },
  ];
}

// Generate historical MRR data for charts (30 days)
export function generateDemoHistoricalMRR() {
  const data = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Simulate gradual decline with some variation
    const baselineMRR = 265000;
    const decline = i * 600; // Gradual decline over time
    const variation = (Math.random() - 0.5) * 2000; // Random variation
    const mrr = baselineMRR - decline + variation;

    data.push({
      date,
      currentMRR: Math.round(mrr),
      totalRevenueAtRisk: Math.round(mrr * (0.10 + Math.random() * 0.08)), // 10-18% at risk
      issueCount: Math.floor(8 + Math.random() * 8), // 8-16 issues
    });
  }

  return data;
}
