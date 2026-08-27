import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flattenTree, previewValue } from '../lib/tree';
import type { TreeRow, ValueType } from '../lib/tree';
import { ChevronIcon } from './Icons';

const ROW_HEIGHT = 24;
const OVERSCAN = 12;

const TYPE_STYLES: Record<ValueType, string> = {
  string: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  number: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  boolean: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  null: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  object: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  array: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
};

const VALUE_STYLES: Record<ValueType, string> = {
  string: 'text-emerald-700 dark:text-emerald-300',
  number: 'text-sky-700 dark:text-sky-300',
  boolean: 'text-violet-700 dark:text-violet-300',
  null: 'text-slate-500 dark:text-slate-400',
  object: '',
  array: '',
};

interface TreeViewProps {
  value: unknown;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  query: string;
  onCopyPath: (path: string) => void;
}

export function TreeView({ value, expanded, onToggle, query, onCopyPath }: TreeViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  const rows = useMemo(
    () => flattenTree(value, { expanded, query }),
    [value, expanded, query],
  );

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return undefined;
    setViewportHeight(element.clientHeight);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => setViewportHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    setScrollTop(scrollerRef.current?.scrollTop ?? 0);
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const end = Math.min(rows.length, start + visibleCount);
  const slice = rows.slice(start, end);

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        {query ? `Nothing matches “${query}”.` : 'Nothing to show.'}
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="scroll-thin h-full overflow-auto font-mono text-[12.5px]"
      role="tree"
      aria-label="JSON tree"
    >
      <div style={{ height: rows.length * ROW_HEIGHT, position: 'relative' }}>
        {slice.map((row, index) => (
          <Row
            key={row.path}
            row={row}
            top={(start + index) * ROW_HEIGHT}
            onToggle={onToggle}
            onCopyPath={onCopyPath}
            query={query}
          />
        ))}
      </div>
    </div>
  );
}

/** Highlights the first occurrence of the active search term. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-yellow-200 text-inherit dark:bg-yellow-400/40 dark:text-inherit">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

interface RowProps {
  row: TreeRow;
  top: number;
  onToggle: (path: string) => void;
  onCopyPath: (path: string) => void;
  query: string;
}

function Row({ row, top, onToggle, onCopyPath, query }: RowProps) {
  const isContainer = row.type === 'object' || row.type === 'array';
  const summary = row.type === 'array' ? `${row.childCount} items` : `${row.childCount} keys`;

  return (
    <div
      role="treeitem"
      aria-level={row.depth + 1}
      aria-expanded={row.hasChildren ? row.expanded : undefined}
      style={{ position: 'absolute', top, height: ROW_HEIGHT, left: 0, right: 0 }}
      className="group flex items-center gap-1.5 whitespace-nowrap px-2 hover:bg-slate-100 dark:hover:bg-slate-800/70"
    >
      <span style={{ width: row.depth * 14 }} className="shrink-0" aria-hidden="true" />

      {row.hasChildren ? (
        <button
          type="button"
          onClick={() => onToggle(row.path)}
          aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${row.label || 'root'}`}
          className="shrink-0 rounded text-slate-400 transition-transform hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ChevronIcon className={`h-3.5 w-3.5 transition-transform ${row.expanded ? 'rotate-90' : ''}`} />
        </button>
      ) : (
        <span className="w-3.5 shrink-0" aria-hidden="true" />
      )}

      <span className={`shrink-0 rounded px-1 text-[10px] font-medium ${TYPE_STYLES[row.type]}`}>
        {row.type}
      </span>

      <span className="shrink-0 text-slate-700 dark:text-slate-200">
        {row.key === null ? (
          <span className="text-slate-400">root</span>
        ) : (
          <Highlight text={row.key} query={query.trim()} />
        )}
      </span>

      {isContainer ? (
        <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{summary}</span>
      ) : (
        <span className={`truncate ${VALUE_STYLES[row.type]}`}>
          <Highlight text={previewValue(row.value)} query={query.trim()} />
        </span>
      )}

      <button
        type="button"
        onClick={() => onCopyPath(row.label || '$')}
        title={`Copy path: ${row.label || '$'}`}
        aria-label={`Copy JSON path ${row.label || '$'}`}
        className="ml-auto shrink-0 rounded px-1 text-[10px] text-slate-400 opacity-0 transition-opacity hover:text-blue-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:text-blue-400"
      >
        copy path
      </button>
    </div>
  );
}
