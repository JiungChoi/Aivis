import { useState, useEffect } from 'react';
import { AIVIS_CHARACTER, DEFAULT_CHARACTERS, COLOR_PRESETS, type CharacterDef } from '../components/characters/CharacterConfig';

const STORAGE_KEY = 'aivis_custom_characters';
const MAX_CUSTOM = 2;

function loadCustom(): CharacterDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CharacterDef[];
  } catch {
    return [];
  }
}

function saveCustom(chars: CharacterDef[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
  window.dispatchEvent(new CustomEvent('aivis:characters:changed'));
}

// ── Public API ────────────────────────────────────────────────

export function getAllCharacters(): CharacterDef[] {
  return [AIVIS_CHARACTER, ...DEFAULT_CHARACTERS, ...loadCustom()];
}

export function addCustomCharacter(name: string, role: string, gender: 'male' | 'female', colorIndex: number): CharacterDef | null {
  const custom = loadCustom();
  if (custom.length >= MAX_CUSTOM) return null;

  const preset = COLOR_PRESETS[colorIndex] ?? COLOR_PRESETS[0];
  const id = `custom_${Date.now()}`;

  const newChar: CharacterDef = {
    id,
    name,
    role,
    gender,
    primaryColor: preset.primary,
    accentColor: preset.accent,
    glowColor: preset.glow,
    hairColor: preset.hair,
    skinColor: '#fde8c8',
    isCustom: true,
    suggestionOffsetMs: (custom.length + 1) * 60_000,
  };

  saveCustom([...custom, newChar]);
  return newChar;
}

export function removeCustomCharacter(id: string) {
  const updated = loadCustom().filter(c => c.id !== id);
  saveCustom(updated);
}

export function getCustomCount(): number {
  return loadCustom().length;
}

// ── React hook ────────────────────────────────────────────────

export function useCharacters(): CharacterDef[] {
  const [characters, setCharacters] = useState<CharacterDef[]>(getAllCharacters);

  useEffect(() => {
    const refresh = () => setCharacters(getAllCharacters());
    window.addEventListener('aivis:characters:changed', refresh);
    return () => window.removeEventListener('aivis:characters:changed', refresh);
  }, []);

  return characters;
}

export function useCustomCharacters(): CharacterDef[] {
  const [custom, setCustom] = useState<CharacterDef[]>(loadCustom);

  useEffect(() => {
    const refresh = () => setCustom(loadCustom());
    window.addEventListener('aivis:characters:changed', refresh);
    return () => window.removeEventListener('aivis:characters:changed', refresh);
  }, []);

  return custom;
}

export { MAX_CUSTOM };
