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
      background: 'var(--bg-0)',
    }}>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-6 flex-shrink-0"
        style={{
          height: 54,
          borderBottom: '1px solid var(--border-1)',
          background: 'var(--bg-1)',
          position: 'relative', zIndex: 10,
        }}>
        <div>
          <div style={{
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            color: 'var(--text-1)',
          }}>{user ? `${user.name} 님, ${greeting()}` : greeting()}</div>
          <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>{dateStr()}</div>
        </div>
        <div className="flex items-center gap-3 relative">
          <ObsidianButton />
          <button
            onClick={() => setShowCityPicker((v) => !v)}
            className="text-xs transition-colors flex items-center gap-1"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
          >
            {weather ? `${weather.icon} ${weather.temperature}°C  ${weather.city}` : '날씨 로딩 중...'}
            <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-3)' }}>▾</span>
          </button>

          {showCityPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setShowCityPicker(false); setCitySearch(''); }} />
              <div
                className="absolute right-0 top-7 z-50 overflow-hidden"
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--r-md)',
                  boxShadow: 'var(--shadow-overlay)',
                  minWidth: 160,
                }}
              >
                {/* 검색바 */}
                <div className="px-2 py-1.5" style={{ borderBottom: '1px solid var(--border-1)' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="도시 검색..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="ui-field"
                    style={{ height: 30, fontSize: 12 }}
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
                        color: c.key === selectedCityKey ? 'var(--accent)' : 'var(--text-2)',
                        background: c.key === selectedCityKey ? 'var(--accent-bg)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (c.key !== selectedCityKey) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = c.key === selectedCityKey ? 'var(--accent-bg)' : 'transparent'; }}
                    >
                      <span className="text-xs">{c.name}</span>
                      <span className="text-[10px] ml-1.5" style={{ color: c.key === selectedCityKey ? 'var(--accent)' : 'var(--text-3)' }}>{c.englishName}</span>
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
            borderBottom: '1px solid var(--border-1)',
            background: 'var(--bg-1)',
            display: 'flex', alignItems: 'center', gap: 20, overflow: 'hidden',
            position: 'relative', zIndex: 5,
          }}>
            {/* 총 일정 수 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 'var(--r-sm)',
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg style={{ width: 11, height: 11, color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span style={{ color: 'var(--text-2)', fontSize: 12 }}>
                오늘 <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 600 }}>{schedule.length}개</span> 일정
              </span>
            </div>

            {/* 구분선 */}
            <div style={{ width: 1, height: 14, background: 'var(--border-1)', flexShrink: 0 }} />

            {/* 현재/다음 일정 */}
            {nowEvent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: 'var(--r-full)', background: 'var(--ok)', flexShrink: 0, animation: 'live-dot 2s var(--ease) infinite' }} />
                <span style={{ color: 'var(--text-2)', fontSize: 12, flexShrink: 0 }}>진행 중</span>
                <span style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nowEvent.title}
                </span>
                <span className="tabular" style={{ color: 'var(--text-3)', fontSize: 11, flexShrink: 0 }}>
                  ~ {nowEvent.endTime ?? ''}
                </span>
              </div>
            ) : nextEvent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: 'var(--r-full)', background: 'var(--warn)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-2)', fontSize: 12, flexShrink: 0 }}>다음</span>
                <span style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextEvent.title}
                </span>
                <span className="tabular" style={{ color: 'var(--text-3)', fontSize: 11, flexShrink: 0 }}>
                  {nextEvent.startTime}
                </span>
              </div>
            ) : schedule.length > 0 ? (
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>오늘 일정 모두 완료</span>
            ) : null}

            {/* 남은 일정 수 (우측) */}
            {remainingCount > 0 && (
              <>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <span style={{ color: 'var(--text-3)', fontSize: 11 }}>남은 일정</span>
                  <span className="tabular" style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 600 }}>{remainingCount}</span>
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
        <div className="p-4 space-y-4" style={{ width: col2, flexShrink: 0, overflowY: 'auto', overflowX: 'hidden', borderRight: '1px solid var(--border-1)' }}>
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
