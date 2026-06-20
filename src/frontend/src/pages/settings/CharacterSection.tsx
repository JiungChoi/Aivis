import { useState } from 'react';
import {
  useCustomCharacters, addCustomCharacter, removeCustomCharacter,
  MAX_CUSTOM,
} from '../../stores/characterStore';
import { AIVIS_CHARACTER, DEFAULT_CHARACTERS, COLOR_PRESETS } from '../../components/characters/CharacterConfig';
import { CharacterPreview } from '../../components/characters/FloatingCharacter';

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
        <div className="text-gray-500 text-[10px] mb-2">기본 비서 (변경 불가)</div>
        <div className="flex flex-col gap-2">
          {/* AIVIS 호스트 */}
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: '#1c1c1e', border: `1px solid ${AIVIS_CHARACTER.accentColor}50` }}>
            <div className="w-4 h-4 rounded-full flex-shrink-0 animate-pulse"
              style={{ background: AIVIS_CHARACTER.primaryColor, boxShadow: `0 0 6px ${AIVIS_CHARACTER.primaryColor}` }} />
            <div className="flex-1">
              <div className="text-white text-[11px] font-medium">{AIVIS_CHARACTER.name}</div>
              <div className="text-gray-600 text-[9px]">{AIVIS_CHARACTER.role} · 좌측 홀로그램으로 발화</div>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full"
              style={{ background: `${AIVIS_CHARACTER.accentColor}20`, color: AIVIS_CHARACTER.accentColor }}>
              HOST
            </span>
          </div>
          <div className="flex gap-2">
          {DEFAULT_CHARACTERS.map(c => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1"
              style={{ background: '#1c1c1e', border: `1px solid ${c.accentColor}40` }}>
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.primaryColor }} />
              <div>
                <div className="text-white text-[11px] font-medium">{c.name}</div>
                <div className="text-gray-600 text-[9px]">{c.role}</div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* 커스텀 캐릭터 목록 */}
      {customChars.length > 0 && (
        <div className="mb-3">
          <div className="text-gray-500 text-[10px] mb-2">추가된 비서</div>
          <div className="space-y-1.5">
            {customChars.map(c => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: '#1c1c1e', border: `1px solid ${c.accentColor}40` }}>
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.primaryColor }} />
                <div className="flex-1 min-w-0">
                  <span className="text-white text-[11px] font-medium">{c.name}</span>
                  <span className="text-gray-600 text-[9px] ml-2">{c.role}</span>
                </div>
                <button
                  onClick={() => removeCustomCharacter(c.id)}
                  className="text-gray-700 hover:text-red-400 transition-colors text-[10px]"
                >삭제</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추가 버튼 / 폼 */}
      {customChars.length < MAX_CUSTOM ? (
        showAddChar ? (
          <div className="rounded-xl p-3 space-y-2" style={{ background: '#1c1c1e', border: '1px solid #1e3a5a' }}>
            <div className="text-gray-400 text-[10px] mb-1">새 비서 추가 ({customChars.length}/{MAX_CUSTOM})</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="이름 (예: Ms. Lee)"
                value={newCharName}
                onChange={e => setNewCharName(e.target.value)}
                className="rounded-lg text-[11px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder-gray-700"
                style={{ background: '#000000', border: '1px solid rgba(84,84,88,0.4)', color: '#d1d5db' }}
              />
              <input
                type="text"
                placeholder="역할 (예: CFO)"
                value={newCharRole}
                onChange={e => setNewCharRole(e.target.value)}
                className="rounded-lg text-[11px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder-gray-700"
                style={{ background: '#000000', border: '1px solid rgba(84,84,88,0.4)', color: '#d1d5db' }}
              />
            </div>
            {/* 성별 선택 */}
            <div className="flex gap-2">
              {(['male', 'female'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setNewCharGender(g)}
                  className={`flex-1 text-[10px] py-1.5 rounded-lg transition-colors ${
                    newCharGender === g
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={{ background: newCharGender === g ? undefined : '#000000', border: '1px solid rgba(84,84,88,0.4)' }}
                >
                  {g === 'male' ? '남성' : '여성'}
                </button>
              ))}
            </div>
            {/* 색상 선택 */}
            <div>
              <div className="text-gray-600 text-[9px] mb-1.5">색상</div>
              <div className="flex gap-2">
                {COLOR_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setNewCharColorIdx(i)}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{
                      background: p.primary,
                      boxShadow: newCharColorIdx === i ? `0 0 0 2px #fff, 0 0 0 4px ${p.primary}` : 'none',
                    }}
                    title={p.label}
                  />
                ))}
              </div>
            </div>

            {/* 캐릭터 미리보기 */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 0 4px',
              borderTop: '1px solid rgba(84,84,88,0.2)',
            }}>
              <div style={{ color: 'rgba(235,235,245,0.35)', fontSize: 9, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                미리보기
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                padding: '12px 24px',
                border: `1px solid ${COLOR_PRESETS[newCharColorIdx].primary}30`,
                boxShadow: `0 4px 20px ${COLOR_PRESETS[newCharColorIdx].glow}`,
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
                  <span style={{ color: COLOR_PRESETS[newCharColorIdx].accent, fontSize: 11, fontWeight: 700 }}>{newCharName}</span>
                  {newCharRole && <span style={{ color: 'rgba(235,235,245,0.3)', fontSize: 9 }}>{newCharRole}</span>}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  if (!newCharName.trim()) return;
                  addCustomCharacter(newCharName.trim(), newCharRole.trim() || '비서', newCharGender, newCharColorIdx);
                  setNewCharName(''); setNewCharRole(''); setNewCharGender('male'); setNewCharColorIdx(0);
                  setShowAddChar(false);
                }}
                disabled={!newCharName.trim()}
                className="flex-1 text-[11px] py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium transition-colors"
              >
                추가하기
              </button>
              <button
                onClick={() => setShowAddChar(false)}
                className="text-[11px] px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
                style={{ background: '#000000', border: '1px solid rgba(84,84,88,0.4)' }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddChar(true)}
            className="w-full text-[11px] py-2 rounded-lg text-blue-400 hover:text-blue-300 transition-colors"
            style={{ background: '#1c1c1e', border: '1px dashed #1e3a5a' }}
          >
            + 비서 추가하기 ({customChars.length}/{MAX_CUSTOM})
          </button>
        )
      ) : (
        <div className="text-gray-600 text-[10px] text-center py-2">
          최대 {MAX_CUSTOM}명까지 추가할 수 있어요. 삭제 후 새로 추가 가능합니다.
        </div>
      )}
    </>
  );
}
