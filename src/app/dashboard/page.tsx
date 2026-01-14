'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DemoBanner from '@/components/DemoBanner';

interface Snapshot {
  date: string;
  totalRevenueAtRisk: number;
  mrrAffectedPercentage: number;
  currentMRR: number;
  issueCountByType: Record<string, number>;
  isPartial: boolean;
  createdAt: string;
}

interface Issue {
  id: string;
  type: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  priority: string;
  metadata: any;
  detectedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasStripe, setHasStripe] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Check subscription status first
      const subscriptionResponse = await fetch('/api/subscription/status');
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();

        // If no active subscription, redirect to pricing
        if (!subscriptionData.hasActiveSubscription) {
          router.push('/subscription/pricing');
          return;
        }
      }

      // Check if Stripe is connected
      const stripeResponse = await fetch('/api/stripe/account');
      if (stripeResponse.status === 404) {
        setHasStripe(false);
        setLoading(false);
        return;
      }
      setHasStripe(true);

      // Fetch snapshot
      const snapshotResponse = await fetch('/api/revenue/snapshot/latest');
      if (snapshotResponse.status === 404) {
        setLoading(false);
        return;
      }

      if (snapshotResponse.ok) {
        const snapshotData = await snapshotResponse.json();
        setSnapshot(snapshotData);
      }

      // Fetch issues
      const issuesResponse = await fetch('/api/revenue/issues/today');
      if (issuesResponse.ok) {
        const issuesData = await issuesResponse.json();
        setIssues(issuesData.issues);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!hasStripe) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLogout={handleLogout} />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white border-2 border-gray-300 p-10 text-center">
            <h2 className="text-2xl font-bold mb-2">Connect Stripe to Get Started</h2>
            <p className="text-gray-600 mb-6">
              Monitor your billing data and identify revenue at risk.
            </p>
            <Link
              href="/onboarding"
              className="inline-block bg-gray-900 text-white py-2 px-6 hover:bg-gray-800"
            >
              Connect Stripe
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLogout={handleLogout} />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white border-2 border-gray-300 p-10 text-center">
            <h2 className="text-2xl font-bold mb-2">Waiting for Data</h2>
            <p className="text-gray-600 mb-6">
              Your first revenue scan will run at 6:00 AM UTC. Check back tomorrow!
            </p>
            <p className="text-sm text-gray-500">Connected to Stripe (Test Mode)</p>
          </div>
        </div>
      </div>
    );
  }

  const displayedIssues = showAll ? issues : issues.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoBanner />
      <Header onLogout={handleLogout} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {snapshot.isPartial && (
          <div className="bg-yellow-50 border-2 border-yellow-300 p-4 mb-6 relative">
            <button
              onClick={() => {}}
              className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900"
            >
              ×
            </button>
            <p className="text-sm text-yellow-800">
              ⚠️ Last scan incomplete due to data fetch error. Revenue at risk may be
              underreported. Next scan: tomorrow at 6:00 AM UTC.
            </p>
          </div>
        )}

        <div className="bg-white border-2 border-gray-300 p-8 mb-6 text-center">
          <p className="text-base text-gray-600 mb-2">Revenue at Risk Today</p>
          <p className="text-5xl font-bold text-[#d32f2f] mb-2">
            {formatCurrency(snapshot.totalRevenueAtRisk)}
          </p>
          <p className="text-sm text-gray-600">
            {snapshot.mrrAffectedPercentage.toFixed(1)}% of MRR affected
          </p>
        </div>

        <h2 className="text-lg font-bold mb-4">
          Top 5 Issues (by dollar impact)
        </h2>

        {issues.length === 0 ? (
          <div className="bg-white border-2 border-gray-300 p-8 text-center">
            <p className="text-2xl font-bold text-green-600 mb-2">$0</p>
            <p className="text-gray-600">Great news! No revenue issues detected today.</p>
          </div>
        ) : (
          <>
            <div className="bg-white border-2 border-gray-300">
              {displayedIssues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>

            {issues.length > 5 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-gray-900 font-medium hover:underline"
                >
                  {showAll ? 'Show Less' : `View All Issues (${issues.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Header({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="bg-[#333333] text-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold">
          Revenue Leak Radar
        </Link>
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/settings"
            className="text-sm hover:text-gray-300"
          >
            Settings
          </Link>
          <button
            onClick={onLogout}
            className="text-sm hover:text-gray-300"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const typeLabel = getTypeLabel(issue.type);
  const customerInfo = getCustomerInfo(issue);
  const additionalContext = getAdditionalContext(issue);

  return (
    <div className="flex items-center px-4 py-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
      <div className="w-10">
        {issue.priority === 'critical' ? (
          <span className="inline-block bg-[#d32f2f] text-white text-[10px] font-bold px-2 py-1">
            CRIT
          </span>
        ) : (
          <span className="inline-block bg-[#f57c00] text-white text-[10px] font-bold px-2 py-1">
            HIGH
          </span>
        )}
      </div>
      <div className="w-48 px-4">
        <span className="text-xs text-gray-500 uppercase">{typeLabel}</span>
      </div>
      <div className="flex-1 px-4">
        <span className="text-sm text-gray-700">{customerInfo}</span>
      </div>
      <div className="w-32 px-4 text-right">
        <span className="text-base font-bold">{formatCurrency(issue.amount)}</span>
      </div>
      <div className="w-24 px-4 text-right">
        <span className="text-xs text-gray-500">{additionalContext}</span>
      </div>
    </div>
  );
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'failed_payment':
      return 'Failed Payment';
    case 'failed_subscription':
      return 'Failed Sub';
    case 'expiring_card':
      return 'Expiring Card';
    case 'chargeback':
      return 'Chargeback';
    case 'mrr_anomaly':
      return 'MRR Anomaly';
    default:
      return type;
  }
}

function getCustomerInfo(issue: Issue): string {
  switch (issue.type) {
    case 'failed_payment':
      return `${issue.customerEmail} • ${issue.metadata.daysOverdue} days overdue`;
    case 'failed_subscription':
      return `${issue.customerEmail} • Subscription at risk`;
    case 'expiring_card':
      return `${issue.customerEmail} • Expires in ${issue.metadata.daysUntilExpiry} days`;
    case 'chargeback':
      return `${issue.customerEmail} • ${
        issue.metadata.status === 'needs_response' ? 'Needs response' : 'Under review'
      }`;
    case 'mrr_anomaly':
      return 'Organization-wide drop detected';
    default:
      return issue.customerEmail;
  }
}

function getAdditionalContext(issue: Issue): string {
  if (issue.type === 'mrr_anomaly') {
    const change = issue.metadata.dayOverDayChange || 0;
    return `${Math.abs(change).toFixed(1)}% drop`;
  }
  if (issue.type === 'expiring_card' && issue.metadata.cardLast4) {
    return `••${issue.metadata.cardLast4}`;
  }
  if (issue.type === 'chargeback' && issue.metadata.dueBy) {
    return new Date(issue.metadata.dueBy).toLocaleDateString();
  }
  return '';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
