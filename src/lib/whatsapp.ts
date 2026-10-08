import 'dotenv/config';

interface SendWhatsAppParams {
  ticketId: string;
  subject: string;
  clientName: string;
  messageText: string;
  recipientPhone?: string; // Target phone number
  // Dynamic credentials per tenant:
  accessToken?: string;
  phoneNumberId?: string;
  templateName?: string;
}

/**
 * Sends a WhatsApp notification when a new ticket is opened.
 * Integrates directly with the Meta Cloud API for WhatsApp Business.
 * If credentials are not configured, it will print a mock log in the console.
 */
export async function sendWhatsAppTicketNotification({
  ticketId,
  subject,
  clientName,
  messageText,
  recipientPhone,
  accessToken: dynamicAccessToken,
  phoneNumberId: dynamicPhoneNumberId,
  templateName: dynamicTemplateName
}: SendWhatsAppParams): Promise<{ success: boolean; error?: string }> {
  
  const accessToken = dynamicAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = dynamicPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = dynamicTemplateName || process.env.WHATSAPP_TEMPLATE_NAME;
  const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;

  // Resolve recipient phone number
  let targetPhone = recipientPhone || adminPhone;
  if (!targetPhone) {
    console.warn('[WhatsApp Notification] Skipped: No recipient phone number configured.');
    return { success: false, error: 'Recipient phone number is missing.' };
  }

  // Clean phone number: remove '+' and any non-digit character
  const cleanPhone = targetPhone.replace(/\D/g, '');

  // Check if we should use Mock (if credentials are not present)
  if (!accessToken || !phoneNumberId) {
    const logMsg = `
================ MOCK WHATSAPP NOTIFICATION ================
To: +${cleanPhone}
Message: [Nuovo Ticket #${ticketId}] aperto da ${clientName}
Oggetto: ${subject}
Corpo: ${messageText.substring(0, 150)}...
============================================================
(No Meta credentials provided, mocked in server console)
    `;
    console.log(logMsg);
    return { success: true };
  }

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  let payload: any;

  if (templateName) {
    // If a template is configured, send using Template message structure
    payload = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'it',
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: clientName || 'Cliente' },
              { type: 'text', text: ticketId },
              { type: 'text', text: subject.substring(0, 100) },
            ],
          },
        ],
      },
    };
  } else {
    // Fallback: Text message (only works if user initiated contact in the last 24 hours)
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        body: `Nuovo Ticket aperto da ${clientName}: "${subject}".\n\nMessaggio: ${messageText.substring(0, 150)}...`,
      },
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Notification] API error response:', data);
      throw new Error(data.error?.message || 'Meta API returned an error.');
    }

    console.log(`[WhatsApp Notification] Sent successfully to +${cleanPhone}. Msg ID:`, data.messages?.[0]?.id);
    return { success: true };
  } catch (error: any) {
    console.error(`[WhatsApp Notification] Failed to send to +${cleanPhone}:`, error.message);
    return { success: false, error: error.message || 'Unknown network error.' };
  }
}
