import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { listWorkspaces } from '../services/workspaceService';
import { getScopedItem, setScopedItem } from '../utils/storage';
import { isMissingDatabaseSetupError } from '../utils/errorMessages';

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

      const rows = await listWorkspaces();
      const storedWorkspaceId = getScopedItem('active_workspace', userId);
      const hasStoredWorkspace = storedWorkspaceId && rows.some(workspace => workspace.id === storedWorkspaceId);
      const nextWorkspaceId = hasStoredWorkspace ? storedWorkspaceId : null;

      setWorkspaces(rows);
      setActiveWorkspaceId(nextWorkspaceId);
      setScopedItem('active_workspace', userId, nextWorkspaceId);
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
