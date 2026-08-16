import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { PanelLeftOpen } from 'lucide-react';

function HomePage() {
  const { toggleSidebar } = useSidebar();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center text-sm gap-4">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">AGY WebUI</h3>
        <p className="text-xs text-muted-foreground">基于浏览器的 Antigravity 远程交互控制台</p>
      </div>
      <button
        onClick={toggleSidebar}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
      >
        <PanelLeftOpen className="w-4 h-4" />
        <span>选择或新建会话</span>
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
