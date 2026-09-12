import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { 
  accountRepo, 
  settingsRepo, 
  chatKeyRepo, 
  chatMessageRepo, 
  ChatMessage, 
  Account 
} from '../db/index.js';
import { broadcastToAccount, isAccountConnected } from '../imap/idle.js';

// Online user tracking in memory
const onlineAccounts = new Set<string>();

export function markUserOnline(accountId: string) {
  onlineAccounts.add(accountId);
  broadcastPresence(accountId, true);
}

export function markUserOffline(accountId: string) {
  if (!isAccountConnected(accountId)) {
    onlineAccounts.delete(accountId);
    broadcastPresence(accountId, false);
  }
}

export function isAccountOnline(accountId: string): boolean {
  return isAccountConnected(accountId) || onlineAccounts.has(accountId);
}

function broadcastPresence(accountId: string, isOnline: boolean) {
  const user = accountRepo.findById(accountId);
  if (!user) return;
  const settings = settingsRepo.get(accountId);
  const visibility = settings?.chat_visibility || 'same_domain';

  // If visibility is none, never broadcast online state
  if (visibility === 'none') return;

  const domain = user.email.split('@')[1] || '';
  const allAccounts = accountRepo.getAll();

  for (const target of allAccounts) {
    if (target.id === accountId) continue;
    const targetDomain = target.email.split('@')[1] || '';

    if (visibility === 'all' || (visibility === 'same_domain' && domain === targetDomain)) {
      broadcastToAccount(target.id, {
        type: 'CHAT_PRESENCE',
        userId: accountId,
        accountId,
        isOnline,
        timestamp: new Date().toISOString()
      });
    }
  }
}

