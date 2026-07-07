export function isMissingDatabaseSetupError(errorOrMessage) {
  const message = String(errorOrMessage?.message || errorOrMessage || '').toLowerCase();
  return (
    message.includes('relation') && message.includes('does not exist')
  ) || (
    message.includes('could not find the table')
  ) || (
    message.includes('schema cache')
  );
}

export function getAuthErrorMessage(message) {
  const normalized = message?.toLowerCase() || '';
  if (normalized.includes('invalid login credentials')) return 'Email atau password salah.';
  if (normalized.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek inbox email Anda terlebih dahulu.';
  if (normalized.includes('token has expired') || normalized.includes('otp expired')) {
    return 'Kode OTP sudah kedaluwarsa. Silakan kirim ulang kode baru.';
  }
  if (
    normalized.includes('invalid otp') ||
    normalized.includes('invalid token') ||
    normalized.includes('token is invalid') ||
    normalized.includes('otp is invalid')
  ) {
    return 'Kode OTP salah. Coba cek lagi email Anda.';
  }
  if (normalized.includes('user already registered')) return 'Email sudah terdaftar.';
  if (normalized.includes('password should be at least')) return 'Password minimal 6 karakter.';
  if (normalized.includes('email rate limit exceeded')) {
    return 'Limit pengiriman email sedang tercapai. Tunggu beberapa saat lalu coba lagi.';
  }
  if (normalized.includes('over_email_send_rate_limit') || normalized.includes('email send rate limit')) {
    return 'Terlalu cepat meminta kode baru. Tunggu sebentar lalu coba kirim ulang.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.';
  }
  return message || 'Terjadi kesalahan autentikasi.';
}
