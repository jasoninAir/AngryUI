import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isMobile: boolean;
  dragOffset: number | null; // 0 to 288 (px), or null when not dragging
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SIDEBAR_WIDTH = 288; // 18rem (w-72) in pixels

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

  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Progressive mobile touch swipe gesture tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTracking = false;
    let isDragging = false;
    let dragStartOpen = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !isMobileRef.current) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();
      dragStartOpen = isOpenRef.current;
      isDragging = false;

      // Track if starting from left edge (< 48px) when closed, or anywhere when open
      if (!dragStartOpen && touchStartX <= 48) {
        isTracking = true;
      } else if (dragStartOpen) {
        isTracking = true;
      } else {
        isTracking = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking || e.touches.length !== 1) return;
      const t = e.touches[0];
      const deltaX = t.clientX - touchStartX;
      const deltaY = t.clientY - touchStartY;

      if (!isDragging) {
        // Detect if horizontal gesture is dominant
        if (Math.abs(deltaY) > 20 && Math.abs(deltaY) > Math.abs(deltaX)) {
          // Vertical scroll -> cancel gesture
          isTracking = false;
          return;
        }

        if (Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (!dragStartOpen && deltaX > 0) {
            isDragging = true;
          } else if (dragStartOpen && deltaX < 0) {
            isDragging = true;
          }
        }
      }

      if (isDragging) {
        if (e.cancelable) {
          e.preventDefault();
        }
        let currentOffset: number;
        if (!dragStartOpen) {
          currentOffset = Math.max(0, Math.min(SIDEBAR_WIDTH, deltaX));
        } else {
          currentOffset = Math.max(0, Math.min(SIDEBAR_WIDTH, SIDEBAR_WIDTH + deltaX));
        }
        setDragOffset(currentOffset);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return;

      if (isDragging && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const deltaX = t.clientX - touchStartX;
        const elapsed = Math.max(1, Date.now() - touchStartTime);
        const velocity = deltaX / elapsed; // px/ms

        if (!dragStartOpen) {
          // Opening gesture
          if (deltaX > SIDEBAR_WIDTH * 0.3 || velocity > 0.3) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        } else {
          // Closing gesture
          if (deltaX < -SIDEBAR_WIDTH * 0.3 || velocity < -0.3) {
            setIsOpen(false);
          } else {
            setIsOpen(true);
          }
        }
      }

      isTracking = false;
      isDragging = false;
      setDragOffset(null);
    };

    const handleTouchCancel = () => {
      isTracking = false;
      isDragging = false;
      setDragOffset(null);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, []);

  const toggleSidebar = useCallback(() => setIsOpen((prev) => !prev), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      isOpen,
      isMobile,
      dragOffset,
      toggleSidebar,
      openSidebar,
      closeSidebar
    }),
    [isOpen, isMobile, dragOffset, toggleSidebar, openSidebar, closeSidebar]
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