export async function chatRoutes(app: FastifyInstance) {
  // 1. Get Discoverable Users for Chat
  app.get('/api/chat/users', async (req, reply) => {
    const { accountId } = req.query as { accountId?: string };
    if (!accountId) {
      return reply.status(400).send({ error: 'accountId è obbligatorio' });
    }

    const currentAccount = accountRepo.findById(accountId);
    if (!currentAccount) {
      return reply.status(404).send({ error: 'Account non trovato' });
    }

    const currentSettings = settingsRepo.get(accountId);
    const myVisibility = currentSettings?.chat_visibility || 'same_domain';
    const myDomain = currentAccount.email.split('@')[1] || '';

    const allAccounts = accountRepo.getAll();
    const discoverableUsers: Array<{
      id: string;
      email: string;
      displayName: string;
      isOnline: boolean;
      hasPublicKey: boolean;
      visibility: string;
      unreadCount: number;
    }> = [];

    // Also include anyone who has an existing conversation with me even if currently hidden
    const recentConvs = chatMessageRepo.getRecentConversations(accountId);
    const peerIdsWithDialog = new Set(recentConvs.map(c => c.peerId));

    for (const acc of allAccounts) {
      if (acc.id === accountId) continue;
      const targetSettings = settingsRepo.get(acc.id);
      const targetVis = targetSettings?.chat_visibility || 'same_domain';
      const targetDomain = acc.email.split('@')[1] || '';

      const hasActiveDialog = peerIdsWithDialog.has(acc.id);

      let isAllowed = false;

      if (hasActiveDialog) {
        isAllowed = true;
      } else if (targetVis === 'none') {
        isAllowed = false;
      } else if (targetVis === 'all') {
        isAllowed = true;
      } else if (targetVis === 'same_domain') {
        isAllowed = (myDomain === targetDomain);
      }

      if (isAllowed) {
        const key = chatKeyRepo.get(acc.id);
        const conv = recentConvs.find(c => c.peerId === acc.id);

        discoverableUsers.push({
          id: acc.id,
          email: acc.email,
          displayName: acc.display_name || acc.email.split('@')[0],
          isOnline: targetVis === 'none' ? false : isAccountOnline(acc.id),
          hasPublicKey: !!key,
          visibility: targetVis,
          unreadCount: conv?.unreadCount || 0
        });
      }
    }

    return {
      users: discoverableUsers,
      myVisibility
    };
  });

  // 2. Search user by exact email (for stealth/none or new peers)
  app.get('/api/chat/search', async (req, reply) => {
    const { email } = req.query as { email?: string };
    if (!email) return reply.status(400).send({ error: 'Email richiesta' });

    const acc = accountRepo.findByEmail(email.trim().toLowerCase());
    if (!acc) {
      return reply.status(404).send({ error: 'Nessun utente trovato con questo indirizzo su questa webmail' });
    }

    const key = chatKeyRepo.get(acc.id);
    return {
      user: {
        id: acc.id,
        email: acc.email,
        displayName: acc.display_name || acc.email.split('@')[0],
        hasPublicKey: !!key,
        isOnline: isAccountOnline(acc.id)
      }
    };
  });

  // 3. Get my own persistent keypair (private key + public key)
  app.get('/api/chat/keys/mine', async (req, reply) => {
    const { accountId } = req.query as { accountId?: string };
    if (!accountId) {
      return reply.status(400).send({ error: 'accountId è obbligatorio' });
    }
    const acc = accountRepo.findById(accountId);
    if (!acc) {
      return reply.status(404).send({ error: 'Account non trovato' });
    }

    const pair = await chatKeyRepo.getOrCreateKeypair(accountId);
    return {
      publicKeyJwk: pair.publicKeyJwk,
      privateKeyJwk: pair.privateKeyJwk
    };
  });

  // Get peer public key
  app.get('/api/chat/keys/:accountId', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const pair = await chatKeyRepo.getOrCreateKeypair(accountId);
    return { publicKeyJwk: pair.publicKeyJwk };
  });

  app.post('/api/chat/keys', async (req, reply) => {
    const body = req.body as { accountId: string; publicKeyJwk: string; privateKeyJwk?: string };
    if (!body || !body.accountId || !body.publicKeyJwk) {
      return reply.status(400).send({ error: 'accountId e publicKeyJwk sono obbligatori' });
    }

    const saved = chatKeyRepo.save(body.accountId, body.publicKeyJwk, body.privateKeyJwk);
    return { success: true, key: saved };
  });

  // 4. Send Message (Ciphertext only, E2EE)
  app.post('/api/chat/messages', async (req, reply) => {
    const body = req.body as {
      senderId?: string;
      accountId?: string;
      recipientId?: string;
      ciphertext?: string;
      iv?: string;
      expiresInSeconds?: number;
      expires_at?: number | string | null;
    };

    const senderId = body?.senderId || body?.accountId;
    const recipientId = body?.recipientId;

    if (!body || !senderId || !recipientId || !body.ciphertext || !body.iv) {
      return reply.status(400).send({ error: 'Dati messaggio non validi' });
    }

    let expiresAt: string | null = null;
    if (body.expiresInSeconds && body.expiresInSeconds > 0) {
      const exp = new Date(Date.now() + body.expiresInSeconds * 1000);
      expiresAt = exp.toISOString();
    } else if (body.expires_at) {
      if (body.expires_at === -1 || body.expires_at === '-1') {
        expiresAt = '-1';
      } else if (typeof body.expires_at === 'number' && body.expires_at > 0) {
        expiresAt = new Date(body.expires_at).toISOString();
      } else if (typeof body.expires_at === 'string') {
        expiresAt = body.expires_at;
      }
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      sender_id: senderId,
      recipient_id: recipientId,
      ciphertext: body.ciphertext,
      iv: body.iv,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };

    const saved = chatMessageRepo.create(message);

    // If recipient is online, mark delivered
    const isRecipientOnline = isAccountOnline(recipientId);
    if (isRecipientOnline) {
      chatMessageRepo.markDelivered(recipientId, senderId);
      saved.delivered_at = new Date().toISOString();
    }

    // Push to recipient
    broadcastToAccount(recipientId, {
      type: 'CHAT_MESSAGE',
      message: saved
    });

    // Push to sender (other tabs)
    broadcastToAccount(senderId, {
      type: 'CHAT_SENT',
      message: saved
    });

    return { success: true, message: saved };
  });

  // 5. Get Dialog Messages
  app.get('/api/chat/messages/:peerId', async (req, reply) => {
    const { peerId } = req.params as { peerId: string };
    const { accountId, limit } = req.query as { accountId?: string; limit?: string };

    if (!accountId) {
      return reply.status(400).send({ error: 'accountId richiesto' });
    }

    const messages = chatMessageRepo.getDialog(accountId, peerId, Number(limit) || 100);
    return { messages };
  });

  // 6. Mark Read
  app.post('/api/chat/messages/read', async (req, reply) => {
    const body = req.body as { accountId?: string; userId?: string; peerId?: string };
    const accountId = body?.accountId || body?.userId;
    const peerId = body?.peerId;
    if (!body || !accountId || !peerId) {
      return reply.status(400).send({ error: 'accountId e peerId richiesti' });
    }

    chatMessageRepo.markRead(accountId, peerId);

    const readAt = new Date().toISOString();

    // Notify sender that messages were read
    broadcastToAccount(peerId, {
      type: 'CHAT_ACK',
      senderId: peerId,
      readBy: accountId,
      readAt
    });

    return { success: true };
  });

  // 7. Delete Message (Burn immediately)
  app.delete('/api/chat/messages/:messageId', async (req, reply) => {
    const { messageId } = req.params as { messageId: string };
    const { accountId, peerId } = req.query as { accountId?: string; peerId?: string };

    if (!accountId) return reply.status(400).send({ error: 'accountId richiesto' });

    const deleted = chatMessageRepo.deleteMessage(messageId, accountId);

    if (deleted && peerId) {
      broadcastToAccount(peerId, {
        type: 'CHAT_DELETE',
        messageId,
        deletedBy: accountId
      });
      broadcastToAccount(accountId, {
        type: 'CHAT_DELETE',
        messageId,
        deletedBy: accountId
      });
    }

    return { success: deleted };
  });

  // 8. Typing indicator signal
  app.post('/api/chat/typing', async (req, reply) => {
    const body = req.body as { senderId?: string; accountId?: string; recipientId: string; isTyping: boolean };
    const senderId = body?.senderId || body?.accountId;
    if (!body || !senderId || !body.recipientId) {
      return reply.status(400).send({ error: 'Parametri non validi' });
    }

    broadcastToAccount(body.recipientId, {
      type: 'CHAT_TYPING',
      senderId: senderId,
      isTyping: !!body.isTyping
    });

    return { success: true };
  });

  // 9. Update Chat Visibility Preference
  app.post('/api/chat/visibility', async (req, reply) => {
    const body = req.body as { accountId: string; visibility: 'same_domain' | 'all' | 'none' };
    if (!body || !body.accountId || !body.visibility) {
      return reply.status(400).send({ error: 'accountId e visibility richiesti' });
    }

    const account = accountRepo.findById(body.accountId);
    if (!account) {
      return reply.status(404).send({ error: 'Account non trovato' });
    }

    const updated = settingsRepo.upsert({
      account_id: body.accountId,
      chat_visibility: body.visibility
    });

    // Broadcast presence update according to new visibility
    if (body.visibility === 'none') {
      broadcastPresence(body.accountId, false);
    } else {
      broadcastPresence(body.accountId, isAccountOnline(body.accountId));
    }

    return { success: true, settings: updated };
  });
}
