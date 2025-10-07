

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
import { addIntervention } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ScrollArea } from '../ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  type: z.enum(['standard', 'new_installation']),
  description: z.string().optional(),
  priority: z.enum(['Bassa', 'Media', 'Alta', 'Critica'], { required_error: 'La priorità è obbligatoria.' }),
  dueDate: z.date().optional(),
  dueTime: z.string().optional(),
  assignedOperatorId: z.string().nullable(),
  attachments: z.array(z.any()).optional(),
  notifyClient: z.boolean().default(false).optional(),
}).refine(data => (data.dueDate && data.dueTime) || !data.dueDate, {
    message: "L'ora è obbligatoria se la data è specificata.",
    path: ["dueTime"],
});

interface AddInterventionFormProps {
  children: React.ReactNode;
  onInterventionAdded: (intervention: Intervention) => void;
  clients: User[];
  operators: User[];
  currentUser: User;
  defaultType?: InterventionType;
}

export function AddInterventionForm({ children, onInterventionAdded, clients, operators, currentUser, defaultType = 'standard' }: AddInterventionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useUser();
  const [clientList, setClientList] = useState(clients);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      type: defaultType,
      assignedOperatorId: null,
      priority: 'Bassa',
      clientId: currentUser.role === 'Client' ? currentUser.id : undefined,
      dueTime: '',
      attachments: [],
      notifyClient: false,
    },
  });
  
  const attachments = form.watch('attachments');
  
  useEffect(() => {
    if (isOpen) {
        form.reset({
            title: '',
            description: '',
            type: defaultType,
            assignedOperatorId: null,
            priority: 'Bassa',
            clientId: currentUser.role === 'Client' ? currentUser.id : undefined,
            dueTime: '',
            attachments: [],
            notifyClient: false,
        });
    }
  }, [isOpen, defaultType, currentUser, form]);

  useEffect(() => {
    setClientList(clients);
  }, [clients])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany || !currentUser) return;
    
    setIsSubmitting(true);
    let finalDueDate: string | null = null;
    if (values.dueDate && values.dueTime) {
      const [hours, minutes] = values.dueTime.split(':').map(Number);
      let date = values.dueDate;
      date = setHours(date, hours);
      date = setMinutes(date, minutes);
      finalDueDate = date.toISOString();
    } else if (values.dueDate) {
      finalDueDate = values.dueDate.toISOString();
    }
    
    const clientIdentifier = values.clientId;


    const newIntervention = await addIntervention({
        ...values,
        type: values.type as InterventionType,
        clientId: clientIdentifier,
        description: values.description || values.title,
        priority: values.priority as InterventionPriority,
        dueDate: finalDueDate,
        companyId: currentCompany.id,
        creatorName: currentUser.name,
        attachments: values.attachments,
        notifyClient: values.notifyClient || false,
    });
    
    onInterventionAdded(newIntervention);
    
    toast({
      title: 'Intervento creato',
      description: `L'intervento "${values.title}" è stato creato con successo.`,
    });
    setIsSubmitting(false);
    setIsOpen(false);
    form.reset();
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

        const reader = new FileReader();
        const promise = new Promise<Attachment>((resolve, reject) => {
            reader.onloadend = () => {
                resolve({
                    id: uuidv4(),
                    name: file.name,
                    url: reader.result as string, // This will be a temporary data URI
                    type: file.type,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: currentUser.name,
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        try {
            const newAttachment = await promise;
            newAttachments.push(newAttachment);
        } catch (error) {
            console.error("File read failed", error);
            toast({
                variant: 'destructive',
                title: 'Lettura file fallita',
                description: `Impossibile leggere il file "${file.name}".`,
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
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0 max-h-screen md:max-h-[90vh] md:h-auto h-screen w-screen max-w-full md:w-full rounded-none md:rounded-lg">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Crea nuovo intervento</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                <Form {...form}>
                <form id="add-intervention-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        name="clientId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Cliente</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "justify-between",
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
                                    <PopoverContent className="p-0">
                                        <Command>
                                            <CommandInput placeholder="Cerca o crea cliente..." />
                                            <CommandEmpty>
                                                 <Button variant="ghost" className="w-full justify-start"
                                                    onClick={() => {
                                                        const inputValue = (document.querySelector('[cmdk-input]') as HTMLInputElement)?.value;
                                                        form.setValue("clientId", inputValue)
                                                        const popoverTrigger = (document.querySelector('[role=combobox]') as HTMLElement);
                                                        popoverTrigger?.click();
                                                    }}
                                                  >
                                                    Crea "{ (document.querySelector('[cmdk-input]') as HTMLInputElement)?.value }"
                                                  </Button>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {clientList.map((client) => (
                                                    <CommandItem
                                                        value={client.name}
                                                        key={client.id}
                                                        onSelect={() => {
                                                            form.setValue("clientId", client.id)
                                                            const popoverTrigger = (document.querySelector('[role=combobox]') as HTMLElement);
                                                            popoverTrigger?.click();
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
                                        </Command>
                                    </PopoverContent>
                                </Popover>
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
                            name="assignedOperatorId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Assegna a Operatore</FormLabel>
                                <Select 
                                    onValueChange={(value) => field.onChange(value === 'null' ? null : value)} 
                                    value={field.value || 'null'}
                                >
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assegna a un operatore (opzionale)" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="null">Non assegnato</SelectItem>
                                    {operators.map(operator => (
                                        <SelectItem key={operator.id} value={operator.id}>{operator.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {currentUser.role !== 'Client' && (
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
                    )}
                </form>
                </Form>
            </div>
        </ScrollArea>
        <DialogFooter className="flex-col-reverse sm:flex-row p-6 pt-0 border-t">
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
