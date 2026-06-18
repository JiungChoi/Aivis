import { useState, useEffect } from 'react';
import { obsidianService, type ObsidianSettings } from '../services/obsidianService';
import { userService } from '../services/userService';
import {
  useCustomCharacters, addCustomCharacter, removeCustomCharacter,
  MAX_CUSTOM,
} from '../stores/characterStore';
import { AIVIS_CHARACTER, DEFAULT_CHARACTERS, COLOR_PRESETS } from '../components/characters/CharacterConfig';
import { API_BASE } from '../config';
import { CharacterPreview } from '../components/characters/FloatingCharacter';

const PROFILE_CACHE_KEY = 'aivis_user_profile';
function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}'); } catch { return {}; }
}

// iOS grouped settings section: label above card, optional footer below
function SettingSection({
  title, footer, children,
}: { title?: string; footer?: string; children: React.ReactNode }) {
  return (
    <div>
      {title && (
        <div style={{
          color: 'rgba(235,235,245,0.35)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          padding: '0 4px', marginBottom: 6,
        }}>
          {title}
        </div>
      )}
      <div style={{
        borderRadius: 10, overflow: 'hidden',
        background: '#1c1c1e',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {children}
      </div>
      {footer && (
        <div style={{ color: 'rgba(235,235,245,0.3)', fontSize: 11, padding: '5px 4px 0', lineHeight: 1.5 }}>
          {footer}
        </div>
      )}
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid rgba(84,84,88,0.22)',
    }}
    className="last:!border-0">
      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <div style={{ color: 'rgba(235,235,245,0.88)', fontSize: 13 }}>{label}</div>
        {description && <div style={{ color: 'rgba(235,235,245,0.35)', fontSize: 11, marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// iOS-style toggle
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        position: 'relative', width: 44, height: 26, borderRadius: 13,
        background: value ? '#34c759' : 'rgba(120,120,128,0.32)',
        border: 'none', cursor: 'pointer', padding: 0,
        transition: 'background 0.25s ease',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2, left: value ? 20 : 2,
        width: 22, height: 22, borderRadius: 11,
        background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        transition: 'left 0.25s ease',
        display: 'block',
      }} />
    </button>
  );
}

export default function SettingsPage() {
  const [obsidian, setObsidian] = useState<ObsidianSettings>({ vaultPath: '', isEnabled: false });
  const [vaultInput, setVaultInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // User profile
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [profileLanguage, setProfileLanguage] = useState('Korean');
  const [profileTone, setProfileTone] = useState('casual');
  const [profileSaved, setProfileSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    // Load from backend first, fall back to localStorage
    userService.getProfile()
      .then(p => {
        setProfileName(p.name || '');
        setProfileEmail(p.email || '');
        setProfileLanguage(p.language || 'Korean');
        setProfileTone(p.tone || 'casual');
        const cached = loadProfile();
        setProfileRole(cached.role || '');
      })
      .catch(() => {
        const p = loadProfile();
        setProfileName(p.name || '');
        setProfileEmail(p.email || '');
        setProfileRole(p.role || '');
        setProfileLanguage(p.language || 'Korean');
        setProfileTone(p.tone || 'casual');
      });
  }, []);

  async function handleSaveProfile() {
    if (savingProfile) return;
    setSavingProfile(true);
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      name: profileName, email: profileEmail, role: profileRole,
      language: profileLanguage, tone: profileTone,
    }));
    window.dispatchEvent(new CustomEvent('aivis:profile-updated'));
    try {
      await userService.updateProfile({
        name: profileName, email: profileEmail,
        language: profileLanguage, tone: profileTone,
      });
    } catch { /* offline fallback: profile saved locally */ }
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  // Character management
  const customChars = useCustomCharacters();
  const [showAddChar, setShowAddChar] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('');
  const [newCharGender, setNewCharGender] = useState<'male' | 'female'>('male');
  const [newCharColorIdx, setNewCharColorIdx] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    obsidianService.getSettings().then(s => {
      setObsidian(s);
      setVaultInput(s.vaultPath);
    }).catch(console.error);
  }, []);

  async function handleSaveObsidian() {
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await obsidianService.updateSettings(vaultInput.trim(), obsidian.isEnabled);
      setObsidian(updated);
      setSaveMsg('✓ 저장됨');
    } catch {
      setSaveMsg('저장 실패');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function handleToggleEnabled(enabled: boolean) {
    const updated = await obsidianService.updateSettings(obsidian.vaultPath, enabled);
    setObsidian(updated);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const result = await obsidianService.syncAll();
      setSyncMsg(`✓ ${result.syncedCount}개 노트 동기화 완료`);
    } catch {
      setSyncMsg('동기화 실패');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#000000' }}>
      {/* ── 헤더 ── */}
      <div className="flex items-center px-6 flex-shrink-0"
        style={{
          height: 52,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: '#000000',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 4px 16px rgba(0,0,0,0.3)',
        }}>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>설정</div>
          <div style={{ color: 'rgba(235,235,245,0.25)', fontSize: 11, marginTop: 1 }}>AIVIS 환경 설정</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">

        {/* 사용자 프로필 */}
        <SettingSection title="사용자 프로필" footer="이름과 역할은 AI 비서들이 맥락 파악에 활용합니다.">
          <div style={{ padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Avatar placeholder */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(10,132,255,0.35)',
              fontSize: 22, fontWeight: 700, color: 'white',
            }}>
              {profileName ? profileName.charAt(0).toUpperCase() : '?'}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                placeholder="이름 (예: 최치융)"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                style={{
                  width: '100%', borderRadius: 8, padding: '7px 10px', fontSize: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(84,84,88,0.4)',
                  color: '#e2e8f0', outline: 'none',
                }}
              />
              <input
                type="text"
                placeholder="역할/직책 (예: CEO)"
                value={profileRole}
                onChange={e => setProfileRole(e.target.value)}
                style={{
                  width: '100%', borderRadius: 8, padding: '7px 10px', fontSize: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(84,84,88,0.4)',
                  color: '#e2e8f0', outline: 'none',
                }}
              />
              <input
                type="email"
                placeholder="이메일"
                value={profileEmail}
                onChange={e => setProfileEmail(e.target.value)}
                style={{
                  width: '100%', borderRadius: 8, padding: '7px 10px', fontSize: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(84,84,88,0.4)',
                  color: '#e2e8f0', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={profileLanguage}
                  onChange={e => setProfileLanguage(e.target.value)}
                  style={{
                    flex: 1, borderRadius: 8, padding: '7px 10px', fontSize: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(84,84,88,0.4)',
                    color: '#e2e8f0', outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="Korean">한국어</option>
                  <option value="English">English</option>
                  <option value="Japanese">日本語</option>
                </select>
                <select
                  value={profileTone}
                  onChange={e => setProfileTone(e.target.value)}
                  style={{
                    flex: 1, borderRadius: 8, padding: '7px 10px', fontSize: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(84,84,88,0.4)',
                    color: '#e2e8f0', outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="casual">캐주얼 (반말)</option>
                  <option value="formal">격식체 (존댓말)</option>
                  <option value="professional">전문적</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  style={{
                    padding: '6px 16px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: 'linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)',
                    color: 'white', border: 'none',
                    cursor: savingProfile ? 'not-allowed' : 'pointer',
                    opacity: savingProfile ? 0.5 : 1,
                    boxShadow: '0 2px 8px rgba(10,132,255,0.35)',
                  }}
                >
                  {savingProfile ? '저장 중...' : '저장'}
                </button>
                {profileSaved && (
                  <span style={{ fontSize: 11, color: '#34c759' }}>✓ 저장됨</span>
                )}
              </div>
            </div>
          </div>
        </SettingSection>

        {/* AI 모델 */}
        <SettingSection title="AI 모델" footer="LLM 어댑터는 백엔드 설정 파일에서 교체할 수 있습니다.">
          <SettingRow label="현재 모델" description="로컬 Ollama 서버 사용 중">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(52,199,89,0.15)', color: '#34c759' }}>연결됨</span>
              <span style={{ color: 'rgba(235,235,245,0.45)', fontSize: 11 }}>Ollama Local</span>
            </div>
          </SettingRow>
          <SettingRow label="API 엔드포인트" description="Ollama 서버 주소">
            <span style={{ color: 'rgba(235,235,245,0.4)', fontSize: 11, fontFamily: 'monospace' }}>http://host:11434</span>
          </SettingRow>
        </SettingSection>

        {/* Obsidian 연동 */}
        <SettingSection title="Obsidian 연동" footer="노트가 자동으로 vault에 저장됩니다. Obsidian 앱이 설치되어 있어야 합니다.">
          <SettingRow label="연동 활성화" description="노트를 Obsidian vault에 자동 저장">
            <Toggle value={obsidian.isEnabled} onChange={handleToggleEnabled} />
          </SettingRow>
          <div className="py-3 border-b border-[rgba(84,84,88,0.3)]">
            <div className="text-gray-300 text-[12px] font-medium mb-2">Vault 경로</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={vaultInput}
                onChange={e => setVaultInput(e.target.value)}
                placeholder="/path/to/your/vault"
                className="flex-1 rounded-lg text-[11px] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder-gray-700 font-mono"
                style={{ background: '#1c1c1e', border: '1px solid rgba(84,84,88,0.4)', color: '#d1d5db' }}
              />
              <button
                onClick={handleSaveObsidian}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[11px] font-medium transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
            {saveMsg && (
              <div className={`mt-1.5 text-[10px] ${saveMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{saveMsg}</div>
            )}
          </div>
          <div className="py-3">
            <div className="text-gray-300 text-[12px] font-medium mb-1">노트 동기화</div>
            <div className="text-gray-600 text-[10px] mb-2">저장된 모든 노트를 Obsidian vault에 동기화합니다.</div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSync}
                disabled={syncing || !obsidian.isEnabled}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-medium transition-colors"
              >
                {syncing ? '동기화 중...' : '전체 동기화'}
              </button>
              {syncMsg && (
                <span className={`text-[10px] ${syncMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{syncMsg}</span>
              )}
            </div>
          </div>
        </SettingSection>

        {/* 비서 캐릭터 */}
        <SettingSection title="비서 캐릭터" footer={`최대 ${MAX_CUSTOM}명의 커스텀 비서를 추가할 수 있습니다.`}>
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
        </SettingSection>

        {/* 앱 정보 */}
        <SettingSection title="앱 정보">
          <SettingRow label="버전">
            <span className="text-gray-500 text-[11px]">v0.1.0-alpha</span>
          </SettingRow>
          <SettingRow label="빌드 환경">
            <span className="text-gray-500 text-[11px]">Docker / Local</span>
          </SettingRow>
          <SettingRow label="백엔드">
            <span className="text-gray-500 text-[11px] font-mono">{API_BASE.replace(/^https?:\/\//, '')}</span>
          </SettingRow>
        </SettingSection>
      </div>
      </div>
    </div>
  );
}
