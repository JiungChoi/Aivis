import { useState, useEffect } from 'react';
import { obsidianService, type ObsidianSettings } from '../services/obsidianService';
import { userService } from '../services/userService';
import { MAX_CUSTOM } from '../stores/characterStore';
import { API_BASE } from '../config';
import { CharacterSection } from './settings/CharacterSection';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const PROFILE_CACHE_KEY = 'aivis_user_profile';
function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}'); } catch { return {}; }
}

// Grouped settings section: uppercase label above a bordered card, optional footer below.
function SettingSection({
  title, footer, children,
}: { title?: string; footer?: string; children: React.ReactNode }) {
  return (
    <div>
      {title && (
        <div style={{
          color: 'var(--text-3)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          padding: '0 4px', marginBottom: 8,
        }}>
          {title}
        </div>
      )}
      <div style={{
        borderRadius: 'var(--r-md)', overflow: 'hidden',
        background: 'var(--bg-2)',
        border: '1px solid var(--border-1)',
      }}>
        {children}
      </div>
      {footer && (
        <div style={{ color: 'var(--text-3)', fontSize: 11, padding: '6px 4px 0', lineHeight: 1.5 }}>
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
      borderBottom: '1px solid var(--border-1)',
    }}
    className="last:!border-0">
      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <div style={{ color: 'var(--text-1)', fontSize: 13 }}>{label}</div>
        {description && <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// Switch: on = single accent, off = neutral track.
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      style={{
        position: 'relative', width: 44, height: 26, borderRadius: 'var(--r-full)',
        background: value ? 'var(--accent)' : 'rgba(255,255,255,0.14)',
        border: 'none', cursor: 'pointer', padding: 0,
        transition: 'background var(--dur-2) var(--ease)',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2, left: value ? 20 : 2,
        width: 22, height: 22, borderRadius: 'var(--r-full)',
        background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
        transition: 'left var(--dur-2) var(--ease)',
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
      setSaveMsg('저장됨');
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
      setSyncMsg(`${result.syncedCount}개 노트 동기화 완료`);
    } catch {
      setSyncMsg('동기화 실패');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-0)' }}>
      {/* ── 헤더 ── */}
      <div className="flex items-center px-6 flex-shrink-0"
        style={{
          height: 52,
          borderBottom: '1px solid var(--border-1)',
          background: 'var(--bg-1)',
        }}>
        <div>
          <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>설정</div>
          <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 1 }}>AIVIS 환경 설정</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">

        {/* 사용자 프로필 */}
        <SettingSection title="사용자 프로필" footer="이름과 역할은 AI 비서들이 맥락 파악에 활용합니다.">
          <div style={{ padding: '16px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Avatar initial — neutral surface, single accent glyph */}
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--r-full)', flexShrink: 0,
              background: 'var(--bg-3)',
              border: '1px solid var(--border-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 600, color: 'var(--accent)',
            }}>
              {profileName ? profileName.charAt(0).toUpperCase() : '?'}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Input
                type="text"
                placeholder="이름 (예: 최치융)"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
              />
              <Input
                type="text"
                placeholder="역할/직책 (예: CEO)"
                value={profileRole}
                onChange={e => setProfileRole(e.target.value)}
              />
              <Input
                type="email"
                placeholder="이메일"
                value={profileEmail}
                onChange={e => setProfileEmail(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Select value={profileLanguage} onChange={e => setProfileLanguage(e.target.value)}>
                    <option value="Korean">한국어</option>
                    <option value="English">English</option>
                    <option value="Japanese">日本語</option>
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <Select value={profileTone} onChange={e => setProfileTone(e.target.value)}>
                    <option value="casual">캐주얼 (반말)</option>
                    <option value="formal">격식체 (존댓말)</option>
                    <option value="professional">전문적</option>
                  </Select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Button variant="primary" size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? '저장 중...' : '저장'}
                </Button>
                {profileSaved && (
                  <span style={{ fontSize: 12, color: 'var(--ok)' }}>저장됨</span>
                )}
              </div>
            </div>
          </div>
        </SettingSection>

        {/* AI 모델 */}
        <SettingSection title="AI 모델" footer="LLM 어댑터는 백엔드 설정 파일에서 교체할 수 있습니다.">
          <SettingRow label="현재 모델" description="로컬 Ollama 서버 사용 중">
            <div className="flex items-center gap-2">
              <Badge tone="ok">연결됨</Badge>
              <span style={{ color: 'var(--text-2)', fontSize: 11 }}>Ollama Local</span>
            </div>
          </SettingRow>
          <SettingRow label="API 엔드포인트" description="Ollama 서버 주소">
            <span style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>http://host:11434</span>
          </SettingRow>
        </SettingSection>

        {/* Obsidian 연동 */}
        <SettingSection title="Obsidian 연동" footer="노트가 자동으로 vault에 저장됩니다. Obsidian 앱이 설치되어 있어야 합니다.">
          <SettingRow label="연동 활성화" description="노트를 Obsidian vault에 자동 저장">
            <Toggle value={obsidian.isEnabled} onChange={handleToggleEnabled} />
          </SettingRow>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)' }}>
            <div style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Vault 경로</div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={vaultInput}
                onChange={e => setVaultInput(e.target.value)}
                placeholder="/path/to/your/vault"
                className="flex-1"
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
              />
              <Button variant="primary" size="md" onClick={handleSaveObsidian} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
            {saveMsg && (
              <div style={{ marginTop: 8, fontSize: 11, color: saveMsg === '저장됨' ? 'var(--ok)' : 'var(--danger)' }}>{saveMsg}</div>
            )}
          </div>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>노트 동기화</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 10 }}>저장된 모든 노트를 Obsidian vault에 동기화합니다.</div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" onClick={handleSync} disabled={syncing || !obsidian.isEnabled}>
                {syncing ? '동기화 중...' : '전체 동기화'}
              </Button>
              {syncMsg && (
                <span style={{ fontSize: 11, color: syncMsg.includes('완료') ? 'var(--ok)' : 'var(--danger)' }}>{syncMsg}</span>
              )}
            </div>
          </div>
        </SettingSection>

        {/* 비서 캐릭터 */}
        <SettingSection title="비서 캐릭터" footer={`최대 ${MAX_CUSTOM}명의 커스텀 비서를 추가할 수 있습니다.`}>
          <div style={{ padding: 16 }}>
            <CharacterSection />
          </div>
        </SettingSection>

        {/* 앱 정보 */}
        <SettingSection title="앱 정보">
          <SettingRow label="버전">
            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>v0.1.0-alpha</span>
          </SettingRow>
          <SettingRow label="빌드 환경">
            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>Docker / Local</span>
          </SettingRow>
          <SettingRow label="백엔드">
            <span style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>{API_BASE.replace(/^https?:\/\//, '')}</span>
          </SettingRow>
        </SettingSection>
      </div>
      </div>
    </div>
  );
}
