import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { SessionStatusProvider } from './context/SessionStatusContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PanelLeftOpen, KeyRound, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

function LoginScreen({ onLogin }: { onLogin: (token: string) => Promise<{ success: boolean; error?: string }> }) {
  const [val, setVal] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await onLogin(val.trim());
      if (!res.success) {
        setErrorMsg(res.error || t('invalidToken'));
      }
    } catch {
      setErrorMsg(t('invalidToken'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full h-[100dvh] w-full items-center justify-center p-4 bg-background select-none">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">{t('loginTitle')}</h1>
        <p className="text-xs text-muted-foreground text-center mt-1 mb-5">
          {t('loginDesc')}
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="relative flex items-center">
            <KeyRound className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={val}
              onChange={(e) => {
                setVal(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={t('tokenPlaceholder')}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-mono"
              autoFocus
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 animate-in fade-in">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={!val.trim() || isSubmitting}
            className="w-full mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('connecting')}</span>
              </>
            ) : (
              <span>{t('connect')}</span>
            )}
          </button>
        </form>
      </div>
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
  const { isAuthenticated, isChecking, login } = useAuth();

  if (isChecking) {
    return (
      <div className="flex h-full h-[100dvh] w-full items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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
        <ErrorBoundary fallbackTitle="Sidebar Error">
          <Sidebar />
        </ErrorBoundary>
        <main id="main-content" className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <ErrorBoundary fallbackTitle="Application Error">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/chat/:conversationId" element={<ChatPage />} />
              <Route path="/c/:conversationId" element={<ChatPage />} />
              <Route path="/session/:conversationId" element={<ChatPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
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
            <ErrorBoundary fallbackTitle="Critical UI Error">
              <AppContent />
            </ErrorBoundary>
          </AuthProvider>
        </SessionStatusProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
