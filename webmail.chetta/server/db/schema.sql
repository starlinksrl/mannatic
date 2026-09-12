-- Schema SQL per Webmail: persistenza account e impostazioni utente
-- NOTA: Le email NON vengono salvate nel database SQL, ma gestite direttamente via IMAP e cache in memoria (RAM).

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    imap_host TEXT NOT NULL,
    imap_port INTEGER NOT NULL DEFAULT 993,
    imap_secure INTEGER NOT NULL DEFAULT 1,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 465,
    smtp_secure INTEGER NOT NULL DEFAULT 1,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
    account_id TEXT PRIMARY KEY,
    theme TEXT NOT NULL DEFAULT 'system',
    accent_color TEXT NOT NULL DEFAULT 'blue',
    language TEXT NOT NULL DEFAULT 'it',
    density TEXT NOT NULL DEFAULT 'normal',
    reading_pane TEXT NOT NULL DEFAULT 'right',
    focused_inbox INTEGER NOT NULL DEFAULT 1,
    block_external_images INTEGER NOT NULL DEFAULT 1,
    signature_html TEXT DEFAULT '',
    signature_enabled INTEGER NOT NULL DEFAULT 1,
    swipe_right_action TEXT NOT NULL DEFAULT 'delete',
    swipe_left_action TEXT NOT NULL DEFAULT 'read',
    auto_refresh_seconds INTEGER NOT NULL DEFAULT 60,
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    spam_filter_enabled INTEGER NOT NULL DEFAULT 1,
    chat_visibility TEXT NOT NULL DEFAULT 'same_domain', -- 'same_domain' | 'all' | 'none'
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    notes TEXT,
    frequency INTEGER DEFAULT 1,
    last_contacted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    UNIQUE(account_id, email)
);

CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id, frequency DESC);

CREATE TABLE IF NOT EXISTS blocked_senders (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    pattern TEXT NOT NULL, -- es. 'spammer@bad.com' o '@dominio.com' o 'dominio.com'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    UNIQUE(account_id, pattern)
);

CREATE INDEX IF NOT EXISTS idx_blocked_senders ON blocked_senders(account_id, pattern);

-- Chiavi WebCrypto ECDH per crittografia End-to-End (Zero-Knowledge, sincronizzate per account)
CREATE TABLE IF NOT EXISTS chat_public_keys (
    account_id TEXT PRIMARY KEY,
    public_key_jwk TEXT NOT NULL,
    encrypted_private_key TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Messaggi di chat (salvati solo come ciphertext + IV; il server non possiede le chiavi di decifratura)
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    expires_at DATETIME, -- Per messaggi con timer di autodistruzione
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivered_at DATETIME,
    read_at DATETIME,
    FOREIGN KEY(sender_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(recipient_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_dialog ON chat_messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_expires ON chat_messages(expires_at);



