'use client';

import {
  createContext,
  type ReactNode,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from 'react';

type ResolvedTheme = 'light' | 'dark';
type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ResolvedTheme) => void;
};

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  enableSystem?: boolean;
};

function getInitialResolvedTheme(theme: ThemeMode): ResolvedTheme {
  return theme === 'dark' ? 'dark' : 'light';
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function resolveTheme(theme: ThemeMode, enableSystem: boolean): ResolvedTheme {
  if (theme === 'system') {
    return enableSystem ? getSystemTheme() : 'light';
  }
  return theme;
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'prompt-studio-theme';

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeMode] = useState<ThemeMode>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    getInitialResolvedTheme(defaultTheme),
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode;
    const initialTheme = stored ?? defaultTheme;
    const resolved = resolveTheme(initialTheme, enableSystem);

    setThemeMode(initialTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [defaultTheme, enableSystem]);

  useEffect(() => {
    if (!enableSystem || theme !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const nextResolved = media.matches ? 'dark' : 'light';

      setResolvedTheme(nextResolved);
      applyTheme(nextResolved);
    };

    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, [theme, enableSystem]);

  const setTheme = useCallback(
    (nextTheme: ThemeMode) => {
      const resolved = resolveTheme(nextTheme, enableSystem);

      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      setThemeMode(nextTheme);
      setResolvedTheme(resolved);
      applyTheme(resolved);
    },
    [enableSystem],
  );

  const value = useMemo(
    () => ({
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
