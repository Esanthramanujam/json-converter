import { useEffect, useRef, useState } from 'react';
import { KeyboardIcon, MoonIcon, SunIcon } from './Icons';
import { Toggle } from './Toggle';
import type { ConvertOptions, IndentOption, Mode } from '../lib/types';
import { MODE_LABELS } from '../lib/types';
import { SAMPLES } from '../lib/samples';
import type { Theme } from '../hooks/useTheme';

const MODES: Mode[] = ['unescape', 'stringify', 'beautify', 'minify'];
const INDENTS: Array<{ value: IndentOption; label: string }> = [
  { value: '2', label: '2 spaces' },
  { value: '4', label: '4 spaces' },
  { value: 'tab', label: 'Tab' },
];

interface ToolbarProps {
  options: ConvertOptions;
  effectiveMode: Mode;
  onChange: (patch: Partial<ConvertOptions>) => void;
  onLoadSample: (content: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onShowShortcuts: () => void;
}

export function Toolbar({
  options,
  effectiveMode,
  onChange,
  onLoadSample,
  theme,
  onToggleTheme,
  onShowShortcuts,
}: ToolbarProps) {
  const [samplesOpen, setSamplesOpen] = useState(false);
  const samplesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!samplesOpen) return undefined;
    const onDocClick = (event: MouseEvent) => {
      if (!samplesRef.current?.contains(event.target as Node)) setSamplesOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSamplesOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [samplesOpen]);

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#0f1218]">
      {/* The page's real <h1> lives in the prerendered copy below the app. */}
      <a
        href={import.meta.env.BASE_URL}
        aria-label="JSON Unescape home"
        className="mr-1 flex items-baseline gap-1.5 text-sm font-semibold text-slate-900 no-underline dark:text-slate-100"
      >
        JSON<span className="font-normal text-slate-500 dark:text-slate-400">Unescape</span>
      </a>

      <div
        role="radiogroup"
        aria-label="Conversion mode"
        className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900"
      >
        {MODES.map((mode) => {
          const selected = options.autoDetect ? effectiveMode === mode : options.mode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ mode, autoDetect: false })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                selected
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          );
        })}
      </div>

      <Toggle
        checked={options.autoDetect}
        onChange={(next) => onChange({ autoDetect: next })}
        label="Auto-detect"
        title="Inspect the input and pick the mode automatically"
      />

      <Toggle
        checked={options.repair}
        onChange={(next) => onChange({ repair: next })}
        label="Lenient repair"
        title="Fix trailing commas, single quotes, unquoted keys and Python literals"
      />

      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
        <span className="sr-only sm:not-sr-only">Indent</span>
        <select
          value={options.indent}
          onChange={(event) => onChange({ indent: event.target.value as IndentOption })}
          aria-label="Indentation"
          className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {INDENTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <Toggle
        checked={options.sortKeys}
        onChange={(next) => onChange({ sortKeys: next })}
        label="Sort keys"
        title="Order object keys alphabetically"
      />

      {effectiveMode === 'stringify' && (
        <>
          <Toggle
            checked={options.wrapQuotes}
            onChange={(next) => onChange({ wrapQuotes: next })}
            label="Wrap in quotes"
          />
          <Toggle
            checked={options.escapeNonAscii}
            onChange={(next) => onChange({ escapeNonAscii: next })}
            label="Escape non-ASCII"
            title="Emit \\uXXXX for every character above U+007E"
          />
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <div className="relative" ref={samplesRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={samplesOpen}
            onClick={() => setSamplesOpen((open) => !open)}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Load sample
          </button>
          {samplesOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#151a22]"
            >
              {SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onLoadSample(sample.content);
                    setSamplesOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="block text-xs font-medium text-slate-800 dark:text-slate-100">
                    {sample.name}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    {sample.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onShowShortcuts}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <KeyboardIcon />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
