import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Search,
  Lock,
  Flame,
  Send,
  Trash2,
  Clock,
  Globe,
  Building2,
  EyeOff,
  UserCheck,
  Check,
  CheckCheck,
  Sparkles,
  Info,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';
import { ChatUser, ChatVisibility } from '../types/index.js';

export const CryptoChatView: React.FC = () => {
  const {
    activeAccount,
    chatUsers,
    activeChatPeer,
    chatMessages,
    chatTypingPeers,
    chatBurnTimer,
    chatSearchQuery,
    chatSearchResults,
    isChatLoading,
    settings,
    setActiveChatPeer,
    sendChatMessage,
    deleteChatMessage,
    sendChatTyping,
    setChatVisibility,
    setChatBurnTimer,
    setChatSearchQuery,
    searchChatUsers,
    loadChatUsers,
    refreshCurrentChatDialog
  } = useWebmailStore();

  const [inputMessage, setInputMessage] = useState('');
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChatPeer]);

  // Auto-fetch users on mount and periodically every 4s
  useEffect(() => {
    loadChatUsers();
    const interval = setInterval(() => {
      loadChatUsers();
    }, 4000);
    return () => clearInterval(interval);
  }, [activeAccount]);

  // Auto-refresh active chat dialog messages every 3s as fallback to WebSocket
  useEffect(() => {
    if (!activeChatPeer) return;
    refreshCurrentChatDialog();
    const interval = setInterval(() => {
      refreshCurrentChatDialog();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeChatPeer?.id]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadChatUsers();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    sendChatTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendChatTyping(false);
    }, 2000);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const text = inputMessage;
    setInputMessage('');
    sendChatTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    await sendChatMessage(text);
  };

  const isPeerTyping = activeChatPeer ? chatTypingPeers[activeChatPeer.id] : false;

  const currentVisibility: ChatVisibility =
    (settings?.chat_visibility as ChatVisibility) || 'same_domain';

  const displayedUsers = chatSearchQuery.trim().length > 0 ? chatSearchResults : chatUsers;

  return (
    <div className="flex-1 flex flex-row h-full overflow-hidden bg-white dark:bg-[#201f1e] select-none">
      {/* LEFT SIDEBAR: Discoverable Users & Conversations */}
      <div className={`w-full md:w-80 border-r border-gray-200 dark:border-[#323130] flex flex-col bg-[#fcfcfc] dark:bg-[#252423] shrink-0 h-full ${
        activeChatPeer ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-[#323130]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-800 dark:text-gray-100 text-base">CryptoChat</span>
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Lock className="w-2.5 h-2.5" /> E2EE
              </span>
              <button
                onClick={handleManualRefresh}
                title="Ricarica elenco utenti"
                className="p-1 hover:bg-gray-200 dark:hover:bg-[#323130] rounded-md transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
              </button>
            </div>

            {/* Privacy / Visibility Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                title="Imposta visibilità profilo"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-[#3d3b39] hover:bg-gray-100 dark:hover:bg-[#2d2c2b] text-gray-600 dark:text-gray-300 transition-colors"
              >
                {currentVisibility === 'same_domain' && <Building2 className="w-3.5 h-3.5 text-blue-500" />}
                {currentVisibility === 'all' && <Globe className="w-3.5 h-3.5 text-emerald-500" />}
                {currentVisibility === 'none' && <EyeOff className="w-3.5 h-3.5 text-amber-500" />}
                <span className="text-[11px] font-medium capitalize">
                  {currentVisibility === 'same_domain' ? 'Dominio' : currentVisibility === 'all' ? 'Tutti' : 'Invisibile'}
                </span>
              </button>

              {showVisibilityMenu && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-[#292827] border border-gray-200 dark:border-[#3d3b39] rounded-lg shadow-xl py-1 z-30">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-[#383635]">
                    LA TUA VISIBILITÀ CHAT
                  </div>
                  <button
                    onClick={() => {
                      setChatVisibility('same_domain');
                      setShowVisibilityMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors ${
                      currentVisibility === 'same_domain' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" /> Stesso Dominio (@{activeAccount?.email.split('@')[1]})
                    </span>
                    {currentVisibility === 'same_domain' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => {
                      setChatVisibility('all');
                      setShowVisibilityMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors ${
                      currentVisibility === 'all' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-emerald-500" /> Tutti gli utenti webmail
                    </span>
                    {currentVisibility === 'all' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => {
                      setChatVisibility('none');
                      setShowVisibilityMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors ${
                      currentVisibility === 'none' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <EyeOff className="w-3.5 h-3.5 text-amber-500" /> Invisibile (solo ricerca diretta)
                    </span>
                    {currentVisibility === 'none' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca utente o digita email..."
              value={chatSearchQuery}
              onChange={(e) => {
                setChatSearchQuery(e.target.value);
                searchChatUsers(e.target.value);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-[#1b1a19] border border-transparent focus:border-blue-500 dark:focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-[#2d2c2b]">
          {displayedUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">
              {chatSearchQuery.trim() ? (
                <span>Nessun utente trovato con questa email.</span>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <UserCheck className="w-8 h-8 text-gray-400 stroke-[1.5]" />
                  <p className="font-semibold text-gray-700 dark:text-gray-200">Nessun altro utente visibile</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    I colleghi con dominio <strong>@{activeAccount?.email.split('@')[1] || 'chetta.it'}</strong> compariranno qui non appena eseguono l'accesso alla webmail.
                  </p>
                  <button
                    onClick={handleManualRefresh}
                    className="mt-1 px-3 py-1.5 bg-blue-50 dark:bg-[#1c3247] hover:bg-blue-100 dark:hover:bg-[#254360] text-[#0078d4] dark:text-[#3aa0f3] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Aggiorna elenco</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            displayedUsers.map((user) => {
              const isSelected = activeChatPeer?.id === user.id;
              const initials = (user.displayName || user.email)
                .split('@')[0]
                .slice(0, 2)
                .toUpperCase();

              return (
                <button
                  key={user.id}
                  onClick={() => setActiveChatPeer(user)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors relative ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-[#1c3247] text-blue-900 dark:text-white'
                      : 'hover:bg-gray-100/70 dark:hover:bg-[#2c2b2a] text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {/* Avatar with Presence Indicator */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {initials}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#252423] ${
                        user.isOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      title={user.isOnline ? 'Online' : 'Offline'}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs truncate">
                        {user.displayName || user.email.split('@')[0]}
                      </span>
                      {user.unreadCount > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Active Chat or Empty Splash */}
      {activeChatPeer ? (
        <div className="flex-1 w-full flex flex-col h-full bg-white dark:bg-[#1f1e1d]">
          {/* Chat Header */}
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 dark:border-[#323130] flex items-center justify-between bg-white dark:bg-[#252423]">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Back button for mobile */}
              <button
                onClick={() => setActiveChatPeer(null)}
                className="md:hidden p-1.5 -ml-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#323130] rounded-full shrink-0"
                title="Torna all'elenco chat"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {(activeChatPeer.displayName || activeChatPeer.email).slice(0, 2).toUpperCase()}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#252423] ${
                    activeChatPeer.isOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                    {activeChatPeer.displayName || activeChatPeer.email}
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium shrink-0">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Cifratura E2EE
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {isPeerTyping ? (
                    <span className="text-blue-500 font-medium animate-pulse">sta scrivendo...</span>
                  ) : activeChatPeer.isOnline ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online adesso</span>
                  ) : (
                    'Ultimo accesso recente'
                  )}
                </p>
              </div>
            </div>

            {/* Self-Destruct / Burn Timer Menu */}
            <div className="relative">
              <button
                onClick={() => setShowTimerMenu(!showTimerMenu)}
                title="Timer di autodistruzione messaggi"
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                  chatBurnTimer !== 0
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200'
                    : 'border-gray-200 dark:border-[#383635] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2c2b]'
                }`}
              >
                {chatBurnTimer === 0 && <Clock className="w-3.5 h-3.5 text-gray-400" />}
                {chatBurnTimer > 0 && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                {chatBurnTimer === -1 && <Flame className="w-3.5 h-3.5 text-red-500" />}
                <span className="text-[11px] font-medium">
                  {chatBurnTimer === 0 && 'Timer: Off'}
                  {chatBurnTimer === 30 && '30 secondi'}
                  {chatBurnTimer === 300 && '5 minuti'}
                  {chatBurnTimer === 3600 && '1 ora'}
                  {chatBurnTimer === 86400 && '24 ore'}
                  {chatBurnTimer === -1 && '🔥 Brucia alla lettura'}
                </span>
              </button>

              {showTimerMenu && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-[#292827] border border-gray-200 dark:border-[#3d3b39] rounded-lg shadow-xl py-1 z-30">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-[#383635]">
                    AUTODISTRUZIONE (OPZIONE A)
                  </div>
                  {[
                    { label: 'Disattivata (conserva cifrato nel DB)', val: 0 },
                    { label: '30 secondi', val: 30 },
                    { label: '5 minuti', val: 300 },
                    { label: '1 ora', val: 3600 },
                    { label: '24 ore', val: 86400 },
                    { label: '🔥 Brucia alla lettura (istantaneo)', val: -1 }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => {
                        setChatBurnTimer(opt.val);
                        setShowTimerMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors ${
                        chatBurnTimer === opt.val
                          ? 'text-amber-600 dark:text-amber-400 font-semibold'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {chatBurnTimer === opt.val && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* E2EE Info banner */}
            <div className="mx-auto max-w-md my-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Conversazione protetta con <strong>chiavi asimmetriche ECDH P-256</strong> e <strong>AES-256-GCM</strong>. Il server non ha accesso al testo in chiaro.
              </span>
            </div>

            {isChatLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-xs gap-2">
                <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Decifratura messaggi in corso...</span>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-xs gap-2">
                <Sparkles className="w-8 h-8 text-blue-400 stroke-[1.5]" />
                <p>Nessun messaggio precedente con {activeChatPeer.displayName || activeChatPeer.email}.</p>
                <p className="text-[11px] text-gray-500">Invia il primo messaggio cifrato sicuro!</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMine = msg.isMine;
                const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-1.5 group ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Delete / Shred button on hover */}
                    {isMine && (
                      <button
                        onClick={() => deleteChatMessage(msg.id)}
                        title="Cancella/distruggi per tutti"
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div
                      className={`max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm text-xs relative select-text ${
                        isMine
                          ? 'bg-[#0078d4] text-white rounded-br-none'
                          : 'bg-gray-100 dark:bg-[#2d2c2b] text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200/60 dark:border-[#3a3938]'
                      }`}
                    >
                      <p className="break-words leading-relaxed">{msg.decryptedText}</p>

                      <div
                        className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                          isMine ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {msg.expires_at && (
                          <span title="Messaggio con autodistruzione attiva" className="flex items-center">
                            {msg.expires_at === -1 ? <Flame className="w-3 h-3 text-red-400" /> : <Clock className="w-3 h-3 text-amber-300" />}
                          </span>
                        )}
                        <span>{timeStr}</span>
                        {isMine && (
                          <span>
                            {msg.read_at ? (
                              <CheckCheck className="w-3 h-3 text-sky-200" title="Letto" />
                            ) : msg.delivered_at ? (
                              <CheckCheck className="w-3 h-3 text-blue-200" title="Consegnato" />
                            ) : (
                              <Check className="w-3 h-3 text-blue-200" title="Inviato" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator bottom */}
          {isPeerTyping && (
            <div className="px-4 py-1 text-[11px] text-blue-500 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span>{activeChatPeer.displayName || activeChatPeer.email} sta scrivendo...</span>
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-gray-200 dark:border-[#323130] bg-white dark:bg-[#252423]"
          >
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#1b1a19] rounded-xl px-3 py-1.5 border border-gray-200 dark:border-[#3a3938] focus-within:border-blue-500 transition-colors">
              <input
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Scrivi un messaggio cifrato E2EE..."
                className="flex-1 bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                disabled={!inputMessage.trim()}
                className={`p-1.5 rounded-lg transition-all ${
                  inputMessage.trim()
                    ? 'bg-[#0078d4] text-white hover:bg-blue-600 shadow-sm active:scale-95 cursor-pointer'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5 px-1">
              <span className="flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Zero-Knowledge: Solo tu e il destinatario possedete le chiavi.
              </span>
              <span>Invio con Invio</span>
            </div>
          </form>
        </div>
      ) : (
        /* Splash Welcome Screen when no peer is selected (Desktop only) */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-[#1b1a19]">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-[#1c3247] text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-sm">
            <Lock className="w-8 h-8 stroke-[1.5]" />
          </div>

          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            CryptoMail Instant Chat
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            Messaggistica istantanea punto-punto a conoscenza zero. Le chiavi crittografiche risiedono esclusivamente nel browser degli utenti.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-xl text-left">
            <div className="p-3 bg-white dark:bg-[#252423] rounded-lg border border-gray-200 dark:border-[#383635]">
              <ShieldCheck className="w-4 h-4 text-emerald-500 mb-1.5" />
              <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Crittografia E2EE</div>
              <div className="text-[11px] text-gray-500">ECDH P-256 + AES-256-GCM nativi WebCrypto.</div>
            </div>

            <div className="p-3 bg-white dark:bg-[#252423] rounded-lg border border-gray-200 dark:border-[#383635]">
              <Clock className="w-4 h-4 text-blue-500 mb-1.5" />
              <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Opzione A (Persistente)</div>
              <div className="text-[11px] text-gray-500">I messaggi cifrati restano disponibili con timer di distruzione opzionale.</div>
            </div>

            <div className="p-3 bg-white dark:bg-[#252423] rounded-lg border border-gray-200 dark:border-[#383635]">
              <EyeOff className="w-4 h-4 text-amber-500 mb-1.5" />
              <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Controllo Visibilità</div>
              <div className="text-[11px] text-gray-500">Renditi visibile solo al tuo dominio, a tutti o modalità invisibile.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
