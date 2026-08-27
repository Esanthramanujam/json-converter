import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { SplitView } from './components/SplitView';
import { InputPane } from './components/InputPane';
import { OutputPane } from './components/OutputPane';
import type { OutputView } from './components/OutputPane';
import { ActionBar } from './components/ActionBar';
import { StatusBar } from './components/StatusBar';
import { ShortcutsOverlay } from './components/ShortcutsOverlay';
import { useTheme } from './hooks/useTheme';
import { usePersistentState } from './hooks/usePersistentState';
import { useConverter } from './hooks/useConverter';
import { computeStats } from './lib/format';
import { allContainerPaths, childEntries } from './lib/tree';
import { DEFAULT_OPTIONS } from './lib/types';
import type { ConvertOptions } from './lib/types';
import { ROUTES, hrefFor, routeForPath } from './lib/routes';

function useIsNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const handler = (event: MediaQueryListEvent) => setNarrow(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);
  return narrow;
}

/** Root paths plus the first level, so the tree opens usefully. */
function initialExpanded(value: unknown): Set<string> {
  const paths = new Set<string>(['$']);
  for (const [key, child] of childEntries(value)) {
    if (child && typeof child === 'object') paths.add(`$/${key}`);
  }
  return paths;
}

/** Vite injects the deployment base path it was built with. */
const BASE_PATH = import.meta.env.BASE_URL;

/** The static page this app was served from decides the starting mode. */
const ACTIVE_ROUTE = routeForPath(
  typeof window === 'undefined' ? '/' : window.location.pathname,
  BASE_PATH,
);

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [input, setInput] = usePersistentState<string>('jus.input', '');
  const [options, setOptions] = usePersistentState<ConvertOptions>('jus.options', DEFAULT_OPTIONS);
  const [ratio, setRatio] = usePersistentState<number>('jus.ratio', 0.5);
  const [view, setView] = usePersistentState<OutputView>('jus.view', 'text');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['$']));
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');
  const narrow = useIsNarrow();

  useEffect(() => {
    setOptions((current) => ({
      ...current,
      mode: ACTIVE_ROUTE.mode,
      autoDetect: ACTIVE_ROUTE.autoDetect,
    }));
    // Runs once: the pathname cannot change without a full page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard against a corrupted or outdated persisted options object.
  const safeOptions = useMemo<ConvertOptions>(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [options],
  );

  const { result, pending, needsManualRun, convertNow } = useConverter(input, safeOptions);
  const inputStats = useMemo(() => computeStats(input), [input]);

  useEffect(() => {
    setExpanded(initialExpanded(result.value));
  }, [result.value]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const patchOptions = useCallback(
    (patch: Partial<ConvertOptions>) => setOptions((current) => ({ ...current, ...patch })),
    [setOptions],
  );

  const writeClipboard = useCallback(async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
      return true;
    } catch {
      setToast('Clipboard blocked by the browser');
      return false;
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result.output) return;
    const ok = await writeClipboard(result.output, 'Copied');
    if (ok) setCopied(true);
  }, [result.output, writeClipboard]);

  const handleDownload = useCallback(() => {
    if (!result.output) return;
    const extension = result.mode === 'stringify' ? 'txt' : 'json';
    const blob = new Blob([result.output], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `output.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [result.output, result.mode]);

  const handleClear = useCallback(() => {
    setInput('');
    setQuery('');
  }, [setInput]);

  const handleSwap = useCallback(() => {
    if (!result.output) return;
    setInput(result.output);
    setMobileTab('input');
  }, [result.output, setInput]);

  const toggleNode = useCallback((path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(allContainerPaths(result.value)));
  }, [result.value]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key === 'Enter') {
        event.preventDefault();
        convertNow();
      } else if (meta && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        handleClear();
      } else if (meta && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        void handleCopy();
      } else if (meta && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleDownload();
      } else if (event.key === 'Escape') {
        setShortcutsOpen(false);
      } else if (event.key === '?' && !meta) {
        const target = event.target as HTMLElement | null;
        const typing =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable ||
            target.closest('.cm-editor') !== null);
        if (!typing) {
          event.preventDefault();
          setShortcutsOpen((open) => !open);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [convertNow, handleClear, handleCopy, handleDownload]);

  const inputPane = (
    <InputPane
      value={input}
      onChange={setInput}
      error={result.error}
      theme={theme}
      needsManualRun={needsManualRun}
      onConvert={convertNow}
    />
  );

  const outputPane = (
    <OutputPane
      result={result}
      pending={pending}
      view={view}
      onViewChange={setView}
      theme={theme}
      expanded={expanded}
      onToggleNode={toggleNode}
      onExpandAll={expandAll}
      onCollapseAll={collapseAll}
      query={query}
      onQueryChange={setQuery}
      onCopyPath={(path) => void writeClipboard(path, `Copied ${path}`)}
      onRepair={() => patchOptions({ repair: true })}
      repairEnabled={safeOptions.repair}
      hasInput={input.trim().length > 0}
      emptyHint={ACTIVE_ROUTE.emptyHint}
    />
  );

  const actions = (
    <ActionBar
      onConvert={convertNow}
      onSwap={handleSwap}
      onClear={handleClear}
      onCopy={() => void handleCopy()}
      onDownload={handleDownload}
      copied={copied}
      pending={pending}
      hasOutput={result.output.length > 0}
      vertical={!narrow}
    />
  );

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <Toolbar
        options={safeOptions}
        effectiveMode={result.mode}
        onChange={patchOptions}
        onLoadSample={(content) => {
          setInput(content);
          setMobileTab('input');
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      {narrow ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            role="tablist"
            aria-label="Pane"
            className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-[#0f1218]"
          >
            {(['input', 'output'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mobileTab === tab}
                onClick={() => setMobileTab(tab)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  mobileTab === tab
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab}
              </button>
            ))}
            <div className="ml-auto">{actions}</div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {mobileTab === 'input' ? inputPane : outputPane}
          </div>
        </div>
      ) : (
        <SplitView left={inputPane} right={outputPane} actions={actions} ratio={ratio} onRatioChange={setRatio} />
      )}

      <StatusBar inputStats={inputStats} result={result} pending={pending} />

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-[#0f1218] dark:text-slate-400">
        <span>All processing happens in your browser — nothing is uploaded.</span>
        <nav aria-label="Other JSON tools" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {ROUTES.filter((route) => route.path !== ACTIVE_ROUTE.path).map((route) => (
            <a
              key={route.path}
              href={hrefFor(route.path, BASE_PATH)}
              className="underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {route.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="ml-auto underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200"
        >
          Keyboard shortcuts
        </button>
      </footer>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-14 left-1/2 z-40 -translate-x-1/2 animate-fade-in rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          {toast}
        </div>
      )}

      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
