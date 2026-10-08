import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  Send,
  Paperclip,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  AlignLeft,
  AlignCenter,
  Save,
  Check
} from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';

export const ComposeModal: React.FC = () => {
  const { isComposeOpen, closeCompose, composeDraft, activeAccount, saveDraft } = useWebmailStore();

  const [toInput, setToInput] = useState('');
  const [toRecipients, setToRecipients] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Draft state
  const [draftUid, setDraftUid] = useState<number | undefined>(undefined);
  const [draftStatus, setDraftStatus] = useState<'saving' | 'saved' | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (composeDraft) {
      setToRecipients(composeDraft.to || []);
      setSubject(composeDraft.subject || '');
      setBodyHtml(composeDraft.body || '');
      setDraftUid(composeDraft.draftUid);
      if (editorRef.current) {
        editorRef.current.innerHTML = composeDraft.body || '';
      }
    } else {
      setToRecipients([]);
      setSubject('');
      setBodyHtml('');
      setAttachments([]);
      setDraftUid(undefined);
      setDraftStatus(null);
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  }, [composeDraft, isComposeOpen]);

  // Auto-save draft effect every 15 seconds
  useEffect(() => {
    if (!isComposeOpen) return;
    const timer = setTimeout(() => {
      if (subject.trim() || toRecipients.length > 0 || (editorRef.current?.innerHTML && editorRef.current.innerHTML !== '<br>')) {
        handleSaveDraft();
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [subject, toRecipients, ccRecipients, bccRecipients, bodyHtml]);

  const handleSaveDraft = async () => {
    const currentBody = editorRef.current?.innerHTML || bodyHtml;
    if (!subject.trim() && toRecipients.length === 0 && !currentBody.trim()) return;
    setDraftStatus('saving');
    const uid = await saveDraft({
      draftUid,
      to: toRecipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      subject,
      htmlBody: currentBody,
      textBody: editorRef.current?.innerText || '',
      inReplyTo: composeDraft?.inReplyTo
    });
    if (uid) {
      setDraftUid(uid);
      setDraftStatus('saved');
      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setDraftStatus(null);
    }
  };

  if (!isComposeOpen || !activeAccount) return null;

  const handleAddRecipient = (type: 'to' | 'cc' | 'bcc', val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (type === 'to' && !toRecipients.includes(trimmed)) {
      setToRecipients([...toRecipients, trimmed]);
      setToInput('');
    } else if (type === 'cc' && !ccRecipients.includes(trimmed)) {
      setCcRecipients([...ccRecipients, trimmed]);
      setCcInput('');
    } else if (type === 'bcc' && !bccRecipients.includes(trimmed)) {
      setBccRecipients([...bccRecipients, trimmed]);
      setBccInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'to' | 'cc' | 'bcc') => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const val = type === 'to' ? toInput : type === 'cc' ? ccInput : bccInput;
      handleAddRecipient(type, val);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatDoc = (cmd: string, val: string = '') => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const handleSend = async () => {
    if (toRecipients.length === 0 && !toInput.trim()) {
      alert('Inserisci almeno un destinatario');
      return;
    }

    const finalTo = [...toRecipients];
    if (toInput.trim()) finalTo.push(toInput.trim());

    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append('to', JSON.stringify(finalTo));
      formData.append('cc', JSON.stringify(ccRecipients));
      formData.append('bcc', JSON.stringify(bccRecipients));
      formData.append('subject', subject);
      formData.append('htmlBody', editorRef.current?.innerHTML || bodyHtml);
      formData.append('textBody', editorRef.current?.innerText || '');

      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await fetch(`/api/mail/${activeAccount.id}/send`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        closeCompose();
      } else {
        alert(data.error || 'Errore durante l\'invio');
      }
    } catch (e: any) {
      alert('Errore di connessione durante l\'invio');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`fixed z-50 bg-white dark:bg-[#201f1e] shadow-2xl border border-gray-300 dark:border-[#3d3b39] flex flex-col transition-all duration-200 ${
        isMaximized
          ? 'inset-0 sm:inset-6 rounded-none sm:rounded-lg'
          : 'inset-0 sm:inset-auto sm:bottom-0 sm:right-6 sm:w-[600px] sm:h-[520px] rounded-none sm:rounded-t-lg'
      }`}
    >
      {/* Header */}
      <div className="bg-[#0078d4] text-white px-4 py-2 sm:rounded-t-lg flex items-center justify-between select-none">
        <span className="font-semibold text-xs truncate">
          {subject ? `Nuovo messaggio: ${subject}` : 'Nuovo messaggio'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:bg-white/20 rounded"
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={closeCompose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recipients & Subject Fields */}
      <div className="p-3 border-b border-gray-200 dark:border-[#323130] space-y-2 text-xs">
        {/* To field */}
        <div className="flex items-center gap-2">
          <span className="w-12 font-medium text-gray-500 dark:text-gray-400">A:</span>
          <div className="flex-1 flex flex-wrap items-center gap-1">
            {toRecipients.map((email, idx) => (
              <span
                key={idx}
                className="bg-blue-100 dark:bg-blue-900/50 text-[#0078d4] dark:text-[#2899f5] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
              >
                {email}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-red-500"
                  onClick={() => setToRecipients(toRecipients.filter((_, i) => i !== idx))}
                />
              </span>
            ))}
            <input
              type="text"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'to')}
              onBlur={() => handleAddRecipient('to', toInput)}
              placeholder={toRecipients.length === 0 ? 'Aggiungi destinatari...' : ''}
              className="flex-1 min-w-[120px] bg-transparent outline-none text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            {!showCc && (
              <button onClick={() => setShowCc(true)} className="hover:text-[#0078d4]">
                Cc
              </button>
            )}
            {!showBcc && (
              <button onClick={() => setShowBcc(true)} className="hover:text-[#0078d4]">
                Ccn
              </button>
            )}
          </div>
        </div>

        {/* CC field */}
        {showCc && (
          <div className="flex items-center gap-2">
            <span className="w-12 font-medium text-gray-500 dark:text-gray-400">Cc:</span>
            <div className="flex-1 flex flex-wrap items-center gap-1">
              {ccRecipients.map((email, idx) => (
                <span
                  key={idx}
                  className="bg-gray-100 dark:bg-[#2d2c2a] text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1"
                >
                  {email}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => setCcRecipients(ccRecipients.filter((_, i) => i !== idx))}
                  />
                </span>
              ))}
              <input
                type="text"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'cc')}
                onBlur={() => handleAddRecipient('cc', ccInput)}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* BCC field */}
        {showBcc && (
          <div className="flex items-center gap-2">
            <span className="w-12 font-medium text-gray-500 dark:text-gray-400">Ccn:</span>
            <div className="flex-1 flex flex-wrap items-center gap-1">
              {bccRecipients.map((email, idx) => (
                <span
                  key={idx}
                  className="bg-gray-100 dark:bg-[#2d2c2a] text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1"
                >
                  {email}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => setBccRecipients(bccRecipients.filter((_, i) => i !== idx))}
                  />
                </span>
              ))}
              <input
                type="text"
                value={bccInput}
                onChange={(e) => setBccInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'bcc')}
                onBlur={() => handleAddRecipient('bcc', bccInput)}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-[#2d2c2a]">
          <span className="w-12 font-medium text-gray-500 dark:text-gray-400">Oggetto:</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Aggiungi un oggetto..."
            className="flex-1 bg-transparent outline-none font-medium text-gray-900 dark:text-white text-xs"
          />
        </div>
      </div>

      {/* Attachments Chips List */}
      {attachments.length > 0 && (
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-[#252423] border-b border-gray-200 dark:border-[#323130] flex flex-wrap gap-1.5 text-xs">
          {attachments.map((file, idx) => (
            <span
              key={idx}
              className="bg-white dark:bg-[#2f2e2d] border border-gray-200 dark:border-[#3d3b39] px-2 py-1 rounded flex items-center gap-1.5 text-gray-700 dark:text-gray-300 shadow-xs"
            >
              <Paperclip className="w-3 h-3 text-blue-500" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <span className="text-[10px] text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
              <X
                className="w-3 h-3 cursor-pointer text-gray-400 hover:text-red-500"
                onClick={() => handleRemoveAttachment(idx)}
              />
            </span>
          ))}
        </div>
      )}

      {/* Rich Text Editor Body */}
      <div
        ref={editorRef}
        contentEditable
        onInput={() => {
          if (editorRef.current) setBodyHtml(editorRef.current.innerHTML);
        }}
        className="flex-1 p-4 outline-none overflow-y-auto text-xs sm:text-sm text-gray-900 dark:text-white font-sans prose dark:prose-invert max-w-none"
      />

      {/* Formatting & Send Action Bar */}
      <div className="p-2.5 sm:p-3 border-t border-gray-200 dark:border-[#323130] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 select-none bg-gray-50 dark:bg-[#1b1a19] shrink-0">
        {/* Send Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'Invio...' : 'Invia'}</span>
          </button>

          {/* Attach file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#323130] rounded text-gray-600 dark:text-gray-300"
            title="Allega file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Formatting buttons */}
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <button onClick={() => formatDoc('bold')} className="p-1 hover:bg-gray-200 dark:hover:bg-[#323130] rounded" title="Grassetto">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => formatDoc('italic')} className="p-1 hover:bg-gray-200 dark:hover:bg-[#323130] rounded" title="Corsivo">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => formatDoc('underline')} className="p-1 hover:bg-gray-200 dark:hover:bg-[#323130] rounded" title="Sottolineato">
            <Underline className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-[1px] bg-gray-300 dark:bg-[#3d3b39] mx-0.5" />
          <button onClick={() => formatDoc('insertUnorderedList')} className="p-1 hover:bg-gray-200 dark:hover:bg-[#323130] rounded" title="Elenco puntato">
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => formatDoc('insertOrderedList')} className="p-1 hover:bg-gray-200 dark:hover:bg-[#323130] rounded" title="Elenco numerato">
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Draft save & Discard */}
        <div className="flex items-center gap-2">
          {draftStatus && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {draftStatus === 'saving' ? (
                'Salvataggio bozza...'
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>Bozza salvata {lastSavedTime}</span>
                </>
              )}
            </span>
          )}

          <button
            onClick={handleSaveDraft}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#323130] text-gray-600 dark:text-gray-300 rounded text-xs flex items-center gap-1"
            title="Salva come bozza ora"
          >
            <Save className="w-4 h-4" />
          </button>

          <button
            onClick={closeCompose}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 rounded"
            title="Chiudi editor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

