import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Mobile detection: screen width < 768px (standard md breakpoint)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  // Default state: collapsed on mobile, expanded on desktop
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile edge swipe gesture detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Only process when horizontal motion is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaY) < 60) {
        // Swipe right from left edge (< 40px) to open sidebar on mobile
        if (isMobile && !isOpen && touchStartX < 40 && deltaX > 60) {
          setIsOpen(true);
        }
        // Swipe left anywhere when sidebar is open on mobile to close
        else if (isMobile && isOpen && deltaX < -70) {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isOpen]);

  const toggleSidebar = useCallback(() => setIsOpen((prev) => !prev), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      isOpen,
      isMobile,
      toggleSidebar,
      openSidebar,
      closeSidebar
    }),
    [isOpen, isMobile, toggleSidebar, openSidebar, closeSidebar]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return ctx;
}
