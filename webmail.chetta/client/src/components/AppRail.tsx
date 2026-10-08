import React from 'react';
import { Mail, Users, MessageSquare, Calendar, CheckSquare, Settings } from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';

export const AppRail: React.FC = () => {
  const { folders, setIsSettingsOpen, currentApp, setCurrentApp, chatUnreadTotal } = useWebmailStore();
  const unreadTotal = folders.reduce((sum, f) => sum + (f.unread_messages || 0), 0);

  return (
    <aside className="w-12 bg-[#f0f2f5] dark:bg-[#1b1a19] border-r border-gray-200 dark:border-[#323130] flex flex-col items-center py-3 select-none shrink-0 z-20">
      {/* App Icons */}
      <div className="flex flex-col items-center gap-2 flex-1">
        <button
          onClick={() => setCurrentApp('mail')}
          title="Posta"
          className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
            currentApp === 'mail'
              ? 'bg-[#0078d4] text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#292827]'
          }`}
        >
          <Mail className="w-4 h-4" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center border-2 border-[#f0f2f5] dark:border-[#1b1a19]">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentApp('chat')}
          title="CryptoChat (Chat Cifrata E2EE)"
          className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
            currentApp === 'chat'
              ? 'bg-[#0078d4] text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#292827]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {chatUnreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center border-2 border-[#f0f2f5] dark:border-[#1b1a19]">
              {chatUnreadTotal > 99 ? '99+' : chatUnreadTotal}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentApp('contacts')}
          title="Rubrica Contatti"
          className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
            currentApp === 'contacts'
              ? 'bg-[#0078d4] text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#292827]'
          }`}
        >
          <Users className="w-4 h-4" />
        </button>

        <button
          title="Calendario"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#292827] transition-colors"
        >
          <Calendar className="w-4 h-4" />
        </button>

        <button
          title="Attività & To-Do"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#292827] transition-colors"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom settings icon */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        title="Impostazioni applicazione"
        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#292827] transition-colors"
      >
        <Settings className="w-4 h-4" />
      </button>
    </aside>
  );
};
