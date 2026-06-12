import { createContext, useContext, useState, useEffect } from 'react';
import { getItem, setItem, generateId } from '@/modules/shared/utils/storage';
import { isSupabaseConfigured, supabase } from '@/modules/shared/services/supabaseClient';
import { updateProfileName } from '@/modules/shared/services/profileService';
import { getAuthErrorMessage } from '@/modules/shared/utils/errorMessages';
import { createAuditLogSafe } from '@/modules/admin/services/auditLogService';

const AuthContext = createContext(null);

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const charCode = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + charCode;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured) {
      let isMounted = true;

      supabase.auth.getSession().then(({ data }) => {
        if (!isMounted) return;
        const sessionUser = mapSupabaseUser(data.session?.user);
        setUser(sessionUser);
        setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        const sessionUser = mapSupabaseUser(session?.user);
        setUser(sessionUser);
        setLoading(false);
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    const session = getItem('session');
    if (session) {
      setUser(session);
    }
    setLoading(false);
  }, []);

  const register = async (username, password) => {
    if (isSupabaseConfigured) {
      const email = username.toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: email.split('@')[0],
          },
        },
      });

      if (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
      if (data.user && !data.session) {
        await createAuditLogSafe({
          actorId: data.user.id,
          action: 'auth.registered',
          targetType: 'auth_user',
          targetId: data.user.id,
          metadata: {
            email,
            needsConfirmation: true,
            provider: 'supabase',
          },
        });
        return {
          success: true,
          needsConfirmation: true,
          message: 'Akun dibuat. Cek email untuk konfirmasi, lalu login kembali.',
        };
      }
      if (data.user) {
        await createAuditLogSafe({
          actorId: data.user.id,
          action: 'auth.registered',
          targetType: 'auth_user',
          targetId: data.user.id,
          metadata: {
            email,
            needsConfirmation: false,
            provider: 'supabase',
          },
        });
      }
      return { success: true };
    }

    const users = getItem('users') || [];
    if (users.find(storedUser => storedUser.username.toLowerCase() === username.toLowerCase())) {
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

  const login = async (username, password) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({
        email: username.toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
      const { data: currentUserData } = await supabase.auth.getUser();
      if (currentUserData.user) {
        await createAuditLogSafe({
          actorId: currentUserData.user.id,
          action: 'auth.logged_in',
          targetType: 'auth_user',
          targetId: currentUserData.user.id,
          metadata: {
            provider: 'supabase',
          },
        });
      }
      return { success: true };
    }

    const users = getItem('users') || [];
    const matchingUser = users.find(
      storedUser => storedUser.username.toLowerCase() === username.toLowerCase() && storedUser.password === hashPassword(password)
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

  const logout = async () => {
    if (isSupabaseConfigured) {
      await createAuditLogSafe({
        actorId: user?.id,
        action: 'auth.logged_out',
        targetType: 'auth_user',
        targetId: user?.id,
        metadata: {
          provider: 'supabase',
        },
      });
      await supabase.auth.signOut();
      setUser(null);
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
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: newUsername },
      });

      if (error) return { success: false, error: getAuthErrorMessage(error.message) };
      await updateProfileName(mapSupabaseUser(data.user), newUsername);
      setUser({ ...mapSupabaseUser(data.user), username: newUsername });
      return { success: true };
    }

    const users = getItem('users') || [];
    const existingUserIndex = users.findIndex(storedUser => storedUser.id === user.id);
    if (existingUserIndex !== -1) {
      users[existingUserIndex].username = newUsername;
      setItem('users', users);
      const session = { ...user, username: newUsername };
      setItem('session', session);
      setUser(session);
    }
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateUsername }}>
      {children}
    </AuthContext.Provider>
  );
}

function mapSupabaseUser(supabaseUser) {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    username: supabaseUser.user_metadata?.display_name || supabaseUser.email,
    provider: 'supabase',
  };
}

export function useAuth() {
  const authContext = useContext(AuthContext);
  if (!authContext) throw new Error('useAuth must be used within AuthProvider');
  return authContext;
}
