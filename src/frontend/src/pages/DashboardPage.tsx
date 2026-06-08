import { useState, useEffect, useCallback, useRef } from 'react';
import { userService, type UserProfile } from '../services/userService';
import { scheduleService, type ScheduleItem, type ScheduleCategory } from '../services/scheduleService';
import { CITIES } from '../services/weatherService';
import { conversationService } from '../services/conversationService';

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
import { AddEventModal } from '../components/dashboard/AddEventModal';
import { ResizeHandle } from '../components/dashboard/ResizeHandle';
import { ObsidianButton } from '../components/dashboard/ObsidianButton';
import { NewsColumn } from '../components/dashboard/NewsColumn';
import { SLOT_H, CATEGORY_BG, type NewsTab } from '../components/dashboard/dashboardConstants';
import { toMins, minsToTimeStr, todayISO } from '../utils/time';
import { greeting, dateStr } from '../utils/format';
import { useNowMinutes, useNews, useWeather, useNotes, useSuggestions } from '../hooks/useDashboard';

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function HomePage() {
  const [newsTab, setNewsTab] = useState<NewsTab>('전체');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [scheduleError, setScheduleError] = useState(false);

  const nowMinutes = useNowMinutes();
  const news = useNews(newsTab);
  const { suggestions, setSuggestions, suggestionsError, suggestionsLoading, loadSuggestions } = useSuggestions();

  // Load today's schedule
  const loadSchedule = () => {
    const today = todayISO();
    setScheduleError(false);
    scheduleService.getByDate(today).then(setSchedule).catch(() => setScheduleError(true));
  };
  useEffect(loadSchedule, []);

  const { weather, selectedCityKey, showCityPicker, setShowCityPicker, citySearch, setCitySearch, selectCity } = useWeather();

  // Time state for pre-filling the modal
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
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

  // Notes (search + recent)
  const { notes, noteSearch, setNoteSearch, notesError } = useNotes();

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
          <ObsidianButton />
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
        <NewsColumn news={news} newsTab={newsTab} onSelectTab={setNewsTab} />

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

    </div>
  );
}
