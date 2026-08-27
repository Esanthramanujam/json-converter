import { useCallback, useRef, useState } from 'react';
import { JsonEditor } from './JsonEditor';
import { UploadIcon } from './Icons';
import type { ConvertError } from '../lib/types';

interface InputPaneProps {
  value: string;
  onChange: (value: string) => void;
  error?: ConvertError;
  theme: 'light' | 'dark';
  needsManualRun: boolean;
  onConvert: () => void;
}

const MAX_FILE_BYTES = 64 * 1024 * 1024;

export function InputPane({
  value,
  onChange,
  error,
  theme,
  needsManualRun,
  onConvert,
}: InputPaneProps) {
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    (file: File) => {
      setFileError(null);
      if (file.size > MAX_FILE_BYTES) {
        setFileError('That file is larger than 64 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => onChange(String(reader.result ?? ''));
      reader.onerror = () => setFileError('That file could not be read.');
      reader.readAsText(file);
    },
    [onChange],
  );

  return (
    <section
      aria-label="Input"
      className="flex min-h-0 flex-1 flex-col border-r border-slate-200 dark:border-slate-800"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) readFile(file);
      }}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-[#151a22]">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Input
        </h2>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <UploadIcon className="h-3.5 w-3.5" />
          Open file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,.ndjson,.log,application/json,text/plain"
          className="hidden"
          aria-label="Open a JSON or text file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readFile(file);
            event.target.value = '';
          }}
        />
      </div>

      {fileError && (
        <p className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {fileError}
        </p>
      )}

      {needsManualRun && (
        <div className="flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          <span>Input is over 5 MB — auto-conversion is paused.</span>
          <button
            type="button"
            onClick={onConvert}
            className="ml-auto rounded-md bg-blue-600 px-2 py-0.5 font-medium text-white transition-colors hover:bg-blue-500"
          >
            Convert
          </button>
        </div>
      )}

      <div className={`relative min-h-0 flex-1 ${dragging ? 'ring-2 ring-inset ring-blue-500' : ''}`}>
        <JsonEditor
          value={value}
          onChange={onChange}
          error={error}
          theme={theme}
          ariaLabel="JSON input"
        />
        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-500/10 text-sm font-medium text-blue-700 dark:text-blue-200">
            Drop a .json or .txt file
          </div>
        )}
      </div>
    </section>
  );
}
