'use client';

import { useState, useRef, useEffect } from 'react';
import { SupportTicket, User, SupportTicketStatus, Attachment } from '@/lib/types';
import { Header } from './header';
import { Button } from '../ui/button';
import { ArrowLeft, Loader, Send, Trash2, Wrench, UploadCloud, File as FileIcon, Image as ImageIcon, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { useUser } from '@/contexts/user-context';
import { addSupportMessage, updateSupportTicketStatus, deleteSupportTicket } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { convertSupportTicketToIntervention } from '@/app/actions';
import { v4 as uuidv4 } from 'uuid';

interface SupportTicketConversationProps {
  ticket: SupportTicket;
  onBack: () => void;
  onTicketUpdated: () => void;
}

export function SupportTicketConversation({ ticket, onBack, onTicketUpdated }: SupportTicketConversationProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the conversation
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [ticket.messages]);

  if (!user) return null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let newAttachments: Attachment[] = [];
    let hadError = false;

    for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { // 10MB
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
                    uploadedBy: user.name,
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
                        uploadedBy: user.name,
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
        setReplyAttachments(prev => [...prev, ...newAttachments]);
    }
    setIsUploading(false);
  };

  const handleRemoveReplyAttachment = (attachmentId: string) => {
    setReplyAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' && replyAttachments.length === 0) return;

    setIsSubmitting(true);
    try {
      await addSupportMessage(ticket.id, user, newMessage, replyAttachments);
      setNewMessage('');
      setReplyAttachments([]);
      onTicketUpdated();
      toast({ title: 'Messaggio inviato con successo.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile inviare il messaggio.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: SupportTicketStatus) => {
    setIsSubmitting(true);
     try {
      await updateSupportTicketStatus(ticket.id, newStatus, user);
      onTicketUpdated();
      toast({ title: 'Stato del ticket aggiornato.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile aggiornare lo stato.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleConvertToIntervention = async () => {
    setIsConverting(true);
    const result = await convertSupportTicketToIntervention(ticket.id, user);
    if (result.success && result.intervention) {
      toast({
        title: "Ticket convertito!",
        description: `È stato creato l'intervento #${result.intervention.id}. Il ticket è ora chiuso.`
      });
      onTicketUpdated(); // Refreshes the ticket data to show it as closed
    } else {
      toast({
        variant: "destructive",
        title: "Conversione fallita",
        description: result.error || "Si è verificato un errore sconosciuto."
      });
    }
    setIsConverting(false);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    const success = await deleteSupportTicket(ticket.id);
    if (success) {
        onTicketUpdated();
        onBack();
        toast({ title: "Ticket eliminato", description: `Il ticket di supporto è stato eliminato.` });
    } else {
        toast({ variant: 'destructive', title: "Errore", description: "Impossibile eliminare il ticket." });
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Header title="Conversazione Supporto" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex justify-between items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2" />
            Torna ai ticket
            </Button>
            {user.role === 'Admin' && (
                <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeleting}>
                        {isDeleting ? <Loader className="mr-2 animate-spin" /> : <Trash2 className="mr-2" />}
                        Elimina
                    </Button>
                     <Button variant="secondary" onClick={handleConvertToIntervention} disabled={isConverting}>
                        {isConverting ? <Loader className="mr-2 animate-spin" /> : <Wrench className="mr-2" />}
                        Crea Intervento
                    </Button>
                </div>
            )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <CardTitle>{ticket.subject}</CardTitle>
                    <CardDescription>
                        Aperto da {ticket.clientName} il {format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm', { locale: it })}
                    </CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Stato:</span>
                    <Select onValueChange={(value) => handleStatusChange(value as SupportTicketStatus)} defaultValue={ticket.status} disabled={isSubmitting || user.role === 'Client'}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Cambia stato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Aperto">Aperto</SelectItem>
                            <SelectItem value="In Lavorazione">In Lavorazione</SelectItem>
                            <SelectItem value="Chiuso">Chiuso</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[40vh] pr-4">
              <div className="space-y-6">
                {ticket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3 text-sm',
                      message.senderId === user.id ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'p-3 rounded-lg max-w-md border',
                        message.senderId === user.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border'
                      )}
                    >
                      <p className="font-semibold">{message.senderName}</p>
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      
                      {/* Attachments Section */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 space-y-2 border-t pt-2 border-current/10">
                          {message.attachments.map((att) => (
                            <div key={att.id} className="mt-1">
                              {att.type.startsWith('image/') ? (
                                <div className="relative rounded overflow-hidden max-w-xs border bg-background">
                                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                                    <img src={att.url} alt={att.name} className="object-cover max-h-40 w-full hover:opacity-90 transition-opacity" />
                                  </a>
                                </div>
                              ) : att.type.startsWith('video/') ? (
                                <div className="rounded overflow-hidden max-w-xs border bg-background">
                                  <video src={att.url} controls className="max-h-40 w-full" />
                                </div>
                              ) : (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-xs underline truncate"
                                >
                                  {att.type === 'application/pdf' ? (
                                    <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                  ) : (
                                    <FileIcon className="h-4 w-4 shrink-0" />
                                  )}
                                  <span className="truncate">{att.name}</span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs opacity-70 mt-2 text-right">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: it })}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Dummy element used for automatic scrolling */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="mt-6 space-y-4">
              {/* Previews of uploaded files in reply */}
              {replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
                  {replyAttachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 p-1.5 border rounded-md bg-background text-sm max-w-xs">
                      {att.type.startsWith('image/') ? (
                        <ImageIcon className="h-4 w-4 text-green-500 shrink-0" />
                      ) : att.type.startsWith('video/') ? (
                        <FileIcon className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <FileIcon className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate text-xs">{att.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={() => handleRemoveReplyAttachment(att.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                placeholder={ticket.status === 'Chiuso' ? "Questo ticket è chiuso. Riaprilo per inviare un messaggio." : "Scrivi la tua risposta..."}
                rows={4}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isSubmitting || ticket.status === 'Chiuso'}
              />
              <div className="flex justify-between items-center gap-2">
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    disabled={isSubmitting || isUploading || ticket.status === 'Chiuso'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isUploading || ticket.status === 'Chiuso'}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {isUploading ? 'Caricamento...' : 'Allega Immagini / Video'}
                  </Button>
                </div>
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isSubmitting || isUploading || (newMessage.trim() === '' && replyAttachments.length === 0) || ticket.status === 'Chiuso'}
                >
                  {isSubmitting && !isDeleting && !isConverting ? <Loader className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                  Invia
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
                Questa azione non può essere annullata. Verrà eliminato permanentemente il ticket e tutta la sua cronologia.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                 {isDeleting && <Loader className="mr-2 animate-spin" />}
                Elimina
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
