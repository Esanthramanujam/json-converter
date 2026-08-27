import { JsonEditor } from './JsonEditor';
import { TreeView } from './TreeView';
import { ErrorBanner } from './ErrorBanner';
import { SearchIcon, SpinnerIcon } from './Icons';
import type { ConvertResult } from '../lib/types';

export type OutputView = 'text' | 'tree';

interface OutputPaneProps {
  result: ConvertResult;
  pending: boolean;
  view: OutputView;
  onViewChange: (view: OutputView) => void;
  theme: 'light' | 'dark';
  expanded: Set<string>;
  onToggleNode: (path: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  onCopyPath: (path: string) => void;
  onRepair: () => void;
  repairEnabled: boolean;
  hasInput: boolean;
}

export function OutputPane({
  result,
  pending,
  view,
  onViewChange,
  theme,
  expanded,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
  query,
  onQueryChange,
  onCopyPath,
  onRepair,
  repairEnabled,
  hasInput,
}: OutputPaneProps) {
  const treeReady = result.ok && result.value !== undefined && result.value !== null;
  const showEmptyState = !hasInput || (!result.output && !result.error);

  return (
    <section aria-label="Output" className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-[#151a22]">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Output
        </h2>

        <div
          role="tablist"
          aria-label="Output view"
          className="flex rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
        >
          {(['text', 'tree'] as OutputView[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={view === item}
              onClick={() => onViewChange(item)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                view === item
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {item === 'text' ? 'Formatted' : 'Tree'}
            </button>
          ))}
        </div>

        {view === 'tree' && treeReady && (
          <>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Filter keys and values"
                aria-label="Filter the tree by key or value"
                className="w-48 rounded-md border border-slate-200 bg-white py-1 pl-7 pr-2 text-[11px] text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={onExpandAll}
              className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Collapse all
            </button>
          </>
        )}

        {pending && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
            <SpinnerIcon className="h-3.5 w-3.5" />
            Converting
          </span>
        )}
      </div>

      <ErrorBanner error={result.error} onRepair={onRepair} repairEnabled={repairEnabled} />

      {result.notes.length > 0 && !result.error && (
        <ul className="border-b border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          {result.notes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      )}

      {result.repairs.length > 0 && (
        <ul className="border-b border-amber-200 bg-amber-50 px-3 py-1 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          {result.repairs.map((fix) => (
            <li key={fix}>· {fix}</li>
          ))}
        </ul>
      )}

      <div className="relative min-h-0 flex-1">
        {showEmptyState ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nothing converted yet
            </p>
            <p className="max-w-xs text-xs text-slate-400 dark:text-slate-500">
              Paste an escaped JSON string on the left — or drop a file — and the clean, formatted
              JSON appears here.
            </p>
          </div>
        ) : view === 'tree' && treeReady ? (
          <TreeView
            value={result.value}
            expanded={expanded}
            onToggle={onToggleNode}
            query={query}
            onCopyPath={onCopyPath}
          />
        ) : (
          <JsonEditor
            value={result.output}
            readOnly
            theme={theme}
            ariaLabel="Converted output"
          />
        )}

        {pending && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-[#0f1218]/50">
            <SpinnerIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </div>
    </section>
  );
}
