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
