
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending support ticket notification emails using Resend.
 *
 * - sendSupportTicketNotification - A function that generates and sends a notification email.
 * - SendSupportTicketNotificationInput - The input type for the function.
 * - SendSupportTicketNotificationOutput - The return type for the function.
 */

import { sendEmail } from '@/lib/mailer';
import type { SendSupportTicketNotificationInput, SendSupportTicketNotificationOutput } from '@/lib/types';


export async function sendSupportTicketNotification(input: SendSupportTicketNotificationInput): Promise<SendSupportTicketNotificationOutput> {
    const { recipientEmail, recipientName, ticket, isNewTicket, ticketLink, resendConfig } = input;
    
    const lastMessage = ticket.messages[ticket.messages.length - 1];

    const clientName = ticket.clientName?.trim() || 'Cliente';

    // Per apertura ticket: nell'oggetto solo il nome del cliente
    const subject = isNewTicket
        ? clientName
        : `Risposta - ${clientName}`;

    const linkHtml = ticketLink ? `<p style="margin-top: 20px;"><a href="${ticketLink}" style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Visualizza Ticket</a></p>` : '';

    const body = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #0284c7; margin-top: 0;">${isNewTicket ? 'Nuovo Ticket di Supporto' : 'Risposta al Ticket'}</h2>
            <p>Ciao ${recipientName},</p>
            <p>C'è un nuovo aggiornamento per la richiesta di supporto da parte di <strong>${clientName}</strong>.</p>
            <p><strong>Oggetto della richiesta:</strong> ${ticket.subject}</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0;"><strong>Da:</strong> ${lastMessage.senderName}</p>
                <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${lastMessage.text}</p>
            </div>
            <p>Puoi visualizzare la conversazione completa e rispondere accedendo a MannaTic.</p>
            ${linkHtml}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Il Team di MannaTic</p>
        </div>
    `;

    try {
        const result = await sendEmail({
            to: recipientEmail,
            subject,
            html: body,
            resendConfig,
        });

        if (!result.success) {
            throw new Error(result.error || 'Invio email fallito.');
        }

        return { success: true };

    } catch (error: any) {
        console.error(`[sendSupportTicketNotification] FAILED for ${recipientEmail}:`, error.message);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}
