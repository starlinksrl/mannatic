
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'default' | 'ocean' | 'forest' | 'sunset' | 'matrix';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('default');

  useEffect(() => {
    const storedTheme = localStorage.getItem('app-theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    // Remove all theme classes
    document.body.classList.remove('theme-default', 'theme-ocean', 'theme-forest', 'theme-sunset', 'theme-matrix');
    // Add the current theme class
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('app-theme', theme);
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
