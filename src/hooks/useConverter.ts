import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { convert } from '../lib/convert';
import type { ConvertOptions, ConvertResult } from '../lib/types';
import { EMPTY_STATS } from '../lib/types';
import type { WorkerResponse } from '../worker/convert.worker';

export const AUTO_CONVERT_LIMIT = 5 * 1024 * 1024;
export const DEBOUNCE_MS = 300;

const IDLE: ConvertResult = {
  ok: true,
  output: '',
  mode: 'unescape',
  autoDetected: false,
  passes: 0,
  repairs: [],
  notes: [],
  ndjson: false,
  stats: { ...EMPTY_STATS },
};

/**
 * Runs conversions off the main thread, debounced by 300ms, with a manual
 * escape hatch for inputs above AUTO_CONVERT_LIMIT.
 */
export function useConverter(input: string, options: ConvertOptions) {
  const [result, setResult] = useState<ConvertResult>(IDLE);
  const [pending, setPending] = useState(false);
  const [approvedInput, setApprovedInput] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const latestHandled = useRef(0);

  const tooLarge = input.length > AUTO_CONVERT_LIMIT;
  const forced = approvedInput === input;
  const needsManualRun = tooLarge && !forced;

  useEffect(() => {
    if (typeof Worker === 'undefined') return undefined;
    let worker: Worker;
    try {
      worker = new Worker(new URL('../worker/convert.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      return undefined;
    }
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, result: next } = event.data;
      if (id < latestHandled.current) return;
      latestHandled.current = id;
      setResult(next);
      setPending(false);
    };
    worker.onerror = () => setPending(false);
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback((text: string, opts: ConvertOptions) => {
    const id = ++requestId.current;
    const worker = workerRef.current;
    if (!worker) {
      // Worker unavailable (older browser, SSR, tests): fall back to sync.
      latestHandled.current = id;
      setResult(convert(text, opts));
      setPending(false);
      return;
    }
    setPending(true);
    worker.postMessage({ id, input: text, options: opts });
  }, []);

  const optionsKey = useMemo(() => JSON.stringify(options), [options]);

  useEffect(() => {
    if (!input.trim()) {
      requestId.current++;
      latestHandled.current = requestId.current;
      setResult({ ...IDLE, mode: options.mode });
      setPending(false);
      return undefined;
    }
    if (needsManualRun) {
      setPending(false);
      return undefined;
    }
    const timer = window.setTimeout(() => run(input, options), forced ? 0 : DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // optionsKey is a stable stand-in for the contents of `options`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, optionsKey, needsManualRun, forced, run]);

  const convertNow = useCallback(() => setApprovedInput(input), [input]);

  return { result, pending, needsManualRun, convertNow };
}
