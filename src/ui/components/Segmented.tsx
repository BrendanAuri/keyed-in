interface SegmentedProps<T extends string | number> {
  readonly label: string;
  readonly options: readonly { readonly value: T; readonly label: string; readonly title?: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  /** Keep the label for screen readers only. */
  readonly hideLabel?: boolean;
}

/** A row of options where exactly one is chosen, like Dial In's selectors. */
export function Segmented<T extends string | number>({ label, options, value, onChange, hideLabel = false }: SegmentedProps<T>) {
  return (
    <div className="segmented">
      <div className={hideLabel ? 'visually-hidden' : 'segmented-label'}>{label}</div>
      <div className="segmented-options" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            title={option.title}
            className={option.value === value ? 'segmented-option selected' : 'segmented-option'}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
