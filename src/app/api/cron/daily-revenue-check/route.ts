import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { getStripeClient } from '@/lib/stripe-client';

interface RevenueIssue {
  type: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  priority: string;
  metadata: any;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all organizations with Stripe connected
    const organizations = await prisma.organization.findMany({
      where: {
        stripeAccount: {
          isNot: null,
        },
      },
      include: {
        stripeAccount: true,
      },
    });

    let totalProcessed = 0;
    let totalIssuesFound = 0;

    for (const org of organizations) {
      if (!org.stripeAccount) continue;

      try {
        const stripe = await getStripeClient(org.id);

        let isPartial = false;
        const issues: RevenueIssue[] = [];

        // 1. Failed Payments (past_due invoices)
        try {
          const openInvoicesForPastDue = await stripe.invoices.list({
            status: 'open',
            limit: 100,
          });

          // Filter for past due invoices
          const now = Math.floor(Date.now() / 1000);
          const pastDueInvoices = {
            data: openInvoicesForPastDue.data.filter(
              inv => inv.due_date && inv.due_date < now
            )
          };

          for (const invoice of pastDueInvoices.data) {
            if (invoice.customer && typeof invoice.customer === 'string') {
              try {
                const customer = await stripe.customers.retrieve(invoice.customer);
                const daysOverdue = invoice.due_date
                  ? Math.floor((Date.now() / 1000 - invoice.due_date) / 86400)
                  : 0;

                issues.push({
                  type: 'failed_payment',
                  customerEmail: (customer as Stripe.Customer).email || 'N/A',
                  customerName: (customer as Stripe.Customer).name || 'N/A',
                  amount: invoice.amount_due / 100,
                  priority: daysOverdue > 30 ? 'critical' : 'high',
                  metadata: {
                    invoiceId: invoice.id,
                    daysOverdue,
                    invoiceUrl: invoice.hosted_invoice_url,
                  },
                });
              } catch (err) {
                console.error('Error fetching customer:', err);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching past due invoices:', err);
          isPartial = true;
        }

        // 2. Failed Subscription Invoices
        try {
          const openInvoices = await stripe.invoices.list({
            status: 'open',
            limit: 100,
          });

          for (const invoice of openInvoices.data) {
            if (invoice.subscription) {
              try {
                const subscription = await stripe.subscriptions.retrieve(
                  invoice.subscription as string
                );

                if (invoice.customer && typeof invoice.customer === 'string') {
                  const customer = await stripe.customers.retrieve(invoice.customer);

                  const mrrImpact = subscription.items.data.reduce((sum, item) => {
                    if (item.price.recurring) {
                      const amount = item.price.unit_amount || 0;
                      const interval = item.price.recurring.interval;

                      if (interval === 'month') return sum + amount / 100;
                      if (interval === 'year') return sum + amount / 100 / 12;
                      if (interval === 'week') return sum + (amount / 100) * 4.33;
                      if (interval === 'day') return sum + (amount / 100) * 30.42;
                    }
                    return sum;
                  }, 0);

                  issues.push({
                    type: 'failed_subscription',
                    customerEmail: (customer as Stripe.Customer).email || 'N/A',
                    customerName: (customer as Stripe.Customer).name || 'N/A',
                    amount: invoice.amount_due / 100,
                    priority: 'critical',
                    metadata: {
                      subscriptionId: subscription.id,
                      invoiceId: invoice.id,
                      planName: subscription.items.data[0]?.price.nickname || 'N/A',
                      mrrImpact,
                    },
                  });
                }
              } catch (err) {
                console.error('Error processing subscription invoice:', err);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching open invoices:', err);
          isPartial = true;
        }

        // 3. Cards Expiring in Next 30 Days
        try {
          let hasMore = true;
          let startingAfter: string | undefined = undefined;

          while (hasMore) {
            const customers = await stripe.customers.list({
              limit: 100,
              starting_after: startingAfter,
            });

            for (const customer of customers.data) {
              if (customer.invoice_settings?.default_payment_method) {
                try {
                  const pm = await stripe.paymentMethods.retrieve(
                    customer.invoice_settings.default_payment_method as string
                  );

                  if (pm.type === 'card' && pm.card) {
                    const expDate = new Date(pm.card.exp_year, pm.card.exp_month - 1, 1);
                    const daysUntilExpiry = Math.floor(
                      (expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );

                    if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
                      const subscriptions = await stripe.subscriptions.list({
                        customer: customer.id,
                        status: 'active',
                        limit: 100,
                      });

                      const mrrImpact = subscriptions.data.reduce((sum, sub) => {
                        return sum + sub.items.data.reduce((itemSum, item) => {
                          if (item.price.recurring) {
                            const amount = item.price.unit_amount || 0;
                            const interval = item.price.recurring.interval;

                            if (interval === 'month') return itemSum + amount / 100;
                            if (interval === 'year') return itemSum + amount / 100 / 12;
                            if (interval === 'week') return itemSum + (amount / 100) * 4.33;
                            if (interval === 'day') return itemSum + (amount / 100) * 30.42;
                          }
                          return itemSum;
                        }, 0);
                      }, 0);

                      if (mrrImpact > 0) {
                        issues.push({
                          type: 'expiring_card',
                          customerEmail: customer.email || 'N/A',
                          customerName: customer.name || 'N/A',
                          amount: mrrImpact,
                          priority: daysUntilExpiry < 7 ? 'critical' : 'high',
                          metadata: {
                            cardLast4: pm.card.last4,
                            expirationDate: `${pm.card.exp_month}/${pm.card.exp_year}`,
                            daysUntilExpiry,
                            subscriptionIds: subscriptions.data.map(s => s.id),
                          },
                        });
                      }
                    }
                  }
                } catch (err) {
                  console.error('Error checking payment method:', err);
                }
              }
            }

            hasMore = customers.has_more;
            if (hasMore && customers.data.length > 0) {
              startingAfter = customers.data[customers.data.length - 1].id;
            }
          }
        } catch (err) {
          console.error('Error fetching customers for expiring cards:', err);
          isPartial = true;
        }

        // 4. Open Chargebacks (Disputes)
        try {
          const needsResponseDisputes = await stripe.disputes.list({
            status: 'needs_response',
            limit: 100,
          });

          const underReviewDisputes = await stripe.disputes.list({
            status: 'under_review',
            limit: 100,
          });

          const allDisputes = [
            ...needsResponseDisputes.data,
            ...underReviewDisputes.data,
          ];

          for (const dispute of allDisputes) {
            try {
              const charge = await stripe.charges.retrieve(dispute.charge as string);
              let customerEmail = 'N/A';
              let customerName = 'N/A';

              if (charge.customer && typeof charge.customer === 'string') {
                const customer = await stripe.customers.retrieve(charge.customer);
                customerEmail = (customer as Stripe.Customer).email || 'N/A';
                customerName = (customer as Stripe.Customer).name || 'N/A';
              }

              issues.push({
                type: 'chargeback',
                customerEmail,
                customerName,
                amount: dispute.amount / 100,
                priority: dispute.status === 'needs_response' ? 'critical' : 'high',
                metadata: {
                  disputeId: dispute.id,
                  reason: dispute.reason,
                  dueBy: dispute.evidence_details?.due_by
                    ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
                    : null,
                  status: dispute.status,
                },
              });
            } catch (err) {
              console.error('Error processing dispute:', err);
            }
          }
        } catch (err) {
          console.error('Error fetching disputes:', err);
          isPartial = true;
        }

        // 5. Calculate Current MRR
        let currentMRR = 0;
        try {
          let hasMore = true;
          let startingAfter: string | undefined = undefined;

          while (hasMore) {
            const subscriptions = await stripe.subscriptions.list({
              status: 'active',
              limit: 100,
              starting_after: startingAfter,
            });

            for (const sub of subscriptions.data) {
              sub.items.data.forEach((item) => {
                if (item.price.recurring && item.price.unit_amount) {
                  const amount = item.price.unit_amount;
                  const interval = item.price.recurring.interval;

                  if (interval === 'month') currentMRR += amount / 100;
                  else if (interval === 'year') currentMRR += amount / 100 / 12;
                  else if (interval === 'week') currentMRR += (amount / 100) * 4.33;
                  else if (interval === 'day') currentMRR += (amount / 100) * 30.42;
                }
              });
            }

            hasMore = subscriptions.has_more;
            if (hasMore && subscriptions.data.length > 0) {
              startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
            }
          }
        } catch (err) {
          console.error('Error calculating MRR:', err);
          isPartial = true;
          currentMRR = 0;
        }

        // 5. MRR Anomaly Detection
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Get yesterday's snapshot
        const yesterdaySnapshot = await prisma.dailyRevenueSnapshot.findFirst({
          where: {
            organizationId: org.id,
            date: yesterday,
            isPartial: false,
          },
        });

        // Get last 7 days snapshots
        const recentSnapshots = await prisma.dailyRevenueSnapshot.findMany({
          where: {
            organizationId: org.id,
            date: {
              gte: sevenDaysAgo,
              lt: today,
            },
            isPartial: false,
          },
          orderBy: { date: 'desc' },
        });

        if (yesterdaySnapshot && currentMRR > 0) {
          const yesterdayMRR = yesterdaySnapshot.currentMRR;
          const dayOverDayChange = ((currentMRR - yesterdayMRR) / yesterdayMRR) * 100;

          let avg7dayMRR = 0;
          let avg7dayChange = 0;
          let triggerMethod: string[] = [];

          if (recentSnapshots.length > 0) {
            avg7dayMRR =
              recentSnapshots.reduce((sum, s) => sum + s.currentMRR, 0) /
              recentSnapshots.length;
            avg7dayChange = ((currentMRR - avg7dayMRR) / avg7dayMRR) * 100;
          }

          if (dayOverDayChange < -10) {
            triggerMethod.push('day_over_day');
          }

          if (avg7dayMRR > 0 && avg7dayChange < -10) {
            triggerMethod.push('7day_average');
          }

          if (triggerMethod.length > 0) {
            issues.push({
              type: 'mrr_anomaly',
              customerEmail: 'N/A',
              customerName: 'Organization-wide',
              amount: Math.abs(currentMRR - yesterdayMRR),
              priority: 'critical',
              metadata: {
                currentMRR,
                previousMRR: yesterdayMRR,
                avg7dayMRR,
                dayOverDayChange: parseFloat(dayOverDayChange.toFixed(2)),
                avg7dayChange: parseFloat(avg7dayChange.toFixed(2)),
                triggerMethod: triggerMethod.join(', '),
              },
            });
          }
        }

        // Calculate totals
        const totalRevenueAtRisk = issues.reduce((sum, issue) => sum + issue.amount, 0);
        const mrrAffectedPercentage =
          currentMRR > 0 ? (totalRevenueAtRisk / currentMRR) * 100 : 0;

        const issueCountByType = issues.reduce((counts: any, issue) => {
          counts[issue.type] = (counts[issue.type] || 0) + 1;
          return counts;
        }, {});

        // Store DailyRevenueSnapshot
        const snapshot = await prisma.dailyRevenueSnapshot.create({
          data: {
            organizationId: org.id,
            date: today,
            totalRevenueAtRisk,
            mrrAffectedPercentage,
            currentMRR,
            issueCountByType,
            isPartial,
          },
        });

        // Store RevenueIssue records
        for (const issue of issues) {
          await prisma.revenueIssue.create({
            data: {
              organizationId: org.id,
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

        totalProcessed++;
        totalIssuesFound += issues.length;

        // Send alerts if needed (if email/slack utilities exist)
        // This will be implemented when email.ts and slack.ts are created
      } catch (error) {
        console.error(`Error processing organization ${org.id}:`, error);
        // Continue processing other organizations
      }
    }

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      totalIssuesFound,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during revenue check',
        executionTimeMs: Date.now() - startTime,
      },
      { status: 200 } // Return 200 to prevent Vercel retries
    );
  }
}
