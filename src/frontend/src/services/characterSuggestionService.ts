import type { ScheduleItem } from './scheduleService';

const BASE = 'http://localhost:5050/api/conversations';

// One shared session for character suggestions
let sessionId: string | null = null;

async function getSession(): Promise<string> {
  if (sessionId) return sessionId;
  const res = await fetch(BASE, { method: 'POST' });
  if (!res.ok) throw new Error('session create failed');
  const json = await res.json();
  sessionId = json.data.id as string;
  return sessionId;
}

export async function getLLMSuggestion(
  name: string,
  role: string,
  context: { schedules: ScheduleItem[]; memoryCount: number },
): Promise<string> {
  const sid = await getSession();

  const scheduleText = context.schedules.length > 0
    ? context.schedules.slice(0, 2).map(s => s.title).join(', ')
    : '없음';

  const prompt = `[캐릭터 역할극] 당신은 "${name}"이며, ${role}입니다. ` +
    `오늘 예정된 일정: ${scheduleText}. 저장된 기억 수: ${context.memoryCount}개. ` +
    `지금 주인님에게 자연스럽게 한 문장만 건네세요. ` +
    `${role}답게, 따뜻하고 실질적인 도움이 되는 말로. 따옴표 없이 순수 텍스트로.`;

  const res = await fetch(`${BASE}/${sid}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: prompt }),
  });
  if (!res.ok) throw new Error('message failed');
  const json = await res.json();
  return (json.data?.content as string) ?? '';
}
