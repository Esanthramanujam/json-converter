import { WandIcon } from './Icons';
import type { ConvertError } from '../lib/types';

interface ErrorBannerProps {
  error?: ConvertError;
  onRepair: () => void;
  repairEnabled: boolean;
}

export function ErrorBanner({ error, onRepair, repairEnabled }: ErrorBannerProps) {
  return (
    <div aria-live="polite" className="min-h-[0px]">
      {error && (
        <div className="animate-fade-in border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{error.message}</p>
              {error.hint && <p className="mt-0.5 text-red-800/90 dark:text-red-300/90">{error.hint}</p>}
            </div>
            {error.repairable && !repairEnabled && (
              <button
                type="button"
                onClick={onRepair}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-300 bg-white px-2 py-1 font-medium text-red-800 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/40 dark:text-red-100 dark:hover:bg-red-900/70"
              >
                <WandIcon className="h-3.5 w-3.5" />
                Try to fix automatically
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
