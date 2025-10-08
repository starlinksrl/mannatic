

'use client';

import { useTheme } from '@/contexts/theme-context';
import { themes } from '@/lib/themes';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useUser } from '@/contexts/user-context';

export function ThemeSwitcher() {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();

  const handleSetTheme = (newTheme: typeof themes[number]['name']) => {
    if (user?.role === 'Admin' || user?.role === 'Creator') {
        setTheme(newTheme);
    }
  }

  return (
    <div className="flex flex-wrap gap-4">
      <TooltipProvider>
        {themes.map((t) => (
          <Tooltip key={t.name}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSetTheme(t.name)}
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  theme === t.name && 'ring-2 ring-ring'
                )}
                style={{ backgroundColor: `hsl(${t.color})` }}
                aria-label={`Switch to ${t.label} theme`}
                disabled={user?.role !== 'Admin' && user?.role !== 'Creator'}
              >
                {theme === t.name && <Check className="h-5 w-5 text-primary-foreground" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
