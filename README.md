# Revenue Leak Radar

A production-ready B2B SaaS MVP that connects to Stripe, monitors billing data, and displays daily revenue at risk with actionable insights.

## Features

- **Authentication**: Secure email/password auth with HttpOnly cookies
- **Stripe Integration**: Connect via API key (test and live mode supported)
- **Daily Revenue Monitoring**: Automated daily scans for 5 types of revenue issues:
  - Failed payments (past_due invoices)
  - Failed subscription invoices
  - Cards expiring in next 30 days
  - Open chargebacks/disputes
  - MRR anomaly detection (>10% drops)
- **Single-Page Dashboard**: Dollar-focused revenue at risk display
- **Alerts**: Email (SMTP) and Slack webhook notifications
- **Secure Webhooks**: Stripe webhook handling with signature verification

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Custom email/password with bcrypt
- **Integrations**: Stripe API + Webhooks
- **Notifications**: Nodemailer (SMTP) + Slack webhooks
- **Deployment**: Vercel with Vercel Cron Jobs

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd revenue-leak
npm install
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values. **Generate ENCRYPTION_KEY**:

```bash
openssl rand -hex 32
```

### 3. Database Setup

Run Prisma migrations:

```bash
npm run db:migrate:dev
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and create an account.

## Database Commands

```bash
npm run db:generate        # Generate Prisma Client
npm run db:migrate:dev     # Create migration (development)
npm run db:migrate:deploy  # Apply migrations (production)
npm run db:studio          # Open Prisma Studio
npm run db:seed            # Seed database (optional)
```

## Deployment to Vercel

### 1. Connect Repository
Push code to GitHub and import in Vercel dashboard.

### 2. Environment Variables
Add all variables from `.env.example` in Vercel dashboard.

### 3. Database
Use Vercel Postgres or external PostgreSQL provider. Run migrations:

```bash
npx prisma migrate deploy
```

### 4. Stripe Webhook
Configure in Stripe Dashboard:
- Endpoint: `https://yourdomain.com/api/webhooks/stripe`
- Events: `invoice.payment_failed`, `customer.subscription.*`, `charge.dispute.*`
- Add `STRIPE_WEBHOOK_SECRET` to Vercel

## Architecture

### Data Models
- **User** - User accounts with hashed passwords
- **Organization** - One organization per account
- **Session** - HttpOnly cookie-based sessions (30 day expiry)
- **StripeAccount** - Encrypted Stripe API keys
- **StripeEvent** - Webhook event tracking for idempotency
- **DailyRevenueSnapshot** - Daily revenue at risk calculations
- **RevenueIssue** - Individual revenue issues detected

### API Routes
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/stripe/connect` - Connect Stripe account
- `GET /api/stripe/account` - Get connection status
- `DELETE /api/stripe/disconnect` - Disconnect Stripe
- `GET /api/revenue/snapshot/latest` - Get latest revenue snapshot
- `GET /api/revenue/issues/today` - Get today's revenue issues
- `GET /api/cron/daily-revenue-check` - Daily revenue calculation (6 AM UTC)
- `GET /api/cron/cleanup-sessions` - Session cleanup (3 AM UTC Sundays)
- `POST /api/webhooks/stripe` - Stripe webhook endpoint

## Revenue Risk Detection

1. **Failed Payments**: Past due invoices with days overdue tracking
2. **Failed Subscriptions**: Open invoices linked to subscriptions with MRR impact
3. **Expiring Cards**: Payment methods expiring within 30 days
4. **Chargebacks**: Disputes needing response or under review
5. **MRR Anomaly**: >10% drop day-over-day or vs 7-day rolling average

## Security

- Passwords: Bcrypt hashed (10 rounds)
- Sessions: HttpOnly cookies, 30-day expiry
- API Keys: AES-256-GCM encrypted in database
- Webhooks: Stripe signature verification
- Cron: Protected by `CRON_SECRET` env var

## Disclaimer

Revenue Leak Radar provides revenue risk estimates based on Stripe billing data. Estimates are for informational purposes only and do not guarantee revenue recovery. Always verify critical financial data directly in your Stripe dashboard.

## License

MIT
