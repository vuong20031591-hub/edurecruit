/**
 * DateInput — Input text với format dd/MM/yyyy, tự convert 2 chiều với ISO
 * File: src/shared/components/DateInput.tsx
 */
'use client';
import { Input } from './Input';

interface Props {
  label: string;
  value: string;        // dd/MM/yyyy (hiển thị)
  onChange: (value: string) => void;  // dd/MM/yyyy (user nhập)
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function DateInput({ label, value, onChange, disabled, required, className }: Props) {
  return (
    <div className={className}>
      <Input
        label={label}
        type="text"
        value={value}
        disabled={disabled}
        required={required}
        placeholder="dd/mm/yyyy"
        onChange={e => {
          // Chỉ cho phép nhập số và dấu /
          const cleaned = e.target.value.replace(/[^\d/]/g, '');
          onChange(cleaned);
        }}
      />
    </div>
  );
}
