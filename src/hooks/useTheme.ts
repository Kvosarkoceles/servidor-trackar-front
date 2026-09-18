import { useEffect } from 'react';

import { useSettingsStore } from '@/stores/settingsStore';

/** Aplica el tema (`dark`/`light`) al elemento `<html>`. */
export function useTheme(): { theme: 'dark' | 'light'; toggle: () => void } {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f1f5f9');
  }, [theme]);

  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
