import React from 'react';
import { Mail, MessageSquare, PenSquare, Users, Folder } from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';

export const MobileBottomNav: React.FC = () => {
  const {
    currentApp,
    setCurrentApp,
    mobileView,
    setMobileView,
    folders,
    openCompose,
    chatUnreadTotal
  } = useWebmailStore();

  const unreadTotal = folders.reduce((sum, f) => sum + (f.unread_messages || 0), 0);

  return (
    <nav className="md:hidden shrink-0 bg-white/95 dark:bg-[#201f1e]/95 backdrop-blur-md border-t border-gray-200 dark:border-[#323130] flex items-center justify-around safe-bottom z-30 h-14 select-none shadow-lg">
      {/* 1. Posta */}
      <button
        onClick={() => {
          setCurrentApp('mail');
          setMobileView('mail_list');
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
          currentApp === 'mail' && (mobileView === 'mail_list' || mobileView === 'mail_detail')
            ? 'text-[#0078d4] dark:text-[#2899f5] font-semibold'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <div className="relative">
          <Mail className="w-5 h-5" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-2 bg-[#0078d4] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center border-2 border-white dark:border-[#201f1e]">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Posta</span>
      </button>

      {/* 2. CryptoChat E2EE */}
      <button
        onClick={() => {
          setCurrentApp('chat');
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
          currentApp === 'chat'
            ? 'text-[#0078d4] dark:text-[#2899f5] font-semibold'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          {chatUnreadTotal > 0 && (
            <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center border-2 border-white dark:border-[#201f1e] animate-pulse">
              {chatUnreadTotal > 99 ? '99+' : chatUnreadTotal}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Chat</span>
      </button>

      {/* 3. Floating Center Compose Button */}
      <div className="relative -top-2 flex items-center justify-center">
        <button
          onClick={() => openCompose()}
          className="w-11 h-11 rounded-full bg-[#0078d4] active:bg-[#005a9e] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="Nuova email"
        >
          <PenSquare className="w-5 h-5" />
        </button>
      </div>

      {/* 4. Contatti */}
      <button
        onClick={() => {
          setCurrentApp('contacts');
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
          currentApp === 'contacts'
            ? 'text-[#0078d4] dark:text-[#2899f5] font-semibold'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <Users className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Contatti</span>
      </button>

      {/* 5. Cartelle */}
      <button
        onClick={() => {
          setCurrentApp('mail');
          setMobileView('folders');
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
          currentApp === 'mail' && mobileView === 'folders'
            ? 'text-[#0078d4] dark:text-[#2899f5] font-semibold'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <Folder className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Cartelle</span>
      </button>
    </nav>
  );
};

