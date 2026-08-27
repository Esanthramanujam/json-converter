import type * as React from 'react';
import { useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
  actions: ReactNode;
  ratio: number;
  onRatioChange: (ratio: number) => void;
}

const MIN = 0.18;
const MAX = 0.82;

export function SplitView({ left, right, actions, ratio, onRatioChange }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const applyFromClientX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const next = (clientX - rect.left) / rect.width;
      onRatioChange(Math.min(MAX, Math.max(MIN, next)));
    },
    [onRatioChange],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      applyFromClientX(event.clientX);
    },
    [applyFromClientX],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer already released */
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onRatioChange(Math.max(MIN, ratio - 0.02));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onRatioChange(Math.min(MAX, ratio + 0.02));
      } else if (event.key === 'Home') {
        event.preventDefault();
        onRatioChange(0.5);
      }
    },
    [onRatioChange, ratio],
  );

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-col" style={{ flexBasis: `${ratio * 100}%` }}>
        {left}
      </div>

      <div className="relative flex shrink-0 items-stretch">
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={Math.round(MIN * 100)}
          aria-valuemax={Math.round(MAX * 100)}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="w-2 cursor-col-resize bg-slate-200 transition-colors hover:bg-blue-400 dark:bg-slate-800 dark:hover:bg-blue-500"
        />
        <div className="flex flex-col items-center gap-1 border-x border-slate-200 bg-white px-1 py-2 dark:border-slate-800 dark:bg-[#0f1218]">
          {actions}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">{right}</div>
    </div>
  );
}
