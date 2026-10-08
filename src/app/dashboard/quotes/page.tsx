'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser } from '@/contexts/user-context';
import { Header } from '@/components/dashboard/header';
import { Loader, UploadCloud, FileText, Trash2, ExternalLink, Search, X, CalendarDays } from 'lucide-react';
import { DistributorQuote, Company } from '@/lib/types';
import {
  getQuotesForCompany,
  getQuotesForDistributor,
  addDistributorQuote,
  deleteDistributorQuote,
  getCompaniesByDistributorId,
  updateDistributorQuote,
} from '@/lib/data';
import { Pencil } from 'lucide-react';
import { getQuoteSignedUrl } from '@/ai/flows/get-gcs-signed-url';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function QuotesPage() {
  const { user, currentCompany } = useUser();
  const { toast } = useToast();

  const isDistributor = user?.role === 'Distributor';
  const isDistributorAdmin = user?.role === 'DistributorAdmin';
  const isDistributorUser = user?.role === 'DistributorUser';
  const isDistributorFamily = isDistributor || isDistributorAdmin || isDistributorUser;
  const isAdmin = user?.role === 'Admin';

  // Resolve the distributor ID regardless of whether user IS the distributor or an operator
  const effectiveDistributorId = isDistributor
    ? user?.id
    : (user?.distributorId ?? null);

  const [quotes, setQuotes] = useState<DistributorQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [managedCompanies, setManagedCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Search & filter state
  const [searchText, setSearchText] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Edit state
  const [editingQuote, setEditingQuote] = useState<DistributorQuote | null>(null);
  const [editRiferimento, setEditRiferimento] = useState('');
  const [editScadenza, setEditScadenza] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadRiferimento, setUploadRiferimento] = useState('');
  const [uploadScadenza, setUploadScadenza] = useState('');
  const [uploadTargetCompany, setUploadTargetCompany] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [openingQuoteId, setOpeningQuoteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchQuotes = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (isDistributorFamily && effectiveDistributorId) {
        const all = await getQuotesForDistributor(effectiveDistributorId);
        setQuotes(selectedCompanyId !== 'all' ? all.filter(q => q.companyId === selectedCompanyId) : all);
      } else if (isAdmin && currentCompany) {
        const all = await getQuotesForCompany(currentCompany.id);
        setQuotes(all);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchQuotes(); }, [user, currentCompany, selectedCompanyId]);

  useEffect(() => {
    if (isDistributorFamily && effectiveDistributorId) {
      getCompaniesByDistributorId(effectiveDistributorId).then(companies => setManagedCompanies(companies));
    }
  }, [isDistributorFamily, effectiveDistributorId]);

  // Client-side filtering: company + text + date range
  const filteredQuotes = useMemo(() => {
    let result = quotes;

    // Text search: fileName, riferimento, description, textContent
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(quote =>
        quote.fileName.toLowerCase().includes(q) ||
        quote.riferimento?.toLowerCase().includes(q) ||
        quote.description?.toLowerCase().includes(q) ||
        quote.textContent?.toLowerCase().includes(q) ||
        quote.distributorName?.toLowerCase().includes(q)
      );
    }

    // Date filter on uploadedAt
    if (filterDateFrom) {
      const from = parseISO(filterDateFrom);
      result = result.filter(q => !isBefore(parseISO(q.uploadedAt), from));
    }
    if (filterDateTo) {
      const to = parseISO(filterDateTo + 'T23:59:59');
      result = result.filter(q => !isAfter(parseISO(q.uploadedAt), to));
    }

    return result;
  }, [quotes, searchText, filterDateFrom, filterDateTo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ variant: 'destructive', title: 'Formato non valido', description: 'Puoi caricare solo file PDF.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File troppo grande', description: 'Il PDF non può superare i 10 MB.' });
      return;
    }
    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!user || !uploadFile || !uploadTargetCompany) return;
    setIsUploading(true);
    try {
      const { compressAttachment } = await import('@/lib/image-compression');
      const fileDataUri = await compressAttachment(uploadFile);

      await addDistributorQuote({
        distributorId: user.id,
        distributorName: user.name,
        companyId: uploadTargetCompany,
        fileName: uploadFile.name,
        fileDataUri,
        riferimento: uploadRiferimento || undefined,
        scadenza: uploadScadenza || undefined,
        description: uploadDescription || undefined,
      });

      toast({ title: 'Preventivo caricato', description: `"${uploadFile.name}" inviato con successo.` });
      setIsUploadOpen(false);
      resetUploadForm();
      fetchQuotes();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ variant: 'destructive', title: 'Errore upload', description: error?.message ?? 'Impossibile caricare il preventivo.' });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadDescription('');
    setUploadRiferimento('');
    setUploadScadenza('');
    setUploadTargetCompany('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (quote: DistributorQuote) => {
    const ok = await deleteDistributorQuote(quote.id);
    if (ok) {
      toast({ title: 'Preventivo eliminato' });
      setQuotes(prev => prev.filter(q => q.id !== quote.id));
    } else {
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile eliminare il preventivo.' });
    }
  };

  const handleOpenQuote = async (quote: DistributorQuote) => {
    setOpeningQuoteId(quote.id);
    try {
      const signedUrl = await getQuoteSignedUrl(quote.gcsPath);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('Signed URL error:', err);
      toast({ variant: 'destructive', title: 'Errore apertura', description: err?.message ?? 'Impossibile aprire il preventivo.' });
    } finally {
      setOpeningQuoteId(null);
    }
  };

  const openEditDialog = (quote: DistributorQuote) => {
    setEditingQuote(quote);
    setEditRiferimento(quote.riferimento ?? '');
    setEditScadenza(quote.scadenza ?? '');
    setEditDescription(quote.description ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingQuote) return;
    setIsSaving(true);
    try {
      const ok = await updateDistributorQuote(editingQuote.id, {
        riferimento: editRiferimento || undefined,
        scadenza: editScadenza || undefined,
        description: editDescription || undefined,
      });
      if (ok) {
        setQuotes(prev => prev.map(q =>
          q.id === editingQuote.id
            ? { ...q, riferimento: editRiferimento || undefined, scadenza: editScadenza || undefined, description: editDescription || undefined }
            : q
        ));
        toast({ title: 'Preventivo aggiornato' });
        setEditingQuote(null);
      } else {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile salvare le modifiche.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getCompanyName = (companyId: string) =>
    managedCompanies.find(c => c.id === companyId)?.name ?? companyId;

  const hasActiveFilters = searchText || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setSearchText('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  if (!user || (!isDistributorFamily && !isAdmin)) {
    return (
      <>
        <Header title="Preventivi" />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">Accesso non autorizzato.</div>
      </>
    );
  }

  return (
    <>
      <Header title="Preventivi" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-5">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-end gap-3">

          {/* Company filter (distributor family) */}
          {isDistributorFamily && managedCompanies.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">Installatore</span>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tutti gli installatori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli installatori</SelectItem>
                  {managedCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Free text search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <span className="text-xs text-muted-foreground font-medium">Cerca (nome, riferimento, testo PDF...)</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8"
                placeholder="Cerca..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Dal</span>
            <Input type="date" className="w-[155px]" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Al</span>
            <Input type="date" className="w-[155px]" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Rimuovi filtri">
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Upload button + count */}
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              {isLoading ? '' : `${filteredQuotes.length} / ${quotes.length} preventiv${quotes.length === 1 ? 'o' : 'i'}`}
            </p>
            {isDistributorFamily && (
              <Button onClick={() => setIsUploadOpen(true)}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Carica preventivo PDF
              </Button>
            )}
          </div>
        </div>

        {/* ── Quote List ── */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader className="h-8 w-8 animate-spin" /></div>
        ) : filteredQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground space-y-3">
            <FileText className="h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">{hasActiveFilters ? 'Nessun risultato trovato' : 'Nessun preventivo'}</p>
            {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Rimuovi filtri</Button>}
            {isDistributorFamily && !hasActiveFilters && (
              <p className="text-sm">Carica il primo preventivo usando il pulsante in alto a destra.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredQuotes.map(quote => (
              <div
                key={quote.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 rounded-lg bg-red-50 p-2 dark:bg-red-950">
                      <FileText className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate" title={quote.fileName}>
                        {quote.fileName}
                      </p>
                      {quote.riferimento && (
                        <p className="text-xs text-primary font-mono truncate">Rif. {quote.riferimento}</p>
                      )}
                    </div>
                  </div>
                  {isDistributorFamily && !isDistributorUser && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(quote)}
                        title="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {/* Delete button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Elimina preventivo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare &quot;{quote.fileName}&quot;? L&apos;azione non è reversibile.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(quote)} className="bg-destructive hover:bg-destructive/90">
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                {/* Description */}
                {quote.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{quote.description}</p>
                )}

                {/* Meta */}
                <div className="mt-auto space-y-1.5">
                  {isDistributorFamily && !isDistributorUser && (
                    <Badge variant="secondary" className="text-xs">
                      {getCompanyName(quote.companyId)}
                    </Badge>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Caricato {format(new Date(quote.uploadedAt), 'dd MMM yyyy', { locale: it })}</span>
                    {quote.scadenza && (
                      <span className="flex items-center gap-1 text-orange-500 font-medium">
                        <CalendarDays className="h-3 w-3" />
                        Scade {format(parseISO(quote.scadenza), 'dd MMM yyyy', { locale: it })}
                      </span>
                    )}
                  </div>
                  {quote.textContent && (
                    <p className="text-[10px] text-muted-foreground/60 italic line-clamp-1">
                      📄 Testo ricercabile disponibile
                    </p>
                  )}
                </div>

                {/* Open button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={openingQuoteId === quote.id}
                  onClick={() => handleOpenQuote(quote)}
                >
                  {openingQuoteId === quote.id
                    ? <Loader className="mr-2 h-3.5 w-3.5 animate-spin" />
                    : <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  }
                  {openingQuoteId === quote.id ? 'Apertura...' : 'Visualizza / Scarica'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Upload Dialog ── */}
      <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if (!open) resetUploadForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Carica preventivo PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Company */}
            <div className="space-y-1.5">
              <Label htmlFor="target-company">Installatore destinatario *</Label>
              <Select value={uploadTargetCompany} onValueChange={setUploadTargetCompany}>
                <SelectTrigger id="target-company">
                  <SelectValue placeholder="Seleziona l'installatore" />
                </SelectTrigger>
                <SelectContent>
                  {managedCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Riferimento + Scadenza in row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="riferimento">Riferimento</Label>
                <Input
                  id="riferimento"
                  placeholder="Es. PRV-2026-042"
                  value={uploadRiferimento}
                  onChange={e => setUploadRiferimento(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scadenza">Scadenza</Label>
                <Input
                  id="scadenza"
                  type="date"
                  value={uploadScadenza}
                  onChange={e => setUploadScadenza(e.target.value)}
                />
              </div>
            </div>

            {/* PDF file picker */}
            <div className="space-y-1.5">
              <Label htmlFor="pdf-file">File PDF *</Label>
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                {uploadFile ? (
                  <p className="text-sm font-medium text-primary">{uploadFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Clicca per selezionare un PDF (max 10 MB)</p>
                )}
                <input
                  ref={fileInputRef}
                  id="pdf-file"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Descrizione (opzionale)</Label>
              <Textarea
                id="description"
                placeholder="Es. Preventivo impianto fotovoltaico – aprile 2026"
                rows={2}
                value={uploadDescription}
                onChange={e => setUploadDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isUploading}>Annulla</Button>
            </DialogClose>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !uploadFile || !uploadTargetCompany}
            >
              {isUploading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Caricamento in corso...' : 'Carica preventivo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingQuote} onOpenChange={(open) => { if (!open) setEditingQuote(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica preventivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground truncate">
              📄 {editingQuote?.fileName}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-riferimento">Riferimento</Label>
                <Input
                  id="edit-riferimento"
                  placeholder="Es. PRV-2026-042"
                  value={editRiferimento}
                  onChange={e => setEditRiferimento(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-scadenza">Scadenza</Label>
                <Input
                  id="edit-scadenza"
                  type="date"
                  value={editScadenza}
                  onChange={e => setEditScadenza(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Descrizione</Label>
              <Textarea
                id="edit-description"
                placeholder="Note aggiuntive..."
                rows={3}
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSaving}>Annulla</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
