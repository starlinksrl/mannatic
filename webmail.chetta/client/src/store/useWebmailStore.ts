import { create } from 'zustand';
import { Account, UserSettings, Folder, MessageItem, Contact, BlockedSender, ChatUser, ChatMessage, ChatVisibility } from '../types/index.js';
import { getOrCreateKeyPair, deriveSharedAesKey, encryptMessage, decryptMessage } from '../utils/cryptoChat.js';

interface WebmailState {
  // Accounts
  accounts: Account[];
  activeAccount: Account | null;
  setAccounts: (accounts: Account[]) => void;
  setActiveAccount: (account: Account | null) => void;

  // Settings
  settings: UserSettings | null;
  setSettings: (settings: UserSettings) => void;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;

  // Spam & Blocked Senders
  blockedSenders: BlockedSender[];
  fetchBlockedSenders: () => Promise<void>;
  blockSender: (pattern: string, moveUid?: number, folderPath?: string) => Promise<boolean>;
  unblockSender: (id: string) => Promise<boolean>;

  // Folders
  folders: Folder[];
  activeFolder: string;
  setFolders: (folders: Folder[]) => void;
  setActiveFolder: (folderPath: string) => void;
  refreshFolders: (sync?: boolean) => Promise<void>;
  createFolder: (path: string) => Promise<{ success: boolean; error?: string }>;
  deleteFolder: (path: string) => Promise<{ success: boolean; error?: string }>;

  // Messages
  messages: MessageItem[];
  selectedMessage: MessageItem | null;
  selectedUids: number[];
  filterTab: 'focused' | 'other';
  messageFilter: 'all' | 'unread' | 'starred' | 'attachments';
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  totalMessages: number;
  setFilterTab: (tab: 'focused' | 'other') => void;
  setMessageFilter: (filter: 'all' | 'unread' | 'starred' | 'attachments') => void;
  setSelectedMessage: (msg: MessageItem | null) => void;
  toggleSelectUid: (uid: number) => void;
  selectAllUids: () => void;
  clearSelection: () => void;
  loadMessages: (sync?: boolean) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  loadMessageDetail: (uid: number, allowImages?: boolean) => Promise<void>;

  // Actions on Messages
  markRead: (uids: number[], isRead: boolean) => Promise<void>;
  toggleStar: (uid: number) => Promise<void>;
  deleteMessages: (uids: number[]) => Promise<void>;
  moveMessages: (uids: number[], destinationFolder: string) => Promise<void>;

  // Search
  searchQuery: string;
  searchResults: MessageItem[];
  isSearching: boolean;
  setSearchQuery: (query: string) => void;
  executeSearch: (query: string) => Promise<void>;

  // Mobile navigation
  mobileView: 'folders' | 'mail_list' | 'mail_detail' | 'search' | 'settings';
  setMobileView: (view: 'folders' | 'mail_list' | 'mail_detail' | 'search' | 'settings') => void;

  // Compose Modal
  isComposeOpen: boolean;
  composeDraft: {
    draftUid?: number;
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    inReplyTo?: string;
    references?: string;
  } | null;
  openCompose: (draft?: any) => void;
  closeCompose: () => void;
  saveDraft: (draftData: any) => Promise<number | undefined>;

  // Empty Folder
  emptyFolder: (folderPath: string) => Promise<void>;

  // Audio / Push
  playChimeSound: () => void;

  // App Switcher (Mail vs Contacts vs Chat)
  currentApp: 'mail' | 'contacts' | 'chat';
  setCurrentApp: (app: 'mail' | 'contacts' | 'chat') => void;

  // CryptoChat
  chatUsers: ChatUser[];
  activeChatPeer: ChatUser | null;
  chatMessages: ChatMessage[];
  chatTypingPeers: Record<string, boolean>;
  chatUnreadTotal: number;
  chatBurnTimer: number;
  chatSearchQuery: string;
  chatSearchResults: ChatUser[];
  isChatLoading: boolean;
  initChatKeys: () => Promise<void>;
  loadChatUsers: () => Promise<void>;
  searchChatUsers: (query: string) => Promise<void>;
  setActiveChatPeer: (peer: ChatUser | null) => Promise<void>;
  sendChatMessage: (text: string) => Promise<boolean>;
  deleteChatMessage: (messageId: string) => Promise<boolean>;
  sendChatTyping: (isTyping: boolean) => Promise<void>;
  setChatVisibility: (visibility: ChatVisibility) => Promise<boolean>;
  setChatBurnTimer: (timer: number) => void;
  setChatSearchQuery: (query: string) => void;
  handleIncomingChatMessage: (rawMsg: any) => Promise<void>;
  handleChatTypingEvent: (senderId: string, isTyping: boolean) => void;
  handleChatPresenceEvent: (userId: string, isOnline: boolean) => void;
  refreshCurrentChatDialog: () => Promise<void>;
  handleChatReadByEvent: (readBy: string, readAt: string) => void;
  handleChatAckEvent: (messageId: string, status: 'delivered' | 'read', timestamp: string) => void;
  handleChatDeleteEvent: (messageId: string) => void;

