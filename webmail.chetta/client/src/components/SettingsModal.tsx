import React, { useState } from 'react';
import { X, Check, Monitor, Moon, Sun, Smartphone, Mail, Shield, Server, User, LogOut, ShieldAlert, Plus, Trash2, MessageSquare, Building2, Globe, EyeOff, Lock } from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';
import { ChatVisibility } from '../types/index.js';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, settings, updateSettings, activeAccount, logout, blockedSenders, blockSender, unblockSender, setChatVisibility } = useWebmailStore();
  const [activeTab, setActiveTab] = useState<'general' | 'mobile' | 'signature' | 'reading' | 'account' | 'spam' | 'chat'>('general');
  const [newBlockedPattern, setNewBlockedPattern] = useState('');

  if (!isSettingsOpen || !settings) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white dark:bg-[#252423] w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 dark:border-[#3d3b39] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#323130] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Impostazioni Webmail</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#0078d4] dark:text-[#2899f5] font-semibold border border-blue-200 dark:border-blue-800/40">
                v0.5 • 12/09/2026
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Personalizza le opzioni salvate permanentemente su SQL</p>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#323130] rounded-full text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-gray-200 dark:border-[#323130] px-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'general'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Sun className="w-4 h-4" /> Aspetto & Tema
          </button>
          <button
            onClick={() => setActiveTab('reading')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'reading'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Mail className="w-4 h-4" /> Lettura & Layout
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'mobile'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Smartphone className="w-4 h-4" /> Smartphone & Swipe
          </button>
          <button
            onClick={() => setActiveTab('signature')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'signature'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" /> Firma Email
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'account'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <User className="w-4 h-4" /> Account
          </button>
          <button
            onClick={() => setActiveTab('spam')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'spam'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Filtro Spam & Blocchi
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'chat'
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#2899f5]'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> CryptoChat E2EE
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs sm:text-sm text-gray-800 dark:text-gray-200">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold block mb-2">Tema grafico</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => updateSettings({ theme: 'light' })}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                      settings.theme === 'light'
                        ? 'border-[#0078d4] bg-blue-50/50 text-[#0078d4]'
                        : 'border-gray-200 dark:border-[#3d3b39] hover:bg-gray-50 dark:hover:bg-[#2f2e2d]'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="font-medium text-xs">Chiaro (Outlook)</span>
                  </button>

                  <button
                    onClick={() => updateSettings({ theme: 'dark' })}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                      settings.theme === 'dark'
                        ? 'border-[#0078d4] bg-blue-900/20 text-[#2899f5]'
                        : 'border-gray-200 dark:border-[#3d3b39] hover:bg-gray-50 dark:hover:bg-[#2f2e2d]'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="font-medium text-xs">Scuro (Fluent Dark)</span>
                  </button>

                  <button
                    onClick={() => updateSettings({ theme: 'system' })}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                      settings.theme === 'system'
                        ? 'border-[#0078d4] bg-blue-50/50 text-[#0078d4]'
                        : 'border-gray-200 dark:border-[#3d3b39] hover:bg-gray-50 dark:hover:bg-[#2f2e2d]'
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="font-medium text-xs">Sistema</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-2">Densità elenco messaggi</label>
                <div className="grid grid-cols-3 gap-3">
                  {['compact', 'normal', 'relaxed'].map((d) => (
                    <button
                      key={d}
                      onClick={() => updateSettings({ density: d as any })}
                      className={`p-2.5 rounded-lg border text-center capitalize text-xs font-medium ${
                        settings.density === d
                          ? 'border-[#0078d4] bg-blue-50 dark:bg-blue-900/30 text-[#0078d4] dark:text-[#2899f5]'
                          : 'border-gray-200 dark:border-[#3d3b39]'
                      }`}
                    >
                      {d === 'compact' ? 'Compatta' : d === 'normal' ? 'Normale' : 'Ampia'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reading Tab */}
          {activeTab === 'reading' && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold block mb-1">Privacy & Immagini remote</label>
                <p className="text-xs text-gray-500 mb-2">
                  Blocca il download automatico delle immagini nelle email per evitare tracking.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.block_external_images === 1}
                    onChange={(e) => updateSettings({ block_external_images: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 text-[#0078d4] rounded"
                  />
                  <span className="text-xs">Blocca immagini esterne per impostazione predefinita</span>
                </label>
              </div>

              <div>
                <label className="font-semibold block mb-1">Schede Posta in evidenza (Focused Inbox)</label>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={settings.focused_inbox === 1}
                    onChange={(e) => updateSettings({ focused_inbox: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 text-[#0078d4] rounded"
                  />
                  <span className="text-xs">Separa la posta in "In evidenza" e "Altra"</span>
                </label>
              </div>
            </div>
          )}

          {/* Mobile & Swipe Tab */}
          {activeTab === 'mobile' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configura i gesti di scorrimento (Swipe) per l'interfaccia smartphone e app WebView:
              </p>

              <div>
                <label className="font-semibold block mb-1">Scorrimento verso destra (Swipe Right)</label>
                <select
                  value={settings.swipe_right_action}
                  onChange={(e) => updateSettings({ swipe_right_action: e.target.value as any })}
                  className="w-full p-2 rounded bg-gray-50 dark:bg-[#1f1e1d] border border-gray-200 dark:border-[#3d3b39] text-xs"
                >
                  <option value="delete">Elimina messaggio</option>
                  <option value="archive">Archivia messaggio</option>
                  <option value="read">Segna come letto / da leggere</option>
                  <option value="flag">Contrassegna / Star</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Scorrimento verso sinistra (Swipe Left)</label>
                <select
                  value={settings.swipe_left_action}
                  onChange={(e) => updateSettings({ swipe_left_action: e.target.value as any })}
                  className="w-full p-2 rounded bg-gray-50 dark:bg-[#1f1e1d] border border-gray-200 dark:border-[#3d3b39] text-xs"
                >
                  <option value="read">Segna come letto / da leggere</option>
                  <option value="delete">Elimina messaggio</option>
                  <option value="archive">Archivia messaggio</option>
                  <option value="flag">Contrassegna / Star</option>
                </select>
              </div>
            </div>
          )}

          {/* Signature Tab */}
          {activeTab === 'signature' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.signature_enabled === 1}
                  onChange={(e) => updateSettings({ signature_enabled: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 text-[#0078d4] rounded"
                />
                <span className="font-semibold text-xs">Includi firma automatica nelle nuove email</span>
              </label>

              <div>
                <label className="font-semibold block mb-1 text-xs">Testo o HTML della Firma</label>
                <textarea
                  value={settings.signature_html}
                  onChange={(e) => updateSettings({ signature_html: e.target.value })}
                  placeholder="Cordiali saluti,<br><b>Il tuo Nome</b>"
                  rows={4}
                  className="w-full p-2.5 text-xs rounded bg-gray-50 dark:bg-[#1f1e1d] border border-gray-200 dark:border-[#3d3b39] font-mono outline-none"
                />
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#1f1e1d] border border-gray-200 dark:border-[#3d3b39] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Account attivo</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full">Connesso</span>
                </div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{activeAccount?.displayName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">{activeAccount?.email}</p>
                <div className="pt-2 text-[11px] text-gray-400 space-y-0.5">
                  <p>Server IMAP: {activeAccount?.imapHost}</p>
                  <p>Server SMTP: {activeAccount?.smtpHost}</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    logout();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <LogOut className="w-4 h-4" /> Disconnetti account
                </button>
              </div>
            </div>
          )}

          {/* Spam & Blocklist Tab */}
          {activeTab === 'spam' && (
            <div className="space-y-5">
              {/* Spam Filter Toggle */}
              <div className="p-4 bg-gray-50 dark:bg-[#1f1e1d] rounded-xl border border-gray-200 dark:border-[#323130] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">Filtro antispam automatico</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-md">
                    Sposta automaticamente i nuovi messaggi ricevuti dai mittenti o domini bloccati direttamente nella cartella Posta indesiderata.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={settings.spam_filter_enabled !== 0}
                    onChange={(e) => updateSettings({ spam_filter_enabled: e.target.checked ? 1 : 0 })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-[#3d3b39] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0078d4]"></div>
                </label>
              </div>

              {/* Add New Block Pattern */}
              <div>
                <label className="font-semibold block mb-1 text-xs">Blocca un nuovo indirizzo email o dominio</label>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newBlockedPattern.trim()) return;
                    await blockSender(newBlockedPattern.trim());
                    setNewBlockedPattern('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newBlockedPattern}
                    onChange={(e) => setNewBlockedPattern(e.target.value)}
                    placeholder="es. spammer@bad.com oppure @bad-domain.com"
                    className="flex-1 h-9 px-3 text-xs bg-white dark:bg-[#1f1e1d] border border-gray-200 dark:border-[#3d3b39] rounded-lg outline-none focus:border-[#0078d4]"
                  />
                  <button
                    type="submit"
                    disabled={!newBlockedPattern.trim()}
                    className="px-4 h-9 bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Blocca
                  </button>
                </form>
                <p className="text-[11px] text-gray-400 mt-1">
                  Puoi inserire un indirizzo email completo o un intero dominio preceduto da @ (es. <code>@marketing-aggressivo.com</code>).
                </p>
              </div>

              {/* Blocked List Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs">Mittenti e domini bloccati ({blockedSenders.length})</span>
                  <span className="text-[11px] text-gray-400">Salvati su SQLite</span>
                </div>

                {blockedSenders.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-gray-200 dark:border-[#323130] rounded-xl text-gray-400 text-xs">
                    Nessun mittente o dominio bloccato. Le regole aggiunte qui o cliccando "Blocca mittente" sulle email verranno ricordate permanentemente nel database.
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-[#323130] rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-[#2b2a28] max-h-56 overflow-y-auto">
                    {blockedSenders.map((b) => (
                      <div
                        key={b.id}
                        className="px-3.5 py-2 flex items-center justify-between bg-white dark:bg-[#252423] hover:bg-gray-50 dark:hover:bg-[#2b2a28] transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-gray-800 dark:text-gray-200">{b.pattern}</span>
                          {b.created_at && (
                            <span className="text-[10px] text-gray-400">
                              Aggiunto il {new Date(b.created_at).toLocaleDateString('it-IT')}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => unblockSender(b.id)}
                          title="Sblocca mittente"
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CryptoChat Tab */}
          {activeTab === 'chat' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                  Visibilità e Privacy CryptoChat
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Decidi chi può trovarti nella rubrica chat di CryptoMail e inviarti messaggi istantanei cifrati.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'same_domain',
                    icon: <Building2 className="w-4 h-4 text-blue-500" />,
                    title: `Solo utenti del tuo dominio (@${activeAccount?.email.split('@')[1] || 'azienda.it'})`,
                    desc: 'Consigliata per ambienti aziendali. Solo i colleghi con la stessa email possono trovarti e vedere il tuo stato online.'
                  },
                  {
                    key: 'all',
                    icon: <Globe className="w-4 h-4 text-emerald-500" />,
                    title: 'Tutti gli utenti della piattaforma',
                    desc: 'Qualsiasi utente registrato su CryptoMail può cercarti ed iniziare una conversazione cifrata.'
                  },
                  {
                    key: 'none',
                    icon: <EyeOff className="w-4 h-4 text-amber-500" />,
                    title: 'Invisibile (Modalità Stealth)',
                    desc: 'Nessuno ti vedrà nell\'elenco utenti né vedrà quando sei online. Puoi chattare solo se un utente inserisce manualmente la tua email esatta.'
                  }
                ].map((item) => {
                  const isChecked = (settings.chat_visibility || 'same_domain') === item.key;
                  return (
                    <label
                      key={item.key}
                      onClick={() => setChatVisibility(item.key as ChatVisibility)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[#0078d4] bg-blue-50/50 dark:bg-[#1c3247]/50'
                          : 'border-gray-200 dark:border-[#3d3b39] hover:bg-gray-50 dark:hover:bg-[#2b2a28]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="chat_visibility"
                        value={item.key}
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {item.icon}
                          <span>{item.title}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Cryptography Info Box */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                  <Lock className="w-4 h-4" /> Architettura Zero-Knowledge & Opzione A
                </div>
                <ul className="text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1 list-disc list-inside leading-relaxed">
                  <li>Le coppie di chiavi asimmetriche <strong>ECDH P-256</strong> sono generate localmente con la WebCrypto API.</li>
                  <li>I messaggi sono cifrati con <strong>AES-256-GCM</strong>. Il server e il database SQLite memorizzano esclusivamente testo cifrato e IV.</li>
                  <li><strong>Opzione A attiva</strong>: i messaggi cifrati persistono nel database per essere consultabili al prossimo accesso, salvo che tu o il destinatario attiviate il timer di autodistruzione.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-[#201f1e] border-t border-gray-200 dark:border-[#323130] flex items-center justify-between">
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            Realizzata da <span className="font-semibold text-gray-700 dark:text-gray-200">Mannarini Technology</span> (Star Link S.r.l.) by <span className="font-semibold text-gray-800 dark:text-gray-100">Mannarini Francesco</span> 2026
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-1.5 bg-[#0078d4] text-white text-xs font-semibold rounded hover:bg-[#106ebe]"
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  );
};
