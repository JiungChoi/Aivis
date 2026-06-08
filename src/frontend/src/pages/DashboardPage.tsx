import { useState, useEffect, useCallback, useRef } from 'react';
import { userService, type UserProfile } from '../services/userService';
import { scheduleService, type ScheduleItem, type ScheduleCategory, SCHEDULE_CATEGORIES } from '../services/scheduleService';
import { newsService, type NewsItem } from '../services/newsService';
import { weatherService, type WeatherData, CITIES } from '../services/weatherService';
import { noteService, type NoteItem } from '../services/noteService';
import { obsidianService, type ObsidianSettings } from '../services/obsidianService';
import { conversationService } from '../services/conversationService';
import { suggestionService, type SuggestionItem } from '../services/suggestionService';

// ── AI 일정 추천 응답 타입 ───────────────────────────────────
interface AiScheduleSuggestion {
  title: string;
  startTime: string;
  endTime: string;
  category: ScheduleCategory;
}
import { TimeAnalysisPanel } from '../components/dashboard/TimeAnalysisPanel';
import { SuggestionsPanel } from '../components/dashboard/SuggestionsPanel';
import { NotesPanel } from '../components/dashboard/NotesPanel';
import { toMins, minsToTimeStr, todayISO } from '../utils/time';
import { greeting, dateStr } from '../utils/format';

const SLOT_H = 28;

