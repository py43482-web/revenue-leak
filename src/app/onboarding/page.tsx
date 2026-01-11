'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateApiKey = () => {
    if (!apiKey) {
      setError('Please enter a valid Stripe API key');
      return false;
    }

    if (!apiKey.startsWith('sk_test_') && !apiKey.startsWith('sk_live_')) {
      setError('Please enter a valid Stripe API key');
      return false;
    }

    if (mode === 'live' && !apiKey.startsWith('sk_live_')) {
      setError('Please use a live mode key (sk_live_...)');
      return false;
    }

    if (mode === 'test' && !apiKey.startsWith('sk_test_')) {
      setError('You selected test mode but entered a live key. Switch to live mode?');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateApiKey()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey, mode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to connect Stripe');
        setIsSubmitting(false);
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      setError('An error occurred while connecting to Stripe');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[520px] bg-white border-2 border-gray-300 p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Your Stripe Account
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter your Stripe API key to start monitoring revenue. You can use test mode
          keys for testing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="test"
                  checked={mode === 'test'}
                  onChange={(e) => setMode('test')}
                  className="mr-2"
                />
                <span className="text-sm">Test Mode</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="live"
                  checked={mode === 'live'}
                  onChange={(e) => setMode('live')}
                  className="mr-2"
                />
                <span className="text-sm">Live Mode</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Stripe API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              placeholder="sk_test_... or sk_live_..."
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Your API key is encrypted and stored securely. We only read data, never modify it.
            </p>
          </div>

          {error && <p className="text-sm text-[#d32f2f]">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-900 text-white py-2 px-4 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Connecting...' : 'Connect Stripe'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
