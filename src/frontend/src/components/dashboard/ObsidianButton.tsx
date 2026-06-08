import { useState, useEffect } from 'react';
import { obsidianService, type ObsidianSettings } from '../../services/obsidianService';

/** Self-contained Obsidian integration: header trigger button + settings modal. */
export function ObsidianButton() {
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState<ObsidianSettings | null>(null);
  const [vaultInput, setVaultInput] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    obsidianService.getSettings().then((s) => {
      setSettings(s);
      setVaultInput(s.vaultPath);
      setEnabled(s.isEnabled);
    }).catch(console.error);
  }, []);

  async function handleSave() {
    try {
      const updated = await obsidianService.updateSettings(vaultInput, enabled);
      setSettings(updated);
      setSyncMsg('설정 저장 완료');
      setTimeout(() => setSyncMsg(''), 2000);
    } catch { setSyncMsg('저장 실패'); }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const result = await obsidianService.syncAll();
      setSyncMsg(`${result.syncedCount}개 노트 동기화 완료`);
    } catch { setSyncMsg('동기화 실패'); }
    finally { setSyncing(false); }
  }

  return (
    <>
      {/* Obsidian 설정 버튼 */}
      <button
        onClick={() => setShowModal(true)}
        title="Obsidian 연동 설정"
        className={`text-xs transition-colors flex items-center gap-1 ${
          settings?.isEnabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-600 hover:text-gray-400'
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.5 2C9.8 2 7.4 3.6 6.3 6c-.3.7-.5 1.5-.5 2.3 0 .9.2 1.8.6 2.6L2 20h4l2-4h2l1 4h2l1-4h2l2 4h4l-4.4-9.1c.4-.8.6-1.7.6-2.6 0-.8-.2-1.6-.5-2.3C17.6 3.6 15.2 2 12.5 2zm0 2c1.9 0 3.5 1.6 3.5 3.5S14.4 11 12.5 11 9 9.4 9 7.5 10.6 4 12.5 4z"/>
        </svg>
        Obsidian
      </button>

      {/* ── Obsidian 설정 모달 ── */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 w-80"
            style={{ background: '#1c1c1e', border: '1px solid #1e3a5a', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">Obsidian 연동</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${settings?.isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-500'}`}>
                  {settings?.isEnabled ? '연결됨' : '꺼짐'}
                </span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-gray-300 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3">
              {/* 활성화 토글 */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">연동 활성화</span>
                <button
                  onClick={() => setEnabled((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${enabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Vault 경로 */}
              <div>
                <label className="text-gray-500 text-[10px] mb-1 block">Vault 경로 (컨테이너 내부)</label>
                <input
                  type="text"
                  value={vaultInput}
                  onChange={(e) => setVaultInput(e.target.value)}
                  placeholder="/vault"
                  className="w-full rounded-lg text-[11px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder-gray-700"
                  style={{ background: '#1c1c1e', border: '1px solid rgba(84,84,88,0.35)', color: '#d1d5db' }}
                />
                <p className="text-gray-700 text-[9px] mt-1">
                  호스트 ~/Documents/AIVIS → 컨테이너 /vault 마운트됨
                </p>
              </div>

              {/* 버튼들 */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  className="flex-1 text-[11px] py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={handleSync}
                  disabled={!settings?.isEnabled || syncing}
                  className="flex-1 text-[11px] py-1.5 rounded-lg bg-blue-600/70 hover:bg-blue-500/70 disabled:opacity-30 text-white transition-colors"
                >
                  {syncing ? '동기화 중...' : '전체 동기화'}
                </button>
              </div>

              {syncMsg && (
                <p className="text-emerald-400 text-[10px] text-center">{syncMsg}</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
