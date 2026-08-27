import type * as React from 'react';
import { ArrowRightIcon, CheckIcon, CopyIcon, DownloadIcon, SpinnerIcon, SwapIcon, TrashIcon } from './Icons';

interface ActionBarProps {
  onConvert: () => void;
  onSwap: () => void;
  onClear: () => void;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
  pending: boolean;
  hasOutput: boolean;
  vertical?: boolean;
}

interface ActionButtonProps {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  emphasis?: boolean;
}

function ActionButton({ label, hint, onClick, disabled, children, emphasis }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={hint}
      className={`rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        emphasis
          ? 'bg-blue-600 text-white hover:bg-blue-500'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

export function ActionBar({
  onConvert,
  onSwap,
  onClear,
  onCopy,
  onDownload,
  copied,
  pending,
  hasOutput,
  vertical = true,
}: ActionBarProps) {
  return (
    <div className={vertical ? 'flex flex-col items-center gap-1' : 'flex items-center gap-1'}>
      <ActionButton label="Convert" hint="Convert now (Ctrl/⌘+Enter)" onClick={onConvert} emphasis>
        {pending ? <SpinnerIcon /> : <ArrowRightIcon />}
      </ActionButton>
      <ActionButton
        label="Copy output"
        hint="Copy output (Ctrl/⌘+Shift+C)"
        onClick={onCopy}
        disabled={!hasOutput}
      >
        {copied ? <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" /> : <CopyIcon />}
      </ActionButton>
      <ActionButton
        label="Download output as JSON"
        hint="Download output (Ctrl/⌘+S)"
        onClick={onDownload}
        disabled={!hasOutput}
      >
        <DownloadIcon />
      </ActionButton>
      <ActionButton
        label="Move output into the input pane"
        hint="Swap output into input to chain conversions"
        onClick={onSwap}
        disabled={!hasOutput}
      >
        <SwapIcon />
      </ActionButton>
      <ActionButton label="Clear both panes" hint="Clear both panes (Ctrl/⌘+K)" onClick={onClear}>
        <TrashIcon />
      </ActionButton>
    </div>
  );
}
