export interface Account {
  id: string;
  email: string;
  displayName: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  isActive: number;
}

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
}

export interface Folder {
  id: string;
  account_id: string;
  path: string;
  name: string;
  delimiter: string;
  special_use?: string | null;
  total_messages: number;
  unread_messages: number;
}

export interface EmailAddress {
  name?: string;
  address?: string;
}

export interface MessageItem {
  id: string;
  account_id: string;
  folder_path: string;
  uid: number;
  message_id?: string;
  subject: string;
  from_name: string;
  from_address: string;
  to_addresses: string; // JSON string
  cc_addresses?: string;
  bcc_addresses?: string;
  date: string;
  flags: string; // JSON string
  is_read: number;
  is_starred: number;
  is_answered: number;
  is_forwarded: number;
  is_draft: number;
  preview_snippet: string;
  has_attachments: number;
  size: number;
  body_html?: string;
  body_text?: string;
  raw_has_external_images?: boolean;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    contentId?: string;
  }>;
}

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

export interface BlockedSender {
  id: string;
  account_id: string;
  pattern: string;
  created_at?: string;
}

export type ChatVisibility = 'same_domain' | 'all' | 'none';

export interface ChatUser {
  id: string;
  email: string;
  displayName: string;
  domain: string;
  isOnline: boolean;
  chatVisibility: ChatVisibility;
  unreadCount: number;
  lastActivity?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  ciphertext: string;
  iv: string;
  expires_at: number | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  decryptedText?: string;
  isMine?: boolean;
}


