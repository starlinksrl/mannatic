import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { accountRepo, settingsRepo, Account, folderRepo, messageRepo } from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { testImapConnection, closeImapClient } from '../imap/client.js';
import { syncFolders } from '../imap/sync.js';

export async function authRoutes(app: FastifyInstance) {
  // Get active accounts
  app.get('/api/accounts', async (req, reply) => {
    const accounts = accountRepo.getAll().map(acc => ({
      id: acc.id,
      email: acc.email,
      displayName: acc.display_name,
      imapHost: acc.imap_host,
      imapPort: acc.imap_port,
      smtpHost: acc.smtp_host,
      smtpPort: acc.smtp_port,
      isActive: acc.is_active
    }));
    return { accounts };
  });

  // Login or Add Account Handler
  const loginHandler = async (req: any, reply: any) => {
    const body = req.body as {
      email: string;
      password: string;
      displayName?: string;
      display_name?: string;
      imapHost?: string;
      imapPort?: number;
      imapSecure?: boolean;
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
      username?: string;
      imap?: {
        host?: string;
        port?: number;
        security?: 'auto' | 'ssl' | 'starttls';
      };
      smtp?: {
        host?: string;
        port?: number;
        security?: 'auto' | 'ssl' | 'starttls';
      };
    };

    if (!body || !body.email || !body.password) {
      return reply.status(400).send({ error: 'Email e password sono obbligatorie' });
    }

    const email = body.email.trim().toLowerCase();
    const domain = email.split('@')[1] || '';
    const displayName = body.displayName || body.display_name || email.split('@')[0];

    // Resolve IMAP config
    let imapHost = (body.imapHost || body.imap?.host || '').trim();
    if (!imapHost || imapHost === 'mail' || imapHost === 'mail.' || !imapHost.includes('.')) {
      imapHost = domain ? `mail.${domain}` : `mail.${email.split('@')[1] || ''}`;
    } else if (imapHost.endsWith('.')) {
      imapHost = imapHost.slice(0, -1);
    }
    if (domain.endsWith('.it') && !imapHost.endsWith('.it')) {
      imapHost = `mail.${domain}`;
    }
    if (domain === 'chetta.it') {
      imapHost = 'mail.chetta.it';
    }

    let imapPort = Number(body.imapPort || body.imap?.port || (domain === 'chetta.it' ? 143 : 993));
    let imapSecure = true;
    if (body.imapSecure !== undefined) {
      imapSecure = Boolean(body.imapSecure);
    } else if (body.imap?.security) {
      if (body.imap.security === 'ssl') imapSecure = true;
      else if (body.imap.security === 'starttls') imapSecure = false;
      else imapSecure = (imapPort === 993 && domain !== 'chetta.it');
    } else {
      imapSecure = (imapPort === 993 && domain !== 'chetta.it');
    }

    // Resolve SMTP config
    let smtpHost = (body.smtpHost || body.smtp?.host || '').trim();
    if (!smtpHost || smtpHost === 'mail' || smtpHost === 'mail.' || !smtpHost.includes('.')) {
      smtpHost = domain ? `mail.${domain}` : `mail.${email.split('@')[1] || ''}`;
    } else if (smtpHost.endsWith('.')) {
      smtpHost = smtpHost.slice(0, -1);
    }
    if (domain.endsWith('.it') && !smtpHost.endsWith('.it')) {
      smtpHost = `mail.${domain}`;
    }
    if (domain === 'chetta.it') {
      smtpHost = 'mail.chetta.it';
    }

    let smtpPort = Number(body.smtpPort || body.smtp?.port || (domain === 'gmail.com' ? 465 : 587));
    let smtpSecure = false;
    if (body.smtpSecure !== undefined) {
      smtpSecure = Boolean(body.smtpSecure);
    } else if (body.smtp?.security) {
      if (body.smtp.security === 'ssl') smtpSecure = true;
      else if (body.smtp.security === 'starttls') smtpSecure = false;
      else smtpSecure = (smtpPort === 465);
    } else {
      smtpSecure = (smtpPort === 465);
    }
    const username = body.username || email;

    // Test IMAP Connection
    const testResult = await testImapConnection({
      host: imapHost,
      port: imapPort,
      secure: imapSecure,
      user: username,
      pass: body.password
    });

    if (!testResult.success) {
      return reply.status(401).send({
        error: `Connessione IMAP fallita: ${testResult.error || 'Verifica credenziali, server o porte'}`
      });
    }

    if (testResult.detectedSecure !== undefined) {
      imapSecure = testResult.detectedSecure;
    }
    if (testResult.detectedPort !== undefined) {
      imapPort = testResult.detectedPort;
    }

    // Save or update account in SQLite
    let existing = accountRepo.findByEmail(email);
    let accountId = existing?.id;

    if (!existing) {
      accountId = crypto.randomUUID();
      const newAcc: Account = {
        id: accountId,
        email,
        display_name: displayName,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_secure: imapSecure ? 1 : 0,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: smtpSecure ? 1 : 0,
        username,
        password_encrypted: encrypt(body.password),
        is_active: 1
      };
      accountRepo.create(newAcc);
    } else {
      accountRepo.update(existing.id, {
        display_name: displayName,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_secure: imapSecure ? 1 : 0,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: smtpSecure ? 1 : 0,
        username,
        password_encrypted: encrypt(body.password),
        is_active: 1
      });
    }

    // Sync folders in background
    syncFolders(accountId!).catch(e => console.error('[Background Initial Sync Error]', e));

    const settings = settingsRepo.get(accountId!);

    return {
      success: true,
      account: {
        id: accountId,
        email,
        displayName,
        imapHost,
        imapPort,
        smtpHost,
        smtpPort,
        isActive: 1
      },
      settings
    };
  };

  app.post('/api/auth/login', loginHandler);
  app.post('/api/accounts/login', loginHandler);

  // Logout account (closes IMAP connection and clears RAM, preserves account in database)
  app.post('/api/accounts/:id/logout', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      await closeImapClient(id);
    } catch (e) {
      console.warn('[Logout IMAP close warning]', e);
    }
    folderRepo.clear(id);
    messageRepo.clearAccount(id);
    return { success: true };
  });

  // Delete account (synonym for logout/removal)
  app.delete('/api/accounts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      await closeImapClient(id);
    } catch (e) {
      console.warn('[Delete account IMAP close warning]', e);
    }
    folderRepo.clear(id);
    messageRepo.clearAccount(id);
    accountRepo.delete(id);
    return { success: true };
  });
}
