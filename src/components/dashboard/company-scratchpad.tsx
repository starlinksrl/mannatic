
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from 'use-debounce';
import { useToast } from '@/hooks/use-toast';
import { Building, Save } from 'lucide-react';
import { Company, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { updateCompanySettings } from '@/app/actions';

interface CompanyScratchpadProps {
  user: User;
  company: Company;
  onUpdate: (updatedCompany: Partial<Company>) => void;
  className?: string;
}

export function CompanyScratchpad({ user, company, onUpdate, className }: CompanyScratchpadProps) {
  const [text, setText] = useState(company.companyScratchpad || '');
  const [debouncedText] = useDebounce(text, 1000);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const canEdit = user.role === 'Admin' || user.role === 'Creator';

  useEffect(() => {
    setText(company.companyScratchpad || '');
  }, [company.companyScratchpad]);

  useEffect(() => {
    const saveScratchpad = async () => {
      if (canEdit && debouncedText !== company.companyScratchpad) {
        setIsSaving(true);
        const updatedCompany = await updateCompanySettings(company.id, { companyScratchpad: debouncedText });
        if (updatedCompany) {
          onUpdate({ companyScratchpad: debouncedText });
        } else {
          toast({
            variant: 'destructive',
            title: 'Errore nel salvataggio',
            description: 'Impossibile salvare il promemoria installatore.',
          });
        }
        setIsSaving(false);
      }
    };

    saveScratchpad();
  }, [debouncedText, company.id, company.companyScratchpad, onUpdate, toast, canEdit]);

  return (
    <Card className={cn("relative", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Building className="h-5 w-5" />
          Promemoria Installatore
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi qui gli appunti per tutto il team..."
          className="h-40 resize-none"
          disabled={!canEdit}
        />
      </CardContent>
      {isSaving && (
        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground flex items-center gap-1">
          <Save className="h-3 w-3 animate-pulse" />
          <span>Salvataggio...</span>
        </div>
      )}
    </Card>
  );
}
