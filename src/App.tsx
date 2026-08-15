import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <div className="border-b border-border px-4 py-2 text-sm">
            <Link to="/settings" className="text-muted-foreground hover:text-foreground">
              Settings
            </Link>
          </div>
          <Routes>
            <Route
              path="/"
              element={<div className="p-8 text-muted-foreground">Select a conversation.</div>}
            />
            <Route path="/chat/:conversationId" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
