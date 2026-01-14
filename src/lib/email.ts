import nodemailer from 'nodemailer';

interface RevenueIssue {
  type: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  priority: string;
  metadata: any;
}

interface DailySnapshot {
  totalRevenueAtRisk: number;
  mrrAffectedPercentage: number;
}

export async function sendDailyAlert(
  userEmail: string,
  snapshot: DailySnapshot,
  issues: RevenueIssue[]
) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const topIssues = issues.slice(0, 5);

    const issueRows = topIssues
      .map((issue) => {
        const typeLabel = getIssueTypeLabel(issue.type);
        const priorityBadge =
          issue.priority === 'critical'
            ? '<span style="background: #d32f2f; color: white; padding: 2px 8px; font-size: 10px; font-weight: bold;">CRIT</span>'
            : '<span style="background: #f57c00; color: white; padding: 2px 8px; font-size: 10px; font-weight: bold;">HIGH</span>';
        const customerInfo = getCustomerInfo(issue);
        const amount = formatCurrency(issue.amount);

        return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px;">${priorityBadge}</td>
          <td style="padding: 12px; font-size: 12px; color: #666; text-transform: uppercase;">${typeLabel}</td>
          <td style="padding: 12px; font-size: 14px; color: #333;">${customerInfo}</td>
          <td style="padding: 12px; font-size: 16px; font-weight: bold; text-align: right;">${amount}</td>
        </tr>
      `;
      })
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border: 2px solid #e0e0e0; padding: 40px;">
      <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: bold;">Revenue Leak Radar</h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #666;">Daily Revenue Alert</p>

      <div style="text-align: center; padding: 32px; border: 2px solid #e0e0e0; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #666;">Revenue at Risk Today</p>
        <p style="margin: 0 0 8px 0; font-size: 48px; font-weight: bold; color: #d32f2f;">${formatCurrency(
          snapshot.totalRevenueAtRisk
        )}</p>
        <p style="margin: 0; font-size: 14px; color: #666;">${snapshot.mrrAffectedPercentage.toFixed(
          1
        )}% of MRR affected</p>
      </div>

      <h2 style="font-size: 18px; font-weight: bold; margin: 0 0 16px 0;">Top 5 Issues</h2>

      <table style="width: 100%; border-collapse: collapse; border: 2px solid #e0e0e0;">
        ${issueRows}
      </table>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background: #333; color: white; padding: 12px 24px; text-decoration: none; font-weight: 500;">View Full Report</a>
      </div>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">You're receiving this because you have email alerts enabled.</p>
        <p style="margin: 0; font-size: 12px; color: #666;">
          <a href="${process.env.APP_URL}/dashboard/settings" style="color: #333;">Manage alert settings</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'alerts@revenueleakradar.com',
      to: userEmail,
      subject: `⚠️ Revenue Alert: ${formatCurrency(
        snapshot.totalRevenueAtRisk
      )} at Risk Today`,
      html,
    });

    console.log('Daily alert email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

function getIssueTypeLabel(type: string): string {
  switch (type) {
    case 'failed_payment':
      return 'Failed Payment';
    case 'failed_subscription':
      return 'Failed Sub';
    case 'expiring_card':
      return 'Expiring Card';
    case 'chargeback':
      return 'Chargeback';
    case 'mrr_anomaly':
      return 'MRR Anomaly';
    default:
      return type;
  }
}

function getCustomerInfo(issue: RevenueIssue): string {
  switch (issue.type) {
    case 'failed_payment':
      return `${issue.customerEmail} • ${issue.metadata.daysOverdue} days overdue`;
    case 'failed_subscription':
      return `${issue.customerEmail} • Subscription at risk`;
    case 'expiring_card':
      return `${issue.customerEmail} • Expires in ${issue.metadata.daysUntilExpiry} days`;
    case 'chargeback':
      return `${issue.customerEmail} • ${
        issue.metadata.status === 'needs_response'
          ? 'Needs response'
          : 'Under review'
      }`;
    case 'mrr_anomaly':
      return 'Organization-wide drop detected';
    default:
      return issue.customerEmail;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
