import { getConnectedImapClient } from './client.js';
import { folderRepo, messageRepo, contactRepo, settingsRepo, blockedSenderRepo, Folder, Message, Account } from '../db/index.js';
import { parseRawEmail } from '../utils/parser.js';

export async function syncFolders(accountId: string): Promise<Folder[]> {
  const client = await getConnectedImapClient(accountId);
  const list = await client.list();

  const folders: Folder[] = [];

  for (const item of list) {
    let specialUse = item.specialUse ? item.specialUse.replace('\\', '').toLowerCase() : null;
    const isTrashChild = /^(deleted items|trash|cestino)\//i.test(item.path);
    if (isTrashChild) {
      specialUse = 'trash_child';
    }

    const folder: Folder = {
      id: `${accountId}_${Buffer.from(item.path).toString('base64url')}`,
      account_id: accountId,
      path: item.path,
      name: item.name,
      delimiter: item.delimiter,
      special_use: specialUse,
      total_messages: 0,
      unread_messages: 0,
      uid_validity: 0,
      uid_next: 0
    };

    // Get mailbox status if selectable
    if (!item.flags || !item.flags.has('\\Noselect')) {
      try {
        const status = await client.status(item.path, { messages: true, unseen: true, uidNext: true, uidValidity: true });
        folder.total_messages = status.messages || 0;
        folder.unread_messages = status.unseen || 0;
        folder.uid_validity = Number(status.uidValidity) || 0;
        folder.uid_next = Number(status.uidNext) || 0;
      } catch (e) {
        // Status may fail on non-selectable folders
      }
    }

    folders.push(folder);
  }

  // Update in-memory storage completely so removed folders do not linger
  folderRepo.setAll(accountId, folders);

  return folderRepo.getAllByAccount(accountId);
}

export async function syncFolderMessages(
  accountId: string,
  folderPath: string,
  limit = 50,
  offset = 0
): Promise<{ count: number; newMessages: number; total: number; hasMore: boolean }> {
  const client = await getConnectedImapClient(accountId);
  const lock = await client.getMailboxLock(folderPath);

  try {
    const mailbox = client.mailbox;
    if (!mailbox) {
      return { count: 0, newMessages: 0, total: 0, hasMore: false };
    }

    const totalExists = typeof mailbox.exists === 'number' ? mailbox.exists : 0;
    const unseenCount = typeof mailbox.unseen === 'number' ? mailbox.unseen : 0;

    // Always update folder counts in RAM, even if empty
    folderRepo.updateCounts(
      accountId,
      folderPath,
      totalExists,
      unseenCount
    );

    if (offset === 0) {
      messageRepo.clearFolder(accountId, folderPath);
    }

    if (totalExists === 0) {
      return { count: 0, newMessages: 0, total: 0, hasMore: false };
    }

    // Fetch the range from the mailbox based on offset & limit
    const endSeq = Math.max(1, mailbox.exists - offset);
    const startSeq = Math.max(1, endSeq - limit + 1);
    const range = `${startSeq}:${endSeq}`;

    let processedCount = 0;
    let newCount = 0;

    // Fast envelope fetch
    const messagesToFetch: any[] = [];
    if (mailbox.exists > 0 && endSeq >= startSeq) {
      for await (const msg of client.fetch(range, {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
        size: true
      })) {
        messagesToFetch.push(msg);
      }
    }

    if (offset === 0) {
      messageRepo.clearFolder(accountId, folderPath);
    }

    for (const item of messagesToFetch) {
      processedCount++;
      const existing = messageRepo.getByUid(accountId, folderPath, item.uid);
      const isRead = item.flags.has('\\Seen') ? 1 : 0;
      const isStarred = item.flags.has('\\Flagged') ? 1 : 0;
      const isAnswered = item.flags.has('\\Answered') ? 1 : 0;
      const isDraft = item.flags.has('\\Draft') ? 1 : 0;

      const fromObj = item.envelope.from?.[0];
      const fromName = fromObj?.name || fromObj?.address || 'Sconosciuto';
      const fromAddress = fromObj?.address || '';

      const toList = (item.envelope.to || []).map((t: any) => ({ name: t.name, address: t.address }));
      const ccList = (item.envelope.cc || []).map((t: any) => ({ name: t.name, address: t.address }));

      // Spam check if folder is not already spam or trash
      const isFolderSpamOrTrash = /junk|spam|trash|cestino|indesiderat/i.test(folderPath);
      if (!isFolderSpamOrTrash && fromAddress) {
        const settings = settingsRepo.get(accountId);
        const isSpamEnabled = settings ? settings.spam_filter_enabled !== 0 : true;
        if (isSpamEnabled && blockedSenderRepo.isBlocked(accountId, fromAddress)) {
          const accountFolders = folderRepo.getAllByAccount(accountId);
          const junkFolder = accountFolders.find(
            f => f.special_use === 'junk' || /junk|spam|indesiderat/i.test(f.name) || /junk|spam/i.test(f.path)
          );
          if (junkFolder && junkFolder.path !== folderPath) {
            client.messageMove(String(item.uid), junkFolder.path, { uid: true }).catch(err => {
              console.warn(`[Spam Auto-Move] Failed to move message ${item.uid} to ${junkFolder.path}:`, err);
            });
            continue;
          }
        }
      }

      // Save contact (only for non-spam senders)
      if (fromAddress) {
        contactRepo.recordContact(accountId, fromAddress, fromName);
      }

      const hasAttachments = item.bodyStructure?.childNodes?.some((node: any) => 
        node.disposition === 'attachment' || Boolean(node.parameters?.name)
      ) || false;

      const messageRecord: Message = {
        id: `${accountId}_${Buffer.from(folderPath).toString('base64url')}_${item.uid}`,
        account_id: accountId,
        folder_path: folderPath,
        uid: item.uid,
        message_id: item.envelope.messageId,
        in_reply_to: item.envelope.inReplyTo,
        subject: item.envelope.subject || '(Nessun oggetto)',
        from_name: fromName,
        from_address: fromAddress,
        to_addresses: JSON.stringify(toList),
        cc_addresses: JSON.stringify(ccList),
        bcc_addresses: JSON.stringify([]),
        date: item.envelope.date ? item.envelope.date.toISOString() : new Date().toISOString(),
        flags: JSON.stringify(Array.from(item.flags)),
        is_read: isRead,
        is_starred: isStarred,
        is_answered: isAnswered,
        is_forwarded: 0,
        is_draft: isDraft,
        preview_snippet: existing?.preview_snippet || '',
        has_attachments: hasAttachments ? 1 : 0,
        size: item.size || 0,
        body_html: existing?.body_html,
        body_text: existing?.body_text
      };

      if (!existing) {
        newCount++;
      }

      messageRepo.upsert(messageRecord);
    }

    return { count: processedCount, newMessages: newCount, total: mailbox.exists, hasMore: startSeq > 1 };
  } finally {
    lock.release();
  }
}

