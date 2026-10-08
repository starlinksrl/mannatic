import { FastifyInstance } from 'fastify';
import { blockedSenderRepo, folderRepo, messageRepo } from '../db/index.js';
import { getConnectedImapClient } from '../imap/client.js';

export async function spamRoutes(app: FastifyInstance) {
  // Get all blocked senders/domains for an account
  app.get('/api/spam/:accountId/blocked', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const blocked = blockedSenderRepo.getAll(accountId);
    return { blocked };
  });

  // Block a sender or domain pattern
  app.post('/api/spam/:accountId/block', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const body = req.body as {
      pattern: string;
      moveUid?: number;
      folderPath?: string;
    };

    if (!body.pattern || !body.pattern.trim()) {
      return reply.status(400).send({ error: 'Indirizzo o dominio non valido' });
    }

    const rule = blockedSenderRepo.add(accountId, body.pattern);

    let moved = false;
    // If a specific message was open when blocking, move it to Junk immediately
    if (body.moveUid && body.folderPath) {
      try {
        const folders = folderRepo.getAllByAccount(accountId);
        const junkFolder = folders.find(
          f => f.special_use === 'junk' || /junk|spam|indesiderat/i.test(f.name) || /junk|spam/i.test(f.path)
        );

        if (junkFolder && junkFolder.path !== body.folderPath) {
          messageRepo.deleteByUid(accountId, body.folderPath, body.moveUid);

          const client = await getConnectedImapClient(accountId);
          const lock = await client.getMailboxLock(body.folderPath);
          try {
            await client.messageMove(String(body.moveUid), junkFolder.path, { uid: true });
            moved = true;
          } finally {
            lock.release();
          }
        }
      } catch (err) {
        console.warn('[Block Sender Move Error]', err);
      }
    }

    return { success: true, rule, moved };
  });

  // Unblock a sender or domain pattern
  app.delete('/api/spam/:accountId/block/:id', async (req, reply) => {
    const { accountId, id } = req.params as { accountId: string; id: string };
    const success = blockedSenderRepo.remove(accountId, id);
    return { success };
  });
}
