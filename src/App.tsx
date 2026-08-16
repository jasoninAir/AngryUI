import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { SessionStatusProvider } from './context/SessionStatusContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { PanelLeftOpen } from 'lucide-react';

function HomePage() {
  const { toggleSidebar } = useSidebar();
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center text-sm gap-4">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">{t('homeWelcome')}</h3>
        <p className="text-xs text-muted-foreground">{t('homeWelcomeDesc')}</p>
      </div>
      <button
        onClick={toggleSidebar}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
      >
        <PanelLeftOpen className="w-4 h-4" />
        <span>{t('selectOrNewSession')}</span>
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <SessionStatusProvider>
          <SidebarProvider>
            <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
              <Sidebar />
              <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/chat/:conversationId" element={<ChatPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
        </SessionStatusProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
