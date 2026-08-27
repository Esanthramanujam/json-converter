import { useEffect, useRef } from 'react';
import { CloseIcon } from './Icons';

const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl / ⌘ + Enter', 'Convert now'],
  ['Ctrl / ⌘ + K', 'Clear both panes'],
  ['Ctrl / ⌘ + Shift + C', 'Copy the output'],
  ['Ctrl / ⌘ + S', 'Download the output'],
  ['?', 'Show or hide this list'],
  ['Esc', 'Close this list'],
];

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-[#151a22]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <CloseIcon />
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          {SHORTCUTS.map(([keys, description]) => (
            <div key={keys} className="flex items-center justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">{description}</dt>
              <dd>
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
