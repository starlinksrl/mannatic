import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Appointment } from "./types";
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateShortId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createWhatsAppLink(phone: string | null | undefined): string {
    if (!phone) return '';
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.startsWith('39')) {
      return `https://wa.me/${digitsOnly}`;
    }
    return `https://wa.me/39${digitsOnly}`;
};

export function generateGoogleCalendarLink(appointment: Appointment): string {
  if (!appointment.date) return '';

  const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';

  const title = encodeURIComponent(appointment.title);

  // Format date and time for Google Calendar (YYYYMMDDTHHMMSSZ)
  const startTime = new Date(appointment.date);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default to 1 hour duration

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const dates = `${formatDate(startTime)}/${formatDate(endTime)}`;

  const details = encodeURIComponent(appointment.notes || `Appuntamento per: ${appointment.title}`);
  
  let link = `${baseUrl}&text=${title}&dates=${dates}&details=${details}`;

  if (appointment.address) {
    const location = encodeURIComponent(appointment.address);
    link += `&location=${location}`;
  }

  return link;
}

export function resolvePlatformBaseUrl(companyPlatformUrl?: string | null, hostHeader?: string | null): string {
  const prodDefault = 'https://supporto.mannatec.it';

  if (hostHeader) {
    const cleanHost = hostHeader.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const isInternalHost =
      cleanHost.includes('localhost') ||
      cleanHost.includes('127.0.0.1') ||
      cleanHost.includes(':8001') ||
      cleanHost.includes(':3000') ||
      cleanHost.includes('0.0.0.0') ||
      cleanHost === 'mannatec.it' ||
      cleanHost === 'www.mannatec.it' ||
      cleanHost.includes('work.mannatec.it');

    if (!isInternalHost && cleanHost.length > 0) {
      const protocol = cleanHost.includes('.workstations.google.com') ? 'http' : 'https';
      return `${protocol}://${cleanHost}`;
    }
  }

  const candidates = [companyPlatformUrl, process.env.NEXT_PUBLIC_APP_URL];
  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.trim().replace(/\/+$/, '');
    if (
      !cleaned ||
      cleaned.includes('localhost') ||
      cleaned.includes('127.0.0.1') ||
      cleaned.includes(':8001') ||
      cleaned.includes(':3000') ||
      cleaned === 'https://mannatec.it' ||
      cleaned === 'http://mannatec.it' ||
      cleaned === 'https://www.mannatec.it' ||
      cleaned === 'http://www.mannatec.it' ||
      cleaned.includes('work.mannatec.it')
    ) {
      continue;
    }
    return cleaned;
  }

  return prodDefault;
}
