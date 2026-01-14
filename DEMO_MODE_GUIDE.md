# 🎭 Demo Mode Guide - Revenue Leak Radar

Demo Mode allows you (the developer) to present the SaaS application with realistic, pre-populated data without connecting to real Stripe accounts. This is perfect for demos, presentations, and sales pitches.

## 🚀 Quick Setup

### 1. Enable Demo Mode

Add this to your `.env` file:

```bash
DEMO_MODE="true"
```

### 2. Seed Demo Data

Run the demo data seeder:

```bash
npm run db:seed:demo
```

This will create:
- ✅ Demo organization: "Demo Company Inc."
- ✅ Demo user account
- ✅ 30 days of historical revenue data
- ✅ 14 active revenue issues across all categories
- ✅ Fake Stripe account connection

### 3. Login with Demo Credentials

```
Email: demo@revenueleakradar.com
Password: DemoPass123!
```

## 📊 What's Included in Demo Mode

### Revenue Metrics
- **Current MRR:** $247,500/month
- **Revenue at Risk:** $34,250
- **MRR Affected:** 13.8%

### Issue Breakdown
- **MRR Anomaly:** 1 critical issue ($8,500 decline)
- **Failed Payments:** 4 issues (total $9,496)
- **Failed Subscriptions:** 2 issues (total $8,999)
- **Expiring Cards:** 5 issues (total $5,995)
- **Chargebacks:** 2 issues (total $3,498)

### Historical Data
- 30 days of revenue snapshots
- Realistic MRR trend showing gradual decline
- Varying issue counts and severity

## 🎬 Demo Features

### 1. Dashboard View
- Shows all 14 active issues with realistic customer data
- Color-coded priority indicators (Critical/High)
- Summary cards with revenue at risk breakdown

### 2. Demo Banner
When in demo mode, a purple banner appears at the top:
> 🎭 DEMO MODE - You are viewing a presentation with sample data

### 3. Fake Customer Data
All customer data is realistic but fictional:
- Real-looking names (John Smith, Sarah Johnson, etc.)
- Professional email addresses (@techinnovate.com, @cloudtech.io, etc.)
- Realistic MRR amounts for B2B SaaS

### 4. Settings Page
- Shows fake Stripe connection
- Displays demo mode Stripe account
- Alert settings work normally

## 🔒 Security Notes

- Demo mode does NOT connect to real Stripe API
- Demo user is isolated from production data
- Demo mode can be toggled on/off with environment variable
- All demo data is clearly marked with specific UUIDs

## 📝 Presentation Tips

### During a Demo:
1. **Login Process**
   - Show the login screen
   - Use demo credentials
   - Point out the demo banner

2. **Dashboard Overview**
   - Start with the big numbers ($34,250 at risk)
   - Explain MRR affected percentage (13.8%)
   - Walk through issue categories

3. **Individual Issues**
   - Show the MRR anomaly (most critical)
   - Explain failed payments with days overdue
   - Highlight expiring cards with days until expiry
   - Discuss chargebacks needing response

4. **Settings**
   - Show Stripe integration (demo mode)
   - Demonstrate alert configuration
   - Test email/Slack alerts (optional)

### Key Talking Points:
- "This is monitoring $247K monthly recurring revenue"
- "We've identified $34K at risk - that's 13.8% of MRR"
- "4 customers with failed payments, some over 45 days overdue"
- "5 payment methods expiring in the next 30 days"
- "Real-time Stripe integration catches issues before they impact revenue"

## 🧹 Resetting Demo Data

To refresh demo data (e.g., for a new presentation):

```bash
npm run db:seed:demo
```

This will:
- Update today's snapshot with fresh data
- Regenerate current revenue issues
- Keep historical data intact

## ⚙️ Technical Details

### Demo Mode Architecture

**Environment Variable:**
- `DEMO_MODE=true` enables demo mode
- `NEXT_PUBLIC_DEMO_MODE` exposed to frontend for UI changes

**Demo User IDs:**
- User ID: `demo-user-00000000-0000-0000-0000-000000000001`
- Org ID: `demo-org-00000000-0000-0000-0000-000000000001`

**Files:**
- `src/lib/demo-mode.ts` - Configuration and helpers
- `src/lib/demo-data.ts` - Data generation functions
- `prisma/seed-demo.ts` - Database seeder
- `src/components/DemoBanner.tsx` - UI indicator

### Demo vs Production

| Feature | Demo Mode | Production |
|---------|-----------|------------|
| Stripe API | ❌ Mocked | ✅ Real |
| Customer Data | 🎭 Fictional | 📊 Real |
| Daily Cron | ⏭️ Skip | ✅ Runs |
| Email Alerts | ✅ Works | ✅ Works |
| Slack Alerts | ✅ Works | ✅ Works |

## 🚫 Disabling Demo Mode

To return to production mode:

1. Set `DEMO_MODE="false"` in `.env`
2. Restart your application
3. Demo user won't be able to login
4. Real users connect their own Stripe accounts

## ❓ FAQ

**Q: Can clients use demo mode?**
A: No, demo mode is only for you (the developer) to present the application. Clients should connect their own Stripe accounts in production.

**Q: Does demo mode affect production data?**
A: No, demo data is completely isolated with specific UUIDs. It doesn't interfere with real user data.

**Q: Can I customize demo data?**
A: Yes! Edit `src/lib/demo-data.ts` to change amounts, customer names, or issue counts.

**Q: Will the daily cron job run in demo mode?**
A: The cron job will run but should skip demo organizations. Demo data is manually seeded.

**Q: Can I test email/Slack alerts in demo mode?**
A: Yes! Configure SMTP/Slack settings and use the "Test Alert" buttons in settings.

## 🎯 Next Steps

1. ✅ Enable demo mode in `.env`
2. ✅ Run `npm run db:seed:demo`
3. ✅ Login with demo credentials
4. ✅ Practice your presentation
5. ✅ Wow your audience! 🎉

---

**Pro Tip:** Take screenshots of the dashboard in demo mode to use in marketing materials or pitch decks!
