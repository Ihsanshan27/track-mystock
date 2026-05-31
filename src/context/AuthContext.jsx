import { createContext, useContext, useState, useEffect } from 'react';
import { getItem, setItem, generateId } from '../utils/storage';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { updateProfileName } from '../services/profileService';
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
    if (isSupabaseConfigured) {
      let mounted = true;

      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
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
        mounted = false;
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
        return {
          success: true,
          needsConfirmation: true,
          message: 'Akun dibuat. Cek email untuk konfirmasi, lalu login kembali.',
        };
      }
      return { success: true };
    }

    const users = getItem('users') || [];
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
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
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({
        email: username.toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: getAuthErrorMessage(error.message) };
      }
      return { success: true };
    }

    const users = getItem('users') || [];
    const found = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === hashPassword(password)
    );
    if (!found) {
      return { success: false, error: 'Username atau password salah' };
    }
    const session = { id: found.id, username: found.username };
    setItem('session', session);
    setUser(session);
    return { success: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setUser(null);
      return;
    }

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
