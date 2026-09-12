import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const db = new Database(config.dbPath);

// Enable WAL mode for ultra-fast concurrent reads/writes and performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

// Initialize schema
export function initDatabase() {
  // Ensure no email data is stored in SQL - drop any legacy tables
  try {
    db.exec(`
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS attachments;
      DROP TABLE IF EXISTS folders;
    `);
  } catch (e) {
    console.warn('Drop legacy tables error:', e);
  }

  let schemaSql = '';
  const localSchemaPath = path.join(__dirname, 'schema.sql');
  const srcSchemaPath = path.join(process.cwd(), 'server/db/schema.sql');

  if (fs.existsSync(localSchemaPath)) {
    schemaSql = fs.readFileSync(localSchemaPath, 'utf8');
  } else if (fs.existsSync(srcSchemaPath)) {
    schemaSql = fs.readFileSync(srcSchemaPath, 'utf8');
  }

  if (schemaSql) {
    db.exec(schemaSql);
    try {
      db.exec(`ALTER TABLE user_settings ADD COLUMN spam_filter_enabled INTEGER NOT NULL DEFAULT 1;`);
    } catch {}
    try {
      db.exec(`ALTER TABLE user_settings ADD COLUMN chat_visibility TEXT NOT NULL DEFAULT 'same_domain';`);
    } catch {}
    try {
      db.exec(`ALTER TABLE contacts ADD COLUMN phone TEXT;`);
    } catch {}
    try {
      db.exec(`ALTER TABLE contacts ADD COLUMN company TEXT;`);
    } catch {}
    try {
      db.exec(`ALTER TABLE contacts ADD COLUMN notes TEXT;`);
    } catch {}
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS blocked_senders (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            pattern TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
            UNIQUE(account_id, pattern)
        );
        CREATE INDEX IF NOT EXISTS idx_blocked_senders ON blocked_senders(account_id, pattern);

        CREATE TABLE IF NOT EXISTS chat_public_keys (
            account_id TEXT PRIMARY KEY,
            public_key_jwk TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            recipient_id TEXT NOT NULL,
            ciphertext TEXT NOT NULL,
            iv TEXT NOT NULL,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            delivered_at DATETIME,
            read_at DATETIME,
            FOREIGN KEY(sender_id) REFERENCES accounts(id) ON DELETE CASCADE,
            FOREIGN KEY(recipient_id) REFERENCES accounts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_chat_dialog ON chat_messages(sender_id, recipient_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_chat_expires ON chat_messages(expires_at);
      `);
    } catch {}
    try {
      db.exec('ALTER TABLE chat_public_keys ADD COLUMN encrypted_private_key TEXT;');
    } catch {}
    console.log('✅ SQLite Database initialized successfully (only accounts, user_settings & spam rules in SQL) at', config.dbPath);
  } else {
    console.warn('⚠️ schema.sql not found at', localSchemaPath, 'or', srcSchemaPath);
  }
}

// User Settings Interface
export interface UserSettings {
  account_id: string;
  theme: 'light' | 'dark' | 'system';
  accent_color: string;
  language: string;
  density: 'compact' | 'normal' | 'relaxed';
  reading_pane: 'right' | 'bottom' | 'off';
  focused_inbox: number;
  block_external_images: number;
  signature_html: string;
  signature_enabled: number;
  swipe_right_action: 'archive' | 'delete' | 'read' | 'flag';
  swipe_left_action: 'read' | 'delete' | 'archive' | 'flag';
  auto_refresh_seconds: number;
  notifications_enabled: number;
  spam_filter_enabled?: number;
  chat_visibility?: 'same_domain' | 'all' | 'none';
  updated_at?: string;
}

// Account Interface
export interface Account {
  id: string;
  email: string;
  display_name: string;
  imap_host: string;
  imap_port: number;
  imap_secure: number;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: number;
  username: string;
  password_encrypted: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

// Folder Interface
export interface Folder {
  id: string;
  account_id: string;
  path: string;
  name: string;
  delimiter: string;
  special_use?: string | null;
  total_messages: number;
  unread_messages: number;
  uid_validity: number;
  uid_next: number;
  updated_at?: string;
}

// Message Interface
export interface Message {
  id: string;
  account_id: string;
  folder_path: string;
  uid: number;
  message_id?: string;
  thread_id?: string;
  in_reply_to?: string;
  subject?: string;
  from_name?: string;
  from_address?: string;
  to_addresses?: string; // JSON
  cc_addresses?: string; // JSON
  bcc_addresses?: string; // JSON
  reply_to_addresses?: string;
  date?: string;
  flags?: string; // JSON
  is_read: number;
  is_starred: number;
  is_answered: number;
  is_forwarded: number;
  is_draft: number;
  preview_snippet?: string;
  has_attachments: number;
  size: number;
  body_html?: string;
  body_text?: string;
  attachments?: Array<{ filename: string; contentType: string; size: number; contentId?: string; disposition?: string }>;
  created_at?: string;
}

// Attachments Interface
export interface Attachment {
  id: string;
  message_id: string;
  account_id: string;
  part_id?: string;
  filename: string;
  content_type: string;
  size: number;
  content_id?: string;
  disposition?: string;
}

// Contact Interface
export interface Contact {
  id: string;
  account_id: string;
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  frequency: number;
  last_contacted_at?: string;
}

// DB Helpers for Settings
export const settingsRepo = {
  get(accountId: string): UserSettings | null {
    const stmt = db.prepare('SELECT * FROM user_settings WHERE account_id = ?');
    return (stmt.get(accountId) as UserSettings) || null;
  },

  upsert(settings: Partial<UserSettings> & { account_id: string }): UserSettings {
    const current = settingsRepo.get(settings.account_id);
    if (!current) {
      const stmt = db.prepare(`
        INSERT INTO user_settings (
          account_id, theme, accent_color, language, density, reading_pane,
          focused_inbox, block_external_images, signature_html, signature_enabled,
          swipe_right_action, swipe_left_action, auto_refresh_seconds, notifications_enabled,
          spam_filter_enabled, chat_visibility
        ) VALUES (
          @account_id, 
          COALESCE(@theme, 'system'), 
          COALESCE(@accent_color, 'blue'), 
          COALESCE(@language, 'it'), 
          COALESCE(@density, 'normal'), 
          COALESCE(@reading_pane, 'right'),
          COALESCE(@focused_inbox, 1), 
          COALESCE(@block_external_images, 1), 
          COALESCE(@signature_html, ''), 
          COALESCE(@signature_enabled, 1),
          COALESCE(@swipe_right_action, 'delete'), 
          COALESCE(@swipe_left_action, 'read'), 
          COALESCE(@auto_refresh_seconds, 60), 
          COALESCE(@notifications_enabled, 1),
          COALESCE(@spam_filter_enabled, 1),
          COALESCE(@chat_visibility, 'same_domain')
        )
      `);
      stmt.run({
        account_id: settings.account_id,
        theme: settings.theme || null,
        accent_color: settings.accent_color || null,
        language: settings.language || null,
        density: settings.density || null,
        reading_pane: settings.reading_pane || null,
        focused_inbox: settings.focused_inbox !== undefined ? settings.focused_inbox : null,
        block_external_images: settings.block_external_images !== undefined ? settings.block_external_images : null,
        signature_html: settings.signature_html !== undefined ? settings.signature_html : null,
        signature_enabled: settings.signature_enabled !== undefined ? settings.signature_enabled : null,
        swipe_right_action: settings.swipe_right_action || null,
        swipe_left_action: settings.swipe_left_action || null,
        auto_refresh_seconds: settings.auto_refresh_seconds !== undefined ? settings.auto_refresh_seconds : null,
        notifications_enabled: settings.notifications_enabled !== undefined ? settings.notifications_enabled : null,
        spam_filter_enabled: settings.spam_filter_enabled !== undefined ? settings.spam_filter_enabled : null,
        chat_visibility: settings.chat_visibility || null,
      });
    } else {
      const merged = { ...current, ...settings, updated_at: new Date().toISOString() };
      const stmt = db.prepare(`
        UPDATE user_settings SET
          theme = @theme,
          accent_color = @accent_color,
          language = @language,
          density = @density,
          reading_pane = @reading_pane,
          focused_inbox = @focused_inbox,
          block_external_images = @block_external_images,
          signature_html = @signature_html,
          signature_enabled = @signature_enabled,
          swipe_right_action = @swipe_right_action,
          swipe_left_action = @swipe_left_action,
          auto_refresh_seconds = @auto_refresh_seconds,
          notifications_enabled = @notifications_enabled,
          spam_filter_enabled = @spam_filter_enabled,
          chat_visibility = COALESCE(@chat_visibility, chat_visibility),
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = @account_id
      `);
      stmt.run(merged);
    }
    return settingsRepo.get(settings.account_id)!;
  }
};

// DB Helpers for Accounts
export const accountRepo = {
  findById(id: string): Account | null {
    const stmt = db.prepare('SELECT * FROM accounts WHERE id = ?');
    return (stmt.get(id) as Account) || null;
  },

  findByEmail(email: string): Account | null {
    const stmt = db.prepare('SELECT * FROM accounts WHERE email = ?');
    return (stmt.get(email) as Account) || null;
  },

  getAll(): Account[] {
    const stmt = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC');
    return stmt.all() as Account[];
  },

  create(account: Account): Account {
    const stmt = db.prepare(`
      INSERT INTO accounts (
        id, email, display_name, imap_host, imap_port, imap_secure,
        smtp_host, smtp_port, smtp_secure, username, password_encrypted, is_active
      ) VALUES (
        @id, @email, @display_name, @imap_host, @imap_port, @imap_secure,
        @smtp_host, @smtp_port, @smtp_secure, @username, @password_encrypted, @is_active
      )
    `);
    stmt.run(account);
    // Initialize default settings for this account
    settingsRepo.upsert({ account_id: account.id });
    return account;
  },

  update(id: string, updates: Partial<Account>): Account | null {
    const current = accountRepo.findById(id);
    if (!current) return null;
    const merged = { ...current, ...updates, updated_at: new Date().toISOString() };
    const stmt = db.prepare(`
      UPDATE accounts SET
        email = @email,
        display_name = @display_name,
        imap_host = @imap_host,
        imap_port = @imap_port,
        imap_secure = @imap_secure,
        smtp_host = @smtp_host,
        smtp_port = @smtp_port,
        smtp_secure = @smtp_secure,
        username = @username,
        password_encrypted = @password_encrypted,
        is_active = @is_active,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    stmt.run(merged);
    return accountRepo.findById(id);
  },

  delete(id: string) {
    const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
    stmt.run(id);
  }
};

// In-Memory Storage for Folders (RAM only - NOT in SQL)
const inMemoryFolders = new Map<string, Folder[]>();

export const folderRepo = {
  getAllByAccount(accountId: string): Folder[] {
    return inMemoryFolders.get(accountId) || [];
  },

  upsert(folder: Folder) {
    let list = inMemoryFolders.get(folder.account_id);
    if (!list) {
      list = [];
      inMemoryFolders.set(folder.account_id, list);
    }
    const idx = list.findIndex(f => f.path === folder.path);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...folder };
    } else {
      list.push(folder);
    }
  },

  updateCounts(accountId: string, path: string, total: number, unread: number) {
    const list = inMemoryFolders.get(accountId) || [];
    const target = list.find(f => f.path === path);
    if (target) {
      target.total_messages = total;
      target.unread_messages = unread;
    }
  },

  clear(accountId: string) {
    inMemoryFolders.delete(accountId);
  },

  setAll(accountId: string, folders: Folder[]) {
    inMemoryFolders.set(accountId, [...folders]);
  },

  delete(accountId: string, path: string) {
    const list = inMemoryFolders.get(accountId);
    if (list) {
      inMemoryFolders.set(accountId, list.filter(f => f.path !== path));
    }
  }
};

