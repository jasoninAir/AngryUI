import { PermissionsPanel } from './PermissionsPanel';
import { QuotaPanel } from './QuotaPanel';
import { SoundPanel } from './SoundPanel';

export function SettingsPanel() {
  return (
    <div className="p-6 max-w-3xl space-y-8 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SoundPanel />
      <PermissionsPanel />
      <QuotaPanel />
    </div>
  );
}
