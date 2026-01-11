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

export async function sendSlackAlert(
  webhookUrl: string,
  snapshot: DailySnapshot,
  issues: RevenueIssue[]
) {
  try {
    const topIssues = issues.slice(0, 5);

    const issueText = topIssues
      .map((issue) => {
        const icon = issue.priority === 'critical' ? '🔴' : '🟠';
        const typeLabel = getIssueTypeLabel(issue.type);
        const customerInfo = getSlackCustomerInfo(issue);
        const amount = formatCurrency(issue.amount);

        return `• ${icon} ${typeLabel}: ${amount} (${customerInfo})`;
      })
      .join('\n');

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Revenue Alert',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Revenue at Risk Today:*\n${formatCurrency(
              snapshot.totalRevenueAtRisk
            )}`,
          },
          {
            type: 'mrkdwn',
            text: `*MRR Affected:*\n${snapshot.mrrAffectedPercentage.toFixed(1)}%`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Top Issues:*\n${issueText}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
            },
            url: `${process.env.APP_URL}/dashboard`,
            style: 'primary',
          },
        ],
      },
    ];

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      throw new Error(
        `Slack webhook failed with status ${response.status}`
      );
    }

    console.log('Slack alert sent successfully');
  } catch (error) {
    console.error('Error sending Slack alert:', error);
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

function getSlackCustomerInfo(issue: RevenueIssue): string {
  switch (issue.type) {
    case 'mrr_anomaly':
      return 'Organization-wide';
    case 'failed_payment':
      return issue.customerEmail;
    case 'failed_subscription':
      return issue.customerEmail;
    case 'expiring_card':
      return issue.customerEmail;
    case 'chargeback':
      return issue.customerEmail;
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
