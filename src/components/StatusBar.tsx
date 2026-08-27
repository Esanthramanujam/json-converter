import { formatBytes } from '../lib/format';
import type { ConvertResult, JsonStats } from '../lib/types';
import { MODE_LABELS } from '../lib/types';

interface StatusBarProps {
  inputStats: JsonStats;
  result: ConvertResult;
  pending: boolean;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-slate-400 dark:text-slate-500">{label}</span>{' '}
      <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{value}</span>
    </span>
  );
}

export function StatusBar({ inputStats, result, pending }: StatusBarProps) {
  const out = result.stats;
  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-[#0f1218] dark:text-slate-300"
    >
      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {MODE_LABELS[result.mode]}
        {result.autoDetected ? ' · auto' : ''}
      </span>
      <Metric label="chars" value={inputStats.chars.toLocaleString()} />
      <Metric label="lines" value={inputStats.lines.toLocaleString()} />
      <Metric label="size" value={formatBytes(inputStats.bytes)} />
      <span className="hidden text-slate-300 sm:inline dark:text-slate-700">|</span>
      <Metric label="out" value={formatBytes(out.bytes)} />
      <Metric label="depth" value={out.depth} />
      <Metric label="keys" value={out.keys.toLocaleString()} />
      {result.passes > 0 && (
        <Metric label="unescape passes" value={result.passes} />
      )}
      {result.repairs.length > 0 && (
        <span className="whitespace-nowrap text-amber-700 dark:text-amber-400">
          {result.repairs.length} repair{result.repairs.length === 1 ? '' : 's'} applied
        </span>
      )}
      {pending && <span className="text-blue-600 dark:text-blue-400">converting…</span>}
    </div>
  );
}
