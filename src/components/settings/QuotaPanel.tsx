import { QuotaVisualizer } from '../quota/QuotaVisualizer';

export function QuotaPanel() {
  return (
    <div className="space-y-4">
      <QuotaVisualizer autoRefresh={true} />
    </div>
  );
}