const CATEGORY_BG: Record<string, { bg: string; border: string; text: string }> = {
  Meeting:    { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)', text: '#c4b5fd' },
  Work:       { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)',  text: 'rgba(100,181,255,0.85)' },
  CodeReview: { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)',  text: '#6ee7b7' },
  Rest:       { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
  Personal:   { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',   text: '#fcd34d' },
  Other:      { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
};

// ── 뉴스 탭 ──────────────────────────────────────────────────
type NewsTab = '전체' | '경영·경제' | 'AI·에이전트' | '기술' | '글로벌';

// ── 태그 색상 (뉴스) ─────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  미팅:    'bg-violet-500/20 text-violet-300',
  작업:    'bg-blue-500/20 text-blue-300',
  코드리뷰: 'bg-emerald-500/20 text-emerald-300',
  휴식:    'bg-gray-500/20 text-gray-500',
  개인:    'bg-amber-500/20 text-amber-300',
  기타:    'bg-gray-500/20 text-gray-400',
  AI:      'bg-blue-500/20 text-blue-300',
  경제:    'bg-amber-500/20 text-amber-300',
  경영:    'bg-orange-500/20 text-orange-300',
  에이전트: 'bg-violet-500/20 text-violet-300',
  기술:    'bg-emerald-500/20 text-emerald-300',
  글로벌:  'bg-rose-500/20 text-rose-300',
};

// ── 이벤트 추가 모달 ─────────────────────────────────────────
interface AddEventModalProps {
  startTime: string;
  endTime: string;
  onClose: () => void;
  onConfirm: (title: string, startTime: string, endTime: string, category: ScheduleCategory) => void;
}

function AddEventModal({ startTime: initialStart, endTime: initialEnd, onClose, onConfirm }: AddEventModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [category, setCategory] = useState<ScheduleCategory>('Work');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    await onConfirm(title.trim(), startTime, endTime, category);
    setSubmitting(false);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 340,
          background: '#1c1c1e',
          borderRadius: 16,
          padding: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'rgba(235,235,245,0.5)', fontSize: 11, marginBottom: 4 }}>새 일정 추가</div>
          <input
            type="text"
            placeholder="일정 이름"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            autoFocus
            style={{
              width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)',
              outline: 'none', color: '#f1f5f9', fontSize: 16, fontWeight: 500,
              padding: '4px 0 8px', caretColor: '#0a84ff',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(235,235,245,0.4)', fontSize: 10, marginBottom: 4 }}>시작</div>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                width: '100%', background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, outline: 'none', color: '#0a84ff', fontSize: 13,
                fontWeight: 500, padding: '6px 10px',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(235,235,245,0.4)', fontSize: 10, marginBottom: 4 }}>종료</div>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                width: '100%', background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, outline: 'none', color: '#0a84ff', fontSize: 13,
                fontWeight: 500, padding: '6px 10px',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: 'rgba(235,235,245,0.4)', fontSize: 10, marginBottom: 8 }}>카테고리</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SCHEDULE_CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  border: `1px solid ${category === value ? 'rgba(10,132,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  background: category === value ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.04)',
                  color: category === value ? '#0a84ff' : 'rgba(235,235,245,0.4)',
                  transition: 'all 0.15s ease',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              border: 'none', background: 'transparent', color: 'rgba(235,235,245,0.4)',
            }}
          >취소</button>
          <button
            onClick={handleConfirm}
            disabled={!title.trim() || submitting}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: title.trim() ? 'pointer' : 'default',
              background: title.trim() ? '#0a84ff' : 'rgba(10,132,255,0.25)',
              color: title.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'background 0.15s ease',
            }}
          >{submitting ? '추가 중...' : '추가'}</button>
        </div>
      </div>
    </div>
  );
}

// ── 리사이즈 핸들 ────────────────────────────────────────────
function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const lineRef = useRef<HTMLDivElement>(null);
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: 8,
        flexShrink: 0,
        cursor: 'col-resize',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
      onMouseEnter={() => { if (lineRef.current) lineRef.current.style.background = 'rgba(59,130,246,0.5)'; }}
      onMouseLeave={() => { if (lineRef.current) lineRef.current.style.background = 'rgba(255,255,255,0.05)'; }}
    >
      <div ref={lineRef} style={{ width: 1, background: 'rgba(255,255,255,0.05)', transition: 'background 0.15s ease' }} />
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function HomePage() {
  const [newsTab, setNewsTab] = useState<NewsTab>('전체');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [scheduleError, setScheduleError] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [notesError, setNotesError] = useState(false);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date(); return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date(); setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Load today's schedule
  const loadSchedule = () => {
    const today = todayISO();
    setScheduleError(false);
    scheduleService.getByDate(today).then(setSchedule).catch(() => setScheduleError(true));
  };
  useEffect(loadSchedule, []);

  // Load news whenever tab changes
  useEffect(() => {
    newsService.getByCategory(newsTab).then(setNews).catch(console.error);
  }, [newsTab]);

  // Load AI suggestions on mount
  const loadSuggestions = () => {
    setSuggestionsLoading(true);
    setSuggestionsError(false);
    suggestionService.get()
      .then(data => { setSuggestions(data); setSuggestionsLoading(false); })
      .catch(() => { setSuggestionsError(true); setSuggestionsLoading(false); });
  };
  useEffect(loadSuggestions, []);

  // 컬럼 너비: [일정, 시간분석·작업제안] — 뉴스는 flex-1로 나머지 채움
  // Schedule add form state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedCityKey, setSelectedCityKey] = useState(() => weatherService.getSelectedCityKey());
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    weatherService.getCurrent(selectedCityKey).then(setWeather).catch(console.error);
  }, [selectedCityKey]);

  function selectCity(key: string) {
    weatherService.setSelectedCityKey(key);
    setSelectedCityKey(key);
    setShowCityPicker(false);
    setWeather(null);
  }

  // Time state for pre-filling the modal
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [citySearch, setCitySearch] = useState('');
  const resizingRef = useRef<{
    id: string; startY: number; origEndMins: number; currentEndMins: number;
    date: string; startTime: string; title: string; category: ScheduleCategory; description?: string;
  } | null>(null);
  const col1Ref = useRef<HTMLDivElement>(null);

  // Feature 1: AI bulk schedule state
  const [aiScheduleLoading, setAiScheduleLoading] = useState(false);

  // Feature 2: Slot hover state
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  // Feature 3: Drag-to-create refs and state
  const dragCreateRef = useRef<{ startSlot: number; currentSlot: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ startSlot: number; currentSlot: number } | null>(null);

  // Feature 4: Modal state (replaces showAddForm sticky panel)
  const [showModal, setShowModal] = useState(false);

  // Feature: drag a schedule item to the trash zone to remove it
  const [draggingScheduleId, setDraggingScheduleId] = useState<string | null>(null);
  const [deleteZoneHover, setDeleteZoneHover] = useState(false);

  async function handleDeleteDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const itemRaw = e.dataTransfer.getData('application/aivis-schedule-item');
    setDeleteZoneHover(false);
    setDraggingScheduleId(null);
    if (!itemRaw) return;
    const { id } = JSON.parse(itemRaw) as { id: string };
    const item = schedule.find(s => s.id === id);
    if (!item) return;
    // Optimistic removal, then reconcile with server
    setSchedule(prev => prev.filter(s => s.id !== id));
    try {
      await scheduleService.remove(id);
    } catch {
      setSchedule(await scheduleService.getByDate(item.date));
    }
  }

  // Notes state
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [noteSearch, setNoteSearch] = useState('');

  useEffect(() => {
    setNotesError(false);
    const req = noteSearch.trim()
      ? noteService.search(noteSearch)
      : noteService.list(5);
    req.then(setNotes).catch(() => setNotesError(true));
  }, [noteSearch]);

  // Handle drag-and-drop onto the timeline (suggestion → new item, or schedule item → new time)
  function handleTimelineDragOver(e: React.DragEvent) {
    const types = e.dataTransfer.types;
    if (types.includes('application/aivis-suggestion') || types.includes('application/aivis-schedule-item')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = types.includes('application/aivis-suggestion') ? 'copy' : 'move';
    }
  }

  async function handleTimelineDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const slotIndex = Math.max(0, Math.min(47, Math.floor(relY / SLOT_H)));
    const dropMins = slotIndex * 30;
    const today = todayISO();

    const sugRaw = e.dataTransfer.getData('application/aivis-suggestion');
    if (sugRaw) {
      const { title, index } = JSON.parse(sugRaw) as { title: string; index: number };
      const endMins = Math.min(dropMins + 60, 24 * 60);
      await scheduleService.create({
        date: today, startTime: minsToTimeStr(dropMins), endTime: minsToTimeStr(endMins),
        title, category: 'Work',
      });
      setSchedule(await scheduleService.getByDate(today));
      setSuggestions(prev => prev.filter((_, i) => i !== index));
      return;
    }

    const itemRaw = e.dataTransfer.getData('application/aivis-schedule-item');
    if (itemRaw) {
      const { id } = JSON.parse(itemRaw) as { id: string };
      const item = schedule.find(s => s.id === id);
      if (!item) return;
      const startMins = toMins(item.startTime);
      const endMins = item.endTime ? toMins(item.endTime) : startMins + 60;
      const duration = endMins - startMins;
      const newEndMins = Math.min(dropMins + duration, 24 * 60);
      await scheduleService.update(item.id, {
        date: item.date,
        startTime: minsToTimeStr(dropMins),
        endTime: minsToTimeStr(newEndMins),
        title: item.title,
        category: item.category,
        description: item.description,
      });
      setSchedule(await scheduleService.getByDate(item.date));
    }
  }

  // Find next available 60-min slot starting from `fromMins` (avoids existing schedule conflicts)
  function findNextAvailableSlot(items: ScheduleItem[], fromMins: number): number | null {
    const startSlot = Math.max(0, Math.ceil(fromMins / 30));
    for (let slot = startSlot; slot < 48; slot++) {
      const slotStart = slot * 30;
      const slotEnd = slotStart + 60;
      const conflict = items.some(s => {
        const sStart = toMins(s.startTime);
        const sEnd = s.endTime ? toMins(s.endTime) : sStart + 60;
        return slotStart < sEnd && slotEnd > sStart;
      });
      if (!conflict && slotEnd <= 24 * 60) return slot;
    }
    return null;
  }

  async function handleAddSuggestionToSchedule(title: string, index?: number) {
    const today = todayISO();
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const fresh = await scheduleService.getByDate(today);

    const slot = findNextAvailableSlot(fresh, currentMins);
    if (slot === null) return;

    const startTime = minsToTimeStr(slot * 30);
    const endTime = minsToTimeStr(slot * 30 + 60);
    await scheduleService.create({ date: today, startTime, endTime, title, category: 'Work' });
    const refreshed = await scheduleService.getByDate(today);
    setSchedule(refreshed);

    // Remove the added suggestion from the panel
    if (typeof index === 'number') {
      setSuggestions(prev => prev.filter((_, i) => i !== index));
    }
  }

  // Feature 4: Modal confirm handler
  async function handleModalConfirm(title: string, startTime: string, endTime: string, category: ScheduleCategory) {
    const today = todayISO();
    await scheduleService.create({ date: today, startTime, endTime: endTime || undefined, title, category });
    const refreshed = await scheduleService.getByDate(today);
    setSchedule(refreshed);
    setShowModal(false);
  }

  function openModalWithSlot(slotIndex: number) {
    const slotMins = slotIndex * 30;
    setNewStartTime(minsToTimeStr(slotMins));
    setNewEndTime(minsToTimeStr(Math.min(slotMins + 60, 24 * 60)));
    setShowModal(true);
  }

  // Feature 1: AI bulk schedule generation
  async function handleAiBulkSchedule() {
    if (aiScheduleLoading) return;
    setAiScheduleLoading(true);
    try {
      const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
      const prompt = `오늘(${today}) 하루 일정을 8~10개 추천해주세요. 반드시 아래 JSON 배열 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.\n[{"title":"스탠드업 미팅","startTime":"09:00","endTime":"09:30","category":"Meeting"},{"title":"코드 리뷰","startTime":"10:00","endTime":"11:00","category":"CodeReview"}]`;

      // Create a temporary session for AI suggestion
      const session = await conversationService.createSession();
      let fullResponse = '';
      await conversationService.streamMessage(
        session.id,
        prompt,
        (delta) => { fullResponse += delta; },
      );

      // Parse JSON from response
      const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('JSON 파싱 실패');

      const suggestions: AiScheduleSuggestion[] = JSON.parse(jsonMatch[0]);
      const today_date = todayISO();

      for (const item of suggestions) {
        const validCategories: ScheduleCategory[] = ['Meeting', 'Work', 'CodeReview', 'Rest', 'Personal', 'Other'];
        const category: ScheduleCategory = validCategories.includes(item.category) ? item.category : 'Work';
        await scheduleService.create({
          date: today_date,
          startTime: item.startTime,
          endTime: item.endTime,
          title: item.title,
          category,
        });
      }

      const refreshed = await scheduleService.getByDate(today_date);
      setSchedule(refreshed);

      // Clean up temp session
      await conversationService.deleteSession(session.id);
    } catch (err) {
      console.error('AI 일정 추천 실패:', err);
    } finally {
      setAiScheduleLoading(false);
    }
  }

  // Obsidian settings modal
  const [showObsidianModal, setShowObsidianModal] = useState(false);
  const [obsidianSettings, setObsidianSettings] = useState<ObsidianSettings | null>(null);
  const [obsidianVaultInput, setObsidianVaultInput] = useState('');
  const [obsidianEnabled, setObsidianEnabled] = useState(false);
  const [obsidianSyncing, setObsidianSyncing] = useState(false);
  const [obsidianSyncMsg, setObsidianSyncMsg] = useState('');

  useEffect(() => {
    obsidianService.getSettings().then((s) => {
      setObsidianSettings(s);
      setObsidianVaultInput(s.vaultPath);
      setObsidianEnabled(s.isEnabled);
    }).catch(console.error);
  }, []);

  async function handleObsidianSave() {
    try {
      const updated = await obsidianService.updateSettings(obsidianVaultInput, obsidianEnabled);
      setObsidianSettings(updated);
      setObsidianSyncMsg('설정 저장 완료');
      setTimeout(() => setObsidianSyncMsg(''), 2000);
    } catch { setObsidianSyncMsg('저장 실패'); }
  }

  async function handleObsidianSync() {
    setObsidianSyncing(true);
    setObsidianSyncMsg('');
    try {
      const result = await obsidianService.syncAll();
      setObsidianSyncMsg(`${result.syncedCount}개 노트 동기화 완료`);
    } catch { setObsidianSyncMsg('동기화 실패'); }
    finally { setObsidianSyncing(false); }
  }

  const [col1, setCol1] = useState(250);
  const [col2, setCol2] = useState(250);
  const dragging = useRef<null | { handle: number; startX: number; startA: number }>(null);

  const startResize = useCallback((handle: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startA = handle === 0 ? col1 : col2;
    dragging.current = { handle, startX: e.clientX, startA };

    function onMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const delta = ev.clientX - dragging.current.startX;
      if (handle === 0) {
        setCol1(Math.max(150, dragging.current.startA + delta));
      } else {
        setCol2(Math.max(180, dragging.current.startA + delta));
      }
    }
    function onUp() {
      dragging.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [col1, col2]);

  useEffect(() => {
    userService.getProfile().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (col1Ref.current) {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      col1Ref.current.scrollTop = Math.max(0, (mins / 30) * SLOT_H - 80);
    }
  }, []);

  function minsToTop(mins: number) { return (mins / 30) * SLOT_H; }

  function getItemEndMins(item: ScheduleItem) {
    return item.endTime ? toMins(item.endTime) : toMins(item.startTime) + 60;
  }

  function handleTimelineMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-event-block]')) return;
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const startSlot = Math.floor(relY / SLOT_H);
    dragCreateRef.current = { startSlot, currentSlot: startSlot };
    setDragPreview({ startSlot, currentSlot: startSlot });

    function onMouseMove(ev: MouseEvent) {
      if (!dragCreateRef.current) return;
      const col1El = col1Ref.current;
      if (!col1El) return;
      const colRect = col1El.getBoundingClientRect();
      // Account for the scroll offset of the timeline container
      const timelineOffsetTop = 46; // sticky header height approx
      const relativeY = ev.clientY - colRect.top + col1El.scrollTop - timelineOffsetTop;
      const currentSlot = Math.max(dragCreateRef.current.startSlot, Math.floor(relativeY / SLOT_H));
      dragCreateRef.current.currentSlot = currentSlot;
      setDragPreview({ startSlot: dragCreateRef.current.startSlot, currentSlot });
    }

    function onMouseUp() {
      const data = dragCreateRef.current;
      dragCreateRef.current = null;
      setDragPreview(null);

      if (data) {
        const startMins = data.startSlot * 30;
        const endMins = Math.min((data.currentSlot + 1) * 30, 24 * 60);
        setNewStartTime(minsToTimeStr(startMins));
        setNewEndTime(minsToTimeStr(endMins));
        setShowModal(true);
      }

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function handleEventResizeStart(e: React.MouseEvent, item: ScheduleItem) {
    e.preventDefault();
    e.stopPropagation();
    const origEndMins = getItemEndMins(item);
    resizingRef.current = {
      id: item.id, startY: e.clientY,
      origEndMins, currentEndMins: origEndMins,
      date: item.date, startTime: item.startTime,
      title: item.title, category: item.category, description: item.description,
    };
    function onMove(ev: MouseEvent) {
      const data = resizingRef.current;
      if (!data) return;
      const deltaSlots = Math.round((ev.clientY - data.startY) / SLOT_H);
      const startMins = toMins(data.startTime);
      const newEndMins = Math.max(startMins + 30, Math.min(data.origEndMins + deltaSlots * 30, 24 * 60));
      data.currentEndMins = newEndMins;
      setSchedule(prev => prev.map(s => s.id === data.id ? { ...s, endTime: minsToTimeStr(newEndMins) } : s));
    }
    async function onUp() {
      const data = resizingRef.current;
      if (!data) return;
      resizingRef.current = null;
      try {
        await scheduleService.update(data.id, {
          date: data.date, startTime: data.startTime, endTime: minsToTimeStr(data.currentEndMins),
          title: data.title, category: data.category, description: data.description,
        });
      } catch { /* ignore */ }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const NEWS_TABS: NewsTab[] = ['전체', '경영·경제', 'AI·에이전트', '기술', '글로벌'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{
      background: 'linear-gradient(160deg, #05050f 0%, #000008 45%, #020210 100%)',
    }}>
      {/* Ambient glow layers */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at 20% 0%, rgba(10,132,255,0.06) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(94,92,230,0.05) 0%, transparent 50%)',
      }} />

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-6 flex-shrink-0"
        style={{
          height: 54,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'linear-gradient(180deg, rgba(10,10,20,0.9) 0%, rgba(5,5,12,0.8) 100%)',
          backdropFilter: 'blur(24px) saturate(150%)',
          WebkitBackdropFilter: 'blur(24px) saturate(150%)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 4px 20px rgba(0,0,0,0.3)',
          position: 'relative', zIndex: 10,
        }}>
        <div>
          <div style={{
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>{user ? `${user.name} 님, ${greeting()}` : greeting()}</div>
          <div style={{ color: 'rgba(235,235,245,0.3)', fontSize: 11, marginTop: 2, letterSpacing: '-0.01em' }}>{dateStr()}</div>
        </div>
        <div className="flex items-center gap-3 relative">
          {/* Obsidian 설정 버튼 */}
          <button
            onClick={() => setShowObsidianModal(true)}
            title="Obsidian 연동 설정"
            className={`text-xs transition-colors flex items-center gap-1 ${
              obsidianSettings?.isEnabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.5 2C9.8 2 7.4 3.6 6.3 6c-.3.7-.5 1.5-.5 2.3 0 .9.2 1.8.6 2.6L2 20h4l2-4h2l1 4h2l1-4h2l2 4h4l-4.4-9.1c.4-.8.6-1.7.6-2.6 0-.8-.2-1.6-.5-2.3C17.6 3.6 15.2 2 12.5 2zm0 2c1.9 0 3.5 1.6 3.5 3.5S14.4 11 12.5 11 9 9.4 9 7.5 10.6 4 12.5 4z"/>
            </svg>
            Obsidian
          </button>
          <button
            onClick={() => setShowCityPicker((v) => !v)}
            className="text-gray-500 text-xs hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            {weather ? `${weather.icon} ${weather.temperature}°C  ${weather.city}` : '날씨 로딩 중...'}
            <span className="text-gray-600 text-[10px] ml-0.5">▾</span>
          </button>

          {showCityPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setShowCityPicker(false); setCitySearch(''); }} />
              <div
                className="absolute right-0 top-7 z-50 rounded-lg overflow-hidden"
                style={{
                  background: '#0d1f30',
                  border: '1px solid rgba(84,84,88,0.35)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  minWidth: 160,
                }}
              >
                {/* 검색바 */}
                <div className="px-2 py-1.5" style={{ borderBottom: '1px solid rgba(84,84,88,0.25)' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="도시 검색..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="w-full rounded text-[11px] px-2 py-1 focus:outline-none placeholder-gray-700"
                    style={{ background: '#1c1c1e', border: '1px solid #1e3a5a', color: '#d1d5db' }}
                  />
                </div>
                {/* 도시 목록 */}
                <div className="max-h-48 overflow-y-auto">
                  {CITIES.filter((c) => {
                    const q = citySearch.toLowerCase();
                    return !q || c.name.includes(q) || c.englishName.toLowerCase().includes(q);
                  }).map((c) => (
                    <button
                      key={c.key}
                      onClick={() => { selectCity(c.key); setCitySearch(''); }}
                      className="w-full text-left px-3 py-1.5 transition-colors"
                      style={{
                        color: c.key === selectedCityKey ? '#64b5ff' : '#9ca3af',
                        background: c.key === selectedCityKey ? 'rgba(59,130,246,0.1)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (c.key !== selectedCityKey) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = c.key === selectedCityKey ? 'rgba(59,130,246,0.1)' : 'transparent'; }}
                    >
                      <span className="text-xs">{c.name}</span>
                      <span className="text-[10px] ml-1.5" style={{ color: c.key === selectedCityKey ? '#0a84ff' : '#4b5563' }}>{c.englishName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Today Briefing 스트립 ── */}
      {(() => {
        const nowEvent = schedule.find(s => {
          const start = toMins(s.startTime);
          const end = s.endTime ? toMins(s.endTime) : start + 60;
          return start <= nowMinutes && nowMinutes < end;
        });
        const nextEvent = !nowEvent
          ? schedule.find(s => toMins(s.startTime) > nowMinutes)
          : null;
        const remainingCount = schedule.filter(s => {
          const end = s.endTime ? toMins(s.endTime) : toMins(s.startTime) + 60;
          return end > nowMinutes;
        }).length;

        return (
          <div style={{
            flexShrink: 0,
            padding: '7px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: 'linear-gradient(90deg, rgba(10,132,255,0.05) 0%, rgba(94,92,230,0.03) 100%)',
            display: 'flex', alignItems: 'center', gap: 20, overflow: 'hidden',
            position: 'relative', zIndex: 5,
          }}>
            {/* 총 일정 수 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7,
                background: 'rgba(10,132,255,0.12)',
                border: '1px solid rgba(10,132,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg style={{ width: 11, height: 11, color: '#0a84ff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span style={{ color: 'rgba(235,235,245,0.5)', fontSize: 11 }}>
                오늘 <span style={{ color: '#0a84ff', fontWeight: 600 }}>{schedule.length}개</span> 일정
              </span>
            </div>

            {/* 구분선 */}
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

            {/* 현재/다음 일정 */}
            {nowEvent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', flexShrink: 0, boxShadow: '0 0 6px #34d39980' }} />
                <span style={{ color: 'rgba(235,235,245,0.4)', fontSize: 11, flexShrink: 0 }}>진행 중</span>
                <span style={{ color: 'rgba(235,235,245,0.75)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nowEvent.title}
                </span>
                <span style={{ color: 'rgba(235,235,245,0.2)', fontSize: 10, flexShrink: 0 }}>
                  ~ {nowEvent.endTime ?? ''}
                </span>
              </div>
            ) : nextEvent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#facc15', flexShrink: 0 }} />
                <span style={{ color: 'rgba(235,235,245,0.4)', fontSize: 11, flexShrink: 0 }}>다음</span>
                <span style={{ color: 'rgba(235,235,245,0.75)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextEvent.title}
                </span>
                <span style={{ color: 'rgba(235,235,245,0.2)', fontSize: 10, flexShrink: 0 }}>
                  {nextEvent.startTime}
                </span>
              </div>
            ) : schedule.length > 0 ? (
              <span style={{ color: 'rgba(235,235,245,0.25)', fontSize: 11 }}>오늘 일정 모두 완료</span>
            ) : null}

            {/* 남은 일정 수 (우측) */}
            {remainingCount > 0 && (
              <>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <span style={{ color: 'rgba(235,235,245,0.2)', fontSize: 10 }}>남은 일정</span>
                  <span style={{ color: 'rgba(235,235,245,0.45)', fontSize: 11, fontWeight: 600 }}>{remainingCount}</span>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* ── 4컬럼 바디: 일정 | 시간분석·작업제안 | 뉴스 | 채팅 ── */}
      <div className="flex-1 flex overflow-hidden" style={{ userSelect: dragging.current ? 'none' : 'auto' }}>

        {/* ── COL 1: 오늘의 일정 (24h Timeline) ── */}
        <div
          ref={col1Ref}
          className="overflow-y-auto flex-shrink-0"
          style={{ width: col1, borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}
        >
          {/* Sticky header */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 20,
            background: 'linear-gradient(180deg, rgba(8,8,18,0.92) 0%, rgba(4,4,12,0.85) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '9px 10px 8px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              color: 'rgba(235,235,245,0.35)',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>오늘의 일정</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {/* Feature 1: AI 일정 추천 버튼 */}
              <button
                onClick={handleAiBulkSchedule}
                disabled={aiScheduleLoading}
                title="AI가 오늘 하루 일정을 추천하고 일괄 생성합니다"
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '3px 7px', borderRadius: 10, fontSize: 9, fontWeight: 500,
                  cursor: aiScheduleLoading ? 'default' : 'pointer',
                  border: '1px solid rgba(10,132,255,0.3)',
                  background: aiScheduleLoading ? 'rgba(10,132,255,0.06)' : 'rgba(10,132,255,0.12)',
                  color: aiScheduleLoading ? 'rgba(10,132,255,0.4)' : '#0a84ff',
                  transition: 'all 0.15s ease',
                  opacity: aiScheduleLoading ? 0.6 : 1,
                }}
              >
                {aiScheduleLoading ? '생성 중...' : '일정 추천'}
              </button>

              {/* Feature 4: + 버튼 → 모달 열기 */}
              <button
                onClick={() => {
                  const base = nowMinutes - (nowMinutes % 30);
                  setNewStartTime(minsToTimeStr(base));
                  setNewEndTime(minsToTimeStr(Math.min(base + 60, 24 * 60)));
                  setShowModal(true);
                }}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(96,165,250,0.14)',
                  border: '1px solid rgba(96,165,250,0.3)',
                  color: '#64b5ff',
                  fontSize: 15, lineHeight: 1, cursor: 'pointer',
                }}
              >+</button>
            </div>
          </div>

          {/* 24h Timeline */}
          <div
            style={{ position: 'relative', height: 48 * SLOT_H }}
            onMouseDown={handleTimelineMouseDown}
            onDragOver={handleTimelineDragOver}
            onDrop={handleTimelineDrop}
          >
            {/* Feature 2: 슬롯별 + 버튼 (48 slots, hover interaction) */}
            {Array.from({ length: 48 }, (_, slotIndex) => (
              <div
                key={`slot-${slotIndex}`}
                style={{
                  position: 'absolute', left: 28, right: 0,
                  top: slotIndex * SLOT_H, height: SLOT_H,
                  zIndex: 1, cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredSlot(slotIndex)}
                onMouseLeave={() => setHoveredSlot(null)}
                onMouseDown={(e) => {
                  if ((e.target as HTMLElement).closest('[data-slot-plus]')) {
                    e.stopPropagation();
                  }
                }}
              >
                {hoveredSlot === slotIndex && (
                  <button
                    data-slot-plus="true"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      openModalWithSlot(slotIndex);
                    }}
                    style={{
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      width: 16, height: 16, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(10,132,255,0.2)', border: '1px solid rgba(10,132,255,0.45)',
                      color: '#0a84ff', fontSize: 13, lineHeight: 1,
                      cursor: 'pointer', zIndex: 10,
                      boxShadow: '0 0 6px rgba(10,132,255,0.3)',
                    }}
                  >+</button>
                )}
              </div>
            ))}

            {/* Hour + half-hour lines */}
            {Array.from({ length: 25 }, (_, h) => (
              <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: h * 2 * SLOT_H }}>
                {h < 24 && (
                  <div style={{ position: 'absolute', left: 0, width: 26, height: SLOT_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
                    <span style={{ fontSize: 9, color: 'rgba(235,235,245,0.25)', letterSpacing: 0 }}>{String(h).padStart(2, '0')}</span>
                  </div>
                )}
                <div style={{ position: 'absolute', left: 28, right: 0, top: 0, height: 1, background: h === 0 ? 'transparent' : 'rgba(255,255,255,0.05)' }} />
                {h < 24 && <div style={{ position: 'absolute', left: 28, right: 0, top: SLOT_H, height: 0, borderTop: '1px dashed rgba(255,255,255,0.025)' }} />}
              </div>
            ))}

            {/* Current time indicator */}
            <div style={{ position: 'absolute', left: 26, right: 0, top: minsToTop(nowMinutes), zIndex: 5, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: -4, top: -3, width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />
              <div style={{ height: 1, background: 'linear-gradient(90deg, #ef4444 0%, rgba(239,68,68,0.15) 100%)', marginLeft: 2 }} />
            </div>

            {/* Events */}
            {!scheduleError && schedule.map(item => {
              const startMins = toMins(item.startTime);
              const endMins = getItemEndMins(item);
              const durationMins = Math.max(30, endMins - startMins);
              const topPx = minsToTop(startMins) + 1;
              const heightPx = Math.max(SLOT_H - 2, minsToTop(durationMins) - 2);
              const colors = CATEGORY_BG[item.category] ?? CATEGORY_BG.Other;
              return (
                <div
                  key={item.id}
                  data-event-block="true"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/aivis-schedule-item', JSON.stringify({ id: item.id }));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggingScheduleId(item.id);
                  }}
                  onDragEnd={() => { setDraggingScheduleId(null); setDeleteZoneHover(false); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: topPx, left: 30, right: 4, height: heightPx,
                    borderRadius: 8,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `4px solid ${colors.text}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    overflow: 'hidden', zIndex: 3, userSelect: 'none',
                    cursor: 'grab',
                  }}
                >
                  <div style={{ padding: '3px 6px 10px', overflow: 'hidden' }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: colors.text,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      letterSpacing: '-0.01em',
                    }}>{item.title}</div>
                    {heightPx >= SLOT_H * 1.5 && (
                      <div style={{
                        fontSize: 9,
                        color: colors.text,
                        opacity: 0.5,
                        marginTop: 2,
                        letterSpacing: '0.01em',
                      }}>{item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}</div>
                    )}
                  </div>
                  <div
                    data-event-block="true"
                    onMouseDown={(e) => handleEventResizeStart(e, item)}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <div style={{ width: 18, height: 2, borderRadius: 1, background: colors.border, opacity: 0.8 }} />
                  </div>
                </div>
              );
            })}

            {/* Feature 3: 드래그 프리뷰 블록 */}
            {dragPreview && (
              <div
                style={{
                  position: 'absolute',
                  left: 30, right: 4,
                  top: dragPreview.startSlot * SLOT_H + 1,
                  height: (dragPreview.currentSlot - dragPreview.startSlot + 1) * SLOT_H - 2,
                  borderRadius: 7,
                  background: 'rgba(10,132,255,0.25)',
                  border: '1px solid rgba(10,132,255,0.5)',
                  zIndex: 4,
                  pointerEvents: 'none',
                }}
              />
            )}

            {scheduleError && (
              <div style={{ position: 'absolute', top: minsToTop(8 * 60) + 20, left: 32, right: 4, textAlign: 'center' }}>
                <div style={{ color: '#f87171', fontSize: 10, marginBottom: 4 }}>일정을 불러오지 못했습니다.</div>
                <button onClick={loadSchedule} style={{ fontSize: 10, color: '#64b5ff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>재시도</button>
              </div>
            )}
          </div>

          {/* Trash drop zone — appears while dragging a schedule item, pinned to the bottom */}
          {draggingScheduleId && (
            <div
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('application/aivis-schedule-item')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (!deleteZoneHover) setDeleteZoneHover(true);
                }
              }}
              onDragLeave={() => setDeleteZoneHover(false)}
              onDrop={handleDeleteDrop}
              style={{
                position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 30,
                height: deleteZoneHover ? 64 : 52,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                margin: '0 6px 8px',
                borderRadius: 12,
                border: `1.5px dashed ${deleteZoneHover ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.4)'}`,
                background: deleteZoneHover ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.07)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: deleteZoneHover ? '#fca5a5' : 'rgba(248,113,113,0.7)',
                fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s ease',
                boxShadow: deleteZoneHover ? '0 0 20px rgba(239,68,68,0.3)' : 'none',
              }}
            >
              <svg style={{ width: 16, height: 16, transform: deleteZoneHover ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.15s ease' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleteZoneHover ? '놓으면 일정이 삭제됩니다' : '여기로 끌어다 놓아 삭제'}
            </div>
          )}
        </div>

        <ResizeHandle onMouseDown={(e) => startResize(0, e)} />

        {/* ── COL 2: 시간 분석 + 작업 제안 ── */}
        <div className="p-4 space-y-4" style={{ width: col2, flexShrink: 0, overflowY: 'auto', overflowX: 'hidden', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <TimeAnalysisPanel
            schedule={schedule}
            scheduleError={scheduleError}
            onRetry={loadSchedule}
          />
          <SuggestionsPanel
            suggestions={suggestions}
            loading={suggestionsLoading}
            error={suggestionsError}
            onRetry={loadSuggestions}
            onSelect={(_title) => { /* handled by GlobalChatPanel */ }}
            onAddToSchedule={handleAddSuggestionToSchedule}
          />
          <NotesPanel
            notes={notes}
            noteSearch={noteSearch}
            error={notesError}
            onSearchChange={setNoteSearch}
            onRetry={() => setNoteSearch(noteSearch)}
          />
        </div>

        <ResizeHandle onMouseDown={(e) => startResize(1, e)} />

        {/* ── COL 3: 뉴스 ── */}
        <div className="flex-col overflow-hidden" style={{ flex: '1 1 0', minWidth: 160, display: 'flex', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          {/* 제목 */}
          <div className="flex-shrink-0 px-4 pt-4 pb-2">
            <span style={{
              color: 'rgba(235,235,245,0.92)',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '-0.01em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>뉴스</span>
          </div>
          {/* 탭 (언더라인 스타일) */}
          <div className="flex-shrink-0 px-4 flex gap-1 overflow-x-auto"
            style={{ borderBottom: '1px solid rgba(84,84,88,0.25)' }}>
            {NEWS_TABS.map((tab) => (
              <button key={tab} onClick={() => setNewsTab(tab)}
                className="flex-shrink-0 text-[11px] pb-2 pt-0.5 transition-colors relative"
                style={{
                  color: newsTab === tab ? '#64b5ff' : 'rgba(235,235,245,0.4)',
                  fontWeight: newsTab === tab ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (newsTab !== tab) (e.currentTarget as HTMLElement).style.color = 'rgba(235,235,245,0.7)'; }}
                onMouseLeave={(e) => { if (newsTab !== tab) (e.currentTarget as HTMLElement).style.color = 'rgba(235,235,245,0.4)'; }}
              >
                {tab}
                {newsTab === tab && (
                  <span style={{
                    position: 'absolute', left: 0, right: 0, bottom: -1, height: 2,
                    borderRadius: 2, background: '#0a84ff', boxShadow: '0 0 6px rgba(10,132,255,0.5)',
                  }} />
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {news.length === 0 ? (
              <div className="text-gray-600 text-[11px] text-center py-8">뉴스를 불러오는 중...</div>
            ) : (
              news.map((item, i) => (
                <a
                  key={i}
                  href={item.url ?? '#'}
                  target={item.url ? '_blank' : undefined}
                  rel={item.url ? 'noopener noreferrer' : undefined}
                  className="block rounded-lg px-3 py-2 cursor-pointer group"
                  style={{
                    background: 'rgba(28,28,30,0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.05)';
                    el.style.borderLeftColor = '#0a84ff';
                    el.style.borderLeftWidth = '2px';
                    el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.35)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.05)';
                    el.style.borderLeftWidth = '1px';
                    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded mt-0.5 ${TAG_COLORS[item.tag] ?? 'bg-gray-500/20 text-gray-400'}`}>
                      {item.tag}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-200 text-xs leading-snug group-hover:text-white transition-colors line-clamp-2">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-600 text-[10px]">{item.source}</span>
                        {item.time && (
                          <>
                            <span className="text-gray-800 text-[10px]">·</span>
                            <span className="text-gray-600 text-[10px]">{item.time} 전</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Feature 4: 이벤트 추가 모달 ── */}
      {showModal && (
        <AddEventModal
          startTime={newStartTime}
          endTime={newEndTime}
          onClose={() => setShowModal(false)}
          onConfirm={handleModalConfirm}
        />
      )}

      {/* ── Obsidian 설정 모달 ── */}
      {showObsidianModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowObsidianModal(false)} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 w-80"
            style={{ background: '#1c1c1e', border: '1px solid #1e3a5a', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">Obsidian 연동</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${obsidianSettings?.isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-500'}`}>
                  {obsidianSettings?.isEnabled ? '연결됨' : '꺼짐'}
                </span>
              </div>
              <button onClick={() => setShowObsidianModal(false)} className="text-gray-600 hover:text-gray-300 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3">
              {/* 활성화 토글 */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">연동 활성화</span>
                <button
                  onClick={() => setObsidianEnabled((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${obsidianEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${obsidianEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Vault 경로 */}
              <div>
                <label className="text-gray-500 text-[10px] mb-1 block">Vault 경로 (컨테이너 내부)</label>
                <input
                  type="text"
                  value={obsidianVaultInput}
                  onChange={(e) => setObsidianVaultInput(e.target.value)}
                  placeholder="/vault"
                  className="w-full rounded-lg text-[11px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder-gray-700"
                  style={{ background: '#1c1c1e', border: '1px solid rgba(84,84,88,0.35)', color: '#d1d5db' }}
                />
                <p className="text-gray-700 text-[9px] mt-1">
                  호스트 ~/Documents/AIVIS → 컨테이너 /vault 마운트됨
                </p>
              </div>

              {/* 버튼들 */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleObsidianSave}
                  className="flex-1 text-[11px] py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={handleObsidianSync}
                  disabled={!obsidianSettings?.isEnabled || obsidianSyncing}
                  className="flex-1 text-[11px] py-1.5 rounded-lg bg-blue-600/70 hover:bg-blue-500/70 disabled:opacity-30 text-white transition-colors"
                >
                  {obsidianSyncing ? '동기화 중...' : '전체 동기화'}
                </button>
              </div>

              {obsidianSyncMsg && (
                <p className="text-emerald-400 text-[10px] text-center">{obsidianSyncMsg}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