// In-Memory Storage for Messages (RAM only - NEVER saved to SQLite database)
const inMemoryMessages = new Map<string, Message>(); // key: `${accountId}:${folderPath}:${uid}`
const inMemoryFolderUids = new Map<string, number[]>(); // key: `${accountId}:${folderPath}` -> ordered UIDs

export const messageRepo = {
  getByFolder(accountId: string, folderPath: string, limit = 100, offset = 0, filter?: string): Message[] {
    const folderKey = `${accountId}:${folderPath}`;
    const uids = inMemoryFolderUids.get(folderKey) || [];
    const list: Message[] = [];
    for (const uid of uids) {
      const msg = inMemoryMessages.get(`${folderKey}:${uid}`);
      if (!msg) continue;
      if (filter === 'unread' && msg.is_read !== 0) continue;
      if (filter === 'starred' && msg.is_starred !== 1) continue;
      if (filter === 'attachments' && msg.has_attachments !== 1) continue;
      list.push(msg);
    }
    return list.slice(offset, offset + limit);
  },

  search(accountId: string, searchTerm: string, limit = 50): Message[] {
    const term = searchTerm.toLowerCase();
    const results: Message[] = [];
    for (const [key, msg] of inMemoryMessages.entries()) {
      if (!key.startsWith(`${accountId}:`)) continue;
      if (
        (msg.subject && msg.subject.toLowerCase().includes(term)) ||
        (msg.from_name && msg.from_name.toLowerCase().includes(term)) ||
        (msg.from_address && msg.from_address.toLowerCase().includes(term)) ||
        (msg.preview_snippet && msg.preview_snippet.toLowerCase().includes(term)) ||
        (msg.to_addresses && msg.to_addresses.toLowerCase().includes(term))
      ) {
        results.push(msg);
        if (results.length >= limit) break;
      }
    }
    return results;
  },

  getById(id: string): Message | null {
    for (const msg of inMemoryMessages.values()) {
      if (msg.id === id) return msg;
    }
    return null;
  },

  getByUid(accountId: string, folderPath: string, uid: number): Message | null {
    return inMemoryMessages.get(`${accountId}:${folderPath}:${uid}`) || null;
  },

  upsert(msg: Message) {
    const folderKey = `${msg.account_id}:${msg.folder_path}`;
    const msgKey = `${folderKey}:${msg.uid}`;
    const existing = inMemoryMessages.get(msgKey);
    const merged: Message = {
      ...existing,
      ...msg,
      flags: msg.flags || existing?.flags || '[]',
      is_read: msg.is_read ?? existing?.is_read ?? 0,
      is_starred: msg.is_starred ?? existing?.is_starred ?? 0,
      body_html: msg.body_html || existing?.body_html,
      body_text: msg.body_text || existing?.body_text
    };
    inMemoryMessages.set(msgKey, merged);

    let uids = inMemoryFolderUids.get(folderKey);
    if (!uids) {
      uids = [];
      inMemoryFolderUids.set(folderKey, uids);
    }
    if (!uids.includes(msg.uid)) {
      uids.push(msg.uid);
      // Sort desc by date or uid
      uids.sort((a, b) => b - a);
    }
  },

  updateFlags(accountId: string, folderPath: string, uid: number, isRead?: number, isStarred?: number) {
    const msgKey = `${accountId}:${folderPath}:${uid}`;
    const current = inMemoryMessages.get(msgKey);
    if (!current) return;
    if (isRead !== undefined) current.is_read = isRead;
    if (isStarred !== undefined) current.is_starred = isStarred;
  },

  deleteByUid(accountId: string, folderPath: string, uid: number) {
    const folderKey = `${accountId}:${folderPath}`;
    const msgKey = `${folderKey}:${uid}`;
    inMemoryMessages.delete(msgKey);
    const uids = inMemoryFolderUids.get(folderKey);
    if (uids) {
      const idx = uids.indexOf(uid);
      if (idx !== -1) uids.splice(idx, 1);
    }
  },

  clearFolder(accountId: string, folderPath: string) {
    const folderKey = `${accountId}:${folderPath}`;
    const uids = inMemoryFolderUids.get(folderKey) || [];
    for (const uid of uids) {
      inMemoryMessages.delete(`${folderKey}:${uid}`);
    }
    inMemoryFolderUids.delete(folderKey);
  },

  clearAccount(accountId: string) {
    for (const key of Array.from(inMemoryFolderUids.keys())) {
      if (key.startsWith(`${accountId}:`)) {
        inMemoryFolderUids.delete(key);
      }
    }
    for (const key of Array.from(inMemoryMessages.keys())) {
      if (key.startsWith(`${accountId}:`)) {
        inMemoryMessages.delete(key);
      }
    }
  },

  getAllAddressesForAccount(accountId: string): Array<{ name?: string; email: string }> {
    const list: Array<{ name?: string; email: string }> = [];
    const seen = new Set<string>();

    for (const [key, msg] of inMemoryMessages.entries()) {
      if (key.startsWith(`${accountId}:`)) {
        if (msg.from_address && !seen.has(msg.from_address.toLowerCase())) {
          seen.add(msg.from_address.toLowerCase());
          list.push({ name: msg.from_name, email: msg.from_address });
        }
        try {
          const to = JSON.parse(msg.to_addresses || '[]');
          for (const item of to) {
            if (item.address && !seen.has(item.address.toLowerCase())) {
              seen.add(item.address.toLowerCase());
              list.push({ name: item.name, email: item.address });
            }
          }
        } catch {}
        try {
          const cc = JSON.parse(msg.cc_addresses || '[]');
          for (const item of cc) {
            if (item.address && !seen.has(item.address.toLowerCase())) {
              seen.add(item.address.toLowerCase());
              list.push({ name: item.name, email: item.address });
            }
          }
        } catch {}
      }
    }
    return list;
  }
};


