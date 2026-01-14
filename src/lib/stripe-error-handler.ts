// Stripe Error Handling Utilities

import Stripe from 'stripe';

export interface StripeErrorInfo {
  shouldRetry: boolean;
  isPartial: boolean;
  logMessage: string;
}

export function handleStripeError(error: unknown): StripeErrorInfo {
  // Default response
  const defaultInfo: StripeErrorInfo = {
    shouldRetry: false,
    isPartial: true,
    logMessage: 'Unknown Stripe error occurred',
  };

  if (!error || typeof error !== 'object') {
    return defaultInfo;
  }

  // Handle Stripe-specific errors
  if ('type' in error) {
    const stripeError = error as any; // Stripe error types vary by version

    switch (stripeError.type) {
      case 'StripeCardError':
        // Card errors - not our problem, mark as partial
        return {
          shouldRetry: false,
          isPartial: true,
          logMessage: 'Stripe card error - customer payment method issue',
        };

      case 'StripeRateLimitError':
        // Rate limit - should retry later
        return {
          shouldRetry: true,
          isPartial: true,
          logMessage: 'Stripe rate limit hit - will retry',
        };

      case 'StripeInvalidRequestError':
        // Invalid request - don't retry, mark as partial
        return {
          shouldRetry: false,
          isPartial: true,
          logMessage: 'Stripe invalid request error',
        };

      case 'StripeAPIError':
      case 'StripeConnectionError':
      case 'StripeAuthenticationError':
        // API/Connection/Auth errors - might be temporary, mark as partial
        return {
          shouldRetry: false,
          isPartial: true,
          logMessage: `Stripe ${stripeError.type} - service issue`,
        };

      case 'StripePermissionError':
        // Permission error - API key issue
        return {
          shouldRetry: false,
          isPartial: true,
          logMessage: 'Stripe permission error - API key issue',
        };

      case 'StripeIdempotencyError':
        // Idempotency error - rare, mark as partial
        return {
          shouldRetry: false,
          isPartial: true,
          logMessage: 'Stripe idempotency error',
        };

      default:
        return {
          shouldRetry: false,
          isPartial: true,
          logMessage: `Stripe error type: ${stripeError.type}`,
        };
    }
  }

  // Handle network/timeout errors
  if ('code' in error) {
    const codeError = error as { code: string };
    if (codeError.code === 'ENOTFOUND' || codeError.code === 'ETIMEDOUT' || codeError.code === 'ECONNREFUSED') {
      return {
        shouldRetry: true,
        isPartial: true,
        logMessage: `Network error: ${codeError.code}`,
      };
    }
  }

  return defaultInfo;
}
