import { useState } from 'react';
import {
  useCustomCharacters, addCustomCharacter, removeCustomCharacter,
  MAX_CUSTOM,
} from '../../stores/characterStore';
import { AIVIS_CHARACTER, DEFAULT_CHARACTERS, COLOR_PRESETS } from '../../components/characters/CharacterConfig';
import { CharacterPreview } from '../../components/characters/FloatingCharacter';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

// Elevated list item on top of the bg-2 settings section.
const itemStyle: React.CSSProperties = {
  background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)',
};

export function CharacterSection() {
  const customChars = useCustomCharacters();
  const [showAddChar, setShowAddChar] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('');
  const [newCharGender, setNewCharGender] = useState<'male' | 'female'>('male');
  const [newCharColorIdx, setNewCharColorIdx] = useState(0);

  return (
    <>
      {/* 기본 캐릭터 */}
      <div className="mb-3">
        <div style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 8 }}>기본 비서 (변경 불가)</div>
        <div className="flex flex-col gap-2">
          {/* AIVIS 호스트 */}
          <div className="flex items-center gap-2 px-3 py-2" style={itemStyle}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: AIVIS_CHARACTER.primaryColor, animation: 'live-dot 2s var(--ease) infinite' }} />
            <div className="flex-1">
              <div style={{ color: 'var(--text-1)', fontSize: 11, fontWeight: 500 }}>{AIVIS_CHARACTER.name}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 9 }}>{AIVIS_CHARACTER.role} · 좌측 홀로그램으로 발화</div>
            </div>
            <span className="ui-badge ui-badge-accent" style={{ height: 18, fontSize: 9, padding: '0 6px' }}>HOST</span>
          </div>
          <div className="flex gap-2">
          {DEFAULT_CHARACTERS.map(c => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 flex-1" style={itemStyle}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.primaryColor }} />
              <div>
                <div style={{ color: 'var(--text-1)', fontSize: 11, fontWeight: 500 }}>{c.name}</div>
                <div style={{ color: 'var(--text-3)', fontSize: 9 }}>{c.role}</div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* 커스텀 캐릭터 목록 */}
      {customChars.length > 0 && (
        <div className="mb-3">
          <div style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 8 }}>추가된 비서</div>
          <div className="space-y-1.5">
            {customChars.map(c => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2" style={itemStyle}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.primaryColor }} />
                <div className="flex-1 min-w-0">
                  <span style={{ color: 'var(--text-1)', fontSize: 11, fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 9, marginLeft: 8 }}>{c.role}</span>
                </div>
                <button
                  onClick={() => removeCustomCharacter(c.id)}
                  style={{ color: 'var(--text-3)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer' }}
                  className="hover:!text-[var(--danger)] transition-colors"
                >삭제</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추가 버튼 / 폼 */}
      {customChars.length < MAX_CUSTOM ? (
        showAddChar ? (
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', padding: 12 }} className="space-y-2">
            <div style={{ color: 'var(--text-2)', fontSize: 10, marginBottom: 4 }}>새 비서 추가 ({customChars.length}/{MAX_CUSTOM})</div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="text"
                placeholder="이름 (예: Ms. Lee)"
                value={newCharName}
                onChange={e => setNewCharName(e.target.value)}
                style={{ height: 32, fontSize: 13 }}
              />
              <Input
                type="text"
                placeholder="역할 (예: CFO)"
                value={newCharRole}
                onChange={e => setNewCharRole(e.target.value)}
                style={{ height: 32, fontSize: 13 }}
              />
            </div>
            {/* 성별 선택 */}
            <div className="flex gap-2">
              {(['male', 'female'] as const).map(g => {
                const active = newCharGender === g;
                return (
                  <button
                    key={g}
                    onClick={() => setNewCharGender(g)}
                    style={{
                      flex: 1, fontSize: 12, height: 32, borderRadius: 'var(--r-sm)',
                      background: active ? 'var(--accent-bg)' : 'var(--bg-sunken)',
                      border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-1)'}`,
                      color: active ? 'var(--accent)' : 'var(--text-2)',
                      cursor: 'pointer', transition: 'background var(--dur-2) var(--ease), border-color var(--dur-2) var(--ease)',
                    }}
                  >
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                );
              })}
            </div>
            {/* 색상 선택 */}
            <div>
              <div style={{ color: 'var(--text-3)', fontSize: 9, marginBottom: 6 }}>색상</div>
              <div className="flex gap-2">
                {COLOR_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setNewCharColorIdx(i)}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{
                      background: p.primary,
                      boxShadow: newCharColorIdx === i ? '0 0 0 2px var(--bg-3), 0 0 0 4px var(--text-1)' : 'none',
                    }}
                    title={p.label}
                    aria-label={`색상 ${p.label}`}
                  />
                ))}
              </div>
            </div>

            {/* 캐릭터 미리보기 */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '12px 0 4px',
              borderTop: '1px solid var(--border-1)',
            }}>
              <div style={{ color: 'var(--text-3)', fontSize: 9, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                미리보기
              </div>
              <div style={{
                background: 'var(--bg-sunken)', borderRadius: 'var(--r-md)',
                padding: '12px 24px',
                border: '1px solid var(--border-1)',
              }}>
                <CharacterPreview
                  gender={newCharGender}
                  primaryColor={COLOR_PRESETS[newCharColorIdx].primary}
                  hairColor={COLOR_PRESETS[newCharColorIdx].hair}
                  skinColor="#fde8c8"
                  glowColor={COLOR_PRESETS[newCharColorIdx].glow}
                  uid={`settings-preview-${newCharGender}-${newCharColorIdx}`}
                  scale={0.75}
                />
              </div>
              {newCharName && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ color: 'var(--text-1)', fontSize: 11, fontWeight: 600 }}>{newCharName}</span>
                  {newCharRole && <span style={{ color: 'var(--text-3)', fontSize: 9 }}>{newCharRole}</span>}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  if (!newCharName.trim()) return;
                  addCustomCharacter(newCharName.trim(), newCharRole.trim() || '비서', newCharGender, newCharColorIdx);
                  setNewCharName(''); setNewCharRole(''); setNewCharGender('male'); setNewCharColorIdx(0);
                  setShowAddChar(false);
                }}
                disabled={!newCharName.trim()}
              >
                추가하기
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowAddChar(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddChar(true)}
            style={{
              width: '100%', fontSize: 11, height: 36, borderRadius: 'var(--r-sm)',
              color: 'var(--accent)', background: 'var(--bg-3)',
              border: '1px dashed var(--border-2)', cursor: 'pointer',
              transition: 'border-color var(--dur-2) var(--ease)',
            }}
          >
            + 비서 추가하기 ({customChars.length}/{MAX_CUSTOM})
          </button>
        )
      ) : (
        <div style={{ color: 'var(--text-3)', fontSize: 10, textAlign: 'center', padding: '8px 0' }}>
          최대 {MAX_CUSTOM}명까지 추가할 수 있어요. 삭제 후 새로 추가 가능합니다.
        </div>
      )}
    </>
  );
}
