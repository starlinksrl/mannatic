
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Check, ChevronsUpDown, UploadCloud, File as FileIcon, Trash2, Image as ImageIcon, FileText, Loader } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Intervention, User, InterventionPriority, InterventionType, Attachment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addIntervention, addUser } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ScrollArea } from '../ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { compressAttachment } from '@/lib/image-compression';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  type: z.enum(['standard', 'new_installation']),
  description: z.string().optional(),
  priority: z.enum(['Bassa', 'Media', 'Alta', 'Critica'], { required_error: 'La priorità è obbligatoria.' }),
  dueDate: z.date().optional(),
  dueTime: z.string().optional(),
  assignedOperatorIds: z.array(z.string()).default([]),
  attachments: z.array(z.any()).optional(),
  notifyClient: z.boolean().default(false).optional(),
  cost: z.coerce.number().min(0).optional().nullable(),
});

interface AddInterventionFormProps {
  children: React.ReactNode;
  onInterventionAdded: (intervention: Intervention) => void;
  onClientCreated?: (client: User) => void;
  clients: User[];
  operators: User[];
  currentUser: User;
  defaultType?: InterventionType;
}

export function AddInterventionForm({ children, onInterventionAdded, onClientCreated, clients, operators, currentUser, defaultType = 'standard' }: AddInterventionFormProps) {
  // Clients are strictly prevented from opening interventions directly
  if (currentUser.role === 'Client') {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useUser();
  const [clientList, setClientList] = useState(clients);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Creator';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      type: defaultType,
      assignedOperatorIds: [],
      priority: 'Bassa',
      clientId: undefined,
      dueTime: '',
      attachments: [],
      notifyClient: false,
      cost: null,
    },
  });
  
  const attachments = form.watch('attachments');
  const selectedClientId = form.watch('clientId');

  const [openInterventionsCount, setOpenInterventionsCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !selectedClientId || !currentCompany) return;

    async function checkOpenInterventions() {
      try {
        const { getInterventions } = await import('@/lib/data');
        const allInterventions = await getInterventions(currentCompany!.id);
        const count = allInterventions.filter(i => 
          i.clientId === selectedClientId && 
          (i.status === 'Nuovo' || i.status === 'In Corso' || i.status === 'In Attesa Ricambi')
        ).length;
        setOpenInterventionsCount(count);
      } catch (e) {
        console.error("Error checking open interventions:", e);
      }
    }
    
    checkOpenInterventions();
  }, [isOpen, selectedClientId, currentCompany]);
  
  useEffect(() => {
    if (isOpen) {
        form.reset({
            title: '',
            description: '',
            type: defaultType,
            assignedOperatorIds: [],
            priority: 'Bassa',
            clientId: undefined,
            dueTime: '',
            attachments: [],
            notifyClient: false,
            cost: null,
        });
        setClientSearchValue('');
        setOpenInterventionsCount(0);
    }
  }, [isOpen, defaultType, currentUser, form]);

  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany || !currentUser) return;
    if (currentUser.role === 'Client') {
      toast({
        variant: 'destructive',
        title: 'Non autorizzato',
        description: 'Gli utenti finali possono aprire esclusivamente ticket di supporto.',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      let finalDueDate: string | null = null;
      if (values.dueDate) {
        let date = values.dueDate;
        if (values.dueTime) {
          const [hours, minutes] = values.dueTime.split(':').map(Number);
          date = setHours(date, hours);
          date = setMinutes(date, minutes);
        }
        finalDueDate = date.toISOString();
      }
      
      let clientIdentifier = values.clientId;
      let existingClient = clientList.find(c => c.id === values.clientId || c.name.toLowerCase() === values.clientId.toLowerCase());

      if (!existingClient && values.clientId && values.clientId.trim() !== '') {
        const clientName = values.clientId.trim();
        const cleanSlug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'cliente';
        const placeholderEmail = `cliente_${cleanSlug}_${Date.now()}@placeholder.local`;
        
        try {
          const newClientUser = await addUser({
            name: clientName,
            email: placeholderEmail,
            role: 'Client',
            companyId: currentCompany.id,
          });

          if (newClientUser && newClientUser.id) {
            clientIdentifier = newClientUser.id;
            setClientList(prev => {
              if (prev.some(c => c.id === newClientUser.id)) return prev;
              return [...prev, newClientUser];
            });
            if (onClientCreated) onClientCreated(newClientUser);
          }
        } catch (clientErr: any) {
          console.error("Error creating inline client user:", clientErr);
        }
      } else if (existingClient) {
        clientIdentifier = existingClient.id;
      }

      const newIntervention = await addIntervention({
          title: values.title,
          type: values.type as InterventionType,
          clientId: clientIdentifier,
          description: values.description || values.title,
          priority: values.priority as InterventionPriority,
          dueDate: finalDueDate,
          status: 'Nuovo',
          sla: (values as any).sla || '24h',
          companyId: currentCompany.id,
          assignedOperatorIds: values.assignedOperatorIds || [],
          attachments: values.attachments || [],
          cost: isAdmin ? (values.cost ?? null) : null,
      });
      
      onInterventionAdded(newIntervention);
      
      toast({
        title: 'Intervento creato',
        description: `L'intervento "${values.title}" è stato creato con successo.`,
      });
      setIsOpen(false);
      form.reset();
    } catch (err: any) {
      console.error("Error in create intervention onSubmit:", err);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: err?.message || "Impossibile creare l'intervento.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let newAttachments: Attachment[] = [];
    let hadError = false;

    for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
            toast({
                variant: 'destructive',
                title: 'File troppo grande',
                description: `Il file "${file.name}" supera il limite di 5MB.`,
            });
            hadError = true;
            continue;
        }

        try {
            const dataUri = await compressAttachment(file);
            try {
              const { uploadFileToSupabase } = await import('@/lib/supabase-storage');
              const uploadRes = await uploadFileToSupabase(dataUri, file.name, 'interventions');
              newAttachments.push({
                  id: uuidv4(),
                  name: file.name,
                  url: uploadRes.url || dataUri,
                  type: file.type,
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: currentUser.name,
              });
            } catch(e) {
              newAttachments.push({
                  id: uuidv4(),
                  name: file.name,
                  url: dataUri,
                  type: file.type,
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: currentUser.name,
              });
            }
        } catch (error) {
            console.error("File read/compression failed", error);
            toast({
                variant: 'destructive',
                title: 'Lettura file fallita',
                description: `Impossibile leggere o comprimere il file "${file.name}".`,
            });
            hadError = true;
        }
    }

    if (newAttachments.length > 0) {
        form.setValue('attachments', [
            ...(form.getValues('attachments') || []),
            ...newAttachments,
        ]);
    }
    setIsUploading(false);
    if (!hadError) {
        toast({
            title: 'File aggiunti',
            description: 'Ricorda di creare l\'intervento per salvare gli allegati.',
        });
    }
  };

  const handleRemoveAttachment = async (attachmentToRemove: Attachment) => {
    form.setValue('attachments', (form.getValues('attachments') || []).filter(att => att.id !== attachmentToRemove.id));
    toast({
        title: 'Allegato rimosso',
        description: `Il file "${attachmentToRemove.name}" è stato rimosso dalla lista.`,
    });
  }
  
   const AttachmentPreview = ({ att }: { att: Attachment }) => {
    if (att.type.startsWith('image/')) {
        return <ImageIcon className="h-5 w-5" />;
    }
    if (att.type === 'application/pdf') {
        return <FileText className="h-5 w-5" />;
    }
    return <FileIcon className="h-5 w-5" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl flex flex-col p-0 max-h-[calc(100dvh-1.5rem)] md:max-h-[90vh] h-[calc(100dvh-1.5rem)] md:h-auto w-[calc(100%-1rem)] sm:w-full rounded-2xl md:rounded-lg overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-0 shrink-0 pr-12">
          <DialogTitle>Crea nuovo intervento</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 h-auto overflow-y-auto">
            <div className="p-4 sm:p-6">
                {openInterventionsCount > 0 && (
                    <Alert variant="destructive" className="mb-4 bg-yellow-50 text-yellow-800 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-800" />
                        <AlertTitle>Attenzione</AlertTitle>
                        <AlertDescription>
                            Questo cliente ha già <strong>{openInterventionsCount}</strong> {openInterventionsCount === 1 ? 'intervento aperto o in corso' : 'interventi aperti o in corso'}. Verifica se è necessario crearne uno nuovo.
                        </AlertDescription>
                    </Alert>
                )}
                <Form {...form}>
                <form id="add-intervention-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Cliente</FormLabel>
                                <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "justify-between font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                disabled={currentUser.role === 'Client'}
                                            >
                                                {field.value
                                                    ? clientList.find(
                                                        (client) => client.id === field.value
                                                    )?.name ?? field.value
                                                    : "Seleziona o crea un cliente"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] max-h-[300px]">
                                        <Command>
                                            <CommandInput 
                                                placeholder="Cerca o crea cliente..." 
                                                value={clientSearchValue}
                                                onValueChange={setClientSearchValue}
                                            />
                                            <CommandList>
                                                <CommandEmpty>
                                                    {clientSearchValue.trim() && (
                                                        <Button 
                                                            type="button"
                                                            variant="ghost" 
                                                            className="w-full justify-start text-primary font-medium"
                                                            onClick={() => {
                                                                form.setValue("clientId", clientSearchValue.trim());
                                                                setClientPopoverOpen(false);
                                                            }}
                                                        >
                                                            + Crea &quot;{clientSearchValue.trim()}&quot;
                                                        </Button>
                                                    )}
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {clientList.map((client) => (
                                                        <CommandItem
                                                            value={client.name}
                                                            key={client.id}
                                                            onSelect={() => {
                                                                form.setValue("clientId", client.id);
                                                                setClientSearchValue('');
                                                                setClientPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    client.id === field.value ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {client.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                         <FormItem>
                            <FormLabel>Titolo</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="Es. Riparazione perdita..." 
                                    {...field}
                                    autoComplete="off"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    
                     <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo Intervento</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona un tipo" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="new_installation">Nuovo Impianto</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    

                    <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descrizione</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Descrivi il problema in dettaglio (se vuoto, verrà usato il titolo)..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    {isAdmin && (
                        <FormField
                            control={form.control}
                            name="cost"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Costo Previsto (€)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Allegati</h4>
                       <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Attenzione</AlertTitle>
                        <AlertDescription>
                           La dimensione totale degli allegati non deve superare 5MB per non rallentare l'applicazione.
                        </AlertDescription>
                      </Alert>
                       <div className="space-y-2">
                        {(attachments || []).map((att) => (
                           <div key={att.id} className="flex items-center justify-between p-2 border rounded-md">
                               <div className="flex items-center gap-2 text-sm truncate">
                                    <AttachmentPreview att={att} />
                                    <span className="truncate">{att.name}</span>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveAttachment(att)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                           </div>
                        ))}
                        {(!attachments || attachments.length === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-2">Nessun allegato.</p>
                        )}
                       </div>
                       <div>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" disabled={isUploading} />
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                              <UploadCloud className="mr-2" />
                              {isUploading ? 'Caricamento...' : 'Aggiungi File'}
                          </Button>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Priorità</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona una priorità" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Bassa">Bassa</SelectItem>
                                    <SelectItem value="Media">Media</SelectItem>
                                    <SelectItem value="Alta">Alta</SelectItem>
                                    <SelectItem value="Critica">Critica</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-2">
                             <FormField
                                control={form.control}
                                name="dueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Scadenza (Opz.)</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "dd/MM/yy", { locale: it })
                                            ) : (
                                                <span>Scegli data</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                            locale={it}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                            )}
                            />
                            <FormField
                                control={form.control}
                                name="dueTime"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Ora</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {currentUser.role === 'Admin' && (
                         <FormField
                            control={form.control}
                            name="assignedOperatorIds"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Assegna a Operatori</FormLabel>
                                     <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-full justify-between"
                                                >
                                                    <span className="truncate">
                                                        {form.getValues('assignedOperatorIds').length > 0
                                                        ? `${form.getValues('assignedOperatorIds').length} operatori selezionati`
                                                        : "Seleziona operatori..."}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Cerca operatore..." />
                                                <CommandList>
                                                    <CommandEmpty>Nessun operatore trovato.</CommandEmpty>
                                                    <CommandGroup>
                                                        {operators.map((operator) => (
                                                            <FormField
                                                                key={operator.id}
                                                                control={form.control}
                                                                name="assignedOperatorIds"
                                                                render={({ field }) => {
                                                                    return (
                                                                        <CommandItem
                                                                            key={operator.id}
                                                                            onSelect={() => {
                                                                                const selected = field.value || [];
                                                                                const isSelected = selected.includes(operator.id);
                                                                                const newSelection = isSelected
                                                                                    ? selected.filter((id) => id !== operator.id)
                                                                                    : [...selected, operator.id];
                                                                                field.onChange(newSelection);
                                                                            }}
                                                                        >
                                                                            <Checkbox
                                                                                className="mr-2"
                                                                                checked={field.value?.includes(operator.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                     const selected = field.value || [];
                                                                                     const isSelected = selected.includes(operator.id);
                                                                                     const newSelection = isSelected
                                                                                         ? selected.filter((id) => id !== operator.id)
                                                                                         : [...selected, operator.id];
                                                                                     field.onChange(newSelection);
                                                                                }}
                                                                            />
                                                                            {operator.name}
                                                                        </CommandItem>
                                                                    );
                                                                }}
                                                            />
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                     <FormField
                            control={form.control}
                            name="notifyClient"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Notifica il cliente via email
                                        </FormLabel>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />
                </form>
                </Form>
            </div>
        </ScrollArea>
        <DialogFooter className="flex-col-reverse sm:flex-row p-4 sm:p-6 gap-2 border-t shrink-0 bg-background">
            <DialogClose asChild>
                <Button variant="outline" disabled={isSubmitting}>Annulla</Button>
            </DialogClose>
            <Button type="submit" form="add-intervention-form" disabled={isSubmitting}>
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Crea intervento
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
