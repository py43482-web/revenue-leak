// Demo Mode Configuration
// This allows the developer to present the SaaS with realistic data without real Stripe connections

export const DEMO_MODE_ENABLED = process.env.DEMO_MODE === 'true';

export const DEMO_CREDENTIALS = {
  email: 'demo@revenueleakradar.com',
  password: 'DemoPass123!',
  organizationName: 'Demo Company Inc.',
};

export const DEMO_USER_ID = 'demo-user-00000000-0000-0000-0000-000000000001';
export const DEMO_ORG_ID = 'demo-org-00000000-0000-0000-0000-000000000001';

// Demo MRR configuration
export const DEMO_CURRENT_MRR = 247500; // $247,500/month
export const DEMO_REVENUE_AT_RISK = 34250; // $34,250
export const DEMO_MRR_AFFECTED_PERCENTAGE = 13.8; // 13.8%

// Check if a user is the demo user
export function isDemoUser(userId: string | null | undefined): boolean {
  if (!DEMO_MODE_ENABLED) return false;
  return userId === DEMO_USER_ID;
}

export function isDemoOrganization(orgId: string | null | undefined): boolean {
  if (!DEMO_MODE_ENABLED) return false;
  return orgId === DEMO_ORG_ID;
}
