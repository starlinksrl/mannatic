
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { quotes } from '@/lib/quotes';
import { Lightbulb } from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { format } from 'date-fns';

export function QuoteOfTheDay() {
  const { currentCompany } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [dailyQuote, setDailyQuote] = useState<{ quote: string; author: string } | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const storageKey = `quoteOfTheDayDismissed_${todayStr}`;


  useEffect(() => {
    if (currentCompany) {
      const getDayOfYear = (date: Date) => {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
      };

      const today = new Date();
      const dayOfYear = getDayOfYear(today);
      const quoteIndex = dayOfYear % quotes.length;
      setDailyQuote(quotes[quoteIndex]);

      const isDismissedToday = localStorage.getItem(storageKey);
      if (isDismissedToday !== 'true') {
        setIsOpen(true);
      }
    }
  }, [currentCompany, storageKey]);

  const handleClose = () => {
    if (dontShowAgain) {
      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        if (key.startsWith('quoteOfTheDayDismissed_')) {
          localStorage.removeItem(key);
        }
      }
    }
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
  };

  if (!dailyQuote || !currentCompany) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={handleClose} onInteractOutside={handleClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Lightbulb className="h-6 w-6 text-yellow-400" />
            Il pensiero del giorno
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <blockquote className="border-l-2 pl-4 italic">
            "{dailyQuote.quote}"
          </blockquote>
          <p className="mt-4 text-right text-sm font-medium text-muted-foreground">- {dailyQuote.author}</p>
        </div>
        <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-4">
           <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again-quote"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label htmlFor="dont-show-again-quote" className="text-sm font-normal">
              Non mostrare per oggi
            </Label>
          </div>
          <Button onClick={handleClose}>Ho capito</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
