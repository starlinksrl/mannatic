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
import { generateExpiringInterventionsSummary, sendExpiringInterventionsSummaryEmail } from '@/app/actions';
import { Loader, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';


interface ExpiringInterventionsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function ExpiringInterventionsDialog({ isOpen, setIsOpen }: ExpiringInterventionsDialogProps) {
    const { currentCompany } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [emailContent, setEmailContent] = useState<{ subject: string; body: string; recipients: string[] } | null>(null);
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
        }
    }, [isOpen, currentCompany, emailContent]);

    const handleSendEmail = async () => {
        if (!currentCompany || !emailContent) return;
        
        setIsSending(true);
        const result = await sendExpiringInterventionsSummaryEmail(currentCompany.id, emailContent.subject, emailContent.body);
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
      <DialogContent className="sm:max-w-3xl grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Anteprima Riepilogo Interventi in Scadenza</DialogTitle>
          <DialogDescription>
            Questa è un'anteprima dell'email che verrà inviata a tutti gli operatori.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full border-y">
            <div className="p-6">
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
                            <p className="text-sm text-muted-foreground">{emailContent.recipients.length > 0 ? emailContent.recipients.join(', ') : 'Nessun operatore con email trovata.'}</p>
                        </div>
                        <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                             <div dangerouslySetInnerHTML={{ __html: emailContent.body }} />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-4">
            <DialogClose asChild>
                <Button variant="outline" disabled={isSending}>Annulla</Button>
            </DialogClose>
            <Button onClick={handleSendEmail} disabled={isSending || isLoading || !!error || !emailContent || emailContent.recipients.length === 0}>
                {isSending ? <Loader className="mr-2 animate-spin" /> : <Send />}
                Invia Email agli Operatori
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
