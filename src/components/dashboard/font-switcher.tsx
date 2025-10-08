
'use client';

import { useTheme } from '@/contexts/theme-context';
import { fonts } from '@/lib/fonts';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useUser } from '@/contexts/user-context';

export function FontSwitcher() {
  const { user } = useUser();
  const { font, setFont } = useTheme();

  const handleSetFont = (newFont: typeof fonts[number]['name']) => {
    if (user?.role === 'Admin' || user?.role === 'Creator') {
        setFont(newFont);
    }
  }

  return (
    <div className="flex flex-wrap gap-4">
      <TooltipProvider>
        {fonts.map((f) => (
          <Tooltip key={f.name}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSetFont(f.name)}
                className={cn(
                  'h-10 w-10 rounded-md flex items-center justify-center text-lg ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border',
                  font === f.name && 'ring-2 ring-ring border-primary',
                  f.variable
                )}
                aria-label={`Switch to ${f.label} font`}
                disabled={user?.role !== 'Admin' && user?.role !== 'Creator'}
              >
                Ag
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{f.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
