import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { lintGutter, linter } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';
import type { ConvertError } from '../lib/types';
import { lineColToPosition } from '../lib/jsonError';

interface JsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  error?: ConvertError;
  theme: 'light' | 'dark';
  ariaLabel: string;
}

function diagnosticsFor(value: string, error?: ConvertError): Diagnostic[] {
  if (!error) return [];
  let from = error.position;
  if (from === undefined && error.line !== undefined && error.column !== undefined) {
    from = lineColToPosition(value, error.line, error.column);
  }
  if (from === undefined) return [];
  const start = Math.max(0, Math.min(from, Math.max(0, value.length - 1)));
  return [
    {
      from: start,
      to: Math.min(value.length, start + 1),
      severity: 'error',
      message: error.hint ? `${error.message} — ${error.hint}` : error.message,
    },
  ];
}

export function JsonEditor({
  value,
  onChange,
  readOnly = false,
  error,
  theme,
  ariaLabel,
}: JsonEditorProps) {
  const extensions = useMemo(() => {
    const diagnostics = diagnosticsFor(value, error);
    return [
      json(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
      lintGutter(),
      linter(() => diagnostics, { delay: 80 }),
    ];
    // `value` is intentionally included so the diagnostic offset stays in range.
  }, [ariaLabel, error, value]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={theme}
      readOnly={readOnly}
      extensions={extensions}
      className="h-full min-h-0 flex-1 overflow-hidden text-[13px]"
      height="100%"
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: !readOnly,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: !readOnly,
        autocompletion: false,
        searchKeymap: true,
      }}
    />
  );
}
