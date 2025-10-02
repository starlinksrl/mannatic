

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
  DialogFooter,
  DialogClose,
  DialogDescription,
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
import { CalendarIcon, MessageSquarePlus, Pencil, UploadCloud, File as FileIcon, Trash2, AlertCircle, FileText, Image as ImageIcon, Download, Loader, Play, StopCircle, MapPin } from 'lucide-react';
import { format, formatDistanceToNow, setHours, setMinutes, differenceInMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Intervention, Client, User, InterventionPriority, InterventionStatus, InterventionType, Attachment, AppConfiguration, WorkLog, GeolocationPosition } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateIntervention, getUserById, getAppConfiguration } from '@/lib/data';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useUser } from '@/contexts/user-context';
import { EditUserForm } from './edit-user-form';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Image from 'next/image';
import { fetchAttachmentAction } from '@/app/actions';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  type: z.enum(['standard', 'new_installation']),
  description: z.string().min(10, { message: 'La descrizione deve contenere almeno 10 caratteri.' }),
  priority: z.enum(['Bassa', 'Media', 'Alta', 'Critica'], { required_error: 'La priorità è obbligatoria.' }),
  status: z.enum(['Nuovo', 'In corso', 'In attesa', 'Completato', 'Annullato', 'Da Fatturare', 'Fatturato'], { required_error: 'Lo stato è obbligatorio.' }),
  dueDate: z.date().optional(),
  dueTime: z.string().optional(),
  assignedOperatorId: z.string().nullable(),
  newUpdate: z.string().optional(),
  timeSpent: z.coerce.number().positive({ message: 'Le ore impiegate devono essere un numero positivo.' }).optional(),
  materialsUsed: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  workLogs: z.array(z.any()).optional(),
}).superRefine((data, ctx) => {
    if (data.status === 'Completato') {
        if (!data.timeSpent) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['timeSpent'],
                message: 'Le ore impiegate sono obbligatorie per completare l\'intervento.',
            });
        }
        if (!data.materialsUsed || data.materialsUsed.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['materialsUsed'],
                message: 'I materiali impiegati sono obbligatori per completare l\'intervento.',
            });
        }
    }
});


