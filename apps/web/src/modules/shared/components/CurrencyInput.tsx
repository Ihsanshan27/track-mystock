/**
 * CurrencyInput — input angka dengan format pemisah ribuan otomatis.
 *
 * Props:
 *   value      — raw numeric string dari state (e.g. "1000000")
 *   onChange   — dipanggil dengan raw string angka (tanpa titik/koma)
 *   allowDecimal — true untuk harga/DPS (default false)
 *   placeholder  — placeholder teks (opsional)
 *   className    — tambahan class (default "form-input")
 *   disabled     — disabled state
 *   style        — inline style
 */

import { useRef } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (raw: string) => void;
  allowDecimal?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  id?: string;
}

/** Format raw angka ke string dengan titik ribuan, koma desimal (ID) */
function formatDisplay(raw: string, allowDecimal: boolean): string {
  if (!raw) return '';

  // Pisahkan bagian integer dan desimal
  const [intPart, ...decParts] = raw.split('.');
  const decPart = decParts.join('.');

  // Format integer dengan titik setiap 3 digit
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (allowDecimal && decPart !== undefined && raw.includes('.')) {
    return formatted + ',' + decPart;
  }
  return formatted;
}

/** Hapus semua karakter non-numerik kecuali titik desimal (jika allowDecimal) */
function toRaw(display: string, allowDecimal: boolean): string {
  if (!display) return '';
  // Ganti koma desimal → titik
  let s = display.replace(/,/g, '.');
  // Hapus semua titik ribuan (titik yang bukan titik desimal)
  // Deteksi: titik terakhir adalah desimal jika allowDecimal
  if (allowDecimal) {
    // Ambil semua digit dan satu titik (desimal) terakhir
    const parts = s.split('.');
    if (parts.length > 2) {
      // Ada beberapa titik → semua kecuali yg terakhir adalah ribuan
      const intPart = parts.slice(0, -1).join('');
      const decPart = parts[parts.length - 1];
      s = intPart + '.' + decPart;
    }
    // Hapus karakter non-digit dan non-titik
    return s.replace(/[^\d.]/g, '');
  }
  // Tidak ada desimal → hapus semua non-digit
  return s.replace(/[^\d]/g, '');
}

export default function CurrencyInput({
  value,
  onChange,
  allowDecimal = false,
  placeholder = '0',
  className = 'form-input',
  disabled = false,
  style,
  id,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toRaw(e.target.value, allowDecimal);
    onChange(raw);
  };

  // Tampilkan display yang terformat
  const displayValue = formatDisplay(value, allowDecimal);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      className={className}
      disabled={disabled}
      style={style}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
    />
  );
}
