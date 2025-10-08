
'use client';

import React, { createContext, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useUser } from './user-context';
import { type Theme } from '@/lib/types';
import { updateCompanySettings } from '@/app/actions';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { currentCompany, setCurrentCompany } = useUser();

  const theme = currentCompany?.theme || 'default';

  const setTheme = useCallback(async (newTheme: Theme) => {
    if (currentCompany) {
      setCurrentCompany(prev => prev ? { ...prev, theme: newTheme } : null);
      await updateCompanySettings(currentCompany.id, { theme: newTheme });
    }
  }, [currentCompany, setCurrentCompany]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
