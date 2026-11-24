import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalProgramScrollerProps {
  children: React.ReactNode;
  variant?: 'header' | 'hero';
  label?: string;
  className?: string;
  trackClassName?: string;
}

export const HorizontalProgramScroller: React.FC<HorizontalProgramScrollerProps> = ({
  children,
  variant = 'hero',
  label,
  className = '',
  trackClassName = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    const raf = requestAnimationFrame(updateScrollState);

    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(el);
    }

    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(updateScrollState);
      mutationObserver.observe(el, { childList: true, subtree: true });
    }

    // Translate vertical mouse-wheel scrolling over the strip into smooth left/right scrolling
    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const absY = Math.abs(e.deltaY);
      const absX = Math.abs(e.deltaX);
      if (absY > absX && absY > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', updateScrollState);
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', updateScrollState);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [updateScrollState]);

  const scrollByStep = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(220, Math.round(el.clientWidth * 0.6));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const isHeader = variant === 'header';

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between px-1 mb-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <span className="font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{label}</span>
          </span>
          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => scrollByStep('left')}
              disabled={!canScrollLeft}
              className={`px-2 py-0.5 rounded-md border transition-colors inline-flex items-center gap-0.5 ${
                canScrollLeft
                  ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer'
                  : 'opacity-35 border-stone-200/50 dark:border-stone-800 text-stone-400 cursor-default'
              }`}
              title="বামে স্ক্রল করুন"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>বামে</span>
            </button>
            <button
              type="button"
              onClick={() => scrollByStep('right')}
              disabled={!canScrollRight}
              className={`px-2 py-0.5 rounded-md border transition-colors inline-flex items-center gap-0.5 ${
                canScrollRight
                  ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer'
                  : 'opacity-35 border-stone-200/50 dark:border-stone-800 text-stone-400 cursor-default'
              }`}
              title="ডানে স্ক্রল করুন"
            >
              <span>ডানে</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div className="relative flex items-center gap-1.5">
        {/* Left Scroll Button */}
        <button
          type="button"
          onClick={() => scrollByStep('left')}
          disabled={!canScrollLeft}
          aria-label="বামে স্ক্রল করুন"
          title="বামে স্ক্রল করুন"
          className={`shrink-0 flex items-center justify-center rounded-full border transition-all ${
            isHeader ? 'w-7 h-7' : 'w-8 h-8 shadow-sm'
          } ${
            canScrollLeft
              ? 'bg-white/95 dark:bg-stone-900/95 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer active:scale-95'
              : 'bg-stone-100/50 dark:bg-stone-900/30 border-stone-200/50 dark:border-stone-800/50 text-stone-300 dark:text-stone-700 cursor-default'
          }`}
        >
          <ChevronLeft className={isHeader ? 'w-4 h-4' : 'w-4 h-4'} />
        </button>

        {/* Scrollable Track Container with Edge Fades */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          {canScrollLeft && (
            <div
              className={`pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r ${
                isHeader
                  ? 'from-stone-50 dark:from-stone-950'
                  : 'from-stone-50 dark:from-stone-950'
              } to-transparent`}
            />
          )}

          <div
            ref={scrollRef}
            className={`flex items-center overflow-x-auto no-scrollbar scroll-smooth snap-x [&>*]:shrink-0 [&>*]:snap-start ${
              isHeader ? 'gap-1.5 py-0.5 px-0.5' : 'gap-2.5 py-1 px-1'
            } ${trackClassName}`}
          >
            {children}
          </div>

          {canScrollRight && (
            <div
              className={`pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l ${
                isHeader
                  ? 'from-stone-50 dark:from-stone-950'
                  : 'from-stone-50 dark:from-stone-950'
              } to-transparent`}
            />
          )}
        </div>

        {/* Right Scroll Button */}
        <button
          type="button"
          onClick={() => scrollByStep('right')}
          disabled={!canScrollRight}
          aria-label="ডানে স্ক্রল করুন"
          title="ডানে স্ক্রল করুন"
          className={`shrink-0 flex items-center justify-center rounded-full border transition-all ${
            isHeader ? 'w-7 h-7' : 'w-8 h-8 shadow-sm'
          } ${
            canScrollRight
              ? 'bg-white/95 dark:bg-stone-900/95 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer active:scale-95'
              : 'bg-stone-100/50 dark:bg-stone-900/30 border-stone-200/50 dark:border-stone-800/50 text-stone-300 dark:text-stone-700 cursor-default'
          }`}
        >
          <ChevronRight className={isHeader ? 'w-4 h-4' : 'w-4 h-4'} />
        </button>
      </div>
    </div>
  );
};
