import { detectMode, splitNdjson, tryParse } from './detect';
import { computeStats, formatJson, minifyJson } from './format';
import { describeParseError } from './jsonError';
import { repairJson } from './repair';
import { stringifyText } from './stringify';
import type { ConvertOptions, ConvertResult, Mode } from './types';
import { EMPTY_STATS } from './types';
import { unescapeToJson } from './unescape';

interface ParseOutcome {
  ok: boolean;
  value?: unknown;
  text: string;
  repairs: string[];
  error?: Error;
  repairable: boolean;
}

/** Parse, optionally running the lenient repair pass first. */
function parseFlexible(text: string, useRepair: boolean): ParseOutcome {
  const direct = tryParse(text);
  if (direct.ok) return { ok: true, value: direct.value, text, repairs: [], repairable: false };

  const repaired = repairJson(text);
  const second = tryParse(repaired.text);

  if (useRepair) {
    if (second.ok) {
      return { ok: true, value: second.value, text: repaired.text, repairs: repaired.fixes, repairable: false };
    }
    return { ok: false, text, repairs: repaired.fixes, error: second.error, repairable: false };
  }

  return { ok: false, text, repairs: [], error: direct.error, repairable: second.ok };
}

function baseResult(mode: Mode, autoDetected: boolean): ConvertResult {
  return {
    ok: false,
    output: '',
    mode,
    autoDetected,
    passes: 0,
    repairs: [],
    notes: [],
    ndjson: false,
    stats: { ...EMPTY_STATS },
  };
}

function render(value: unknown, options: ConvertOptions): string {
  return options.mode === 'minify'
    ? minifyJson(value, options.sortKeys)
    : formatJson(value, options.indent, options.sortKeys);
}

/**
 * The single entry point used by the UI, the worker and the tests.
 * Pure: same input, same options, same result.
 */
export function convert(input: string, options: ConvertOptions): ConvertResult {
  const effectiveMode: Mode = options.autoDetect ? detectMode(input) : options.mode;
  const result = baseResult(effectiveMode, options.autoDetect && effectiveMode !== options.mode);

  if (!input.trim()) {
    result.ok = true;
    return result;
  }

  // --- NDJSON -------------------------------------------------------------
  let working = input;
  const lines = effectiveMode === 'stringify' ? null : splitNdjson(input);
  if (lines) {
    result.ndjson = true;
    if (options.wrapNdjson) {
      working = `[${lines.join(',')}]`;
      result.notes.push(`Wrapped ${lines.length} NDJSON documents into an array`);
    } else {
      result.notes.push(
        `Input looks like ${lines.length} NDJSON documents — enable "Wrap NDJSON" to combine them into an array`,
      );
    }
  }

  // --- Stringify ----------------------------------------------------------
  if (effectiveMode === 'stringify') {
    const parsed = parseFlexible(working.trim(), options.repair);
    if (!parsed.ok) {
      result.error = describeParseError(working, parsed.error!, parsed.repairable);
      result.repairs = parsed.repairs;
      result.stats = computeStats('');
      return result;
    }
    const source = formatJson(parsed.value, options.indent, options.sortKeys);
    const output = stringifyText(source, {
      wrapQuotes: options.wrapQuotes,
      escapeNonAscii: options.escapeNonAscii,
    });
    result.ok = true;
    result.value = parsed.value;
    result.repairs = parsed.repairs;
    result.output = output;
    result.stats = computeStats(output, parsed.value);
    return result;
  }

  // --- Unescape -----------------------------------------------------------
  if (effectiveMode === 'unescape') {
    const unescaped = unescapeToJson(working);
    result.passes = unescaped.passes;
    result.notes.push(...unescaped.notes);
    if (unescaped.passes > 0) {
      result.notes.push(
        `Applied ${unescaped.passes} unescape ${unescaped.passes === 1 ? 'pass' : 'passes'}`,
      );
    }

    const parsed = unescaped.parsed
      ? { ok: true as const, value: unescaped.value, repairs: [] as string[], repairable: false }
      : parseFlexible(unescaped.text, options.repair);

    if (!parsed.ok) {
      const outcome = parsed as ParseOutcome;
      result.error = describeParseError(unescaped.text, outcome.error!, outcome.repairable);
      result.repairs = outcome.repairs;
      result.stats = computeStats(unescaped.text);
      return result;
    }

    result.ok = true;
    result.value = parsed.value;
    result.repairs = parsed.repairs;
    result.output = render(parsed.value, { ...options, mode: 'beautify' });
    result.stats = computeStats(result.output, parsed.value);
    return result;
  }

  // --- Beautify / Minify --------------------------------------------------
  const parsed = parseFlexible(working.trim(), options.repair);
  if (!parsed.ok) {
    result.error = describeParseError(working, parsed.error!, parsed.repairable);
    result.repairs = parsed.repairs;
    result.stats = computeStats(working);
    return result;
  }

  result.ok = true;
  result.value = parsed.value;
  result.repairs = parsed.repairs;
  result.output = render(parsed.value, { ...options, mode: effectiveMode });
  result.stats = computeStats(result.output, parsed.value);
  return result;
}
