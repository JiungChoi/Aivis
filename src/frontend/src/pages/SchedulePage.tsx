import { useState, useEffect, useRef, useCallback } from 'react';
import { scheduleService, type ScheduleItem, type ScheduleCategory, SCHEDULE_CATEGORIES } from '../services/scheduleService';

const SLOT_H = 28;

const CATEGORY_BG: Record<string, { bg: string; border: string; text: string }> = {
  Meeting:    { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)', text: '#c4b5fd' },
  Work:       { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)',  text: 'rgba(100,181,255,0.85)' },
  CodeReview: { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)',  text: '#6ee7b7' },
  Rest:       { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
  Personal:   { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',   text: '#fcd34d' },
  Other:      { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
};

function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function minsToTimeStr(m: number) { return `${String(Math.floor(m / 60) % 24).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`; }
function toDateKey(y: number, mo: number, d: number) { return `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

// ── Add Event Modal ────────────────────────────────────────────

interface AddModalProps {
  startTime: string; endTime: string;
  onConfirm: (data: { title: string; startTime: string; endTime: string; category: ScheduleCategory; description?: string }) => void;
  onClose: () => void;
}

function AddEventModal({ startTime, endTime, onConfirm, onClose }: AddModalProps) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(startTime);
  const [end, setEnd]     = useState(endTime);
  const [cat, setCat]     = useState<ScheduleCategory>('Work');
  const [desc, setDesc]   = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: 320, borderRadius: 16, overflow: 'hidden',
          background: 'rgba(28,28,30,0.92)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          animation: 'bubble-pop-in 0.18s ease forwards',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: 'rgba(235,235,245,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>새 일정</div>
          <input
            autoFocus
            type="text"
            placeholder="일정 제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && title.trim() && onConfirm({ title: title.trim(), startTime: start, endTime: end, category: cat, description: desc.trim() || undefined })}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: '#f1f5f9', fontSize: 15, fontWeight: 500, caretColor: '#64b5ff',
            }}
          />
        </div>

        {/* Times */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'rgba(235,235,245,0.3)', marginBottom: 3, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>시작</div>
            <input type="time" value={start} onChange={e => setStart(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#64b5ff', fontSize: 13, fontWeight: 600, colorScheme: 'dark' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'rgba(235,235,245,0.3)', marginBottom: 3, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>종료</div>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#64b5ff', fontSize: 13, fontWeight: 600, colorScheme: 'dark' }} />
          </div>
        </div>

        {/* Category */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {SCHEDULE_CATEGORIES.map(({ value, label }) => {
              const c = CATEGORY_BG[value];
              return (
                <button key={value} onClick={() => setCat(value)} style={{
                  padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
                  background: cat === value ? c.bg : 'transparent',
                  border: `1px solid ${cat === value ? c.border : 'rgba(255,255,255,0.07)'}`,
                  color: cat === value ? c.text : 'rgba(235,235,245,0.3)',
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <input type="text" placeholder="메모 (선택)"
            value={desc} onChange={e => setDesc(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#6b7280', fontSize: 11, caretColor: '#64b5ff' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px 14px' }}>
          <button onClick={onClose} style={{
            padding: '7px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280',
          }}>취소</button>
          <button
            onClick={() => title.trim() && onConfirm({ title: title.trim(), startTime: start, endTime: end, category: cat, description: desc.trim() || undefined })}
            disabled={!title.trim()}
            style={{
              flex: 1, padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'default',
              border: 'none', background: title.trim() ? '#0a84ff' : 'rgba(37,99,235,0.18)',
              color: title.trim() ? '#fff' : 'rgba(235,235,245,0.25)', transition: 'all 0.15s',
            }}
          >추가</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function SchedulePage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  const [monthSchedules, setMonthSchedules] = useState<Record<string, ScheduleItem[]>>({});
  const [daySchedules, setDaySchedules] = useState<ScheduleItem[]>([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');

  // Drag-to-create
  const dragCreateRef = useRef<{ startSlot: number; currentSlot: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ startSlot: number; currentSlot: number } | null>(null);

  // Resize ref
  const resizingRef = useRef<{
    id: string; startY: number; origEndMins: number; currentEndMins: number;
    date: string; startTime: string; title: string; category: ScheduleCategory; description?: string;
  } | null>(null);

  // Timeline scroll ref
  const timelineRef = useRef<HTMLDivElement>(null);

  // Load month schedules
  useEffect(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    Promise.all(
      Array.from({ length: daysInMonth }, (_, i) => {
        const dateKey = toDateKey(viewYear, viewMonth, i + 1);
        return scheduleService.getByDate(dateKey).then(items => ({ dateKey, items }));
      })
    ).then(results => {
      const map: Record<string, ScheduleItem[]> = {};
      results.forEach(({ dateKey, items }) => { map[dateKey] = items; });
      setMonthSchedules(map);
    }).catch(() => {});
  }, [viewYear, viewMonth]);

  // Load selected day
  useEffect(() => {
    scheduleService.getByDate(selectedDate)
      .then(setDaySchedules)
      .catch(() => {});
  }, [selectedDate]);

  // Scroll to current time
  useEffect(() => {
    if (timelineRef.current) {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      timelineRef.current.scrollTop = Math.max(0, (mins / 30) * SLOT_H - 100);
    }
  }, [selectedDate]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  function getItemEndMins(item: ScheduleItem) {
    return item.endTime ? toMins(item.endTime) : toMins(item.startTime) + 60;
  }

  async function handleAddEvent(data: { title: string; startTime: string; endTime: string; category: ScheduleCategory; description?: string }) {
    setShowModal(false);
    try {
      await scheduleService.create({ date: selectedDate, startTime: data.startTime, endTime: data.endTime, title: data.title, category: data.category, description: data.description });
      const refreshed = await scheduleService.getByDate(selectedDate);
      setDaySchedules(refreshed);
      setMonthSchedules(prev => ({ ...prev, [selectedDate]: refreshed }));
    } catch { /* no-op */ }
  }

  async function handleDelete(id: string) {
    try {
      await scheduleService.remove(id);
      const refreshed = await scheduleService.getByDate(selectedDate);
      setDaySchedules(refreshed);
      setMonthSchedules(prev => ({ ...prev, [selectedDate]: refreshed }));
    } catch { /* no-op */ }
  }

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-event-block]')) return;
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const startSlot = Math.floor(relY / SLOT_H);
    dragCreateRef.current = { startSlot, currentSlot: startSlot };
    setDragPreview({ startSlot, currentSlot: startSlot });

    function onMouseMove(ev: MouseEvent) {
      if (!dragCreateRef.current || !timelineRef.current) return;
      const colRect = timelineRef.current.getBoundingClientRect();
      const headerH = 46;
      const relativeY = ev.clientY - colRect.top + timelineRef.current.scrollTop - headerH;
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
        const endMins   = Math.min((data.currentSlot + 1) * 30, 24 * 60);
        setNewStartTime(minsToTimeStr(startMins));
        setNewEndTime(minsToTimeStr(endMins));
        setShowModal(true);
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  function handleEventResizeStart(e: React.MouseEvent, item: ScheduleItem) {
    e.preventDefault(); e.stopPropagation();
    const origEndMins = getItemEndMins(item);
    resizingRef.current = {
      id: item.id, startY: e.clientY,
      origEndMins, currentEndMins: origEndMins,
      date: item.date, startTime: item.startTime,
      title: item.title, category: item.category, description: item.description,
    };
    function onMove(ev: MouseEvent) {
      const data = resizingRef.current; if (!data) return;
      const deltaSlots = Math.round((ev.clientY - data.startY) / SLOT_H);
      const startMins = toMins(data.startTime);
      const newEndMins = Math.max(startMins + 30, Math.min(data.origEndMins + deltaSlots * 30, 24 * 60));
      data.currentEndMins = newEndMins;
      setDaySchedules(prev => prev.map(s => s.id === data.id ? { ...s, endTime: minsToTimeStr(newEndMins) } : s));
    }
    async function onUp() {
      const data = resizingRef.current; if (!data) return;
      resizingRef.current = null;
      try { await scheduleService.update(data.id, { date: data.date, startTime: data.startTime, endTime: minsToTimeStr(data.currentEndMins), title: data.title, category: data.category, description: data.description }); }
      catch { /* no-op */ }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Calendar
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const DAY_NAMES   = ['일','월','화','수','목','금','토'];
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  // Now (red line)
  const nowMins = today.getHours() * 60 + today.getMinutes();
  const nowTop = (nowMins / 30) * SLOT_H;

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: '#000000' }}>

      {/* ── 좌측: 달력 ── */}
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* 헤더 */}
        <div style={{
          padding: '14px 16px 10px',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-gray-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{viewYear}년 {MONTH_NAMES[viewMonth]}</span>
              {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth()) && (
                <button
                  onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(todayKey); }}
                  style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(10,132,255,0.15)', color: '#64b5ff', border: 'none', cursor: 'pointer' }}
                >오늘</button>
              )}
            </div>
            <button onClick={nextMonth} className="text-gray-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 500, color: i === 0 ? '#f87171' : i === 6 ? '#64b5ff' : 'rgba(235,235,245,0.3)' }}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} />;
              const dateKey = toDateKey(viewYear, viewMonth, day);
              const isToday    = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;
              const hasItems   = (monthSchedules[dateKey]?.length ?? 0) > 0;
              const col = idx % 7;
              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className="relative flex flex-col items-center py-1 rounded-lg transition-colors"
                  style={{
                    background: isSelected ? '#0a84ff' : isToday ? 'rgba(10,132,255,0.12)' : 'transparent',
                    color: isSelected ? 'white' : isToday ? '#64b5ff' : col === 0 ? '#f87171' : col === 6 ? '#64b5ff' : 'rgba(235,235,245,0.55)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400 }}>{day}</span>
                  {hasItems && !isSelected && (
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#0a84ff', marginTop: 1 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 월 통계 */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{
            borderRadius: 10, padding: 12,
            background: 'rgba(28,28,30,0.72)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ color: 'rgba(235,235,245,0.3)', fontSize: 10, marginBottom: 8 }}>{MONTH_NAMES[viewMonth]} 통계</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{Object.values(monthSchedules).flat().length}</div>
                <div style={{ color: 'rgba(235,235,245,0.3)', fontSize: 9 }}>총 일정</div>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{Object.values(monthSchedules).filter(v => v.length > 0).length}</div>
                <div style={{ color: 'rgba(235,235,245,0.3)', fontSize: 9 }}>일정 있는 날</div>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{Object.values(monthSchedules).flat().filter(s => s.category === 'Meeting').length}</div>
                <div style={{ color: 'rgba(235,235,245,0.3)', fontSize: 9 }}>미팅</div>
              </div>
            </div>
          </div>
        </div>

        {/* 오늘 일정 미니 리스트 */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '0 16px 16px' }}>
          {daySchedules.length > 0 && (
            <div style={{ color: 'rgba(235,235,245,0.3)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
            </div>
          )}
          <div className="space-y-1.5">
            {daySchedules.map(item => {
              const c = CATEGORY_BG[item.category] ?? CATEGORY_BG.Other;
              return (
                <div key={item.id} style={{
                  borderRadius: 7, padding: '6px 8px',
                  background: c.bg, border: `1px solid ${c.border}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace', color: 'rgba(235,235,245,0.5)', flexShrink: 0 }}>{item.startTime}</span>
                  <span style={{ fontSize: 11, color: c.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 우측: 24h 타임라인 ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* 헤더 */}
        <div style={{
          height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
            <div style={{ color: 'rgba(235,235,245,0.28)', fontSize: 11, marginTop: 1 }}>
              {daySchedules.length}개 일정
            </div>
          </div>
          <button
            onClick={() => { setNewStartTime('09:00'); setNewEndTime('10:00'); setShowModal(true); }}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'rgba(10,132,255,0.15)', border: '1px solid rgba(10,132,255,0.3)',
              color: '#64b5ff', cursor: 'pointer',
            }}
          >+ 일정 추가</button>
        </div>

        {/* 타임라인 */}
        <div ref={timelineRef} className="flex-1 overflow-y-auto" style={{ position: 'relative' }}>
          <div
            style={{ position: 'relative', height: 48 * SLOT_H, userSelect: 'none' }}
            onMouseDown={handleTimelineMouseDown}
          >
            {/* 시간 레이블 + 슬롯 그리드 */}
            {Array.from({ length: 48 }, (_, slot) => {
              const hour = Math.floor(slot / 2);
              const isHour = slot % 2 === 0;
              const top = slot * SLOT_H;
              return (
                <div key={slot} style={{ position: 'absolute', top, left: 0, right: 0, height: SLOT_H, display: 'flex', alignItems: 'flex-start' }}>
                  {/* hour label */}
                  <div style={{ width: 48, flexShrink: 0, paddingTop: isHour ? 3 : 0, paddingRight: 8, textAlign: 'right' }}>
                    {isHour && (
                      <span style={{ fontSize: 10, color: 'rgba(235,235,245,0.2)', fontFamily: 'monospace', fontWeight: 500 }}>
                        {String(hour).padStart(2,'0')}
                      </span>
                    )}
                  </div>
                  {/* grid line */}
                  <div style={{
                    flex: 1, height: '100%',
                    borderTop: isHour ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.02)',
                    position: 'relative',
                  }} />
                </div>
              );
            })}

            {/* Drag preview */}
            {dragPreview && (() => {
              const top  = dragPreview.startSlot * SLOT_H;
              const h    = (dragPreview.currentSlot - dragPreview.startSlot + 1) * SLOT_H;
              return (
                <div style={{
                  position: 'absolute', top, left: 56, right: 8, height: h, zIndex: 2,
                  background: 'rgba(10,132,255,0.08)', border: '1.5px dashed rgba(10,132,255,0.4)',
                  borderRadius: 6, pointerEvents: 'none',
                }} />
              );
            })()}

            {/* Now indicator */}
            {selectedDate === todayKey && (
              <div style={{ position: 'absolute', top: nowTop, left: 48, right: 0, height: 1, background: '#0a84ff', zIndex: 5, opacity: 0.8 }}>
                <div style={{ position: 'absolute', left: -4, top: -3, width: 7, height: 7, borderRadius: '50%', background: '#0a84ff' }} />
              </div>
            )}

            {/* Event blocks */}
            {daySchedules.map(item => {
              const startMins = toMins(item.startTime);
              const endMins   = getItemEndMins(item);
              const top  = (startMins / 30) * SLOT_H;
              const h    = Math.max(SLOT_H, ((endMins - startMins) / 30) * SLOT_H);
              const c    = CATEGORY_BG[item.category] ?? CATEGORY_BG.Other;
              return (
                <div
                  key={item.id}
                  data-event-block="true"
                  style={{
                    position: 'absolute', top: top + 2, left: 56, right: 8,
                    height: h - 4, zIndex: 4,
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 6, padding: '4px 8px',
                    display: 'flex', flexDirection: 'column',
                    cursor: 'default',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    transition: 'box-shadow 0.1s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)'}
                >
                  <div className="flex items-start justify-between gap-1 flex-1 min-h-0">
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                      <div style={{ fontSize: 11, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      {h >= SLOT_H * 2 && (
                        <div style={{ fontSize: 9, color: 'rgba(235,235,245,0.3)', fontFamily: 'monospace' }}>
                          {item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        flexShrink: 0, opacity: 0, transition: 'opacity 0.15s', padding: 1,
                        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(235,235,245,0.4)',
                        fontSize: 10, lineHeight: 1,
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleEventResizeStart(e, item)}
                    style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
                      cursor: 'ns-resize', borderRadius: '0 0 5px 5px',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <AddEventModal
          startTime={newStartTime}
          endTime={newEndTime}
          onConfirm={handleAddEvent}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
