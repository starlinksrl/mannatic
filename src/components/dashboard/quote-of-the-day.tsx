
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
import { format } from 'date-fns';

export function QuoteOfTheDay() {
  const [isOpen, setIsOpen] = useState(false);
  const [dailyQuote, setDailyQuote] = useState<{ quote: string; author: string } | null>(null);

  useEffect(() => {
    // Determine the quote of the day based on the day of the year
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

    // Check if the dialog has been shown today
    const lastShownDate = localStorage.getItem('quoteOfTheDayLastShown');
    const todayStr = format(today, 'yyyy-MM-dd');

    if (lastShownDate !== todayStr) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem('quoteOfTheDayLastShown', todayStr);
    setIsOpen(false);
  };

  if (!dailyQuote) {
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
        <DialogFooter>
          <Button onClick={handleClose}>Ho capito</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
