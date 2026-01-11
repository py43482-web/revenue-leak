import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete StripeAccount and related data (cascade will handle it)
    await prisma.stripeAccount.deleteMany({
      where: { organizationId: user.organizationId },
    });

    // Explicitly delete related data that might not cascade
    await prisma.stripeEvent.deleteMany({
      where: { organizationId: user.organizationId },
    });

    await prisma.revenueIssue.deleteMany({
      where: { organizationId: user.organizationId },
    });

    await prisma.dailyRevenueSnapshot.deleteMany({
      where: { organizationId: user.organizationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stripe disconnect error:', error);
    return NextResponse.json(
      { error: 'An error occurred while disconnecting' },
      { status: 500 }
    );
  }
}