interface EditInterventionFormProps {
  intervention: Intervention | null;
  onInterventionUpdated: () => void;
  onClientUpdated: (user: User) => void;
  clients: Client[];
  operators: User[];
  currentUser: User;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function EditInterventionForm({ intervention, onInterventionUpdated, onClientUpdated, clients, operators, currentUser, isOpen, setIsOpen }: EditInterventionFormProps) {
  const { toast } = useToast();
  const [isClientEditOpen, setIsClientEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingGeo, setIsProcessingGeo] = useState(false);
  const [attachmentToView, setAttachmentToView] = useState<Attachment | null>(null);
  const [isFetchingAttachment, setIsFetchingAttachment] = useState(false);
  const [attachmentDataUri, setAttachmentDataUri] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfiguration | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'standard',
      dueTime: '',
      attachments: [],
      workLogs: [],
    }
  });

  useEffect(() => {
    async function loadConfig() {
        const config = await getAppConfiguration();
        setAppConfig(config);
    }
    loadConfig();

    if (intervention) {
      const dueDate = intervention.dueDate ? new Date(intervention.dueDate) : undefined;
      form.reset({
        ...intervention,
        type: intervention.type || 'standard',
        dueDate: dueDate,
        dueTime: intervention.dueDate ? format(new Date(intervention.dueDate), 'HH:mm') : '',
        priority: intervention.priority,
        status: intervention.status,
        assignedOperatorId: intervention.assignedOperatorId || null,
        newUpdate: '',
        timeSpent: intervention.timeSpent ?? undefined,
        materialsUsed: intervention.materialsUsed ?? '',
        attachments: intervention.attachments || [],
        workLogs: intervention.workLogs || [],
      });
    }
  }, [intervention, form]);
  
  const attachments = form.watch('attachments');
  const workLogs = form.watch('workLogs') as WorkLog[] | undefined;
  const activeWorkLog = workLogs?.find(log => log.operatorId === currentUser.id && !log.endTime);


  const handleOpenClientEdit = async () => {
    const clientId = form.getValues('clientId');
    if (!clientId) return;
    const clientUser = await getUserById(clientId);
    if (clientUser) {
        setSelectedClient(clientUser);
        setIsClientEditOpen(true);
    } else {
        toast({variant: 'destructive', title: 'Errore', description: 'Impossibile trovare i dati del cliente.'});
    }
  };
  
  if (!intervention) return null;


  async function onSubmit(values: z.infer<typeof formSchema>) {
    
    let newUpdates = intervention?.updates || [];
    if(values.newUpdate && values.newUpdate.trim() !== '') {
        newUpdates = [{ 
            date: new Date().toISOString(), 
            description: values.newUpdate.trim(),
            userName: currentUser.name
        }, ...newUpdates];
    }
    
    let finalDueDate: string | undefined;
    if (values.dueDate) {
        try {
            const [hours, minutes] = values.dueTime ? values.dueTime.split(':').map(Number) : [0,0];
            let date = new Date(values.dueDate);
            date = setHours(date, hours);
            date = setMinutes(date, minutes);
            finalDueDate = date.toISOString();
        } catch(e) {
            console.error("Invalid time value", e);
            finalDueDate = new Date(values.dueDate).toISOString();
        }
    }


    const updatedInterventionData = {
        ...intervention,
        ...values,
        type: values.type as InterventionType,
        priority: values.priority as InterventionPriority,
        status: values.status as InterventionStatus,
        dueDate: finalDueDate,
        updates: newUpdates,
        timeSpent: values.timeSpent || null,
        materialsUsed: values.materialsUsed || null,
        completedAt: values.status === 'Completato' && !intervention?.completedAt ? new Date().toISOString() : intervention?.completedAt || null,
        attachments: values.attachments,
        workLogs: values.workLogs,
    };
    
    const updated = await updateIntervention(intervention!.id, updatedInterventionData, currentUser);
    
    if (updated) {
        onInterventionUpdated();
        toast({
          title: 'Intervento aggiornato',
          description: `L'intervento "${values.title}" è stato aggiornato con successo.`,
        });
        setIsOpen(false);
    } else {
        toast({
            variant: 'destructive',
            title: 'Errore',
            description: "Impossibile aggiornare l'intervento.",
        });
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
            description: 'Ricorda di salvare per rendere permanenti le modifiche.',
        });
    }
  };

  const handleRemoveAttachment = async (attachmentToRemove: Attachment) => {
    form.setValue('attachments', (form.getValues('attachments') || []).filter(att => att.id !== attachmentToRemove.id));
    toast({
        title: 'Allegato rimosso',
        description: `Il file "${attachmentToRemove.name}" è stato rimosso dalla lista. Salva per confermare.`,
    });
  }

  const handleViewAttachment = async (attachment: Attachment) => {
    if (!appConfig || !appConfig.gcsBucketName || !appConfig.gcsProjectId || !appConfig.gcsClientEmail || !appConfig.gcsPrivateKey) {
        toast({ variant: 'destructive', title: 'Errore Configurazione', description: 'La configurazione GCS non è stata caricata o è incompleta.' });
        return;
    }
    setAttachmentToView(attachment);
    setIsFetchingAttachment(true);
    setAttachmentDataUri(null);

    const filePath = `${intervention.id}/${attachment.id}-${attachment.name}`;
    
    const result = await fetchAttachmentAction({
        filePath: filePath,
        config: {
            projectId: appConfig.gcsProjectId!,
            clientEmail: appConfig.gcsClientEmail!,
            privateKey: appConfig.gcsPrivateKey!,
            bucketName: appConfig.gcsBucketName!,
        }
    });

    if (result.success && result.dataUri) {
        setAttachmentDataUri(result.dataUri);
    } else {
        toast({ variant: 'destructive', title: 'Errore Download', description: result.error || 'Impossibile scaricare l\'allegato.' });
    }
    setIsFetchingAttachment(false);
  }
  
  const handleWorkLogToggle = () => {
    setIsProcessingGeo(true);
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: 'Geolocalizzazione non supportata', description: 'Il tuo browser non supporta la geolocalizzazione.' });
        setIsProcessingGeo(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const coords: GeolocationPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };
            const now = new Date().toISOString();
            
            const currentLogs = form.getValues('workLogs') || [];

            if (activeWorkLog) {
                // Clocking out
                const updatedLogs = currentLogs.map(log => 
                    log.id === activeWorkLog.id 
                        ? { ...log, endTime: now, endPosition: coords } 
                        : log
                );
                form.setValue('workLogs', updatedLogs);

                // Recalculate total time spent
                const totalMinutes = updatedLogs
                    .filter(log => log.endTime)
                    .reduce((acc, log) => acc + differenceInMinutes(new Date(log.endTime!), new Date(log.startTime)), 0);
                form.setValue('timeSpent', parseFloat((totalMinutes / 60).toFixed(2)));

                toast({ title: 'Uscita registrata', description: 'Hai terminato il lavoro per questo intervento.' });
            } else {
                // Clocking in
                const newLog: WorkLog = {
                    id: uuidv4(),
                    operatorId: currentUser.id,
                    operatorName: currentUser.name,
                    startTime: now,
                    startPosition: coords,
                };
                form.setValue('workLogs', [...currentLogs, newLog]);
                
                // Auto-assign if not already assigned
                if (!form.getValues('assignedOperatorId')) {
                    form.setValue('assignedOperatorId', currentUser.id);
                }
                
                toast({ title: 'Entrata registrata', description: 'Hai iniziato il lavoro per questo intervento.' });
            }
            setIsProcessingGeo(false);
        },
        () => {
            toast({ variant: 'destructive', title: 'Errore Geolocalizzazione', description: 'Impossibile ottenere la tua posizione. Assicurati di aver dato i permessi.' });
            setIsProcessingGeo(false);
        }
    );
  };
  
  const canSetInvoiceStatus = currentUser.role === 'Admin' || currentUser.role === 'Creator';
  const isOperator = currentUser.role === 'Operator';
  
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
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0 max-h-screen md:max-h-[90vh] md:h-auto h-screen w-screen max-w-full md:w-full rounded-none md:rounded-lg">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Modifica intervento #{intervention.id}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                <Form {...form}>
                <form id="edit-intervention-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    
                    {isOperator && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <Button type="button" onClick={handleWorkLogToggle} disabled={isProcessingGeo} className={cn(activeWorkLog ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600', 'w-full')}>
                                {isProcessingGeo && <Loader className="mr-2 animate-spin" />}
                                {activeWorkLog ? <StopCircle className="mr-2"/> : <Play className="mr-2" />}
                                {activeWorkLog ? 'Termina Lavoro' : 'Avvia Lavoro'}
                            </Button>
                        </div>
                    )}

                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Titolo</FormLabel>
                        <FormControl>
                            <Input placeholder="Es. Riparazione perdita..." {...field} />
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
                            <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <div className="flex items-center gap-2">
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={currentUser.role === 'Client'}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona un cliente" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                {(currentUser.role === 'Admin' || currentUser.role === 'Creator') && (
                                     <Button type="button" variant="outline" size="icon" onClick={handleOpenClientEdit}>
                                        <Pencil className="h-4 w-4" />
                                     </Button>
                                )}
                            </div>
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
                            <Textarea placeholder="Descrivi il problema in dettaglio..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Stato</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona uno stato" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Nuovo">Nuovo</SelectItem>
                                    <SelectItem value="In corso">In corso</SelectItem>
                                    <SelectItem value="In attesa">In attesa</SelectItem>
                                    <SelectItem value="Completato">Completato</SelectItem>
                                    {canSetInvoiceStatus && (
                                        <>
                                            <SelectItem value="Da Fatturare">Da Fatturare</SelectItem>
                                            <SelectItem value="Fatturato">Fatturato</SelectItem>
                                        </>
                                    )}
                                    <SelectItem value="Annullato">Annullato</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Priorità</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                         <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                            <FormField
                                control={form.control}
                                name="dueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Data Scadenza</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal pl-3",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? (
                                                format(field.value, "dd/MM/yy", { locale: it })
                                            ) : (
                                                <span>Scegli data</span>
                                            )}
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

                    {(currentUser.role === 'Admin' || currentUser.role === 'Creator') && (
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

                    <Separator />
                    
                    <h4 className="text-sm font-medium">Log Lavoro e Dettagli Completamento</h4>
                     <div className="space-y-2">
                        {workLogs && workLogs.length > 0 ? (
                            workLogs.map(log => (
                                <div key={log.id} className="text-xs p-2 border rounded-md">
                                    <p><b>{log.operatorName}</b></p>
                                    <p>Inizio: {format(new Date(log.startTime), 'dd/MM/yy HH:mm', { locale: it })}</p>
                                    {log.endTime && <p>Fine: {format(new Date(log.endTime), 'dd/MM/yy HH:mm', { locale: it })}</p>}
                                    <div className="flex gap-4 mt-1">
                                        <a href={`https://www.google.com/maps?q=${log.startPosition.latitude},${log.startPosition.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                                            <MapPin className="h-3 w-3" /> Pos. Inizio
                                        </a>
                                        {log.endPosition && (
                                            <a href={`https://www.google.com/maps?q=${log.endPosition.latitude},${log.endPosition.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                                                <MapPin className="h-3 w-3" /> Pos. Fine
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                             <p className="text-xs text-muted-foreground text-center py-2">Nessun log di lavoro registrato.</p>
                        )}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="timeSpent"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ore Totali Impiegate</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Es. 8" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="materialsUsed"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Materiali Impiegati</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Elencare i materiali utilizzati..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <Separator />

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
                                <button type="button" onClick={() => handleViewAttachment(att)} className="flex items-center gap-2 text-sm hover:underline truncate">
                                    <AttachmentPreview att={att} />
                                    <span className="truncate">{att.name}</span>
                                </button>
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
                    
                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Aggiornamenti Intervento</h4>
                         <FormField
                            control={form.control}
                            name="newUpdate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Aggiungi nuovo aggiornamento</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Scrivi un aggiornamento..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                            {intervention.updates && intervention.updates.length > 0 ? (
                                intervention.updates.map((update, index) => (
                                    <div key={index} className="flex items-start gap-3 text-sm">
                                        <MessageSquarePlus className="w-4 h-4 mt-1 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="text-muted-foreground">
                                                <span className="font-semibold">{update.userName}</span>
                                                {' - '}
                                                {formatDistanceToNow(new Date(update.date), { addSuffix: true, locale: it })}
                                            </p>
                                            <p>{update.description}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nessun aggiornamento.</p>
                            )}
                        </div>
                    </div>


                </form>
                </Form>
            </div>
        </ScrollArea>

        <DialogFooter className="flex-col-reverse sm:flex-row p-6 pt-0 border-t">
            <DialogClose asChild>
                <Button variant="outline">Annulla</Button>
            </DialogClose>
            <Button type="submit" form="edit-intervention-form">Salva modifiche</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
     <EditUserForm
        user={selectedClient}
        onUserUpdated={onClientUpdated}
        isOpen={isClientEditOpen}
        setIsOpen={setIsClientEditOpen}
    />
    
    {attachmentToView && (
      <Dialog open={!!attachmentToView} onOpenChange={(open) => {
        if (!open) {
          setAttachmentToView(null);
          setAttachmentDataUri(null);
        }
      }}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>{attachmentToView.name}</DialogTitle>
                <DialogDescription>
                    Caricato da {attachmentToView.uploadedBy} il {format(new Date(attachmentToView.uploadedAt), 'dd/MM/yyyy HH:mm')}
                </DialogDescription>
            </DialogHeader>
            <div className="mt-4 max-h-[70vh] overflow-auto flex items-center justify-center">
                 {isFetchingAttachment ? (
                    <Loader className="h-8 w-8 animate-spin" />
                ) : attachmentDataUri ? (
                    attachmentToView.type.startsWith('image/') ? (
                        <Image src={attachmentDataUri} alt={attachmentToView.name} width={800} height={600} className="w-full h-auto object-contain" />
                    ) : attachmentToView.type === 'application/pdf' ? (
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-md">
                            <FileText className="w-16 h-16 text-muted-foreground" />
                            <p className="mt-4 font-semibold">Anteprima PDF non disponibile</p>
                            <p className="text-sm text-muted-foreground">La visualizzazione dei PDF è stata bloccata dal browser per motivi di sicurezza.</p>
                             <Button asChild className="mt-6">
                                <a href={attachmentDataUri} download={attachmentToView.name}>
                                    <Download className="mr-2" />
                                    Scarica {attachmentToView.name}
                                </a>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-md">
                            <FileIcon className="w-16 h-16 text-muted-foreground" />
                            <p className="mt-4 font-semibold">Anteprima non disponibile</p>
                            <p className="text-sm text-muted-foreground">Il file non può essere visualizzato direttamente nel browser.</p>
                            <Button asChild className="mt-6">
                                <a href={attachmentDataUri} download={attachmentToView.name}>
                                    <Download className="mr-2" />
                                    Scarica {attachmentToView.name}
                                </a>
                            </Button>
                        </div>
                    )
                ) : (
                    <p className="text-destructive">Impossibile caricare l'allegato.</p>
                )}
            </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}


