import type { ScheduleItem } from '../../services/scheduleService';

const CATEGORY_CHART_META: Record<string, { label: string; color: string }> = {
  Work:       { label: '집중 작업', color: '#3b82f6' },
  Meeting:    { label: '미팅',     color: '#8b5cf6' },
  CodeReview: { label: '코드리뷰', color: '#10b981' },
  Rest:       { label: '휴식',     color: '#374151' },
  Personal:   { label: '개인',     color: '#f59e0b' },
  Other:      { label: '기타',     color: '#6b7280' },
};

interface ChartSegment { label: string; pct: number; color: string; hours: string; }

function DonutChart({ segments, totalHours }: { segments: ChartSegment[]; totalHours: string }) {
  const size = 100;
  const r = 34;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((item) => {
    const dash = (item.pct / 100) * circumference;
    const gap = circumference - dash;
    const arc = { ...item, dash, gap, offset };
    offset += dash;
    return arc;
  });
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {arcs.length > 0 ? arcs.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
            strokeWidth={12} strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.offset} />
        )) : (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2a3a" strokeWidth={12} />
        )}
        <circle cx={cx} cy={cy} r={24} fill="#0d1829" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}>{totalHours}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#6b7280" fontSize="7"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}>총 일정</text>
      </svg>
      {arcs.length > 0 && (
        <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1">
          {arcs.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-gray-400 text-[10px] flex-1 truncate">{item.label}</span>
              <span className="text-white text-[10px] font-medium">{item.hours}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function buildChartData(schedule: ScheduleItem[]) {
  if (schedule.length === 0) return { segments: [], totalHours: '0h', stats: { total: 0, meetings: 0, codeReviews: 0 } };
  const durations: Record<string, number> = {};
  schedule.forEach((item, i) => {
    const start = toMins(item.startTime);
    const end = i < schedule.length - 1 ? toMins(schedule[i + 1].startTime) : start + 60;
    const mins = Math.max(end - start, 30);
    durations[item.category] = (durations[item.category] ?? 0) + mins;
  });
  const totalMins = Object.values(durations).reduce((a, b) => a + b, 0);
  const totalHours = `${(totalMins / 60).toFixed(1)}h`;
  const segments: ChartSegment[] = Object.entries(durations).map(([cat, mins]) => ({
    label: CATEGORY_CHART_META[cat]?.label ?? cat,
    pct: Math.round((mins / totalMins) * 100),
    color: CATEGORY_CHART_META[cat]?.color ?? '#6b7280',
    hours: `${(mins / 60).toFixed(1)}h`,
  }));
  return {
    segments,
    totalHours,
    stats: {
      total: schedule.length,
      meetings: schedule.filter((s) => s.category === 'Meeting').length,
      codeReviews: schedule.filter((s) => s.category === 'CodeReview').length,
    },
  };
}

interface Props {
  schedule: ScheduleItem[];
  scheduleError: boolean;
  onRetry: () => void;
}

export function TimeAnalysisPanel({ schedule, scheduleError, onRetry }: Props) {
  const chartData = buildChartData(schedule);

  return (
    <div className="rounded-xl p-3" style={{ background: '#0d1829', border: '1px solid #1a2a3a' }}>
      <div style={{
        color: 'rgba(235,235,245,0.35)',
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        marginBottom: 12,
      }}>시간 분석</div>
      {scheduleError ? (
        <div className="text-center py-4">
          <div className="text-red-400 text-[10px] mb-2">일정을 불러오지 못했습니다.</div>
          <button onClick={onRetry} className="text-[10px] text-blue-400 hover:text-blue-300 underline">재시도</button>
        </div>
      ) : schedule.length === 0 ? (
        <div className="text-gray-700 text-[10px] text-center py-4">오늘 일정이 없습니다.</div>
      ) : (
        <>
          <DonutChart segments={chartData.segments} totalHours={chartData.totalHours} />
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {[
              { label: '총 일정', val: `${chartData.stats.total}개` },
              { label: '예상 시간', val: chartData.totalHours },
              { label: '미팅', val: `${chartData.stats.meetings}건` },
              { label: '코드리뷰', val: `${chartData.stats.codeReviews}건` },
            ].map((s) => (
              <div key={s.label} className="rounded-lg p-2" style={{ background: '#0a1422' }}>
                <div className="text-gray-600 text-[9px]">{s.label}</div>
                <div className="text-white font-bold text-xs mt-0.5">{s.val}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
