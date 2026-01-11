import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripeAccount = await prisma.stripeAccount.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (!stripeAccount) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Mask API key - show only last 4 characters
    const maskedKey = `sk_${stripeAccount.mode}_••••••••••••${stripeAccount.encryptedApiKey.slice(-4)}`;

    return NextResponse.json({
      stripeAccountId: stripeAccount.stripeAccountId,
      stripeAccountName: stripeAccount.stripeAccountName,
      mode: stripeAccount.mode,
      connected: true,
      maskedKey,
    });
  } catch (error) {
    console.error('Get Stripe account error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