  // Settings Modal & Login
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isLoginOpen: boolean;
  setIsLoginOpen: (open: boolean) => void;

  // Contacts
  contacts: Contact[];
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null) => void;
  isImportContactsOpen: boolean;
  setIsImportContactsOpen: (open: boolean) => void;
  contactsSearchQuery: string;
  setContactsSearchQuery: (query: string) => void;
  loadContacts: (search?: string) => Promise<void>;
  saveContact: (contact: Partial<Contact>) => Promise<boolean>;
  deleteContact: (id: string) => Promise<boolean>;
  importContacts: (input: { text?: string; contacts?: any[] }) => Promise<number>;
  extractContactsFromMail: () => Promise<number>;

  // Logout
  logout: (accountId?: string) => Promise<void>;
}

export const useWebmailStore = create<WebmailState>((set, get) => ({
  accounts: [],
  activeAccount: null,
  setAccounts: (accounts) => set({ accounts }),
  setActiveAccount: (account) => {
    set({ activeAccount: account, messages: [], selectedMessage: null, selectedUids: [] });
    if (account) {
      localStorage.setItem('cryptomail_active_account_id', account.id);
      get().refreshFolders();
      get().loadMessages(true);
      get().loadContacts();
      get().fetchBlockedSenders();
      get().initChatKeys();
      get().loadChatUsers();
      // Fetch settings from SQL
      fetch(`/api/settings/${account.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.settings) set({ settings: data.settings });
        })
        .catch(console.error);
    } else {
      localStorage.removeItem('cryptomail_active_account_id');
    }
  },

  settings: null,
  setSettings: (settings) => set({ settings }),
  updateSettings: async (updates) => {
    const { activeAccount, settings } = get();
    if (!activeAccount) return;

    try {
      const res = await fetch(`/api/settings/${activeAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.settings) {
        set({ settings: data.settings });
        // Apply theme immediately
        if (data.settings.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (data.settings.theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    } catch (e) {
      console.error('Failed to save settings to SQL', e);
    }
  },

  blockedSenders: [],
  fetchBlockedSenders: async () => {
    const { activeAccount } = get();
    if (!activeAccount) return;
    try {
      const res = await fetch(`/api/spam/${activeAccount.id}/blocked`);
      const data = await res.json();
      if (data.blocked) set({ blockedSenders: data.blocked });
    } catch (e) {
      console.error('Fetch blocked senders failed', e);
    }
  },

  blockSender: async (pattern, moveUid, folderPath) => {
    const { activeAccount, fetchBlockedSenders, loadMessages, refreshFolders } = get();
    if (!activeAccount || !pattern) return false;
    try {
      const res = await fetch(`/api/spam/${activeAccount.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern, moveUid, folderPath })
      });
      const data = await res.json();
      if (data.success) {
        await fetchBlockedSenders();
        if (data.moved) {
          loadMessages(false);
          refreshFolders();
          set({ selectedMessage: null });
        }
        return true;
      }
    } catch (e) {
      console.error('Block sender failed', e);
    }
    return false;
  },

  unblockSender: async (id) => {
    const { activeAccount, fetchBlockedSenders } = get();
    if (!activeAccount) return false;
    try {
      const res = await fetch(`/api/spam/${activeAccount.id}/block/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await fetchBlockedSenders();
        return true;
      }
    } catch (e) {
      console.error('Unblock sender failed', e);
    }
    return false;
  },

  folders: [],
  activeFolder: 'INBOX',
  setFolders: (folders) => set({ folders }),
  setActiveFolder: (activeFolder) => {
    set({ activeFolder, selectedMessage: null, selectedUids: [], mobileView: 'mail_list' });
    get().loadMessages(false);
  },
  refreshFolders: async (sync = false) => {
    const { activeAccount } = get();
    if (!activeAccount) return;
    try {
      const res = await fetch(`/api/folders/${activeAccount.id}${sync ? '?sync=true' : ''}`);
      const data = await res.json();
      if (data.folders) set({ folders: data.folders });
    } catch (e) {
      console.error('Error fetching folders', e);
    }
  },

  messages: [],
  selectedMessage: null,
  selectedUids: [],
  filterTab: 'focused',
  messageFilter: 'all',
  isLoadingMessages: false,
  isLoadingMore: false,
  hasMoreMessages: false,
  totalMessages: 0,
  setFilterTab: (filterTab) => set({ filterTab }),
  setMessageFilter: (messageFilter) => {
    set({ messageFilter });
    get().loadMessages(false);
  },
  setSelectedMessage: (selectedMessage) => set({ selectedMessage }),
  toggleSelectUid: (uid) => {
    const { selectedUids } = get();
    if (selectedUids.includes(uid)) {
      set({ selectedUids: selectedUids.filter(id => id !== uid) });
    } else {
      set({ selectedUids: [...selectedUids, uid] });
    }
  },
  selectAllUids: () => {
    const { messages } = get();
    set({ selectedUids: messages.map(m => m.uid) });
  },
  clearSelection: () => set({ selectedUids: [] }),

  loadMessages: async (sync = false) => {
    const { activeAccount, activeFolder, messageFilter } = get();
    if (!activeAccount) return;

    set({ isLoadingMessages: true });
    try {
      const url = `/api/mail/${activeAccount.id}/folder?folder=${encodeURIComponent(activeFolder)}&filter=${messageFilter}&sync=${sync}&limit=50&offset=0`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.messages) {
        const total = data.total ?? data.messages.length;
        const unread = data.messages.filter((m: any) => !m.is_read).length;
        set((state) => ({
          messages: data.messages,
          hasMoreMessages: !!data.hasMore,
          totalMessages: total,
          folders: state.folders.map(f => {
            if (f.path === activeFolder) {
              return { ...f, total_messages: total, unread_messages: unread };
            }
            return f;
          })
        }));
      }
    } catch (err) {
      console.error('Error loading messages', err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  loadMoreMessages: async () => {
    const { activeAccount, activeFolder, messageFilter, messages, isLoadingMore, hasMoreMessages } = get();
    if (!activeAccount || isLoadingMore || !hasMoreMessages) return;

    set({ isLoadingMore: true });
    try {
      const offset = messages.length;
      const url = `/api/mail/${activeAccount.id}/folder?folder=${encodeURIComponent(activeFolder)}&filter=${messageFilter}&offset=${offset}&limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        const existingUids = new Set(messages.map(m => m.uid));
        const newOnes = data.messages.filter((m: any) => !existingUids.has(m.uid));
        set({
          messages: [...messages, ...newOnes],
          hasMoreMessages: !!data.hasMore,
          totalMessages: data.total ?? (messages.length + newOnes.length)
        });
      } else {
        set({ hasMoreMessages: false });
      }
    } catch (err) {
      console.error('Error loading more messages', err);
    } finally {
      set({ isLoadingMore: false });
    }
  },

  loadMessageDetail: async (uid, allowImages = false) => {
    const { activeAccount, activeFolder } = get();
    if (!activeAccount) return;

    try {
      const url = `/api/mail/${activeAccount.id}/message/${uid}?folder=${encodeURIComponent(activeFolder)}&allowImages=${allowImages}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.message) {
        set({ selectedMessage: data.message });
        // Mark as read automatically in local state
        set(state => ({
          messages: state.messages.map(m => m.uid === uid ? { ...m, is_read: 1 } : m)
        }));
        // Notify backend
        get().markRead([uid], true);
      }
    } catch (e) {
      console.error('Error loading message detail', e);
    }
  },

  markRead: async (uids, isRead) => {
    const { activeAccount, activeFolder } = get();
    if (!activeAccount || uids.length === 0) return;

    // Optimistic UI update
    set(state => ({
      messages: state.messages.map(m => uids.includes(m.uid) ? { ...m, is_read: isRead ? 1 : 0 } : m),
      selectedMessage: state.selectedMessage && uids.includes(state.selectedMessage.uid) ? { ...state.selectedMessage, is_read: isRead ? 1 : 0 } : state.selectedMessage
    }));

    try {
      await fetch(`/api/mail/${activeAccount.id}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: activeFolder, uids, isRead })
      });
    } catch (e) {
      console.error('Flags update failed', e);
    }
  },

  toggleStar: async (uid) => {
    const { activeAccount, activeFolder, messages } = get();
    if (!activeAccount) return;

    const target = messages.find(m => m.uid === uid);
    if (!target) return;
    const newStarred = target.is_starred === 1 ? 0 : 1;

    set(state => ({
      messages: state.messages.map(m => m.uid === uid ? { ...m, is_starred: newStarred } : m),
      selectedMessage: state.selectedMessage && state.selectedMessage.uid === uid ? { ...state.selectedMessage, is_starred: newStarred } : state.selectedMessage
    }));

    try {
      await fetch(`/api/mail/${activeAccount.id}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: activeFolder, uids: [uid], isStarred: newStarred === 1 })
      });
    } catch (e) {
      console.error('Star update failed', e);
    }
  },

  deleteMessages: async (uids) => {
    const { activeAccount, activeFolder } = get();
    if (!activeAccount || uids.length === 0) return;

    set(state => ({
      messages: state.messages.filter(m => !uids.includes(m.uid)),
      selectedMessage: state.selectedMessage && uids.includes(state.selectedMessage.uid) ? null : state.selectedMessage,
      selectedUids: state.selectedUids.filter(id => !uids.includes(id)),
      mobileView: 'mail_list'
    }));

    try {
      await fetch(`/api/mail/${activeAccount.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: activeFolder, uids })
      });
    } catch (e) {
      console.error('Delete failed', e);
    }
  },

  moveMessages: async (uids, destinationFolder) => {
    const { activeAccount, activeFolder } = get();
    if (!activeAccount || uids.length === 0) return;

    set(state => ({
      messages: state.messages.filter(m => !uids.includes(m.uid)),
      selectedMessage: state.selectedMessage && uids.includes(state.selectedMessage.uid) ? null : state.selectedMessage,
      selectedUids: []
    }));

    try {
      await fetch(`/api/mail/${activeAccount.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceFolder: activeFolder, destinationFolder, uids })
      });
    } catch (e) {
      console.error('Move failed', e);
    }
  },

  searchQuery: '',
  searchResults: [],
  isSearching: false,
  setSearchQuery: (query) => set({ searchQuery: query }),
  executeSearch: async (query) => {
    const { activeAccount } = get();
    if (!activeAccount) return;
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true });
    try {
      const res = await fetch(`/api/mail/${activeAccount.id}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      set({ searchResults: data.results || [] });
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      set({ isSearching: false });
    }
  },

  mobileView: 'mail_list',
  setMobileView: (mobileView) => set({ mobileView }),

  isComposeOpen: false,
  composeDraft: null,
  openCompose: (draft = null) => set({ isComposeOpen: true, composeDraft: draft }),
  closeCompose: () => set({ isComposeOpen: false, composeDraft: null }),
  saveDraft: async (draftData) => {
    const { activeAccount } = get();
    if (!activeAccount) return undefined;
    try {
      const res = await fetch(`/api/mail/${activeAccount.id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      });
      const data = await res.json();
      if (data.success) {
        return data.uid;
      }
    } catch (e) {
      console.error('Draft save failed', e);
    }
    return undefined;
  },

  emptyFolder: async (folderPath) => {
    const { activeAccount } = get();
    if (!activeAccount) return;
    try {
      const res = await fetch(`/api/folders/${activeAccount.id}/empty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath })
      });
      const data = await res.json();
      if (data.folders) set({ folders: data.folders });
      set({
        messages: [],
        selectedMessage: null,
        selectedUids: [],
        hasMoreMessages: false,
        totalMessages: 0
      });
    } catch (e) {
      console.error('Empty folder failed', e);
    }
  },

  createFolder: async (path: string) => {
    const { activeAccount, setActiveFolder } = get();
    if (!activeAccount) return { success: false, error: 'Nessun account attivo' };
    try {
      const res = await fetch(`/api/folders/${activeAccount.id}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Impossibile creare la cartella' };
      }
      if (data.folders) set({ folders: data.folders });
      setActiveFolder(path);
      return { success: true };
    } catch (e: any) {
      console.error('Create folder failed', e);
      return { success: false, error: e.message || 'Errore di connessione' };
    }
  },

  deleteFolder: async (path: string) => {
    const { activeAccount, activeFolder, setActiveFolder } = get();
    if (!activeAccount) return { success: false, error: 'Nessun account attivo' };
    try {
      const res = await fetch(`/api/folders/${activeAccount.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Impossibile eliminare la cartella' };
      }
      if (data.folders) set({ folders: data.folders });
      if (activeFolder === path) {
        setActiveFolder('INBOX');
      }
      return { success: true };
    } catch (e: any) {
      console.error('Delete folder failed', e);
      return { success: false, error: e.message || 'Errore di connessione' };
    }
  },

  playChimeSound: () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: D5 (587.33Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2: A5 (880.00Hz) slightly delayed for elegant chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.1);
      gain2.gain.setValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.7);
    } catch (e) {
      // Audio might be blocked until user gesture
    }
  },

  // App Switcher
  currentApp: 'mail',
  setCurrentApp: (currentApp) => {
    set({ currentApp });
    if (currentApp === 'chat') {
      get().loadChatUsers();
    }
  },

  // CryptoChat State & Actions
  chatUsers: [],
  activeChatPeer: null,
  chatMessages: [],
  chatTypingPeers: {},
  chatUnreadTotal: 0,
  chatBurnTimer: 0,
  chatSearchQuery: '',
  chatSearchResults: [],
  isChatLoading: false,

  setChatBurnTimer: (timer) => set({ chatBurnTimer: timer }),
  setChatSearchQuery: (query) => set({ chatSearchQuery: query }),

  initChatKeys: async () => {
    const { activeAccount } = get();
    if (!activeAccount) return;
    try {
      const { publicKeyJwk } = await getOrCreateKeyPair(activeAccount.id);
      await fetch('/api/chat/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeAccount.id,
          publicKeyJwk
        })
      });
    } catch (e) {
      console.error('Failed to init/publish chat keys:', e);
    }
  },

  loadChatUsers: async () => {
    const { activeAccount } = get();
    if (!activeAccount) return;
    try {
      const res = await fetch(`/api/chat/users?accountId=${activeAccount.id}`);
      const data = await res.json();
      if (data.users) {
        const totalUnread = data.users.reduce((acc: number, u: ChatUser) => acc + (u.unreadCount || 0), 0);
        set({ chatUsers: data.users, chatUnreadTotal: totalUnread });
      }
    } catch (e) {
      console.error('Failed to load chat users:', e);
    }
  },

  searchChatUsers: async (query: string) => {
    const { activeAccount } = get();
    if (!activeAccount || !query.trim()) {
      set({ chatSearchResults: [] });
      return;
    }
    try {
      const res = await fetch(`/api/chat/search?accountId=${activeAccount.id}&email=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.users) {
        set({ chatSearchResults: data.users });
      }
    } catch (e) {
      console.error('Failed to search chat users:', e);
    }
  },

  setActiveChatPeer: async (peer: ChatUser | null) => {
    set({ activeChatPeer: peer, chatMessages: [], isChatLoading: true });
    if (!peer) {
      set({ isChatLoading: false });
      return;
    }

    const { activeAccount } = get();
    if (!activeAccount) {
      set({ isChatLoading: false });
      return;
    }

    try {
      // 1. Get peer's public key
      const keyRes = await fetch(`/api/chat/keys/${peer.id}`);
      const keyData = await keyRes.json();
      if (!keyData.publicKeyJwk) {
        console.warn('Peer has not generated chat keys yet.');
        set({ isChatLoading: false });
        return;
      }

      // 2. Derive shared key
      const sharedKey = await deriveSharedAesKey(activeAccount.id, keyData.publicKeyJwk);

      // 3. Fetch dialog messages
      const msgRes = await fetch(`/api/chat/messages/${peer.id}?accountId=${activeAccount.id}`);
      const msgData = await msgRes.json();
      const rawMessages: ChatMessage[] = msgData.messages || [];

      // 4. Decrypt each message client-side
      const decryptedMessages: ChatMessage[] = [];
      for (const msg of rawMessages) {
        try {
          const decryptedText = await decryptMessage(msg.ciphertext, msg.iv, sharedKey);
          decryptedMessages.push({
            ...msg,
            decryptedText,
            isMine: msg.sender_id === activeAccount.id
          });
        } catch (decryptErr) {
          console.warn('Failed to decrypt message:', msg.id, decryptErr);
          decryptedMessages.push({
            ...msg,
            decryptedText: '⚠️ Impossibile decifrare il messaggio (chiavi differenti)',
            isMine: msg.sender_id === activeAccount.id
          });
        }
      }

      set({ chatMessages: decryptedMessages, isChatLoading: false });

      // 5. Mark messages as read
      await fetch('/api/chat/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: activeAccount.id, peerId: peer.id })
      });

      // Update unread count locally in chatUsers
      set((state) => {
        const updatedUsers = state.chatUsers.map(u => u.id === peer.id ? { ...u, unreadCount: 0 } : u);
        const totalUnread = updatedUsers.reduce((acc, u) => acc + (u.unreadCount || 0), 0);
        return { chatUsers: updatedUsers, chatUnreadTotal: totalUnread };
      });
    } catch (e) {
      console.error('Failed to load chat dialog:', e);
      set({ isChatLoading: false });
    }
  },

  sendChatMessage: async (text: string) => {
    const { activeAccount, activeChatPeer, chatBurnTimer } = get();
    if (!activeAccount || !activeChatPeer || !text.trim()) return false;

    try {
      // 1. Get peer's public key
      const keyRes = await fetch(`/api/chat/keys/${activeChatPeer.id}`);
      if (!keyRes.ok) {
        console.error('Chiave pubblica destinatario non disponibile');
        return false;
      }
      const keyData = await keyRes.json();
      if (!keyData.publicKeyJwk) {
        console.error('L\'utente non ha ancora inizializzato le sue chiavi crittografiche.');
        return false;
      }

      // 2. Derive shared key
      const sharedKey = await deriveSharedAesKey(activeAccount.id, keyData.publicKeyJwk);

      // 3. Encrypt message
      const { ciphertext, iv } = await encryptMessage(text.trim(), sharedKey);

      // 4. Calculate expires_at if burn timer enabled
      let expiresInSeconds: number | undefined = undefined;
      let expires_at: number | null = null;
      if (chatBurnTimer > 0) {
        expiresInSeconds = chatBurnTimer;
        expires_at = Date.now() + (chatBurnTimer * 1000);
      } else if (chatBurnTimer === -1) {
        // Special marker: -1 means burn immediately on read
        expires_at = -1;
      }

      // 5. POST to server - sending both senderId and accountId for total compatibility
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: activeAccount.id,
          accountId: activeAccount.id,
          recipientId: activeChatPeer.id,
          ciphertext,
          iv,
          expiresInSeconds,
          expires_at
        })
      });

      const data = await res.json();
      if (data.message) {
        const newMsg: ChatMessage = {
          ...data.message,
          decryptedText: text.trim(),
          isMine: true
        };
        set(state => ({
          chatMessages: [...state.chatMessages, newMsg]
        }));
        return true;
      }
    } catch (e) {
      console.error('Failed to send encrypted chat message:', e);
    }
    return false;
  },

  deleteChatMessage: async (messageId: string) => {
    const { activeAccount } = get();
    if (!activeAccount) return false;
    try {
      const res = await fetch(`/api/chat/messages/${messageId}?accountId=${activeAccount.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        set(state => ({
          chatMessages: state.chatMessages.filter(m => m.id !== messageId)
        }));
        return true;
      }
    } catch (e) {
      console.error('Failed to delete message:', e);
    }
    return false;
  },

  sendChatTyping: async (isTyping: boolean) => {
    const { activeAccount, activeChatPeer } = get();
    if (!activeAccount || !activeChatPeer) return;
    try {
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: activeAccount.id,
          accountId: activeAccount.id,
          recipientId: activeChatPeer.id,
          isTyping
        })
      });
    } catch (e) {
      // ignore typing sync errors
    }
  },

  setChatVisibility: async (visibility: ChatVisibility) => {
    const { activeAccount, settings } = get();
    if (!activeAccount) return false;
    try {
      const res = await fetch('/api/chat/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeAccount.id,
          visibility
        })
      });
      const data = await res.json();
      if (data.success) {
        if (settings) {
          set({ settings: { ...settings, chat_visibility: visibility } });
        }
        get().loadChatUsers();
        return true;
      }
    } catch (e) {
      console.error('Failed to set chat visibility:', e);
    }
    return false;
  },

  handleIncomingChatMessage: async (rawMsg: any) => {
    const { activeAccount, activeChatPeer } = get();
    if (!activeAccount) return;

    // Check if this message is for the currently open conversation
    if (activeChatPeer && (rawMsg.sender_id === activeChatPeer.id || rawMsg.recipient_id === activeChatPeer.id)) {
      try {
        const keyRes = await fetch(`/api/chat/keys/${activeChatPeer.id}`);
        const keyData = await keyRes.json();
        if (keyData.publicKeyJwk) {
          const sharedKey = await deriveSharedAesKey(activeAccount.id, keyData.publicKeyJwk);
          const decryptedText = await decryptMessage(rawMsg.ciphertext, rawMsg.iv, sharedKey);
          const msgWithText: ChatMessage = {
            ...rawMsg,
            decryptedText,
            isMine: rawMsg.sender_id === activeAccount.id
          };

          set(state => {
            if (state.chatMessages.some(m => m.id === rawMsg.id)) return state;
            return { chatMessages: [...state.chatMessages, msgWithText] };
          });

          // Mark read automatically since user is viewing the conversation
          if (rawMsg.sender_id === activeChatPeer.id) {
            fetch('/api/chat/messages/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId: activeAccount.id, peerId: activeChatPeer.id })
            }).catch(console.error);
          }
        }
      } catch (e) {
        console.error('Error decrypting incoming message:', e);
      }
    } else {
      // Incoming message for another peer: refresh chat user list to show badge
      get().loadChatUsers();
    }

    // Play chime sound and system notification if incoming from peer
    if (rawMsg.sender_id !== activeAccount.id) {
      get().playChimeSound();
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        const notif = new Notification('Nuovo messaggio cifrato (CryptoChat)', {
          body: 'Hai ricevuto un messaggio istantaneo E2EE protetto.',
          icon: '/favicon.ico'
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    }
  },

  handleChatTypingEvent: (senderId: string, isTyping: boolean) => {
    set(state => ({
      chatTypingPeers: { ...state.chatTypingPeers, [senderId]: isTyping }
    }));
  },

  handleChatPresenceEvent: (userId: string, isOnline: boolean) => {
    if (!userId) return;
    const { chatUsers } = get();
    if (!chatUsers.some(u => u.id === userId)) {
      get().loadChatUsers();
      return;
    }
    set(state => {
      const updatedUsers = state.chatUsers.map(u => u.id === userId ? { ...u, isOnline } : u);
      const updatedPeer = state.activeChatPeer?.id === userId ? { ...state.activeChatPeer, isOnline } : state.activeChatPeer;
      return { chatUsers: updatedUsers, activeChatPeer: updatedPeer };
    });
  },

  refreshCurrentChatDialog: async () => {
    const { activeAccount, activeChatPeer } = get();
    if (!activeAccount || !activeChatPeer) return;
    try {
      const keyRes = await fetch(`/api/chat/keys/${activeChatPeer.id}`);
      if (!keyRes.ok) return;
      const keyData = await keyRes.json();
      if (!keyData.publicKeyJwk) return;

      const sharedKey = await deriveSharedAesKey(activeAccount.id, keyData.publicKeyJwk);
      const msgRes = await fetch(`/api/chat/messages/${activeChatPeer.id}?accountId=${activeAccount.id}`);
      const msgData = await msgRes.json();
      const rawMessages: ChatMessage[] = msgData.messages || [];

      const currentMessages = get().chatMessages;
      const currentIds = new Set(currentMessages.map(m => m.id));
      const hasNew = rawMessages.some(m => !currentIds.has(m.id));
      const hasStatusChange = rawMessages.some(m => {
        const existing = currentMessages.find(c => c.id === m.id);
        return existing && (existing.read_at !== m.read_at || existing.delivered_at !== m.delivered_at);
      });

      if (hasNew || hasStatusChange || rawMessages.length !== currentMessages.length) {
        const decryptedMessages: ChatMessage[] = [];
        for (const msg of rawMessages) {
          const existing = currentMessages.find(c => c.id === msg.id);
          if (existing && existing.decryptedText && !existing.decryptedText.startsWith('⚠️')) {
            decryptedMessages.push({
              ...msg,
              decryptedText: existing.decryptedText,
              isMine: msg.sender_id === activeAccount.id
            });
          } else {
            try {
              const decryptedText = await decryptMessage(msg.ciphertext, msg.iv, sharedKey);
              decryptedMessages.push({
                ...msg,
                decryptedText,
                isMine: msg.sender_id === activeAccount.id
              });
            } catch {
              decryptedMessages.push({
                ...msg,
                decryptedText: '⚠️ Impossibile decifrare il messaggio (chiavi differenti)',
                isMine: msg.sender_id === activeAccount.id
              });
            }
          }
        }
        set({ chatMessages: decryptedMessages });
      }
    } catch (e) {
      // silent background refresh
    }
  },

  handleChatReadByEvent: (readBy: string, readAt: string) => {
    set(state => ({
      chatMessages: state.chatMessages.map(m => {
        if (m.recipient_id === readBy) {
          return {
            ...m,
            delivered_at: m.delivered_at || readAt,
            read_at: readAt
          };
        }
        return m;
      })
    }));
  },

  handleChatAckEvent: (messageId: string, status: 'delivered' | 'read', timestamp: string) => {
    set(state => ({
      chatMessages: state.chatMessages.map(m => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          delivered_at: status === 'delivered' ? timestamp : m.delivered_at,
          read_at: status === 'read' ? timestamp : m.read_at
        };
      })
    }));
  },

  handleChatDeleteEvent: (messageId: string) => {
    set(state => ({
      chatMessages: state.chatMessages.filter(m => m.id !== messageId)
    }));
  },

  isSettingsOpen: false,
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  isLoginOpen: false,
  setIsLoginOpen: (open) => set({ isLoginOpen: open }),

  // Contacts
  contacts: [],
  selectedContact: null,
  setSelectedContact: (selectedContact) => set({ selectedContact }),
  isImportContactsOpen: false,
  setIsImportContactsOpen: (isImportContactsOpen) => set({ isImportContactsOpen }),
  contactsSearchQuery: '',
  setContactsSearchQuery: (contactsSearchQuery) => {
    set({ contactsSearchQuery });
    get().loadContacts(contactsSearchQuery);
  },

  loadContacts: async (search) => {
    const { activeAccount } = get();
    if (!activeAccount) return;
    try {
      const url = search && search.trim()
        ? `/api/contacts/${activeAccount.id}?q=${encodeURIComponent(search.trim())}`
        : `/api/contacts/${activeAccount.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.contacts) {
        set({ contacts: data.contacts });
        const currentSelected = get().selectedContact;
        if (currentSelected) {
          const fresh = data.contacts.find((c: Contact) => c.id === currentSelected.id);
          set({ selectedContact: fresh || data.contacts[0] || null });
        } else if (data.contacts.length > 0) {
          set({ selectedContact: data.contacts[0] });
        }
      }
    } catch (e) {
      console.error('Failed to load contacts', e);
    }
  },

  saveContact: async (contact) => {
    const { activeAccount, loadContacts } = get();
    if (!activeAccount) return false;
    try {
      const res = await fetch(`/api/contacts/${activeAccount.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      });
      const data = await res.json();
      if (data.success) {
        await loadContacts(get().contactsSearchQuery);
        if (data.contact) set({ selectedContact: data.contact });
        return true;
      }
    } catch (e) {
      console.error('Save contact failed', e);
    }
    return false;
  },

  deleteContact: async (id) => {
    const { activeAccount, loadContacts } = get();
    if (!activeAccount) return false;
    try {
      const res = await fetch(`/api/contacts/${activeAccount.id}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await loadContacts(get().contactsSearchQuery);
        return true;
      }
    } catch (e) {
      console.error('Delete contact failed', e);
    }
    return false;
  },

  importContacts: async (input) => {
    const { activeAccount, loadContacts } = get();
    if (!activeAccount) return 0;
    try {
      const res = await fetch(`/api/contacts/${activeAccount.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data = await res.json();
      if (data.success) {
        await loadContacts(get().contactsSearchQuery);
        return data.count || 0;
      }
    } catch (e) {
      console.error('Import contacts failed', e);
    }
    return 0;
  },

  extractContactsFromMail: async () => {
    const { activeAccount, loadContacts } = get();
    if (!activeAccount) return 0;
    try {
      const res = await fetch(`/api/contacts/${activeAccount.id}/extract-from-mail`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        await loadContacts(get().contactsSearchQuery);
        return data.count || 0;
      }
    } catch (e) {
      console.error('Extract contacts failed', e);
    }
    return 0;
  },

  logout: async (accountId?: string) => {
    const targetId = accountId || get().activeAccount?.id;
    if (!targetId) return;

    try {
      await fetch(`/api/accounts/${targetId}/logout`, { method: 'POST' });
    } catch (e) {
      console.error('Logout failed', e);
    }

    localStorage.removeItem('cryptomail_active_account_id');

    set({
      activeAccount: null,
      messages: [],
      folders: [],
      selectedMessage: null,
      selectedUids: [],
      settings: null,
      chatUsers: [],
      activeChatPeer: null,
      chatMessages: [],
      isLoginOpen: true
    });
  }
}));
