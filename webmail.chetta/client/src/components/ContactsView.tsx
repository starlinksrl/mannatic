import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Building,
  FileText,
  Trash2,
  Edit2,
  Save,
  X,
  Upload,
  Download,
  Send,
  Star,
  ChevronDown,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';
import { Contact } from '../types/index.js';
import { ImportContactsModal } from './ImportContactsModal.js';

export const ContactsView: React.FC = () => {
  const {
    contacts,
    selectedContact,
    setSelectedContact,
    contactsSearchQuery,
    setContactsSearchQuery,
    saveContact,
    deleteContact,
    openCompose,
    activeAccount,
    setIsImportContactsOpen
  } = useWebmailStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'phone' | 'company'>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close confirmation modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contactToDelete && !isDeleting) {
        setContactToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contactToDelete, isDeleting]);

  // Form edit/create state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: ''
  });

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (activeFilter === 'phone' && !c.phone) return false;
      if (activeFilter === 'company' && !c.company) return false;
      return true;
    });
  }, [contacts, activeFilter]);

  // Group contacts alphabetically
  const groupedContacts = useMemo(() => {
    const groups: { [key: string]: Contact[] } = {};
    for (const c of filteredContacts) {
      const letter = (c.name || c.email).trim().charAt(0).toUpperCase() || '#';
      const key = /[A-Z]/.test(letter) ? letter : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return Object.keys(groups)
      .sort()
      .map(letter => ({ letter, list: groups[letter] }));
  }, [filteredContacts]);

  const handleStartCreate = () => {
    setFormData({ name: '', email: '', phone: '', company: '', notes: '' });
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleStartEdit = (contact: Contact) => {
    setFormData({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      notes: contact.notes || ''
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) return;

    const payload = {
      ...(isEditing && selectedContact ? { id: selectedContact.id } : {}),
      name: formData.name.trim() || undefined,
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || undefined,
      company: formData.company.trim() || undefined,
      notes: formData.notes.trim() || undefined
    };

    const ok = await saveContact(payload);
    if (ok) {
      setIsEditing(false);
      setIsCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      await deleteContact(contactToDelete.id);
      if (selectedContact?.id === contactToDelete.id) {
        setSelectedContact(null);
      }
      setContactToDelete(null);
    } catch (err) {
      console.error('Failed to delete contact', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendMail = (contact: Contact) => {
    openCompose({
      to: [contact.name ? `${contact.name} <${contact.email}>` : contact.email],
      subject: '',
      body: ''
    });
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-600',
      'bg-indigo-600',
      'bg-emerald-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-purple-600',
      'bg-teal-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (contact: Contact) => {
    const str = (contact.name || contact.email).trim();
    const parts = str.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] dark:bg-[#1b1a19] overflow-hidden select-none">
      {/* Top Action Ribbon for Contacts */}
      <div className="h-12 bg-white dark:bg-[#201f1e] border-b border-gray-200 dark:border-[#323130] flex items-center px-4 justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          {/* New Contact */}
          <button
            onClick={handleStartCreate}
            className="h-8 px-3.5 bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white font-semibold text-xs rounded-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nuovo contatto</span>
          </button>

          <div className="h-5 w-px bg-gray-300 dark:bg-[#3d3b39] mx-1" />

          {/* Import Contacts */}
          <button
            onClick={() => setIsImportContactsOpen(true)}
            className="h-8 px-3 rounded-sm hover:bg-gray-100 dark:hover:bg-[#292827] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors border border-gray-200 dark:border-[#383735]"
          >
            <Upload className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>Importa contatti</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="h-8 px-3 rounded-sm hover:bg-gray-100 dark:hover:bg-[#292827] text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors border border-gray-200 dark:border-[#383735]"
            >
              <Download className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
              <span>Esporta</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {isExportDropdownOpen && (
              <div
                className="absolute left-0 mt-1 w-56 bg-white dark:bg-[#252423] rounded-lg shadow-xl border border-gray-200 dark:border-[#323130] py-1 z-40 text-xs"
                onMouseLeave={() => setIsExportDropdownOpen(false)}
              >
                <a
                  href={`/api/contacts/${activeAccount?.id}/export?format=csv`}
                  download="rubrica_contatti.csv"
                  onClick={() => setIsExportDropdownOpen(false)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2f2e2d] flex flex-col text-gray-700 dark:text-gray-200"
                >
                  <span className="font-semibold">Esporta come CSV</span>
                  <span className="text-[10px] text-gray-400">Compatibile con Excel, Google, Outlook</span>
                </a>
                <a
                  href={`/api/contacts/${activeAccount?.id}/export?format=vcf`}
                  download="rubrica_contatti.vcf"
                  onClick={() => setIsExportDropdownOpen(false)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2f2e2d] flex flex-col text-gray-700 dark:text-gray-200"
                >
                  <span className="font-semibold">Esporta come vCard (.vcf)</span>
                  <span className="text-[10px] text-gray-400">Per iPhone, Mac, Android e Outlook</span>
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-400">
          Totale contatti: <b className="text-gray-700 dark:text-gray-200">{contacts.length}</b>
        </div>
      </div>

      {/* Main 3-Pane Contacts Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Filters (Desktop only) */}
        <div className="hidden md:flex w-56 bg-white dark:bg-[#201f1e] border-r border-gray-200 dark:border-[#323130] flex-col p-3 space-y-1 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
            Rubrica Personale
          </span>

          <button
            onClick={() => setActiveFilter('all')}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-50 dark:bg-[#2a2928] text-[#0078d4] dark:text-[#2899f5] font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252423]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Tutti i contatti</span>
            </div>
            <span className="text-[11px] opacity-75">{contacts.length}</span>
          </button>

          <button
            onClick={() => setActiveFilter('phone')}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
              activeFilter === 'phone'
                ? 'bg-blue-50 dark:bg-[#2a2928] text-[#0078d4] dark:text-[#2899f5] font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252423]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>Con telefono</span>
            </div>
            <span className="text-[11px] opacity-75">{contacts.filter(c => c.phone).length}</span>
          </button>

          <button
            onClick={() => setActiveFilter('company')}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
              activeFilter === 'company'
                ? 'bg-blue-50 dark:bg-[#2a2928] text-[#0078d4] dark:text-[#2899f5] font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252423]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span>Con azienda</span>
            </div>
            <span className="text-[11px] opacity-75">{contacts.filter(c => c.company).length}</span>
          </button>
        </div>

        {/* Center List: Contacts List with Search */}
        <div className={`w-full md:w-80 lg:w-96 bg-white dark:bg-[#201f1e] border-r border-gray-200 dark:border-[#323130] flex flex-col shrink-0 ${
          selectedContact || isCreating ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Search Box */}
          <div className="p-3 border-b border-gray-200 dark:border-[#323130]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={contactsSearchQuery}
                onChange={(e) => setContactsSearchQuery(e.target.value)}
                placeholder="Cerca contatti per nome, email, azienda..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 dark:bg-[#262524] border border-gray-200 dark:border-[#383735] rounded-lg outline-none focus:border-[#0078d4]"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-[#2a2928]">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                <p className="font-semibold text-gray-600 dark:text-gray-300">Nessun contatto trovato</p>
                <p className="text-[11px] max-w-xs">
                  Aggiungi un contatto con "Nuovo contatto" oppure clicca "Importa contatti" per caricare da file o posta.
                </p>
              </div>
            ) : (
              groupedContacts.map(group => (
                <div key={group.letter}>
                  <div className="px-4 py-1 bg-gray-50/80 dark:bg-[#1f1e1d] text-[11px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 border-b border-gray-100 dark:border-[#2d2c2b]">
                    {group.letter}
                  </div>
                  {group.list.map(c => {
                    const isSelected = selectedContact?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedContact(c);
                          setIsCreating(false);
                          setIsEditing(false);
                        }}
                        className={`group px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-[#2d2c2a] border-l-4 border-[#0078d4]'
                            : 'hover:bg-gray-50 dark:hover:bg-[#252423]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${getAvatarColor(
                              c.name || c.email
                            )}`}
                          >
                            {getInitials(c)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                              {c.name || c.email}
                            </div>
                            {c.name && (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                {c.email}
                              </div>
                            )}
                            {c.company && (
                              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                {c.company}
                              </div>
                            )}
                          </div>
                        </div>

                        {c.is_favorite === 1 && (
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Contact Details / Edit / Create */}
        <div className={`flex-1 w-full bg-white dark:bg-[#201f1e] overflow-y-auto ${
          !selectedContact && !isCreating ? 'hidden md:flex' : 'flex flex-col'
        }`}>
          {isCreating || isEditing ? (
            /* Create / Edit Form */
            <div className="p-4 sm:p-6 max-w-xl">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-[#323130] mb-6">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className="md:hidden p-1.5 -ml-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2c2a] rounded-full"
                    title="Torna ai contatti"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {isCreating ? 'Aggiungi Nuovo Contatto' : 'Modifica Contatto'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-[#2d2c2a] rounded-full text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Mario Rossi"
                    className="w-full h-9 px-3 text-xs bg-white dark:bg-[#252423] border border-gray-200 dark:border-[#3d3b39] rounded-lg outline-none focus:border-[#0078d4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Indirizzo email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="mario.rossi@example.com"
                    className="w-full h-9 px-3 text-xs bg-white dark:bg-[#252423] border border-gray-200 dark:border-[#3d3b39] rounded-lg outline-none focus:border-[#0078d4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Numero di telefono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+39 340 1234567"
                    className="w-full h-9 px-3 text-xs bg-white dark:bg-[#252423] border border-gray-200 dark:border-[#3d3b39] rounded-lg outline-none focus:border-[#0078d4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Azienda / Società
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Chetta S.r.l."
                    className="w-full h-9 px-3 text-xs bg-white dark:bg-[#252423] border border-gray-200 dark:border-[#3d3b39] rounded-lg outline-none focus:border-[#0078d4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Note personali
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Informazioni aggiuntive, referenze, orari..."
                    className="w-full p-3 text-xs bg-white dark:bg-[#252423] border border-gray-200 dark:border-[#3d3b39] rounded-lg outline-none focus:border-[#0078d4]"
                  />
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salva contatto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          ) : selectedContact ? (
            /* Contact Details View */
            <div className="p-4 sm:p-8 max-w-2xl">
              {/* Mobile Back Button */}
              <button
                onClick={() => setSelectedContact(null)}
                className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-[#0078d4] mb-4"
              >
                <ArrowLeft className="w-4 h-4" /> Torna ai contatti
              </button>

              {/* Header profile card */}
              <div className="flex items-start justify-between pb-6 border-b border-gray-100 dark:border-[#2d2c2b]">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-full text-white font-bold text-xl flex items-center justify-center shadow-md ${getAvatarColor(
                      selectedContact.name || selectedContact.email
                    )}`}
                  >
                    {getInitials(selectedContact)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedContact.name || selectedContact.email}
                    </h2>
                    {selectedContact.company && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {selectedContact.company}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(selectedContact)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-[#2d2c2a] rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                    title="Modifica contatto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setContactToDelete(selectedContact)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    title="Elimina contatto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Send Mail CTA Button */}
              <div className="py-6">
                <button
                  onClick={() => handleSendMail(selectedContact)}
                  className="px-4 py-2.5 bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Invia messaggio email</span>
                </button>
              </div>

              {/* Details Sections */}
              <div className="space-y-4 text-xs">
                {/* Email row */}
                <div className="p-4 bg-gray-50/70 dark:bg-[#252423] rounded-xl border border-gray-100 dark:border-[#323130] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0078d4] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Posta elettronica</span>
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="block text-xs font-semibold text-[#0078d4] dark:text-[#2899f5] hover:underline truncate"
                    >
                      {selectedContact.email}
                    </a>
                  </div>
                </div>

                {/* Phone row */}
                {selectedContact.phone && (
                  <div className="p-4 bg-gray-50/70 dark:bg-[#252423] rounded-xl border border-gray-100 dark:border-[#323130] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Numero di Telefono</span>
                      <a
                        href={`tel:${selectedContact.phone}`}
                        className="block text-xs font-semibold text-gray-800 dark:text-gray-200 hover:underline"
                      >
                        {selectedContact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Company row */}
                {selectedContact.company && (
                  <div className="p-4 bg-gray-50/70 dark:bg-[#252423] rounded-xl border border-gray-100 dark:border-[#323130] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                      <Building className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Azienda / Organizzazione</span>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {selectedContact.company}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes row */}
                {selectedContact.notes && (
                  <div className="p-4 bg-gray-50/70 dark:bg-[#252423] rounded-xl border border-gray-100 dark:border-[#323130] flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Note</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {selectedContact.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#252423] flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nessun contatto selezionato</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                Scegli un contatto dall'elenco a sinistra per visualizzarne i dettagli o clicca su "Nuovo contatto" per aggiungerne uno.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Import Contacts Modal */}
      <ImportContactsModal />

      {/* Custom In-App Delete Confirmation Modal */}
      {contactToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeleting) setContactToDelete(null);
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
                  Elimina contatto
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                  Sei sicuro di voler eliminare <strong className="text-gray-800 dark:text-gray-200 font-semibold">{contactToDelete.name || contactToDelete.email}</strong> dalla rubrica?
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Questa operazione non può essere annullata.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-[#2d2c2b]">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2928] rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminazione...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Elimina contatto</span>
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
