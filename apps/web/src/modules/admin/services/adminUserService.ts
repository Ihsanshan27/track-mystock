import { apiRequest } from '@/modules/shared/services/apiClient';

export async function createUserAsAdmin({ email, password, displayName, role }) {
  return apiRequest('/users/admin-create', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      displayName,
      role,
    }),
  });
}
