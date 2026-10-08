import { NextResponse, NextRequest } from 'next/server';
import { sendExpiringInterventionsSummaryEmail, sendOverdueTicketsAndInterventionsAlerts } from '@/app/actions';
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
      console.log(`Checking overdue tickets & interventions for company: ${company.name} (${company.id})`);
      await sendOverdueTicketsAndInterventionsAlerts(company.id);

      if (company.resendApiKey && company.senderEmail) {
        console.log(`Sending summary for company: ${company.name} (${company.id})`);
        await sendExpiringInterventionsSummaryEmail(company.id);
      }
    }
    
    return NextResponse.json({ success: true, message: `Cron job completed for ${companies.length} companies.` });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Cron job failed' }, { status: 500 });
  }
}
