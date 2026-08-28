'use client';

import React from 'react';
import { formatNumberDots, parseNumberDots } from '@/lib/format';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onValueChange: (numericValue: number, rawFormatted: string) => void;
  suffix?: string;
  className?: string;
}

export default function MoneyInput({
  value,
  onValueChange,
  suffix = 'đ',
  className = '',
  placeholder = '0',
  ...props
}: MoneyInputProps) {
  const displayValue = formatNumberDots(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numeric = parseNumberDots(raw);
    const formatted = formatNumberDots(numeric);
    onValueChange(numeric, formatted);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full ${className}`}
        {...props}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
