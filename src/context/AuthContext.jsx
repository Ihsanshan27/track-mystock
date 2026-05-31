import { createContext, useContext, useState, useEffect } from 'react';
import { getItem, setItem, generateId } from '../utils/storage';
import { isSupabaseConfigured, supabase, supabaseProjectRef } from '../services/supabaseClient';
import { updateProfileName } from '../services/profileService';
import { devLog } from '../utils/devLogger';
import { getAuthErrorMessage } from '../utils/errorMessages';

const AuthContext = createContext(null);

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devLog('auth:init', {
      storage: isSupabaseConfigured ? 'supabase' : 'localStorage',
      projectRef: supabaseProjectRef,
    });

    if (isSupabaseConfigured) {
      let mounted = true;

      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        const sessionUser = mapSupabaseUser(data.session?.user);
        devLog('auth:session-loaded', { signedIn: Boolean(sessionUser), userId: sessionUser?.id });
        setUser(sessionUser);
        setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        const sessionUser = mapSupabaseUser(session?.user);
        devLog('auth:state-change', { event: _event, signedIn: Boolean(sessionUser), userId: sessionUser?.id });
        setUser(sessionUser);
        setLoading(false);
      });

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    const session = getItem('session');
    if (session) {
      devLog('auth:local-session-loaded', { userId: session.id });
      setUser(session);
    }
    setLoading(false);
  }, []);

  const register = async (username, password) => {
    devLog('auth:register-start', {
      email: maskEmail(username),
      storage: isSupabaseConfigured ? 'supabase' : 'localStorage',
      projectRef: supabaseProjectRef,
    });

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
        devLog('auth:register-error', { email: maskEmail(email), error: error.message, projectRef: supabaseProjectRef });
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
      if (data.user && !data.session) {
        devLog('auth:register-needs-confirmation', { email: maskEmail(email), userId: data.user.id });
        return {
          success: true,
          needsConfirmation: true,
          message: 'Akun dibuat. Cek email untuk konfirmasi, lalu login kembali.',
        };
      }
      devLog('auth:register-success', { email: maskEmail(email), userId: data.user?.id });
      return { success: true };
    }

    const users = getItem('users') || [];
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      devLog('auth:register-error', { email: maskEmail(username), error: 'Username sudah digunakan' });
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

    // Auto-login after register
    const session = { id: newUser.id, username: newUser.username };
    setItem('session', session);
    setUser(session);
    devLog('auth:register-success', { email: maskEmail(username), userId: newUser.id });

    // Initialize settings with user-scoped key
    setItem(`settings_${newUser.id}`, {
      initialCapital: 10000000,
      monthlyTarget: 5,
      defaultBuyFee: 0.15,
      defaultSellFee: 0.25,
      initialCapitalUS: 1000, // $1000 default for Gotrade
      defaultBuyFeeUS: 0,     // 0% for Gotrade
      defaultSellFeeUS: 0,    // 0% for Gotrade
    });

    return { success: true };
  };

  const login = async (username, password) => {
    devLog('auth:login-start', { email: maskEmail(username), storage: isSupabaseConfigured ? 'supabase' : 'localStorage' });

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({
        email: username.toLowerCase(),
        password,
      });

      if (error) {
        devLog('auth:login-error', { email: maskEmail(username), error: error.message });
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
      devLog('auth:login-success', { email: maskEmail(username) });
      return { success: true };
    }

    const users = getItem('users') || [];
    const found = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === hashPassword(password)
    );
    if (!found) {
      devLog('auth:login-error', { email: maskEmail(username), error: 'Username atau password salah' });
      return { success: false, error: 'Username atau password salah' };
    }
    const session = { id: found.id, username: found.username };
    setItem('session', session);
    setUser(session);
    devLog('auth:login-success', { email: maskEmail(username), userId: found.id });
    return { success: true };
  };

  const logout = async () => {
    devLog('auth:logout-start', { userId: user?.id });

    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setUser(null);
      devLog('auth:logout-success', { storage: 'supabase' });
      return;
    }

    setItem('session', null);
    setUser(null);
    devLog('auth:logout-success', { storage: 'localStorage' });
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
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].username = newUsername;
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

function maskEmail(email = '') {
  const [name, domain] = email.toLowerCase().split('@');
  if (!domain) return email;
  const maskedName = name.length <= 2 ? `${name[0] || ''}*` : `${name.slice(0, 2)}***`;
  return `${maskedName}@${domain}`;
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
