import { useState, useEffect, useCallback, useRef } from 'react';
import { userService, type UserProfile } from '../services/userService';
import { scheduleService, type ScheduleItem, type ScheduleCategory } from '../services/scheduleService';
import { CITIES } from '../services/weatherService';

import { TimeAnalysisPanel } from '../components/dashboard/TimeAnalysisPanel';
import { SuggestionsPanel } from '../components/dashboard/SuggestionsPanel';
import { NotesPanel } from '../components/dashboard/NotesPanel';
import { AddEventModal } from '../components/dashboard/AddEventModal';
import { ResizeHandle } from '../components/dashboard/ResizeHandle';
import { ObsidianButton } from '../components/dashboard/ObsidianButton';
import { NewsColumn } from '../components/dashboard/NewsColumn';
import { ScheduleTimeline } from '../components/dashboard/ScheduleTimeline';
import { type NewsTab } from '../components/dashboard/dashboardConstants';
import { toMins, minsToTimeStr, todayISO } from '../utils/time';
import { greeting, dateStr } from '../utils/format';
import { useNowMinutes, useNews, useWeather, useNotes, useSuggestions } from '../hooks/useDashboard';
import { toast } from '../stores/toastStore';

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

  // Time state for pre-filling the add-event modal
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [showModal, setShowModal] = useState(false);

  function openAddModal(startMins: number, endMins: number) {
    setNewStartTime(minsToTimeStr(startMins));
    setNewEndTime(minsToTimeStr(endMins));
    setShowModal(true);
  }

  // Notes (search + recent)
  const { notes, noteSearch, setNoteSearch, notesError } = useNotes();

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
    if (slot === null) {
      toast.info('오늘은 더 들어갈 자리가 없어요');
      return;
    }

    const startTime = minsToTimeStr(slot * 30);
    const endTime = minsToTimeStr(slot * 30 + 60);
    await scheduleService.create({ date: today, startTime, endTime, title, category: 'Work' });
    const refreshed = await scheduleService.getByDate(today);
    setSchedule(refreshed);
    toast.success('제안을 일정에 추가했습니다');

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
    toast.success('일정을 추가했습니다');
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
      {/* min-h-0: 자식(타임라인 1344px)이 행을 늘리지 않고 행 안에서 스크롤되게 함 */}
      <div className="flex-1 flex overflow-hidden min-h-0" style={{ userSelect: dragging.current ? 'none' : 'auto' }}>

        {/* ── COL 1: 오늘의 일정 (24h Timeline) ── */}
        <ScheduleTimeline
          width={col1}
          schedule={schedule}
          setSchedule={setSchedule}
          scheduleError={scheduleError}
          onRetry={loadSchedule}
          nowMinutes={nowMinutes}
          removeSuggestion={(index) => setSuggestions(prev => prev.filter((_, i) => i !== index))}
          onOpenAddModal={openAddModal}
        />

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