export async function fetchFullMessage(
  accountId: string,
  folderPath: string,
  uid: number,
  forceRefresh = false
): Promise<Message | null> {
  const cached = messageRepo.getByUid(accountId, folderPath, uid);
  // Return cached only if not forced and does not contain stale un-replaced cid: references
  if (!forceRefresh && cached && cached.body_html) {
    if (!/src\s*=\s*["']?cid:/i.test(cached.body_html) && !/url\(\s*["']?cid:/i.test(cached.body_html)) {
      return cached;
    }
  }

  const client = await getConnectedImapClient(accountId);
  const lock = await client.getMailboxLock(folderPath);

  try {
    const downloaded = await client.download(String(uid), undefined, { uid: true });
    if (!downloaded || !downloaded.content) {
      return cached;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of downloaded.content) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawBuffer = Buffer.concat(chunks);

    const parsed = await parseRawEmail(rawBuffer);

    const updated: Message = {
      ...(cached || {
        id: `${accountId}_${Buffer.from(folderPath).toString('base64url')}_${uid}`,
        account_id: accountId,
        folder_path: folderPath,
        uid: uid,
        is_read: 1,
        is_starred: 0,
        is_answered: 0,
        is_forwarded: 0,
        is_draft: 0,
        size: rawBuffer.length
      }),
      subject: parsed.subject,
      from_name: parsed.fromName,
      from_address: parsed.fromAddress,
      to_addresses: JSON.stringify(parsed.toAddresses),
      cc_addresses: JSON.stringify(parsed.ccAddresses),
      bcc_addresses: JSON.stringify(parsed.bccAddresses),
      date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
      preview_snippet: parsed.previewSnippet,
      has_attachments: parsed.hasAttachments ? 1 : 0,
      body_html: parsed.html,
      body_text: parsed.text,
      attachments: (parsed.attachments || []).map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        contentId: att.contentId
      }))
    };

    messageRepo.upsert(updated);
    return messageRepo.getByUid(accountId, folderPath, uid);
  } finally {
    lock.release();
  }
}

export async function downloadMessageAttachment(
  accountId: string,
  folderPath: string,
  uid: number,
  attachmentFilename: string
): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  const client = await getConnectedImapClient(accountId);
  const lock = await client.getMailboxLock(folderPath);

  try {
    const downloaded = await client.download(String(uid), undefined, { uid: true });
    if (!downloaded || !downloaded.content) return null;

    const chunks: Buffer[] = [];
    for await (const chunk of downloaded.content) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawBuffer = Buffer.concat(chunks);
    const { simpleParser } = await import('mailparser');
    const parsed = await simpleParser(rawBuffer);

    const match = (parsed.attachments || []).find(
      (a: any) => a.filename === attachmentFilename || a.cid === attachmentFilename
    );

    if (match) {
      return {
        buffer: match.content,
        contentType: match.contentType,
        filename: match.filename || 'attachment'
      };
    }
    return null;
  } finally {
    lock.release();
  }
}
