'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader, UploadCloud, FileType, CheckCircle2, AlertCircle } from 'lucide-react';
import { addCompany } from '@/lib/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateShortId } from '@/lib/utils';

interface ImportInstallersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  distributorId: string;
}

interface ParsedRow {
  name: string;
  email: string;
  adminName: string;
  phone?: string;
  address?: string;
  city?: string;
  vatNumber?: string;
  taxCode?: string;
  referentName?: string;
  referentPhone?: string;
}

export function ImportInstallersDialog({ isOpen, onClose, onSuccess, distributorId }: ImportInstallersDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(/,|;/).map(h => h.trim().toLowerCase());
    
    // Map expected columns
    const getIndex = (possibleNames: string[]) => {
        for (const name of possibleNames) {
            const idx = headers.findIndex(h => h === name || h.includes(name));
            if (idx !== -1) return idx;
        }
        return -1;
    };

    const idxName = getIndex(['ragione sociale', 'nome', 'azienda', 'company', 'name']);
    const idxEmail = getIndex(['email', 'e-mail']);
    const idxAdmin = getIndex(['nome admin', 'amministratore', 'admin', 'referente admin']);
    const idxPhone = getIndex(['telefono', 'phone', 'tel']);
    const idxAddress = getIndex(['indirizzo', 'address', 'via']);
    const idxCity = getIndex(['città', 'citta', 'city', 'comune']);
    const idxVat = getIndex(['partita iva', 'piva', 'vat']);
    const idxTax = getIndex(['codice fiscale', 'cf']);
    const idxRefName = getIndex(['referente', 'nome referente']);
    const idxRefPhone = getIndex(['cellulare', 'cell', 'cellulare referente']);

    const data: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        // Simple CSV split (doesn't handle quotes well, but sufficient for basic data)
        const row = lines[i].split(/,|;/).map(col => col.trim());
        
        if (idxName !== -1 && row[idxName] && idxEmail !== -1 && row[idxEmail]) {
             data.push({
                 name: row[idxName],
                 email: row[idxEmail],
                 adminName: idxAdmin !== -1 && row[idxAdmin] ? row[idxAdmin] : row[idxName], // fallback to company name
                 phone: idxPhone !== -1 ? row[idxPhone] : undefined,
                 address: idxAddress !== -1 ? row[idxAddress] : undefined,
                 city: idxCity !== -1 ? row[idxCity] : undefined,
                 vatNumber: idxVat !== -1 ? row[idxVat] : undefined,
                 taxCode: idxTax !== -1 ? row[idxTax] : undefined,
                 referentName: idxRefName !== -1 ? row[idxRefName] : undefined,
                 referentPhone: idxRefPhone !== -1 ? row[idxRefPhone] : undefined,
             });
        }
    }

    return data;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv') && !selected.name.endsWith('.txt')) {
        toast({ title: 'Formato non supportato', description: 'Per favore carica un file CSV.', variant: 'destructive' });
        return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        setParsedData(data);
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsUploading(true);
    setImportResults(null);

    let successCount = 0;
    const errors: string[] = [];

    for (const row of parsedData) {
        try {
            await addCompany({
                name: row.name,
                email: row.email,
                adminName: row.adminName,
                password: generateShortId(10), // Random temp password
                distributorId: distributorId,
                creatorId: undefined, // Let it be null or handled by backend
                address: row.address,
                city: row.city,
                phone: row.phone,
                vatNumber: row.vatNumber,
                taxCode: row.taxCode,
                referentName: row.referentName,
                referentPhone: row.referentPhone
            });
            successCount++;
        } catch (error: any) {
            errors.push(`${row.name}: ${error.message || 'Errore sconosciuto'}`);
        }
    }

    setImportResults({ success: successCount, errors });
    setIsUploading(false);
    onSuccess();
    if (successCount > 0) {
        toast({ title: 'Importazione completata', description: `${successCount} installatori importati con successo.` });
    }
  };

  const resetState = () => {
      setFile(null);
      setParsedData([]);
      setImportResults(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
      resetState();
      onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importa Installatori</DialogTitle>
          <DialogDescription>
            Carica un file CSV contenente i dati degli installatori. Le colonne riconosciute sono: <b>Nome, Email, Admin, Indirizzo, Città, Telefono, Partita IVA, Codice Fiscale, Referente, Cellulare</b>.
          </DialogDescription>
        </DialogHeader>

        {!importResults ? (
            <div className="space-y-4 my-4">
                <div 
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="font-medium text-sm">Clicca per selezionare un file CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {file ? file.name : "Nessun file selezionato"}
                    </p>
                    <Input 
                        ref={fileInputRef} 
                        type="file" 
                        accept=".csv,.txt" 
                        className="hidden" 
                        onChange={handleFileChange}
                    />
                </div>

                {parsedData.length > 0 && (
                    <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm font-medium mb-2 flex items-center">
                            <FileType className="h-4 w-4 mr-2" />
                            Trovati {parsedData.length} installatori validi nel file
                        </p>
                        <ScrollArea className="h-32 rounded border bg-card p-2">
                            {parsedData.map((d, i) => (
                                <div key={i} className="text-xs border-b last:border-0 py-1">
                                    <b>{d.name}</b> ({d.email}) - {d.city || 'Nessuna città'}
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                )}
            </div>
        ) : (
            <div className="space-y-4 my-4">
                <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-3 border border-green-200">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                        <p className="font-medium">Importazione conclusa</p>
                        <p className="text-sm">{importResults.success} installatori importati con successo.</p>
                    </div>
                </div>

                {importResults.errors.length > 0 && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <p className="font-medium">Errori riscontrati ({importResults.errors.length})</p>
                        </div>
                        <ScrollArea className="h-24">
                            <ul className="text-xs space-y-1 list-disc pl-4">
                                {importResults.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </div>
                )}
            </div>
        )}

        <DialogFooter>
          {!importResults ? (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isUploading}>Annulla</Button>
                <Button onClick={handleImport} disabled={parsedData.length === 0 || isUploading}>
                    {isUploading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                    Importa Dati
                </Button>
              </>
          ) : (
              <Button onClick={handleClose}>Chiudi</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
