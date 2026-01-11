import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snapshot = await prisma.dailyRevenueSnapshot.findFirst({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (!snapshot) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      date: snapshot.date.toISOString().split('T')[0],
      totalRevenueAtRisk: snapshot.totalRevenueAtRisk,
      mrrAffectedPercentage: snapshot.mrrAffectedPercentage,
      currentMRR: snapshot.currentMRR,
      issueCountByType: snapshot.issueCountByType,
      isPartial: snapshot.isPartial,
      createdAt: snapshot.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Get snapshot error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
