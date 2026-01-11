'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors.email = 'Please enter a valid email';
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else {
          delete newErrors.password;
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateField(e.target.name, e.target.value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setServerError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    // Validate all fields
    validateField('email', formData.email);
    validateField('password', formData.password);

    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || 'Invalid email or password');
        setIsSubmitting(false);
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      setServerError('An error occurred during login');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-white border-2 border-gray-300 p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Revenue Leak Radar</h1>
        <p className="text-sm text-gray-600 mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@company.com"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
            {errors.email && (
              <p className="text-sm text-[#d32f2f] mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
            {errors.password && (
              <p className="text-sm text-[#d32f2f] mt-1">{errors.password}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-[#d32f2f]">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-900 text-white py-2 px-4 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Don't have an account?{' '}
          <Link href="/signup" className="text-gray-900 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
