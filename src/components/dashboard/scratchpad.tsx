
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from 'use-debounce';
import { updateUser } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { NotebookPen, Save } from 'lucide-react';
import { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { CREATOR_USER_ID } from '@/lib/constants';

interface ScratchpadProps {
  user: User;
  onUpdate: (updatedUser: Partial<User>) => void;
  className?: string;
}

export function Scratchpad({ user, onUpdate, className }: ScratchpadProps) {
  const [text, setText] = useState(user.scratchpad || '');
  const [debouncedText] = useDebounce(text, 1000);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setText(user.scratchpad || '');
  }, [user.scratchpad]);

  useEffect(() => {
    const saveScratchpad = async () => {
      // Do not save if the user is the creator or if the text hasn't changed
      if (user.id === CREATOR_USER_ID || debouncedText === user.scratchpad) {
        return;
      }

      setIsSaving(true);
      const updatedUser = await updateUser(user.id, { scratchpad: debouncedText });
      if (updatedUser) {
        onUpdate({ scratchpad: debouncedText });
      } else {
        toast({
          variant: 'destructive',
          title: 'Errore nel salvataggio',
          description: 'Impossibile salvare il promemoria.',
        });
      }
      setIsSaving(false);
    };

    saveScratchpad();
  }, [debouncedText, user.id, user.scratchpad, onUpdate, toast]);

  return (
    <Card className={cn("relative", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <NotebookPen className="h-5 w-5" />
          Promemoria Personale
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi qui i tuoi appunti..."
          className="h-40 resize-none"
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
