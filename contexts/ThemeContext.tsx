import React, { createContext, useContext } from 'react';

export const AppTheme = {
  colors: {
    primary: '#4F8EF7',
    background: '#0A0E1A',
    card: '#111827',
    text: '#F1F5F9',
    border: 'rgba(255, 255, 255, 0.06)',
    notification: '#EF4444',
  },
} as const;

type AppThemeType = typeof AppTheme;

const ThemeContext = createContext<AppThemeType>(AppTheme);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={AppTheme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
