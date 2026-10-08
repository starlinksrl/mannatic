import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Star,
  Download,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  Paperclip,
  ShieldAlert,
  ArrowLeft,
  Printer,
  FileDown,
  Eye,
  X,
  UserX
} from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';
import { QuickReply } from './QuickReply.js';

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return <ImageIcon className="w-4 h-4 text-purple-500" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  }
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
    return <FileText className="w-4 h-4 text-rose-500" />;
  }
  return <FileCode className="w-4 h-4 text-blue-500" />;
}

export const MailView: React.FC = () => {
  const {
    selectedMessage,
    activeAccount,
    deleteMessages,
    moveMessages,
    toggleStar,
    openCompose,
    loadMessageDetail,
    setMobileView,
    folders,
    blockSender
  } = useWebmailStore();

  const [imagesAllowed, setImagesAllowed] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    type: 'image' | 'pdf';
    url: string;
    filename: string;
  } | null>(null);

  const emailBodyRef = useRef<HTMLDivElement>(null);

  // Reset image allowance state when switching between emails
  useEffect(() => {
    setImagesAllowed(false);
  }, [selectedMessage?.uid]);

  if (!selectedMessage) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#faf9f8] dark:bg-[#1b1a19] text-gray-400 p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#252423] flex items-center justify-center mb-3">
          <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nessun elemento selezionato</h3>
        <p className="text-xs text-gray-400 max-w-sm mt-1">
          Scegli un messaggio dall'elenco a sinistra per visualizzarne il contenuto e gli allegati.
        </p>
      </div>
    );
  }

  const toList: Array<{ name?: string; address?: string }> = (() => {
    try {
      return JSON.parse(selectedMessage.to_addresses || '[]');
    } catch {
      return [];
    }
  })();

  const handleReply = (replyAll = false) => {
    const toRecipients = [selectedMessage.from_address];
    if (replyAll) {
      toList.forEach(t => {
        if (t.address && t.address !== activeAccount?.email && !toRecipients.includes(t.address)) {
          toRecipients.push(t.address);
        }
      });
    }

    openCompose({
      to: toRecipients,
      subject: selectedMessage.subject.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`,
      body: `<br><br><hr><p><b>Da:</b> ${selectedMessage.from_name || selectedMessage.from_address} &lt;${selectedMessage.from_address}&gt;<br><b>Data:</b> ${selectedMessage.date}<br><b>Oggetto:</b> ${selectedMessage.subject}</p>${selectedMessage.body_html || selectedMessage.body_text || ''}`,
      inReplyTo: selectedMessage.message_id
    });
  };

  const handleForward = () => {
    openCompose({
      to: [],
      subject: selectedMessage.subject.startsWith('Fwd:') ? selectedMessage.subject : `Fwd: ${selectedMessage.subject}`,
      body: `<br><br><hr><p><b>--- Messaggio Inoltrato ---</b><br><b>Da:</b> ${selectedMessage.from_name || selectedMessage.from_address} &lt;${selectedMessage.from_address}&gt;<br><b>Data:</b> ${selectedMessage.date}<br><b>Oggetto:</b> ${selectedMessage.subject}</p>${selectedMessage.body_html || selectedMessage.body_text || ''}`
    });
  };

  const handleLoadImages = () => {
    setImagesAllowed(true);
    // Instant client-side unblock for maximum responsiveness
    if (emailBodyRef.current) {
      const blockedImgs = emailBodyRef.current.querySelectorAll<HTMLImageElement>('img[data-blocked-src]');
      blockedImgs.forEach(img => {
        const original = img.getAttribute('data-blocked-src');
        if (original) {
          img.src = original;
          img.classList.remove('external-image-blocked');
        }
      });
    }
    loadMessageDetail(selectedMessage.uid, true);
  };

  const handleBlockSender = async () => {
    if (!selectedMessage?.from_address) return;
    if (
      window.confirm(
        `Vuoi bloccare il mittente "${selectedMessage.from_address}" e spostare questa email nella Posta indesiderata? Tutti i futuri messaggi da questo indirizzo verranno bloccati automaticamente.`
      )
    ) {
      await blockSender(selectedMessage.from_address, selectedMessage.uid, selectedMessage.folder_path);
    }
  };

  const downloadAttachmentUrl = (filename: string) => {
    return `/api/mail/${activeAccount?.id}/attachment?folder=${encodeURIComponent(selectedMessage.folder_path)}&uid=${selectedMessage.uid}&filename=${encodeURIComponent(filename)}`;
  };

  return (
    <div className="flex-1 bg-white dark:bg-[#201f1e] flex flex-col h-full overflow-y-auto momentum-scroll">
      {/* Mobile Back Button Bar */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-gray-200 dark:border-[#323130] bg-gray-50 dark:bg-[#252423]">
        <button
          onClick={() => setMobileView('mail_list')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#0078d4]"
        >
          <ArrowLeft className="w-4 h-4" /> Torna all'elenco
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => deleteMessages([selectedMessage.uid])} className="p-1.5 text-red-500 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleReply(false)} className="p-1.5 text-[#0078d4] rounded">
            <Reply className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Mail Header */}
      <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-[#2b2a28]">
        {/* Subject */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
            {selectedMessage.subject || '(Nessun oggetto)'}
          </h1>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggleStar(selectedMessage.uid)}
              title="Contrassegna"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#292827] rounded text-gray-400 hover:text-amber-500"
            >
              <Star className={`w-4 h-4 ${selectedMessage.is_starred === 1 ? 'fill-amber-500 text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sender & Recipient Details */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Sender Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#0078d4] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {(selectedMessage.from_name || selectedMessage.from_address || '?').slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {selectedMessage.from_name || selectedMessage.from_address}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                &lt;{selectedMessage.from_address}&gt;
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                A: {toList.map(t => t.name || t.address).join(', ') || 'Me'}
              </div>
            </div>
          </div>

          {/* Date & Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {format(new Date(selectedMessage.date), 'dd MMMM yyyy HH:mm', { locale: it })}
            </span>

            {/* Action buttons (Reply / Reply All / Forward / Print / EML) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleReply(false)}
                title="Rispondi"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#292827] rounded text-gray-600 dark:text-gray-300"
              >
                <Reply className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReply(true)}
                title="Rispondi a tutti"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#292827] rounded text-gray-600 dark:text-gray-300"
              >
                <ReplyAll className="w-4 h-4" />
              </button>
              <button
                onClick={handleForward}
                title="Inoltra"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#292827] rounded text-gray-600 dark:text-gray-300"
              >
                <Forward className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-[#323130] mx-0.5" />
              <button
                onClick={() => window.print()}
                title="Stampa email"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#292827] rounded text-gray-600 dark:text-gray-300"
              >
                <Printer className="w-4 h-4" />
              </button>
              <a
                href={`/api/mail/${activeAccount?.id}/eml/${selectedMessage.uid}?folder=${encodeURIComponent(selectedMessage.folder_path)}`}
                download={`${selectedMessage.subject || 'messaggio'}.eml`}
                title="Scarica sorgente .eml"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#292827] rounded text-gray-600 dark:text-gray-300"
              >
                <FileDown className="w-4 h-4" />
              </a>
              <div className="w-px h-4 bg-gray-200 dark:bg-[#323130] mx-0.5" />
              <button
                onClick={handleBlockSender}
                title="Blocca mittente e sposta in Posta Indesiderata"
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
              >
                <UserX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* External Images Privacy Warning Banner */}
      {!imagesAllowed && selectedMessage.raw_has_external_images && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-y border-amber-200 dark:border-amber-900/50 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Per proteggere la tua privacy, il caricamento di immagini remote è stato bloccato.</span>
          </div>
          <button
            onClick={handleLoadImages}
            className="px-2.5 py-1 bg-white dark:bg-[#292827] border border-amber-300 dark:border-amber-700 rounded font-semibold text-[#0078d4] hover:underline shrink-0 ml-3"
          >
            Mostra immagini
          </button>
        </div>
      )}

      {/* Attachments Section */}
      {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-[#2b2a28] bg-gray-50/70 dark:bg-[#1b1a19]/50">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <Paperclip className="w-3.5 h-3.5 text-gray-500" />
            <span>Allegati ({selectedMessage.attachments.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedMessage.attachments.map((att, idx) => {
              const isImg = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(
                att.filename.split('.').pop()?.toLowerCase() || ''
              );
              const isPdf = att.filename.toLowerCase().endsWith('.pdf');
              const attUrl = `/api/mail/${activeAccount?.id}/attachment?folder=${encodeURIComponent(selectedMessage.folder_path)}&uid=${selectedMessage.uid}&filename=${encodeURIComponent(att.filename)}`;

              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-white dark:bg-[#252423] border border-gray-200 dark:border-[#323130] rounded-lg shadow-sm hover:border-[#0078d4] dark:hover:border-[#2899f5] transition-colors"
                >
                  {getFileIcon(att.filename)}
                  <div className="flex flex-col text-left max-w-[150px] sm:max-w-[220px]">
                    <span className="text-xs font-medium text-gray-900 dark:text-white truncate" title={att.filename}>
                      {att.filename}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatBytes(att.size)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-1">
                    {(isImg || isPdf) && (
                      <button
                        onClick={() => setPreviewModal({ type: isImg ? 'image' : 'pdf', url: attUrl, filename: att.filename })}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-[#2d2c2a] rounded text-gray-500 hover:text-[#0078d4]"
                        title="Anteprima rapida"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <a
                      href={attUrl}
                      download={att.filename}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-[#2d2c2a] rounded text-gray-500 hover:text-[#0078d4]"
                      title="Scarica file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Email Body Content */}
      <div className="p-4 sm:p-6 flex-1 text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-sans overflow-x-auto print:p-0">
        {selectedMessage.body_html ? (
          <div
            ref={emailBodyRef}
            className="email-rendered-body prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm">
            {selectedMessage.body_text || '(Messaggio senza contenuto testuale)'}
          </pre>
        )}

        {/* Quick Reply Box (hidden during print) */}
        <div className="print:hidden">
          <QuickReply onSent={() => alert('Risposta inviata con successo!')} />
        </div>
      </div>

      {/* Lightbox / PDF Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-3 px-2">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-sm truncate">{previewModal.filename}</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={previewModal.url}
                download={previewModal.filename}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-semibold rounded-md shadow transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Scarica
              </a>
              <button
                onClick={() => setPreviewModal(null)}
                className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="relative flex items-center justify-center max-w-full max-h-[85vh] overflow-auto">
            {previewModal.type === 'image' ? (
              <img
                src={previewModal.url}
                alt={previewModal.filename}
                className="max-h-[80vh] max-w-[90vw] object-contain rounded-md shadow-2xl bg-[#1e1e1e]"
              />
            ) : (
              <iframe
                src={previewModal.url}
                title={previewModal.filename}
                className="w-[90vw] max-w-4xl h-[80vh] rounded-md shadow-2xl bg-white"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
