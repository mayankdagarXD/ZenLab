import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true,
  toggleTheme: () => set((state) => {
    const newIsDark = !state.isDark;
    document.documentElement.classList.toggle('light-theme', !newIsDark);
    return { isDark: newIsDark };
  }),
}));