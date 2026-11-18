import React from 'react';
import type { PageOrientation, PageOrientationMode } from '../types/cep';

interface OrientationSelectProps {
  value: PageOrientationMode;
  onChange: (mode: PageOrientationMode) => void;
  naturalOrientation?: PageOrientation;
  label?: string;
}

export const OrientationSelect: React.FC<OrientationSelectProps> = ({
  value,
  onChange,
  naturalOrientation,
  label = 'Orientation',
}) => {
  const autoLabel = naturalOrientation
    ? `Auto (${naturalOrientation === 'landscape' ? 'Paysage' : 'Portrait'})`
    : 'Auto';

  const options: Array<{ id: PageOrientationMode; label: string }> = [
    { id: 'auto', label: autoLabel },
    { id: 'portrait', label: 'Portrait' },
    { id: 'landscape', label: 'Paysage' },
  ];

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {label} :
      </span>
      <div
        className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-0.5"
        role="group"
        aria-label={label}
      >
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              value === opt.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
