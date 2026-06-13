import { useState, useEffect, useRef } from 'react';
import { scheduleService, type ScheduleItem, type ScheduleCategory } from '../../services/scheduleService';
import { conversationService } from '../../services/conversationService';
import { SLOT_H } from './dashboardConstants';
import { categoryBlock } from '../../theme/categories';
import { toMins, minsToTimeStr, todayISO } from '../../utils/time';
import { toast } from '../../stores/toastStore';

interface AiScheduleSuggestion {
  title: string;
  startTime: string;
  endTime: string;
  category: ScheduleCategory;
}

function eventEndMins(item: ScheduleItem) {
  return item.endTime ? toMins(item.endTime) : toMins(item.startTime) + 60;
}

/**
 * Calendar-style overlap layout: groups time-overlapping events into clusters
 * and assigns each a column so concurrent events render side-by-side.
 * Returns id → { col, cols } where width = 1/cols and left offset = col/cols.
 */
function computeOverlapLayout(items: ScheduleItem[]): Map<string, { col: number; cols: number }> {
  const layout = new Map<string, { col: number; cols: number }>();
  const sorted = [...items].sort(
    (a, b) => toMins(a.startTime) - toMins(b.startTime) || eventEndMins(a) - eventEndMins(b),
  );

  let cluster: ScheduleItem[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = []; // running end-time of each column
    for (const ev of cluster) {
      const s = toMins(ev.startTime);
      let col = colEnds.findIndex((end) => s >= end);
      if (col === -1) { col = colEnds.length; colEnds.push(0); }
      colEnds[col] = eventEndMins(ev);
      layout.set(ev.id, { col, cols: 0 }); // cols filled after cluster size known
    }
    const cols = colEnds.length;
    for (const ev of cluster) {
      const entry = layout.get(ev.id)!;
      entry.cols = cols;
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const ev of sorted) {
    const s = toMins(ev.startTime);
    if (cluster.length > 0 && s >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, eventEndMins(ev));
  }
  flush();

  return layout;
}

interface ScheduleTimelineProps {
  width: number;
  schedule: ScheduleItem[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  scheduleError: boolean;
  onRetry: () => void;
  nowMinutes: number;
  /** Remove a consumed suggestion from the AI suggestions panel (by index). */
  removeSuggestion: (index: number) => void;
  /** Ask the parent to open the add-event modal pre-filled with the given minute range. */
  onOpenAddModal: (startMins: number, endMins: number) => void;
}

export function ScheduleTimeline({
  width, schedule, setSchedule, scheduleError, onRetry, nowMinutes, removeSuggestion, onOpenAddModal,
}: ScheduleTimelineProps) {
  const col1Ref = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{
    id: string; startY: number; origEndMins: number; currentEndMins: number;
    date: string; startTime: string; title: string; category: ScheduleCategory; description?: string;
  } | null>(null);
  const dragCreateRef = useRef<{ startSlot: number; currentSlot: number } | null>(null);

  const [aiScheduleLoading, setAiScheduleLoading] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{ startSlot: number; currentSlot: number } | null>(null);
  const [draggingScheduleId, setDraggingScheduleId] = useState<string | null>(null);
  const [deleteZoneHover, setDeleteZoneHover] = useState(false);

  function scrollToNow() {
    if (!col1Ref.current) return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    col1Ref.current.scrollTo({
      top: Math.max(0, (mins / 30) * SLOT_H - 80),
      behavior: 'smooth',
    });
  }

  // Auto-scroll to the current time on mount
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
      toast.success('일정을 삭제했습니다');
    } catch {
      setSchedule(await scheduleService.getByDate(item.date));
      toast.error('삭제하지 못해 되돌렸습니다');
    }
  }

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
      removeSuggestion(index);
      toast.success('일정을 추가했습니다');
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
      toast.success('일정을 옮겼습니다');
    }
  }

  function openModalWithSlot(slotIndex: number) {
    const slotMins = slotIndex * 30;
    onOpenAddModal(slotMins, Math.min(slotMins + 60, 24 * 60));
  }

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
      toast.success(`AI가 일정 ${suggestions.length}개를 추가했습니다`);

      // Clean up temp session
      await conversationService.deleteSession(session.id);
    } catch (err) {
      console.error('AI 일정 추천 실패:', err);
      toast.error('AI 일정 추천에 실패했습니다');
    } finally {
      setAiScheduleLoading(false);
    }
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
        onOpenAddModal(startMins, endMins);
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

  const eventLayout = computeOverlapLayout(schedule);

  return (
    <div
      ref={col1Ref}
      className="overflow-y-auto flex-shrink-0"
      // height:100% + minHeight:0 ties the column to the row height so the 24h
      // timeline (1344px) scrolls internally instead of overflowing & being clipped.
      style={{ width, height: '100%', minHeight: 0, borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}
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

          {/* Jump to current time */}
          <button
            onClick={scrollToNow}
            title="현재 시각으로 스크롤"
            aria-label="현재 시각으로 스크롤"
            style={{
              width: 22, height: 22, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Feature 4: + 버튼 → 모달 열기 */}
          <button
            onClick={() => {
              const base = nowMinutes - (nowMinutes % 30);
              onOpenAddModal(base, Math.min(base + 60, 24 * 60));
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
          const colors = categoryBlock(item.category);
          // Side-by-side layout for overlapping events (band spans left:30 → right:4)
          const { col, cols } = eventLayout.get(item.id) ?? { col: 0, cols: 1 };
          const colWidth = `((100% - 34px) / ${cols})`;
          const leftCalc = `calc(30px + ${col} * ${colWidth})`;
          const widthCalc = `calc(${colWidth} - ${cols > 1 ? 3 : 4}px)`;
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
                top: topPx, left: leftCalc, width: widthCalc, height: heightPx,
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
            <button onClick={onRetry} style={{ fontSize: 10, color: '#64b5ff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>재시도</button>
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
  );
}
