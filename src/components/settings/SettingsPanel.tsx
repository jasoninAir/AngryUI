import { PermissionsPanel } from './PermissionsPanel';
import { QuotaPanel } from './QuotaPanel';

export function SettingsPanel() {
  return (
    <div className="p-6 max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <PermissionsPanel />
      <QuotaPanel />
    </div>
  );
}
