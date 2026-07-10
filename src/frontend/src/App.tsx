import { useState, useEffect, type ComponentType } from 'react';
import NavBar, { type PageKey } from './components/layout/NavBar';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import MemoryPage from './pages/MemoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import TodoPage from './pages/TodoPage';
import NotesPage from './pages/NotesPage';
import CharacterLayer from './components/characters/CharacterLayer';
import GlobalChatPanel from './components/layout/GlobalChatPanel';
import CommandPalette from './components/layout/CommandPalette';
import { ToastContainer } from './components/ui/ToastContainer';
import { useConversationStore } from './stores/conversationStore';
import { useScheduleReminder } from './hooks/useScheduleReminder';
import { userService } from './services/userService';

// Single source of truth for page routing (add a page here + in NavBar's PageKey).
const PAGES: Record<PageKey, ComponentType> = {
  dashboard: DashboardPage,
  schedule: SchedulePage,
  memory: MemoryPage,
  analytics: AnalyticsPage,
  todo: TodoPage,
  notes: NotesPage,
  settings: SettingsPage,
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const loadSessions = useConversationStore((s) => s.loadSessions);
  useScheduleReminder();

  useEffect(() => {
    loadSessions();
    userService.initUser().catch(() => {});
  }, []);

  // Cmd+K / Ctrl+K to toggle global search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const CurrentPage = PAGES[currentPage];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-0)', color: 'var(--text-1)' }}>
      <NavBar currentPage={currentPage} onNavigate={setCurrentPage} />
      {/* Main content: relative so CharacterLayer can position absolutely inside */}
      <div className="flex-1 relative overflow-hidden">
        <CurrentPage />
        <CharacterLayer />
      </div>
      <GlobalChatPanel />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={setCurrentPage}
      />
      <ToastContainer />
    </div>
  );
}
