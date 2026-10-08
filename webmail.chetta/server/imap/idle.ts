import { WebSocket } from 'ws';
import { getConnectedImapClient } from './client.js';
import { syncFolderMessages, syncFolders } from './sync.js';

// Connected client sockets for push notifications
const subscribers = new Map<string, Set<WebSocket>>();

export function registerSocket(accountId: string, ws: WebSocket) {
  if (!subscribers.has(accountId)) {
    subscribers.set(accountId, new Set());
  }
  subscribers.get(accountId)!.add(ws);

  ws.on('close', () => {
    const list = subscribers.get(accountId);
    if (list) {
      list.delete(ws);
      if (list.size === 0) {
        subscribers.delete(accountId);
      }
    }
  });

  // Start IDLE listener if not already running
  startIdleListener(accountId).catch((err) => {
    console.warn(`[IDLE] Could not start IDLE for account ${accountId}:`, err.message);
  });
}

export function isAccountConnected(accountId: string): boolean {
  const list = subscribers.get(accountId);
  return !!list && list.size > 0;
}

export function broadcastToAccount(accountId: string, data: any) {
  const list = subscribers.get(accountId);
  if (!list) return;

  const payload = JSON.stringify(data);
  for (const client of list) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

const activeIdleAccounts = new Set<string>();

export async function startIdleListener(accountId: string) {
  if (activeIdleAccounts.has(accountId)) return;
  activeIdleAccounts.add(accountId);

  try {
    const client = await getConnectedImapClient(accountId);

    client.on('exists', async (data) => {
      console.log(`[IMAP IDLE] New message event on account ${accountId}:`, data);
      try {
        await syncFolderMessages(accountId, 'INBOX', 10);
        await syncFolders(accountId);
        broadcastToAccount(accountId, {
          type: 'MAIL_UPDATE',
          folder: 'INBOX',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('[IDLE Sync Error]', err);
      }
    });

    client.on('flags', async (data) => {
      broadcastToAccount(accountId, {
        type: 'FLAGS_UPDATE',
        data,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error: any) {
    activeIdleAccounts.delete(accountId);
    console.warn(`[IDLE Init Warning] ${accountId}: ${error.message}`);
  }
}
