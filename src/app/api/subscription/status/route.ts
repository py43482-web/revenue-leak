import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkSubscriptionStatus } from '@/lib/subscription-check';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await checkSubscriptionStatus(user.organizationId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking subscription status');
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}
