import { ImapFlow, ImapFlowOptions } from 'imapflow';
import { Account, accountRepo } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';

// Cache active IMAP client connections per account
const activeClients = new Map<string, ImapFlow>();

export function createImapClient(account: Account): ImapFlow {
  const password = decrypt(account.password_encrypted);

  const opts: ImapFlowOptions = {
    host: account.imap_host,
    port: account.imap_port,
    secure: account.imap_secure === 1,
    auth: {
      user: account.username || account.email,
      pass: password
    },
    logger: false,
    tls: {
      rejectUnauthorized: false // Allow custom SSL certificates commonly used in self-hosted mail
    },
    clientInfo: {
      name: 'Outlook-Webmail-Chetta',
      version: '1.0.0'
    }
  };

  const client = new ImapFlow(opts);

  client.on('error', (err) => {
    console.error(`[IMAP Error] Account ${account.email}:`, err.message);
  });

  client.on('close', () => {
    activeClients.delete(account.id);
  });

  return client;
}

export async function getConnectedImapClient(accountId: string): Promise<ImapFlow> {
  let client = activeClients.get(accountId);

  if (client && client.usable) {
    return client;
  }

  const account = accountRepo.findById(accountId);
  if (!account) {
    throw new Error('Account non trovato nel database');
  }

  client = createImapClient(account);
  try {
    await client.connect();
    activeClients.set(accountId, client);
    return client;
  } catch (error: any) {
    // If connection failed due to TLS mismatch, attempt fallback with secure: 0
    if (account.imap_secure === 1 && (error.message.includes('SSL') || error.message.includes('tls') || error.message.includes('packet length'))) {
      console.log(`[IMAP] Retrying with STARTTLS/secure:false for ${account.email}...`);
      accountRepo.update(accountId, { imap_secure: 0 });
      const updatedAccount = accountRepo.findById(accountId)!;
      const fallbackClient = createImapClient(updatedAccount);
      await fallbackClient.connect();
      activeClients.set(accountId, fallbackClient);
      return fallbackClient;
    }
    throw error;
  }
}

export async function closeImapClient(accountId: string): Promise<void> {
  const client = activeClients.get(accountId);
  if (client) {
    try {
      await client.logout();
    } catch (e) {
      // ignore logout errors
    }
    activeClients.delete(accountId);
  }
}

export async function testImapConnection(config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}): Promise<{ success: boolean; error?: string; detectedSecure?: boolean; detectedPort?: number }> {
  const isTlsMismatch = (msg: string) => {
    const lower = (msg || '').toLowerCase();
    return (
      lower.includes('ssl') ||
      lower.includes('tls') ||
      lower.includes('wrong version number') ||
      lower.includes('packet length') ||
      lower.includes('record') ||
      lower.includes('alert')
    );
  };

  const attempt = async (port: number, secure: boolean, userToTry: string = config.user) => {
    const client = new ImapFlow({
      host: config.host,
      port,
      secure,
      auth: {
        user: userToTry,
        pass: config.pass
      },
      logger: false,
      tls: { rejectUnauthorized: false }
    });

    // Prevent unhandled error events from crashing the process on socket timeout
    client.on('error', () => {});

    try {
      await client.connect();
      await client.logout();
      return { success: true, secure, port, user: userToTry };
    } catch (err: any) {
      const errMsg = err.responseText || err.message || 'Errore di connessione';
      const isAuthFail = !!err.authenticationFailed || errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('authenticate');
      return { success: false, error: errMsg, secure, port, isAuthFail, isTls: isTlsMismatch(errMsg) };
    }
  };

  // Attempt 1: original configuration
  let res = await attempt(config.port, config.secure);
  if (res.success) {
    return { success: true, detectedSecure: config.secure, detectedPort: config.port };
  }

  // If initial connection had TLS mismatch (e.g. port 993 is configured as plaintext / STARTTLS)
  if (config.secure && res.isTls) {
    console.log(`[Auto-Detect] Host ${config.host}:${config.port} sent non-TLS greeting. Attempting STARTTLS/plain on same port...`);
    const fallbackRes = await attempt(config.port, false);
    if (fallbackRes.success) {
      return { success: true, detectedSecure: false, detectedPort: config.port };
    }

    // If port 993 plaintext also failed, try standard IMAP port 143
    if (config.port !== 143) {
      console.log(`[Auto-Detect] Trying standard IMAP port 143...`);
      const port143Res = await attempt(143, false);
      if (port143Res.success) {
        return { success: true, detectedSecure: false, detectedPort: 143 };
      }
      if (port143Res.isAuthFail) {
        return { success: false, error: port143Res.error, detectedSecure: false, detectedPort: 143 };
      }
    }

    if (fallbackRes.isAuthFail) {
      return { success: false, error: fallbackRes.error, detectedSecure: false, detectedPort: config.port };
    }
  }

  // If port 993 failed without TLS flag, test port 143 as standard fallback
  if (config.port === 993) {
    console.log(`[Auto-Detect] Trying standard IMAP port 143...`);
    const port143Res = await attempt(143, false);
    if (port143Res.success) {
      return { success: true, detectedSecure: false, detectedPort: 143 };
    }
    if (port143Res.isAuthFail) {
      return { success: false, error: port143Res.error, detectedSecure: false, detectedPort: 143 };
    }
  }

  return { success: false, error: res.error || 'Impossibile connettersi al server IMAP' };
}
