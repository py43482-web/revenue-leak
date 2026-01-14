# Payment System Setup Guide

## Overview

Revenue Leak Radar now includes an integrated payment system that charges customers based on their Annual Recurring Revenue (ARR):

- **Starter Plan**: $499/month for up to $10M ARR
- **Pro Plan**: $999/month for above $10M ARR

Payment is **required before dashboard access**. The system automatically calculates the customer's ARR from their connected Stripe account and determines the appropriate pricing tier.

---

## How It Works

### User Flow

1. User signs up and creates account
2. User connects their Stripe account (provides API key)
3. System calculates ARR from customer's Stripe data
4. System determines pricing tier based on ARR
5. User is shown pricing page with their tier
6. User pays via Stripe Checkout
7. Webhook confirms payment
8. User gains access to dashboard

### Key Features

- ✅ Automatic ARR calculation from customer's Stripe subscriptions
- ✅ Tiered pricing based on customer's business size
- ✅ Stripe Checkout for secure payment processing
- ✅ Webhook-based subscription management
- ✅ Access control - dashboard requires active subscription
- ✅ Demo mode bypass for presentations

---

## Setup Instructions

### 1. Create Stripe Products and Prices

You need to create two subscription products in **YOUR Stripe Dashboard** (not customer's):

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"

**Starter Plan:**
- Name: `Revenue Leak Radar - Starter`
- Description: `Up to $10M ARR`
- Pricing: `$499/month` (Recurring)
- Copy the Price ID (starts with `price_...`)

**Pro Plan:**
- Name: `Revenue Leak Radar - Pro`
- Description: `Above $10M ARR`
- Pricing: `$999/month` (Recurring)
- Copy the Price ID (starts with `price_...`)

### 2. Configure Environment Variables

Add these to your `.env` file or Vercel environment variables:

```bash
# Billing System (YOUR Stripe account)
BILLING_STRIPE_SECRET_KEY="sk_live_..."  # Your Stripe secret key
BILLING_STRIPE_WEBHOOK_SECRET="whsec_..." # Will get this in step 3
STRIPE_PRICE_ID_STARTER="price_..."      # From step 1
STRIPE_PRICE_ID_PRO="price_..."          # From step 1

# Application URL
APP_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

**Important**: Use your **own** Stripe account for billing, not the customer's Stripe account. The customer's Stripe is only for monitoring their revenue.

### 3. Set Up Webhook for Billing Events

Create a webhook endpoint in **YOUR Stripe Dashboard**:

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/api/webhooks/billing-stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to your environment variables as `BILLING_STRIPE_WEBHOOK_SECRET`

### 4. Run Database Migration

Run the migration to add the `Subscription` table:

```bash
npx prisma migrate dev --name add_subscription_model

# Or for production
npx prisma migrate deploy
```

### 5. Update Vercel Environment Variables (if using Vercel)

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add all the billing variables from step 2
4. Redeploy your application

---

## Testing the Payment Flow

### Test Mode Setup

For testing, use Stripe test mode:

```bash
BILLING_STRIPE_SECRET_KEY="sk_test_..."  # Test mode key
STRIPE_PRICE_ID_STARTER="price_..."      # Test mode price
STRIPE_PRICE_ID_PRO="price_..."          # Test mode price
```

### Testing Steps

1. **Sign up** with a test account
2. **Connect Stripe** with a test API key (customer's Stripe in test mode)
3. System calculates ARR and shows pricing page
4. Click "Subscribe"
5. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
6. Complete payment
7. You should be redirected to success page
8. Dashboard access should now be granted

### Verify Webhook Processing

1. Check Vercel logs or local terminal for webhook events
2. Verify subscription was created in database:
   ```bash
   npx prisma studio
   # Check Subscription table
   ```
3. Test dashboard access - should work after payment

---

## Architecture

### Database Schema

```prisma
model Subscription {
  id                        String       @id @default(uuid())
  organizationId            String       @unique
  organization              Organization @relation(fields: [organizationId], references: [id])
  stripeSubscriptionId      String       @unique
  stripeCustomerId          String
  status                    String       // active, past_due, canceled, incomplete
  tier                      String       // starter or pro
  pricePerMonth             Int          // 499 or 999
  calculatedARR             Float?       // ARR at subscription time
  currentPeriodStart        DateTime
  currentPeriodEnd          DateTime
  cancelAtPeriodEnd         Boolean      @default(false)
  createdAt                 DateTime     @default(now())
  updatedAt                 DateTime     @updatedAt
}
```

### API Endpoints

**`/api/subscription/calculate-pricing`** (GET)
- Calculates customer's ARR from their Stripe account
- Determines pricing tier (starter vs pro)
- Returns pricing information

**`/api/subscription/create-checkout`** (POST)
- Creates Stripe Checkout session
- Requires: `{ tier, csrfToken }`
- Returns: `{ checkoutUrl, sessionId }`

**`/api/subscription/status`** (GET)
- Checks current subscription status
- Returns: `{ hasActiveSubscription, status, tier, ... }`

**`/api/webhooks/billing-stripe`** (POST)
- Receives webhooks from YOUR Stripe account
- Handles subscription lifecycle events
- Creates/updates subscription records

### ARR Calculation Logic

```typescript
// Fetches all active subscriptions from customer's Stripe
// Normalizes billing intervals to MRR (monthly recurring revenue)
// ARR = MRR × 12
//
// Supported intervals:
// - month: direct MRR
// - year: amount / 12
// - week: amount × 4.33
// - day: amount × 30
```

### Pricing Tiers

```typescript
if (arr <= $10,000,000) {
  tier = 'starter'
  price = $499/month
} else {
  tier = 'pro'
  price = $999/month
}
```

---

## Important Notes

### Two Separate Stripe Accounts

The system uses TWO different Stripe accounts:

1. **Customer's Stripe Account** (`STRIPE_API_KEY`)
   - Customer provides their API key during onboarding
   - Used ONLY for reading their revenue data
   - We never charge or modify anything in their account
   - This is what we monitor for revenue leaks

2. **Your Billing Stripe Account** (`BILLING_STRIPE_SECRET_KEY`)
   - Your own Stripe account
   - Used for charging customers for using your SaaS
   - Where you collect $499 or $999/month subscriptions
   - Completely separate from customer data

### Demo Mode Bypass

Demo mode users automatically have subscription access:

```typescript
// In subscription-check.ts
if (DEMO_MODE_ENABLED && isDemoUser(organizationId)) {
  return { hasActiveSubscription: true }
}
```

Demo users never see pricing page or payment flow.

### Access Control

Dashboard checks subscription on every load:

```typescript
// If no active subscription → redirect to /subscription/pricing
// If active subscription → show dashboard
```

### Webhook Reliability

- Webhooks are critical for subscription management
- Test webhooks thoroughly before going live
- Use Stripe CLI for local webhook testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/billing-stripe
  ```

### Security Considerations

- ✅ CSRF protection on checkout creation
- ✅ Webhook signature verification
- ✅ Subscription status checked on every dashboard load
- ✅ Organization ID in subscription metadata for verification

---

## Troubleshooting

### "Billing system not configured" Error

**Cause**: `BILLING_STRIPE_SECRET_KEY` not set

**Solution**: Add your Stripe secret key to environment variables

### "Pricing tier not configured" Error

**Cause**: `STRIPE_PRICE_ID_STARTER` or `STRIPE_PRICE_ID_PRO` not set

**Solution**: Create products in Stripe Dashboard and add price IDs

### Checkout Session Creation Fails

**Cause**: Invalid Stripe key or price IDs

**Solution**:
1. Verify your Stripe key is valid (test with Stripe CLI)
2. Verify price IDs exist and are active
3. Check Vercel logs for specific error

### Webhook Not Processing

**Cause**: Webhook secret mismatch or signature verification failing

**Solution**:
1. Verify `BILLING_STRIPE_WEBHOOK_SECRET` matches webhook signing secret
2. Check webhook endpoint is accessible (not blocked by firewall)
3. Test with Stripe CLI:
   ```bash
   stripe trigger customer.subscription.created
   ```

### User Stuck on Pricing Page After Payment

**Cause**: Webhook not received or subscription not created in database

**Solution**:
1. Check Stripe Dashboard → Webhooks → Attempts
2. Verify webhook succeeded (200 status)
3. Check database for subscription record
4. Manually trigger webhook retry if needed

### Dashboard Redirects to Pricing Despite Payment

**Cause**: Subscription status check failing or subscription not active

**Solution**:
1. Check database - verify subscription exists with `status = 'active'`
2. Check organization ID matches between user and subscription
3. Verify `/api/subscription/status` endpoint returns correct data

---

## Migration from Existing Users

If you have existing users before implementing payment:

### Option 1: Grandfather Existing Users

```typescript
// In subscription-check.ts
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { organization: true }
});

// Users created before certain date get free access
if (user.createdAt < new Date('2026-01-15')) {
  return { hasActiveSubscription: true };
}
```

### Option 2: Require Payment from All

Email existing users:
1. Notify them of new pricing
2. Give grace period (e.g., 30 days)
3. After grace period, require subscription

---

## Going Live Checklist

Before launching with payments:

- [ ] Created products in Stripe Dashboard (live mode)
- [ ] Set all environment variables (live Stripe keys)
- [ ] Configured webhook endpoint (live mode)
- [ ] Tested full payment flow in test mode
- [ ] Verified webhook processing works
- [ ] Tested subscription cancellation flow
- [ ] Verified access control works
- [ ] Set up monitoring for failed payments
- [ ] Configured Stripe email notifications
- [ ] Tested what happens when payment fails
- [ ] Documented customer support procedures

---

## Customer Support Scenarios

### Customer Wants to Cancel

Users can cancel via Stripe customer portal, or you can cancel in Stripe Dashboard:
1. Find subscription in Stripe Dashboard
2. Click "Cancel subscription"
3. Webhook will update status to `canceled`
4. User loses dashboard access at period end (unless you cancel immediately)

### Customer's ARR Changed (Upgrade/Downgrade)

Current implementation: Tier is set at subscription creation and doesn't auto-update.

**To implement tier changes**:
1. Add button in settings to "Recalculate tier"
2. Calculate new ARR
3. If tier changed, create new Stripe Checkout for new tier
4. Cancel old subscription when new one is active

### Payment Failed

1. Webhook sets subscription status to `past_due`
2. User still has access (Stripe retries payment automatically)
3. After multiple failures, Stripe cancels subscription
4. Webhook sets status to `canceled`
5. User loses dashboard access

---

## Support

For questions or issues with payment integration:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For questions about this implementation:
- Review code in `src/lib/arr-calculator.ts`
- Review webhooks in `src/app/api/webhooks/billing-stripe/route.ts`
- Review subscription check in `src/lib/subscription-check.ts`

---

**Last Updated**: 2026-01-13
**Integration Status**: Complete ✅
**Ready for Production**: After Stripe configuration
