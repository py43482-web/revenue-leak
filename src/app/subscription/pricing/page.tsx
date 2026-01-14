'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PricingData {
  arr: number;
  mrr: number;
  activeSubscriptions: number;
  tier: 'starter' | 'pro';
  pricePerMonth: number;
  description: string;
}

export default function PricingPage() {
  const router = useRouter();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/subscription/calculate-pricing');

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to calculate pricing');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setPricing(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load pricing information');
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!pricing) return;

    setIsProcessing(true);
    setError('');

    try {
      // Fetch CSRF token
      const csrfResponse = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: pricing.tier, csrfToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create checkout session');
        setIsProcessing(false);
        return;
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Calculating your pricing...</div>
      </div>
    );
  }

  if (error && !pricing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border-2 border-gray-300 p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Unable to Calculate Pricing</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/onboarding"
            className="inline-block bg-gray-900 text-white py-2 px-6 hover:bg-gray-800"
          >
            Back to Onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Subscription
          </h1>
          <p className="text-gray-600">
            Based on your Stripe account data, we've determined your pricing tier
          </p>
        </div>

        {pricing && (
          <div className="bg-white border-2 border-gray-300 p-8">
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-500 mb-4">Your Metrics</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Annual Recurring Revenue</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(pricing.arr)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Monthly Recurring Revenue</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(pricing.mrr)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Active Subscriptions</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {pricing.activeSubscriptions}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {pricing.tier === 'starter' ? 'Starter Plan' : 'Pro Plan'}
                  </h2>
                  <p className="text-sm text-gray-500">{pricing.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-gray-900">
                    ${pricing.pricePerMonth}
                  </div>
                  <div className="text-sm text-gray-500">per month</div>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">What's included:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Daily revenue monitoring and leak detection</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Failed payment and subscription alerts</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>MRR anomaly detection</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Email and Slack notifications</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Chargeback monitoring</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Expiring card notifications</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full bg-gray-900 text-white py-3 px-4 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              {isProcessing ? 'Processing...' : `Subscribe for $${pricing.pricePerMonth}/month`}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              You will be redirected to Stripe for secure payment processing. Cancel anytime.
            </p>
          </div>
        )}

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Questions? Contact support@revenueleakradar.com
          </p>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
