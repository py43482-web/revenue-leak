'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [alertSettings, setAlertSettings] = useState({
    emailEnabled: true,
    emailAddress: '',
    slackWebhookUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const stripeRes = await fetch('/api/stripe/account');
      if (stripeRes.ok) {
        const data = await stripeRes.json();
        setStripeAccount(data);
      }

      const alertsRes = await fetch('/api/settings/alerts');
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlertSettings({
          emailEnabled: data.emailEnabled,
          emailAddress: data.emailAddress,
          slackWebhookUrl: data.slackWebhookUrl || '',
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setLoading(false);
    }
  };

  const handleSaveAlerts = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertSettings),
      });

      if (response.ok) {
        setMessage('Settings saved successfully');
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async (type: 'email' | 'slack') => {
    setMessage('');

    try {
      const response = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || `Test ${type} sent successfully`);
      } else {
        setMessage(data.error || `Failed to send test ${type}`);
      }
    } catch (err) {
      setMessage(`Failed to send test ${type}`);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Stripe? All revenue data will be deleted.')) {
      return;
    }

    try {
      const response = await fetch('/api/stripe/disconnect', {
        method: 'DELETE',
      });

      if (response.ok) {
        setStripeAccount(null);
        setMessage('Stripe disconnected successfully');
      }
    } catch (err) {
      setMessage('Failed to disconnect Stripe');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#333333] text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold">
            Revenue Leak Radar
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/settings" className="text-sm hover:text-gray-300">
              Settings
            </Link>
            <button onClick={handleLogout} className="text-sm hover:text-gray-300">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {message && (
          <div className={`p-4 mb-6 border-2 ${message.includes('successfully') || message.includes('sent') ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="bg-white border-2 border-gray-300 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Stripe Connection</h2>
          {stripeAccount ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="font-medium">
                  Connected to Stripe ({stripeAccount.mode === 'test' ? 'Test Mode' : 'Live Mode'})
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Account</p>
                <p>{stripeAccount.stripeAccountName || stripeAccount.stripeAccountId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">API Key</p>
                <p className="font-mono text-sm">{stripeAccount.maskedKey}</p>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">No Stripe account connected</p>
              <Link
                href="/onboarding"
                className="inline-block px-4 py-2 bg-gray-900 text-white hover:bg-gray-800"
              >
                Connect Stripe
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-gray-300 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Alert Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={alertSettings.emailEnabled}
                  onChange={(e) =>
                    setAlertSettings({ ...alertSettings, emailEnabled: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium">Enable email notifications</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={alertSettings.emailAddress}
                onChange={(e) =>
                  setAlertSettings({ ...alertSettings, emailAddress: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slack Webhook URL (optional)
              </label>
              <input
                type="text"
                value={alertSettings.slackWebhookUrl}
                onChange={(e) =>
                  setAlertSettings({ ...alertSettings, slackWebhookUrl: e.target.value })
                }
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your webhook URL from Slack Incoming Webhooks
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleSaveAlerts}
                disabled={saving}
                className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={() => handleTestAlert('email')}
                className="px-4 py-2 border-2 border-gray-300 hover:bg-gray-50"
              >
                Test Email
              </button>
              {alertSettings.slackWebhookUrl && (
                <button
                  onClick={() => handleTestAlert('slack')}
                  className="px-4 py-2 border-2 border-gray-300 hover:bg-gray-50"
                >
                  Test Slack
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
