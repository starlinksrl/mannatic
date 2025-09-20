import { config } from 'dotenv';
config();

import '@/ai/flows/generate-kpi-dashboard.ts';
import '@/ai/flows/send-notification-email.ts';
import '@/ai/flows/send-expiry-notification.ts';
import '@/ai/flows/send-new-intervention-notification.ts';
