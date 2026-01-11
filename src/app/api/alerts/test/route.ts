import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendDailyAlert } from '@/lib/email';
import { sendSlackAlert } from '@/lib/slack';
import { decryptSecret } from '@/lib/stripe-client';

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    if (type !== 'email' && type !== 'slack') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Create dummy data for test
    const testSnapshot = {
      totalRevenueAtRisk: 12847.5,
      mrrAffectedPercentage: 24.3,
    };

    const testIssues = [
      {
        type: 'mrr_anomaly',
        customerEmail: 'N/A',
        customerName: 'Organization-wide',
        amount: 5200,
        priority: 'critical',
        metadata: {
          currentMRR: 47690,
          previousMRR: 52890,
          dayOverDayChange: -9.8,
          triggerMethod: '7day_average',
        },
      },
      {
        type: 'failed_payment',
        customerEmail: 'john@acme.com',
        customerName: 'John Doe',
        amount: 2400,
        priority: 'high',
        metadata: {
          invoiceId: 'in_test123',
          daysOverdue: 45,
        },
      },
      {
        type: 'expiring_card',
        customerEmail: 'sarah@startup.io',
        customerName: 'Sarah Smith',
        amount: 1999,
        priority: 'critical',
        metadata: {
          cardLast4: '4242',
          expirationDate: '12/2024',
          daysUntilExpiry: 5,
        },
      },
    ];

    if (type === 'email') {
      await sendDailyAlert(user.email, testSnapshot, testIssues);
      return NextResponse.json({
        success: true,
        message: 'Test alert sent successfully',
      });
    }

    if (type === 'slack') {
      if (!organization.slackWebhookUrl || !organization.slackWebhookIV) {
        return NextResponse.json(
          { error: 'Slack webhook not configured' },
          { status: 400 }
        );
      }

      const decryptedWebhook = decryptSecret(
        organization.slackWebhookUrl,
        organization.slackWebhookIV
      );

      await sendSlackAlert(decryptedWebhook, testSnapshot, testIssues);
      return NextResponse.json({
        success: true,
        message: 'Test alert sent successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Test alert error:', error);
    return NextResponse.json(
      { error: 'Failed to send test alert' },
      { status: 500 }
    );
  }
}
