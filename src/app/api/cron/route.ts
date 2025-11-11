
import { NextResponse } from 'next/server';
import { getCompanies, sendExpiringInterventionsSummaryEmail } from '@/app/actions';

export async function GET() {
  try {
    const companies = await getCompanies(undefined, true);
    
    for (const company of companies) {
      if (company.resendApiKey && company.senderEmail) {
        console.log(`Sending summary for company: ${company.name} (${company.id})`);
        await sendExpiringInterventionsSummaryEmail(company.id);
      } else {
        console.log(`Skipping summary for ${company.name}: Resend not configured.`);
      }
    }
    
    return NextResponse.json({ success: true, message: `Cron job completed for ${companies.length} companies.` });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Cron job failed' }, { status: 500 });
  }
}
