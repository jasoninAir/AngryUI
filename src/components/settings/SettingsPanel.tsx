import { PermissionsPanel } from './PermissionsPanel';

export function SettingsPanel() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <PermissionsPanel />
    </div>
  );
}
