
'use client';

import React, { createContext, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useUser } from './user-context';
import { type Theme, type Font, type ViewMode } from '@/lib/types';
import { updateCompanySettings } from '@/app/actions';
import { fonts } from '@/lib/fonts';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  font: Font;
  setFont: (font: Font) => void;
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { currentCompany, setCurrentCompany } = useUser();

  const theme = currentCompany?.theme || 'default';
  const font = currentCompany?.font || 'default';
  const viewMode = currentCompany?.viewMode || 'grid';

  const setTheme = useCallback(async (newTheme: Theme) => {
    if (currentCompany) {
      setCurrentCompany(prev => prev ? { ...prev, theme: newTheme } : null);
      await updateCompanySettings(currentCompany.id, { theme: newTheme });
    }
  }, [currentCompany, setCurrentCompany]);
  
  const setFont = useCallback(async (newFont: Font) => {
    if (currentCompany) {
      setCurrentCompany(prev => prev ? { ...prev, font: newFont } : null);
      await updateCompanySettings(currentCompany.id, { font: newFont });
    }
  }, [currentCompany, setCurrentCompany]);

  const setViewMode = useCallback(async (newViewMode: ViewMode) => {
    if (currentCompany) {
      setCurrentCompany(prev => prev ? { ...prev, viewMode: newViewMode } : null);
      await updateCompanySettings(currentCompany.id, { viewMode: newViewMode });
    }
  }, [currentCompany, setCurrentCompany]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  useEffect(() => {
    const fontConfig = fonts.find(f => f.name === font) || fonts.find(f => f.name === 'default');
    if (fontConfig) {
      document.body.classList.forEach(className => {
        if (className.startsWith('font-')) {
          document.body.classList.remove(className);
        }
      });
      document.body.classList.add(fontConfig.variable);
    }
  }, [font]);


  return (
    <ThemeContext.Provider value={{ theme, setTheme, font, setFont, viewMode, setViewMode }}>
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
