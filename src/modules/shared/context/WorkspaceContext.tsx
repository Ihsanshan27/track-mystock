import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { isSupabaseConfigured } from '@/modules/shared/services/supabaseClient';
import { listWorkspaces } from '@/modules/admin/services/workspaceService';
import { getScopedItem, setScopedItem } from '@/modules/shared/utils/storage';
import { isMissingDatabaseSetupError } from '@/modules/shared/utils/errorMessages';

const WorkspaceContext = createContext(null);

const PERSONAL_WORKSPACE = {
  id: null,
  name: 'Personal',
  isPersonal: true,
};

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaceSetupError, setWorkspaceSetupError] = useState('');

  const availableWorkspaces = useMemo(
    () => [PERSONAL_WORKSPACE, ...workspaces.map(workspace => ({ ...workspace, isPersonal: false }))],
    [workspaces]
  );

  const activeWorkspace = useMemo(() => {
    if (activeWorkspaceId == null) return PERSONAL_WORKSPACE;
    return availableWorkspaces.find(workspace => workspace.id === activeWorkspaceId) || PERSONAL_WORKSPACE;
  }, [activeWorkspaceId, availableWorkspaces]);

  const refreshWorkspaces = useCallback(async () => {
    if (!userId) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setWorkspaceError('');
      setWorkspaceSetupError('');
      setWorkspaceLoading(false);
      return;
    }

    setWorkspaceLoading(true);
    setWorkspaceError('');
    setWorkspaceSetupError('');

    try {
      if (!isSupabaseConfigured) {
        setWorkspaces([]);
        setActiveWorkspaceId(null);
        return;
      }

      const workspaceRows = await listWorkspaces();
      const savedWorkspaceId = getScopedItem('active_workspace', userId);
      const hasSavedWorkspace = workspaceRows.some(workspace => workspace.id === savedWorkspaceId);

      setWorkspaces(workspaceRows);
      setActiveWorkspaceId(hasSavedWorkspace ? savedWorkspaceId : null);

      if (savedWorkspaceId && !hasSavedWorkspace) {
        setScopedItem('active_workspace', userId, null);
      }
    } catch (error) {
      if (isMissingDatabaseSetupError(error)) {
        setWorkspaceSetupError(error.message);
      } else {
        setWorkspaceError(error.message);
      }
    } finally {
      setWorkspaceLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const selectWorkspace = useCallback((workspaceId) => {
    const normalizedWorkspaceId = workspaceId || null;
    setActiveWorkspaceId(normalizedWorkspaceId);
    if (userId) {
      setScopedItem('active_workspace', userId, normalizedWorkspaceId);
    }
  }, [userId]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      availableWorkspaces,
      activeWorkspace,
      activeWorkspaceId,
      workspaceLoading,
      workspaceError,
      workspaceSetupError,
      refreshWorkspaces,
      selectWorkspace,
      personalWorkspace: PERSONAL_WORKSPACE,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
