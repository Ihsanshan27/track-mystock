const PASSWORD_RECOVERY_READY_KEY = 'password_recovery_ready';

export function markPasswordRecoveryReady() {
  sessionStorage.setItem(PASSWORD_RECOVERY_READY_KEY, 'true');
}

export function clearPasswordRecoveryReady() {
  sessionStorage.removeItem(PASSWORD_RECOVERY_READY_KEY);
}

export function isPasswordRecoveryReady() {
  return sessionStorage.getItem(PASSWORD_RECOVERY_READY_KEY) === 'true';
}
