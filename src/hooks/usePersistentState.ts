import { useCallback, useEffect, useState } from 'react';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** useState that mirrors into localStorage, tolerating private-mode failures. */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable - keep working in memory */
    }
  }, [key, value]);

  const reset = useCallback(() => setValue(fallback), [fallback]);

  return [value, setValue, reset] as const;
}
