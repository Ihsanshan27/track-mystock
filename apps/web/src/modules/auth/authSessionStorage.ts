const AUTH_SESSION_KEY = 'auth_session_cache';
const PASSWORD_RESET_EMAIL_KEY = 'pending_password_reset_email';
const PASSWORD_RESET_TOKEN_KEY = 'pending_password_reset_token';

export function getAuthSession() {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setAuthSession(session) {
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export function setPendingPasswordReset(email, token) {
  if (email) {
    sessionStorage.setItem(PASSWORD_RESET_EMAIL_KEY, email);
  }
  if (token) {
    sessionStorage.setItem(PASSWORD_RESET_TOKEN_KEY, token);
  }
}

export function getPendingPasswordResetEmail() {
  return sessionStorage.getItem(PASSWORD_RESET_EMAIL_KEY) || '';
}

export function getPendingPasswordResetToken() {
  return sessionStorage.getItem(PASSWORD_RESET_TOKEN_KEY) || '';
}

export function clearPendingPasswordReset() {
  sessionStorage.removeItem(PASSWORD_RESET_EMAIL_KEY);
  sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
}
