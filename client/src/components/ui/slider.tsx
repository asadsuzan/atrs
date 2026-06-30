import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight numeric slider built on a native range input (no external dep).
 * Styled to use the theme's primary accent; emits the parsed number directly.
 */
export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export function Slider({ value, min = 0, max = 100, step = 1, onChange, className, ...rest }: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ accentColor: 'hsl(var(--primary))' }}
      className={cn(
        'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted',
        className,
      )}
      {...rest}
    />
  );
}
