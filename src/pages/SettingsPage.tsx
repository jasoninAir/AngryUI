import { useSidebar } from '@/context/SidebarContext';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { PanelLeftOpen } from 'lucide-react';

export function SettingsPage() {
  const { toggleSidebar } = useSidebar();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          title="Toggle sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">Settings</span>
      </div>
      <SettingsPanel />
    </div>
  );
}
