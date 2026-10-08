'use client';

import React, { useState, useEffect } from 'react';
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
import { ScrollArea } from '../ui/scroll-area';
import { useUser } from '@/contexts/user-context';
import { sendExpiringInterventionsSummaryEmail } from '@/app/actions';
import { Loader, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


interface ExpiringInterventionsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function ExpiringInterventionsDialog({ isOpen, setIsOpen }: ExpiringInterventionsDialogProps) {
    const { currentCompany } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [emailContent, setEmailContent] = useState<{ subject: string; body: string; recipients?: string[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            if (isOpen && currentCompany && !emailContent) {
                setIsLoading(true);
                setError(null);
                const result = await generateExpiringInterventionsSummary(currentCompany.id);
                if (result.success) {
                    setEmailContent({
                        subject: result.subject!,
                        body: result.body!,
                        recipients: result.recipients || [],
                    });
                } else {
                    setError(result.error || "Errore sconosciuto durante la generazione del riepilogo.");
                }
                setIsLoading(false);
            }
        };

        fetchSummary();

        if (!isOpen) {
            setEmailContent(null);
            setError(null);
        }
    }, [isOpen, currentCompany, emailContent]);

    const handleSendEmail = async () => {
        if (!currentCompany) return;
        
        setIsSending(true);
        const result = await sendExpiringInterventionsSummaryEmail(currentCompany.id);
        if (result.success) {
            toast({
                title: 'Email Inviata!',
                description: 'Il riepilogo degli interventi in scadenza è stato inviato a tutti gli operatori.',
            });
            setIsOpen(false);
        } else {
            toast({
                variant: 'destructive',
                title: 'Errore di Invio',
                description: result.error || "Impossibile inviare l'email.",
            });
        }
        setIsSending(false);
    }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl flex flex-col p-0 max-h-[calc(100dvh-1.5rem)] md:max-h-[90vh] h-[calc(100dvh-1.5rem)] md:h-auto w-[calc(100%-1rem)] sm:w-full rounded-2xl md:rounded-lg overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-4 shrink-0 pr-12">
          <DialogTitle>Anteprima Riepilogo Interventi in Scadenza</DialogTitle>
          <DialogDescription>
            Questa è un'anteprima dell'email che verrà inviata a tutti gli operatori.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 h-auto overflow-y-auto border-y">
            <div className="p-4 sm:p-6">
                {isLoading && (
                    <div className="flex justify-center items-center h-48">
                        <Loader className="animate-spin" />
                    </div>
                )}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Errore</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {emailContent && (
                    <div>
                        <div className="mb-4">
                            <h3 className="font-semibold">Oggetto:</h3>
                            <p className="text-sm text-muted-foreground">{emailContent.subject}</p>
                        </div>
                         <div className="mb-4">
                            <h3 className="font-semibold">Destinatari:</h3>
                            {emailContent.recipients.length > 0 ? (
                                <p className="text-sm text-muted-foreground">{emailContent.recipients.join(', ')}</p>
                            ) : (
                                <p className="text-sm text-destructive">Nessun destinatario trovato. Assicurati che ci siano operatori con indirizzi email validi.</p>
                            )}
                        </div>
                        <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                             <div dangerouslySetInnerHTML={{ __html: emailContent.body }} />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
        <DialogFooter className="p-4 sm:p-6 gap-2 border-t shrink-0 bg-background">
            <DialogClose asChild>
                <Button variant="outline" disabled={isSending}>Annulla</Button>
            </DialogClose>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <div tabIndex={0}> 
                         <Button onClick={handleSendEmail} disabled={isSending || isLoading || !!error || !emailContent || emailContent.recipients.length === 0}>
                            {isSending ? <Loader className="mr-2 animate-spin" /> : <Send />}
                            Invia Email agli Operatori
                        </Button>
                    </div>
                </TooltipTrigger>
                {emailContent && emailContent.recipients.length === 0 && (
                    <TooltipContent>
                        <p>Nessun destinatario valido a cui inviare l'email.</p>
                    </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
