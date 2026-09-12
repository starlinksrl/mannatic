import { FastifyInstance } from 'fastify';
import { folderRepo, messageRepo } from '../db/index.js';
import { syncFolders } from '../imap/sync.js';
import { getConnectedImapClient } from '../imap/client.js';

export async function folderRoutes(app: FastifyInstance) {
  // Get all cached folders for account (sync with IMAP if cache empty or sync=true)
  app.get('/api/folders/:accountId', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const { sync } = req.query as { sync?: string };
    let folders = folderRepo.getAllByAccount(accountId);
    if (folders.length === 0 || sync === 'true') {
      try {
        folders = await syncFolders(accountId);
      } catch (error: any) {
        console.warn(`[Folders Sync Error on ${accountId}]`, error.message);
      }
    }
    return { folders };
  });

  // Force sync folders with IMAP
  app.post('/api/folders/:accountId/sync', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    try {
      const folders = await syncFolders(accountId);
      return { success: true, folders };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message || 'Errore durante la sincronizzazione delle cartelle' });
    }
  });

  // Create new folder
  app.post('/api/folders/:accountId/create', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const { path } = req.body as { path: string };

    if (!path) {
      return reply.status(400).send({ error: 'Il nome della cartella è obbligatorio' });
    }

    try {
      const client = await getConnectedImapClient(accountId);
      await client.mailboxCreate(path);
      const folders = await syncFolders(accountId);
      return { success: true, folders };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message || 'Impossibile creare la cartella IMAP' });
    }
  });

  // Empty folder (e.g. Trash or Junk)
  app.post('/api/folders/:accountId/empty', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const { path } = req.body as { path: string };

    if (!path) {
      return reply.status(400).send({ error: 'Percorso cartella non valido' });
    }

    try {
      const client = await getConnectedImapClient(accountId);
      const lock = await client.getMailboxLock(path);
      try {
        if (client.mailbox && client.mailbox.exists > 0) {
          await client.messageDelete('1:*', { uid: false });
        }
      } finally {
        lock.release();
      }

      // Clear RAM messages for this folder
      messageRepo.clearFolder(accountId, path);
      folderRepo.updateCounts(accountId, path, 0, 0);

      const folders = folderRepo.getAllByAccount(accountId);
      return { success: true, folders };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message || 'Impossibile svuotare la cartella' });
    }
  });

  // Delete folder (custom user folders only; system folders protected)
  app.post('/api/folders/:accountId/delete', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const { path } = req.body as { path: string };

    if (!path) {
      return reply.status(400).send({ error: 'Percorso cartella non valido' });
    }

    // Protection for system folders
    const isSystemFolder = /^(inbox|sent|drafts|trash|junk|deleted items|outbox|posta inviata|posta eliminata|posta indesiderata|bozze|cestino)$/i.test(path);
    if (isSystemFolder) {
      return reply.status(400).send({ error: 'Non è consentito eliminare le cartelle di sistema predefinite' });
    }

    try {
      const client = await getConnectedImapClient(accountId);

      // Close mailbox if currently open/selected
      if (client.mailbox && client.mailbox.path === path) {
        try {
          await client.mailboxClose();
        } catch {}
      }

      // Attempt direct IMAP mailbox deletion
      let deleted = false;
      try {
        await client.mailboxDelete(path);
        deleted = true;
      } catch (err: any) {
        console.warn(`[IMAP Delete] Direct mailboxDelete("${path}") failed: ${err.message}. Attempting cleanup fallback...`);
        // If MailEnable or Windows filesystem restricts direct rmdir, move to trash/deleted items
        for (const trashPrefix of ['Deleted Items', 'Trash', 'Cestino']) {
          try {
            await client.mailboxRename(path, `${trashPrefix}/${path}`);
            deleted = true;
            break;
          } catch {}
        }
        try {
          await client.mailboxUnsubscribe(path);
          deleted = true;
        } catch {}
      }

      // Remove from in-memory cache
      folderRepo.delete(accountId, path);
      messageRepo.clearFolder(accountId, path);

      // Re-sync folders with IMAP
      const folders = await syncFolders(accountId);
      return { success: true, folders };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message || 'Impossibile eliminare la cartella IMAP' });
    }
  });
}

