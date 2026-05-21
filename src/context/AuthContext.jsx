import { createContext, useContext, useState, useEffect } from 'react';
import { getItem, setItem, generateId } from '../utils/storage';

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
    const session = getItem('session');
    if (session) {
      setUser(session);
    }
    setLoading(false);
  }, []);

  const register = (username, password) => {
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

  const login = (username, password) => {
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

  const logout = () => {
    setItem('session', null);
    setUser(null);
  };

  const updateUsername = (newUsername) => {
    const users = getItem('users') || [];
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].username = newUsername;
      setItem('users', users);
      const session = { ...user, username: newUsername };
      setItem('session', session);
      setUser(session);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateUsername }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
