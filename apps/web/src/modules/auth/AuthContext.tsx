import { createContext, useContext, useEffect, useState } from 'react';
import { generateId, getItem, setItem } from '@/modules/shared/utils/storage';
import { updateProfileName } from '@/modules/shared/services/profileService';
import { getAuthErrorMessage } from '@/modules/shared/utils/errorMessages';
import { createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import {
  clearPasswordRecoveryReady,
  markPasswordRecoveryReady,
} from '@/modules/auth/passwordRecoveryStorage';
import {
  backendFetchMe,
  backendLogin,
  backendLogout,
  backendRefresh,
  backendRegister,
  backendRequestPasswordRecovery,
  backendResendEmailOtp,
  backendResetPassword,
  backendVerifyEmailOtp,
  backendChangePassword,
} from '@/modules/auth/authApiService';

import {
  clearAuthSession,
  clearPendingPasswordReset,
  getAuthSession,
  setAuthSession,
} from '@/modules/auth/authSessionStorage';
import { isApiConfigured } from '@/modules/shared/services/apiClient';

const DEFAULT_AUTH_CONTEXT = {
  user: null as any,
  loading: false,
  register: async (username?: string, password?: string): Promise<{ success: boolean; error?: string; email?: string; needsConfirmation?: boolean; needsOtpVerification?: boolean; message?: string }> => ({ success: false, error: 'Auth context belum siap.' }),
  login: async (username?: string, password?: string): Promise<{ success: boolean; error?: string }> => ({ success: false, error: 'Auth context belum siap.' }),
  logout: async (): Promise<void> => {},
  updateUsername: async (newUsername?: string): Promise<{ success: boolean; error?: string }> => ({ success: false, error: 'Auth context belum siap.' }),
  verifyEmailOtp: async (email?: string, token?: string): Promise<{ success: boolean; error?: string; hasSession?: boolean; message?: string }> => ({ success: false, error: 'Auth context belum siap.' }),
  resendEmailOtp: async (email?: string): Promise<{ success: boolean; error?: string; message?: string }> => ({ success: false, error: 'Auth context belum siap.' }),
  requestPasswordRecovery: async (email?: string): Promise<{ success: boolean; error?: string; email?: string; resetToken?: string; message?: string }> => ({ success: false, error: 'Auth context belum siap.' }),
  resetPassword: async (newPassword?: string, options?: any): Promise<{ success: boolean; error?: string; message?: string }> => ({ success: false, error: 'Auth context belum siap.' }),
  changePassword: async (currentPassword?: string, newPassword?: string): Promise<{ success: boolean; error?: string; message?: string }> => ({ success: false, error: 'Auth context belum siap.' }),
};

const AuthContext = createContext(DEFAULT_AUTH_CONTEXT);

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const charCode = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + charCode;
    hash &= hash;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuthSession() || getItem('session'));
  const [loading, setLoading] = useState(() => !getAuthSession() && !getItem('session'));

  useEffect(() => {
    if (isApiConfigured) {
      let active = true;

      async function bootstrapApiSession() {
        const storedSession = getAuthSession();
        if (!storedSession?.accessToken) {
          if (active) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        try {
          const me = await backendFetchMe(storedSession.accessToken);
          if (!active) return;

          const nextUser = {
            ...storedSession,
            ...me,
          };

          setAuthSession({
            ...storedSession,
            username: nextUser.username,
            displayName: nextUser.displayName,
            role: nextUser.role,
          });
          setUser(nextUser);
        } catch {
          try {
            const refreshed = await backendRefresh();
            if (!active) return;
            setUser(refreshed.user);
          } catch {
            clearAuthSession();
            if (!active) return;
            setUser(null);
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      bootstrapApiSession();

      return () => {
        active = false;
      };
    }

    const session = getItem('session');
    if (session) {
      setUser(session);
    }
    setLoading(false);
  }, []);

  const register = async (username, password) => {
    if (isApiConfigured) {
      try {
        const data = await backendRegister(username.toLowerCase(), password);
        return {
          success: true,
          email: data.email,
          needsConfirmation: data.needsConfirmation,
          needsOtpVerification: data.needsOtpVerification,
          message: data.verificationCode
            ? `${data.message} Kode dev: ${data.verificationCode}`
            : data.message,
        };
      } catch (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
    }

    const users = getItem('users') || [];
    if (users.find((storedUser) => storedUser.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username sudah digunakan' };
    }

    const newUser = {
      id: generateId(),
      username,
      password: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setItem('users', users);

    const session = { id: newUser.id, username: newUser.username };
    setItem('session', session);
    setUser(session);
    await createAuditLogSafe({
      actorId: newUser.id,
      action: 'auth.registered',
      targetType: 'auth_user',
      targetId: newUser.id,
      metadata: {
        username: newUser.username,
        provider: 'localStorage',
      },
    });

    setItem(`settings_${newUser.id}`, {
      initialCapital: 10000000,
      monthlyTarget: 5,
      defaultBuyFee: 0.15,
      defaultSellFee: 0.25,
      initialCapitalUS: 1000,
      defaultBuyFeeUS: 0,
      defaultSellFeeUS: 0,
    });

    return { success: true };
  };

  const verifyEmailOtp = async (email, token) => {
    if (isApiConfigured) {
      try {
        const data = await backendVerifyEmailOtp(email, token);
        return {
          success: true,
          hasSession: Boolean(data.hasSession),
          message: data.message,
        };
      } catch (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
    }

    return {
      success: false,
      error: 'Verifikasi OTP email hanya tersedia saat backend API aktif.',
    };
  };

  const resendEmailOtp = async (email) => {
    if (isApiConfigured) {
      try {
        const data = await backendResendEmailOtp(email);
        return {
          success: true,
          message: data.verificationCode
            ? `${data.message} Kode dev: ${data.verificationCode}`
            : data.message,
        };
      } catch (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
    }

    return {
      success: false,
      error: 'Kirim ulang OTP email hanya tersedia saat backend API aktif.',
    };
  };

  const login = async (username, password) => {
    if (isApiConfigured) {
      try {
        const data = await backendLogin(username.toLowerCase(), password);
        setUser(data.user);
        clearPasswordRecoveryReady();
        return { success: true };
      } catch (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
    }

    const users = getItem('users') || [];
    const matchingUser = users.find(
      (storedUser) =>
        storedUser.username.toLowerCase() === username.toLowerCase()
        && storedUser.password === hashPassword(password),
    );
    if (!matchingUser) {
      return { success: false, error: 'Username atau password salah' };
    }

    const session = { id: matchingUser.id, username: matchingUser.username };
    setItem('session', session);
    setUser(session);
    await createAuditLogSafe({
      actorId: matchingUser.id,
      action: 'auth.logged_in',
      targetType: 'auth_user',
      targetId: matchingUser.id,
      metadata: {
        username: matchingUser.username,
        provider: 'localStorage',
      },
    });
    return { success: true };
  };

  const requestPasswordRecovery = async (email) => {
    if (isApiConfigured) {
      try {
        const data = await backendRequestPasswordRecovery(email.toLowerCase());
        return {
          success: true,
          email: data.email,
          resetToken: data.resetToken,
          message: data.resetToken
            ? `${data.message} Kode dev: ${data.resetToken}`
            : data.message,
        };
      } catch (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
    }

    return {
      success: false,
      error: 'Lupa password via email hanya tersedia saat backend API aktif.',
    };
  };

  const resetPassword = async (newPassword, options: any = {}) => {
    if (isApiConfigured) {
      try {
        const data = await backendResetPassword(options.email, options.token, newPassword);
        clearPendingPasswordReset();
        clearAuthSession();
        clearPasswordRecoveryReady();
        setUser(null);
        return {
          success: true,
          message: data.message,
        };
      } catch (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
    }

    return {
      success: false,
      error: 'Reset password hanya tersedia saat backend API aktif.',
    };
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (isApiConfigured) {
      try {
        const session = getAuthSession();
        if (!session?.accessToken) {
          throw new Error('Sesi tidak valid.');
        }
        
        const data = await backendChangePassword(session.accessToken, currentPassword, newPassword);
        
        // Optional: Logout user after password change or keep them logged in
        // If the user did not specify their preference, we will keep them logged in for now,
        // or just logout for security. I will keep them logged in.
        
        return {
          success: true,
          message: data.message,
        };
      } catch (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
    }

    return {
      success: false,
      error: 'Ganti password hanya tersedia saat backend API aktif.',
    };
  };

  const logout = async () => {
    if (isApiConfigured) {
      try {
        await backendLogout();
      } finally {
        clearAuthSession();
        clearPasswordRecoveryReady();
        setUser(null);
      }
      return;
    }

    await createAuditLogSafe({
      actorId: user?.id,
      action: 'auth.logged_out',
      targetType: 'auth_user',
      targetId: user?.id,
      metadata: {
        username: user?.username,
        provider: 'localStorage',
      },
    });
    setItem('session', null);
    setUser(null);
  };

  const updateUsername = async (newUsername) => {
    if (isApiConfigured) {
      try {
        const profile = await updateProfileName(user, newUsername);
        const session = getAuthSession();
        const nextUser = {
          ...user,
          username: profile.username,
          displayName: profile.displayName,
          role: profile.role,
        };

        if (session) {
          setAuthSession({
            ...session,
            username: profile.username,
            displayName: profile.displayName,
            role: profile.role,
          });
        }

        setUser(nextUser);
        return { success: true };
      } catch (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
    }

    const users = getItem('users') || [];
    const existingUserIndex = users.findIndex((storedUser) => storedUser.id === user.id);
    if (existingUserIndex !== -1) {
      users[existingUserIndex].username = newUsername;
      setItem('users', users);
      const session = { ...user, username: newUsername };
      setItem('session', session);
      setUser(session);
    }
    return { success: true };
  };

  useEffect(() => {
    if (!isApiConfigured) return undefined;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.get('type') === 'recovery') {
      markPasswordRecoveryReady();
    }

    return undefined;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        updateUsername,
        verifyEmailOtp,
        resendEmailOtp,
        requestPasswordRecovery,
        resetPassword,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const authContext = useContext(AuthContext);
  return authContext || DEFAULT_AUTH_CONTEXT;
}
