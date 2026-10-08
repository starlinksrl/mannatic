import { FastifyInstance } from 'fastify';
import { contactRepo, messageRepo, folderRepo } from '../db/index.js';
import { getConnectedImapClient } from '../imap/client.js';
import {
  parseAnyContactSource,
  formatContactsToCsv,
  formatContactsToVCard,
  ParsedContact
} from '../utils/contactParsers.js';

export async function contactsRoutes(app: FastifyInstance) {
  // 1. Get all contacts (supports optional ?q= search)
  app.get('/api/contacts/:accountId', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const { q } = (req.query as { q?: string }) || {};
    const contacts = contactRepo.getAll(accountId, q);
    return { contacts };
  });

  // 2. Create or update a single contact
  app.post('/api/contacts/:accountId', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const body = req.body as {
      id?: string;
      name?: string;
      email: string;
      phone?: string;
      company?: string;
      notes?: string;
    };

    if (!body.email || !body.email.includes('@')) {
      return reply.status(400).send({ error: 'Indirizzo email non valido' });
    }

    const contact = contactRepo.upsert(accountId, body);
    return { success: true, contact };
  });

  // 3. Delete single contact
  app.delete('/api/contacts/:accountId/:id', async (req, reply) => {
    const { accountId, id } = req.params as { accountId: string; id: string };
    const success = contactRepo.delete(accountId, id);
    return { success };
  });

  // 4. Clear all contacts for account
  app.delete('/api/contacts/:accountId', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const success = contactRepo.clearAll(accountId);
    return { success };
  });

  // 5. Multi-source Import (Google CSV, Outlook CSV, Generic CSV, vCard .vcf)
  app.post('/api/contacts/:accountId/import', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const body = req.body as {
      text?: string;
      contacts?: ParsedContact[];
    };

    let itemsToImport: ParsedContact[] = [];

    if (Array.isArray(body.contacts)) {
      itemsToImport = body.contacts;
    } else if (typeof body.text === 'string' && body.text.trim()) {
      itemsToImport = parseAnyContactSource(body.text);
    }

    if (itemsToImport.length === 0) {
      return reply.status(400).send({ error: 'Nessun contatto valido trovato da importare' });
    }

    const count = contactRepo.batchUpsert(accountId, itemsToImport);
    const all = contactRepo.getAll(accountId);
    return { success: true, count, total: all.length, contacts: all };
  });

  // 6. Automatic Extraction from IMAP Mail (In arrivo + Inviati)
  app.post('/api/contacts/:accountId/extract-from-mail', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };

    const extractedMap = new Map<string, { name?: string; email: string }>();

    // Step A: Extract from in-memory cached messages
    const inMemoryAddrs = messageRepo.getAllAddressesForAccount(accountId);
    for (const item of inMemoryAddrs) {
      const email = item.email.toLowerCase().trim();
      if (email.includes('@') && !extractedMap.has(email)) {
        extractedMap.set(email, { name: item.name, email });
      }
    }

    // Step B: Scan recent messages from INBOX and Sent via IMAP if available
    try {
      const client = await getConnectedImapClient(accountId);
      const foldersToScan = ['INBOX'];

      const allFolders = folderRepo.getAllByAccount(accountId);
      const sent = allFolders.find(f => f.special_use === 'sent' || /sent|inviati/i.test(f.name));
      if (sent) foldersToScan.push(sent.path);

      for (const folderPath of foldersToScan) {
        try {
          const lock = await client.getMailboxLock(folderPath);
          try {
            const status = client.mailbox;
            if (status && status.exists > 0) {
              const startSeq = Math.max(1, status.exists - 40);
              const range = `${startSeq}:*`;
              for await (const msg of client.fetch(range, { envelope: true })) {
                if (msg.envelope) {
                  // From
                  for (const from of msg.envelope.from || []) {
                    if (from.address && from.address.includes('@')) {
                      const email = from.address.toLowerCase().trim();
                      if (!extractedMap.has(email)) {
                        extractedMap.set(email, { name: from.name || from.address.split('@')[0], email });
                      }
                    }
                  }
                  // To
                  for (const to of msg.envelope.to || []) {
                    if (to.address && to.address.includes('@')) {
                      const email = to.address.toLowerCase().trim();
                      if (!extractedMap.has(email)) {
                        extractedMap.set(email, { name: to.name || to.address.split('@')[0], email });
                      }
                    }
                  }
                }
              }
            }
          } finally {
            lock.release();
          }
        } catch (folderErr) {
          console.warn(`[Extract Contacts] Scan folder ${folderPath} skipped:`, folderErr);
        }
      }
    } catch (imapErr) {
      console.warn('[Extract Contacts IMAP Error]:', imapErr);
    }

    const items = Array.from(extractedMap.values());
    const count = contactRepo.batchUpsert(accountId, items);
    const all = contactRepo.getAll(accountId);
    return { success: true, count, total: all.length, contacts: all };
  });

  // 7. Export Contacts (CSV or vCard)
  app.get('/api/contacts/:accountId/export', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const { format } = (req.query as { format?: string }) || {};

    const contacts = contactRepo.getAll(accountId);

    if (format === 'vcf' || format === 'vcard') {
      const vcardText = formatContactsToVCard(contacts);
      reply.header('Content-Type', 'text/vcard; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="rubrica_contatti.vcf"');
      return reply.send(vcardText);
    }

    const csvText = formatContactsToCsv(contacts);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="rubrica_contatti.csv"');
    return reply.send(csvText);
  });
}
