export function formatRupiah(amount) {
  if (amount == null || isNaN(amount)) return 'Rp 0';
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID').format(Math.round(abs));
  return `${amount < 0 ? '-' : ''}Rp ${formatted}`;
}

export function formatUSD(amount) {
  if (amount == null || isNaN(amount)) return '$ 0.00';
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(abs);
  return `${amount < 0 ? '-' : ''}$${formatted}`;
}

export function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}

export function formatPercent(value, decimals = 2) {
  if (value == null || isNaN(value)) return '0%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateShort(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatDateInput(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function formatCompactNumber(num) {
  if (num == null || isNaN(num)) return '0';
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}Jt`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(1)}Rb`;
  return num.toString();
}

export function daysBetween(date1, date2) {
  if (!date1 || !date2) return 0;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2 - d1);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getMonthYear(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getDayOfWeek(dateString) {
  const date = new Date(dateString);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
}
