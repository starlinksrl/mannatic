
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-kpi-dashboard.ts';
import '@/ai/flows/send-new-intervention-notification.ts';
import '@/ai/flows/send-password-reset-email.ts';
import '@/ai/flows/send-test-email.ts';
import '@/ai/flows/test-gcs-connection.ts';
import '@/ai/flows/upload-file-to-gcs.ts';
import '@/ai/flows/fetch-file-from-gcs.ts';
import '@/ai/flows/send-credentials-email.ts';
import '@/ai/flows/send-support-ticket-notification.ts';
import '@/ai/flows/send-assigned-intervention-notification.ts';
import '@/ai/flows/send-intervention-reminder-email.ts';
