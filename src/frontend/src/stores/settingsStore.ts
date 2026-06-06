import { create } from 'zustand';

interface SettingsState {
  apiBaseUrl: string;
}

export const useSettingsStore = create<SettingsState>(() => ({
  apiBaseUrl: 'http://localhost:5050',
}));
