import nodemailer from 'nodemailer';
import { Account, accountRepo, settingsRepo } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';
import { getConnectedImapClient } from '../imap/client.js';

export interface SendMailOptions {
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export async function sendEmail(opts: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const account = accountRepo.findById(opts.accountId);
  if (!account) {
    throw new Error('Account non trovato');
  }

  const password = decrypt(account.password_encrypted);
  const settings = settingsRepo.get(opts.accountId);

  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_secure === 1,
    auth: {
      user: account.username || account.email,
      pass: password
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  let fullHtml = opts.htmlBody;
  if (settings && settings.signature_enabled && settings.signature_html) {
    fullHtml += `<br><br><div class="email-signature">${settings.signature_html}</div>`;
  }

  const mailOptions: nodemailer.SendMailOptions = {
    from: account.display_name ? `"${account.display_name}" <${account.email}>` : account.email,
    to: opts.to.join(', '),
    cc: opts.cc && opts.cc.length > 0 ? opts.cc.join(', ') : undefined,
    bcc: opts.bcc && opts.bcc.length > 0 ? opts.bcc.join(', ') : undefined,
    subject: opts.subject,
    html: fullHtml,
    text: opts.textBody,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
    attachments: opts.attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType
    }))
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    // Try to append to Sent folder on IMAP in background
    appendSentMessageToImap(account, mailOptions).catch((err) => {
      console.warn('[IMAP Append Sent Warning]', err.message);
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error: any) {
    console.error('[SMTP Send Error]', error);
    return {
      success: false,
      error: error.message || 'Errore durante l\'invio dell\'email'
    };
  }
}

export function buildRfc822Buffer(mailOptions: nodemailer.SendMailOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    import('nodemailer/lib/mail-composer/index.js')
      .then(({ default: Composer }) => {
        const composer = new (Composer as any)(mailOptions);
        composer.compile().build((err: any, buffer: Buffer) => {
          if (err) reject(err);
          else resolve(buffer);
        });
      })
      .catch(reject);
  });
}

async function appendSentMessageToImap(account: Account, mailOptions: nodemailer.SendMailOptions) {
  try {
    const client = await getConnectedImapClient(account.id);
    const list = await client.list();
    const sentBox = list.find(f => 
      f.specialUse === '\\Sent' || 
      /sent|inviata|inviati/i.test(f.name) ||
      /sent/i.test(f.path)
    );

    if (sentBox) {
      const buffer = await buildRfc822Buffer(mailOptions);
      await client.append(sentBox.path, buffer, ['\\Seen']);
      console.log(`✅ [IMAP] Copia inviata salvata con successo in "${sentBox.path}"`);
    }
  } catch (e: any) {
    console.warn('[IMAP Append Sent Warning]', e.message);
  }
}

