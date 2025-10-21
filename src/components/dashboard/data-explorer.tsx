
'use client';

import React, { useState, useMemo, useRef, useEffect, forwardRef } from 'react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadCloud, Check, X, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { updateDocument } from '@/lib/data';

interface ImageEditDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  imageUrl: string;
  onSave: (newUrl: string) => void;
}

function ImageEditDialog({ isOpen, setIsOpen, imageUrl, onSave }: ImageEditDialogProps) {
  const [newUrl, setNewUrl] = useState(imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNewUrl(imageUrl);
  }, [imageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave(newUrl);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Modifica Immagine</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL Immagine</Label>
            <Input id="imageUrl" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Clicca per caricare</span> o trascina</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF</p>
                </div>
                <input ref={fileInputRef} id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>
          </div>
          {newUrl && <Image src={newUrl} alt="Preview" width={100} height={100} className="object-contain rounded-md mx-auto" />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Annulla</Button>
          <Button onClick={handleSave}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EditableCell = forwardRef<HTMLTextAreaElement, { value: any, onSave: (newValue: any) => void }>(({ value, onSave }, ref) => {
    const [localValue, setLocalValue] = useState(value);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleSave = async () => {
        if (localValue === value) return;
        setIsSaving(true);
        try {
            let finalValue = localValue;
            // Attempt to parse as number if original was a number
            if (typeof value === 'number') {
                const num = parseFloat(localValue);
                if (!isNaN(num)) finalValue = num;
            }
            // Attempt to parse as boolean if original was a boolean
            else if (typeof value === 'boolean') {
                 if (localValue.toString().toLowerCase() === 'true') finalValue = true;
                 if (localValue.toString().toLowerCase() === 'false') finalValue = false;
            }
            // Attempt to parse as JSON if it's an object/array
            else if (typeof value === 'object' && value !== null) {
                try {
                    finalValue = JSON.parse(localValue);
                } catch(e) { /* ignore parse error, save as string */ }
            }
            await onSave(finalValue);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="relative group">
            <textarea
                ref={ref}
                value={localValue === null || localValue === undefined ? '' : typeof localValue === 'object' ? JSON.stringify(localValue, null, 2) : String(localValue)}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
                className="w-full bg-transparent p-1 -m-1 border border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-md resize-none min-h-[40px]"
            />
             {isSaving && <Loader className="absolute top-1 right-1 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
    );
});
EditableCell.displayName = 'EditableCell';


const DataCell = ({ data, onSave }: { data: any; onSave: (newValue: any) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (isEditing) {
        textareaRef.current?.focus();
        textareaRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async (newValue: any) => {
    try {
        await onSave(newValue);
        toast({ title: 'Campo aggiornato', description: 'Il dato è stato salvato correttamente.' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Errore', description: e.message || 'Impossibile salvare il dato.' });
    }
    setIsEditing(false);
  };

  if (data === null || data === undefined) {
    return <pre className="text-xs text-muted-foreground">null</pre>;
  }
  
  if (typeof data === 'boolean') {
    return data ? <Check className="text-green-500"/> : <X className="text-red-500" />;
  }

  if (typeof data === 'string' && (data.startsWith('data:image') || data.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) || data.includes('pravatar.cc'))) {
    const handleImageSave = async (newUrl: string) => {
      try {
        await onSave(newUrl);
        toast({ title: 'Immagine aggiornata', description: 'Il campo immagine è stato salvato.' });
      } catch (e) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile salvare l\'immagine.' });
      }
    };
    return (
      <>
        <Image src={data} alt="Data image" width={40} height={40} className="object-contain rounded-md cursor-pointer" onClick={() => { setCurrentImageUrl(data); setIsImageEditorOpen(true); }} />
        <ImageEditDialog isOpen={isImageEditorOpen} setIsOpen={setIsImageEditorOpen} imageUrl={currentImageUrl} onSave={handleImageSave} />
      </>
    );
  }

  // Date check
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
    const date = new Date(data);
    if (isValid(date)) {
        return <span className="text-xs">{format(date, 'dd/MM/yy HH:mm', { locale: it })}</span>;
    }
  }

  const jsonString = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
  const isExpandable = jsonString.length > 50;

  if (isEditing) {
      return <EditableCell value={data} onSave={handleSave} ref={textareaRef} />;
  }

  return (
    <div className="text-xs" onClick={() => { if (!isExpandable) setIsEditing(true); }}>
        <pre onClick={() => isExpandable && setIsExpanded(!isExpanded)} className={`whitespace-pre-wrap break-all ${isExpandable && !isExpanded ? 'truncate' : ''} ${isExpandable ? 'cursor-pointer' : ''}`}>
            {jsonString}
        </pre>
    </div>
  )
}

interface DataExplorerProps {
    data: any[];
    collectionName: string;
    onDataChange: () => void;
}

export function DataExplorer({ data, collectionName, onDataChange }: DataExplorerProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        return data.filter(item => 
            JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    if (!data || data.length === 0) {
        return <p className="text-muted-foreground p-4">Nessun dato disponibile in questa collezione.</p>;
    }

    const allKeys = new Set<string>();
    data.forEach(item => {
        Object.keys(item).forEach(key => {
            allKeys.add(key);
        });
    });
    const headers = Array.from(allKeys);
    
    // Move 'id' to the beginning
    const sortedHeaders = ['id', ...headers.filter(h => h !== 'id')];


    const handleSave = (docId: string, field: string) => async (newValue: any) => {
        await updateDocument(collectionName, docId, { [field]: newValue });
        onDataChange();
    };

    return (
        <div className="space-y-4">
            <Input 
                placeholder="Cerca in tutti i campi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            <Card>
                <ScrollArea className="h-[calc(100vh-22rem)]">
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            {sortedHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((row) => (
                            <TableRow key={row.id}>
                                {sortedHeaders.map(header => (
                                    <TableCell key={header}>
                                        <DataCell 
                                            data={row[header]} 
                                            onSave={handleSave(row.id, header)}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </ScrollArea>
            </Card>
        </div>
    )
}
