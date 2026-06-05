export interface SegmentOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  onChange?: (value: string) => void;
  options: SegmentOption[];
  value: string;
}

export function SegmentedControl({ onChange, options, value }: SegmentedControlProps) {
  return (
    <div className="fc-segmented" role="tablist">
      {options.map((option) => (
        <button
          className={[
            'fc-segmented__item',
            `fc-segmented__item--${option.value}`,
            option.value === value ? 'is-active' : ''
          ].filter(Boolean).join(' ')}
          key={option.value}
          onClick={() => onChange?.(option.value)}
          role="tab"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
