import React, { useState } from 'react';
import { Search, Moon, Sun, Settings, User, CheckCircle2, ChevronDown, Plus, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';

export const TopHeader: React.FC = () => {
  const {
    activeAccount,
    accounts,
    setActiveAccount,
    settings,
    updateSettings,
    searchQuery,
    setSearchQuery,
    executeSearch,
    setIsSettingsOpen,
    setIsLoginOpen,
    openCompose,
    loadMessages,
    isLoadingMessages,
    logout
  } = useWebmailStore();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const toggleTheme = () => {
    const nextTheme = settings?.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeSearch(searchQuery);
    }
  };

  return (
    <header className="h-12 bg-[#0078d4] text-white flex items-center justify-between px-3 safe-top shrink-0 select-none z-30 shadow-sm">
      {/* Brand & Left logo */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0 md:w-64">
        <div className="flex items-center gap-1.5 sm:gap-2 font-semibold tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shadow-inner shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm sm:text-base tracking-tight text-white">CryptoMail</span>
            <span className="text-[8px] sm:text-[9px] uppercase font-extrabold tracking-wider px-1 sm:px-1.5 py-0.5 bg-emerald-400 text-emerald-950 rounded shadow-xs">
              CRYPTO
            </span>
          </div>
        </div>
      </div>

      {/* Universal Search Bar (Desktop) */}
      <div className="hidden md:block flex-1 max-w-2xl px-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-[#0078d4] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value) executeSearch('');
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cerca in tutti i messaggi (Premi Invio)..."
            className="w-full h-8 pl-9 pr-4 text-sm bg-white/95 text-[#242424] rounded-md placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-white/80 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Mobile Search Button */}
        <button
          onClick={() => {
            useWebmailStore.getState().setCurrentApp('mail');
            useWebmailStore.getState().setMobileView('search');
          }}
          title="Cerca messaggi"
          className="md:hidden p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Refresh button */}
        <button
          onClick={() => loadMessages(true)}
          title="Sincronizza IMAP"
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors relative"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Cambia tema chiaro/scuro"
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          {settings?.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          title="Impostazioni"
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Account Profile & Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="flex items-center gap-1 sm:gap-1.5 p-1 hover:bg-white/10 rounded-md transition-colors text-xs font-medium"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {activeAccount ? activeAccount.displayName.slice(0, 2) : <User className="w-4 h-4" />}
            </div>
            <span className="hidden md:inline max-w-[120px] truncate">{activeAccount?.displayName || 'Accedi'}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {isAccountMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#252423] text-[#242424] dark:text-[#f3f2f1] rounded-lg shadow-2xl border border-gray-200 dark:border-[#323130] py-2 z-50 animate-slide-up"
              onMouseLeave={() => setIsAccountMenuOpen(false)}
            >
              <div className="px-4 py-2 border-b border-gray-100 dark:border-[#323130]">
                <p className="text-xs text-gray-500 dark:text-gray-400">Account corrente</p>
                <p className="font-semibold text-sm truncate">{activeAccount?.displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activeAccount?.email}</p>
              </div>

              {accounts.length > 1 && (
                <div className="py-1">
                  <div className="px-4 py-1 text-xs text-gray-400 font-medium uppercase tracking-wider">Altri account</div>
                  {accounts
                    .filter(a => a.id !== activeAccount?.id)
                    .map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setActiveAccount(acc);
                          setIsAccountMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 dark:hover:bg-[#2f2e2d] flex items-center justify-between"
                      >
                        <span className="truncate">{acc.email}</span>
                      </button>
                    ))}
                </div>
              )}

              <div className="pt-1 border-t border-gray-100 dark:border-[#323130]">
                <button
                  onClick={() => {
                    setIsLoginOpen(true);
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-[#0078d4] hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Aggiungi un altro account
                </button>

                <button
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 font-medium transition-colors border-t border-gray-100 dark:border-[#323130] mt-1 pt-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Disconnetti
                </button>
              </div>

              <div className="px-4 py-2 bg-gray-50 dark:bg-[#1f1e1d] border-t border-gray-100 dark:border-[#323130] flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 rounded-b-lg">
                <span className="font-semibold text-gray-500 dark:text-gray-400">CryptoMail</span>
                <span className="font-mono">v0.5 • 12/09/2026</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
