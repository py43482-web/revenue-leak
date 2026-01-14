// Demo Mode Database Seeder
// Run with: tsx prisma/seed-demo.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DEMO_CREDENTIALS, DEMO_USER_ID, DEMO_ORG_ID } from '../src/lib/demo-mode';
import { generateDemoSnapshot, generateDemoIssues, generateDemoHistoricalMRR } from '../src/lib/demo-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🎭 Seeding demo data...');

  // Create demo organization
  const organization = await prisma.organization.upsert({
    where: { id: DEMO_ORG_ID },
    update: {},
    create: {
      id: DEMO_ORG_ID,
      name: DEMO_CREDENTIALS.organizationName,
      emailEnabled: true,
      slackEnabled: false,
    },
  });

  console.log('✅ Created demo organization:', organization.name);

  // Create demo user
  const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 10);
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: { passwordHash },
    create: {
      id: DEMO_USER_ID,
      email: DEMO_CREDENTIALS.email,
      passwordHash,
      organizationId: DEMO_ORG_ID,
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create fake Stripe account (no real API key)
  const stripeAccount = await prisma.stripeAccount.upsert({
    where: { organizationId: DEMO_ORG_ID },
    update: {},
    create: {
      organizationId: DEMO_ORG_ID,
      encryptedApiKey: 'demo_encrypted_key',
      encryptionIV: 'demo_iv',
      mode: 'demo',
      stripeAccountId: 'acct_demo123456789',
      stripeAccountName: 'Demo Company Inc.',
    },
  });

  console.log('✅ Created demo Stripe account');

  // Generate and save historical snapshots (last 30 days)
  console.log('📊 Generating 30 days of historical data...');
  const historicalData = generateDemoHistoricalMRR();

  for (const dayData of historicalData) {
    await prisma.dailyRevenueSnapshot.upsert({
      where: {
        organizationId_date: {
          organizationId: DEMO_ORG_ID,
          date: dayData.date,
        },
      },
      update: {},
      create: {
        organizationId: DEMO_ORG_ID,
        date: dayData.date,
        totalRevenueAtRisk: dayData.totalRevenueAtRisk,
        mrrAffectedPercentage: (dayData.totalRevenueAtRisk / dayData.currentMRR) * 100,
        currentMRR: dayData.currentMRR,
        issueCountByType: {
          failed_payment: Math.floor(dayData.issueCount * 0.3),
          failed_subscription: Math.floor(dayData.issueCount * 0.15),
          expiring_card: Math.floor(dayData.issueCount * 0.35),
          chargeback: Math.floor(dayData.issueCount * 0.15),
          mrr_anomaly: Math.floor(dayData.issueCount * 0.05),
        },
        isPartial: false,
      },
    });
  }

  console.log('✅ Created 30 days of historical snapshots');

  // Create today's snapshot with current issues
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySnapshot = generateDemoSnapshot();
  const snapshot = await prisma.dailyRevenueSnapshot.upsert({
    where: {
      organizationId_date: {
        organizationId: DEMO_ORG_ID,
        date: today,
      },
    },
    update: {
      totalRevenueAtRisk: todaySnapshot.totalRevenueAtRisk,
      mrrAffectedPercentage: todaySnapshot.mrrAffectedPercentage,
      currentMRR: todaySnapshot.currentMRR,
      issueCountByType: todaySnapshot.issueCountByType,
    },
    create: {
      organizationId: DEMO_ORG_ID,
      date: today,
      totalRevenueAtRisk: todaySnapshot.totalRevenueAtRisk,
      mrrAffectedPercentage: todaySnapshot.mrrAffectedPercentage,
      currentMRR: todaySnapshot.currentMRR,
      issueCountByType: todaySnapshot.issueCountByType,
      isPartial: false,
    },
  });

  console.log('✅ Created today\'s snapshot');

  // Delete existing issues for today
  await prisma.revenueIssue.deleteMany({
    where: {
      organizationId: DEMO_ORG_ID,
      snapshotId: snapshot.id,
    },
  });

  // Create today's issues
  const demoIssues = generateDemoIssues();
  for (const issue of demoIssues) {
    await prisma.revenueIssue.create({
      data: {
        organizationId: DEMO_ORG_ID,
        snapshotId: snapshot.id,
        type: issue.type,
        customerEmail: issue.customerEmail,
        customerName: issue.customerName,
        amount: issue.amount,
        priority: issue.priority,
        metadata: issue.metadata,
      },
    });
  }

  console.log(`✅ Created ${demoIssues.length} revenue issues for today`);

  console.log('\n🎉 Demo data seeded successfully!');
  console.log('\n📝 Demo Login Credentials:');
  console.log(`   Email: ${DEMO_CREDENTIALS.email}`);
  console.log(`   Password: ${DEMO_CREDENTIALS.password}`);
  console.log('\n⚠️  Remember to set DEMO_MODE=true in your .env file\n');
}

main()
  .catch((e) => {
    console.error('Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
