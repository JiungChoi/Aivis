import { useState, useEffect } from 'react';
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
import { useConversationStore } from './stores/conversationStore';
import { useScheduleReminder } from './hooks/useScheduleReminder';
import { userService } from './services/userService';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const loadSessions = useConversationStore((s) => s.loadSessions);
  useScheduleReminder();

  useEffect(() => {
    loadSessions();
    userService.initUser().catch(() => {});
  }, []);

  return (
    <div className="flex h-screen text-white overflow-hidden" style={{ background: '#000000' }}>
      <NavBar currentPage={currentPage} onNavigate={setCurrentPage} />
      {/* Main content: relative so CharacterLayer can position absolutely inside */}
      <div className="flex-1 relative overflow-hidden">
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'schedule' && <SchedulePage />}
        {currentPage === 'memory' && <MemoryPage />}
        {currentPage === 'analytics' && <AnalyticsPage />}
        {currentPage === 'todo' && <TodoPage />}
        {currentPage === 'notes' && <NotesPage />}
        {currentPage === 'settings' && <SettingsPage />}
        <CharacterLayer />
      </div>
      <GlobalChatPanel />
    </div>
  );
}
