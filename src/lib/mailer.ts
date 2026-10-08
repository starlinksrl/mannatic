import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: any;
    path?: string;
    contentType?: string;
  }>;
  resendConfig?: {
    apiKey?: string | null;
    from?: string | null;
  };
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

let cachedTransporter: Transporter | null = null;

function getSmtpTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST || 'mail.mannatec.it';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== 'false';
  const user = process.env.SMTP_USER || 'noreply@mannatec.it';
  const pass = process.env.SMTP_PASS || 'starlink74';

  if (!user || !pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return cachedTransporter;
}

/**
 * Universal email sender for MannaTic.
 * Primary: Native SMTP via mail.mannatec.it (noreply@mannatec.it).
 * Secondary / Optional: Custom company Resend if explicitly provided, with automatic SMTP fallback.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, from, replyTo, attachments, resendConfig } = options;
  const recipients = Array.isArray(to) ? to : [to];
  const cleanRecipients = recipients.map(r => r.trim()).filter(Boolean);

  if (cleanRecipients.length === 0) {
    return { success: false, error: 'Nessun destinatario specificato.' };
  }

  const defaultFrom = process.env.SMTP_FROM || '"MannaTic" <noreply@mannatec.it>';
  const fromAddress = from || defaultFrom;

  // 1. Try Custom Company Resend if provided and valid
  if (resendConfig?.apiKey && resendConfig?.from) {
    try {
      const resend = new Resend(resendConfig.apiKey);
      const { data, error } = await resend.emails.send({
        from: resendConfig.from,
        to: cleanRecipients,
        subject,
        html,
        text,
        reply_to: replyTo,
      });

      if (!error && data?.id) {
        return { success: true, messageId: data.id };
      }
      console.warn(`[Mailer] Resend error, falling back to direct SMTP (${error?.message})`);
    } catch (resendErr: any) {
      console.warn(`[Mailer] Resend exception, falling back to direct SMTP (${resendErr.message})`);
    }
  }

  // 2. Primary: Native SMTP from mannatec.it
  const transporter = getSmtpTransporter();
  if (!transporter) {
    return { success: false, error: 'Configurazione SMTP non trovata.' };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: cleanRecipients,
      subject,
      html,
      text,
      replyTo,
      attachments,
    });

    return { success: true, messageId: info.messageId };
  } catch (smtpErr: any) {
    console.error(`[Mailer] SMTP sending error to [${cleanRecipients.join(', ')}]:`, smtpErr.message);
    return { success: false, error: smtpErr.message || 'Errore durante l\'invio SMTP.' };
  }
}
