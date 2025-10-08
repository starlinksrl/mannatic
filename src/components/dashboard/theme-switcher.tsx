
'use client';

import { useTheme } from '@/contexts/theme-context';
import { themes } from '@/lib/themes';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {themes.map((t) => (
        <DropdownMenuItem key={t.name} onSelect={() => setTheme(t.name)}>
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: `hsl(${t.color})` }}
            />
            <span>{t.label}</span>
          </div>
          {theme === t.name && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}
