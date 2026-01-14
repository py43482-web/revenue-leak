import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateCsrfToken } from '@/lib/csrf';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get CSRF token from header
    const csrfToken = request.headers.get('x-csrf-token');
    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
      return NextResponse.json(
        { error: 'Invalid security token. Please refresh the page and try again.' },
        { status: 403 }
      );
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
    console.error('Stripe disconnect error occurred');
    return NextResponse.json(
      { error: 'An error occurred while disconnecting' },
      { status: 500 }
    );
  }
}
