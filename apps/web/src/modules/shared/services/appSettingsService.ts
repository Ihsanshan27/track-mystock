import { apiRequest, isApiConfigured } from '@/modules/shared/services/apiClient';

export async function getRegistrationEnabled() {
  if (!isApiConfigured) {
    return true;
  }

  const data = await apiRequest('/app-settings/public-registration');
  return Boolean(data?.enabled);
}

export async function setRegistrationEnabled(enabled, userId) {
  void userId;
  if (!isApiConfigured) {
    return Boolean(enabled);
  }

  const data = await apiRequest('/app-settings/public-registration', {
    method: 'PATCH',
    body: JSON.stringify({ enabled: Boolean(enabled) }),
  });
  return Boolean(data?.enabled);
}
