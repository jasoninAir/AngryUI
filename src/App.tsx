import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { SessionStatusProvider } from './context/SessionStatusContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { PanelLeftOpen } from 'lucide-react';

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={e => { e.preventDefault(); onLogin(val); }} className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">AngryUI</h1>
        <input type="password" value={val} onChange={e => setVal(e.target.value)}
          placeholder="Enter access token" className="border rounded px-3 py-2" autoFocus />
        <button type="submit" disabled={!val.trim()} className="bg-primary text-primary-foreground rounded px-4 py-2 disabled:opacity-50 cursor-not-allowed">
          {val.trim() ? 'Connect' : 'Enter token above'}
        </button>
      </form>
    </div>
  );
}

function HomePage() {
  const { toggleSidebar } = useSidebar();
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center text-sm gap-4 select-none">
      <div className="flex flex-col items-center">
        <img
          src="/logo.png"
          alt="AngryUI"
          className="w-16 h-16 rounded-2xl shadow-lg mb-3 object-contain border border-border/60 animate-in zoom-in-95 duration-300"
        />
        <h3 className="text-xl font-bold text-foreground mb-1 tracking-tight">{t('homeWelcome')}</h3>
        <p className="text-xs text-muted-foreground max-w-sm">{t('homeWelcomeDesc')}</p>
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

function AppContent() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-full h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
        >
          Skip to main content
        </a>
        <Sidebar />
        <main id="main-content" className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat/:conversationId" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <SessionStatusProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SessionStatusProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
