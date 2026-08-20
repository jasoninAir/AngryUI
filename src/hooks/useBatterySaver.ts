import { useEffect, useState } from 'react';

/**
 * Tracks document visibility & Page Lifecycle states (freeze/resume/pageshow/pagehide)
 * to throttle background work and conserve battery on mobile devices.
 */
export function useBatterySaver() {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibility = () => setIsVisible(document.visibilityState === 'visible');
    const handleFreeze = () => setIsVisible(false);
    const handleResume = () => setIsVisible(document.visibilityState === 'visible');

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('freeze', handleFreeze);
    document.addEventListener('resume', handleResume);
    window.addEventListener('pageshow', handleResume);
    window.addEventListener('pagehide', handleFreeze);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('freeze', handleFreeze);
      document.removeEventListener('resume', handleResume);
      window.removeEventListener('pageshow', handleResume);
      window.removeEventListener('pagehide', handleFreeze);
    };
  }, []);

  return isVisible;
}
