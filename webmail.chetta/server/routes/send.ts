import { FastifyInstance } from 'fastify';
import { sendEmail } from '../smtp/sender.js';
import { contactRepo } from '../db/index.js';

export async function sendRoutes(app: FastifyInstance) {
  // Send email
  app.post('/api/mail/:accountId/send', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    
    // Check if multipart or JSON
    let to: string[] = [];
    let cc: string[] = [];
    let bcc: string[] = [];
    let subject = '';
    let htmlBody = '';
    let textBody = '';
    let inReplyTo: string | undefined;
    let references: string | undefined;
    const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];

    if (req.isMultipart()) {
      const parts = req.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const buf = await part.toBuffer();
          attachments.push({
            filename: part.filename || 'allegato',
            content: buf,
            contentType: part.mimetype
          });
        } else {
          const fieldName = part.fieldname;
          const val = part.value as string;
          if (fieldName === 'to') to = JSON.parse(val);
          else if (fieldName === 'cc') cc = JSON.parse(val);
          else if (fieldName === 'bcc') bcc = JSON.parse(val);
          else if (fieldName === 'subject') subject = val;
          else if (fieldName === 'htmlBody') htmlBody = val;
          else if (fieldName === 'textBody') textBody = val;
          else if (fieldName === 'inReplyTo') inReplyTo = val;
          else if (fieldName === 'references') references = val;
        }
      }
    } else {
      const body = req.body as any;
      to = body.to || [];
      cc = body.cc || [];
      bcc = body.bcc || [];
      subject = body.subject || '';
      htmlBody = body.htmlBody || '';
      textBody = body.textBody || '';
      inReplyTo = body.inReplyTo;
      references = body.references;
    }

    if (!to || to.length === 0) {
      return reply.status(400).send({ error: 'Specificare almeno un destinatario' });
    }

    // Record contacts
    for (const recipient of to) {
      contactRepo.recordContact(accountId, recipient);
    }

    const result = await sendEmail({
      accountId,
      to,
      cc,
      bcc,
      subject,
      htmlBody,
      textBody,
      inReplyTo,
      references,
      attachments
    });

    if (!result.success) {
      return reply.status(500).send({ error: result.error });
    }

    return { success: true, messageId: result.messageId };
  });
}
