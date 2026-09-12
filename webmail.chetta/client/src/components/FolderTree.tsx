import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  AlertOctagon,
  Archive,
  Folder as FolderIcon,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Star,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';
import { Folder } from '../types/index.js';

export const FolderTree: React.FC = () => {
  const {
    folders,
    activeFolder,
    setActiveFolder,
    activeAccount,
    refreshFolders,
    createFolder,
    deleteFolder
  } = useWebmailStore();

  const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);

  // Folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Folder deletion state
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Close modals or creation form on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (folderToDelete && !isDeletingLoading) {
          setFolderToDelete(null);
        } else if (isCreatingFolder && !isCreatingLoading) {
          setIsCreatingFolder(false);
          setCreateError('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [folderToDelete, isDeletingLoading, isCreatingFolder, isCreatingLoading]);

  const isSystemFolder = (folder: Folder) => {
    if (folder.special_use) return true;
    const p = folder.path.toLowerCase();
    const name = folder.name.toLowerCase();
    return (
      /^(inbox|sent|drafts|trash|junk|archive|deleted items|outbox)$/i.test(p) ||
      /^(posta in arrivo|posta inviata|bozze|posta eliminata|cestino|posta indesiderata|archivio|tutti i messaggi)$/i.test(name) ||
      /^(inbox|sent|draft|trash|junk|spam|archiv)/i.test(name) ||
      p.startsWith('deleted items/') ||
      p.startsWith('trash/') ||
      p.startsWith('cestino/')
    );
  };

  const getFolderIcon = (folder: Folder) => {
    const p = folder.path.toLowerCase();
    const name = folder.name.toLowerCase();

    if (p === 'inbox' || folder.special_use === 'inbox') {
      return <Inbox className="w-4 h-4 text-[#0078d4]" />;
    }
    if (folder.special_use === 'sent' || /sent|inviati|inviata/i.test(name)) {
      return <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (folder.special_use === 'drafts' || /draft|bozze/i.test(name)) {
      return <FileEdit className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
    if (folder.special_use === 'trash' || /trash|cestino|eliminat/i.test(name)) {
      return <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    }
    if (folder.special_use === 'junk' || /junk|spam|indesiderat/i.test(name)) {
      return <AlertOctagon className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    }
    if (folder.special_use === 'archive' || /archiv/i.test(name)) {
      return <Archive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
    return <FolderIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || !activeAccount) return;

    setIsCreatingLoading(true);
    setCreateError('');
    const result = await createFolder(trimmed);
    setIsCreatingLoading(false);

    if (result.success) {
      setNewFolderName('');
      setIsCreatingFolder(false);
    } else {
      setCreateError(result.error || 'Impossibile creare la cartella');
    }
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    setIsDeletingLoading(true);
    setDeleteError('');
    const result = await deleteFolder(folderToDelete.path);
    setIsDeletingLoading(false);

    if (result.success) {
      setFolderToDelete(null);
    } else {
      setDeleteError(result.error || 'Impossibile eliminare la cartella');
    }
  };

  const inboxFolder = folders.find(f => f.path.toUpperCase() === 'INBOX');
  const sentFolder = folders.find(f => f.special_use === 'sent' || /sent|inviati/i.test(f.name));

  return (
    <div className="w-60 bg-white dark:bg-[#201f1e] border-r border-gray-200 dark:border-[#323130] flex flex-col h-full select-none shrink-0 overflow-y-auto">
      {/* Account Header */}
      <div className="p-3 border-b border-gray-100 dark:border-[#2d2c2a]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Cartelle Posta
        </h2>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate mt-0.5">
          {activeAccount?.email}
        </p>
      </div>

      <div className="flex-1 py-2 space-y-3">
        {/* Preferiti (Favorites) */}
        <div>
          <button
            onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
            className="w-full px-3 py-1 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Preferiti</span>
            </span>
            {isFavoritesOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {isFavoritesOpen && (
            <div className="mt-1 space-y-0.5">
              {inboxFolder && (
                <button
                  onClick={() => setActiveFolder(inboxFolder.path)}
                  className={`w-full px-4 py-1.5 flex items-center justify-between text-xs font-medium transition-colors ${
                    activeFolder === inboxFolder.path
                      ? 'bg-blue-50 dark:bg-[#323130] text-[#0078d4] font-semibold border-l-4 border-[#0078d4]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#292827]'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Inbox className="w-4 h-4 text-[#0078d4]" />
                    <span>Posta in arrivo</span>
                  </span>
                  {inboxFolder.unread_messages > 0 && (
                    <span className="text-[#0078d4] font-bold text-xs">
                      {inboxFolder.unread_messages}
                    </span>
                  )}
                </button>
              )}

              {sentFolder && (
                <button
                  onClick={() => setActiveFolder(sentFolder.path)}
                  className={`w-full px-4 py-1.5 flex items-center justify-between text-xs font-medium transition-colors ${
                    activeFolder === sentFolder.path
                      ? 'bg-blue-50 dark:bg-[#323130] text-[#0078d4] font-semibold border-l-4 border-[#0078d4]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#292827]'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Send className="w-4 h-4 text-emerald-600" />
                    <span>Posta inviata</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tutte le Cartelle (All Folders) */}
        <div>
          <div className="w-full px-3 py-1 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
            <button
              onClick={() => setIsFoldersOpen(!isFoldersOpen)}
              className="flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-gray-200 flex-1 text-left"
            >
              <span>Cartelle</span>
              {isFoldersOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFoldersOpen(true);
                setIsCreatingFolder(true);
                setCreateError('');
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-[#2e2d2c] rounded text-gray-400 hover:text-[#0078d4] dark:hover:text-[#2899f5] transition-colors"
              title="Crea nuova cartella"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isFoldersOpen && (
            <div className="mt-1 space-y-0.5">
              {folders
                .filter(folder => folder.special_use !== 'trash_child' && !folder.path.toLowerCase().startsWith('deleted items/') && !folder.path.toLowerCase().startsWith('trash/') && !folder.path.toLowerCase().startsWith('cestino/'))
                .map(folder => {
                const isActive = activeFolder === folder.path;
                const canDelete = !isSystemFolder(folder);
                return (
                  <div
                    key={folder.id}
                    onClick={() => setActiveFolder(folder.path)}
                    className={`group w-full px-4 py-1.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 dark:bg-[#323130] text-[#0078d4] font-semibold border-l-4 border-[#0078d4]'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#292827]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate min-w-0 flex-1">
                      {getFolderIcon(folder)}
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {(() => {
                        const isDrafts = folder.special_use === 'drafts' || /draft|bozze/i.test(folder.name);
                        const count = isDrafts ? folder.total_messages : folder.unread_messages;
                        if (!count || count <= 0) return null;
                        return (
                          <span className="text-[#0078d4] font-bold text-xs">
                            {count}
                          </span>
                        );
                      })()}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError('');
                            setFolderToDelete(folder);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                          title={`Elimina cartella "${folder.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add folder button / input */}
              {!isCreatingFolder ? (
                <button
                  onClick={() => {
                    setIsCreatingFolder(true);
                    setCreateError('');
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2 text-xs text-gray-500 hover:text-[#0078d4] dark:hover:text-[#2899f5] transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Nuova cartella</span>
                </button>
              ) : (
                <div className="px-3 py-2.5 bg-blue-50/50 dark:bg-[#252423] rounded-lg border border-blue-200 dark:border-blue-900/50 m-2 space-y-2 animate-in fade-in duration-150">
                  <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                    <span>Nuova cartella</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingFolder(false);
                        setCreateError('');
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateFolder} className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      disabled={isCreatingLoading}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Es: Lavoro, Archivio..."
                      className="w-full h-8 px-2.5 text-xs border border-gray-300 dark:border-[#3d3b39] focus:border-[#0078d4] rounded bg-white dark:bg-[#1b1a19] text-gray-900 dark:text-white outline-none"
                    />
                    {createError && (
                      <div className="p-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded text-[10px] text-red-600 dark:text-red-400 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{createError}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 justify-end pt-0.5">
                      <button
                        type="button"
                        disabled={isCreatingLoading}
                        onClick={() => {
                          setIsCreatingFolder(false);
                          setCreateError('');
                        }}
                        className="px-2.5 py-1 text-[11px] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#323130] rounded"
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingLoading || !newFolderName.trim()}
                        className="px-3 py-1 bg-[#0078d4] hover:bg-[#106ebe] text-white text-[11px] font-semibold rounded flex items-center gap-1 shadow-xs disabled:opacity-50"
                      >
                        {isCreatingLoading ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Creazione...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Crea</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Credit */}
        <div className="p-3 border-t border-gray-100 dark:border-[#2d2c2b] text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
          <p className="font-semibold text-gray-600 dark:text-gray-300">CryptoMail</p>
          <p className="truncate mt-0.5" title="Realizzata da Mannarini Technology (Star Link S.r.l.) by Mannarini Francesco 2026">
            Mannarini Technology • 2026
          </p>
        </div>
      </div>

      {/* In-App Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeletingLoading) setFolderToDelete(null);
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
                  Sei sicuro di voler eliminare definitivamente la cartella <strong className="text-gray-900 dark:text-white font-semibold">"{folderToDelete.name}"</strong>?
                </p>
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 leading-normal font-medium">
                  Tutti i messaggi in essa contenuti sul server IMAP verranno eliminati in modo irreversibile.
                </p>
                {deleteError && (
                  <div className="mt-2.5 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-[#2d2c2b]">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                disabled={isDeletingLoading}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2928] rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDeleteFolder}
                disabled={isDeletingLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isDeletingLoading ? (
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
