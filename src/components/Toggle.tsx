interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  title?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, title, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
        checked
          ? 'text-slate-900 dark:text-slate-100'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute left-0 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
