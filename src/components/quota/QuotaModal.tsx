import { X, Gauge } from 'lucide-react';
import { QuotaVisualizer } from './QuotaVisualizer';

interface QuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * QuotaModal - A floating dialog/popover modal with backdrop blur
 * Displays QuotaVisualizer content in a centered modal with header and close button
 */
export function QuotaModal({ isOpen, onClose }: QuotaModalProps) {
  if (!isOpen) return null;
  
  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Gauge styled */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Antigravity Quota</h2>
              <p className="text-xs text-muted-foreground">View API usage and limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
            aria-label="Close quota modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content - QuotaVisualizer */}
        <div className="flex-1 overflow-y-auto p-5">
          <QuotaVisualizer autoRefresh={isOpen} />
        </div>
      </div>
    </div>
  );
}
