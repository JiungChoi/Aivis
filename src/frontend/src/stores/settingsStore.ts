import { create } from 'zustand';
import { API_BASE } from '../config';

interface SettingsState {
  apiBaseUrl: string;
}

export const useSettingsStore = create<SettingsState>(() => ({
  apiBaseUrl: API_BASE,
}));
