import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { loadProfile } from '../services/profileService';
import { devLog } from '../utils/devLogger';
import { isMissingDatabaseSetupError } from '../utils/errorMessages';

const PermissionContext = createContext(null);
const ROLE_LABELS = {
  admin: 'Admin',
  mentor: 'Mentor',
  trader: 'Trader',
  viewer: 'Viewer',
};

const ROLE_PERMISSIONS = {
  admin: ['manage:workspace', 'manage:users', 'read:audit', 'journal:own'],
  mentor: ['journal:own', 'review:shared'],
  trader: ['journal:own', 'share:journal'],
  viewer: ['read:shared'],
};

export function PermissionProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState('');
  const [roleSetupError, setRoleSetupError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      if (!user) {
        setProfile(null);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);
      setRoleError('');
      setRoleSetupError('');
      devLog('role:load-start', { userId: user.id });

      try {
        const nextProfile = await loadProfile(user);
        if (cancelled) return;
        setProfile(nextProfile);
        devLog('role:load-success', { userId: user.id, role: nextProfile?.role });
      } catch (error) {
        if (cancelled) return;
        const fallbackProfile = {
          id: user.id,
          email: user.email || null,
          username: user.username || user.email || 'User',
          displayName: user.username || user.email || 'User',
          role: 'trader',
          provider: user.provider,
        };
        setProfile(fallbackProfile);
        if (isMissingDatabaseSetupError(error)) {
          setRoleSetupError(error.message);
        } else {
          setRoleError(error.message);
        }
        devLog('role:load-error', { userId: user.id, error: error.message });
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    }

    loadRole();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const nextProfile = await loadProfile(user);
    setProfile(nextProfile);
    setRoleError('');
    setRoleSetupError('');
    return nextProfile;
  }, [user]);

  const role = profile?.role || 'trader';
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.trader;

  const value = useMemo(() => ({
    profile,
    role,
    roleLabel: ROLE_LABELS[role] || ROLE_LABELS.trader,
    permissions,
    roleLoading,
    roleError,
    roleSetupError,
    isAdmin: role === 'admin',
    isMentor: role === 'mentor',
    isTrader: role === 'trader',
    isViewer: role === 'viewer',
    can: (permission) => permissions.includes(permission),
    refreshProfile,
  }), [profile, role, permissions, roleLoading, roleError, roleSetupError, refreshProfile]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}