export const contactRepo = {
  getAll(accountId: string, search?: string): Contact[] {
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      const stmt = db.prepare(`
        SELECT * FROM contacts
        WHERE account_id = ? AND (
          LOWER(COALESCE(name, '')) LIKE ? OR
          LOWER(email) LIKE ? OR
          LOWER(COALESCE(company, '')) LIKE ? OR
          LOWER(COALESCE(phone, '')) LIKE ?
        )
        ORDER BY name COLLATE NOCASE ASC, email ASC
      `);
      return stmt.all(accountId, q, q, q, q) as Contact[];
    }
    const stmt = db.prepare('SELECT * FROM contacts WHERE account_id = ? ORDER BY name COLLATE NOCASE ASC, email ASC');
    return stmt.all(accountId) as Contact[];
  },

  getById(accountId: string, id: string): Contact | null {
    const stmt = db.prepare('SELECT * FROM contacts WHERE account_id = ? AND id = ?');
    return (stmt.get(accountId, id) as Contact) || null;
  },

  upsert(accountId: string, c: { id?: string; name?: string; email: string; phone?: string; company?: string; notes?: string }): Contact | null {
    if (!c.email || !c.email.includes('@')) return null;
    const cleanEmail = c.email.trim().toLowerCase();
    const id = c.id || `${accountId}_${Buffer.from(cleanEmail).toString('base64url')}`;
    const stmt = db.prepare(`
      INSERT INTO contacts (id, account_id, name, email, phone, company, notes, frequency, last_contacted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(account_id, email) DO UPDATE SET
        name = COALESCE(excluded.name, contacts.name),
        phone = COALESCE(excluded.phone, contacts.phone),
        company = COALESCE(excluded.company, contacts.company),
        notes = COALESCE(excluded.notes, contacts.notes),
        last_contacted_at = CURRENT_TIMESTAMP
    `);
    stmt.run(id, accountId, c.name ? c.name.trim() : null, cleanEmail, c.phone || null, c.company || null, c.notes || null);
    return contactRepo.getById(accountId, id);
  },

  batchUpsert(accountId: string, contacts: Array<{ name?: string; email: string; phone?: string; company?: string; notes?: string }>): number {
    const valid = contacts.filter(c => c && c.email && c.email.includes('@'));
    if (valid.length === 0) return 0;

    const stmt = db.prepare(`
      INSERT INTO contacts (id, account_id, name, email, phone, company, notes, frequency, last_contacted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(account_id, email) DO UPDATE SET
        name = CASE WHEN excluded.name IS NOT NULL AND excluded.name != '' THEN excluded.name ELSE contacts.name END,
        phone = COALESCE(excluded.phone, contacts.phone),
        company = COALESCE(excluded.company, contacts.company),
        notes = COALESCE(excluded.notes, contacts.notes)
    `);

    const insertMany = db.transaction((items: typeof valid) => {
      let count = 0;
      for (const item of items) {
        const cleanEmail = item.email.trim().toLowerCase();
        const id = `${accountId}_${Buffer.from(cleanEmail).toString('base64url')}`;
        stmt.run(id, accountId, item.name ? item.name.trim() : null, cleanEmail, item.phone || null, item.company || null, item.notes || null);
        count++;
      }
      return count;
    });

    return insertMany(valid);
  },

  delete(accountId: string, id: string): boolean {
    const stmt = db.prepare('DELETE FROM contacts WHERE account_id = ? AND id = ?');
    const res = stmt.run(accountId, id);
    return res.changes > 0;
  },

  clearAll(accountId: string): boolean {
    const stmt = db.prepare('DELETE FROM contacts WHERE account_id = ?');
    const res = stmt.run(accountId);
    return res.changes > 0;
  },

  recordContact(accountId: string, email: string, name?: string) {
    if (!email || !email.includes('@')) return;
    const cleanEmail = email.trim().toLowerCase();
    const stmt = db.prepare(`
      INSERT INTO contacts (id, account_id, name, email, frequency, last_contacted_at)
      VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(account_id, email) DO UPDATE SET
        name = COALESCE(?, contacts.name),
        frequency = contacts.frequency + 1,
        last_contacted_at = CURRENT_TIMESTAMP
    `);
    const id = `${accountId}_${Buffer.from(cleanEmail).toString('base64url')}`;
    stmt.run(id, accountId, name ? name.trim() : '', cleanEmail, name ? name.trim() : null);
  }
};

