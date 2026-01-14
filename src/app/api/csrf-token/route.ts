import { NextResponse } from 'next/server';
import { generateCsrfToken, getCsrfToken } from '@/lib/csrf';

export async function GET() {
  // Get existing token or generate new one
  let token = await getCsrfToken();

  if (!token) {
    token = await generateCsrfToken();
  }

  return NextResponse.json({ csrfToken: token });
}
