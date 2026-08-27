import { convert } from '../lib/convert';
import type { ConvertOptions, ConvertResult } from '../lib/types';

export interface WorkerRequest {
  id: number;
  input: string;
  options: ConvertOptions;
}

export interface WorkerResponse {
  id: number;
  result: ConvertResult;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, input, options } = event.data;
  let result: ConvertResult;
  try {
    result = convert(input, options);
  } catch (error) {
    result = {
      ok: false,
      output: '',
      mode: options.mode,
      autoDetected: false,
      passes: 0,
      repairs: [],
      notes: [],
      ndjson: false,
      stats: { chars: 0, lines: 0, bytes: 0, depth: 0, keys: 0 },
      error: {
        message: error instanceof Error ? error.message : String(error),
        repairable: false,
      },
    };
  }
  (self as unknown as Worker).postMessage({ id, result } satisfies WorkerResponse);
};
