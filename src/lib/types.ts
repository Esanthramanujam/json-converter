export type Mode = 'unescape' | 'stringify' | 'beautify' | 'minify';

export type IndentOption = '2' | '4' | 'tab';

export const MODE_LABELS: Record<Mode, string> = {
  unescape: 'Unescape → JSON',
  stringify: 'JSON → Stringify',
  beautify: 'Beautify',
  minify: 'Minify',
};

export interface ConvertOptions {
  mode: Mode;
  autoDetect: boolean;
  indent: IndentOption;
  sortKeys: boolean;
  repair: boolean;
  wrapQuotes: boolean;
  escapeNonAscii: boolean;
  wrapNdjson: boolean;
}

export const DEFAULT_OPTIONS: ConvertOptions = {
  mode: 'unescape',
  autoDetect: true,
  indent: '2',
  sortKeys: false,
  repair: false,
  wrapQuotes: true,
  escapeNonAscii: false,
  wrapNdjson: true,
};

export interface JsonStats {
  chars: number;
  lines: number;
  bytes: number;
  depth: number;
  keys: number;
}

export interface ConvertError {
  message: string;
  line?: number;
  column?: number;
  position?: number;
  hint?: string;
  /** true when the lenient repair pass would produce parseable JSON */
  repairable: boolean;
}

export interface ConvertResult {
  ok: boolean;
  output: string;
  /** Parsed value, when the input could be understood. Used by the tree view. */
  value?: unknown;
  /** The mode that was actually applied (may differ from the request when auto-detect is on). */
  mode: Mode;
  autoDetected: boolean;
  /** Number of unescape passes that were applied. */
  passes: number;
  /** Human readable list of repairs performed by the lenient pass. */
  repairs: string[];
  /** Informational messages (quotes stripped, log prefix removed, NDJSON wrapped, ...). */
  notes: string[];
  ndjson: boolean;
  error?: ConvertError;
  stats: JsonStats;
}

export const EMPTY_STATS: JsonStats = { chars: 0, lines: 0, bytes: 0, depth: 0, keys: 0 };
