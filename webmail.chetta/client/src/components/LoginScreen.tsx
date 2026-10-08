import React, { useState } from 'react';
import { Mail, Lock, Server, ArrowRight, ShieldCheck, Shield, KeyRound, ChevronDown, ChevronUp, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';

export const LoginScreen: React.FC = () => {
  const { activeAccount, setActiveAccount, isLoginOpen, setIsLoginOpen, accounts, setAccounts } = useWebmailStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [imapSecurity, setImapSecurity] = useState<'auto' | 'ssl' | 'starttls'>('auto');

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecurity, setSmtpSecurity] = useState<'auto' | 'ssl' | 'starttls'>('starttls');

  const [isManualHostEdit, setIsManualHostEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle provider presets dynamically as user types email
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!isManualHostEdit) {
      const atIdx = val.indexOf('@');
      if (atIdx !== -1) {
        const domain = val.slice(atIdx + 1).toLowerCase().trim();
        if (domain === 'gmail.com') {
          setImapHost('imap.gmail.com');
          setImapPort(993);
          setImapSecurity('ssl');
          setSmtpHost('smtp.gmail.com');
          setSmtpPort(587);
          setSmtpSecurity('starttls');
        } else if (domain === 'outlook.com' || domain === 'hotmail.com') {
          setImapHost('outlook.office365.com');
          setImapPort(993);
          setImapSecurity('ssl');
          setSmtpHost('smtp.office365.com');
          setSmtpPort(587);
          setSmtpSecurity('starttls');
        } else if (domain === 'chetta.it') {
          setImapHost('mail.chetta.it');
          setImapPort(143);
          setImapSecurity('starttls');
          setSmtpHost('mail.chetta.it');
          setSmtpPort(587);
          setSmtpSecurity('starttls');
        } else if (domain.length > 0) {
          setImapHost(`mail.${domain}`);
          setSmtpHost(`mail.${domain}`);
          setImapPort(143);
          setImapSecurity('auto');
          setSmtpPort(587);
          setSmtpSecurity('starttls');
        }
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const emailDomain = (email.split('@')[1] || '').trim().toLowerCase();
      let resolvedImapHost = imapHost.trim();
      let resolvedSmtpHost = smtpHost.trim();

      // Ensure host has complete domain and TLD (e.g. .it)
      if (!resolvedImapHost || resolvedImapHost === 'mail' || resolvedImapHost === 'mail.' || !resolvedImapHost.includes('.')) {
        resolvedImapHost = emailDomain ? `mail.${emailDomain}` : resolvedImapHost;
      } else if (resolvedImapHost.endsWith('.')) {
        resolvedImapHost = resolvedImapHost.slice(0, -1);
      }

      if (!resolvedSmtpHost || resolvedSmtpHost === 'mail' || resolvedSmtpHost === 'mail.' || !resolvedSmtpHost.includes('.')) {
        resolvedSmtpHost = emailDomain ? `mail.${emailDomain}` : resolvedSmtpHost;
      } else if (resolvedSmtpHost.endsWith('.')) {
        resolvedSmtpHost = resolvedSmtpHost.slice(0, -1);
      }

      if (emailDomain.includes('.') && !resolvedImapHost.endsWith(emailDomain)) {
        const tld = emailDomain.split('.').pop();
        if (tld && !resolvedImapHost.endsWith(`.${tld}`)) {
          resolvedImapHost = `mail.${emailDomain}`;
        }
      }

      if (emailDomain.includes('.') && !resolvedSmtpHost.endsWith(emailDomain)) {
        const tld = emailDomain.split('.').pop();
        if (tld && !resolvedSmtpHost.endsWith(`.${tld}`)) {
          resolvedSmtpHost = `mail.${emailDomain}`;
        }
      }

      if (emailDomain === 'chetta.it') {
        resolvedImapHost = 'mail.chetta.it';
        resolvedSmtpHost = 'mail.chetta.it';
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          display_name: displayName || email.split('@')[0],
          imap: {
            host: resolvedImapHost,
            port: Number(imapPort),
            security: imapSecurity
          },
          smtp: {
            host: resolvedSmtpHost,
            port: Number(smtpPort),
            security: smtpSecurity
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Autenticazione fallita. Controlla credenziali e parametri del server.');
      }

      // Add account to store
      setActiveAccount(data.account);
      const existing = accounts.filter(a => a.id !== data.account.id);
      setAccounts([...existing, data.account]);
      setIsLoginOpen(false);

      // Trigger initial load
      useWebmailStore.getState().syncFolder('INBOX');
      useWebmailStore.getState().loadFolders();
      useWebmailStore.getState().loadContacts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore di connessione al server mail.');
    } finally {
      setIsLoading(false);
    }
  };

  // If already logged in and login dialog was not explicitly opened, do not display
  if (!isLoginOpen && (activeAccount || accounts.length > 0)) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#201f1e] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#323130] p-7 relative animate-in zoom-in-95 duration-200">
        {/* Close Button if we already have accounts */}
        {accounts.length > 0 && (
          <button
            onClick={() => setIsLoginOpen(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2928] rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0078d4] via-[#005a9e] to-[#003966] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/10">
            <div className="relative">
              <Mail className="w-8 h-8" />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              CryptoMail
            </h1>
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
              v0.5 • 12 Set 2026
            </span>
          </div>
          <p className="text-xs font-semibold text-[#0078d4] dark:text-[#2899f5] mt-1.5 tracking-wide">
            "La tua posta blindata. Privacy assoluta, crittografia e sicurezza informatica."
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Zero persistenza cloud • Connessioni cifrate SSL/TLS • Protezione anti-phishing
          </p>

          {/* Security Features Badges */}
          <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-gray-600 dark:text-gray-300 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-[#2a2928] rounded-md border border-gray-200 dark:border-[#383735]">
              <Lock className="w-3 h-3 text-emerald-500" /> Cifratura TLS/SSL
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-[#2a2928] rounded-md border border-gray-200 dark:border-[#383735]">
              <Shield className="w-3 h-3 text-blue-500" /> Zero DB Storage
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-[#2a2928] rounded-md border border-gray-200 dark:border-[#383735]">
              <ShieldCheck className="w-3 h-3 text-amber-500" /> Anti-Spam Attivo
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold">Errore di autenticazione:</span>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Indirizzo Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="nome@dominio.it"
                className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50 dark:bg-[#1f1e1d] border border-gray-300 dark:border-[#3d3b39] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50 dark:bg-[#1f1e1d] border border-gray-300 dark:border-[#3d3b39] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Nome visualizzato (Opzionale)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="es. Mario Rossi"
              className="w-full h-9 px-3 text-xs bg-gray-50 dark:bg-[#1f1e1d] border border-gray-300 dark:border-[#3d3b39] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
            />
          </div>

          {/* Toggle Advanced IMAP/SMTP Config */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[#0078d4] font-medium flex items-center gap-1 hover:underline"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Configurazione avanzata server IMAP / SMTP</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showAdvanced && (
            <div className="p-3 bg-gray-50 dark:bg-[#1f1e1d] rounded-lg space-y-3 text-xs border border-gray-200 dark:border-[#323130]">
              {/* IMAP Section */}
              <div className="space-y-1.5">
                <div className="font-semibold text-gray-700 dark:text-gray-300">Server IMAP (Ricezione)</div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={imapHost}
                    onChange={(e) => {
                      setImapHost(e.target.value);
                      setIsManualHostEdit(true);
                    }}
                    placeholder="mail.dominio.it"
                    className="col-span-2 h-8 px-2 bg-white dark:bg-[#252423] border border-gray-300 dark:border-[#3d3b39] rounded text-xs"
                  />
                  <input
                    type="number"
                    value={imapPort}
                    onChange={(e) => setImapPort(Number(e.target.value))}
                    placeholder="993"
                    className="h-8 px-2 bg-white dark:bg-[#252423] border border-gray-300 dark:border-[#3d3b39] rounded text-xs"
                  />
                </div>
                <select
                  value={imapSecurity}
                  onChange={(e) => setImapSecurity(e.target.value as any)}
                  className="w-full h-8 px-2 bg-white dark:bg-[#252423] border border-gray-300 dark:border-[#3d3b39] rounded text-xs text-gray-700 dark:text-gray-300"
                >
                  <option value="auto">Crittografia: Rileva automaticamente (SSL/TLS o STARTTLS)</option>
                  <option value="ssl">Crittografia: SSL/TLS Implicito (Porta 993)</option>
                  <option value="starttls">Crittografia: STARTTLS / Normale (Porta 143/993)</option>
                </select>
              </div>

              {/* SMTP Section */}
              <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-[#2f2e2d]">
                <div className="font-semibold text-gray-700 dark:text-gray-300">Server SMTP (Invio)</div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => {
                      setSmtpHost(e.target.value);
                      setIsManualHostEdit(true);
                    }}
                    placeholder="mail.dominio.it"
                    className="col-span-2 h-8 px-2 bg-white dark:bg-[#252423] border border-gray-300 dark:border-[#3d3b39] rounded text-xs"
                  />
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="587"
                    className="h-8 px-2 bg-white dark:bg-[#252423] border border-gray-300 dark:border-[#3d3b39] rounded text-xs"
                  />
                </div>
                <select
                  value={smtpSecurity}
                  onChange={(e) => setSmtpSecurity(e.target.value as any)}
                  className="w-full h-8 px-2 bg-white dark:bg-[#252423] border border-gray-300 dark:border-[#3d3b39] rounded text-xs text-gray-700 dark:text-gray-300"
                >
                  <option value="starttls">Crittografia: STARTTLS (Porta 587 consigliata)</option>
                  <option value="ssl">Crittografia: SSL/TLS (Porta 465)</option>
                  <option value="auto">Crittografia: Nessuna / Standard (Porta 25)</option>
                </select>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifica connessione IMAP...</span>
              </>
            ) : (
              <>
                <span>Accedi alla Webmail</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge & Creator Credit */}
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-[#323130] flex flex-col items-center justify-center gap-1 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Credenziali protette con cifratura AES-256 e SSL/TLS</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Realizzata da <span className="font-semibold text-gray-700 dark:text-gray-200">Mannarini Technology</span> (Star Link S.r.l.) by <span className="font-semibold text-gray-800 dark:text-gray-100">Mannarini Francesco</span> 2026
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
            Versione 0.5 • Rilascio: 12 Settembre 2026
          </p>
        </div>
      </div>
    </div>
  );
};
