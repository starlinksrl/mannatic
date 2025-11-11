
import { NextResponse } from 'next/server';
import { getCompanies, sendOverdueInterventionsSummaryEmail } from '@/app/actions';

export async function GET() {
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

    