export interface BlockedSender {
  id: string;
  account_id: string;
  pattern: string;
  created_at?: string;
}

export const blockedSenderRepo = {
  getAll(accountId: string): BlockedSender[] {
    const stmt = db.prepare('SELECT * FROM blocked_senders WHERE account_id = ? ORDER BY created_at DESC');
    return stmt.all(accountId) as BlockedSender[];
  },

  add(accountId: string, rawPattern: string): BlockedSender | null {
    if (!rawPattern || !rawPattern.trim()) return null;
    let pattern = rawPattern.trim().toLowerCase();
    const id = `${accountId}_${Buffer.from(pattern).toString('base64url')}`;
    const stmt = db.prepare(`
      INSERT INTO blocked_senders (id, account_id, pattern, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(account_id, pattern) DO UPDATE SET created_at = CURRENT_TIMESTAMP
    `);
    stmt.run(id, accountId, pattern);
    const getStmt = db.prepare('SELECT * FROM blocked_senders WHERE id = ?');
    return (getStmt.get(id) as BlockedSender) || null;
  },

  remove(accountId: string, idOrPattern: string): boolean {
    const stmt = db.prepare('DELETE FROM blocked_senders WHERE account_id = ? AND (id = ? OR pattern = ?)');
    const res = stmt.run(accountId, idOrPattern, idOrPattern.toLowerCase());
    return res.changes > 0;
  },

  isBlocked(accountId: string, fromAddress?: string): boolean {
    if (!fromAddress) return false;
    const addr = fromAddress.trim().toLowerCase();
    const atIdx = addr.indexOf('@');
    const domain = atIdx !== -1 ? addr.slice(atIdx + 1) : '';

    const stmt = db.prepare('SELECT pattern FROM blocked_senders WHERE account_id = ?');
    const patterns = stmt.all(accountId) as Array<{ pattern: string }>;

    for (const { pattern } of patterns) {
      const p = pattern.toLowerCase();
      // Exact email match
      if (p === addr) return true;
      // Domain match: e.g. "@bad.com" or "bad.com"
      if (domain) {
        const cleanP = p.replace(/^@/, '');
        if (cleanP === domain || domain.endsWith(`.${cleanP}`)) return true;
      }
    }
    return false;
  }
};

