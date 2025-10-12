
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending support ticket notification emails using Resend.
 *
 * - sendSupportTicketNotification - A function that generates and sends a notification email.
 * - SendSupportTicketNotificationInput - The input type for the function.
 * - SendSupportTicketNotificationOutput - The return type for the function.
 */

import {z} from 'genkit';
import { Resend } from 'resend';
import type { SendSupportTicketNotificationInput, SendSupportTicketNotificationOutput } from '@/lib/types';


export async function sendSupportTicketNotification(input: SendSupportTicketNotificationInput): Promise<SendSupportTicketNotificationOutput> {
    const { recipientEmail, recipientName, ticket, isNewTicket, resendConfig } = input;
    
    const lastMessage = ticket.messages[ticket.messages.length - 1];

    const subject = isNewTicket
        ? `Nuovo Ticket di Supporto #${ticket.id}: ${ticket.subject}`
        : `Nuova Risposta al Ticket #${ticket.id}: ${ticket.subject}`;

    const body = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #333;">${subject}</h2>
            <p>Ciao ${recipientName},</p>
            <p>C'è un nuovo aggiornamento per un ticket di supporto.</p>
            <div style="background-color: #f9f9f9; border-left: 4px solid #64B5F6; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Da:</strong> ${lastMessage.senderName}</p>
                <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${lastMessage.text}</p>
            </div>
            <p>Puoi visualizzare la conversazione completa e rispondere accedendo a MannaTic.</p>
        </div>
    `;

    try {
        const resend = new Resend(resendConfig.apiKey);
        const { data, error } = await resend.emails.send({
            from: resendConfig.from,
            to: [recipientEmail],
            subject: subject,
            html: body,
        });

        if (error) {
            throw error;
        }

        return { success: true };

    } catch (error: any) {
        console.error(`[sendSupportTicketNotification] FAILED for ${recipientEmail}:`, error.message);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}
