import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

const THEME_STORAGE_KEY = 'cv_theme_mode';
const ThemeModeContext = createContext(null);

const getInitialMode = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
};

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);

  const isDark = mode === 'dark';
  const palette = isDark
    ? {
        background: { default: '#0f1720', paper: '#16212d' },
        text: { primary: '#e8eef5', secondary: '#a8b7c8' },
        primary: { main: '#7ab8ff' },
        divider: '#294055',
      }
    : {
        background: { default: '#f7f8fa', paper: '#ffffff' },
        text: { primary: '#102339', secondary: '#627386' },
        primary: { main: '#245a8c' },
        divider: '#e5ebf1',
      };

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...palette,
        },
        shape: { borderRadius: 8 },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: palette.background.default,
                color: palette.text.primary,
                transition: 'background-color .28s ease, color .28s ease',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                transition: 'background-color .25s ease, color .25s ease, border-color .25s ease, box-shadow .25s ease',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                transition: 'background-color .25s ease, color .25s ease, border-color .25s ease',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                transition: 'background-color .25s ease, color .25s ease, border-color .25s ease, transform .25s ease',
              },
            },
          },
        },
      }),
    [mode]
  );

  const toggleMode = () => setMode((current) => (current === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within AppThemeProvider');
  }
  return context;
}
