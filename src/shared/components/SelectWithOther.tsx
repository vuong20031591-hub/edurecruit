/**
 * SelectWithOther — Select với option "Khác" cho phép nhập tự do
 * Dùng cho: Trình độ văn hóa, Trình độ chuyên môn, v.v. — các field có danh sách
 * chuẩn nhưng cũng cho phép giá trị ngoài danh sách.
 *
 * File: src/shared/components/SelectWithOther.tsx
 */
'use client';
import { useState } from 'react';
import { Input, Select } from './Input';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

const OTHER_VALUE = '__other__';

export function SelectWithOther({
  label,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  placeholder,
  className
}: Props) {
  // Nếu value hiện tại không nằm trong options (vd: data cũ từ DB), mặc định hiển thị Input
  const isKnown = options.includes(value);
  const [isOther, setIsOther] = useState(!isKnown && value !== '');

  return (
    <div className={className}>
      {!isOther ? (
        <Select
          label={label}
          value={value}
          disabled={disabled}
          required={required}
          onChange={e => {
            if (e.target.value === OTHER_VALUE) {
              setIsOther(true);
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
        >
          <option value="">-- Chọn --</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value={OTHER_VALUE}>Khác (nhập tự do)</option>
        </Select>
      ) : (
        <div>
          <Input
            label={label}
            value={value}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setIsOther(false);
              onChange('');
            }}
            className="mt-1 text-xs text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Chọn từ danh sách
          </button>
        </div>
      )}
    </div>
  );
}
