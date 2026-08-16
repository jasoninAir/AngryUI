import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <Routes>
            <Route
              path="/"
              element={
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center text-sm">
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">AGY WebUI</h3>
                    <p>请在左侧选择已有会话，或点击 ➕ 新建会话开始对话。</p>
                  </div>
                </div>
              }
            />
            <Route path="/chat/:conversationId" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
