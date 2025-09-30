import { config } from 'dotenv';
config();

import '@/ai/flows/generate-kpi-dashboard.ts';
import '@/ai/flows/send-notification-email.ts';
import '@/ai/flows/send-expiry-notification.ts';
import '@/ai/flows/send-new-intervention-notification.ts';
import '@/ai/flows/send-password-reset-email.ts';
import '@/ai/flows/send-test-email.ts';
import '@/ai/flows/test-gcs-connection.ts';
import '@/ai/flows/upload-file-to-gcs.ts';
import '@/ai/flows/fetch-file-from-gcs.ts';
