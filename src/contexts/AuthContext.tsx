import React, { createContext, useContext, useEffect, useState } from 'react';
import { testConnection } from '../lib/firebase.ts';
import { PortalMode, UserPrivateInfo, UserProfile } from '../types.ts';
import {
  ensureLocalWorkspaceReady,
  getUserPrivateInfo,
  LOCAL_WORKSPACE_UID,
} from '../services/firestoreService.ts';

interface AuthContextValue {
  workspaceUid: string;
  enteredPortal: boolean;
  profile: UserProfile;
  privateInfo: UserPrivateInfo | null;
  activePortal: PortalMode;
  loading: boolean;
  enterPortal: (portal: PortalMode) => void;
  switchPortal: (portal: PortalMode) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PORTAL_STORAGE_KEY = 'medislot_preferred_portal';
const SESSION_ACTIVE_KEY = 'medislot_portal_entered';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [enteredPortal, setEnteredPortal] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_ACTIVE_KEY) === 'true';
  });
  const [activePortal, setActivePortal] = useState<PortalMode>(() => {
    const saved = sessionStorage.getItem(PORTAL_STORAGE_KEY);
    return saved === 'clinical' ? 'clinical' : 'patient';
  });
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const profile: UserProfile = {
    uid: LOCAL_WORKSPACE_UID,
    displayName: activePortal === 'clinical' ? 'Dr. Sarah Jenkins' : 'Eleanor Vance',
    activePortal,
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      testConnection();
      ensureLocalWorkspaceReady();
      const priv = await getUserPrivateInfo(LOCAL_WORKSPACE_UID);
      if (mounted) {
        setPrivateInfo(priv);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const enterPortal = (portal: PortalMode) => {
    ensureLocalWorkspaceReady();
    sessionStorage.setItem(PORTAL_STORAGE_KEY, portal);
    sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    setActivePortal(portal);
    setEnteredPortal(true);
  };

  const switchPortal = (portal: PortalMode) => {
    sessionStorage.setItem(PORTAL_STORAGE_KEY, portal);
    setActivePortal(portal);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_ACTIVE_KEY);
    setEnteredPortal(false);
  };

  return (
    <AuthContext.Provider
      value={{
        workspaceUid: LOCAL_WORKSPACE_UID,
        enteredPortal,
        profile,
        privateInfo,
        activePortal,
        loading,
        enterPortal,
        switchPortal,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
