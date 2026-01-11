'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
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
          newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
        } else {
          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumber = /[0-9]/.test(value);
          if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
          } else {
            delete newErrors.password;
          }
        }
        break;
      case 'confirmPassword':
        if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords must match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
      case 'organizationName':
        if (value.length < 2 || value.length > 100) {
          newErrors.organizationName = 'Organization name is required';
        } else {
          delete newErrors.organizationName;
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
    validateField('confirmPassword', formData.confirmPassword);
    validateField('organizationName', formData.organizationName);

    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          organizationName: formData.organizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || 'An error occurred during signup');
        setIsSubmitting(false);
        return;
      }

      router.push('/onboarding');
    } catch (error) {
      setServerError('An error occurred during signup');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-white border-2 border-gray-300 p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Revenue Leak Radar</h1>
        <p className="text-sm text-gray-600 mb-6">Create your account</p>

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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
            {errors.confirmPassword && (
              <p className="text-sm text-[#d32f2f] mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              id="organizationName"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Acme Inc"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
            {errors.organizationName && (
              <p className="text-sm text-[#d32f2f] mt-1">{errors.organizationName}</p>
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
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-gray-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
