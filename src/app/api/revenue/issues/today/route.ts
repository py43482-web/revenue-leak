import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : undefined;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    // Get latest snapshot
    const latestSnapshot = await prisma.dailyRevenueSnapshot.findFirst({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (!latestSnapshot) {
      return NextResponse.json({
        issues: [],
        total: 0,
        snapshot: null,
      });
    }

    // Get issues for latest snapshot
    const issues = await prisma.revenueIssue.findMany({
      where: {
        snapshotId: latestSnapshot.id,
      },
      orderBy: {
        amount: 'desc',
      },
      skip: offset,
      take: limit,
    });

    // Get total count
    const total = await prisma.revenueIssue.count({
      where: {
        snapshotId: latestSnapshot.id,
      },
    });

    return NextResponse.json({
      issues: issues.map((issue) => ({
        id: issue.id,
        type: issue.type,
        customerEmail: issue.customerEmail,
        customerName: issue.customerName,
        amount: issue.amount,
        priority: issue.priority,
        metadata: issue.metadata,
        detectedAt: issue.detectedAt.toISOString(),
      })),
      total,
      snapshot: {
        date: latestSnapshot.date.toISOString().split('T')[0],
        totalRevenueAtRisk: latestSnapshot.totalRevenueAtRisk,
        isPartial: latestSnapshot.isPartial,
      },
    });
  } catch (error) {
    console.error('Get issues error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