// ==========================================
// CryptoChat E2EE Repositories & Types
// ==========================================

export interface ChatPublicKey {
  account_id: string;
  public_key_jwk: string;
  encrypted_private_key?: string | null;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  ciphertext: string;
  iv: string;
  expires_at?: string | null;
  created_at?: string;
  delivered_at?: string | null;
  read_at?: string | null;
}

export const chatKeyRepo = {
  get(accountId: string): ChatPublicKey | null {
    const stmt = db.prepare('SELECT * FROM chat_public_keys WHERE account_id = ?');
    return (stmt.get(accountId) as ChatPublicKey) || null;
  },

  async getOrCreateKeypair(accountId: string): Promise<{ publicKeyJwk: string; privateKeyJwk: string }> {
    const existing = chatKeyRepo.get(accountId);
    if (existing && existing.encrypted_private_key && existing.public_key_jwk) {
      try {
        const decryptedPrivStr = decrypt(existing.encrypted_private_key);
        if (decryptedPrivStr) {
          return {
            publicKeyJwk: existing.public_key_jwk,
            privateKeyJwk: decryptedPrivStr
          };
        }
      } catch (err) {
        console.warn('Failed to decrypt stored private key, generating new pair for:', accountId, err);
      }
    }

    // Generate stable ECDH P-256 key pair
    const { subtle } = crypto.webcrypto;
    const keyPair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );

    const pubJwk = await subtle.exportKey('jwk', keyPair.publicKey);
    const privJwk = await subtle.exportKey('jwk', keyPair.privateKey);

    const pubJwkStr = JSON.stringify(pubJwk);
    const privJwkStr = JSON.stringify(privJwk);
    const encryptedPriv = encrypt(privJwkStr);

    const stmt = db.prepare(`
      INSERT INTO chat_public_keys (account_id, public_key_jwk, encrypted_private_key, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(account_id) DO UPDATE SET 
        public_key_jwk = excluded.public_key_jwk,
        encrypted_private_key = excluded.encrypted_private_key,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(accountId, pubJwkStr, encryptedPriv);

    return {
      publicKeyJwk: pubJwkStr,
      privateKeyJwk: privJwkStr
    };
  },

  save(accountId: string, publicKeyJwk: string, privateKeyJwk?: string): ChatPublicKey {
    const encryptedPriv = privateKeyJwk ? encrypt(privateKeyJwk) : null;
    const stmt = db.prepare(`
      INSERT INTO chat_public_keys (account_id, public_key_jwk, encrypted_private_key, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(account_id) DO UPDATE SET 
        public_key_jwk = excluded.public_key_jwk,
        encrypted_private_key = COALESCE(excluded.encrypted_private_key, chat_public_keys.encrypted_private_key),
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(accountId, publicKeyJwk, encryptedPriv);
    return chatKeyRepo.get(accountId)!;
  }
};

export const chatMessageRepo = {
  create(msg: ChatMessage): ChatMessage {
    const stmt = db.prepare(`
      INSERT INTO chat_messages (id, sender_id, recipient_id, ciphertext, iv, expires_at, created_at)
      VALUES (@id, @sender_id, @recipient_id, @ciphertext, @iv, @expires_at, COALESCE(@created_at, CURRENT_TIMESTAMP))
    `);
    stmt.run({
      id: msg.id,
      sender_id: msg.sender_id,
      recipient_id: msg.recipient_id,
      ciphertext: msg.ciphertext,
      iv: msg.iv,
      expires_at: msg.expires_at || null,
      created_at: msg.created_at || null
    });
    const getStmt = db.prepare('SELECT * FROM chat_messages WHERE id = ?');
    return getStmt.get(msg.id) as ChatMessage;
  },

  getDialog(userA: string, userB: string, limit = 100): ChatMessage[] {
    chatMessageRepo.purgeExpired();
    const stmt = db.prepare(`
      SELECT * FROM chat_messages
      WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
        AND (expires_at IS NULL OR expires_at = '-1' OR expires_at = -1 OR datetime(expires_at) > datetime('now'))
      ORDER BY created_at ASC
      LIMIT ?
    `);
    return stmt.all(userA, userB, userB, userA, limit) as ChatMessage[];
  },

  markDelivered(recipientId: string, senderId: string): void {
    const stmt = db.prepare(`
      UPDATE chat_messages
      SET delivered_at = CURRENT_TIMESTAMP
      WHERE recipient_id = ? AND sender_id = ? AND delivered_at IS NULL
    `);
    stmt.run(recipientId, senderId);
  },

  markRead(recipientId: string, senderId: string): void {
    const stmt = db.prepare(`
      UPDATE chat_messages
      SET read_at = CURRENT_TIMESTAMP, delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
      WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL
    `);
    stmt.run(recipientId, senderId);
  },

  deleteMessage(id: string, accountId: string): boolean {
    const stmt = db.prepare('DELETE FROM chat_messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?)');
    const res = stmt.run(id, accountId, accountId);
    return res.changes > 0;
  },

  getUnreadCount(recipientId: string): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM chat_messages
      WHERE recipient_id = ? AND read_at IS NULL
        AND (expires_at IS NULL OR expires_at = '-1' OR expires_at = -1 OR datetime(expires_at) > datetime('now'))
    `);
    const row = stmt.get(recipientId) as { count: number };
    return row?.count || 0;
  },

  getRecentConversations(accountId: string): Array<{ peerId: string; lastMessage: ChatMessage; unreadCount: number }> {
    chatMessageRepo.purgeExpired();
    const stmt = db.prepare(`
      SELECT DISTINCT 
        CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as peer_id
      FROM chat_messages
      WHERE sender_id = ? OR recipient_id = ?
    `);
    const rows = stmt.all(accountId, accountId, accountId) as Array<{ peer_id: string }>;
    const results: Array<{ peerId: string; lastMessage: ChatMessage; unreadCount: number }> = [];

    const lastMsgStmt = db.prepare(`
      SELECT * FROM chat_messages
      WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
        AND (expires_at IS NULL OR expires_at = '-1' OR expires_at = -1 OR datetime(expires_at) > datetime('now'))
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const unreadStmt = db.prepare(`
      SELECT COUNT(*) as count FROM chat_messages
      WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL
        AND (expires_at IS NULL OR expires_at = '-1' OR expires_at = -1 OR datetime(expires_at) > datetime('now'))
    `);

    for (const { peer_id } of rows) {
      const lastMsg = lastMsgStmt.get(accountId, peer_id, peer_id, accountId) as ChatMessage;
      if (lastMsg) {
        const unread = unreadStmt.get(peer_id, accountId) as { count: number };
        results.push({
          peerId: peer_id,
          lastMessage: lastMsg,
          unreadCount: unread?.count || 0
        });
      }
    }

    return results.sort((a, b) => new Date(b.lastMessage.created_at || 0).getTime() - new Date(a.lastMessage.created_at || 0).getTime());
  },

  purgeExpired(): number {
    try {
      const stmt = db.prepare(`
        DELETE FROM chat_messages
        WHERE expires_at IS NOT NULL 
          AND expires_at != '-1' 
          AND expires_at != -1 
          AND datetime(expires_at) <= datetime('now')
      `);
      const res = stmt.run();
      return res.changes;
    } catch {
      return 0;
    }
  }
};

// Periodic purge of burned/expired ephemeral messages every 60 seconds
setInterval(() => {
  chatMessageRepo.purgeExpired();
}, 60000).unref();


