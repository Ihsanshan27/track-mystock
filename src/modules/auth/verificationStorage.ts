export const PENDING_VERIFY_EMAIL_KEY = 'pending_verify_email';
export const PENDING_VERIFY_RESEND_AT_KEY = 'pending_verify_email_resend_at';
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export function getPendingVerificationEmail() {
  return sessionStorage.getItem(PENDING_VERIFY_EMAIL_KEY) || '';
}

export function setPendingVerificationEmail(email) {
  if (!email) {
    sessionStorage.removeItem(PENDING_VERIFY_EMAIL_KEY);
    return;
  }
  sessionStorage.setItem(PENDING_VERIFY_EMAIL_KEY, email);
}

export function clearPendingVerificationEmail() {
  sessionStorage.removeItem(PENDING_VERIFY_EMAIL_KEY);
  sessionStorage.removeItem(PENDING_VERIFY_RESEND_AT_KEY);
}

export function getPendingResendAt() {
  return Number(sessionStorage.getItem(PENDING_VERIFY_RESEND_AT_KEY) || 0);
}

export function setPendingResendAt(timestamp) {
  sessionStorage.setItem(PENDING_VERIFY_RESEND_AT_KEY, String(timestamp));
}
