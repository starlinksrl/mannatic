import { NextResponse, NextRequest } from 'next/server';
import { sendOverdueInterventionsSummaryEmail } from '@/app/actions';
import { getCompanies } from '@/lib/data';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'mannatic-secret-cron-token';
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');

  if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const companies = await getCompanies(undefined, true);
    
    for (const company of companies) {
      if (company.resendApiKey && company.senderEmail) {
        console.log(`Sending weekly summary for company: ${company.name} (${company.id})`);
        await sendOverdueInterventionsSummaryEmail(company.id);
      } else {
        console.log(`Skipping weekly summary for ${company.name}: Resend not configured.`);
      }
    }
    
    return NextResponse.json({ success: true, message: `Weekly cron job completed for ${companies.length} companies.` });
  } catch (error: any) {
    console.error('Weekly cron job failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Weekly cron job failed' }, { status: 500 });
  }
}
