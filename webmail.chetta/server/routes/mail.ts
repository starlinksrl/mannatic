import { FastifyInstance } from 'fastify';
import { messageRepo, folderRepo, settingsRepo, accountRepo } from '../db/index.js';
import { syncFolderMessages, fetchFullMessage, downloadMessageAttachment } from '../imap/sync.js';
import { getConnectedImapClient } from '../imap/client.js';
import { sanitizeEmailHtml } from '../utils/parser.js';
import { buildRfc822Buffer } from '../smtp/sender.js';

export async function mailRoutes(app: FastifyInstance) {
  // Get messages in folder (from SQLite cache with instant response)
  app.get('/api/mail/:accountId/folder', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const query = req.query as {
      folder?: string;
      limit?: string;
      offset?: string;
      filter?: string;
      sync?: string;
    };

    const folderPath = query.folder || 'INBOX';
    const limit = parseInt(query.limit || '50', 10);
    const offset = parseInt(query.offset || '0', 10);
    const filter = query.filter; // 'all' | 'unread' | 'starred' | 'attachments'

    // Fetch from RAM cache immediately
    let messages = messageRepo.getByFolder(accountId, folderPath, limit, offset, filter);

    let syncResult = { hasMore: false, total: 0 };
    // If cache is empty or explicit sync requested or offset pagination requested, trigger IMAP sync
    if (messages.length === 0 || query.sync === 'true' || offset > 0) {
      try {
        syncResult = await syncFolderMessages(accountId, folderPath, limit, offset);
        messages = messageRepo.getByFolder(accountId, folderPath, limit + offset, 0, filter);
      } catch (err: any) {
        console.warn(`[Sync Error on ${folderPath}]`, err.message);
      }
    }

    return {
      messages,
      count: messages.length,
      folder: folderPath,
      total: syncResult.total,
      hasMore: syncResult.hasMore
    };
  });

  // Fast Instant Search (full-text search over SQLite)
  app.get('/api/mail/:accountId/search', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const { q } = req.query as { q?: string };

    if (!q || q.trim().length === 0) {
      return { results: [] };
    }

    const results = messageRepo.search(accountId, q.trim(), 50);
    return { results, count: results.length };
  });

  // Get single message details (full body, attachments)
  app.get('/api/mail/:accountId/message/:uid', async (req, reply) => {
    const { accountId, uid } = req.params as { accountId: string; uid: string };
    const { folder, allowImages, refresh } = req.query as { folder?: string; allowImages?: string; refresh?: string };
    const folderPath = folder || 'INBOX';
    const parsedUid = parseInt(uid, 10);

    const message = await fetchFullMessage(accountId, folderPath, parsedUid, refresh === 'true');
    if (!message) {
      return reply.status(404).send({ error: 'Messaggio non trovato' });
    }

    const settings = settingsRepo.get(accountId);
    const shouldBlockImages = allowImages === 'true' ? false : (settings ? settings.block_external_images === 1 : true);

    const sanitizedHtml = message.body_html ? sanitizeEmailHtml(message.body_html, shouldBlockImages) : '';

    // Detect true remote external images (not inline data: URIs)
    const hasExternalImages = message.body_html
      ? /(?:<img[^>]+src=["']?(https?:|\/\/)|url\(\s*["']?(https?:|\/\/))/i.test(message.body_html)
      : false;

    return {
      message: {
        ...message,
        body_html: sanitizedHtml,
        raw_has_external_images: shouldBlockImages && hasExternalImages
      }
    };
  });

  // Update flags (Mark as read/unread, Star/Unstar)
  app.post('/api/mail/:accountId/flags', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const body = req.body as {
      folder: string;
      uids: number[];
      isRead?: boolean;
      isStarred?: boolean;
    };

    const { folder, uids, isRead, isStarred } = body;
    if (!uids || uids.length === 0) {
      return reply.status(400).send({ error: 'Nessun messaggio specificato' });
    }

    // Update SQLite immediately
    for (const uid of uids) {
      messageRepo.updateFlags(
        accountId,
        folder,
        uid,
        isRead !== undefined ? (isRead ? 1 : 0) : undefined,
        isStarred !== undefined ? (isStarred ? 1 : 0) : undefined
      );
    }

    // Propagate to IMAP in background
    (async () => {
      try {
        const client = await getConnectedImapClient(accountId);
        const lock = await client.getMailboxLock(folder);
        try {
          const sequenceSet = uids.join(',');
          if (isRead !== undefined) {
            if (isRead) {
              await client.messageFlagsAdd(sequenceSet, ['\\Seen'], { uid: true });
            } else {
              await client.messageFlagsRemove(sequenceSet, ['\\Seen'], { uid: true });
            }
          }
          if (isStarred !== undefined) {
            if (isStarred) {
              await client.messageFlagsAdd(sequenceSet, ['\\Flagged'], { uid: true });
            } else {
              await client.messageFlagsRemove(sequenceSet, ['\\Flagged'], { uid: true });
            }
          }
        } finally {
          lock.release();
        }
      } catch (e: any) {
        console.error('[IMAP Flags Sync Error]', e.message);
      }
    })();

    return { success: true };
  });

  // Move or Delete message
  app.post('/api/mail/:accountId/move', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const body = req.body as {
      sourceFolder: string;
      destinationFolder: string;
      uids: number[];
    };

    const { sourceFolder, destinationFolder, uids } = body;

    // Delete from source folder in SQLite
    for (const uid of uids) {
      messageRepo.deleteByUid(accountId, sourceFolder, uid);
    }

    // Move in IMAP
    try {
      const client = await getConnectedImapClient(accountId);
      const lock = await client.getMailboxLock(sourceFolder);
      try {
        const sequenceSet = uids.join(',');
        await client.messageMove(sequenceSet, destinationFolder, { uid: true });
      } finally {
        lock.release();
      }
      return { success: true };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message || 'Errore nello spostamento email' });
    }
  });

  // Delete message (move to Trash or delete permanently)
  app.post('/api/mail/:accountId/delete', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const body = req.body as {
      folder: string;
      uids: number[];
    };

    const { folder, uids } = body;
    for (const uid of uids) {
      messageRepo.deleteByUid(accountId, folder, uid);
    }

    try {
      const client = await getConnectedImapClient(accountId);
      const lock = await client.getMailboxLock(folder);
      try {
        const sequenceSet = uids.join(',');
        await client.messageDelete(sequenceSet, { uid: true });
      } finally {
        lock.release();
      }
      return { success: true };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message || 'Errore eliminazione email' });
    }
  });

  // Download Attachment
  app.get('/api/mail/:accountId/attachment', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const query = req.query as {
      folder: string;
      uid: string;
      filename: string;
    };

    const result = await downloadMessageAttachment(
      accountId,
      query.folder || 'INBOX',
      parseInt(query.uid, 10),
      query.filename
    );

    if (!result) {
      return reply.status(404).send({ error: 'Allegato non trovato' });
    }

    reply.header('Content-Type', result.contentType);
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    return reply.send(result.buffer);
  });

  // Save or update draft on IMAP
  app.post('/api/mail/:accountId/draft', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const body = req.body as {
      draftUid?: number;
      to?: string[];
      cc?: string[];
      bcc?: string[];
      subject?: string;
      htmlBody?: string;
      textBody?: string;
      inReplyTo?: string;
    };

    const account = accountRepo.findById(accountId);
    if (!account) return reply.status(404).send({ error: 'Account non trovato' });

    try {
      const client = await getConnectedImapClient(accountId);
      const list = await client.list();
      const draftsBox = list.find(f => 
        f.specialUse === '\\Drafts' || 
        /draft|bozze/i.test(f.name) ||
        /draft/i.test(f.path)
      );

      if (!draftsBox) {
        return reply.status(500).send({ error: 'Cartella Bozze non trovata sul server IMAP' });
      }

      const mailOptions = {
        from: account.display_name ? `"${account.display_name}" <${account.email}>` : account.email,
        to: (body.to || []).join(', '),
        cc: (body.cc || []).join(', ') || undefined,
        bcc: (body.bcc || []).join(', ') || undefined,
        subject: body.subject || '(Senza oggetto)',
        html: body.htmlBody || '',
        text: body.textBody || '',
        inReplyTo: body.inReplyTo
      };

      const buffer = await buildRfc822Buffer(mailOptions);
      const appendRes = await client.append(draftsBox.path, buffer, ['\\Draft']);

      // If updating an existing draft, delete previous UID
      if (body.draftUid) {
        try {
          const lock = await client.getMailboxLock(draftsBox.path);
          try {
            await client.messageDelete(String(body.draftUid), { uid: true });
          } finally {
            lock.release();
          }
        } catch (e) {
          // ignore
        }
      }

      // Refresh drafts in RAM
      await syncFolderMessages(accountId, draftsBox.path, 50, 0);

      const newUid = appendRes ? appendRes.uid : undefined;

      return {
        success: true,
        uid: newUid,
        folder: draftsBox.path
      };
    } catch (error: any) {
      console.error('[Draft Save Error]', error);
      return reply.status(500).send({ error: error.message || 'Impossibile salvare la bozza' });
    }
  });

  // Download raw .EML message
  app.get('/api/mail/:accountId/eml/:uid', async (req, reply) => {
    const { accountId, uid } = req.params as { accountId: string; uid: string };
    const { folder } = req.query as { folder?: string };
    const folderPath = folder || 'INBOX';

    try {
      const client = await getConnectedImapClient(accountId);
      const lock = await client.getMailboxLock(folderPath);
      try {
        const downloaded = await client.download(uid, undefined, { uid: true });
        if (!downloaded || !downloaded.content) {
          return reply.status(404).send({ error: 'Messaggio non trovato' });
        }
        const chunks: Buffer[] = [];
        for await (const chunk of downloaded.content) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const rawBuffer = Buffer.concat(chunks);
        reply.header('Content-Type', 'message/rfc822');
        reply.header('Content-Disposition', `attachment; filename="email-${uid}.eml"`);
        return reply.send(rawBuffer);
      } finally {
        lock.release();
      }
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
