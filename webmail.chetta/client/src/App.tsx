import React, { useEffect } from 'react';
import { useWebmailStore } from './store/useWebmailStore.js';
import { TopHeader } from './components/TopHeader.js';
import { AppRail } from './components/AppRail.js';
import { RibbonBar } from './components/RibbonBar.js';
import { FolderTree } from './components/FolderTree.js';
import { MailList } from './components/MailList.js';
import { MailView } from './components/MailView.js';
import { ComposeModal } from './components/ComposeModal.js';
import { LoginScreen } from './components/LoginScreen.js';
import { SettingsModal } from './components/SettingsModal.js';
import { MobileBottomNav } from './components/MobileBottomNav.js';
import { Search, ArrowLeft, Inbox } from 'lucide-react';
import { MailListItem } from './components/MailListItem.js';
import { ContactsView } from './components/ContactsView.js';
import { CryptoChatView } from './components/CryptoChatView.js';

export const App: React.FC = () => {
  const {
    activeAccount,
    accounts,
    setAccounts,
    setActiveAccount,
    currentApp,
    mobileView,
    setMobileView,
    searchResults,
    searchQuery,
    setSearchQuery,
    executeSearch,
    loadMessages,
    refreshFolders,
    setSelectedMessage,
    loadMessageDetail,
    selectedMessage,
    playChimeSound,
    handleIncomingChatMessage,
    handleChatTypingEvent,
    handleChatPresenceEvent,
    handleChatReadByEvent,
    handleChatAckEvent,
    handleChatDeleteEvent
  } = useWebmailStore();

  // Request Notification permission on startup
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Load existing accounts on startup
  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(data => {
        if (data.accounts && data.accounts.length > 0) {
          setAccounts(data.accounts);
          const savedId = localStorage.getItem('cryptomail_active_account_id');
          const matched = data.accounts.find((a: any) => a.id === savedId);
          if (matched) {
            setActiveAccount(matched);
          } else {
            setActiveAccount(null);
            useWebmailStore.setState({ isLoginOpen: true });
          }
        } else {
          useWebmailStore.setState({ isLoginOpen: true });
        }
      })
      .catch(console.error);
  }, []);

  // Real-time WebSocket connection for IMAP IDLE
  useEffect(() => {
    if (!activeAccount) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?accountId=${activeAccount.id}`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log('[WebSocket Push Event]', payload);
          if (payload.type === 'MAIL_UPDATE') {
            loadMessages(false);
            refreshFolders();
            playChimeSound();

            if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
              const notif = new Notification('Nuova email ricevuta', {
                body: payload.folder ? `Nuovi messaggi in ${payload.folder}` : 'Hai ricevuto nuovi messaggi su CryptoMail',
                icon: '/favicon.ico'
              });
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            }
          } else if (payload.type === 'CHAT_MESSAGE' || payload.type === 'CHAT_SENT') {
            handleIncomingChatMessage(payload.message);
          } else if (payload.type === 'CHAT_TYPING') {
            handleChatTypingEvent(payload.senderId, payload.isTyping);
          } else if (payload.type === 'CHAT_PRESENCE') {
            handleChatPresenceEvent(payload.userId || payload.accountId, payload.isOnline);
          } else if (payload.type === 'CHAT_ACK') {
            if (payload.readBy) {
              handleChatReadByEvent(payload.readBy, payload.readAt);
            } else if (payload.messageId) {
              handleChatAckEvent(payload.messageId, payload.status, payload.timestamp);
            }
          } else if (payload.type === 'CHAT_DELETE') {
            handleChatDeleteEvent(payload.messageId);
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket Error]', err);
      };
    } catch (e) {
      console.warn('[WebSocket Connect Failed]', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [activeAccount]);

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-[#f0f2f5] dark:bg-[#1b1a19] text-[#242424] dark:text-[#f3f2f1] overflow-hidden">
      {/* Top Outlook Header */}
      <TopHeader />

      {/* Desktop Ribbon Action Bar (Only for Mail) */}
      {currentApp === 'mail' && (
        <div className="hidden md:block">
          <RibbonBar />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left App Rail (Desktop) */}
        <div className="hidden md:flex">
          <AppRail />
        </div>

        {/* Desktop Main Module View */}
        {currentApp === 'mail' && (
          <div className="hidden md:flex flex-1 overflow-hidden">
            <FolderTree />
            <MailList />
            <MailView />
          </div>
        )}
        {currentApp === 'contacts' && (
          <div className="hidden md:flex flex-1 overflow-hidden">
            <ContactsView />
          </div>
        )}
        {currentApp === 'chat' && (
          <div className="hidden md:flex flex-1 overflow-hidden">
            <CryptoChatView />
          </div>
        )}

        {/* Smartphone / Mobile Viewport */}
        <div className="md:hidden flex-1 flex flex-col overflow-hidden">
          {mobileView === 'search' ? (
            <div className="flex-1 bg-white dark:bg-[#201f1e] flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-[#323130] flex items-center gap-2">
                <button
                  onClick={() => setMobileView('mail_list')}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Indietro"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#0078d4]" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      executeSearch(e.target.value);
                    }}
                    placeholder="Cerca per mittente, oggetto..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50 dark:bg-[#252423] border border-gray-200 dark:border-[#3d3b39] rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-[#2d2c2a]">
                {searchResults.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    {searchQuery ? 'Nessun risultato trovato' : 'Digita una parola chiave per cercare tra i messaggi'}
                  </div>
                ) : (
                  searchResults.map(msg => (
                    <MailListItem
                      key={msg.id}
                      message={msg}
                      isSelected={selectedMessage?.uid === msg.uid}
                      isChecked={false}
                      onSelect={() => {
                        setSelectedMessage(msg);
                        loadMessageDetail(msg.uid);
                        setMobileView('mail_detail');
                      }}
                      onToggleCheck={() => {}}
                    />
                  ))
                )}
              </div>
            </div>
          ) : currentApp === 'contacts' ? (
            <ContactsView />
          ) : currentApp === 'chat' ? (
            <CryptoChatView />
          ) : (
            <>
              {/* Mobile Mail List */}
              {mobileView === 'mail_list' && <MailList />}

              {/* Mobile Mail Detail View */}
              {mobileView === 'mail_detail' && <MailView />}

              {/* Mobile Folders List */}
              {mobileView === 'folders' && (
                <div className="flex-1 bg-white dark:bg-[#201f1e] overflow-y-auto">
                  <FolderTree />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Smartphone Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* Modals */}
      <ComposeModal />
      <LoginScreen />
      <SettingsModal />
    </div>
  );
};
