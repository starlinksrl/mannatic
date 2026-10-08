import React, { useState, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';
import { Star, Paperclip, Trash2, Mail, MailOpen, Archive } from 'lucide-react';
import { MessageItem } from '../types/index.js';
import { useWebmailStore } from '../store/useWebmailStore.js';

interface MailListItemProps {
  message: MessageItem;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
}

// Generate color based on sender name
function getAvatarBg(name: string): string {
  const colors = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-teal-600',
    'bg-indigo-600',
    'bg-cyan-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isToday(d)) {
      return format(d, 'HH:mm');
    }
    if (isYesterday(d)) {
      return 'Ieri';
    }
    return format(d, 'd MMM', { locale: it });
  } catch {
    return '';
  }
}

export const MailListItem: React.FC<MailListItemProps> = ({
  message,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck
}) => {
  const {
    toggleStar,
    markRead,
    deleteMessages,
    moveMessages,
    folders,
    settings
  } = useWebmailStore();

  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const isSwiping = useRef(false);

  const isUnread = message.is_read === 0;
  const initials = (message.from_name || message.from_address || '?')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 10) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    // Trigger action if swiped > 80px
    if (swipeOffset < -80) {
      // Swiped Left (e.g. Mark Read/Unread)
      if (settings?.swipe_left_action === 'delete') {
        deleteMessages([message.uid]);
      } else {
        markRead([message.uid], isUnread);
      }
    } else if (swipeOffset > 80) {
      // Swiped Right (e.g. Delete or Archive)
      if (settings?.swipe_right_action === 'archive') {
        const archive = folders.find(f => /archiv/i.test(f.name))?.path || 'Archive';
        moveMessages([message.uid], archive);
      } else {
        deleteMessages([message.uid]);
      }
    }

    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden group">
      {/* Background Swipe Actions Indicator */}
      {swipeOffset !== 0 && (
        <div
          className={`absolute inset-0 flex items-center px-4 font-semibold text-white text-xs transition-colors ${
            swipeOffset > 0 ? 'bg-red-500 justify-start' : 'bg-[#0078d4] justify-end'
          }`}
        >
          {swipeOffset > 0 ? (
            <span className="flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Elimina
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              {isUnread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              {isUnread ? 'Segna letto' : 'Segna da leggere'}
            </span>
          )}
        </div>
      )}

      {/* Main Mail Row Item */}
      <div
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onSelect}
        className={`relative px-3 py-2.5 border-b border-gray-100 dark:border-[#2b2a28] cursor-pointer transition-colors duration-150 select-none ${
          isSelected
            ? 'bg-[#edebe9] dark:bg-[#323130] border-l-4 border-[#0078d4]'
            : isUnread
            ? 'bg-white dark:bg-[#252423] hover:bg-gray-50 dark:hover:bg-[#2d2c2b]'
            : 'bg-[#fcfcfc] dark:bg-[#201f1e] hover:bg-gray-100 dark:hover:bg-[#292827]'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {/* Unread indicator dot & Checkbox or Avatar */}
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {/* Blue dot indicator for unread */}
            <div className={`w-2 h-2 rounded-full shrink-0 ${isUnread ? 'bg-[#0078d4]' : 'bg-transparent'}`} />

            {/* Avatar or Checkbox */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleCheck();
              }}
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs"
            >
              <div className={`w-full h-full rounded-full flex items-center justify-center ${getAvatarBg(message.from_name || message.from_address)} ${isChecked ? 'hidden' : 'flex group-hover:hidden'}`}>
                {initials}
              </div>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}}
                className={`w-4 h-4 text-[#0078d4] rounded cursor-pointer accent-[#0078d4] ${isChecked ? 'block' : 'hidden group-hover:block'}`}
              />
            </div>
          </div>

          {/* Email Content Details */}
          <div className="flex-1 min-w-0">
            {/* Top row: Sender & Date */}
            <div className="flex items-center justify-between gap-1">
              <span className={`truncate text-xs ${isUnread ? 'font-bold text-[#0078d4] dark:text-[#2899f5]' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                {message.from_name || message.from_address}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 font-normal">
                {formatDate(message.date)}
              </span>
            </div>

            {/* Subject */}
            <div className={`text-xs truncate mt-0.5 ${isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'font-normal text-gray-700 dark:text-gray-300'}`}>
              {message.subject || '(Nessun oggetto)'}
            </div>

            {/* Snippet & Attachment icon */}
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              <span className="truncate pr-2">{message.preview_snippet || '...'}</span>
              <div className="flex items-center gap-1 shrink-0">
                {message.has_attachments === 1 && (
                  <Paperclip className="w-3 h-3 text-gray-400" />
                )}
                {message.is_starred === 1 && (
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hover Quick Actions (Desktop) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-white/90 dark:bg-[#292827]/90 backdrop-blur-xs px-1 py-0.5 rounded shadow-sm border border-gray-200 dark:border-[#3d3b39]"
        >
          <button
            onClick={() => deleteMessages([message.uid])}
            title="Elimina"
            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 hover:text-red-600 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => markRead([message.uid], isUnread)}
            title={isUnread ? 'Segna come letto' : 'Segna come da leggere'}
            className="p-1 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-500 hover:text-[#0078d4] rounded"
          >
            {isUnread ? <MailOpen className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => toggleStar(message.uid)}
            title="Contrassegna"
            className="p-1 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-500 hover:text-amber-500 rounded"
          >
            <Star className={`w-3.5 h-3.5 ${message.is_starred === 1 ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
