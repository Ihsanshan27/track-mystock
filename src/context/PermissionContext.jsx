import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { loadProfile } from '../services/profileService';
import { isMissingDatabaseSetupError } from '../utils/errorMessages';

const PermissionContext = createContext(null);
const ROLE_LABELS = {
  admin: 'Admin',
  mentor: 'Mentor',
  trader: 'Trader',
  viewer: 'Viewer',
};

const PERMISSION_DEFINITIONS = {
  'dashboard:read': {
    label: 'Dashboard',
    description: 'Melihat ringkasan performa dan statistik utama.',
    deniedMessage: 'Role Anda belum punya akses ke dashboard.',
  },
  'portfolio:read': {
    label: 'Portfolio',
    description: 'Melihat posisi terbuka dan alokasi portfolio.',
    deniedMessage: 'Role Anda belum punya akses ke halaman portfolio.',
  },
  'analytics:read': {
    label: 'Analitik',
    description: 'Melihat statistik, win rate, dan grafik performa.',
    deniedMessage: 'Role Anda belum punya akses ke analitik.',
  },
  'journal:own': {
    label: 'Jurnal Pribadi',
    description: 'Melihat data jurnal trading milik sendiri.',
    deniedMessage: 'Role Anda belum punya akses ke jurnal pribadi.',
  },
  'journal:write': {
    label: 'Edit Jurnal',
    description: 'Menambah, mengubah, dan menghapus data jurnal trading.',
    deniedMessage: 'Role Anda hanya punya akses baca dan tidak bisa mengubah jurnal.',
  },
  'settings:manage': {
    label: 'Pengaturan',
    description: 'Mengubah profil, preferensi, dan data pribadi.',
    deniedMessage: 'Role Anda belum punya akses ke halaman pengaturan.',
  },
  'manage:workspace': {
    label: 'Workspace',
    description: 'Mengelola workspace dan anggotanya.',
    deniedMessage: 'Role Anda belum punya akses mengelola workspace.',
  },
  'manage:users': {
    label: 'Users',
    description: 'Mengelola user dan role aplikasi.',
    deniedMessage: 'Role Anda belum punya akses mengelola user.',
  },
  'read:audit': {
    label: 'Audit Log',
    description: 'Melihat log aktivitas penting aplikasi.',
    deniedMessage: 'Role Anda belum punya akses ke audit log.',
  },
  'report:manage': {
    label: 'Reports',
    description: 'Membuat dan membagikan report read-only.',
    deniedMessage: 'Role Anda belum bisa membuat atau membagikan report.',
  },
  'read:shared': {
    label: 'Shared Access',
    description: 'Melihat report atau data yang dibagikan.',
    deniedMessage: 'Role Anda belum punya akses ke data share.',
  },
  'review:shared': {
    label: 'Review Shared Trade',
    description: 'Memberi review pada trade yang dibagikan.',
    deniedMessage: 'Role Anda belum bisa mereview trade yang dibagikan.',
  },
  'share:journal': {
    label: 'Share Jurnal',
    description: 'Membagikan jurnal ke mentor atau viewer.',
    deniedMessage: 'Role Anda belum bisa membagikan jurnal.',
  },
};

const ROLE_PERMISSIONS = {
  admin: ['dashboard:read', 'portfolio:read', 'analytics:read', 'journal:own', 'journal:write', 'settings:manage', 'manage:workspace', 'manage:users', 'read:audit', 'report:manage', 'read:shared'],
  mentor: ['dashboard:read', 'portfolio:read', 'analytics:read', 'journal:own', 'journal:write', 'settings:manage', 'review:shared', 'report:manage', 'read:shared'],
  trader: ['dashboard:read', 'portfolio:read', 'analytics:read', 'journal:own', 'journal:write', 'settings:manage', 'share:journal', 'report:manage', 'read:shared'],
  viewer: ['dashboard:read', 'portfolio:read', 'analytics:read', 'read:shared'],
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

      try {
        const nextProfile = await loadProfile(user);
        if (cancelled) return;
        setProfile(nextProfile);
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
    permissionDefinitions: PERMISSION_DEFINITIONS,
    roleLoading,
    roleError,
    roleSetupError,
    isAdmin: role === 'admin',
    isMentor: role === 'mentor',
    isTrader: role === 'trader',
    isViewer: role === 'viewer',
    can: (permission) => permissions.includes(permission),
    canAny: (items) => items.some((permission) => permissions.includes(permission)),
    canAll: (items) => items.every((permission) => permissions.includes(permission)),
    getPermissionMeta: (permission) => PERMISSION_DEFINITIONS[permission] || null,
    getDeniedMessage: (permission) => PERMISSION_DEFINITIONS[permission]?.deniedMessage || 'Akses ke fitur ini belum tersedia untuk role Anda.',
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
