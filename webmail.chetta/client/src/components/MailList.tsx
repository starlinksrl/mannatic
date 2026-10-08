import React, { useState } from 'react';
import { MailListItem } from './MailListItem.js';
import { useWebmailStore } from '../store/useWebmailStore.js';
import { Filter, CheckSquare, Inbox, RefreshCw, ChevronDown, Loader2, Folder, ChevronRight } from 'lucide-react';

export const MailList: React.FC = () => {
  const {
    messages,
    selectedMessage,
    selectedUids,
    filterTab,
    messageFilter,
    isLoadingMessages,
    isLoadingMore,
    hasMoreMessages,
    totalMessages,
    activeFolder,
    setFilterTab,
    setMessageFilter,
    setSelectedMessage,
    toggleSelectUid,
    selectAllUids,
    clearSelection,
    loadMessageDetail,
    loadMessages,
    loadMoreMessages,
    openCompose,
    setMobileView
  } = useWebmailStore();

  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const isDraftsFolder = /draft|bozze/i.test(activeFolder || '');

  const handleSelectMessage = (msg: any) => {
    if (isDraftsFolder) {
      let toList: string[] = [];
      if (Array.isArray(msg.to)) {
        toList = msg.to;
      } else if (typeof msg.to === 'string') {
        toList = msg.to.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      openCompose({
        draftUid: msg.uid,
        to: toList,
        subject: msg.subject || '',
        body: msg.body_html || msg.body_text || msg.snippet || ''
      });
      return;
    }
    setSelectedMessage(msg);
    loadMessageDetail(msg.uid);
    setMobileView('mail_detail');
  };

  const isAllSelected = messages.length > 0 && selectedUids.length === messages.length;

  React.useEffect(() => {
    if (!selectedMessage && messages.length > 0 && window.innerWidth >= 768 && !isDraftsFolder) {
      handleSelectMessage(messages[0]);
    }
  }, [messages, isDraftsFolder]);

  return (
    <div className="w-full md:w-80 lg:w-96 bg-white dark:bg-[#201f1e] border-r border-gray-200 dark:border-[#323130] flex flex-col h-full shrink-0 select-none">
      {/* Mobile Current Folder Bar */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#252423] border-b border-gray-200 dark:border-[#323130]">
        <div className="flex items-center gap-2 min-w-0">
          <Folder className="w-4 h-4 text-[#0078d4] shrink-0" />
          <span className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
            {activeFolder || 'Posta in arrivo'}
          </span>
          {totalMessages > 0 && (
            <span className="text-[10px] text-gray-400 font-medium">({totalMessages})</span>
          )}
        </div>
        <button
          onClick={() => setMobileView('folders')}
          className="text-[11px] font-semibold text-[#0078d4] hover:underline flex items-center gap-0.5 shrink-0"
        >
          <span>Cartelle</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Tabs: In evidenza (Focused) / Altra (Other) & Filters */}
      <div className="border-b border-gray-200 dark:border-[#323130] px-3 pt-2 pb-1 flex items-center justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setFilterTab('focused')}
            className={`pb-2 transition-colors relative ${
              filterTab === 'focused'
                ? 'text-[#0078d4] dark:text-[#2899f5] font-bold border-b-2 border-[#0078d4]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            In evidenza
          </button>

          <button
            onClick={() => setFilterTab('other')}
            className={`pb-2 transition-colors relative ${
              filterTab === 'other'
                ? 'text-[#0078d4] dark:text-[#2899f5] font-bold border-b-2 border-[#0078d4]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Altra
          </button>
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#2b2a28]"
          >
            <Filter className="w-3.5 h-3.5 text-[#0078d4]" />
            <span className="capitalize">{messageFilter === 'all' ? 'Filtro' : messageFilter}</span>
          </button>

          {isFilterDropdownOpen && (
            <div
              className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#252423] rounded-md shadow-xl border border-gray-200 dark:border-[#323130] py-1 z-40 text-xs"
              onMouseLeave={() => setIsFilterDropdownOpen(false)}
            >
              <button
                onClick={() => {
                  setMessageFilter('all');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2f2e2d] ${
                  messageFilter === 'all' ? 'font-bold text-[#0078d4]' : ''
                }`}
              >
                Tutti i messaggi
              </button>
              <button
                onClick={() => {
                  setMessageFilter('unread');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2f2e2d] ${
                  messageFilter === 'unread' ? 'font-bold text-[#0078d4]' : ''
                }`}
              >
                Non letti
              </button>
              <button
                onClick={() => {
                  setMessageFilter('starred');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2f2e2d] ${
                  messageFilter === 'starred' ? 'font-bold text-[#0078d4]' : ''
                }`}
              >
                Contrassegnati
              </button>
              <button
                onClick={() => {
                  setMessageFilter('attachments');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2f2e2d] ${
                  messageFilter === 'attachments' ? 'font-bold text-[#0078d4]' : ''
                }`}
              >
                Con allegati
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selection row if multiple selected */}
      {selectedUids.length > 0 && (
        <div className="bg-blue-50 dark:bg-[#292827] px-3 py-1.5 flex items-center justify-between text-xs text-[#0078d4] dark:text-[#2899f5] border-b border-blue-100 dark:border-[#323130]">
          <span>{selectedUids.length} selezionati</span>
          <div className="flex gap-2">
            <button onClick={selectAllUids} className="font-semibold hover:underline">
              Seleziona tutti
            </button>
            <button onClick={clearSelection} className="text-gray-500 hover:underline">
              Deseleziona
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-[#2d2c2a] momentum-scroll">
        {isLoadingMessages && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-[#0078d4]" />
            <span>Sincronizzazione messaggi...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4 text-gray-400 gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#292827] flex items-center justify-center">
              <Inbox className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nessuna email in questa cartella</p>
            <p className="text-[11px] text-gray-400 max-w-xs">
              Quando riceverai nuove email compariranno qui istantaneamente.
            </p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MailListItem
                key={msg.id}
                message={msg}
                isSelected={selectedMessage?.uid === msg.uid}
                isChecked={selectedUids.includes(msg.uid)}
                onSelect={() => handleSelectMessage(msg)}
                onToggleCheck={() => toggleSelectUid(msg.uid)}
              />
            ))}

            {/* Pagination / Load More Section */}
            <div className="p-3 bg-gray-50 dark:bg-[#1b1a19] border-t border-gray-100 dark:border-[#2f2e2d] text-center">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                Visualizzati {messages.length} {totalMessages > 0 ? `di ${totalMessages}` : ''} messaggi
              </p>
              {hasMoreMessages && (
                <button
                  onClick={() => loadMoreMessages()}
                  disabled={isLoadingMore}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0078d4] dark:text-[#2899f5] hover:bg-blue-50 dark:hover:bg-[#252423] rounded border border-blue-200 dark:border-[#323130] transition-colors w-full disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Caricamento altri messaggi...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Carica altri messaggi</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
