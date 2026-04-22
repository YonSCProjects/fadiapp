import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { ThemeTokens } from './tokens';
import { getThemeByName, slate, THEMES } from './themes';

const STORAGE_KEY = 'theme_name_v1';

type ThemeCtx = {
  theme: ThemeTokens;
  themeName: string;
  setTheme: (name: string) => void;
  available: ThemeTokens[];
};

const ThemeContext = createContext<ThemeCtx>({
  theme: slate,
  themeName: slate.name,
  setTheme: () => {},
  available: THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<string>(slate.name);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((v) => {
      if (v) setThemeName(v);
    });
  }, []);

  const setTheme = useCallback((name: string) => {
    setThemeName(name);
    SecureStore.setItemAsync(STORAGE_KEY, name).catch(() => {});
  }, []);

  const theme = getThemeByName(themeName);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, available: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext).theme;
}

export function useThemeSwitcher(): Pick<ThemeCtx, 'themeName' | 'setTheme' | 'available'> {
  const { themeName, setTheme, available } = useContext(ThemeContext);
  return { themeName, setTheme, available };
}
