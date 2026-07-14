import { isApiConfigured } from '@/modules/shared/services/apiClient';
import { clearAuthSession, getAuthSession, setAuthSession } from '@/modules/auth/authSessionStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

async function request(path: string, options: RequestInit = {}) {
  if (!isApiConfigured) {
    throw new Error('API backend belum dikonfigurasi.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message || `Request gagal (${response.status})`);
  }

  return payload.data;
}

function mapBackendUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.profile?.displayName || user.email,
    displayName: user.profile?.displayName || user.email,
    role: user.profile?.defaultRole || 'trader',
    provider: 'backend',
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

function createStoredSession(authPayload) {
  return {
    id: authPayload.user.id,
    email: authPayload.user.email,
    username: authPayload.user.profile?.displayName || authPayload.user.email,
    displayName: authPayload.user.profile?.displayName || authPayload.user.email,
    role: authPayload.user.profile?.defaultRole || 'trader',
    provider: 'backend',
    accessToken: authPayload.accessToken,
    accessTokenExpiresAt: authPayload.accessTokenExpiresAt,
    refreshToken: authPayload.refreshToken,
    refreshTokenExpiresAt: authPayload.refreshTokenExpiresAt,
  };
}

export async function backendRegister(email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function backendLogin(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const session = createStoredSession(data);
  setAuthSession(session);

  return {
    session,
    user: mapBackendUser(data.user),
  };
}

export async function backendRefresh() {
  const session = getAuthSession();
  if (!session?.refreshToken) {
    throw new Error('Tidak ada refresh token aktif.');
  }

  const data = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  const nextSession = createStoredSession(data);
  setAuthSession(nextSession);

  return {
    session: nextSession,
    user: mapBackendUser(data.user),
  };
}

export async function backendFetchMe(accessToken) {
  const data = await request('/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return mapBackendUser(data);
}

export async function backendLogout() {
  const session = getAuthSession();
  if (session?.accessToken && session?.refreshToken) {
    try {
      await request('/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
    } finally {
      clearAuthSession();
    }

    return;
  }

  clearAuthSession();
}

export async function backendVerifyEmailOtp(email, token) {
  return request('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, token }),
  });
}

export async function backendResendEmailOtp(email) {
  return request('/auth/verify-email/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function backendRequestPasswordRecovery(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function backendResetPassword(email, token, newPassword) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, token, newPassword }),
  });
}

export async function backendChangePassword(accessToken, currentPassword, newPassword) {
  return request('/users/me/password', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
