import type { ScheduleItem } from '../../services/scheduleService';

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  gender: 'male' | 'female';
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  hairColor: string;
  skinColor: string;
  isCustom?: boolean;
  isHost?: boolean;       // AIVIS — speaks via hologram, not as FloatingCharacter
  suggestionOffsetMs: number;
}

// ── Suggestion generation ─────────────────────────────────────

const PARK_FALLBACKS = [
  '코드 리뷰 타이밍 같은데요. 확인해볼까요?',
  '빌드 한번 돌려보셨나요? 배포 전 체크 필수예요.',
  '오늘 개발 목표 정해두셨나요?',
  '기술부채 먼저 처리하는 게 장기적으로 이득이에요.',
  '테스트 코드 통과됐는지 확인해보세요.',
  '잠깐 커밋 정리하는 거 어때요?',
];

const KANG_FALLBACKS = [
  '오늘 하루 잘 가고 있나요? 도움 필요하면 말씀해요!',
  '지금 가장 중요한 일이 뭔지 한번 정리해봐요.',
  '잠깐 쉬는 타이밍 아닌가요? 🙂',
  '이번 주 목표 달성 잘 되고 있나요?',
  '새로운 아이디어 있으면 언제든 대화해요!',
  '할 일 목록 업데이트 해볼까요?',
];

const AIVIS_SUGGESTIONS = [
  '안녕하세요. 오늘 도움이 필요한 일이 있으시면 말씀해 주세요.',
  '시스템 정상 작동 중입니다. 무엇을 도와드릴까요?',
  '대화창에서 저에게 직접 말씀하셔도 됩니다.',
  '일정, 메모리, 노트 — 언제든지 물어보세요.',
  '새로운 명령을 기다리고 있어요.',
];

const CUSTOM_FALLBACKS = [
  '안녕하세요! 도움이 필요하면 말씀해 주세요.',
  '오늘도 좋은 하루 되세요!',
  '뭔가 필요한 게 있으면 언제든지요.',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nextSchedule(schedules: ScheduleItem[]): ScheduleItem | undefined {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  return schedules.find(s => {
    const [h, m] = s.startTime.split(':').map(Number);
    return h * 60 + m >= currentMins;
  });
}

export function buildSuggestion(
  character: CharacterDef,
  todaySchedules: ScheduleItem[],
  memoryCount: number,
): string {
  const next = nextSchedule(todaySchedules);

  if (character.id === 'aivis') {
    if (todaySchedules.length > 0) {
      const next = nextSchedule(todaySchedules);
      return next
        ? `${next.startTime}에 '${next.title}' 예정입니다.`
        : `오늘 일정 ${todaySchedules.length}건 확인됨. 시스템 준비 완료.`;
    }
    return pick(AIVIS_SUGGESTIONS);
  }

  if (character.id === 'park') {
    if (next) {
      return `${next.startTime}에 '${next.title}' 있어요. 준비 자료 확인해두세요!`;
    }
    if (todaySchedules.length > 0) {
      return `오늘 일정 ${todaySchedules.length}개 모두 완료됐네요. 집중 개발 타임이에요!`;
    }
    return pick(PARK_FALLBACKS);
  }

  if (character.id === 'kang') {
    if (memoryCount > 10) {
      return `비서가 벌써 ${memoryCount}가지를 기억하고 있어요. AI 기억 지도 확인해보세요!`;
    }
    if (next) {
      return `${next.startTime} ${next.title} 전에 잠깐 준비 시간 가져보는 건 어때요?`;
    }
    return pick(KANG_FALLBACKS);
  }

  // Custom character
  if (next) {
    return `${next.startTime}에 '${next.title}' 예정이에요!`;
  }
  return pick(CUSTOM_FALLBACKS);
}

// ── Default characters ────────────────────────────────────────

export const AIVIS_CHARACTER: CharacterDef = {
  id: 'aivis',
  name: 'AIVIS',
  role: '호스트 AI',
  gender: 'male',
  primaryColor: '#00cfff',
  accentColor: '#4af4ff',
  glowColor: '#00cfff40',
  hairColor: '#003344',
  skinColor: '#00cfff',
  isHost: true,
  suggestionOffsetMs: 45_000,
};

export const DEFAULT_CHARACTERS: CharacterDef[] = [
  {
    id: 'park',
    name: 'Mr. Park',
    role: 'CTO',
    gender: 'male',
    primaryColor: '#1d4ed8',
    accentColor: '#60a5fa',
    glowColor: '#3b82f640',
    hairColor: '#1e293b',
    skinColor: '#fde8c8',
    suggestionOffsetMs: 0,
  },
  {
    id: 'kang',
    name: 'Ms. Kang',
    role: 'CPO',
    gender: 'female',
    primaryColor: '#7c3aed',
    accentColor: '#c084fc',
    glowColor: '#a855f740',
    hairColor: '#8a9ab0',
    skinColor: '#fde8c8',
    suggestionOffsetMs: 90_000,
  },
];

// ── Color presets for custom characters ──────────────────────

export const COLOR_PRESETS = [
  { primary: '#059669', accent: '#34d399', glow: '#10b98140', hair: '#1e293b', label: '초록' },
  { primary: '#dc2626', accent: '#f87171', glow: '#ef444440', hair: '#1e293b', label: '빨강' },
  { primary: '#d97706', accent: '#fbbf24', glow: '#f59e0b40', hair: '#92400e', label: '노랑' },
  { primary: '#0891b2', accent: '#22d3ee', glow: '#06b6d440', hair: '#1e293b', label: '하늘' },
  { primary: '#be185d', accent: '#f472b6', glow: '#ec489940', hair: '#831843', label: '분홍' },
];
