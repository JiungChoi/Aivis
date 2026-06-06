import { useState, useEffect, useRef, useCallback } from 'react';
import FloatingCharacter from './FloatingCharacter';
import { buildSuggestion } from './CharacterConfig';
import { useCharacters } from '../../stores/characterStore';
import { memoryService } from '../../services/memoryService';
import { scheduleService, type ScheduleItem } from '../../services/scheduleService';
import { getLLMSuggestion } from '../../services/characterSuggestionService';

const SUGGESTION_INTERVAL_MS = 3 * 60 * 1000;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildZones(w: number, h: number) {
  const cols = 4;
  const sectionW = w / cols;
  const minY = h * 0.28;
  const maxY = h * 0.70;
  return Array.from({ length: cols }, (_, i) => ({
    minX: Math.max(10, sectionW * i + 16),
    maxX: Math.min(w - 60, sectionW * (i + 1) - 16),
    minY,
    maxY,
  }));
}

export default function CharacterLayer() {
  const characters = useCharacters();
  const [containerSize, setContainerSize] = useState({ w: 1000, h: 700 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeSuggestion, setActiveSuggestion] = useState<{ characterId: string; text: string } | null>(null);

  const contextRef = useRef<{ schedules: ScheduleItem[]; memoryCount: number }>({
    schedules: [],
    memoryCount: 0,
  });

  // Measure container
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    if (containerRef.current?.parentElement) obs.observe(containerRef.current.parentElement);
    return () => obs.disconnect();
  }, []);

  // Fetch context
  const refreshContext = useCallback(async () => {
    try {
      const [schedules, memories] = await Promise.all([
        scheduleService.getByDate(todayKey()),
        memoryService.list(),
      ]);
      contextRef.current = { schedules, memoryCount: memories.length };
    } catch { /* stay stale */ }
  }, []);

  useEffect(() => {
    refreshContext();
    const id = setInterval(refreshContext, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshContext]);

  // Round-robin suggestion timer
  const nextCharIndexRef = useRef(0);

  const fireSuggestion = useCallback(async () => {
    if (characters.length === 0) return;
    const char = characters[nextCharIndexRef.current % characters.length];
    nextCharIndexRef.current++;

    // Get LLM suggestion, fall back to static
    let text = '';
    try {
      const llm = await Promise.race<string>([
        getLLMSuggestion(char.name, char.role, contextRef.current),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6_000)),
      ]);
      if (llm.trim()) text = llm;
    } catch { /* fall through to static */ }

    if (!text) {
      text = buildSuggestion(char, contextRef.current.schedules, contextRef.current.memoryCount);
    }

    if (char.isHost) {
      window.dispatchEvent(new CustomEvent('aivis:speech', { detail: { text } }));
    } else {
      setActiveSuggestion({ characterId: char.id, text });
      setTimeout(() => setActiveSuggestion(null), 12_000);
    }
  }, [characters]);

  useEffect(() => {
    const initial = setTimeout(fireSuggestion, 15_000);
    const interval = setInterval(fireSuggestion, SUGGESTION_INTERVAL_MS);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [fireSuggestion]);

  const zones = buildZones(containerSize.w, containerSize.h);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40, overflow: 'hidden' }}
    >
      {characters.filter(c => !c.isHost).map((char, idx) => (
        <FloatingCharacter
          key={char.id}
          character={char}
          suggestion={activeSuggestion?.characterId === char.id ? activeSuggestion.text : null}
          onDismissSuggestion={() => setActiveSuggestion(null)}
          zone={zones[idx] ?? zones[zones.length - 1]}
        />
      ))}
    </div>
  );
}
