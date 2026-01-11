import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptSecret } from '@/lib/stripe-client';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const maskedWebhook = organization.slackWebhookUrl
      ? `https://hooks.slack.com/services/••••••••••••••••${organization.slackWebhookUrl.slice(-16)}`
      : null;

    return NextResponse.json({
      emailEnabled: organization.emailEnabled,
      emailAddress: user.email,
      slackEnabled: organization.slackEnabled,
      slackWebhookUrl: maskedWebhook,
    });
  } catch (error) {
    console.error('Get alert settings error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailEnabled, emailAddress, slackWebhookUrl } = body;

    // Validate webhook URL if provided
    if (slackWebhookUrl && slackWebhookUrl !== '') {
      if (!slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
        return NextResponse.json(
          { error: 'Invalid Slack webhook URL' },
          { status: 400 }
        );
      }

      // Test webhook
      try {
        const testResponse = await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Test alert from Revenue Leak Radar. Your Slack integration is working!',
          }),
        });

        if (!testResponse.ok) {
          return NextResponse.json(
            { error: 'Invalid Slack webhook URL' },
            { status: 400 }
          );
        }
      } catch (err) {
        return NextResponse.json(
          { error: 'Invalid Slack webhook URL' },
          { status: 400 }
        );
      }

      // Encrypt webhook URL
      const { encryptedValue, iv } = encryptSecret(slackWebhookUrl);

      await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          emailEnabled: emailEnabled !== undefined ? emailEnabled : undefined,
          slackEnabled: true,
          slackWebhookUrl: encryptedValue,
          slackWebhookIV: iv,
        },
      });
    } else if (slackWebhookUrl === '') {
      // Clear Slack webhook
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          emailEnabled: emailEnabled !== undefined ? emailEnabled : undefined,
          slackEnabled: false,
          slackWebhookUrl: null,
          slackWebhookIV: null,
        },
      });
    } else {
      // Update email only
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          emailEnabled: emailEnabled !== undefined ? emailEnabled : undefined,
        },
      });
    }

    // Update user email if provided
    if (emailAddress && emailAddress !== user.email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: emailAddress },
      });
    }

    const updatedOrg = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    return NextResponse.json({
      success: true,
      emailEnabled: updatedOrg?.emailEnabled || false,
      slackEnabled: updatedOrg?.slackEnabled || false,
    });
  } catch (error) {
    console.error('Update alert settings error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
