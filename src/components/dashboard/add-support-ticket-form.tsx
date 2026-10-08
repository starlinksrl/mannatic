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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { addSupportTicket, getSupportTickets } from '@/lib/data';
import { Loader, AlertTriangle, UploadCloud, File as FileIcon, Trash2, Image as ImageIcon, FileText } from 'lucide-react';
import { SupportTicket, SupportTicketType, Attachment } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit for images/videos

const formSchema = z.object({
  subject: z.string().min(10, { message: 'L\'oggetto deve contenere almeno 10 caratteri.' }),
  message: z.string().min(20, { message: 'Il messaggio deve contenere almeno 20 caratteri.' }),
  attachments: z.array(z.any()).optional(),
});

interface AddSupportTicketFormProps {
  children: React.ReactNode;
  onTicketAdded: (ticket: SupportTicket) => void;
  /** For Distributors: override the companyId to target a specific managed company */
  overrideCompanyId?: string;
  ticketType?: SupportTicketType;
}

export function AddSupportTicketForm({ children, onTicketAdded, overrideCompanyId, ticketType }: AddSupportTicketFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();
  const { user, currentCompany } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { subject: '', message: '', attachments: [] },
  });

  const attachments = form.watch('attachments');

  useEffect(() => {
    if (!isOpen || !user) return;
    
    async function checkOpenTickets() {
      setIsLoadingTickets(true);
      const targetType = ticketType || 'client_support';
      const targetCompanyId = overrideCompanyId || currentCompany?.id;
      
      let fetchedTickets: SupportTicket[] = [];
      
      try {
        if (targetType === 'client_support' && user?.role === 'Client') {
            fetchedTickets = await getSupportTickets(targetCompanyId, user.id);
        } else if (targetType === 'distributor_support') {
            fetchedTickets = await getSupportTickets(targetCompanyId);
        } else if (user?.role === 'Distributor' || user?.role === 'DistributorAdmin') {
            fetchedTickets = await getSupportTickets();
        }

        const count = fetchedTickets.filter(t => {
            const isOpenStatus = t.status === 'Aperto' || t.status === 'In Lavorazione';
            const matchesType = (t.ticketType || 'client_support') === targetType;
            
            if (targetType === 'client_support') {
                return isOpenStatus && matchesType && (user ? t.clientId === user.id : true);
            } else {
                return isOpenStatus && matchesType && t.companyId === targetCompanyId;
            }
        }).length;
        
        setOpenTicketsCount(count);
      } catch (err) {
        console.error("Failed to check open tickets", err);
      } finally {
        setIsLoadingTickets(false);
      }
    }
    
    checkOpenTickets();
  }, [isOpen, user, ticketType, overrideCompanyId, currentCompany]);

  useEffect(() => {
    if (isOpen) {
      form.reset({ subject: '', message: '', attachments: [] });
    }
  }, [isOpen, form]);

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
                description: `Il file "${file.name}" supera il limite di 10MB.`,
            });
            hadError = true;
            continue;
        }

        const reader = new FileReader();
        const promise = new Promise<Attachment>(async (resolve, reject) => {
            try {
                const { compressAttachment } = await import('@/lib/image-compression');
                const dataUri = await compressAttachment(file);
                const { uploadFileToSupabase } = await import('@/lib/supabase-storage');
                const uploadRes = await uploadFileToSupabase(dataUri, file.name, 'tickets');
                resolve({
                    id: uuidv4(),
                    name: file.name,
                    url: uploadRes.url || dataUri,
                    type: file.type,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: user?.name || 'Utente',
                });
            } catch (e) {
                console.warn("Upload/compression failed, using fallback reader", e);
                reader.onloadend = () => {
                    resolve({
                        id: uuidv4(),
                        name: file.name,
                        url: reader.result as string,
                        type: file.type,
                        uploadedAt: new Date().toISOString(),
                        uploadedBy: user?.name || 'Utente',
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }
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
            description: 'Ricorda di inviare il ticket per salvare gli allegati.',
        });
    }
  };

  const handleRemoveAttachment = async (attachmentToRemove: Attachment) => {
    form.setValue('attachments', (form.getValues('attachments') || []).filter(att => att.id !== attachmentToRemove.id));
    toast({
        title: 'Allegato rimosso',
        description: `Il file "${attachmentToRemove.name}" è stato rimosso.`,
    });
  };

  const AttachmentPreview = ({ att }: { att: Attachment }) => {
    if (att.type.startsWith('image/')) {
        return <ImageIcon className="h-5 w-5 text-green-500" />;
    }
    if (att.type.startsWith('video/')) {
        return <FileIcon className="h-5 w-5 text-blue-500" />;
    }
    if (att.type === 'application/pdf') {
        return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileIcon className="h-5 w-5" />;
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;

    // Determine which company this ticket belongs to
    const targetCompanyId = overrideCompanyId || currentCompany?.id;
    if (!targetCompanyId) return;

    // Clients open tickets for themselves; Distributors open on behalf of the company
    // Admins open tickets towards their distributor
    const isClient = user.role === 'Client';
    const isDistributor = user.role === 'Distributor';
    const isAdmin = user.role === 'Admin';
    if (!isClient && !isDistributor && !isAdmin) return;

    setIsSubmitting(true);
    try {
      const newTicket = await addSupportTicket({
        clientId: user.id,
        clientName: isDistributor ? `[Distributore] ${user.name}` : (isAdmin ? `[Installatore] ${user.name}` : user.name),
        companyId: targetCompanyId,
        subject: values.subject,
        messageText: values.message,
        ticketType: ticketType || 'client_support',
        attachments: values.attachments
      });
      onTicketAdded(newTicket);
      toast({
        title: 'Ticket di supporto creato',
        description: 'La tua richiesta è stata inviata. Un operatore ti risponderà a breve.',
      });
      setIsOpen(false);
      form.reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile creare il ticket di supporto.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[calc(100dvh-1.5rem)] md:max-h-[90vh] overflow-y-auto overscroll-contain">
        <DialogHeader className="pr-10">
          <DialogTitle>Apri un nuovo ticket di supporto</DialogTitle>
        </DialogHeader>
        
        {openTicketsCount > 0 && (
            <Alert variant="destructive" className="mb-2 bg-yellow-50 text-yellow-800 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-800" />
                <AlertTitle>Attenzione</AlertTitle>
                <AlertDescription>
                    Hai già <strong>{openTicketsCount}</strong> ticket {openTicketsCount === 1 ? 'aperto in corso' : 'aperti in corso'}. Ti suggeriamo di attendere una risposta o di aggiungere un messaggio al ticket esistente per evitare di rallentare l'assistenza.
                </AlertDescription>
            </Alert>
        )}

        <Form {...form}>
          <form id="add-ticket-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oggetto</FormLabel>
                  <FormControl>
                    <Input placeholder="Es. Problema con la fatturazione" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrivi la tua richiesta</FormLabel>
                  <FormControl>
                    <Textarea rows={6} placeholder="Descrivi in dettaglio il problema o la domanda..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachments Section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-medium">Allegati (Immagini / Video)</h4>
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
                    <p className="text-sm text-muted-foreground text-center py-2">Nessun allegato selezionato.</p>
                )}
              </div>
              <div>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" multiple className="hidden" disabled={isUploading} />
                 <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                     <UploadCloud className="mr-2 h-4 w-4" />
                     {isUploading ? 'Caricamento...' : 'Aggiungi Immagini / Video'}
                 </Button>
              </div>
            </div>
          </form>
        </Form>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Annulla
            </Button>
          </DialogClose>
          <Button type="submit" form="add-ticket-form" disabled={isSubmitting}>
            {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Invia Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
