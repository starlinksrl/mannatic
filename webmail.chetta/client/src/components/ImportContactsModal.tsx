import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Mail, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';

interface ParsedPreview {
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export const ImportContactsModal: React.FC = () => {
  const { isImportContactsOpen, setIsImportContactsOpen, importContacts, extractContactsFromMail } = useWebmailStore();
  const [activeTab, setActiveTab] = useState<'file' | 'paste' | 'extract'>('file');

  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [detectedFormat, setDetectedFormat] = useState<string>('');
  const [parsedContacts, setParsedContacts] = useState<ParsedPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isImportContactsOpen) return null;

  const handleClose = () => {
    setIsImportContactsOpen(false);
    setRawText('');
    setFileName('');
    setDetectedFormat('');
    setParsedContacts([]);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const analyzeContent = (text: string, name = '') => {
    setErrorMessage('');
    setSuccessMessage('');
    const trimmed = text.trim();
    if (!trimmed) {
      setParsedContacts([]);
      return;
    }

    let format = 'CSV Generico';
    if (trimmed.includes('BEGIN:VCARD')) {
      format = 'vCard (.vcf)';
    } else {
      const lower = trimmed.slice(0, 1000).toLowerCase();
      if (lower.includes('given name') || lower.includes('e-mail 1 - value')) {
        format = 'Google Contacts (Gmail)';
      } else if (lower.includes('indirizzo di posta elettronica') || lower.includes('telefono ufficio')) {
        format = 'Outlook CSV (Italiano)';
      } else if (lower.includes('e-mail address') || lower.includes('business phone')) {
        format = 'Outlook / M365 CSV (Inglese)';
      }
    }
    setDetectedFormat(format);

    // Parse preview on client
    try {
      const items: ParsedPreview[] = [];
      if (format === 'vCard (.vcf)') {
        const cards = trimmed.split(/BEGIN:VCARD/i).slice(1);
        for (const card of cards) {
          const lines = card.split(/\r?\n/);
          let cName = '';
          let cEmail = '';
          let cPhone = '';
          let cCompany = '';
          for (const line of lines) {
            const colon = line.indexOf(':');
            if (colon === -1) continue;
            const prop = line.slice(0, colon).toUpperCase();
            const val = line.slice(colon + 1).trim();
            if (prop.startsWith('FN') && !cName) cName = val;
            if (prop.startsWith('EMAIL') && !cEmail) cEmail = val.toLowerCase();
            if (prop.startsWith('TEL') && !cPhone) cPhone = val;
            if (prop.startsWith('ORG') && !cCompany) cCompany = val.split(';')[0];
          }
          if (cEmail && cEmail.includes('@')) {
            items.push({ name: cName || cEmail.split('@')[0], email: cEmail, phone: cPhone, company: cCompany });
          }
        }
      } else {
        // CSV lines
        const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length > 1) {
          const delim = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
          const headers = lines[0].split(delim).map(h => h.toLowerCase().replace(/['"]/g, '').trim());

          let emailCol = headers.findIndex(h => h.includes('mail') || h.includes('posta'));
          let nameCol = headers.findIndex(h => h === 'nome' || h === 'name' || h === 'display name');
          let phoneCol = headers.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('cell'));
          let companyCol = headers.findIndex(h => h.includes('company') || h.includes('societ') || h.includes('azienda'));

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(delim).map(c => c.replace(/^["']|["']$/g, '').trim());
            const email = (cols[emailCol] || '').toLowerCase();
            if (email && email.includes('@')) {
              items.push({
                name: cols[nameCol] || email.split('@')[0],
                email,
                phone: cols[phoneCol] || undefined,
                company: cols[companyCol] || undefined
              });
            }
          }
        }
      }

      setParsedContacts(items);
      if (items.length === 0) {
        setErrorMessage('Nessun indirizzo email valido trovato nel file/testo fornito.');
      }
    } catch (e: any) {
      setErrorMessage(`Errore di analisi: ${e.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      analyzeContent(content, file.name);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setErrorMessage('Impossibile leggere il file selezionato');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedContacts.length === 0 && !rawText) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const count = await importContacts({ text: rawText, contacts: parsedContacts });
      if (count > 0) {
        setSuccessMessage(`Importati con successo ${count} contatti nella tua rubrica!`);
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setErrorMessage('Nessun nuovo contatto inserito.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante l\'importazione');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractFromMail = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const count = await extractContactsFromMail();
      setSuccessMessage(`Scansione completata: trovati e aggiunti ${count} contatti dalla posta!`);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante l\'estrazione dalla posta');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none">
      <div className="bg-white dark:bg-[#252423] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-[#3d3b39] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#323130] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0078d4] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Importa Contatti in Rubrica</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supporta file Google CSV, Outlook CSV, file vCard (.vcf) o estrazione automatica
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#323130] rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Tabs */}
        <div className="flex border-b border-gray-200 dark:border-[#323130] px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('file')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Carica File (CSV / vCard)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Incolla Testo
          </button>
          <button
            onClick={() => setActiveTab('extract')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'extract'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Mail className="w-4 h-4" /> Estrai da Email IMAP
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs text-gray-700 dark:text-gray-300">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-[#3d3b39] hover:border-[#0078d4] dark:hover:border-[#2899f5] rounded-xl p-8 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-[#1f1e1d]/50 flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0078d4] flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                  {fileName ? fileName : 'Seleziona o trascina qui il file contatti'}
                </p>
                <p className="text-gray-400 text-[11px]">
                  Formati supportati: CSV (Google Contacts, Outlook, Excel) e vCard (.vcf)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.vcf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {detectedFormat && (
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/40 text-[#0078d4] dark:text-[#2899f5] font-medium">
                  <span>Formato rilevato: <b>{detectedFormat}</b></span>
                  <span>{parsedContacts.length} contatti trovati</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <label className="font-semibold block">Incolla qui i dati CSV o i blocchi vCard</label>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  analyzeContent(e.target.value);
                }}
                placeholder="Incolla le righe CSV con le intestazioni o il testo di un file vCard (BEGIN:VCARD...)"
                className="w-full p-3 font-mono text-xs bg-white dark:bg-[#1f1e1d] border border-gray-200 dark:border-[#3d3b39] rounded-xl outline-none focus:border-[#0078d4]"
              />
              {detectedFormat && (
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/40 text-[#0078d4] dark:text-[#2899f5] font-medium">
                  <span>Formato rilevato: <b>{detectedFormat}</b></span>
                  <span>{parsedContacts.length} contatti trovati</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXTRACT FROM MAIL */}
          {activeTab === 'extract' && (
            <div className="p-6 bg-gray-50 dark:bg-[#1f1e1d] rounded-xl border border-gray-200 dark:border-[#323130] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Estrazione Automatica dalla Posta Elettronica
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Questa funzione scansiona istantaneamente le email presenti nella Posta in Arrivo e nella Posta Inviata, estraendo nomi e indirizzi di tutti i tuoi corrispondenti abituali per creare la rubrica con un solo click.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleExtractFromMail}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold rounded-lg shadow-sm flex items-center gap-2 mx-auto transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scansione email in corso...</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Avvia estrazione automatica</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW TABLE (For file & paste tabs) */}
          {activeTab !== 'extract' && parsedContacts.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="font-semibold text-xs text-gray-600 dark:text-gray-400">
                Anteprima primi contatti rilevati ({Math.min(parsedContacts.length, 5)} di {parsedContacts.length})
              </h4>
              <div className="border border-gray-200 dark:border-[#323130] rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-[#2b2a28]">
                {parsedContacts.slice(0, 5).map((c, idx) => (
                  <div key={idx} className="px-3 py-2 flex items-center justify-between text-xs bg-white dark:bg-[#252423]">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{c.name || '(Senza nome)'}</span>
                      <span className="text-[11px] text-gray-400 truncate">{c.email}</span>
                    </div>
                    {(c.company || c.phone) && (
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {[c.company, c.phone].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-[#201f1e] border-t border-gray-200 dark:border-[#323130] flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Annulla
          </button>
          {activeTab !== 'extract' && (
            <button
              onClick={handleConfirmImport}
              disabled={parsedContacts.length === 0 || isProcessing}
              className="px-4 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importazione...</span>
                </>
              ) : (
                <span>Importa {parsedContacts.length} contatti</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
