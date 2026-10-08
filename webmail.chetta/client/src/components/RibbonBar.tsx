import React, { useState } from 'react';
import {
  PenSquare,
  Trash2,
  Archive,
  Mail,
  MailOpen,
  Flag,
  FolderInput,
  RefreshCw,
  AlertOctagon,
  ChevronDown,
  UserX,
  FolderX,
  AlertCircle
} from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';

export const RibbonBar: React.FC = () => {
  const {
    openCompose,
    selectedUids,
    selectedMessage,
    deleteMessages,
    markRead,
    toggleStar,
    moveMessages,
    folders,
    loadMessages,
    isLoadingMessages,
    activeFolder,
    emptyFolder,
    deleteFolder,
    blockSender
  } = useWebmailStore();

  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [deleteFolderError, setDeleteFolderError] = useState('');

  const isTrashOrJunk = /trash|cestino|eliminat|junk|spam|indesiderat/i.test(activeFolder || '');
  const isSystemFolder = /^(inbox|sent|drafts|trash|junk|deleted items|outbox|posta inviata|posta eliminata|posta indesiderata|bozze|cestino)$/i.test(activeFolder || '');
  const isCustomFolder = Boolean(activeFolder && !isSystemFolder);

  const handleEmptyFolder = () => {
    if (window.confirm(`Sei sicuro di voler svuotare definitivamente tutti i messaggi in "${activeFolder}"? L'operazione non è reversibile.`)) {
      emptyFolder(activeFolder);
    }
  };

  const confirmDeleteActiveFolder = async () => {
    if (!activeFolder) return;
    setIsDeletingFolder(true);
    setDeleteFolderError('');
    const res = await deleteFolder(activeFolder);
    setIsDeletingFolder(false);
    if (res.success) {
      setIsDeleteFolderModalOpen(false);
    } else {
      setDeleteFolderError(res.error || 'Impossibile eliminare la cartella');
    }
  };

  const targetUids = selectedUids.length > 0
    ? selectedUids
    : selectedMessage
    ? [selectedMessage.uid]
    : [];

  const hasSelection = targetUids.length > 0;

  const handleDelete = () => {
    if (hasSelection) {
      deleteMessages(targetUids);
    }
  };

  const handleMarkRead = (isRead: boolean) => {
    if (hasSelection) {
      markRead(targetUids, isRead);
    }
  };

  const handleArchive = () => {
    const archiveFolder = folders.find(f => /archiv/i.test(f.name) || f.special_use === 'archive')?.path || 'Archive';
    if (hasSelection) {
      moveMessages(targetUids, archiveFolder);
    }
  };

  const handleJunk = () => {
    const junkFolder = folders.find(f => /junk|spam|indesiderat/i.test(f.name) || f.special_use === 'junk')?.path || 'Junk';
    if (hasSelection) {
      moveMessages(targetUids, junkFolder);
    }
  };

  const handleBlockSenderRibbon = async () => {
    if (selectedMessage?.from_address) {
      if (
        window.confirm(
          `Vuoi bloccare il mittente "${selectedMessage.from_address}" e spostare questo messaggio nella Posta indesiderata? I futuri messaggi verranno bloccati automaticamente.`
        )
      ) {
        await blockSender(selectedMessage.from_address, selectedMessage.uid, selectedMessage.folder_path);
      }
    }
  };

  return (
    <div className="h-11 bg-white dark:bg-[#201f1e] border-b border-gray-200 dark:border-[#323130] flex items-center px-3 gap-2 select-none shrink-0 overflow-x-auto shadow-xs">
      {/* New Message Main Action */}
      <button
        onClick={() => openCompose()}
        className="h-8 px-3.5 bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white font-semibold text-xs rounded-sm flex items-center gap-2 transition-colors shadow-sm shrink-0"
      >
        <PenSquare className="w-3.5 h-3.5" />
        <span>Nuovo messaggio</span>
      </button>

      <div className="h-5 w-[1px] bg-gray-300 dark:bg-[#3d3b39] mx-1 shrink-0" />

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={!hasSelection}
          className="h-8 px-2.5 rounded-sm hover:bg-gray-100 dark:hover:bg-[#292827] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          <span className="hidden sm:inline">Elimina</span>
        </button>

        {/* Empty folder for Trash/Junk */}
        {isTrashOrJunk && (
          <button
            onClick={handleEmptyFolder}
            title="Svuota completamente la cartella"
            className="h-8 px-2.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-colors border border-red-200 dark:border-red-900/40 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Svuota cartella</span>
          </button>
        )}

        {/* Delete custom folder */}
        {isCustomFolder && (
          <button
            onClick={() => {
              setDeleteFolderError('');
              setIsDeleteFolderModalOpen(true);
            }}
            title={`Elimina definitivamente la cartella "${activeFolder}"`}
            className="h-8 px-2.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-colors border border-red-200 dark:border-red-900/40 shrink-0"
          >
            <FolderX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Elimina cartella</span>
          </button>
        )}

        {/* Archive */}
        <button
          onClick={handleArchive}
          disabled={!hasSelection}
          className="h-8 px-2.5 rounded-sm hover:bg-gray-100 dark:hover:bg-[#292827] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Archive className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Archivia</span>
        </button>

        {/* Junk / Spam */}
        <button
          onClick={handleJunk}
          disabled={!hasSelection}
          className="h-8 px-2.5 rounded-sm hover:bg-gray-100 dark:hover:bg-[#292827] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">Posta indesiderata</span>
        </button>

        {/* Block Sender */}
        {selectedMessage && (
          <button
            onClick={handleBlockSenderRibbon}
            title={`Blocca mittente (${selectedMessage.from_address})`}
            className="h-8 px-2.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1.5 transition-colors"
          >
            <UserX className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden lg:inline">Blocca</span>
          </button>
        )}

        {/* Mark Read/Unread */}
        <button
          onClick={() => handleMarkRead(true)}
          disabled={!hasSelection}
          title="Segna come già letto"
          className="h-8 px-2.5 rounded-sm hover:bg-gray-100 dark:hover:bg-[#292827] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <MailOpen className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Segna come letto</span>
        </button>

        <button
          onClick={() => handleMarkRead(false)}
          disabled={!hasSelection}
          title="Segna come da leggere"
          className="h-8 px-2.5 rounded-sm hover:bg-gray-100 dark:hover:bg-[#292827] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>

        {/* Flag */}
        <button
          onClick={() => {
            if (targetUids.length === 1) toggleStar(targetUids[0]);
          }}
          disabled={targetUids.length !== 1}
          className="h-8 px-2.5 rounded-sm hover:bg-gray-100 dark:hover:bg-[#292827] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Flag className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden lg:inline">Contrassegna</span>
        </button>
      </div>

      <div className="flex-1" />

      {/* Right Sync status */}
      <button
        onClick={() => loadMessages(true)}
        className="h-8 px-2.5 rounded-sm hover:bg-gray-100 dark:hover:bg-[#292827] text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5 transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-[#0078d4] ${isLoadingMessages ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">Aggiorna</span>
      </button>

      {/* In-App Delete Folder Confirmation Modal */}
      {isDeleteFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeletingFolder) setIsDeleteFolderModalOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-[#201f1e] rounded-xl shadow-2xl border border-gray-200 dark:border-[#323130] w-full max-w-md p-6 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Elimina cartella
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                  Sei sicuro di voler eliminare definitivamente la cartella <strong className="text-gray-900 dark:text-white font-semibold">"{activeFolder}"</strong>?
                </p>
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 leading-normal font-medium">
                  Tutti i messaggi in essa contenuti sul server IMAP verranno eliminati in modo irreversibile.
                </p>
                {deleteFolderError && (
                  <div className="mt-2.5 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{deleteFolderError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-[#2d2c2b]">
              <button
                type="button"
                onClick={() => setIsDeleteFolderModalOpen(false)}
                disabled={isDeletingFolder}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2928] rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDeleteActiveFolder}
                disabled={isDeletingFolder}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isDeletingFolder ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminazione...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Elimina cartella</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
