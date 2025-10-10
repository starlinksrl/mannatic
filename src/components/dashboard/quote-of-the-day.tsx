
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { quotes } from '@/lib/quotes';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuoteOfTheDayProps {
    className?: string;
}

export function QuoteOfTheDay({ className }: QuoteOfTheDayProps) {
  const [dailyQuote, setDailyQuote] = useState<{ quote: string; author: string } | null>(null);

  useEffect(() => {
    const getDayOfYear = (date: Date) => {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
      const oneDay = 1000 * 60 * 60 * 24;
      return Math.floor(diff / oneDay);
    };

    const dayOfYear = getDayOfYear(new Date());
    const quoteIndex = dayOfYear % quotes.length;
    setDailyQuote(quotes[quoteIndex]);
  }, []);

  if (!dailyQuote) {
    return null; // Or a loading skeleton
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-headline">
          <Lightbulb className="h-5 w-5 text-yellow-400" />
          <span>Il pensiero del giorno</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <blockquote className="border-l-2 pl-4 italic">
          "{dailyQuote.quote}"
        </blockquote>
        <p className="mt-2 text-right text-sm font-medium text-muted-foreground">- {dailyQuote.author}</p>
      </CardContent>
    </Card>
  );
}
